"""
NBA data service: static teams/players (cached to JSON) and career stats (on-demand).
Uses nba_api.stats.static and nba_api.stats.endpoints.
"""
from pathlib import Path
import json

from nba_api.stats.static import teams as static_teams
from nba_api.stats.static import players as static_players
from nba_api.stats.endpoints import playercareerstats

# Data directory next to backend app (apps/backend/data)
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
TEAMS_FILE = DATA_DIR / "teams.json"
PLAYERS_FILE = DATA_DIR / "players.json"


def _ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _load_json(path: Path) -> list | None:
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _save_json(path: Path, data: list) -> None:
    _ensure_data_dir()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def fetch_teams_from_api() -> list[dict]:
    """Fetch all NBA teams from nba_api (no cache)."""
    return static_teams.get_teams()


def fetch_players_from_api() -> list[dict]:
    """Fetch all NBA players from nba_api (no cache)."""
    return static_players.get_players()


def get_teams(use_cache: bool = True) -> list[dict]:
    """
    Return teams: from cache if present and use_cache, else fetch from API and save.
    """
    if use_cache:
        cached = _load_json(TEAMS_FILE)
        if cached is not None:
            return cached
    data = fetch_teams_from_api()
    _save_json(TEAMS_FILE, data)
    return data


def get_players(use_cache: bool = True) -> list[dict]:
    """
    Return players: from cache if present and use_cache, else fetch from API and save.
    """
    if use_cache:
        cached = _load_json(PLAYERS_FILE)
        if cached is not None:
            return cached
    data = fetch_players_from_api()
    _save_json(PLAYERS_FILE, data)
    return data


def refresh_static_data() -> dict[str, int]:
    """
    Fetch teams and players from nba_api and write to data/*.json.
    Returns counts: {"teams": 30, "players": N}.
    """
    _ensure_data_dir()
    teams_data = fetch_teams_from_api()
    players_data = fetch_players_from_api()
    _save_json(TEAMS_FILE, teams_data)
    _save_json(PLAYERS_FILE, players_data)
    return {"teams": len(teams_data), "players": len(players_data)}


def get_player_career(player_id: str | int) -> dict:
    """
    Fetch career stats for a player from nba_api (no cache).
    Returns the raw get_dict() from PlayerCareerStats (resultSets, etc.).
    """
    career = playercareerstats.PlayerCareerStats(player_id=str(player_id))
    return career.get_dict()
