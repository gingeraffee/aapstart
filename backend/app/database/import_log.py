"""Shared helper for recording an audit row each time a data file is imported.

Call ``record_import`` from an upload endpoint *after* the main data has been
committed. It is best-effort: a failure to write the audit row is swallowed so it
can never break an otherwise-successful import.
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.database.models import ImportLog


def record_import(
    db: Session,
    *,
    dataset_key: str,
    dataset_label: str,
    filename: str | None,
    user: dict | None,
    row_count: int,
    note: str | None = None,
) -> None:
    """Write one ImportLog row for an uploaded file. Never raises."""
    try:
        db.add(
            ImportLog(
                dataset_key=dataset_key,
                dataset_label=dataset_label,
                filename=(filename or "").strip() or None,
                row_count=int(row_count or 0),
                uploaded_by=(user or {}).get("sub"),
                uploaded_by_name=(user or {}).get("full_name"),
                note=note,
                uploaded_at=datetime.now(timezone.utc),
            )
        )
        db.commit()
    except Exception:
        db.rollback()
