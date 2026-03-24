"""LLM endpoints for trade analysis."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.openai_service import generate as openai_generate, generate_stream as openai_generate_stream

router = APIRouter(prefix="/llm", tags=["llm"])


class ChatRequest(BaseModel):
    prompt: str = ""


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
