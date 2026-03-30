"""
Deterministic user roster analysis vs synthetic league benchmarks (no LLM).

Steps: profile → compare → flags → candidate actions. Intended to feed an LLM
with structured diagnosis + suggested move types.
"""
from __future__ import annotations

from typing import Any

from app.services.benchmark_engine import (
    CATEGORY_KEYS,
    StatBenchmarkDict,
    calculate_team_stat_profile,
    compare_team_categories_to_benchmarks,
    compare_team_to_benchmarks,
    score_team,
)
from app.services.draft_simulation import Player, Team

STANDARD_POSITIONS: tuple[str, ...] = ("PG", "SG", "SF", "PF", "C")
BENCH_SLOT_LABELS: frozenset[str] = frozenset({"BENCH", "IL"})
GUARD_POSITIONS: frozenset[str] = frozenset({"PG", "SG"})
BIG_POSITIONS: frozenset[str] = frozenset({"PF", "C"})


def _get_overall(benchmarks: dict[str, Any]) -> dict[str, Any]:
    if "overall" in benchmarks and isinstance(benchmarks["overall"], dict):
        return benchmarks["overall"]
    return benchmarks


def _category_benchmarks_dict_to_typed(categories: dict[str, Any]) -> dict[str, StatBenchmarkDict]:
    out: dict[str, StatBenchmarkDict] = {}
    for k in CATEGORY_KEYS:
        if k not in categories:
            raise ValueError(f"Missing category benchmark for {k!r}.")
        v = categories[k]
        sv = v.get("sorted_values")
        if sv is None:
            raise ValueError(
                f"Category {k!r} missing sorted_values; use full benchmarks from /draft/simulate."
            )
        out[k] = {
            "average": float(v["average"]),
            "median": float(v["median"]),
            "q1": float(v["q1"]),
            "q3": float(v["q3"]),
            "min": float(v["min"]),
            "max": float(v["max"]),
            "sorted_values": [float(x) for x in sv],
        }
    return out


def replacement_level_value(pool_values: list[float], total_slots: int) -> float:
    """
    Approximate replacement as the value of the **last** player drafted into
    the league (worst rostered player in a filled ``num_teams * roster_size`` draft).
    """
    if not pool_values:
        return 0.0
    asc = sorted(pool_values)
    idx = min(total_slots, len(asc)) - 1
    return float(asc[max(0, idx)])


def primary_position(eligible_positions: tuple[str, ...], api_position: str | None) -> str:
    """Map to one of PG/SG/SF/PF/C for positional grouping."""
    if api_position:
        p = api_position.strip().upper()
        if p in STANDARD_POSITIONS:
            return p
        if p == "G":
            return "PG"
        if p == "F":
            return "SF"
        if p in ("G-F", "F-G"):
            return "SF"
        if p in ("F-C", "C-F"):
            return "PF"
        if p == "C":
            return "C"
    for pos in STANDARD_POSITIONS:
        if pos in eligible_positions:
            return pos
    return "SF"


def positional_depth(
    players: list[Player],
    *,
    primary_fn: Any = None,
) -> dict[str, dict[str, Any]]:
    """Count and value sum per standard position."""
    fn = primary_fn or (lambda pl: primary_position(pl.eligible_positions, None))  # type: ignore[union-attr]
    depth: dict[str, dict[str, Any]] = {
        p: {"count": 0, "value_sum": 0.0, "names": []} for p in STANDARD_POSITIONS
    }
    for pl in players:
        pos = fn(pl)
        if pos not in depth:
            pos = "SF"
        depth[pos]["count"] += 1
        depth[pos]["value_sum"] += float(pl.value)
        depth[pos]["names"].append(pl.name)
    return depth


