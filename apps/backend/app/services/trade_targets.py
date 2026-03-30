"""
Curated trade targets from league comparison + NBA rankings (deterministic).

Steps: needs / avoid → trade assets → filter pool → fit scores → top N for LLM.
"""
from __future__ import annotations

import math
from statistics import median
from typing import Any

from app.services.benchmark_engine import CATEGORY_KEYS, LOWER_IS_BETTER
from app.services.team_analysis import primary_position

# Percentile thresholds vs synthetic league (from compare_team_categories_to_benchmarks).
NEED_PERCENTILE_BELOW = 42.0
STRENGTH_PERCENTILE_ABOVE = 62.0

# How many names to surface as trade chips.
MAX_TRADE_ASSETS = 3
MAX_CANDIDATES_RETURN = 15
TOP_FOR_LLM = 12

# Fit weights (tunable).
W_REB = 2.0
W_BLK = 2.2
W_FG_PCT = 180.0
W_FT_PCT = 120.0
W_AST_PENALTY = 0.35
W_3PM = 1.0
W_STL = 1.0
W_TOV_PENALTY = 0.4


def _pct(cat: dict[str, Any]) -> float:
    return float(cat.get("percentile_estimate") or 0)


def derive_needs_and_avoid_hurting(
    league_comparison: dict[str, Any],
) -> tuple[list[str], list[str]]:
    """
    From category percentiles: weak categories → needs; strong → avoid hurting.

    TOV uses inverted percentiles (higher = better = fewer turnovers).
    """
    cats = league_comparison.get("categories") or {}
    needs: list[str] = []
    avoid: list[str] = []
    for k in CATEGORY_KEYS:
        if k not in cats:
            continue
        c = cats[k]
        p = _pct(c)
        inverted = bool(c.get("lower_is_better")) or k in LOWER_IS_BETTER
        if inverted:
            if p < NEED_PERCENTILE_BELOW:
                needs.append(k)
            if p > STRENGTH_PERCENTILE_ABOVE:
                avoid.append(k)
        else:
            if p < NEED_PERCENTILE_BELOW:
                needs.append(k)
            if p > STRENGTH_PERCENTILE_ABOVE:
                avoid.append(k)
    # cap needs to top 3 weakest by gap from 50
    if len(needs) > 3:
        needs = sorted(
            needs,
            key=lambda x: abs(50.0 - _pct(cats[x])),
            reverse=True,
        )[:3]
    if len(avoid) > 4:
        avoid = sorted(
            avoid,
            key=lambda x: _pct(cats[x]),
            reverse=True,
        )[:4]
    return needs, avoid


def _fantasy_positions_for_row(api_pos: str | None) -> set[str]:
    p = (api_pos or "").strip()
    if not p or p == "—":
        return {"PG", "SG", "SF", "PF", "C"}
    if p == "G":
        return {"PG", "SG"}
    if p == "F":
        return {"SF", "PF"}
    if p == "C":
        return {"C"}
    if p in ("G-F", "F-G"):
        return {"PG", "SG", "SF", "PF"}
    if p in ("F-C", "C-F"):
        return {"SF", "PF", "C"}
    if p in ("PG", "SG", "SF", "PF", "C"):
        return {p}
    return {"PG", "SG", "SF", "PF", "C"}


def positions_that_address_needs(needs: list[str]) -> set[str]:
    """Rough map: which standard positions help which category gaps."""
    s: set[str] = set()
    for n in needs:
        if n in ("REB", "BLK"):
            s.update(["PF", "C", "SF"])
        elif n == "FG%":
            s.update(["PF", "C", "SF"])
        elif n in ("AST", "FT%"):
            s.update(["PG", "SG"])
        elif n == "3PM":
            s.update(["PG", "SG", "SF"])
        elif n == "STL":
            s.update(["PG", "SG", "SF"])
        elif n == "PTS":
            s.update(["PG", "SG", "SF", "PF", "C"])
        elif n == "TOV":
            s.update(["PG", "SG", "SF", "PF", "C"])
    return s if s else {"PG", "SG", "SF", "PF", "C"}


def identify_trade_assets(
    profile: dict[str, Any],
    roster: list[dict[str, Any]],
) -> list[str]:
    """
    Names likely trade chips: surplus position + contribute to strength categories.

    ``roster`` items: player_id, name, value, eligible_positions (list).
    """
    depth = profile.get("positional_depth") or {}
    pos_vals = {p: float(depth.get(p, {}).get("value_sum") or 0) for p in depth}
    if not pos_vals:
        return []
    surplus_pos = max(pos_vals, key=lambda x: pos_vals[x])

    scored: list[tuple[float, str]] = []
    for raw in roster:
        name = str(raw.get("name") or "").strip()
        if not name:
            continue
        val = float(raw.get("value") or 0)
        elig = tuple(raw.get("eligible_positions") or [])
        pri = primary_position(elig, None)
        surplus_bonus = 1.4 if pri == surplus_pos else 1.0
        scored.append((val * surplus_bonus, name))

    scored.sort(key=lambda x: -x[0])
    names = [n for _, n in scored]
    out: list[str] = []
    for n in names:
        if n not in out:
            out.append(n)
        if len(out) >= MAX_TRADE_ASSETS:
            break
    return out


