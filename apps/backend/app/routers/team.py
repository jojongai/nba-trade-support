"""User roster analysis vs synthetic league benchmarks (deterministic + optional LLM)."""
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.team_analysis import players_from_payload, run_team_analysis

router = APIRouter(prefix="/team", tags=["team"])


class RosterSlotIn(BaseModel):
    slot_label: str = Field(..., description="PG, SG, …, BENCH, IL, etc.")
    player_id: str | None = None


class TeamAnalyzeRequest(BaseModel):
    """Benchmarks from ``POST /draft/simulate`` (must include category sorted_values)."""

    benchmarks: dict[str, Any]
    roster_players: list[dict[str, Any]]
    roster_slots: list[RosterSlotIn]
    draft_pool_values: list[float] = Field(
        ...,
        description="All player trade values from the draft pool (same order as simulate input).",
    )
    total_league_slots: int = Field(
        ...,
        ge=1,
        description="num_teams × roster_size for replacement-level cutoff.",
    )
    player_values: dict[str, float] | None = Field(
        default=None,
        description="Trade value by player_id (strings); pool + roster. When set, response includes deterministic trade_targets.",
    )


@router.post("/analyze")
def team_analyze(body: TeamAnalyzeRequest) -> dict[str, Any]:
    """
    Steps 1–4: profile, compare vs synthetic league, flags, candidate actions.

    Pass the same ``benchmarks`` object returned by ``POST /draft/simulate`` and
    the draft pool values used for that run. Optional ``player_values`` adds
    deterministic trade target candidates (same shape as ``trade_targets`` in the JSON).
    """
    try:
        roster = players_from_payload(body.roster_players)
        slots = [(s.slot_label, s.player_id) for s in body.roster_slots]
        return run_team_analysis(
            roster,
            slots,
            body.benchmarks,
            body.draft_pool_values,
            body.total_league_slots,
            body.player_values,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
