"""
League benchmarks from simulated fantasy teams (stdlib only).

Layer 1 — overall ``value`` sum: quick rank / percentile / quartiles.
Layer 2 — team projected stat totals (and volume-weighted FG%/FT%): category diagnosis.

Builds on ``Team`` / ``Player`` from ``draft_simulation``.
"""
from __future__ import annotations

from statistics import mean, median, quantiles
from typing import Any, TypedDict

from app.services.draft_simulation import Team

# Fantasy category labels for team-level profiles (totals, not per-game roster averages).
CATEGORY_KEYS: tuple[str, ...] = (
    "PTS",
    "REB",
    "AST",
    "3PM",
    "STL",
    "BLK",
    "TOV",
    "FG%",
    "FT%",
)

# For these, lower team totals are better (e.g. turnovers).
LOWER_IS_BETTER: frozenset[str] = frozenset({"TOV"})


def score_team(team: Team) -> float:
    """
    Total team strength as the sum of roster ``Player.value``.

    Kept separate from category totals for a simple one-number rank.
    """
    return sum(p.value for p in team.roster)


def calculate_team_stat_profile(team: Team) -> dict[str, float]:
    """
    Team-level projected season totals: sum counting stats across the roster.

    FG% and FT% use volume-weighted makes / attempts:

    - ``FG%`` = sum(proj_fgm) / sum(proj_fga)
    - ``FT%`` = sum(proj_ftm) / sum(proj_fta)

    If attempts are zero, the percentage is ``0.0``.
    """
    pts = reb = ast = threes = stl = blk = tov = 0.0
    fgm = fga = ftm = fta = 0.0
    for p in team.roster:
        pts += p.proj_pts
        reb += p.proj_reb
        ast += p.proj_ast
        threes += p.proj_threes
        stl += p.proj_stl
        blk += p.proj_blk
        tov += p.proj_tov
        fgm += p.proj_fgm
        fga += p.proj_fga
        ftm += p.proj_ftm
        fta += p.proj_fta

    fg_pct = fgm / fga if fga > 0 else 0.0
    ft_pct = ftm / fta if fta > 0 else 0.0

    return {
        "PTS": pts,
        "REB": reb,
        "AST": ast,
        "3PM": threes,
        "STL": stl,
        "BLK": blk,
        "TOV": tov,
        "FG%": fg_pct,
        "FT%": ft_pct,
    }


def _average(values: list[float]) -> float:
    return float(mean(values))


def _median_sorted(sorted_values: list[float]) -> float:
    if not sorted_values:
        raise ValueError("median requires a non-empty list.")
    return float(median(sorted_values))


def _quartiles_q1_q3(sorted_scores: list[float]) -> tuple[float, float]:
    if not sorted_scores:
        raise ValueError("quartiles require a non-empty list.")
    if len(sorted_scores) == 1:
        v = sorted_scores[0]
        return v, v
    qs = quantiles(sorted_scores, n=4)
    return float(qs[0]), float(qs[2])


def _stat_distribution(values: list[float]) -> dict[str, Any]:
    """Summary + sorted values for percentile comparisons."""
    s = sorted(values)
    q1, q3 = _quartiles_q1_q3(s)
    return {
        "average": _average(s),
        "median": _median_sorted(s),
        "q1": q1,
        "q3": q3,
        "min": s[0],
        "max": s[-1],
        "sorted_values": s,
    }


class TeamScoreDict(TypedDict):
    team_id: int
    score: float


class OverallBenchmarks(TypedDict):
    """Value-sum league distribution."""

    team_scores: list[TeamScoreDict]
    sorted_scores: list[float]
    average_score: float
    median_score: float
    min_score: float
    max_score: float
    top_quartile_score: float
    bottom_quartile_score: float


class StatBenchmarkDict(TypedDict):
    """Per-category distribution across teams (team totals or team FG%/FT%)."""

    average: float
    median: float
    q1: float
    q3: float
    min: float
    max: float
    sorted_values: list[float]


class FullLeagueBenchmarks(TypedDict):
    """Combined output: overall value rank + category distributions."""

    overall: OverallBenchmarks
    categories: dict[str, StatBenchmarkDict]


