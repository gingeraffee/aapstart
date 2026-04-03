from fastapi import APIRouter, Response, Depends, HTTPException, status
from app.auth.schemas import (
    LoginRequest, LoginResponse, UserResponse,
    TotpVerifyRequest, TotpConfirmSetupRequest, TotpSetupResponse,
)
from app.auth import service
from app.config import get_settings
from app.database.connection import SessionLocal
from app.database.models import Employee

settings = get_settings()

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _set_session_cookie(response: Response, token: str):
    response.set_cookie(
        key="aap_session",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 8,  # 8 hours
        secure=False,         # Set True in production with HTTPS
    )


@router.post("/login")
def login(payload: LoginRequest, response: Response):
    user = service.validate_login(
        employee_id=payload.employee_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
    )

    totp_policy = settings.totp_required

    # If TOTP is enabled, don't issue a session yet — require code verification
    if user.get("totp_enabled"):
        return LoginResponse(
            employee_id=user["employee_id"],
            full_name=user["full_name"],
            track=user["track"],
            is_admin=user.get("is_admin", False),
            requires_totp=True,
            totp_enabled=True,
            totp_required=totp_policy,
        )

    # No TOTP — issue session cookie immediately
    token = service.create_token(
        employee_id=user["employee_id"],
        full_name=user["full_name"],
        track=user["track"],
        is_admin=user.get("is_admin", False),
    )
    _set_session_cookie(response, token)
    return LoginResponse(
        employee_id=user["employee_id"],
        full_name=user["full_name"],
        track=user["track"],
        is_admin=user.get("is_admin", False),
        requires_totp=False,
        totp_enabled=False,
        totp_required=totp_policy,
    )


@router.post("/totp/validate")
def totp_validate(payload: TotpVerifyRequest, response: Response):
    """Verify a TOTP code during login and issue the session cookie."""
    db = SessionLocal()
    try:
        employee = db.query(Employee).filter(
            Employee.employee_id == payload.employee_id
        ).first()

        if not employee or not employee.totp_enabled or not employee.totp_secret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Two-factor authentication is not configured for this account.",
            )

        if not service.verify_totp_code(employee.totp_secret, payload.code.strip()):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid verification code. Please try again.",
            )

        full_name = f"{employee.first_name} {employee.last_name}"
        token = service.create_token(
            employee_id=employee.employee_id,
            full_name=full_name,
            track=employee.track,
            is_admin=employee.is_admin,
        )
        _set_session_cookie(response, token)
        return UserResponse(
            employee_id=employee.employee_id,
            full_name=full_name,
            track=employee.track,
            is_admin=employee.is_admin,
        )
    finally:
        db.close()


@router.post("/totp/setup", response_model=TotpSetupResponse)
def totp_setup(current_user: dict = Depends(service.get_current_user)):
    """Generate a new TOTP secret and QR code for the authenticated user."""
    db = SessionLocal()
    try:
        employee = db.query(Employee).filter(
            Employee.employee_id == current_user["sub"]
        ).first()

        if not employee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

        if employee.totp_enabled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Two-factor authentication is already enabled. Ask an admin to reset it first.",
            )

        # Generate and persist the secret (not yet enabled until confirmed)
        secret = service.generate_totp_secret()
        employee.totp_secret = secret
        db.commit()

        uri = service.get_totp_provisioning_uri(secret, employee.employee_id)
        qr_b64 = service.generate_qr_code_base64(uri)

        return TotpSetupResponse(
            secret=secret,
            qr_code=qr_b64,
            provisioning_uri=uri,
        )
    finally:
        db.close()


@router.post("/totp/confirm-setup")
def totp_confirm_setup(
    payload: TotpConfirmSetupRequest,
    current_user: dict = Depends(service.get_current_user),
):
    """Verify the first TOTP code to activate 2FA for the employee."""
    db = SessionLocal()
    try:
        employee = db.query(Employee).filter(
            Employee.employee_id == current_user["sub"]
        ).first()

        if not employee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

        if not employee.totp_secret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No TOTP setup in progress. Call /totp/setup first.",
            )

        if employee.totp_enabled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Two-factor authentication is already enabled.",
            )

        if not service.verify_totp_code(employee.totp_secret, payload.code.strip()):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid code. Make sure your authenticator app is synced and try again.",
            )

        employee.totp_enabled = True
        db.commit()

        return {"message": "Two-factor authentication is now enabled."}
    finally:
        db.close()


@router.get("/me", response_model=UserResponse)
def me(current_user: dict = Depends(service.get_current_user)):
    return UserResponse(
        employee_id=current_user["sub"],
        full_name=current_user["full_name"],
        track=current_user["track"],
        is_admin=current_user.get("is_admin", False),
    )


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("aap_session")
    return {"message": "Logged out."}
