import csv
import io
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session

from app.auth.service import require_manager, normalize_tracks
from app.database.connection import get_db
from app.database.models import Employee, TimeRecord, PerformanceReview, UserProgress, AbsenceRecord

router = APIRouter(prefix="/api/manager", tags=["manager"])

# ── Column name aliases accepted from HRIS CSV exports ────────────────────────

_TIME_COL_MAP = {
    # Employee identifier
    "employee_id": "employee_id",
    "employeeid": "employee_id",
    "emp_id": "employee_id",
    "employee_number": "employee_id",
    "employeenumber": "employee_id",
    "employee #": "employee_id",
    "employee number": "employee_id",
    "id": "employee_id",
    # Employee name — accepted but ignored (looked up from DB)
    "employee_name": "_ignore",
    "name": "_ignore",
    "full_name": "_ignore",
    "employee name": "_ignore",
    # Period start date (optional — defaults to upload date)
    "week_start": "week_start",
    "weekstart": "week_start",
    "week_beginning": "week_start",
    "period_start": "week_start",
    "period start": "week_start",
    "start_date": "week_start",
    "start date": "week_start",
    "week": "week_start",
    "date": "week_start",
    "pay_period_start": "week_start",
    # Regular hours
    "regular_hours": "regular_hours",
    "regular hours": "regular_hours",
    "reg_hours": "regular_hours",
    "reg hours": "regular_hours",
    "reg": "regular_hours",
    "hours": "regular_hours",
    "hours_worked": "regular_hours",
    "regular": "regular_hours",
    # Overtime
    "ot_hours": "ot_hours",
    "ot hours": "ot_hours",
    "overtime_hours": "ot_hours",
    "overtime hours": "ot_hours",
    "overtime": "ot_hours",
    "ot": "ot_hours",
    # Vacation
    "vacation_hours": "vacation_hours",
    "vacation hours": "vacation_hours",
    "vacation": "vacation_hours",
    "vac_hours": "vacation_hours",
    "vac hours": "vacation_hours",
    "vac": "vacation_hours",
    # Personal
    "personal_hours": "personal_hours",
    "personal hours": "personal_hours",
    "personal": "personal_hours",
    "pers_hours": "personal_hours",
    "pers hours": "personal_hours",
    "pers": "personal_hours",
    # Other / misc
    "other_hours": "other_hours",
    "other hours": "other_hours",
    "other": "other_hours",
    "misc_hours": "other_hours",
    "misc hours": "other_hours",
    "misc": "other_hours",
    # Legacy PTO catch-all (still accepted from old files)
    "pto_hours": "pto_hours",
    "pto hours": "pto_hours",
    "pto": "pto_hours",
    "leave_hours": "pto_hours",
    "leave": "pto_hours",
}

