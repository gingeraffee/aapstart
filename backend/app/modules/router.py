from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.auth.service import get_current_user
from app.content import loader
from app.modules.schemas import ModuleSummary, ModuleDetail

router = APIRouter(prefix="/api/modules", tags=["modules"])

VALID_PREVIEW_TRACKS = {"hr", "warehouse", "administrative", "management"}


def _resolve_tracks(current_user: dict, preview_track: Optional[str]) -> list[str]:
    """Return the effective tracks list for content filtering.
    HR admins can preview a single track; otherwise the user's own tracks are used."""
    real_tracks: list[str] = current_user.get("tracks", ["hr"])
    if preview_track and preview_track in VALID_PREVIEW_TRACKS:
        is_hr_admin = "hr" in real_tracks and current_user.get("is_admin", False)
        if is_hr_admin:
            return [preview_track]
    return real_tracks


@router.get("", response_model=list[ModuleSummary])
def list_modules(
    track: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Returns the ordered module list, optionally for a preview track (HR admins only)."""
    effective_tracks = _resolve_tracks(current_user, track)
    is_admin = current_user.get("is_admin", False)
    return loader.get_modules_for_tracks(effective_tracks, is_admin=is_admin)


@router.get("/{slug}", response_model=ModuleDetail)
def get_module(
    slug: str,
    track: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Returns full module content, optionally for a preview track (HR admins only)."""
    effective_tracks = _resolve_tracks(current_user, track)
    module = loader.get_module(slug, effective_tracks)
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Module '{slug}' not found or not available for your role.",
        )
    return module
