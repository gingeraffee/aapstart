import json
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import get_settings
import os

settings = get_settings()

db_url = settings.database_url

# SQLite-specific setup
connect_args = {}
if db_url.startswith("sqlite"):
    _db_path = db_url.replace("sqlite:///", "")
    if _db_path and not _db_path.startswith(":"):
        os.makedirs(os.path.dirname(os.path.abspath(_db_path)), exist_ok=True)
    connect_args = {"check_same_thread": False}

engine = create_engine(db_url, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables, run lightweight migrations, and seed the bootstrap admin."""
    from app.database import models  # noqa: F401 - import to register models
    Base.metadata.create_all(bind=engine)
    _migrate()
    _seed_admin()


def _migrate():
    """Add any missing columns to existing tables (lightweight auto-migration)."""
    insp = inspect(engine)

    # user_notes table - created by create_all, but add any missing columns for upgrades
    if insp.has_table("user_notes"):
        note_cols = {c["name"] for c in insp.get_columns("user_notes")}
        if "module_title" not in note_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE user_notes ADD COLUMN module_title VARCHAR"))
            print("[OK] Added module_title column to user_notes table")
        if "admin_reply" not in note_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE user_notes ADD COLUMN admin_reply TEXT"))
            print("[OK] Added admin_reply column to user_notes table")
        if "replied_by" not in note_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE user_notes ADD COLUMN replied_by VARCHAR"))
            print("[OK] Added replied_by column to user_notes table")
        if "selected_text" not in note_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE user_notes ADD COLUMN selected_text TEXT"))
            print("[OK] Added selected_text column to user_notes table")
        if "anchor_id" not in note_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE user_notes ADD COLUMN anchor_id VARCHAR"))
            print("[OK] Added anchor_id column to user_notes table")
        if "replied_at" not in note_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE user_notes ADD COLUMN replied_at DATETIME"))
            print("[OK] Added replied_at column to user_notes table")
    # Check employees table for last_login_at column
    if insp.has_table("employees"):
        cols = {c["name"] for c in insp.get_columns("employees")}
        if "last_login_at" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE employees ADD COLUMN last_login_at DATETIME"))
            print("[OK] Added last_login_at column to employees table")
        if "totp_secret" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE employees ADD COLUMN totp_secret VARCHAR"))
            print("[OK] Added totp_secret column to employees table")
        if "totp_enabled" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE employees ADD COLUMN totp_enabled BOOLEAN DEFAULT 0"))
            print("[OK] Added totp_enabled column to employees table")

        # Migrate track column from string to JSON array
        _migrate_track_to_array()


def _migrate_track_to_array():
    """Convert any string track values to JSON arrays in-place."""
    with engine.begin() as conn:
        rows = conn.execute(text("SELECT id, track FROM employees")).fetchall()
        for row_id, track_val in rows:
            if track_val is None:
                conn.execute(
                    text("UPDATE employees SET track = :v WHERE id = :id"),
                    {"v": json.dumps(["hr"]), "id": row_id},
                )
            else:
                # Already a JSON array?
                try:
                    parsed = json.loads(track_val) if isinstance(track_val, str) else track_val
                    if isinstance(parsed, list):
                        continue  # Already migrated
                    # It's a JSON scalar - wrap it
                    conn.execute(
                        text("UPDATE employees SET track = :v WHERE id = :id"),
                        {"v": json.dumps([str(parsed)]), "id": row_id},
                    )
                except (ValueError, TypeError):
                    # Plain string like "hr" - wrap it
                    conn.execute(
                        text("UPDATE employees SET track = :v WHERE id = :id"),
                        {"v": json.dumps([str(track_val)]), "id": row_id},
                    )


def _seed_admin():
    """Create the first admin account from config if it doesn't exist yet."""
    from app.config import get_settings
    from app.database.models import Employee
    s = get_settings()
    if not s.admin_employee_id or not s.admin_first_name or not s.admin_last_name:
        return
    db = SessionLocal()
    try:
        existing = db.query(Employee).filter_by(employee_id=s.admin_employee_id).first()
        if not existing:
            db.add(Employee(
                employee_id=s.admin_employee_id,
                first_name=s.admin_first_name,
                last_name=s.admin_last_name,
                track=s.admin_track,
                is_admin=True,
            ))
            db.commit()
            print(f"[OK] Admin account seeded: {s.admin_first_name} {s.admin_last_name} ({s.admin_employee_id})")
    finally:
        db.close()