def starter_bench_split(
    players_by_id: dict[str, Player],
    roster_slots: list[tuple[str, str | None]],
) -> tuple[float, float, list[str], list[str]]:
    """
    starter_value, bench_value, starter_ids, bench_ids using slot labels.
    BENCH and IL slots count as bench; all others as active/starter bucket.
    """
    starter_value = 0.0
    bench_value = 0.0
    starter_ids: list[str] = []
    bench_ids: list[str] = []
    for slot_label, pid in roster_slots:
        if not pid or pid not in players_by_id:
            continue
        pl = players_by_id[pid]
        v = float(pl.value)
        label = (slot_label or "").upper()
        if label in BENCH_SLOT_LABELS:
            bench_value += v
            bench_ids.append(pid)
        else:
            starter_value += v
            starter_ids.append(pid)
    return starter_value, bench_value, starter_ids, bench_ids


def build_user_team_profile(
    roster_players: list[Player],
    roster_slots: list[tuple[str, str | None]],
    *,
    draft_pool_values: list[float],
    total_league_slots: int,
) -> dict[str, Any]:
    """Step 1: aggregate profile, positional depth, starter vs bench value."""
    players_by_id = {p.player_id: p for p in roster_players}
    team = Team(id=0, roster=roster_players)
    stats = calculate_team_stat_profile(team)
    overall_score = score_team(team)
    sv, bv, _, _ = starter_bench_split(players_by_id, roster_slots)
    depth = positional_depth(roster_players)
    repl = replacement_level_value(draft_pool_values, total_league_slots)

    return {
        "overall_score": round(overall_score, 4),
        "category_totals": {k: round(stats[k], 4) for k in CATEGORY_KEYS},
        "positional_depth": {
            k: {
                "count": depth[k]["count"],
                "value_sum": round(float(depth[k]["value_sum"]), 4),
                "players": depth[k]["names"],
            }
            for k in STANDARD_POSITIONS
        },
        "starter_value_sum": round(sv, 4),
        "bench_value_sum": round(bv, 4),
        "replacement_level_value": round(repl, 4),
        "roster_size": len(roster_players),
    }


def compare_user_to_synthetic_league(
    roster_players: list[Player],
    benchmarks: dict[str, Any],
) -> dict[str, Any]:
    """Step 2: league percentiles and deltas vs league."""
    team = Team(id=0, roster=roster_players)
    overall = compare_team_to_benchmarks(team, benchmarks)
    cats_raw = benchmarks.get("categories", benchmarks)
    if not isinstance(cats_raw, dict):
        raise ValueError("benchmarks must include categories.")
    typed = _category_benchmarks_dict_to_typed(cats_raw)
    cat_cmp = compare_team_categories_to_benchmarks(team, typed)

    # Strongest / weakest by fantasy-adjusted percentile (higher = better)
    ranked = sorted(
        CATEGORY_KEYS,
        key=lambda k: cat_cmp[k]["percentile_estimate"],
        reverse=True,
    )
    strongest_3 = list(ranked[:3])
    weakest_3 = list(reversed(ranked[-3:]))

    category_summary: dict[str, Any] = {}
    for k in CATEGORY_KEYS:
        c = cat_cmp[k]
        category_summary[k] = {
            "value": round(c["value"], 6),
            "delta_vs_median": round(c["delta_vs_median"], 6),
            "delta_vs_average": round(c["delta_vs_average"], 6),
            "percentile_estimate": round(c["percentile_estimate"], 2),
            "rank_bucket": c["rank_bucket"],
            "lower_is_better": c["lower_is_better"],
        }

    return {
        "overall": {
            "team_score": round(overall["team_score"], 4),
            "percentile_estimate": round(overall["percentile_estimate"], 2),
            "delta_vs_average": round(overall["delta_vs_average"], 4),
            "delta_vs_median": round(overall["delta_vs_median"], 4),
            "rank_bucket": overall["rank_bucket"],
        },
        "categories": category_summary,
        "strongest_categories": strongest_3,
        "weakest_categories": weakest_3,
    }


def _near_replacement(value: float, repl: float, pct: float = 0.05) -> bool:
    if repl <= 0:
        return True
    return abs(value - repl) / repl <= pct


