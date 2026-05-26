import csv
import io
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.auth.service import require_manager, normalize_tracks
from app.database.connection import get_db
from app.database.models import Employee, TimeRecord, PerformanceReview, UserProgress

router = APIRouter(prefix="/api/manager", tags=["manager"])

# ── Column name aliases accepted from HRIS CSV exports ────────────────────────

_TIME_COL_MAP = {
    "employee_id": "employee_id",
    "employeeid": "employee_id",
    "emp_id": "employee_id",
    "employee_number": "employee_id",
    "employeenumber": "employee_id",
    "employee #": "employee_id",
    "id": "employee_id",
    "week_start": "week_start",
    "weekstart": "week_start",
    "week_beginning": "week_start",
    "period_start": "week_start",
    "period start": "week_start",
    "week": "week_start",
    "date": "week_start",
    "pay_period_start": "week_start",
    "regular_hours": "regular_hours",
    "regular hours": "regular_hours",
    "reg_hours": "regular_hours",
    "reg hours": "regular_hours",
    "hours": "regular_hours",
    "hours_worked": "regular_hours",
    "regular": "regular_hours",
    "ot_hours": "ot_hours",
    "ot hours": "ot_hours",
    "overtime_hours": "ot_hours",
    "overtime hours": "ot_hours",
    "overtime": "ot_hours",
    "ot": "ot_hours",
    "pto_hours": "pto_hours",
    "pto hours": "pto_hours",
    "pto": "pto_hours",
    "vacation_hours": "pto_hours",
    "vacation": "pto_hours",
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


def _read_csv(contents: bytes) -> list[dict]:
    text = contents.decode("utf-8-sig")  # strip BOM if present
    reader = csv.DictReader(io.StringIO(text))
    return list(reader)


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

        week_start = _parse_date(week_start_raw)
        if not week_start:
            errors.append({"row": i, "employee_id": employee_id, "detail": f"Cannot parse week_start: '{week_start_raw}'."})
            skipped += 1
            continue

        # Delete existing record for this employee + week, then insert fresh
        db.query(TimeRecord).filter_by(
            employee_id=employee_id, week_start=week_start
        ).delete()

        db.add(TimeRecord(
            employee_id=employee_id,
            week_start=week_start,
            regular_hours=_parse_float(row.get("regular_hours", "0")),
            ot_hours=_parse_float(row.get("ot_hours", "0")),
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


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard")
def get_manager_dashboard(
    manager: dict = Depends(require_manager),
    db: Session = Depends(get_db),
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

    # ── Hours: sum over last 30 days ──────────────────────────────────────────
    cutoff = (date.today() - timedelta(days=30)).isoformat()

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
            "pto_hours": 0.0,
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
            hours_by_emp[r.employee_id]["pto_hours"] += r.pto_hours
            hours_by_emp[r.employee_id]["weeks_included"] += 1
            all_week_starts.add(r.week_start)

    # Round to 1 decimal place
    for emp_data in hours_by_emp.values():
        emp_data["regular_hours"] = round(emp_data["regular_hours"], 1)
        emp_data["ot_hours"] = round(emp_data["ot_hours"], 1)
        emp_data["pto_hours"] = round(emp_data["pto_hours"], 1)

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

    # Single "last updated" = most recent import across either source
    last_updated = None
    candidates = [t for t in [last_updated_time, last_updated_reviews] if t is not None]
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
    }
