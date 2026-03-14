from pydantic import BaseModel


class LoginRequest(BaseModel):
    employee_id: str
    first_name: str
    last_name: str
    access_code: str


class UserResponse(BaseModel):
    employee_id: str
    full_name: str
    track: str
