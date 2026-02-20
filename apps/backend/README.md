# NBA Trade Support API

Python FastAPI backend for the NBA Trade Support IDSS. Data comes from [nba_api](https://github.com/swar/nba_api) (NBA.com); teams and players are cached locally in `data/*.json`.

## Setup

```bash
cd apps/backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Run locally

```bash
uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

## Data and cache

- **Static data (teams, players):** Fetched from `nba_api.stats.static` and cached in `data/teams.json` and `data/players.json`. First request to `/teams` or `/players` will fetch and cache; later requests use the cache.
- **Refresh:** `POST /data/refresh` refetches teams and players from the API and overwrites the cache. Run after deploy or on a schedule.
- **Player career stats:** `GET /players/{player_id}/career` calls the API on-demand (no cache).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/teams` | All NBA teams (cached) |
| GET | `/teams/search?name=...` or `?abbreviation=...` | Find team by name or abbrev |
| GET | `/players` | All players (cached) |
| GET | `/players/search?full_name=...` or `?first_name=...&last_name=...` | Search players by name |
| GET | `/players/{player_id}/career` | Career stats for a player (from nba_api) |
| POST | `/data/refresh` | Refill teams/players cache from nba_api |