def _row_id(row: dict[str, Any]) -> int:
    v = row.get("player_id", row.get("PLAYER_ID"))
    if v is None:
        return 0
    return int(v)


def _pg(row: dict[str, Any]) -> dict[str, float]:
    gp = max(float(row.get("GP") or 0), 1.0)
    pts = float(row.get("PTS") or 0) / gp
    reb = float(row.get("REB") or 0) / gp
    ast = float(row.get("AST") or 0) / gp
    stl = float(row.get("STL") or 0) / gp
    blk = float(row.get("BLK") or 0) / gp
    tov = float(row.get("TOV") or 0) / gp
    fg3 = float(row.get("FG3M") or 0) / gp
    fgm = float(row.get("FGM") or 0)
    fga = float(row.get("FGA") or 0)
    ftm = float(row.get("FTM") or 0)
    fta = float(row.get("FTA") or 0)
    fg_pct = (fgm / fga) if fga > 0 else 0.0
    ft_pct = (ftm / fta) if fta > 0 else 0.0
    return {
        "pts": pts,
        "reb": reb,
        "ast": ast,
        "stl": stl,
        "blk": blk,
        "tov": tov,
        "fg3m": fg3,
        "fg_pct": fg_pct,
        "ft_pct": ft_pct,
    }


def _median_pg_stats(rows: list[dict[str, Any]]) -> dict[str, float]:
    """League medians of per-game rates (active sample)."""
    pgs = [_pg(r) for r in rows if float(r.get("GP") or 0) >= 5]
    if not pgs:
        return {k: 0.0 for k in ("pts", "reb", "ast", "stl", "blk", "tov", "fg3m", "fg_pct", "ft_pct")}
    keys = list(pgs[0].keys())
    return {k: float(median([p[k] for p in pgs])) for k in keys}


def _helps_needs(
    pg: dict[str, float],
    med: dict[str, float],
    needs: list[str],
) -> bool:
    if not needs:
        return True
    ok = 0
    for n in needs:
        if n == "REB" and pg["reb"] >= med["reb"]:
            ok += 1
        elif n == "BLK" and pg["blk"] >= med["blk"]:
            ok += 1
        elif n == "AST" and pg["ast"] >= med["ast"]:
            ok += 1
        elif n == "3PM" and pg["fg3m"] >= med["fg3m"]:
            ok += 1
        elif n == "STL" and pg["stl"] >= med["stl"]:
            ok += 1
        elif n == "PTS" and pg["pts"] >= med["pts"]:
            ok += 1
        elif n == "TOV" and pg["tov"] <= med["tov"]:
            ok += 1
        elif n == "FG%" and pg["fg_pct"] >= med["fg_pct"]:
            ok += 1
        elif n == "FT%" and pg["ft_pct"] >= med["ft_pct"]:
            ok += 1
    return ok >= max(1, min(len(needs), 2))


def _hurts_avoid_too_much(
    pg: dict[str, float],
    med: dict[str, float],
    avoid: list[str],
) -> bool:
    """True = reject candidate (would drag a strength category too far)."""
    for a in avoid:
        if a == "FT%" and pg["ft_pct"] < med["ft_pct"] * 0.88 and med["ft_pct"] > 0.65:
            return True
        if a == "3PM" and med["fg3m"] > 0.3 and pg["fg3m"] < med["fg3m"] * 0.2:
            return True
    return False


def _position_ok(row: dict[str, Any], allowed: set[str]) -> bool:
    pos = str(row.get("position") or row.get("POSITION") or "")
    return bool(_fantasy_positions_for_row(pos) & allowed)


def _delta_for_cat(league_comparison: dict[str, Any], key: str) -> float:
    cats = league_comparison.get("categories") or {}
    c = cats.get(key) or {}
    return float(c.get("delta_vs_median") or 0)


