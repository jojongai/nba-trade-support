"""Data refresh: refill local JSON cache from nba_api."""
from fastapi import APIRouter

from app.services import nba_service

router = APIRouter(prefix="/data", tags=["data"])


@router.post("/refresh")
def refresh_data() -> dict:
    """
    Fetch teams and players from nba_api and save to data/teams.json and data/players.json.
    Call this after deploy or periodically to keep the cache up to date.
    """
    counts = nba_service.refresh_static_data()
    return {"ok": True, "cached": counts}
