from pydantic import BaseModel
from datetime import datetime


class NoteCreate(BaseModel):
    note_text: str
    module_title: str | None = None
    selected_text: str | None = None
    anchor_id: str | None = None


class NoteStatusUpdate(BaseModel):
    status: str  # "open" | "answered"


class NoteResponse(BaseModel):
    id: int
    employee_id: str
    module_slug: str
    module_title: str | None
    note_text: str
    selected_text: str | None
    anchor_id: str | None
    status: str
    admin_reply: str | None
    replied_by: str | None
    replied_at: datetime | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