_REVIEW_COL_MAP = {
    "employee_id": "employee_id",
    "employeeid": "employee_id",
    "emp_id": "employee_id",
    "employee_number": "employee_id",
    "employeenumber": "employee_id",
    "employee #": "employee_id",
    "id": "employee_id",
    "review_type": "review_type",
    "type": "review_type",
    "review type": "review_type",
    "evaluation_type": "review_type",
    "performance_review_type": "review_type",
    "due_date": "due_date",
    "due date": "due_date",
    "scheduled_date": "due_date",
    "scheduled date": "due_date",
    "review_date": "due_date",
    "review date": "due_date",
    "date": "due_date",
    "completed": "completed",
    "status": "completed",
    "complete": "completed",
    "done": "completed",
    "completed_date": "completed_date",
    "completion_date": "completed_date",
    "date_completed": "completed_date",
    "actual_date": "completed_date",
    "review_completed_date": "completed_date",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _normalize_header(value: str) -> str:
    return value.strip().lower().replace("-", "_")


def _parse_date(value: str) -> str | None:
    """Return ISO date string or None. Accepts YYYY-MM-DD and M/D/YYYY."""
    value = value.strip()
    if not value:
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m-%d-%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def _parse_bool(value: str) -> bool:
    return value.strip().lower() in {"true", "yes", "1", "completed", "done", "complete"}


def _parse_float(value: str) -> float:
    try:
        return float(value.strip() or "0")
    except ValueError:
        return 0.0


def _map_row(raw_row: dict, col_map: dict) -> dict:
    """Remap CSV row keys using col_map aliases."""
    mapped: dict = {}
    for raw_key, value in raw_row.items():
        canonical = col_map.get(_normalize_header(raw_key))
        if canonical:
            mapped[canonical] = value
    return mapped


_ABSENCE_COL_MAP = {
    # Employee identifier
    "employee_id": "employee_id",
    "employeeid": "employee_id",
    "employee_number": "employee_id",
    "employeenumber": "employee_id",
    "employee #": "employee_id",
    "employee number": "employee_id",
    "emp_id": "employee_id",
    "id": "employee_id",
    # Employee name (stored for reference)
    "name": "employee_name",
    "employee_name": "employee_name",
    "full_name": "employee_name",
    "employee name": "employee_name",
    # Absence category
    "category": "category",
    "type": "category",
    "absence_type": "category",
    "leave_type": "category",
    # First day of absence
    "from": "from_date",
    "from_date": "from_date",
    "start_date": "from_date",
    "start date": "from_date",
    "absence_start": "from_date",
    # Last day of absence
    "to": "to_date",
    "to_date": "to_date",
    "end_date": "to_date",
    "end date": "to_date",
    "absence_end": "to_date",
    # Date the request was submitted
    "requested": "requested_date",
    "requested_date": "requested_date",
    "request_date": "requested_date",
    "submitted": "requested_date",
    "submitted_date": "requested_date",
    "date_requested": "requested_date",
    # Hours taken
    "time_off": "time_off_hours",
    "time off": "time_off_hours",
    "hours": "time_off_hours",
    "hours_taken": "time_off_hours",
    "absence_hours": "time_off_hours",
    "duration": "time_off_hours",
}


def _read_csv(contents: bytes) -> list[dict]:
    text = contents.decode("utf-8-sig")  # strip BOM if present
    reader = csv.DictReader(io.StringIO(text))
    return list(reader)


def _read_xlsx(contents: bytes) -> list[dict]:
    import openpyxl
    wb = openpyxl.load_workbook(filename=io.BytesIO(contents), read_only=True, data_only=True)
    sheet_name = "Time Off Used" if "Time Off Used" in wb.sheetnames else wb.sheetnames[0]
    ws = wb[sheet_name]
    rows_data = list(ws.iter_rows(values_only=True))
    if not rows_data:
        return []
    headers = [str(h).strip() if h is not None else "" for h in rows_data[0]]
    result = []
    for row in rows_data[1:]:
        if all(v is None for v in row):
            continue
        d: dict = {}
        for i, val in enumerate(row):
            if i >= len(headers):
                break
            # openpyxl returns datetime/date objects for date cells — convert to ISO strings
            if hasattr(val, "date") and callable(val.date):
                d[headers[i]] = val.date().isoformat()
            elif hasattr(val, "isoformat"):
                d[headers[i]] = val.isoformat()
            elif val is None:
                d[headers[i]] = ""
            else:
                d[headers[i]] = str(val).strip()
        result.append(d)
    return result


# ── Import endpoints ──────────────────────────────────────────────────────────

@router.post("/import/time")
async def import_time(
    file: UploadFile = File(...),
    manager: dict = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """
    Upload a weekly hours CSV. Replaces existing records for any
    (employee_id, week_start) pair found in the file.

    Expected columns (flexible — see _TIME_COL_MAP for accepted aliases):
      employee_id, week_start, regular_hours, ot_hours, pto_hours
    """
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv file.")

    contents = await file.read()
    try:
        rows = _read_csv(contents)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse CSV file.")

    if not rows:
        raise HTTPException(status_code=400, detail="CSV file is empty.")

    imported_at = datetime.now(timezone.utc)
    inserted = 0
    skipped = 0
    errors: list[dict] = []

    for i, raw_row in enumerate(rows, start=2):
        row = _map_row(raw_row, _TIME_COL_MAP)

        employee_id = row.get("employee_id", "").strip()
        week_start_raw = row.get("week_start", "").strip()

        if not employee_id:
            errors.append({"row": i, "detail": "Missing employee_id."})
            skipped += 1
            continue

        # Validate employee exists in the system
        emp = db.query(Employee).filter_by(employee_id=employee_id).first()
        if not emp:
            errors.append({"row": i, "employee_id": employee_id, "detail": f"Employee '{employee_id}' not found — check the ID matches exactly what's in the system."})
            skipped += 1
            continue

        # week_start is optional — defaults to today when absent
        if week_start_raw:
            week_start = _parse_date(week_start_raw)
            if not week_start:
                errors.append({"row": i, "employee_id": employee_id, "detail": f"Cannot parse date: '{week_start_raw}'. Use YYYY-MM-DD or M/D/YYYY."})
                skipped += 1
                continue
        else:
            week_start = date.today().isoformat()

        # Delete existing record for this employee + period, then insert fresh
        db.query(TimeRecord).filter_by(
            employee_id=employee_id, week_start=week_start
        ).delete()

        db.add(TimeRecord(
            employee_id=employee_id,
            week_start=week_start,
            regular_hours=_parse_float(row.get("regular_hours", "0")),
            ot_hours=_parse_float(row.get("ot_hours", "0")),
            vacation_hours=_parse_float(row.get("vacation_hours", "0")),
            personal_hours=_parse_float(row.get("personal_hours", "0")),
            other_hours=_parse_float(row.get("other_hours", "0")),
            # Legacy pto_hours: carry forward from old files, otherwise 0
            pto_hours=_parse_float(row.get("pto_hours", "0")),
            imported_at=imported_at,
        ))
        inserted += 1

    db.commit()
    return {"inserted": inserted, "skipped": skipped, "errors": errors}


@router.post("/import/reviews")
async def import_reviews(
    file: UploadFile = File(...),
    manager: dict = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """
    Upload a performance reviews CSV. Upserts on (employee_id, review_type, due_date).

    Expected columns (flexible — see _REVIEW_COL_MAP for accepted aliases):
      employee_id, review_type, due_date, completed, completed_date
    """
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv file.")

    contents = await file.read()
    try:
        rows = _read_csv(contents)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse CSV file.")

    if not rows:
        raise HTTPException(status_code=400, detail="CSV file is empty.")

    imported_at = datetime.now(timezone.utc)
    inserted = 0
    skipped = 0
    errors: list[dict] = []

    for i, raw_row in enumerate(rows, start=2):
        row = _map_row(raw_row, _REVIEW_COL_MAP)

        employee_id = row.get("employee_id", "").strip()
        review_type = row.get("review_type", "").strip()
        due_date_raw = row.get("due_date", "").strip()

        if not employee_id:
            errors.append({"row": i, "detail": "Missing employee_id."})
            skipped += 1
            continue

        # Validate employee exists in the system
        emp = db.query(Employee).filter_by(employee_id=employee_id).first()
        if not emp:
            errors.append({"row": i, "employee_id": employee_id, "detail": f"Employee '{employee_id}' not found — check the ID matches exactly what's in the system."})
            skipped += 1
            continue

        if not review_type:
            errors.append({"row": i, "employee_id": employee_id, "detail": "Missing review_type."})
            skipped += 1
            continue

        due_date = _parse_date(due_date_raw)
        if not due_date:
            errors.append({"row": i, "employee_id": employee_id, "detail": f"Cannot parse due_date: '{due_date_raw}'."})
            skipped += 1
            continue

        completed = _parse_bool(row.get("completed", "false"))
        completed_date = _parse_date(row.get("completed_date", ""))

        # Upsert: delete existing match, then insert
        db.query(PerformanceReview).filter_by(
            employee_id=employee_id,
            review_type=review_type,
            due_date=due_date,
        ).delete()

        db.add(PerformanceReview(
            employee_id=employee_id,
            review_type=review_type,
            due_date=due_date,
            completed=completed,
            completed_date=completed_date,
            imported_at=imported_at,
        ))
        inserted += 1

    db.commit()
    return {"inserted": inserted, "skipped": skipped, "errors": errors}


@router.post("/import/absences")
async def import_absences(
    file: UploadFile = File(...),
    manager: dict = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """
    Upload a time-off/absence report (XLSX or CSV).
    Replaces all existing absence records for every employee present in the file.

    Expected columns (flexible — see _ABSENCE_COL_MAP for accepted aliases):
      Employee Number, Name, Category, From, To, Requested, Time Off
    """
    name = file.filename or ""
    is_xlsx = name.lower().endswith(".xlsx")
    is_csv = name.lower().endswith(".csv")
    if not is_xlsx and not is_csv:
        raise HTTPException(status_code=400, detail="File must be a .xlsx or .csv file.")

    contents = await file.read()
    try:
        rows = _read_xlsx(contents) if is_xlsx else _read_csv(contents)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse file.")

    if not rows:
        raise HTTPException(status_code=400, detail="File is empty.")

    imported_at = datetime.now(timezone.utc)
    inserted = 0
    skipped = 0
    errors: list[dict] = []

    # Collect valid employee IDs first so we can do a bulk delete before insert
    seen_employee_ids: set[str] = set()
    parsed_rows: list[dict] = []

    for i, raw_row in enumerate(rows, start=2):
        row = _map_row(raw_row, _ABSENCE_COL_MAP)

        employee_id = str(row.get("employee_id", "")).strip()
        if not employee_id:
            errors.append({"row": i, "detail": "Missing employee number / ID."})
            skipped += 1
            continue

        emp = db.query(Employee).filter_by(employee_id=employee_id).first()
        if not emp:
            errors.append({"row": i, "employee_id": employee_id, "detail": f"Employee '{employee_id}' not found — check the ID matches exactly."})
            skipped += 1
            continue

        from_raw = str(row.get("from_date", "")).strip()
        requested_raw = str(row.get("requested_date", "")).strip()

        from_date = _parse_date(from_raw)
        if not from_date:
            errors.append({"row": i, "employee_id": employee_id, "detail": f"Cannot parse From date: '{from_raw}'."})
            skipped += 1
            continue

        requested_date = _parse_date(requested_raw)
        if not requested_date:
            errors.append({"row": i, "employee_id": employee_id, "detail": f"Cannot parse Requested date: '{requested_raw}'."})
            skipped += 1
            continue

        to_date = _parse_date(str(row.get("to_date", "")).strip())
        time_off_hours = _parse_float(str(row.get("time_off_hours", "0")))
        is_planned = requested_date < from_date

        seen_employee_ids.add(employee_id)
        parsed_rows.append({
            "employee_id": employee_id,
            "employee_name": str(row.get("employee_name", "")).strip() or None,
            "category": str(row.get("category", "")).strip() or None,
            "from_date": from_date,
            "to_date": to_date,
            "requested_date": requested_date,
            "time_off_hours": time_off_hours,
            "is_planned": is_planned,
        })

    # Delete all existing records for employees in this upload, then insert fresh
    if seen_employee_ids:
        db.query(AbsenceRecord).filter(
            AbsenceRecord.employee_id.in_(seen_employee_ids)
        ).delete(synchronize_session=False)

    for pr in parsed_rows:
        db.add(AbsenceRecord(
            employee_id=pr["employee_id"],
            employee_name=pr["employee_name"],
            category=pr["category"],
            from_date=pr["from_date"],
            to_date=pr["to_date"],
            requested_date=pr["requested_date"],
            time_off_hours=pr["time_off_hours"],
            is_planned=pr["is_planned"],
            imported_at=imported_at,
        ))
        inserted += 1

    db.commit()
    return {"inserted": inserted, "skipped": skipped, "errors": errors}


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard")
def get_manager_dashboard(
    manager: dict = Depends(require_manager),
    db: Session = Depends(get_db),
    weeks: int = Query(default=4, ge=0, le=520, description="Number of weeks to look back. 0 = all time."),
):
    """Aggregated manager dashboard: hours, PTO, and performance reviews for assigned team."""
    manager_id = manager["sub"]

    team = db.query(Employee).filter_by(manager_employee_id=manager_id).all()
    team_ids = {e.employee_id for e in team}
    team_by_id = {e.employee_id: e for e in team}

    if not team_ids:
        return {
            "team_size": 0,
            "last_updated_time": None,
            "last_updated_reviews": None,
            "hours_summary": [],
            "upcoming_reviews": [],
            "past_due_reviews": [],
        }

    # ── Hours: sum over requested window ─────────────────────────────────────
    if weeks == 0:
        # All time — no cutoff
        time_records = db.query(TimeRecord).filter(
            TimeRecord.employee_id.in_(team_ids),
        ).all()
    else:
        cutoff = (date.today() - timedelta(weeks=weeks)).isoformat()
        time_records = db.query(TimeRecord).filter(
            TimeRecord.employee_id.in_(team_ids),
            TimeRecord.week_start >= cutoff,
        ).all()

    hours_by_emp: dict[str, dict] = {
        eid: {
            "employee_id": eid,
            "full_name": f"{team_by_id[eid].first_name} {team_by_id[eid].last_name}",
            "department": team_by_id[eid].department,
            "regular_hours": 0.0,
            "ot_hours": 0.0,
            "vacation_hours": 0.0,
            "personal_hours": 0.0,
            "other_hours": 0.0,
            "weeks_included": 0,
        }
        for eid in team_ids
    }

    # Track distinct week_starts across all records
    all_week_starts: set[str] = set()

    for r in time_records:
        if r.employee_id in hours_by_emp:
            hours_by_emp[r.employee_id]["regular_hours"] += r.regular_hours
            hours_by_emp[r.employee_id]["ot_hours"] += r.ot_hours
            # vacation/personal/other — new columns; fall back to legacy pto_hours split
            vac = getattr(r, "vacation_hours", 0.0) or 0.0
            pers = getattr(r, "personal_hours", 0.0) or 0.0
            other = getattr(r, "other_hours", 0.0) or 0.0
            pto = getattr(r, "pto_hours", 0.0) or 0.0
            # If new columns are all zero but legacy pto exists, put it under vacation
            if vac == 0.0 and pers == 0.0 and other == 0.0 and pto > 0.0:
                vac = pto
            hours_by_emp[r.employee_id]["vacation_hours"] += vac
            hours_by_emp[r.employee_id]["personal_hours"] += pers
            hours_by_emp[r.employee_id]["other_hours"] += other
            hours_by_emp[r.employee_id]["weeks_included"] += 1
            all_week_starts.add(r.week_start)

    # Round to 1 decimal place
    for emp_data in hours_by_emp.values():
        emp_data["regular_hours"] = round(emp_data["regular_hours"], 1)
        emp_data["ot_hours"] = round(emp_data["ot_hours"], 1)
        emp_data["vacation_hours"] = round(emp_data["vacation_hours"], 1)
        emp_data["personal_hours"] = round(emp_data["personal_hours"], 1)
        emp_data["other_hours"] = round(emp_data["other_hours"], 1)

    # Date range string for UI: "May 5 – May 26 (4 weeks)"
    def _fmt_iso_date(iso: str) -> str:
        """Format ISO date as "Mon D" (no zero-padding) cross-platform."""
        d = date.fromisoformat(iso)
        return d.strftime("%b") + " " + str(d.day)  # e.g. "May 5"

    sorted_weeks = sorted(all_week_starts)
    hours_date_range: str | None = None
    if sorted_weeks:
        earliest = _fmt_iso_date(sorted_weeks[0])
        latest = _fmt_iso_date(sorted_weeks[-1])
        hours_date_range = f"{earliest} – {latest}" if earliest != latest else earliest
        hours_week_count = len(sorted_weeks)
    else:
        hours_week_count = 0

    # Last import date for time records
    all_time = db.query(TimeRecord).filter(TimeRecord.employee_id.in_(team_ids)).all()
    last_updated_time = max((r.imported_at for r in all_time if r.imported_at), default=None)

    # ── Performance reviews ───────────────────────────────────────────────────
    reviews = db.query(PerformanceReview).filter(
        PerformanceReview.employee_id.in_(team_ids),
    ).all()

    today = date.today()
    upcoming: list[dict] = []
    past_due: list[dict] = []

    for r in reviews:
        if r.completed:
            continue
        emp = team_by_id.get(r.employee_id)
        if not emp:
            continue
        try:
            due = date.fromisoformat(r.due_date)
        except ValueError:
            continue
        diff = (due - today).days
        entry = {
            "employee_id": r.employee_id,
            "full_name": f"{emp.first_name} {emp.last_name}",
            "review_type": r.review_type,
            "due_date": r.due_date,
        }
        if diff >= 0:
            upcoming.append({**entry, "days_until": diff})
        else:
            past_due.append({**entry, "days_overdue": abs(diff)})

    upcoming.sort(key=lambda x: x["days_until"])
    past_due.sort(key=lambda x: x["days_overdue"], reverse=True)

    last_updated_reviews = max((r.imported_at for r in reviews if r.imported_at), default=None)

    # ── Absences ──────────────────────────────────────────────────────────────
    if weeks == 0:
        absence_records = db.query(AbsenceRecord).filter(
            AbsenceRecord.employee_id.in_(team_ids),
        ).all()
    else:
        absence_records = db.query(AbsenceRecord).filter(
            AbsenceRecord.employee_id.in_(team_ids),
            AbsenceRecord.from_date >= cutoff,
        ).all()

    absence_by_emp: dict[str, dict] = {}
    all_absence_dates: list[str] = []

    for r in absence_records:
        emp = team_by_id.get(r.employee_id)
        if not emp:
            continue
        if r.employee_id not in absence_by_emp:
            absence_by_emp[r.employee_id] = {
                "employee_id": r.employee_id,
                "full_name": f"{emp.first_name} {emp.last_name}",
                "planned_count": 0,
                "unplanned_count": 0,
                "planned_hours": 0.0,
                "unplanned_hours": 0.0,
            }
        if r.is_planned:
            absence_by_emp[r.employee_id]["planned_count"] += 1
            absence_by_emp[r.employee_id]["planned_hours"] += r.time_off_hours
        else:
            absence_by_emp[r.employee_id]["unplanned_count"] += 1
            absence_by_emp[r.employee_id]["unplanned_hours"] += r.time_off_hours
        all_absence_dates.append(r.from_date)

    for d in absence_by_emp.values():
        d["planned_hours"] = round(d["planned_hours"], 1)
        d["unplanned_hours"] = round(d["unplanned_hours"], 1)

    sorted_absence_dates = sorted(all_absence_dates)
    absence_date_range: str | None = None
    if sorted_absence_dates:
        earliest = _fmt_iso_date(sorted_absence_dates[0])
        latest = _fmt_iso_date(sorted_absence_dates[-1])
        absence_date_range = f"{earliest} – {latest}" if earliest != latest else earliest

    last_updated_absences = max(
        (r.imported_at for r in absence_records if r.imported_at), default=None
    )

    # Single "last updated" = most recent import across any source
    last_updated = None
    candidates = [t for t in [last_updated_time, last_updated_reviews, last_updated_absences] if t is not None]
    if candidates:
        last_updated = max(candidates)

    # ── Team roster ───────────────────────────────────────────────────────────
    progress_rows = db.query(UserProgress).filter(
        UserProgress.employee_id.in_(team_ids)
    ).all()
    emp_modules_completed: dict[str, int] = {}
    for row in progress_rows:
        if row.module_completed:
            emp_modules_completed[row.employee_id] = emp_modules_completed.get(row.employee_id, 0) + 1

    team_list = [
        {
            "employee_id": e.employee_id,
            "full_name": f"{e.first_name} {e.last_name}",
            "tracks": normalize_tracks(e.track),
            "department": e.department,
            "last_login_at": e.last_login_at.isoformat() if e.last_login_at else None,
            "modules_completed": emp_modules_completed.get(e.employee_id, 0),
            "first_login_at": e.first_login_at.isoformat() if e.first_login_at else None,
        }
        for e in sorted(team, key=lambda x: (x.last_name, x.first_name))
    ]

    total_planned = sum(v["planned_count"] for v in absence_by_emp.values())
    total_unplanned = sum(v["unplanned_count"] for v in absence_by_emp.values())

    return {
        "team_size": len(team),
        "last_updated": last_updated.isoformat() if last_updated else None,
        "last_updated_time": last_updated_time.isoformat() if last_updated_time else None,
        "last_updated_reviews": last_updated_reviews.isoformat() if last_updated_reviews else None,
        "hours_summary": sorted(hours_by_emp.values(), key=lambda x: x["full_name"]),
        "hours_date_range": hours_date_range,
        "hours_week_count": hours_week_count,
        "upcoming_reviews": upcoming,
        "past_due_reviews": past_due,
        "team": team_list,
        "absence_summary": sorted(absence_by_emp.values(), key=lambda x: x["full_name"]),
        "total_planned_absences": total_planned,
        "total_unplanned_absences": total_unplanned,
        "absence_date_range": absence_date_range,
        "last_updated_absences": last_updated_absences.isoformat() if last_updated_absences else None,
    }
