"""
NBA data service: static teams/players (cached) and career stats (cached or live).
Uses nba_api.stats.static for teams/players; career stats from PlayerCareerStats per player.
Career stats are cached in data/career_stats.json after POST /data/refresh-careers (~500 requests).
Then GET /players/{id}/career and rankings use the cache; no repeat calls when visiting rankings.
"""
from pathlib import Path
import json
import time

from nba_api.stats.endpoints import playercareerstats  # type: ignore[import-untyped]

# Data directory next to backend app (apps/backend/data)
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
TEAMS_FILE = DATA_DIR / "teams.json"
PLAYERS_FILE = DATA_DIR / "players.json"
CAREER_STATS_FILE = DATA_DIR / "career_stats.json"


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
    """Fetch all NBA teams in one shot (nba_api.stats.static — no HTTP requests)."""
    from nba_api.stats.static import teams as static_teams  # type: ignore[import-untyped]
    return static_teams.get_teams()


def fetch_players_from_api() -> list[dict]:
    """Fetch all NBA players in one shot (nba_api.stats.static.players.get_players() — no HTTP requests)."""
    from nba_api.stats.static import players as static_players  # type: ignore[import-untyped]
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


def get_player_career(player_id: str | int, use_cache: bool = True) -> list[dict]:
    """
    Return career stats for one player (one dict per season).
    If use_cache and data/career_stats.json exists and contains this player, return from cache.
    Otherwise fetch from nba_api (one HTTP request).
    """
    if use_cache:
        all_stats = _load_json(CAREER_STATS_FILE)
        if all_stats:
            pid = int(player_id)
            cached = [r for r in all_stats if int(r.get("PLAYER_ID", 0)) == pid]
            if cached:
                return cached
    return _fetch_player_career_live(player_id)


def _fetch_player_career_live(player_id: str | int) -> list[dict]:
    """Fetch career stats for one player from nba_api (one HTTP request)."""
    career = playercareerstats.PlayerCareerStats(player_id=str(player_id))
    df = career.get_data_frames()[0]
    rows = df.to_dict(orient="records")
    # Ensure PLAYER_ID is in each row for cache format
    pid = int(player_id)
    for r in rows:
        r["PLAYER_ID"] = r.get("PLAYER_ID", pid)
    return rows


def get_all_career_stats() -> list[dict]:
    """Return full cached career stats (all player-seasons). Empty if cache not built."""
    return _load_json(CAREER_STATS_FILE) or []


def build_career_cache(delay_seconds: float = 0.5) -> dict:
    """
    Fetch career stats for every active player and save to data/career_stats.json.
    Uses cached players list; makes one nba_api request per active player (~500). Slow.
    Call via POST /data/refresh-careers. Delay between requests to reduce rate-limit risk.
    """
    players = get_players(use_cache=True)
    active = [p for p in players if p.get("is_active") is True]
    out: list[dict] = []
    for p in active:
        pid = p.get("id")
        if pid is None:
            continue
        try:
            rows = _fetch_player_career_live(pid)
            out.extend(rows)
        except Exception:
            continue
        if delay_seconds > 0:
            time.sleep(delay_seconds)
    _save_json(CAREER_STATS_FILE, out)
    return {"ok": True, "player_seasons": len(out), "active_players": len(active)}


def get_rankings_from_cache() -> list[dict]:
    """
    Rankings for GET /players/rankings. When career_stats.json exists, returns one row per
    player (latest season) with PPG/RPG/APG/rank and full_name from players.json.
    When cache is empty, returns active players from players.json with names only.
    """
    all_stats = get_all_career_stats()
    if all_stats:
        # Build player_id -> full_name from players.json (career_stats has no names)
        players = get_players(use_cache=True)
        id_to_name: dict[int, str] = {}
        for p in players:
            pid = p.get("id")
            if pid is not None:
                id_to_name[int(pid)] = p.get("full_name") or ""
        # Group by PLAYER_ID, take latest season, add PPG/RPG/APG, sort by PPG
        by_player: dict[int, list[dict]] = {}
        for r in all_stats:
            pid = int(r.get("PLAYER_ID", 0))
            if pid not in by_player:
                by_player[pid] = []
            by_player[pid].append(r)
        latest = [seasons[-1] for seasons in by_player.values() if seasons]
        for r in latest:
            gp = (r.get("GP") or 0) or 1
            r.setdefault("PPG", round((r.get("PTS") or 0) / gp, 1) if gp else 0)
            r.setdefault("RPG", round((r.get("REB") or 0) / gp, 1) if gp else 0)
            r.setdefault("APG", round((r.get("AST") or 0) / gp, 1) if gp else 0)
            r["MPG"] = round((r.get("MIN") or 0) / gp, 1) if gp else 0
            r["full_name"] = id_to_name.get(int(r.get("PLAYER_ID", 0)), "")
            r["player_id"] = r.get("PLAYER_ID")
        latest.sort(key=lambda x: (x.get("PPG") or 0), reverse=True)
        for i, r in enumerate(latest, start=1):
            r["rank"] = i
        return latest
    # No career cache: return active players from players.json (names only; stats = 0)
    players = get_players(use_cache=True)
    active = [p for p in players if p.get("is_active") is True]
    active.sort(key=lambda p: (p.get("full_name") or "").lower())
    return [
        {
            "player_id": p.get("id"),
            "full_name": p.get("full_name") or "",
            "first_name": p.get("first_name") or "",
            "last_name": p.get("last_name") or "",
            "team_abbreviation": "",
            "GP": 0,
            "MPG": 0,
            "FG_PCT": 0,
            "FT_PCT": 0,
            "FG3M": 0,
            "PTS": 0,
            "REB": 0,
            "AST": 0,
            "STL": 0,
            "BLK": 0,
            "TOV": 0,
            "rank": i,
        }
        for i, p in enumerate(active, start=1)
    ]
