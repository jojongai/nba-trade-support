"""HTTP tests: POST /draft/simulate returns teams + benchmarks (TestClient)."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import draft

app = FastAPI()
app.include_router(draft.router)
client = TestClient(app)

MINIMAL_PLAYERS_BODY = {
    "num_teams": 2,
    "roster_size": 12,
    "requirements": {"PG": 1, "SG": 1, "SF": 1, "PF": 1, "C": 1},
    "players": [
        {
            "player_id": str(i),
            "name": f"P{i}",
            "eligible_positions": ["PG", "SG", "SF", "PF", "C"],
            "value": float(100 - i),
        }
        for i in range(30)
    ],
}


def test_draft_simulate_returns_teams_and_benchmarks() -> None:
    r = client.post("/draft/simulate", json=MINIMAL_PLAYERS_BODY)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "teams" in data and "benchmarks" in data
    assert len(data["teams"]) == 2
    b = data["benchmarks"]
    assert "overall" in b and "categories" in b
    assert "average_score" in b["overall"]
    assert "PTS" in b["categories"]
    assert "sorted_values" in b["categories"]["PTS"]
    assert len(b["categories"]["PTS"]["sorted_values"]) == 2
