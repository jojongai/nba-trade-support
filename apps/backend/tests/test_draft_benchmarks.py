"""Unit tests: draft simulation + benchmark engine (no UI, no server)."""
from __future__ import annotations

import pytest

from app.services.benchmark_engine import (
    benchmarks_for_api_response,
    build_league_benchmarks,
    calculate_team_stat_profile,
    compare_team_categories_to_benchmarks,
    compare_team_to_benchmarks,
)
from app.services.draft_simulation import Player, simulate_draft, validate_teams


def _make_pool(n: int, *, with_proj: bool = False) -> list[Player]:
    """Enough players for an 8-team × 12 roster draft (96 min); n should be >= 96."""
    pool: list[Player] = []
    for i in range(n):
        pos = ["PG", "SG", "SF", "PF", "C"][i % 5]
        base = 1500 - i * 5
        kwargs: dict = {
            "player_id": str(10_000 + i),
            "name": f"Player{i}",
            "eligible_positions": (pos,),
            "value": float(1000 - i),
        }
        if with_proj:
            kwargs.update(
                proj_pts=base * 0.6,
                proj_reb=base * 0.15,
                proj_ast=base * 0.12,
                proj_threes=base * 0.08,
                proj_stl=base * 0.02,
                proj_blk=base * 0.015,
                proj_tov=base * 0.05,
                proj_fgm=base * 0.22,
                proj_fga=base * 0.48,
                proj_ftm=base * 0.12,
                proj_fta=base * 0.15,
            )
        pool.append(Player(**kwargs))
    return pool


REQ = {"PG": 1, "SG": 1, "SF": 1, "PF": 1, "C": 1}


def test_simulate_draft_produces_valid_rosters() -> None:
    pool = _make_pool(100)
    teams = simulate_draft(pool, num_teams=8, roster_size=12, requirements=REQ)
    assert len(teams) == 8
    validate_teams(teams, REQ, 12)
    assert sum(len(t.roster) for t in teams) == 8 * 12


def test_build_league_benchmarks_overall_and_categories() -> None:
    pool = _make_pool(100, with_proj=True)
    teams = simulate_draft(pool, num_teams=8, roster_size=12, requirements=REQ)
    bench = build_league_benchmarks(teams)

    assert "overall" in bench and "categories" in bench
    o = bench["overall"]
    assert o["min_score"] <= o["median_score"] <= o["max_score"]
    assert len(o["sorted_scores"]) == 8
    assert "PTS" in bench["categories"]
    pts = bench["categories"]["PTS"]
    assert "sorted_values" in pts
    assert pts["min"] <= pts["median"] <= pts["max"]


def test_benchmarks_for_api_response_includes_category_sorted_values() -> None:
    pool = _make_pool(100, with_proj=True)
    teams = simulate_draft(pool, num_teams=8, roster_size=12, requirements=REQ)
    full = build_league_benchmarks(teams)
    api = benchmarks_for_api_response(full)
    assert "sorted_values" in api["categories"]["PTS"]
    assert len(api["categories"]["PTS"]["sorted_values"]) == 8
    assert api["categories"]["PTS"]["average"] == full["categories"]["PTS"]["average"]


def test_compare_team_overall_and_categories() -> None:
    pool = _make_pool(100, with_proj=True)
    teams = simulate_draft(pool, num_teams=8, roster_size=12, requirements=REQ)
    full = build_league_benchmarks(teams)
    cmp_o = compare_team_to_benchmarks(teams[0], full)
    assert "team_score" in cmp_o and "rank_bucket" in cmp_o

    cmp_c = compare_team_categories_to_benchmarks(teams[0], full["categories"])
    assert "PTS" in cmp_c
    assert cmp_c["TOV"]["lower_is_better"] is True


def test_calculate_team_stat_profile_volume_weighted_percentages() -> None:
    p1 = Player(
        "1",
        "A",
        ("PG",),
        1.0,
        proj_fgm=4.0,
        proj_fga=10.0,
        proj_ftm=3.0,
        proj_fta=4.0,
    )
    p2 = Player(
        "2",
        "B",
        ("SG",),
        1.0,
        proj_fgm=1.0,
        proj_fga=4.0,
        proj_ftm=1.0,
        proj_fta=2.0,
    )
    from app.services.draft_simulation import Team

    team = Team(id=0, roster=[p1, p2])
    prof = calculate_team_stat_profile(team)
    assert prof["FG%"] == pytest.approx(5.0 / 14.0)
    assert prof["FT%"] == pytest.approx(4.0 / 6.0)
