"""
Deterministic fantasy draft simulation (stdlib only).
Fills minimum positional requirements first, then best-available bench spots.
"""
from __future__ import annotations

from collections import defaultdict, deque
from copy import deepcopy
from dataclasses import dataclass, field
from typing import Any


class DraftSimulationError(Exception):
    """Base error for draft simulation."""


class DraftInfeasibleError(DraftSimulationError):
    """Raised when no valid assignment exists for the given pool and rules."""


@dataclass(frozen=True)
class Player:
    """A draftable player."""

    player_id: str
    name: str
    eligible_positions: tuple[str, ...]
    value: float
    # Projected season totals / volume (optional; default 0). Used for category benchmarks.
    proj_pts: float = 0.0
    proj_reb: float = 0.0
    proj_ast: float = 0.0
    proj_threes: float = 0.0
    proj_stl: float = 0.0
    proj_blk: float = 0.0
    proj_tov: float = 0.0
    proj_fgm: float = 0.0
    proj_fga: float = 0.0
    proj_ftm: float = 0.0
    proj_fta: float = 0.0

    def __post_init__(self) -> None:
        if not self.player_id.strip():
            raise ValueError("player_id must be non-empty.")
        if not self.name.strip():
            raise ValueError("Player name must be non-empty.")
        if not self.eligible_positions:
            raise ValueError(f"Player {self.name!r} must have at least one eligible position.")


@dataclass
class Team:
    """One fantasy team with roster and positional counts toward minimums."""

    id: int
    roster: list[Player] = field(default_factory=list)
    position_counts: dict[str, int] = field(default_factory=dict)

    def roster_count(self) -> int:
        return len(self.roster)

    def deficit(self, position: str, requirements: dict[str, int]) -> int:
        need = requirements.get(position, 0)
        have = self.position_counts.get(position, 0)
        return max(0, need - have)


def assign_player_to_team(team: Team, player: Player, position: str | None) -> None:
    """
    Add a player to the team. If ``position`` is set, it counts toward that
    minimum slot; use ``None`` for pure bench / flex fill after minimums are met.
    """
    team.roster.append(player)
    if position is not None:
        team.position_counts[position] = team.position_counts.get(position, 0) + 1


def can_player_help_team(
    team: Team,
    player: Player,
    requirements: dict[str, int],
) -> bool:
    """True if the player can cover at least one position the team still needs."""
    for pos in requirements:
        if team.deficit(pos, requirements) > 0 and pos in player.eligible_positions:
            return True
    return False


def _total_deficits(teams: list[Team], requirements: dict[str, int]) -> int:
    return sum(t.deficit(pos, requirements) for t in teams for pos in requirements)


def _max_flow(
    n: int,
    adj: list[list[tuple[int, int]]],
    cap: list[list[int]],
    s: int,
    t: int,
) -> int:
    """Edmonds–Karp; adj[u] = list of (v, reverse_index). cap[u][edge_index] is residual."""
    flow = 0
    while True:
        parent = [-1] * n
        parent_edge = [-1] * n
        parent[s] = s
        q: deque[int] = deque([s])
        reached_t = False
        while q and not reached_t:
            u = q.popleft()
            for ei, (v, _) in enumerate(adj[u]):
                if cap[u][ei] <= 0:
                    continue
                if parent[v] != -1:
                    continue
                parent[v] = u
                parent_edge[v] = ei
                if v == t:
                    reached_t = True
                    break
                q.append(v)
        if parent[t] == -1:
            break
        add = 10**9
        v = t
        while v != s:
            u = parent[v]
            ei = parent_edge[v]
            add = min(add, cap[u][ei])
            v = u
        v = t
        while v != s:
            u = parent[v]
            ei = parent_edge[v]
            cap[u][ei] -= add
            _, rev = adj[u][ei]
            cap[v][rev] += add
            v = u
        flow += add
    return flow


