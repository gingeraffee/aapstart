from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import get_settings
import os

settings = get_settings()

# Ensure the database directory exists (works for both relative and absolute paths)
_db_path = settings.database_url.replace("sqlite:///", "")
if _db_path and not _db_path.startswith(":"):
    os.makedirs(os.path.dirname(os.path.abspath(_db_path)), exist_ok=True)

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},  # Required for SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables on startup."""
    from app.database import models  # noqa: F401 — import to register models
    Base.metadata.create_all(bind=engine)