def _build_overall_benchmarks(teams: list[Team]) -> OverallBenchmarks:
    team_scores: list[TeamScoreDict] = []
    for t in teams:
        s = score_team(t)
        team_scores.append({"team_id": t.id, "score": float(s)})

    sorted_scores = sorted(ts["score"] for ts in team_scores)
    q1, q3 = _quartiles_q1_q3(sorted_scores)

    return {
        "team_scores": team_scores,
        "sorted_scores": sorted_scores,
        "average_score": _average(sorted_scores),
        "median_score": _median_sorted(sorted_scores),
        "min_score": sorted_scores[0],
        "max_score": sorted_scores[-1],
        "top_quartile_score": q3,
        "bottom_quartile_score": q1,
    }


def build_category_benchmarks(teams: list[Team]) -> dict[str, StatBenchmarkDict]:
    """
    For each fantasy category, compute league distribution of **team-level** totals
    (or volume-weighted percentages) across ``teams``.

    Raises:
        ValueError: if ``teams`` is empty.
    """
    if not teams:
        raise ValueError("Need at least one team for category benchmarks.")

    profiles = [calculate_team_stat_profile(t) for t in teams]
    out: dict[str, StatBenchmarkDict] = {}
    for key in CATEGORY_KEYS:
        vals = [float(pr[key]) for pr in profiles]
        dist = _stat_distribution(vals)
        out[key] = {
            "average": dist["average"],
            "median": dist["median"],
            "q1": dist["q1"],
            "q3": dist["q3"],
            "min": dist["min"],
            "max": dist["max"],
            "sorted_values": dist["sorted_values"],
        }
    return out


def build_league_benchmarks(teams: list[Team]) -> FullLeagueBenchmarks:
    """
    Overall value benchmarks plus per-category team-stat benchmarks.

    Raises:
        ValueError: if ``teams`` is empty.
    """
    if not teams:
        raise ValueError("Need at least one team to build benchmarks.")

    return {
        "overall": _build_overall_benchmarks(teams),
        "categories": build_category_benchmarks(teams),
    }


class TeamComparisonDict(TypedDict):
    """Output from :func:`compare_team_to_benchmarks`."""

    team_score: float
    delta_vs_average: float
    delta_vs_median: float
    is_above_average: bool
    is_above_median: bool
    percentile_estimate: float
    rank_bucket: str


class CategoryStatComparisonDict(TypedDict):
    """Single-category comparison for one team."""

    value: float
    delta_vs_average: float
    delta_vs_median: float
    is_above_average: bool
    is_above_median: bool
    percentile_estimate: float
    rank_bucket: str
    lower_is_better: bool


def _get_overall(benchmarks: dict[str, Any]) -> dict[str, Any]:
    """Support both nested ``{"overall": ...}`` and legacy flat overall dicts."""
    if "overall" in benchmarks and isinstance(benchmarks["overall"], dict):
        return benchmarks["overall"]
    return benchmarks


def _percentile_estimate(sorted_scores: list[float], value: float) -> float:
    n = len(sorted_scores)
    if n == 0:
        return 50.0
    below = sum(1 for s in sorted_scores if s < value)
    equal = sum(1 for s in sorted_scores if s == value)
    return (below + 0.5 * equal) / n * 100.0


def _rank_bucket(
    score: float,
    bottom_q: float,
    median_s: float,
    top_q: float,
) -> str:
    if score < bottom_q:
        return "bottom_quartile"
    if score < median_s:
        return "second_quartile"
    if score < top_q:
        return "third_quartile"
    return "top_quartile"


def _rank_bucket_lower_is_better(
    score: float,
    q1: float,
    med: float,
    q3: float,
) -> str:
    """
    For stats like TOV: lower totals are better.

    Maps low turnover totals to ``top_quartile`` performance label.
    """
    if score <= q1:
        return "top_quartile"
    if score <= med:
        return "third_quartile"
    if score <= q3:
        return "second_quartile"
    return "bottom_quartile"


