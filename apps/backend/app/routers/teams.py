"""Teams endpoints: list and lookup by name."""
from fastapi import APIRouter, HTTPException

from app.services import nba_service

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("")
def list_teams(use_cache: bool = True) -> list[dict]:
    """
    Return all NBA teams (from cache if available, else fetch from nba_api and cache).
    Set use_cache=false to force a fresh fetch from the API.
    """
    return nba_service.get_teams(use_cache=use_cache)


@router.get("/search")
def search_team(name: str | None = None, abbreviation: str | None = None) -> dict | list[dict]:
    """
    Find team(s) by full name or abbreviation.
    Returns a single team dict if one match, else list of matches (or empty list).
    """
    teams = nba_service.get_teams()
    if name:
        matches = [t for t in teams if t.get("full_name") == name]
    elif abbreviation:
        matches = [t for t in teams if t.get("abbreviation") == abbreviation.upper()]
    else:
        return teams
    if not matches:
        raise HTTPException(status_code=404, detail="Team not found")
    return matches[0] if len(matches) == 1 else matches
