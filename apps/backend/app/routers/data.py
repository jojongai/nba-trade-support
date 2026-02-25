"""Data refresh: refill local JSON cache from nba_api."""
from fastapi import APIRouter, HTTPException

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


@router.post("/refresh-careers")
def refresh_careers(delay_seconds: float = 0.5) -> dict:
    """
    Build career stats cache: fetch career for every active player (~500 requests), save to
    data/career_stats.json. Slow; run once or periodically. After this, GET /players/rankings
    and GET /players/{id}/career use the cache so the rankings page and rest of the site stay fast.
    """
    try:
        result = nba_service.build_career_cache(delay_seconds=delay_seconds)
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to build career cache: {e!s}") from e
