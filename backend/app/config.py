from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    google_credentials_file: str = "credentials.json"
    google_sheet_name: str = "AAP New Hire Orientation Progress"
    access_code: str = "AAP"
    jwt_secret_key: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 8
    content_dir: str = "../content"
    database_url: str = "sqlite:///./data/progress.db"
    frontend_url: str = "http://localhost:3000"
    dev_auth_bypass: bool = False
    dev_auth_employee_id: str = "dev-001"
    dev_auth_full_name: str = "Dev User"
    dev_auth_track: str = "hr"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