def compute_fit_score(
    pg: dict[str, float],
    med: dict[str, float],
    needs: list[str],
    avoid: list[str],
    league_comparison: dict[str, Any],
) -> float:
    """Heuristic fit: fill deficits, penalize hurting strengths."""
    score = 0.0
    for n in needs:
        d = _delta_for_cat(league_comparison, n)
        deficit = max(0.0, -d) if n not in ("FG%", "FT%") else max(0.0, -d)
        if n == "REB":
            score += W_REB * (pg["reb"] - med["reb"]) * (1.0 + math.log1p(deficit + 1.0))
        elif n == "BLK":
            score += W_BLK * (pg["blk"] - med["blk"]) * (1.0 + math.log1p(deficit + 1.0))
        elif n == "AST":
            score += 1.2 * (pg["ast"] - med["ast"])
        elif n == "3PM":
            score += W_3PM * (pg["fg3m"] - med["fg3m"])
        elif n == "STL":
            score += W_STL * (pg["stl"] - med["stl"])
        elif n == "PTS":
            score += 0.4 * (pg["pts"] - med["pts"])
        elif n == "TOV":
            score += W_TOV_PENALTY * (med["tov"] - pg["tov"])
        elif n == "FG%":
            score += W_FG_PCT * (pg["fg_pct"] - med["fg_pct"])
        elif n == "FT%":
            score += W_FT_PCT * (pg["ft_pct"] - med["ft_pct"])
    for a in avoid:
        if a == "AST":
            score -= W_AST_PENALTY * pg["ast"]
        if a == "FT%":
            score -= 40.0 * max(0.0, med["ft_pct"] - pg["ft_pct"])
    return score


def filter_and_rank_candidates(
    rankings_rows: list[dict[str, Any]],
    player_values: dict[str, float],
    roster_ids: set[str],
    replacement_level_value: float,
    needs: list[str],
    avoid: list[str],
    league_comparison: dict[str, Any],
) -> list[dict[str, Any]]:
    allowed_pos = positions_that_address_needs(needs)
    med = _median_pg_stats(rankings_rows)
    out: list[dict[str, Any]] = []
    for row in rankings_rows:
        pid = _row_id(row)
        if pid <= 0:
            continue
        sid = str(pid)
        if sid in roster_ids:
            continue
        val = float(player_values.get(sid, 0.0))
        if val < replacement_level_value * 1.05:
            continue
        if not _position_ok(row, allowed_pos):
            continue
        pg = _pg(row)
        if not _helps_needs(pg, med, needs):
            continue
        if _hurts_avoid_too_much(pg, med, avoid):
            continue
        fit = compute_fit_score(pg, med, needs, avoid, league_comparison)
        name = str(row.get("full_name") or row.get("PLAYER_NAME") or "")
        team = str(row.get("team_abbreviation") or row.get("TEAM_ABBREVIATION") or "")
        pos = str(row.get("position") or "")
        out.append(
            {
                "player_id": sid,
                "name": name,
                "team": team,
                "position": pos,
                "trade_value": round(val, 3),
                "fit_score": round(fit, 4),
                "per_game": {k: round(pg[k], 4) for k in pg},
            }
        )
    out.sort(key=lambda x: (-x["fit_score"], -x["trade_value"]))
    return out[:MAX_CANDIDATES_RETURN]


def build_trade_targets_bundle(
    league_comparison: dict[str, Any],
    profile: dict[str, Any],
    roster_players: list[dict[str, Any]],
    rankings_rows: list[dict[str, Any]],
    player_values: dict[str, float],
    replacement_level_value: float,
) -> dict[str, Any]:
    """
    Full deterministic bundle for API + LLM.

    ``player_values``: client-side trade values keyed by ``player_id`` string (full pool + roster).
    """
    needs, avoid = derive_needs_and_avoid_hurting(league_comparison)
    trade_assets = identify_trade_assets(profile, roster_players)
    roster_ids = {str(r.get("player_id", "")).strip() for r in roster_players}

    candidates = filter_and_rank_candidates(
        rankings_rows,
        player_values,
        roster_ids,
        replacement_level_value,
        needs,
        avoid,
        league_comparison,
    )

    cats = league_comparison.get("categories") or {}
    weakness_lines: list[str] = []
    strength_lines: list[str] = []
    for k in CATEGORY_KEYS:
        if k not in cats:
            continue
        c = cats[k]
        d = float(c.get("delta_vs_median") or 0)
        p = _pct(c)
        if p < NEED_PERCENTILE_BELOW + 8:
            weakness_lines.append(
                f"{k}: ~{d:+.1f} vs synthetic league median team total (percentile {p:.0f})"
            )
        if p > STRENGTH_PERCENTILE_ABOVE - 8:
            strength_lines.append(
                f"{k}: ~{d:+.1f} vs synthetic league median team total (percentile {p:.0f})"
            )

    curated = candidates[:TOP_FOR_LLM]

    return {
        "needs": needs,
        "avoid_hurting": avoid,
        "trade_assets": trade_assets,
        "candidates": candidates,
        "curated_for_llm": curated,
        "summary_for_prompt": {
            "user_team_weaknesses": weakness_lines[:8],
            "user_team_strengths": strength_lines[:8],
            "tradeable_players": trade_assets,
            "candidate_trade_targets": [
                f"{i + 1}. {c['name']} — {c['position'] or '?'} ({c.get('team', '')}); "
                f"fit_score {c['fit_score']}; REB {c['per_game']['reb']:.1f}/BLK {c['per_game']['blk']:.1f} per game"
                for i, c in enumerate(curated)
            ],
        },
    }

