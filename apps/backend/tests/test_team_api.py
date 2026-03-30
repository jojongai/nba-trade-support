"""POST /team/analyze smoke test."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import team as team_router
from app.services.benchmark_engine import benchmarks_for_api_response, build_league_benchmarks
from app.services.draft_simulation import Player, simulate_draft

app = FastAPI()
app.include_router(team_router.router)
client = TestClient(app)

REQ = {"PG": 1, "SG": 1, "SF": 1, "PF": 1, "C": 1}


def test_team_analyze_endpoint() -> None:
    pool: list[Player] = []
    for i in range(40):
        pos = ["PG", "SG", "SF", "PF", "C"][i % 5]
        pool.append(
            Player(
                player_id=str(i),
                name=f"Player{i}",
                eligible_positions=(pos,),
                value=float(100 - i),
                proj_pts=float(500 - i),
            )
        )
    teams = simulate_draft(pool, num_teams=2, roster_size=12, requirements=REQ)
    bench = benchmarks_for_api_response(build_league_benchmarks(teams))
    roster_players = [
        {
            "player_id": p.player_id,
            "name": p.name,
            "eligible_positions": list(p.eligible_positions),
            "value": p.value,
            "proj_pts": p.proj_pts,
        }
        for p in pool[:5]
    ]
    body = {
        "benchmarks": bench,
        "roster_players": roster_players,
        "roster_slots": [
            {"slot_label": "PG", "player_id": roster_players[0]["player_id"]},
            {"slot_label": "BENCH", "player_id": roster_players[1]["player_id"]},
            {"slot_label": "BENCH", "player_id": roster_players[2]["player_id"]},
            {"slot_label": "BENCH", "player_id": roster_players[3]["player_id"]},
            {"slot_label": "BENCH", "player_id": roster_players[4]["player_id"]},
        ],
        "draft_pool_values": [p.value for p in pool],
        "total_league_slots": 24,
    }
    r = client.post("/team/analyze", json=body)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "flags" in data and "candidate_actions" in data
    assert "trade_targets" in data and data["trade_targets"] is None
