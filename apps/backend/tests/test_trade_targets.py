"""Trade target derivation (deterministic)."""
from __future__ import annotations

from app.services.trade_targets import (
    build_trade_targets_bundle,
    derive_needs_and_avoid_hurting,
    filter_and_rank_candidates,
)


def _mock_comparison() -> dict:
    cats = {}
    for k in (
        "PTS",
        "REB",
        "AST",
        "3PM",
        "STL",
        "BLK",
        "TOV",
        "FG%",
        "FT%",
    ):
        cats[k] = {
            "percentile_estimate": 50.0,
            "delta_vs_median": 0.0,
            "lower_is_better": k == "TOV",
        }
    cats["REB"]["percentile_estimate"] = 25.0
    cats["BLK"]["percentile_estimate"] = 30.0
    cats["AST"]["percentile_estimate"] = 75.0
    cats["FT%"]["percentile_estimate"] = 72.0
    cats["TOV"]["percentile_estimate"] = 35.0
    return {"categories": cats}


def test_derive_needs_and_avoid() -> None:
    needs, avoid = derive_needs_and_avoid_hurting(_mock_comparison())
    assert "REB" in needs or "BLK" in needs
    assert "AST" in avoid or "FT%" in avoid


def test_filter_candidates_mock_rows() -> None:
    rows = [
        {
            "player_id": 1,
            "full_name": "Big Guy",
            "team_abbreviation": "CLE",
            "position": "C",
            "GP": 50,
            "REB": 500,
            "BLK": 80,
            "AST": 100,
            "PTS": 800,
            "STL": 40,
            "TOV": 80,
            "FGM": 300,
            "FGA": 600,
            "FTM": 100,
            "FTA": 120,
            "FG3M": 20,
        },
        {
            "player_id": 2,
            "full_name": "Tiny Guard",
            "team_abbreviation": "BOS",
            "position": "PG",
            "GP": 50,
            "REB": 100,
            "BLK": 10,
            "AST": 400,
            "PTS": 900,
            "STL": 60,
            "TOV": 120,
            "FGM": 320,
            "FGA": 700,
            "FTM": 150,
            "FTA": 170,
            "FG3M": 100,
        },
    ]
    pv = {"1": 40.0, "2": 45.0}
    lc = _mock_comparison()
    needs, avoid = derive_needs_and_avoid_hurting(lc)
    out = filter_and_rank_candidates(
        rows,
        pv,
        set(),
        replacement_level_value=5.0,
        needs=needs,
        avoid=avoid,
        league_comparison=lc,
    )
    assert len(out) >= 1
    assert out[0]["name"] == "Big Guy"


def test_build_bundle_minimal() -> None:
    profile = {
        "positional_depth": {
            "PG": {"count": 2, "value_sum": 80.0, "players": ["A", "B"]},
            "SG": {"count": 1, "value_sum": 20.0, "players": ["C"]},
            "SF": {"count": 1, "value_sum": 15.0, "players": ["D"]},
            "PF": {"count": 1, "value_sum": 10.0, "players": ["E"]},
            "C": {"count": 1, "value_sum": 5.0, "players": ["F"]},
        }
    }
    roster = [
        {"player_id": "10", "name": "A", "value": 40.0, "eligible_positions": ["PG"]},
        {"player_id": "11", "name": "B", "value": 40.0, "eligible_positions": ["PG"]},
    ]
    rows = [
        {
            "player_id": 99,
            "full_name": "Target Center",
            "team_abbreviation": "MEM",
            "position": "C",
            "GP": 40,
            "REB": 400,
            "BLK": 90,
            "AST": 80,
            "PTS": 600,
            "STL": 30,
            "TOV": 70,
            "FGM": 220,
            "FGA": 400,
            "FTM": 80,
            "FTA": 100,
            "FG3M": 10,
        }
    ]
    pv = {"10": 40.0, "11": 40.0, "99": 38.0}
    b = build_trade_targets_bundle(
        _mock_comparison(),
        profile,
        roster,
        rows,
        pv,
        replacement_level_value=10.0,
    )
    assert "needs" in b and "curated_for_llm" in b
    assert isinstance(b["trade_assets"], list)