def identify_flags_and_actions(
    profile: dict[str, Any],
    comparison: dict[str, Any],
    roster_players: list[Player],
    roster_slots: list[tuple[str, str | None]],
    *,
    draft_pool_values: list[float],
    total_league_slots: int,
) -> tuple[list[str], list[str]]:
    """Steps 3–4: deterministic flags and candidate actions."""
    flags: list[str] = []
    actions: list[str] = []

    players_by_id = {p.player_id: p for p in roster_players}
    repl = replacement_level_value(draft_pool_values, total_league_slots)
    depth = profile["positional_depth"]

    # value by position
    pos_vals = {p: float(depth[p]["value_sum"]) for p in STANDARD_POSITIONS}
    total_v = sum(pos_vals.values()) or 1.0
    weakest_pos = min(STANDARD_POSITIONS, key=lambda x: pos_vals[x])
    surplus_pos = max(STANDARD_POSITIONS, key=lambda x: pos_vals[x])

    # Near-replacement bench players
    bench_near: list[str] = []
    for slot_label, pid in roster_slots:
        if not pid or pid not in players_by_id:
            continue
        if (slot_label or "").upper() not in BENCH_SLOT_LABELS:
            continue
        pl = players_by_id[pid]
        if _near_replacement(float(pl.value), repl):
            bench_near.append(pl.name)

    if len(bench_near) >= 2:
        flags.append(
            f"{len(bench_near)} bench players are within ~5% of replacement value "
            f"({', '.join(bench_near[:4])}{'…' if len(bench_near) > 4 else ''})."
        )
        actions.append(
            "Consider streaming or waivers to replace end-of-bench value with upside."
        )
    elif len(bench_near) == 1:
        flags.append(f"Bench player {bench_near[0]} is near replacement level.")
        actions.append("Look for a waiver/stream upgrade on the weakest bench spot.")

    stat_cats = comparison["categories"]
    if pos_vals["C"] < pos_vals["PG"] * 0.35 and pos_vals["C"] < pos_vals["SF"]:
        flags.append("Center position group has a low share of roster value vs wings/guards.")

    if stat_cats["BLK"]["rank_bucket"] == "bottom_quartile" and stat_cats["REB"]["rank_bucket"] == "bottom_quartile":
        flags.append("Team is bottom quartile in both blocks and rebounds.")
        actions.append("Target defensive bigs (rebounds + blocks) in trades or waivers.")

    guard_share = (pos_vals["PG"] + pos_vals["SG"]) / total_v
    big_share = (pos_vals["PF"] + pos_vals["C"]) / total_v
    if guard_share >= 0.42 and big_share <= 0.22:
        flags.append("Roster skews guard-heavy (high guard value share, low big value share).")
        actions.append("Balance guard surplus with a trade for a PF/C if categories matter.")

    if weakest_pos != surplus_pos and pos_vals[surplus_pos] > 0:
        if surplus_pos in GUARD_POSITIONS and weakest_pos in BIG_POSITIONS:
            actions.append(
                f"Surplus at {surplus_pos} vs weak {weakest_pos}: consider trading guard depth for a big."
            )
        elif surplus_pos in BIG_POSITIONS and weakest_pos in GUARD_POSITIONS:
            actions.append(
                f"Surplus at {surplus_pos} vs weak {weakest_pos}: consider trading big depth for guard stats."
            )

    # Build mismatch: finesse vs physical
    if (
        stat_cats["FT%"]["percentile_estimate"] >= 70
        and stat_cats["AST"]["percentile_estimate"] >= 70
        and stat_cats["STL"]["percentile_estimate"] >= 70
        and stat_cats["REB"]["percentile_estimate"] <= 35
        and stat_cats["FG%"]["percentile_estimate"] <= 35
    ):
        flags.append(
            "Guard-heavy finesse profile: strong FT%, AST, STL but weak REB/FG% vs league."
        )
        actions.append("Prioritize frontcourt efficiency and boards if punting is not planned.")

    # Redundant bench guards
    bench_guard_names: list[str] = []
    for slot_label, pid in roster_slots:
        if not pid or pid not in players_by_id:
            continue
        if (slot_label or "").upper() not in BENCH_SLOT_LABELS:
            continue
        pl = players_by_id[pid]
        if primary_position(pl.eligible_positions, None) in GUARD_POSITIONS:
            bench_guard_names.append(pl.name)
    if len(bench_guard_names) >= 2:
        flags.append(
            f"Multiple bench guards ({', '.join(bench_guard_names[:3])}) may be redundant."
        )

    # Generic weakest category
    wk = comparison["weakest_categories"]
    if wk:
        flags.append(
            f"Softest categories vs league (by percentile): {', '.join(wk)}."
        )

    if not actions:
        actions.append(
            "Monitor waivers for value at your weakest categories; keep trade flexibility."
        )

    return flags, actions


