from sqlalchemy import Column, String, Boolean, Integer, DateTime, Text, Float, func, JSON
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
    is_manager = Column(Boolean, default=False)
    is_executive = Column(Boolean, default=False)
    manager_employee_id = Column(String, nullable=True)  # who this employee reports to
    department = Column(String, nullable=True)
    location = Column(String, nullable=True)   # e.g. "AAP Scottsboro", "API Memphis"
    division = Column(String, nullable=True)   # "AAP" or "API"
    totp_secret = Column(String, nullable=True)
    totp_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    first_login_at = Column(DateTime, nullable=True)
    last_login_at = Column(DateTime, nullable=True)
    terminated_date = Column(String, nullable=True)  # ISO date "YYYY-MM-DD"; NULL = active


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


class TimeRecord(Base):
    """Hours data imported from HRIS CSV. One row per employee per period."""
    __tablename__ = "time_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String, nullable=False, index=True)
    week_start = Column(String, nullable=False)  # ISO date "YYYY-MM-DD" — period start key
    regular_hours = Column(Float, nullable=False, default=0.0)
    ot_hours = Column(Float, nullable=False, default=0.0)
    pto_hours = Column(Float, nullable=False, default=0.0)   # legacy catch-all
    vacation_hours       = Column(Float, nullable=False, default=0.0)
    personal_hours       = Column(Float, nullable=False, default=0.0)
    other_hours          = Column(Float, nullable=False, default=0.0)
    absent_w_point_hours = Column(Float, nullable=False, default=0.0)
    protected_hours      = Column(Float, nullable=False, default=0.0)
    imported_at = Column(DateTime, default=func.now())


class PerformanceReview(Base):
    """Performance review records imported from HRIS CSV."""
    __tablename__ = "performance_reviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String, nullable=False, index=True)
    review_type = Column(String, nullable=False)  # "30-day", "90-day", "annual", etc.
    due_date = Column(String, nullable=False)  # ISO date "YYYY-MM-DD"
    completed = Column(Boolean, default=False)
    completed_date = Column(String, nullable=True)  # ISO date, optional
    imported_at = Column(DateTime, default=func.now())


class AbsenceRecord(Base):
    """Time-off/absence events imported from HRIS report. One row per absence occurrence."""
    __tablename__ = "absence_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String, nullable=False, index=True)
    employee_name = Column(String, nullable=True)
    category = Column(String, nullable=True)
    from_date = Column(String, nullable=False)   # ISO date — first day of absence
    to_date = Column(String, nullable=True)       # ISO date — last day of absence
    requested_date = Column(String, nullable=False)  # ISO date — when request was submitted
    time_off_hours = Column(Float, nullable=False, default=0.0)
    is_planned = Column(Boolean, nullable=False)  # requested_date < from_date
    imported_at = Column(DateTime, default=func.now())


# Threshold levels keyed by minimum point total (used in dashboard + import logic)
ATTENDANCE_THRESHOLDS = {8.0: "termination", 7.0: "final", 6.0: "written", 5.0: "verbal"}


class AttendancePoint(Base):
    """Attendance point events imported from point tracker. Append-only historical ledger."""
    __tablename__ = "attendance_points"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String, nullable=False, index=True)
    location    = Column(String, nullable=True)
    point_date  = Column(String, nullable=False)       # ISO date "YYYY-MM-DD"
    point       = Column(Float,  nullable=False, default=0.0)
    reason      = Column(String, nullable=True)
    note        = Column(String, nullable=True)
    flag_code   = Column(String, nullable=True)        # non-null = Monday absence pattern
    point_total = Column(Float,  nullable=False, default=0.0)
    imported_at = Column(DateTime, default=func.now())


class WoshReport(Base):
    """Stores uploaded WOSH (shift exception) Excel workbook data, one row per upload."""
    __tablename__ = "wosh_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    week_label = Column(String, nullable=True)   # e.g. "Week of May 18–22, 2026"
    week_start = Column(String, nullable=True)   # ISO date derived from exceptions sheet
    week_end = Column(String, nullable=True)     # ISO date derived from exceptions sheet
    parsed_data = Column(JSON, nullable=True)    # structured: summary, chart, top_employees, by_manager_detail, exceptions
    uploaded_by = Column(String, nullable=True)  # employee_id
    uploaded_at = Column(DateTime, default=func.now())


class ImportLog(Base):
    """Audit record written each time a data file is uploaded through the admin import
    tools. One row per successful upload — powers the 'Imported Data' admin view."""
    __tablename__ = "import_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_key = Column(String, nullable=False, index=True)   # "time", "absences", "wosh", ...
    dataset_label = Column(String, nullable=False)             # human label e.g. "Hours (Payclock)"
    filename = Column(String, nullable=True)                   # original uploaded filename
    row_count = Column(Integer, nullable=False, default=0)     # rows added/updated by this upload
    uploaded_by = Column(String, nullable=True)                # employee_id of the uploader
    uploaded_by_name = Column(String, nullable=True)           # display name of the uploader
    note = Column(String, nullable=True)                       # optional extra detail
    uploaded_at = Column(DateTime, default=func.now(), index=True)


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
