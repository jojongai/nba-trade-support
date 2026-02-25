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
PLAYER_POSITIONS_FILE = DATA_DIR / "player_positions.json"


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


def _load_positions() -> dict[int, str]:
    """Load player_id -> position from data/player_positions.json. Keys stored as str in JSON."""
    if not PLAYER_POSITIONS_FILE.exists():
        return {}
    with open(PLAYER_POSITIONS_FILE, encoding="utf-8") as f:
        raw = json.load(f)
    if not isinstance(raw, dict):
        return {}
    return {int(k): str(v) for k, v in raw.items()}


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


def refresh_player_positions(season: str = "2024-25") -> dict:
    """
    Fetch current roster (with POSITION) for every team via CommonTeamRoster (30 requests).
    Saves player_id -> position to data/player_positions.json. Run once or periodically;
    GET /players/rankings then reads from the cache for the Pos column.
    """
    from nba_api.stats.endpoints import commonteamroster  # type: ignore[import-untyped]

    teams = get_teams(use_cache=True)
    id_to_position: dict[int, str] = {}
    for t in teams:
        tid = t.get("id")
        if tid is None:
            continue
        try:
            roster = commonteamroster.CommonTeamRoster(team_id=tid, season=season)
            df = roster.common_team_roster.get_data_frame()
            if df is not None and not df.empty:
                for _, row in df.iterrows():
                    pid = row.get("PLAYER_ID")
                    pos = row.get("POSITION")
                    if pid is not None and pos and str(pos).strip():
                        id_to_position[int(pid)] = str(pos).strip()
        except Exception:
            continue
        time.sleep(0.3)
    _ensure_data_dir()
    with open(PLAYER_POSITIONS_FILE, "w", encoding="utf-8") as f:
        json.dump({str(k): v for k, v in id_to_position.items()}, f, indent=2)
    return {"ok": True, "players_with_position": len(id_to_position)}


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
    player for season 2025-26 only, with PPG/RPG/APG/rank and full_name from players.json.
    When cache is empty, returns active players from players.json with names only.
    """
    RANKINGS_SEASON = "2025-26"
    all_stats = get_all_career_stats()
    if all_stats:
        # Only use 2025-26 season
        season_stats = [r for r in all_stats if r.get("SEASON_ID") == RANKINGS_SEASON]
        if not season_stats:
            # Fallback: no rows for that season, return active players with zeroed stats
            players = get_players(use_cache=True)
            active = [p for p in players if p.get("is_active") is True]
            id_to_position = _load_positions()
            active.sort(key=lambda p: (p.get("full_name") or "").lower())
            return [
                {
                    "player_id": p.get("id"),
                    "full_name": p.get("full_name") or "",
                    "first_name": p.get("first_name") or "",
                    "last_name": p.get("last_name") or "",
                    "team_abbreviation": "",
                    "position": id_to_position.get(int(p.get("id") or 0), "") or "—",
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
        # Build player_id -> full_name from players.json (career_stats has no names)
        players = get_players(use_cache=True)
        id_to_name: dict[int, str] = {}
        for p in players:
            pid = p.get("id")
            if pid is not None:
                id_to_name[int(pid)] = p.get("full_name") or ""
        # One row per player (2025-26 only; aggregate if multiple rows e.g. traded)
        by_player: dict[int, list[dict]] = {}
        for r in season_stats:
            pid = int(r.get("PLAYER_ID", 0))
            if pid not in by_player:
                by_player[pid] = []
            by_player[pid].append(r)
        latest = []
        sum_keys = ("GP", "GS", "MIN", "FGM", "FGA", "FG3M", "FG3A", "FTM", "FTA", "OREB", "DREB", "REB", "AST", "STL", "BLK", "TOV", "PF", "PTS")
        for pid, rows in by_player.items():
            if not rows:
                continue
            # Traded players: API gives one row per team plus a "TOT" row with combined stats.
            # Use TOT stats and the team from the row right before TOT (most recent team).
            tot_idx = next(
                (i for i, r in enumerate(rows) if (r.get("TEAM_ABBREVIATION") or "") == "TOT"),
                None,
            )
            if tot_idx is not None:
                r0 = dict(rows[tot_idx])
                if tot_idx > 0:
                    r0["TEAM_ABBREVIATION"] = rows[tot_idx - 1].get("TEAM_ABBREVIATION") or ""
                    r0["TEAM_ID"] = rows[tot_idx - 1].get("TEAM_ID", 0)
            else:
                r0 = dict(rows[0])
                if len(rows) > 1:
                    for k in sum_keys:
                        if k in r0 and isinstance(r0.get(k), (int, float)):
                            r0[k] = sum(row.get(k) or 0 for row in rows)
                    if r0.get("FGA"):
                        r0["FG_PCT"] = (r0.get("FGM") or 0) / r0["FGA"]
                    if r0.get("FG3A"):
                        r0["FG3_PCT"] = (r0.get("FG3M") or 0) / r0["FG3A"]
                    if r0.get("FTA"):
                        r0["FT_PCT"] = (r0.get("FTM") or 0) / r0["FTA"]
                    # Use team from segment with most games
                    best = max(rows, key=lambda x: x.get("GP") or 0)
                    r0["TEAM_ABBREVIATION"] = best.get("TEAM_ABBREVIATION") or ""
            r0["PLAYER_ID"] = pid
            latest.append(r0)
        # Add active players who have no 2025-26 stats — default all values to 0
        active_ids = {int(p.get("id")) for p in players if p.get("is_active") is True and p.get("id") is not None}
        have_season = {int(r.get("PLAYER_ID", 0)) for r in latest}
        for pid in active_ids:
            if pid in have_season:
                continue
            p = next((x for x in players if x.get("id") == pid), None)
            if not p:
                continue
            latest.append({
                "PLAYER_ID": pid,
                "player_id": pid,
                "full_name": p.get("full_name") or "",
                "first_name": p.get("first_name") or "",
                "last_name": p.get("last_name") or "",
                "TEAM_ABBREVIATION": "",
                "team_abbreviation": "",
                "GP": 0,
                "GS": 0,
                "MIN": 0,
                "FGM": 0,
                "FGA": 0,
                "FG_PCT": 0,
                "FG3M": 0,
                "FG3A": 0,
                "FG3_PCT": 0,
                "FTM": 0,
                "FTA": 0,
                "FT_PCT": 0,
                "OREB": 0,
                "DREB": 0,
                "REB": 0,
                "AST": 0,
                "STL": 0,
                "BLK": 0,
                "TOV": 0,
                "PF": 0,
                "PTS": 0,
            })
        for r in latest:
            gp = (r.get("GP") or 0) or 1
            r.setdefault("PPG", round((r.get("PTS") or 0) / gp, 1) if gp else 0)
            r.setdefault("RPG", round((r.get("REB") or 0) / gp, 1) if gp else 0)
            r.setdefault("APG", round((r.get("AST") or 0) / gp, 1) if gp else 0)
            r["MPG"] = round((r.get("MIN") or 0) / gp, 1) if gp else 0
            r["full_name"] = id_to_name.get(int(r.get("PLAYER_ID", 0)), "")
            r["player_id"] = r.get("PLAYER_ID")
            r["team_abbreviation"] = r.get("TEAM_ABBREVIATION") or ""
        id_to_position = _load_positions()
        for r in latest:
            pid = int(r.get("player_id") or r.get("PLAYER_ID", 0))
            r["position"] = id_to_position.get(pid, "") or "—"
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
            "position": _load_positions().get(int(p.get("id") or 0), "") or "—",
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
