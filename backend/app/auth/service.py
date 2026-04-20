"""
Auth Service
============
Validates login credentials against the Employee table in SQLite,
then issues a signed JWT stored in an httpOnly cookie.
Includes TOTP two-factor authentication helpers.
"""

import base64
import io
from datetime import datetime, timedelta, timezone

import pyotp
import qrcode
from fastapi import HTTPException, Request, status
from jose import JWTError, jwt

from app.config import get_settings
from app.database.connection import SessionLocal
from app.database.models import Employee

settings = get_settings()

VALID_TRACKS = {"hr", "warehouse", "administrative", "management"}


def _normalize_track(track: str) -> str:
    """Normalize and validate a single track string (used for dev auth bypass)."""
    normalized = track.strip().lower()
    if normalized not in VALID_TRACKS:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "DEV_AUTH_TRACK must be one of hr, warehouse, administrative, or management."
            ),
        )
    return normalized


def normalize_tracks(tracks) -> list[str]:
    """
    Ensure tracks is a valid non-empty list of track strings.
    Accepts a list, a single string (legacy), or any JSON-decoded value.
    Invalid or unknown track values are dropped; defaults to ["hr"] if empty.
    """
    if isinstance(tracks, str):
        tracks = [tracks]
    if not isinstance(tracks, list):
        tracks = ["hr"]
    result = [t.strip().lower() for t in tracks if isinstance(t, str) and t.strip().lower() in VALID_TRACKS]
    return result if result else ["hr"]


def _get_dev_user(*, for_token: bool = False) -> dict:
    eid = settings.dev_auth_employee_id.strip()
    base = {
        "full_name": settings.dev_auth_full_name.strip(),
        "tracks": [_normalize_track(settings.dev_auth_track)],
        "is_admin": True,
    }
    # Token/cookie payloads use "sub"; login response uses "employee_id"
    if for_token:
        base["sub"] = eid
    else:
        base["employee_id"] = eid
    return base


def validate_login(employee_id: str, first_name: str, last_name: str) -> dict:
    """
    Validates credentials against the employees table.
    Returns {employee_id, full_name, tracks, is_admin, totp_enabled} on success.
    """
    if settings.dev_auth_bypass:
        user = _get_dev_user()
        user["totp_enabled"] = False
        return user

    submitted_id = employee_id.strip()
    submitted_first = first_name.strip().lower()
    submitted_last = last_name.strip().lower()

    db = SessionLocal()
    try:
        employee = db.query(Employee).filter(
            Employee.employee_id.ilike(submitted_id)
        ).first()

        if (not employee or
                employee.first_name.strip().lower() != submitted_first or
                employee.last_name.strip().lower() != submitted_last):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials. Employee numbers are on your onboarding paperwork and in BambooHR. If you need assistance, please see HR.",
            )

        if not employee.first_login_at:
            employee.first_login_at = datetime.now(timezone.utc)
        employee.last_login_at = datetime.now(timezone.utc)
        db.commit()

        return {
            "employee_id": employee.employee_id,
            "full_name": f"{employee.first_name} {employee.last_name}",
            "tracks": normalize_tracks(employee.track),
            "is_admin": employee.is_admin,
            "totp_enabled": bool(employee.totp_enabled),
        }
    finally:
        db.close()


def create_token(employee_id: str, full_name: str, tracks: list[str], is_admin: bool = False) -> str:
    expiry = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiration_hours)
    payload = {
        "sub": employee_id,
        "full_name": full_name,
        "tracks": tracks,
        "is_admin": is_admin,
        "exp": expiry,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid. Please log in again.",
        )


def get_current_user(request: Request) -> dict:
    """FastAPI dependency — resolves the current employee from the session cookie."""
    token = request.cookies.get("aap_session")
    if not token:
        if settings.dev_auth_bypass:
            return _get_dev_user(for_token=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        )
    payload = decode_token(token)
    # Backward compat: old tokens have track (string), new tokens have tracks (list)
    if "track" in payload and "tracks" not in payload:
        payload["tracks"] = normalize_tracks(payload["track"])
    return payload


def require_admin(request: Request) -> dict:
    """FastAPI dependency — requires is_admin=True."""
    user = get_current_user(request)
    if not user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return user


# ── TOTP helpers ──────────────────────────────────────────────────────────────

def generate_totp_secret() -> str:
    """Generate a new random TOTP secret."""
    return pyotp.random_base32()


def get_totp_provisioning_uri(secret: str, employee_id: str) -> str:
    """Build the otpauth:// URI that authenticator apps scan."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(
        name=employee_id,
        issuer_name=settings.totp_issuer_name,
    )


def generate_qr_code_base64(uri: str) -> str:
    """Generate a QR code PNG and return it as a base64 string."""
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


def verify_totp_code(secret: str, code: str) -> bool:
    """Verify a 6-digit TOTP code, allowing 1 window of clock drift."""
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)
