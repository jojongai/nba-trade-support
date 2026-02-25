# NBA Trade Support API

Python FastAPI backend for the NBA Trade Support IDSS. Data comes from [nba_api](https://github.com/swar/nba_api). Teams and players are cached in `data/*.json`. Career stats are cached in `data/career_stats.json` after you run a one-time (or periodic) refresh so the rankings page and per-player career stay fast without repeating ~500 API calls.

## Setup

```bash
cd apps/backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Run locally

```bash
uvicorn main:app --host 127.0.0.1 --port 8000
```

With auto-reload (for development):

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000 --reload-exclude '.venv'
```

**What this does:** From `apps/backend` (with venv active), `uvicorn` starts an ASGI server. `main:app` means “load the `app` object from `main.py`”. So Python runs `main.py`, which creates the FastAPI app, includes the routers (`/teams`, `/players`, `/data`), and defines `/`, `/health`, `/ping`. The server binds to `127.0.0.1:8000` and serves until you stop it (Ctrl+C). First request to `/teams` or `/players` may be slow while data is fetched and cached; after that, responses use the cache.

API docs: http://127.0.0.1:8000/docs

## Data and cache

- **Static data (teams, players):** Fetched from `nba_api.stats.static` and cached in `data/teams.json` and `data/players.json`. First request to `/teams` or `/players` will fetch and cache; later requests use the cache.
- **Refresh:** `POST /data/refresh` refetches teams and players from the API and overwrites the cache.
- **Career stats cache:** `data/career_stats.json` holds career stats for all active players. Build it with `POST /data/refresh-careers` (runs ~500 requests once). After that, `GET /players/rankings` and `GET /players/{player_id}/career` read from the cache so the rankings page and the rest of the site don’t need to hit the API again. `GET /players/{id}/career` falls back to a live request if the player isn’t in the cache.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/teams` | All NBA teams (cached) |
| GET | `/teams/search?name=...` or `?abbreviation=...` | Find team by name or abbrev |
| GET | `/players` | All players (cached) |
| GET | `/players/search?full_name=...` or `?first_name=...&last_name=...` | Search players by name |
| GET | `/players/rankings` | Rankings (latest season per player, by PPG) from career cache; empty until cache is built |
| GET | `/players/{player_id}/career` | Career stats for a player (from cache if available, else live) |
| POST | `/data/refresh` | Refill teams/players cache from nba_api |
| POST | `/data/refresh-careers` | Build career cache (~500 requests); then rankings and career use cache |
