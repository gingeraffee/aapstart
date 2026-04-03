from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    employee_id: str
    first_name: str
    last_name: str


class UserResponse(BaseModel):
    employee_id: str
    full_name: str
    track: str
    is_admin: bool = False


class LoginResponse(BaseModel):
    """Extended login response that signals whether TOTP verification is needed."""
    employee_id: str
    full_name: str
    track: str
    is_admin: bool = False
    requires_totp: bool = False
    totp_enabled: bool = False
    totp_required: bool = False  # org-wide policy: is TOTP mandatory?


class TotpVerifyRequest(BaseModel):
    employee_id: str
    code: str


class TotpConfirmSetupRequest(BaseModel):
    code: str


class TotpSetupResponse(BaseModel):
    secret: str
    qr_code: str  # base64-encoded PNG
    provisioning_uri: str