def compare_team_to_benchmarks(
    team: Team,
    benchmarks: dict[str, Any],
) -> TeamComparisonDict:
    """
    Compare one team's total **value** score to the overall section of
    :func:`build_league_benchmarks` (pass the full result or only ``overall``).
    """
    overall = _get_overall(benchmarks)
    team_score = float(score_team(team))
    avg = float(overall["average_score"])
    med = float(overall["median_score"])
    sorted_scores: list[float] = list(overall["sorted_scores"])
    q1 = float(overall["bottom_quartile_score"])
    q3 = float(overall["top_quartile_score"])

    pct = _percentile_estimate(sorted_scores, team_score)
    bucket = _rank_bucket(team_score, q1, med, q3)

    return {
        "team_score": team_score,
        "delta_vs_average": team_score - avg,
        "delta_vs_median": team_score - med,
        "is_above_average": team_score > avg,
        "is_above_median": team_score > med,
        "percentile_estimate": pct,
        "rank_bucket": bucket,
    }


def compare_team_categories_to_benchmarks(
    team: Team,
    category_benchmarks: dict[str, StatBenchmarkDict],
) -> dict[str, CategoryStatComparisonDict]:
    """
    Stat-by-stat comparison vs :func:`build_category_benchmarks` output
    (the ``categories`` key from :func:`build_league_benchmarks`).
    """
    profile = calculate_team_stat_profile(team)
    out: dict[str, CategoryStatComparisonDict] = {}

    for key in CATEGORY_KEYS:
        bench = category_benchmarks[key]
        val = float(profile[key])
        avg = bench["average"]
        med = bench["median"]
        q1 = bench["q1"]
        q3 = bench["q3"]
        sorted_vals = bench["sorted_values"]
        lower = key in LOWER_IS_BETTER

        raw_pct = _percentile_estimate(sorted_vals, val)
        pct = 100.0 - raw_pct if lower else raw_pct

        if lower:
            bucket = _rank_bucket_lower_is_better(val, q1, med, q3)
            above_avg = val < avg
            above_med = val < med
        else:
            bucket = _rank_bucket(val, q1, med, q3)
            above_avg = val > avg
            above_med = val > med

        out[key] = {
            "value": val,
            "delta_vs_average": val - avg,
            "delta_vs_median": val - med,
            "is_above_average": above_avg,
            "is_above_median": above_med,
            "percentile_estimate": pct,
            "rank_bucket": bucket,
            "lower_is_better": lower,
        }

    return out


if __name__ == "__main__":
    from app.services.draft_simulation import Player, simulate_draft

    req = {"PG": 1, "SG": 1, "SF": 1, "PF": 1, "C": 1}
    pool: list[Player] = []
    for i in range(100):
        pos = ["PG", "SG", "SF", "PF", "C"][i % 5]
        # Toy projected stats so category benchmarks are non-zero
        base = 1500 - i * 5
        pool.append(
            Player(
                player_id=str(10_000 + i),
                name=f"Player{i}",
                eligible_positions=(pos,),
                value=float(1000 - i),
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
        )

    teams = simulate_draft(
        pool,
        num_teams=8,
        roster_size=12,
        requirements=req,
    )
    full = build_league_benchmarks(teams)
    cmp_o = compare_team_to_benchmarks(teams[0], full)
    cmp_c = compare_team_categories_to_benchmarks(teams[0], full["categories"])

    print("--- overall ---")
    print("average_score:", round(full["overall"]["average_score"], 2))
    print("median_score:", round(full["overall"]["median_score"], 2))
    print("compare overall rank_bucket:", cmp_o["rank_bucket"])
    print()
    print("--- categories (PTS sample) ---")
    pts_b = full["categories"]["PTS"]
    print("PTS league avg:", round(pts_b["average"], 1))
    print("PTS team[0]:", round(cmp_c["PTS"]["value"], 1), "pct:", round(cmp_c["PTS"]["percentile_estimate"], 1))
    print("TOV lower_is_better:", cmp_c["TOV"]["lower_is_better"], "bucket:", cmp_c["TOV"]["rank_bucket"])
