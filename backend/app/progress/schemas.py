from pydantic import BaseModel
from datetime import datetime
from typing import Any


class ProgressRecord(BaseModel):
    module_slug: str
    visited: bool
    acknowledgements_completed: bool
    quiz_passed: bool
    quiz_score: int | None
    quiz_attempts: int
    module_completed: bool
    completed_at: datetime | None

    class Config:
        from_attributes = True


class AcknowledgeRequest(BaseModel):
    acknowledged_ids: list[str]   # IDs of each acknowledgement item confirmed


class QuizSubmitRequest(BaseModel):
    answers: dict[str, str]       # {question_id: selected_option_id}


class QuizSubmitResponse(BaseModel):
    passed: bool
    score: int
    total: int
    feedback: dict[str, Any]      # {question_id: {correct: bool, correct_id: str}}
