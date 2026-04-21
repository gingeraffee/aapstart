from sqlalchemy import Column, String, Boolean, Integer, DateTime, Text, func, JSON
from app.database.connection import Base


class Employee(Base):
    """Stores employee accounts created by the HR admin."""
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String, unique=True, nullable=False, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    track = Column(JSON, nullable=False, default=lambda: ["hr"])
    is_admin = Column(Boolean, default=False)
    totp_secret = Column(String, nullable=True)
    totp_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    first_login_at = Column(DateTime, nullable=True)
    last_login_at = Column(DateTime, nullable=True)


class UserProgress(Base):
    """
    Tracks each employee's progress through each module.
    One row per employee per module.
    """
    __tablename__ = "user_progress"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String, nullable=False, index=True)
    module_slug = Column(String, nullable=False, index=True)

    # Visited
    visited = Column(Boolean, default=False)
    visited_at = Column(DateTime, nullable=True)

    # Acknowledgement step
    acknowledgements_completed = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime, nullable=True)

    # Quiz step
    quiz_passed = Column(Boolean, default=False)
    quiz_score = Column(Integer, nullable=True)   # number of correct answers
    quiz_attempts = Column(Integer, default=0)
    quiz_passed_at = Column(DateTime, nullable=True)

    # Overall completion
    # A module is only complete when all required steps are done.
    # This is computed and stored by the backend - never set directly by the frontend.
    module_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)

    last_updated = Column(DateTime, default=func.now(), onupdate=func.now())


class UserNote(Base):
    """A note or question a user writes while working through a module."""
    __tablename__ = "user_notes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String, nullable=False, index=True)
    module_slug = Column(String, nullable=False, index=True)
    module_title = Column(String, nullable=True)
    note_text = Column(Text, nullable=False)
    selected_text = Column(Text, nullable=True)
    anchor_id = Column(String, nullable=True)
    status = Column(String, nullable=False, default="open")  # "open" | "answered"
    admin_reply = Column(Text, nullable=True)
    replied_by = Column(String, nullable=True)
    replied_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
