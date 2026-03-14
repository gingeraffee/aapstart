from pydantic import BaseModel
from typing import Any


class ModuleSummary(BaseModel):
    slug: str
    title: str
    description: str
    order: int
    estimated_minutes: int
    status: str
    requires_quiz: bool
    requires_acknowledgement: bool


class ModuleDetail(ModuleSummary):
    content_blocks: list[Any]
    quiz: Any | None
    acknowledgements: list[Any]
