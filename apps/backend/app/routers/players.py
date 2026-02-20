"""Players endpoints: list, search, and career stats."""
from fastapi import APIRouter, HTTPException

from app.services import nba_service

router = APIRouter(prefix="/players", tags=["players"])


@router.get("")
def list_players(use_cache: bool = True) -> list[dict]:
    """
    Return all NBA players (from cache if available, else fetch from nba_api and cache).
    Set use_cache=false to force a fresh fetch.
    """
    return nba_service.get_players(use_cache=use_cache)


@router.get("/search")
def search_players(
    full_name: str | None = None,
    first_name: str | None = None,
    last_name: str | None = None,
    active_only: bool = True,
) -> list[dict]:
    """
    Find players by name. Pass full_name for exact match, or first_name/last_name
    for substring match (case-insensitive). By default only active players are returned.
    """
    players = nba_service.get_players()
    if active_only:
        players = [p for p in players if p.get("is_active") is True]
    if full_name:
        matches = [p for p in players if p.get("full_name") == full_name]
    elif first_name or last_name:
        matches = players
        if first_name:
            f = first_name.lower()
            matches = [p for p in matches if f in (p.get("first_name") or "").lower()]
        if last_name:
            ln = last_name.lower()
            matches = [p for p in matches if ln in (p.get("last_name") or "").lower()]
    else:
        return players
    return matches


@router.get("/{player_id}/career")
def get_player_career(player_id: int) -> dict:
    """
    Return career stats for a player (from nba_api on-demand).
    Same structure as nba_api PlayerCareerStats.get_dict() (resultSets, etc.).
    """
    try:
        return nba_service.get_player_career(player_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch career stats: {e!s}") from e
