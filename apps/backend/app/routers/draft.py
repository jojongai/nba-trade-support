"""Draft simulation API (deterministic, no LLM)."""
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.services.benchmark_engine import benchmarks_for_api_response, build_league_benchmarks
from app.services.draft_simulation import (
    DraftInfeasibleError,
    DraftSimulationError,
    Player,
    simulate_draft,
    teams_to_jsonable,
)

router = APIRouter(prefix="/draft", tags=["draft"])


class PlayerIn(BaseModel):
    name: str
    player_id: str | None = Field(
        None,
        description="Stable unique id (e.g. NBA player_id). Defaults to name if omitted.",
    )
    eligible_positions: list[str]
    value: float = Field(..., description="Higher = better player")
    # Projected season totals (optional); used for category benchmarks downstream.
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


class DraftSimulateRequest(BaseModel):
    num_teams: int = Field(..., ge=1, le=36)
    roster_size: int = Field(12, ge=1, le=36)
    requirements: dict[str, int] = Field(
        ...,
        description="Minimum count per position per team, e.g. PG/SG/SF/PF/C each 1",
    )
    players: list[PlayerIn]

    @field_validator("requirements")
    @classmethod
    def req_non_empty(cls, v: dict[str, int]) -> dict[str, int]:
        if not v:
            raise ValueError("requirements must be non-empty")
        return v


@router.post("/simulate")
def draft_simulate(body: DraftSimulateRequest) -> dict[str, Any]:
    """
    Run a deterministic draft: satisfy positional minimums first, then fill
    remaining spots in snake order with best available players. Also returns
    league benchmarks (overall value + category distributions) derived from the
    simulated teams.
    """
    players = [
        Player(
            player_id=((p.player_id or "").strip() or p.name.strip()),
            name=p.name.strip(),
            eligible_positions=tuple(sorted(set(p.eligible_positions))),
            value=p.value,
            proj_pts=p.proj_pts,
            proj_reb=p.proj_reb,
            proj_ast=p.proj_ast,
            proj_threes=p.proj_threes,
            proj_stl=p.proj_stl,
            proj_blk=p.proj_blk,
            proj_tov=p.proj_tov,
            proj_fgm=p.proj_fgm,
            proj_fga=p.proj_fga,
            proj_ftm=p.proj_ftm,
            proj_fta=p.proj_fta,
        )
        for p in body.players
    ]
    try:
        teams = simulate_draft(
            players,
            num_teams=body.num_teams,
            roster_size=body.roster_size,
            requirements=body.requirements,
        )
    except DraftInfeasibleError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    except DraftSimulationError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    bench = build_league_benchmarks(teams)
    return {
        "teams": teams_to_jsonable(teams),
        "benchmarks": benchmarks_for_api_response(bench),
    }
