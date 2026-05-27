import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from openpyxl import load_workbook
from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session

from app.auth.service import require_executive, normalize_tracks
from app.database.connection import get_db
from app.database.models import (
    ATTENDANCE_THRESHOLDS,
    AttendancePoint,
    Employee,
    TimeRecord,
    WoshReport,
)

router = APIRouter(prefix="/api/executive", tags=["executive"])


def _sheet_to_records(ws) -> list[dict]:
    """Convert an openpyxl worksheet to a list of row dicts."""
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [str(c).strip() if c is not None else f"col_{i}" for i, c in enumerate(rows[0])]
    result = []
    for row in rows[1:]:
        if all(c is None for c in row):
            continue
        record = {}
        for header, cell in zip(headers, row):
            val = cell
            if isinstance(val, datetime):
                val = val.isoformat()
            record[header] = val
        result.append(record)
    return result


@router.get("/dashboard")
def executive_dashboard(
    user: dict = Depends(require_executive),
    db: Session = Depends(get_db),
):
    """Org-wide headcount and hours-by-department summary."""
    employees = db.query(Employee).all()

    # Headcount
    total = len(employees)
    by_dept: dict[str, int] = {}
    by_track: dict[str, int] = {}
    managers = 0
    admins = 0
    executives = 0

    for emp in employees:
        dept = emp.department or "Unassigned"
        by_dept[dept] = by_dept.get(dept, 0) + 1
        for t in normalize_tracks(emp.track):
            by_track[t] = by_track.get(t, 0) + 1
        if emp.is_manager:
            managers += 1
        if emp.is_admin:
            admins += 1
        if emp.is_executive:
            executives += 1

    # Hours by department — aggregate all TimeRecord rows joined to Employee
    time_rows = (
        db.query(
            Employee.department,
            sa_func.sum(TimeRecord.regular_hours).label("regular"),
            sa_func.sum(TimeRecord.ot_hours).label("ot"),
            sa_func.sum(TimeRecord.vacation_hours).label("vacation"),
            sa_func.sum(TimeRecord.personal_hours).label("personal"),
            sa_func.sum(TimeRecord.other_hours).label("other"),
            sa_func.sum(TimeRecord.absent_w_point_hours).label("absent_w_point"),
            sa_func.sum(TimeRecord.protected_hours).label("protected"),
            sa_func.count(sa_func.distinct(TimeRecord.employee_id)).label("emp_count"),
        )
        .join(TimeRecord, Employee.employee_id == TimeRecord.employee_id)
        .group_by(Employee.department)
        .all()
    )

    hours_by_dept = [
        {
            "department": row.department or "Unassigned",
            "employee_count": row.emp_count,
            "regular_hours": round(row.regular or 0, 2),
            "ot_hours": round(row.ot or 0, 2),
            "vacation_hours": round(row.vacation or 0, 2),
            "personal_hours": round(row.personal or 0, 2),
            "other_hours": round(row.other or 0, 2),
            "absent_w_point_hours": round(row.absent_w_point or 0, 2),
            "protected_hours": round(row.protected or 0, 2),
        }
        for row in time_rows
    ]

    # Date range of hours data
    date_range_row = db.query(
        sa_func.min(TimeRecord.week_start).label("earliest"),
        sa_func.max(TimeRecord.week_start).label("latest"),
        sa_func.max(TimeRecord.imported_at).label("imported"),
    ).first()
    hours_date_range = None
    if date_range_row and date_range_row.earliest:
        hours_date_range = f"{date_range_row.earliest} – {date_range_row.latest}"

    # Latest import timestamp
    last_updated = date_range_row.imported.isoformat() if date_range_row and date_range_row.imported else None

    # Attendance threshold summary — latest point_total per employee
    subq = (
        db.query(
            AttendancePoint.employee_id,
            sa_func.max(AttendancePoint.point_total).label("max_total"),
        )
        .group_by(AttendancePoint.employee_id)
        .subquery()
    )
    threshold_counts = {"verbal": 0, "written": 0, "final": 0, "termination": 0}
    point_rows = db.query(subq).all()
    for row in point_rows:
        t = _classify_threshold(row.max_total)
        if t:
            threshold_counts[t] += 1

    return {
        "headcount": {
            "total": total,
            "by_department": [{"department": k, "count": v} for k, v in sorted(by_dept.items())],
            "by_track": by_track,
            "managers": managers,
            "admins": admins,
            "executives": executives,
        },
        "hours_by_department": sorted(hours_by_dept, key=lambda x: x["department"]),
        "hours_date_range": hours_date_range,
        "last_updated_hours": last_updated,
        "attendance_thresholds": threshold_counts,
    }


