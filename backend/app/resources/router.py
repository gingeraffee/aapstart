import os
from pathlib import Path
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import FileResponse
from app.auth.service import get_current_user
from app.content import loader
from app.config import get_settings

router = APIRouter(prefix="/api/resources", tags=["resources"])

settings = get_settings()

# Resolve downloads directory relative to this file (backend/app/resources/router.py)
# → backend/static/downloads/
_DOWNLOADS_DIR = Path(__file__).parent.parent.parent / "static" / "downloads"


@router.get("/categories")
def get_categories(current_user: dict = Depends(get_current_user)):
    return loader.get_resource_categories()


@router.get("/download")
def download_file(
    filename: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Serve a file from backend/static/downloads/.
    Requires authentication to prevent unauthenticated direct downloads.
    """
    # Security: resolve and confirm file stays within downloads dir
    safe_path = (_DOWNLOADS_DIR / filename).resolve()
    if not str(safe_path).startswith(str(_DOWNLOADS_DIR.resolve())):
        raise HTTPException(status_code=400, detail="Invalid filename.")

    if not safe_path.exists() or not safe_path.is_file():
        raise HTTPException(status_code=404, detail="File not found.")

    return FileResponse(
        path=str(safe_path),
        filename=filename,
        media_type="application/octet-stream",
    )


@router.get("")
def list_resources(
    category: str | None = Query(default=None),
    q: str | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    resources = loader.get_resources(current_user["track"])

    if category:
        resources = [r for r in resources if r.get("category") == category]

    if q:
        q_lower = q.lower()
        resources = [
            r for r in resources
            if q_lower in r.get("title", "").lower()
            or q_lower in r.get("description", "").lower()
            or any(q_lower in tag.lower() for tag in r.get("tags", []))
        ]

    return resources


@router.get("/ui")
def get_ui_content(current_user: dict = Depends(get_current_user)):
    """Returns rotating headers, coach tips, and login scene copy."""
    return loader.get_ui_content()
