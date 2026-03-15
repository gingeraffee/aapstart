from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.service import require_admin
from app.database.connection import get_db
from app.database.models import Employee, UserProgress

router = APIRouter(prefix="/api/admin", tags=["admin"])

VALID_TRACKS = {"hr", "warehouse", "administrative"}


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
