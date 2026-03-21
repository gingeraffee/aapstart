from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from app.auth.service import require_admin
from app.database.connection import get_db
from app.database.models import Employee, UserProgress
from app.content.loader import get_modules_for_track

router = APIRouter(prefix="/api/admin", tags=["admin"])

VALID_TRACKS = {"hr", "warehouse", "administrative", "management"}


# ── Schemas ───────────────────────────────────────────────────────────────────

class EmployeeCreate(BaseModel):
    employee_id: str
    first_name: str
    last_name: str
    track: str
    is_admin: bool = False


class EmployeeUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    track: str | None = None
    is_admin: bool | None = None


class EmployeeImportRow(BaseModel):
    employee_id: str
    track: str
    name: str | None = None
    full_name: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    is_admin: bool = False


class EmployeeImportRequest(BaseModel):
    employees: list[EmployeeImportRow]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _progress_summary(employee_id: str, db: Session) -> dict:
    rows = db.query(UserProgress).filter_by(employee_id=employee_id).all()
    completed = sum(1 for r in rows if r.module_completed)
    last_active = max((r.last_updated for r in rows if r.last_updated), default=None)
    return {
        "modules_completed": completed,
        "total_modules_seen": len(rows),
        "last_active": last_active.isoformat() if last_active else None,
    }


def _serialize(emp: Employee, db: Session) -> dict:
    return {
        "id": emp.id,
        "employee_id": emp.employee_id,
        "first_name": emp.first_name,
        "last_name": emp.last_name,
        "full_name": f"{emp.first_name} {emp.last_name}",
        "track": emp.track,
        "is_admin": emp.is_admin,
        "created_at": emp.created_at.isoformat() if emp.created_at else None,
        "first_login_at": emp.first_login_at.isoformat() if emp.first_login_at else None,
        "progress": _progress_summary(emp.employee_id, db),
    }


