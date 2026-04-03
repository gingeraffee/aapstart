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
    from app.database import models  # noqa: F401 — import to register models
    Base.metadata.create_all(bind=engine)
    _migrate()
    _seed_admin()


def _migrate():
    """Add any missing columns to existing tables (lightweight auto-migration)."""
    insp = inspect(engine)
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
