from fastapi import APIRouter, Depends, HTTPException, status
from app.auth.service import get_current_user
from app.content import loader
from app.modules.schemas import ModuleSummary, ModuleDetail

router = APIRouter(prefix="/api/modules", tags=["modules"])


@router.get("", response_model=list[ModuleSummary])
def list_modules(current_user: dict = Depends(get_current_user)):
    """Returns the ordered module list for the current employee's track."""
    track = current_user["track"]
    return loader.get_modules_for_track(track)


@router.get("/{slug}", response_model=ModuleDetail)
def get_module(slug: str, current_user: dict = Depends(get_current_user)):
    """Returns full module content for a specific slug, filtered for the employee's track."""
    track = current_user["track"]
    module = loader.get_module(slug, track)
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Module '{slug}' not found or not available for your role.",
        )
    return module