def _resolve_names(row: EmployeeImportRow) -> tuple[str | None, str | None]:
    if row.first_name and row.last_name:
        first_name = row.first_name.strip()
        last_name = row.last_name.strip()
        if first_name and last_name:
            return first_name, last_name

    raw_name = (row.full_name or row.name or "").strip()
    if not raw_name:
        return None, None

    parts = raw_name.split()
    if len(parts) < 2:
        return None, None

    return parts[0], " ".join(parts[1:])


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/employees")
def list_employees(
    admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    employees = db.query(Employee).order_by(Employee.created_at).all()
    return [_serialize(e, db) for e in employees]


@router.post("/employees", status_code=status.HTTP_201_CREATED)
def create_employee(
    payload: EmployeeCreate,
    admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if payload.track not in VALID_TRACKS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Track must be one of: {', '.join(sorted(VALID_TRACKS))}",
        )
    existing = db.query(Employee).filter_by(employee_id=payload.employee_id.strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Employee ID '{payload.employee_id}' already exists.",
        )
    emp = Employee(
        employee_id=payload.employee_id.strip(),
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        track=payload.track.strip().lower(),
        is_admin=payload.is_admin,
        created_at=datetime.now(timezone.utc),
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return _serialize(emp, db)


@router.post("/employees/import")
def import_employees(
    payload: EmployeeImportRequest,
    admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if not payload.employees:
        raise HTTPException(status_code=400, detail="No employees were provided for import.")

    existing_ids = {employee_id for (employee_id,) in db.query(Employee.employee_id).all()}
    seen_ids: set[str] = set()
    created: list[Employee] = []
    errors: list[dict] = []

    for index, row in enumerate(payload.employees, start=1):
        employee_id = row.employee_id.strip()
        track = row.track.strip().lower()

        if not employee_id:
            errors.append({"row": index, "employee_id": None, "detail": "Employee number is required."})
            continue

        if track not in VALID_TRACKS:
            errors.append({
                "row": index,
                "employee_id": employee_id,
                "detail": f"Track '{row.track}' is invalid.",
            })
            continue

        if employee_id in seen_ids:
            errors.append({
                "row": index,
                "employee_id": employee_id,
                "detail": "Employee number is duplicated in this import file.",
            })
            continue

        if employee_id in existing_ids:
            errors.append({
                "row": index,
                "employee_id": employee_id,
                "detail": "Employee already exists.",
            })
            continue

        first_name, last_name = _resolve_names(row)
        if not first_name or not last_name:
            errors.append({
                "row": index,
                "employee_id": employee_id,
                "detail": "A full employee name with first and last name is required.",
            })
            continue

        employee = Employee(
            employee_id=employee_id,
            first_name=first_name,
            last_name=last_name,
            track=track,
            is_admin=row.is_admin,
            created_at=datetime.now(timezone.utc),
        )
        db.add(employee)
        created.append(employee)
        seen_ids.add(employee_id)

    if created:
        db.commit()

    return {
        "added": len(created),
        "skipped": len(errors),
        "errors": errors,
    }


@router.patch("/employees/{employee_id}")
def update_employee(
    employee_id: str,
    payload: EmployeeUpdate,
    admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter_by(employee_id=employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")
    if payload.first_name is not None:
        emp.first_name = payload.first_name.strip()
    if payload.last_name is not None:
        emp.last_name = payload.last_name.strip()
    if payload.track is not None:
        if payload.track not in VALID_TRACKS:
            raise HTTPException(status_code=400, detail=f"Invalid track.")
        emp.track = payload.track.lower()
    if payload.is_admin is not None:
        emp.is_admin = payload.is_admin
    db.commit()
    db.refresh(emp)
    return _serialize(emp, db)


@router.delete("/employees/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    employee_id: str,
    admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter_by(employee_id=employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")
    # Prevent self-deletion
    if employee_id == admin.get("sub"):
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")
    db.delete(emp)
    db.commit()


# ── Dashboard ────────────────────────────────────────────────────────────────

@router.get("/dashboard")
def get_dashboard(
    admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Aggregated dashboard stats for HR admins."""
    employees = db.query(Employee).all()
    total = len(employees)

    # Count by track
    by_track: dict[str, int] = {}
    for emp in employees:
        by_track[emp.track] = by_track.get(emp.track, 0) + 1

    # Get all published non-management modules (journey modules)
    # Use HR track to get the full list including all shared modules
    all_modules = get_modules_for_track("hr")
    journey_modules = [m for m in all_modules if "management" not in m.get("tracks", [])]
    journey_slugs = {m["slug"] for m in journey_modules}
    total_journey_modules = len(journey_modules)

    # Get all non-management employees (journey participants)
    journey_employees = [e for e in employees if e.track != "management"]
    journey_employee_ids = {e.employee_id for e in journey_employees}

    # Fetch all progress rows for journey modules
    all_progress = db.query(UserProgress).filter(
        UserProgress.module_slug.in_(journey_slugs)
    ).all() if journey_slugs else []

    # Build per-employee completion map
    emp_completed: dict[str, int] = {}  # employee_id -> completed count
    emp_visited: dict[str, bool] = {}   # employee_id -> has any progress
    for row in all_progress:
        if row.employee_id not in journey_employee_ids:
            continue
        if row.module_completed:
            emp_completed[row.employee_id] = emp_completed.get(row.employee_id, 0) + 1
        if row.visited:
            emp_visited[row.employee_id] = True

    all_complete = sum(1 for eid in journey_employee_ids if emp_completed.get(eid, 0) >= total_journey_modules) if total_journey_modules > 0 else 0
    in_progress = sum(1 for eid in journey_employee_ids if emp_visited.get(eid, False) and emp_completed.get(eid, 0) < total_journey_modules)
    not_started = len(journey_employee_ids) - len(emp_visited)

    # Recent logins (last 7 days)
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=7)
    recent_logins = []
    for emp in sorted(employees, key=lambda e: e.last_login_at or datetime.min, reverse=True):
        if emp.last_login_at and emp.last_login_at >= cutoff:
            recent_logins.append({
                "full_name": f"{emp.first_name} {emp.last_name}",
                "track": emp.track,
                "last_login_at": emp.last_login_at.isoformat(),
            })

    # Per-module completion counts (journey modules only)
    module_completion: dict[str, int] = {}
    for row in all_progress:
        if row.employee_id in journey_employee_ids and row.module_completed:
            module_completion[row.module_slug] = module_completion.get(row.module_slug, 0) + 1

    module_progress = []
    for m in journey_modules:
        module_progress.append({
            "module_slug": m["slug"],
            "title": m["title"],
            "completed": module_completion.get(m["slug"], 0),
            "total": len(journey_employee_ids),
        })

    return {
        "total_employees": total,
        "by_track": by_track,
        "completion": {
            "all_complete": all_complete,
            "in_progress": in_progress,
            "not_started": not_started,
        },
        "recent_logins": recent_logins,
        "module_progress": module_progress,
    }
