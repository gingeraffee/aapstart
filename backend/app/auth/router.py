from fastapi import APIRouter, Response, Depends, Request
from app.auth.schemas import LoginRequest, UserResponse
from app.auth import service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
def login(payload: LoginRequest, response: Response):
    user = service.validate_login(
        employee_id=payload.employee_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
    )
    token = service.create_token(
        employee_id=user["employee_id"],
        full_name=user["full_name"],
        track=user["track"],
        is_admin=user.get("is_admin", False),
    )
    response.set_cookie(
        key="aap_session",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 8,  # 8 hours
        secure=False,         # Set True in production with HTTPS
    )
    return UserResponse(
        employee_id=user["employee_id"],
        full_name=user["full_name"],
        track=user["track"],
        is_admin=user.get("is_admin", False),
    )


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
