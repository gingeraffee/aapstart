"""
Auth Service
============
Validates login credentials against the Google Sheet Employee Roster,
then issues a signed JWT stored in an httpOnly cookie.

Google Sheet structure expected:
  Worksheet: "Employee Roster"
  Columns:   Employee ID | Full Name | Track
"""

import gspread
from google.oauth2.service_account import Credentials
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, Request, status
from app.config import get_settings

settings = get_settings()

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
]

VALID_TRACKS = {"hr", "warehouse", "administrative"}


# ── Google Sheets ─────────────────────────────────────────────────────────────

def _get_roster() -> list[dict]:
    """
    Fetches all rows from the Employee Roster worksheet.
    Returns a list of dicts: {employee_id, full_name, track}
    """
    try:
        creds = Credentials.from_service_account_file(
            settings.google_credentials_file, scopes=SCOPES
        )
        client = gspread.authorize(creds)
        sheet = client.open(settings.google_sheet_name)
        worksheet = sheet.worksheet("Employee Roster")
        records = worksheet.get_all_records()
        return records
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable. credentials.json not found.",
        )
    except gspread.exceptions.SpreadsheetNotFound:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable. Google Sheet not found.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Authentication service unavailable: {str(e)}",
        )


# ── Validation ────────────────────────────────────────────────────────────────

def validate_login(employee_id: str, first_name: str, last_name: str, access_code: str) -> dict:
    """
    Validates credentials against the Employee Roster.
    Returns {employee_id, full_name, track} on success.
    Raises HTTPException on failure.
    """
    # 1. Verify shared access code
    if access_code.strip().upper() != settings.access_code.strip().upper():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    # 2. Normalise inputs
    submitted_id = employee_id.strip()
    submitted_full_name = f"{first_name.strip()} {last_name.strip()}".strip()

    # 3. Look up employee in roster
    roster = _get_roster()
    match = None
    for row in roster:
        row_id = str(row.get("Employee ID", "")).strip()
        row_name = str(row.get("Full Name", "")).strip()
        if row_id.lower() == submitted_id.lower() and row_name.lower() == submitted_full_name.lower():
            match = row
            break

    if not match:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    # 4. Validate and normalise track
    raw_track = str(match.get("Track", "")).strip().lower()
    if raw_track not in VALID_TRACKS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Employee track '{raw_track}' is not recognised. Contact HR.",
        )

    return {
        "employee_id": submitted_id,
        "full_name": str(match.get("Full Name", "")).strip(),
        "track": raw_track,
    }


# ── JWT ───────────────────────────────────────────────────────────────────────

def create_token(employee_id: str, full_name: str, track: str) -> str:
    expiry = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiration_hours)
    payload = {
        "sub": employee_id,
        "full_name": full_name,
        "track": track,
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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        )
    return decode_token(token)