def _classify_threshold(total: float | None) -> str | None:
    if total is None:
        return None
    for min_pts, label in sorted(ATTENDANCE_THRESHOLDS.items(), reverse=True):
        if total >= min_pts:
            return label
    return None


@router.post("/wosh/upload")
async def upload_wosh(
    file: UploadFile = File(...),
    week_label: str = "",
    user: dict = Depends(require_executive),
    db: Session = Depends(get_db),
):
    """Upload a WOSH Excel workbook. Parses all sheets and stores the data."""
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xlsm", ".xls")):
        raise HTTPException(status_code=400, detail="File must be an Excel workbook (.xlsx or .xlsm).")

    contents = await file.read()
    try:
        wb = load_workbook(io.BytesIO(contents), data_only=True)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse Excel file. Make sure it is a valid .xlsx workbook.")

    sheet_names = wb.sheetnames
    if len(sheet_names) < 1:
        raise HTTPException(status_code=400, detail="Workbook has no sheets.")

    def _get_sheet(idx: int):
        if idx < len(sheet_names):
            ws = wb[sheet_names[idx]]
            return sheet_names[idx], _sheet_to_records(ws)
        return None, None

    s1_name, s1_data = _get_sheet(0)
    s2_name, s2_data = _get_sheet(1)
    s3_name, s3_data = _get_sheet(2)

    report = WoshReport(
        week_label=week_label.strip() or None,
        sheet1_name=s1_name,
        sheet1_data=s1_data,
        sheet2_name=s2_name,
        sheet2_data=s2_data,
        sheet3_name=s3_name,
        sheet3_data=s3_data,
        uploaded_by=user.get("sub"),
        uploaded_at=datetime.now(timezone.utc),
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return {
        "id": report.id,
        "week_label": report.week_label,
        "sheets": [
            {"name": s1_name, "rows": len(s1_data or [])},
            {"name": s2_name, "rows": len(s2_data or [])},
            {"name": s3_name, "rows": len(s3_data or [])},
        ],
        "uploaded_at": report.uploaded_at.isoformat(),
    }


@router.get("/wosh/latest")
def get_wosh_latest(
    user: dict = Depends(require_executive),
    db: Session = Depends(get_db),
):
    """Return the most recently uploaded WOSH report."""
    report = db.query(WoshReport).order_by(WoshReport.uploaded_at.desc()).first()
    if not report:
        return None
    return {
        "id": report.id,
        "week_label": report.week_label,
        "uploaded_at": report.uploaded_at.isoformat() if report.uploaded_at else None,
        "sheets": [
            {"name": report.sheet1_name, "data": report.sheet1_data or []},
            {"name": report.sheet2_name, "data": report.sheet2_data or []},
            {"name": report.sheet3_name, "data": report.sheet3_data or []},
        ],
    }


@router.get("/wosh/history")
def get_wosh_history(
    user: dict = Depends(require_executive),
    db: Session = Depends(get_db),
):
    """Return the list of all uploaded WOSH reports (metadata only, no row data)."""
    reports = db.query(WoshReport).order_by(WoshReport.uploaded_at.desc()).all()
    return [
        {
            "id": r.id,
            "week_label": r.week_label,
            "uploaded_at": r.uploaded_at.isoformat() if r.uploaded_at else None,
            "uploaded_by": r.uploaded_by,
            "sheets": [
                {"name": r.sheet1_name, "rows": len(r.sheet1_data or [])},
                {"name": r.sheet2_name, "rows": len(r.sheet2_data or [])},
                {"name": r.sheet3_name, "rows": len(r.sheet3_data or [])},
            ],
        }
        for r in reports
    ]


@router.get("/wosh/{report_id}")
def get_wosh_report(
    report_id: int,
    user: dict = Depends(require_executive),
    db: Session = Depends(get_db),
):
    """Return a specific WOSH report by ID."""
    report = db.query(WoshReport).filter_by(id=report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="WOSH report not found.")
    return {
        "id": report.id,
        "week_label": report.week_label,
        "uploaded_at": report.uploaded_at.isoformat() if report.uploaded_at else None,
        "sheets": [
            {"name": report.sheet1_name, "data": report.sheet1_data or []},
            {"name": report.sheet2_name, "data": report.sheet2_data or []},
            {"name": report.sheet3_name, "data": report.sheet3_data or []},
        ],
    }
