"""
Progress Service
================
All completion logic lives here. The frontend never sets completion state
directly — it only calls these service functions.

Completion rule:
  module_completed = visited
                     AND (acknowledgements_completed OR NOT requires_acknowledgement)
                     AND (quiz_passed OR NOT requires_quiz)
"""

from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.database.models import UserProgress
from app.content import loader
from app.content.loader import _primary_track


def _now():
    return datetime.now(timezone.utc)


def _get_or_create(db: Session, employee_id: str, module_slug: str) -> UserProgress:
    record = (
        db.query(UserProgress)
        .filter_by(employee_id=employee_id, module_slug=module_slug)
        .first()
    )
    if not record:
        record = UserProgress(employee_id=employee_id, module_slug=module_slug)
        db.add(record)
        db.flush()
    return record


def _check_completion(record: UserProgress, module_meta: dict):
    """Recomputes and sets module_completed based on current state."""
    needs_ack = module_meta.get("requires_acknowledgement", False)
    needs_quiz = module_meta.get("requires_quiz", False)

    ack_ok = record.acknowledgements_completed if needs_ack else True
    quiz_ok = record.quiz_passed if needs_quiz else True

    if record.visited and ack_ok and quiz_ok and not record.module_completed:
        record.module_completed = True
        record.completed_at = _now()


# ── Public functions ──────────────────────────────────────────────────────────

def get_all_progress(db: Session, employee_id: str) -> list[UserProgress]:
    return db.query(UserProgress).filter_by(employee_id=employee_id).all()


def get_module_progress(db: Session, employee_id: str, module_slug: str) -> UserProgress | None:
    return (
        db.query(UserProgress)
        .filter_by(employee_id=employee_id, module_slug=module_slug)
        .first()
    )


def mark_visited(db: Session, employee_id: str, module_slug: str, tracks: list[str]):
    module_meta = loader.get_module(module_slug, tracks)
    if not module_meta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found.")

    record = _get_or_create(db, employee_id, module_slug)
    if not record.visited:
        record.visited = True
        record.visited_at = _now()

    # Management-only users auto-complete on visit (no quiz/ack gating)
    if _primary_track(tracks) == "management" and not record.module_completed:
        record.module_completed = True
        record.completed_at = _now()
    else:
        _check_completion(record, module_meta)

    db.commit()
    db.refresh(record)
    return record


def complete_acknowledgement(
    db: Session, employee_id: str, module_slug: str, tracks: list[str], acknowledged_ids: list[str]
):
    module_meta = loader.get_module(module_slug, tracks)
    if not module_meta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found.")

    # Verify all required acknowledgements are present
    required_ids = {a["id"] for a in module_meta.get("acknowledgements", [])}
    submitted_ids = set(acknowledged_ids)
    if not required_ids.issubset(submitted_ids):
        missing = required_ids - submitted_ids
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing acknowledgements: {missing}",
        )

    record = _get_or_create(db, employee_id, module_slug)
    record.acknowledgements_completed = True
    record.acknowledged_at = _now()
    _check_completion(record, module_meta)
    db.commit()
    db.refresh(record)
    return record


def submit_quiz(
    db: Session, employee_id: str, module_slug: str, tracks: list[str], answers: dict[str, str]
) -> dict:
    # We need the raw module with correct answers — use the internal cache
    from app.content.loader import _modules_cache, _get_track_quiz_questions
    module_raw = _modules_cache.get(module_slug)
    if not module_raw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found.")

    questions = _get_track_quiz_questions(module_raw, _primary_track(tracks))
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="This module has no quiz."
        )

    # Grade answers
    feedback = {}
    correct_count = 0
    for q in questions:
        qid = q["id"]
        correct_id = q["correctId"]
        submitted = answers.get(qid)
        is_correct = submitted == correct_id
        if is_correct:
            correct_count += 1
        feedback[qid] = {"correct": is_correct, "correct_id": correct_id}

    total = len(questions)
    passed = correct_count == total  # Must get 100% to pass

    # Update progress record
    record = _get_or_create(db, employee_id, module_slug)
    record.quiz_attempts += 1
    record.quiz_score = correct_count

    if passed and not record.quiz_passed:
        record.quiz_passed = True
        record.quiz_passed_at = _now()

    module_meta = loader.get_module(module_slug, tracks)
    _check_completion(record, module_meta)
    db.commit()
    db.refresh(record)

    return {
        "passed": passed,
        "score": correct_count,
        "total": total,
        "feedback": feedback,
        "module_completed": record.module_completed,
    }