def run_team_analysis(
    roster_players: list[Player],
    roster_slots: list[tuple[str, str | None]],
    benchmarks: dict[str, Any],
    draft_pool_values: list[float],
    total_league_slots: int,
    player_values: dict[str, float] | None = None,
) -> dict[str, Any]:
    """
    Run steps 1–4 and return a JSON-serializable bundle for APIs and LLM context.

    When ``player_values`` is provided (trade value by ``player_id`` string, full
    rankings coverage), also computes deterministic trade targets vs NBA rankings.
    """
    if not roster_players:
        raise ValueError("roster_players must be non-empty.")

    profile = build_user_team_profile(
        roster_players,
        roster_slots,
        draft_pool_values=draft_pool_values,
        total_league_slots=total_league_slots,
    )
    comparison = compare_user_to_synthetic_league(roster_players, benchmarks)
    flags, actions = identify_flags_and_actions(
        profile,
        comparison,
        roster_players,
        roster_slots,
        draft_pool_values=draft_pool_values,
        total_league_slots=total_league_slots,
    )

    trade_targets: dict[str, Any] | None = None
    if player_values:
        from app.services.trade_targets import build_trade_targets_bundle

        from app.services import nba_service

        rows = nba_service.get_rankings_from_cache()
        roster_dicts = [
            {
                "player_id": p.player_id,
                "name": p.name,
                "value": float(p.value),
                "eligible_positions": list(p.eligible_positions),
            }
            for p in roster_players
        ]
        repl = float(profile.get("replacement_level_value") or 0)
        if repl <= 0:
            repl = 0.01
        if rows:
            trade_targets = build_trade_targets_bundle(
                comparison,
                profile,
                roster_dicts,
                rows,
                player_values,
                repl,
            )
        else:
            trade_targets = {
                "needs": [],
                "avoid_hurting": [],
                "trade_assets": [],
                "candidates": [],
                "curated_for_llm": [],
                "summary_for_prompt": {
                    "user_team_weaknesses": [],
                    "user_team_strengths": [],
                    "tradeable_players": [],
                    "candidate_trade_targets": [],
                    "note": "Rankings cache is empty. Run POST /data/refresh-careers then retry.",
                },
            }

    return {
        "profile": profile,
        "league_comparison": comparison,
        "flags": flags,
        "candidate_actions": actions,
        "trade_targets": trade_targets,
    }


def players_from_payload(
    items: list[dict[str, Any]],
) -> list[Player]:
    """Build ``Player`` instances from API-style dicts (same keys as draft router)."""
    out: list[Player] = []
    for raw in items:
        out.append(
            Player(
                player_id=str(raw["player_id"]).strip(),
                name=str(raw["name"]).strip(),
                eligible_positions=tuple(sorted(set(raw.get("eligible_positions") or []))),
                value=float(raw["value"]),
                proj_pts=float(raw.get("proj_pts") or 0),
                proj_reb=float(raw.get("proj_reb") or 0),
                proj_ast=float(raw.get("proj_ast") or 0),
                proj_threes=float(raw.get("proj_threes") or raw.get("proj_fg3m") or 0),
                proj_stl=float(raw.get("proj_stl") or 0),
                proj_blk=float(raw.get("proj_blk") or 0),
                proj_tov=float(raw.get("proj_tov") or 0),
                proj_fgm=float(raw.get("proj_fgm") or 0),
                proj_fga=float(raw.get("proj_fga") or 0),
                proj_ftm=float(raw.get("proj_ftm") or 0),
                proj_fta=float(raw.get("proj_fta") or 0),
            )
        )
    return out
