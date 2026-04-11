from fastapi import APIRouter, Depends, Query
from app.auth.service import get_current_user
from app.content import loader

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("")
def unified_search(
    q: str = Query(..., min_length=1),
    current_user: dict = Depends(get_current_user),
):
    """
    Unified search across training modules and resources.
    Returns a flat mixed list of results ordered by relevance.
    Each item has a result_type field: "module" or "resource".
    """
    track = current_user["track"]
    is_admin = current_user.get("is_admin", False)
    return loader.search_all(q, track, is_admin)
