"""LLM endpoints for trade analysis."""
from fastapi import APIRouter, HTTPException

from app.services.gemini_service import generate

router = APIRouter(prefix="/llm", tags=["llm"])


@router.get("/test")
def test_llm() -> dict[str, str]:
    """Simple test: send 'return hi' to Gemini and return the response."""
    try:
        response = generate("return hi")
        return {"response": response}
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e!s}") from e