def _can_satisfy_all_minimums_with_pool(
    teams: list[Team],
    pool: list[Player],
    requirements: dict[str, int],
    roster_size: int,
) -> bool:
    """
    Return True iff remaining players can fill all teams' positional deficits
    without exceeding roster limits, using max flow.
    """
    if _total_deficits(teams, requirements) == 0:
        return True
    if len(pool) < _total_deficits(teams, requirements):
        return False

    for team in teams:
        slots = roster_size - team.roster_count()
        dsum = sum(team.deficit(pos, requirements) for pos in requirements)
        if dsum > slots:
            return False

    # Build flow network: source -> each player (cap 1) -> demand nodes (team, pos) -> sink
    demand_nodes: list[tuple[int, str]] = []
    for ti, team in enumerate(teams):
        for pos in sorted(requirements.keys()):
            d = team.deficit(pos, requirements)
            for _ in range(d):
                demand_nodes.append((ti, pos))

    if not demand_nodes:
        return True

    pcount = len(pool)
    dcount = len(demand_nodes)
    # nodes: 0 source, 1 sink, 2..2+p-1 players, 2+p.. demands
    S = 0
    T = 1
    off_p = 2
    off_d = 2 + pcount
    n = off_d + dcount
    adj: list[list[tuple[int, int]]] = [[] for _ in range(n)]
    cap: list[list[int]] = [[] for _ in range(n)]

    def add_edge(u: int, v: int, c: int) -> None:
        idx_uv = len(adj[u])
        idx_vu = len(adj[v])
        adj[u].append((v, idx_vu))
        cap[u].append(c)
        adj[v].append((u, idx_uv))
        cap[v].append(0)

    for i in range(pcount):
        add_edge(S, off_p + i, 1)

    for j, (ti, pos) in enumerate(demand_nodes):
        add_edge(off_d + j, T, 1)

    for i, pl in enumerate(pool):
        for j, (ti, pos) in enumerate(demand_nodes):
            if pos in pl.eligible_positions:
                add_edge(off_p + i, off_d + j, 1)

    need = dcount
    got = _max_flow(n, adj, cap, S, T)
    return got == need


def would_assignment_break_feasibility(
    team_idx: int,
    player: Player,
    position: str,
    teams: list[Team],
    available_players: list[Player],
    requirements: dict[str, int],
    roster_size: int,
) -> bool:
    """
    Return True if assigning ``player`` to ``teams[team_idx]`` counting as ``position``
    makes it impossible to satisfy all remaining minimums with the remaining pool.
    """
    if position not in player.eligible_positions:
        return True
    team = teams[team_idx]
    if team.deficit(position, requirements) <= 0:
        return True
    if team.roster_count() >= roster_size:
        return True

    teams_copy = deepcopy(teams)
    pool = [p for p in available_players if p.player_id != player.player_id]

    assign_player_to_team(teams_copy[team_idx], player, position)
    return not _can_satisfy_all_minimums_with_pool(
        teams_copy, pool, requirements, roster_size
    )


def _all_minimums_met(teams: list[Team], requirements: dict[str, int]) -> bool:
    return all(t.deficit(pos, requirements) == 0 for t in teams for pos in requirements)


def _pick_best_minimum_assignment(
    teams: list[Team],
    pool: list[Player],
    requirements: dict[str, int],
    roster_size: int,
) -> tuple[Player, int, str] | None:
    """
    Next assignment for the minimum-filling phase: highest-value player in the pool
    that can still be placed without breaking feasibility (deterministic tie-breaks).
    """
    for player in sorted(pool, key=lambda p: (-p.value, p.player_id, p.name)):
        for ti, team in enumerate(teams):
            for pos in sorted(requirements.keys()):
                if team.deficit(pos, requirements) <= 0:
                    continue
                if pos not in player.eligible_positions:
                    continue
                if would_assignment_break_feasibility(
                    ti, player, pos, teams, pool, requirements, roster_size
                ):
                    continue
                return (player, ti, pos)
    return None


def _phase_two_snake(
    teams: list[Team],
    pool: list[Player],
    roster_size: int,
) -> None:
    """
    Fill remaining slots with best available players in snake draft order
    (0..n-1, then n-1..0, repeating).
    """
    pool_sorted = sorted(pool, key=lambda p: (-p.value, p.player_id, p.name))
    idx = 0
    n = len(teams)
    round_num = 0
    while idx < len(pool_sorted):
        order = range(n) if round_num % 2 == 0 else range(n - 1, -1, -1)
        progressed = False
        for ti in order:
            if idx >= len(pool_sorted):
                break
            team = teams[ti]
            if team.roster_count() >= roster_size:
                continue
            assign_player_to_team(team, pool_sorted[idx], None)
            idx += 1
            progressed = True
        if not progressed:
            break
        round_num += 1


