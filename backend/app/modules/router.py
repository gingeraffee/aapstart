from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.auth.service import get_current_user
from app.content import loader
from app.modules.schemas import ModuleSummary, ModuleDetail

router = APIRouter(prefix="/api/modules", tags=["modules"])

VALID_PREVIEW_TRACKS = {"hr", "warehouse", "administrative", "management"}


def _resolve_track(current_user: dict, preview_track: Optional[str]) -> str:
    """Return the preview track if the user is an HR admin, otherwise their real track."""
    real_track = current_user["track"]
    if preview_track and preview_track in VALID_PREVIEW_TRACKS:
        is_hr_admin = real_track == "hr" and current_user.get("is_admin", False)
        if is_hr_admin:
            return preview_track
    return real_track


@router.get("", response_model=list[ModuleSummary])
def list_modules(
    track: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Returns the ordered module list, optionally for a preview track (HR admins only)."""
    effective_track = _resolve_track(current_user, track)
    is_admin = current_user.get("is_admin", False)
    return loader.get_modules_for_track(effective_track, is_admin=is_admin)


@router.get("/{slug}", response_model=ModuleDetail)
def get_module(
    slug: str,
    track: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Returns full module content, optionally for a preview track (HR admins only)."""
    effective_track = _resolve_track(current_user, track)
    module = loader.get_module(slug, effective_track)
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Module '{slug}' not found or not available for your role.",
        )
    return module
