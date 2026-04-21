from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.database.models import UserNote
from app.notes.schemas import NoteCreate


def get_all_notes(db: Session, employee_id: str) -> list[UserNote]:
    return (
        db.query(UserNote)
        .filter(UserNote.employee_id == employee_id)
        .order_by(UserNote.created_at.desc())
        .all()
    )


def get_notes_for_module(db: Session, employee_id: str, module_slug: str) -> list[UserNote]:
    return (
        db.query(UserNote)
        .filter(UserNote.employee_id == employee_id, UserNote.module_slug == module_slug)
        .order_by(UserNote.created_at.desc())
        .all()
    )


def create_note(db: Session, employee_id: str, module_slug: str, payload: NoteCreate) -> UserNote:
    note_text = payload.note_text.strip()
    if not note_text:
        raise HTTPException(status_code=422, detail="Note text cannot be empty.")

    selected_text = payload.selected_text.strip() if payload.selected_text else None
    anchor_id = payload.anchor_id.strip() if payload.anchor_id else None

    note = UserNote(
        employee_id=employee_id,
        module_slug=module_slug,
        module_title=payload.module_title,
        note_text=note_text,
        selected_text=selected_text or None,
        anchor_id=anchor_id or None,
        status="open",
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def update_note_status(db: Session, employee_id: str, note_id: int, status: str) -> UserNote:
    if status not in ("open", "answered"):
        raise HTTPException(status_code=422, detail="Status must be 'open' or 'answered'.")

    note = db.query(UserNote).filter(UserNote.id == note_id, UserNote.employee_id == employee_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found.")

    note.status = status
    db.commit()
    db.refresh(note)
    return note


def delete_note(db: Session, employee_id: str, note_id: int) -> None:
    note = db.query(UserNote).filter(UserNote.id == note_id, UserNote.employee_id == employee_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found.")
    db.delete(note)
    db.commit()
