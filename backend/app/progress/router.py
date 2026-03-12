from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.auth.service import get_current_user
from app.database.connection import get_db
from app.progress import service
from app.progress.schemas import (
    ProgressRecord,
    AcknowledgeRequest,
    QuizSubmitRequest,
    QuizSubmitResponse,
)

router = APIRouter(prefix="/api/progress", tags=["progress"])


@router.get("", response_model=list[ProgressRecord])
def get_all_progress(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    records = service.get_all_progress(db, current_user["sub"])
    return records


@router.post("/{slug}/visit", response_model=ProgressRecord)
def visit_module(
    slug: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.mark_visited(db, current_user["sub"], slug, current_user["track"])


@router.post("/{slug}/acknowledge", response_model=ProgressRecord)
def acknowledge_module(
    slug: str,
    payload: AcknowledgeRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.complete_acknowledgement(
        db, current_user["sub"], slug, current_user["track"], payload.acknowledged_ids
    )


@router.post("/{slug}/quiz")
def submit_quiz(
    slug: str,
    payload: QuizSubmitRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.submit_quiz(
        db, current_user["sub"], slug, current_user["track"], payload.answers
    )