def validate_teams(
    teams: list[Team],
    requirements: dict[str, int],
    roster_size: int,
) -> None:
    """Validate roster sizes, uniqueness, and minimum positional requirements."""
    seen: set[str] = set()
    for team in teams:
        if team.roster_count() != roster_size:
            raise DraftSimulationError(
                f"Team {team.id} has {team.roster_count()} players; expected {roster_size}."
            )
        for pl in team.roster:
            if pl.player_id in seen:
                raise DraftSimulationError(
                    f"Duplicate player across teams: player_id={pl.player_id!r} ({pl.name!r})."
                )
            seen.add(pl.player_id)
        for pos, need in requirements.items():
            have = team.position_counts.get(pos, 0)
            if have < need:
                raise DraftSimulationError(
                    f"Team {team.id} has {have} {pos}; minimum {need}."
                )


def simulate_draft(
    players: list[Player],
    num_teams: int,
    roster_size: int,
    requirements: dict[str, int],
) -> list[Team]:
    """
    Run a deterministic draft: minimums first (value-greedy with feasibility),
    then snake-order best-available for remaining slots.

    The pool may be larger than ``num_teams * roster_size``; only the best
    assignments under the algorithm are used, and unused players remain in the
    conceptual pool (never drafted).

    Raises:
        DraftInfeasibleError: if constraints cannot be satisfied.
        ValueError: invalid inputs.
    """
    if num_teams < 1:
        raise ValueError("num_teams must be at least 1.")
    if roster_size < 1:
        raise ValueError("roster_size must be at least 1.")
    if not requirements:
        raise ValueError("requirements must be non-empty.")
    if sum(requirements.values()) > roster_size:
        raise ValueError("Sum of minimum requirements cannot exceed roster_size per team.")

    total_slots = num_teams * roster_size
    if len(players) < total_slots:
        raise ValueError(
            f"Player pool must have at least {total_slots} players "
            f"({num_teams} teams × {roster_size} roster); got {len(players)}."
        )

    ids = [p.player_id for p in players]
    if len(set(ids)) != len(ids):
        raise ValueError("player_id values must be unique in the pool.")

    sorted_players = sorted(players, key=lambda p: (-p.value, p.player_id, p.name))
    pool: list[Player] = list(sorted_players)
    teams = [Team(id=i) for i in range(num_teams)]

    # Phase 1 — minimums
    safety = total_slots * len(requirements) * num_teams + 10
    steps = 0
    while not _all_minimums_met(teams, requirements) and pool:
        steps += 1
        if steps > safety:
            raise DraftInfeasibleError("Internal stop: could not finish minimum phase.")
        choice = _pick_best_minimum_assignment(teams, pool, requirements, roster_size)
        if choice is None:
            raise DraftInfeasibleError(
                "Cannot assign players to satisfy all positional minimums from this pool."
            )
        player, ti, pos = choice
        assign_player_to_team(teams[ti], player, pos)
        pool = [p for p in pool if p.player_id != player.player_id]

    # Phase 2 — fill benches (snake order)
    _phase_two_snake(teams, pool, roster_size)

    validate_teams(teams, requirements, roster_size)
    return teams


def teams_to_jsonable(teams: list[Team]) -> list[dict[str, Any]]:
    """Serialize teams for JSON responses."""
    out: list[dict[str, Any]] = []
    for t in teams:
        out.append(
            {
                "id": t.id,
                "roster": [
                    {
                        "player_id": p.player_id,
                        "name": p.name,
                        "eligible_positions": list(p.eligible_positions),
                        "value": p.value,
                        "proj_pts": p.proj_pts,
                        "proj_reb": p.proj_reb,
                        "proj_ast": p.proj_ast,
                        "proj_threes": p.proj_threes,
                        "proj_stl": p.proj_stl,
                        "proj_blk": p.proj_blk,
                        "proj_tov": p.proj_tov,
                        "proj_fgm": p.proj_fgm,
                        "proj_fga": p.proj_fga,
                        "proj_ftm": p.proj_ftm,
                        "proj_fta": p.proj_fta,
                    }
                    for p in t.roster
                ],
                "position_counts": dict(t.position_counts),
            }
        )
    return out
