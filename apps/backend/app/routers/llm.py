"""LLM endpoints for trade analysis."""
import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.openai_service import (
    generate as openai_generate,
    generate_stream as openai_generate_stream,
    generate_team_identity_json,
    generate_trade_analysis_json,
    generate_trade_targets_llm_json,
)

router = APIRouter(prefix="/llm", tags=["llm"])


class ChatRequest(BaseModel):
    prompt: str = ""


class TradeAnalyzeRequest(BaseModel):
    trade_context: dict


class TeamIdentityRequest(BaseModel):
    """Output of ``POST /team/analyze`` plus optional extra context."""

    team_analysis: dict


class TradeTargetsLLMRequest(BaseModel):
    """Full JSON from ``POST /team/analyze`` (profile, league_comparison, flags, trade_targets, …)."""

    team_analysis: dict


@router.get("/test")
def test_openai() -> dict[str, str]:
    """Simple test: send 'return hi' to OpenAI (GPT-4o) and return the response."""
    try:
        response = openai_generate("return hi")
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e!s}") from e


@router.post("/openai/chat")
def openai_chat(body: ChatRequest) -> dict[str, str]:
    """Send a prompt to OpenAI and return the response."""
    try:
        response = openai_generate(body.prompt or "return hi")
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e!s}") from e


@router.post("/openai/trade-targets")
def openai_trade_targets(body: TradeTargetsLLMRequest) -> dict:
    """
    Team overview (identity, strengths, weaknesses, insights, move types) plus ranked
    trade targets and trade constructions.

    Pass the full JSON from ``POST /team/analyze`` (including ``trade_targets`` when present).
    """
    try:
        ctx_str = json.dumps(body.team_analysis)
        text = generate_trade_targets_llm_json(ctx_str)
        return json.loads(text)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e!s}") from e
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=502, detail=f"Invalid JSON from model: {e!s}"
        ) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e!s}") from e


@router.post("/openai/team-identity")
def openai_team_identity(body: TeamIdentityRequest) -> dict:
    """
    Turn deterministic ``/team/analyze`` output into a short identity summary,
    strengths/weaknesses, prioritized improvements, and move types.
    """
    try:
        ctx_str = json.dumps(body.team_analysis)
        text = generate_team_identity_json(ctx_str)
        return json.loads(text)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e!s}") from e
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=502, detail=f"Invalid JSON from model: {e!s}"
        ) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e!s}") from e


@router.post("/openai/trade-analyze")
def openai_trade_analyze(body: TradeAnalyzeRequest) -> dict:
    """Run GPT-4o on structured trade context; returns JSON matching LLMTradeResponse."""
    try:
        ctx_str = json.dumps(body.trade_context)
        text = generate_trade_analysis_json(ctx_str)
        return json.loads(text)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e!s}") from e
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=502, detail=f"Invalid JSON from model: {e!s}"
        ) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e!s}") from e


@router.post("/openai/chat/stream")
def openai_chat_stream(body: ChatRequest):
    """Send a prompt to OpenAI and stream the response."""
    try:
        def stream():
            for chunk in openai_generate_stream(body.prompt or "return hi"):
                yield chunk
        return StreamingResponse(stream(), media_type="text/plain")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e!s}") from e
