"""Team analysis vs synthetic benchmarks."""
from __future__ import annotations

from app.services.benchmark_engine import build_league_benchmarks, benchmarks_for_api_response
from app.services.draft_simulation import Player, simulate_draft
from app.services.team_analysis import (
    replacement_level_value,
    run_team_analysis,
)

REQ = {"PG": 1, "SG": 1, "SF": 1, "PF": 1, "C": 1}


def _pool(n: int) -> list[Player]:
    out: list[Player] = []
    for i in range(n):
        pos = ["PG", "SG", "SF", "PF", "C"][i % 5]
        out.append(
            Player(
                player_id=str(10_000 + i),
                name=f"P{i}",
                eligible_positions=(pos,),
                value=float(500 - i),
                proj_pts=float(1000 - i),
                proj_reb=200.0,
                proj_ast=150.0,
                proj_threes=80.0,
                proj_stl=40.0,
                proj_blk=30.0,
                proj_tov=60.0,
                proj_fgm=300.0,
                proj_fga=600.0,
                proj_ftm=100.0,
                proj_fta=120.0,
            )
        )
    return out


def test_run_team_analysis_end_to_end() -> None:
    pool = _pool(100)
    teams = simulate_draft(pool, num_teams=8, roster_size=12, requirements=REQ)
    full = build_league_benchmarks(teams)
    api_bench = benchmarks_for_api_response(full)

    user = pool[:12]
    slots: list[tuple[str, str | None]] = []
    for i, pl in enumerate(user):
        label = "PG" if i == 0 else "BENCH"
        slots.append((label, pl.player_id))

    pool_vals = [p.value for p in pool]
    out = run_team_analysis(
        user,
        slots,
        api_bench,
        pool_vals,
        8 * 12,
    )
    assert "profile" in out and "flags" in out
    assert out["trade_targets"] is None
    assert out["league_comparison"]["overall"]["percentile_estimate"] >= 0


def test_replacement_level_value() -> None:
    vals = [1.0, 2.0, 3.0, 4.0, 5.0]
    assert replacement_level_value(vals, 3) == 3.0
