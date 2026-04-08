from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.service import get_current_user
from app.database.connection import get_db
from app.notes import service
from app.notes.schemas import NoteCreate, NoteStatusUpdate, NoteResponse

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("", response_model=list[NoteResponse])
def get_all_notes(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.get_all_notes(db, current_user["sub"])


@router.get("/{slug}", response_model=list[NoteResponse])
def get_notes_for_module(
    slug: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.get_notes_for_module(db, current_user["sub"], slug)


@router.post("/{slug}", response_model=NoteResponse, status_code=201)
def create_note(
    slug: str,
    payload: NoteCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.create_note(db, current_user["sub"], slug, payload)


@router.patch("/{note_id}/status", response_model=NoteResponse)
def update_note_status(
    note_id: int,
    payload: NoteStatusUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.update_note_status(db, current_user["sub"], note_id, payload.status)


@router.delete("/{note_id}", status_code=204)
def delete_note(
    note_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service.delete_note(db, current_user["sub"], note_id)
