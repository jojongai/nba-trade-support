"""
NBA Trade Support API — FastAPI app entrypoint.
Uses nba_api for teams, players, and player career stats (static data cached to JSON).
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from backend dir and project root (cwd can vary when running uvicorn)
_backend_dir = Path(__file__).resolve().parent
load_dotenv(dotenv_path=_backend_dir / ".env")
load_dotenv(dotenv_path=_backend_dir.parent.parent / ".env")  # project root

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import data, draft, llm, players, team, teams

app = FastAPI(
    title="NBA Trade Support API",
    description="IDSS backend for real and fantasy managers",
    version="0.1.0",
)

def _cors_allow_origins() -> list[str]:
    """Comma-separated URLs (Vercel preview + production + local)."""
    raw = os.environ.get("CORS_ORIGINS", "http://localhost:3000").strip()
    out = [x.strip() for x in raw.split(",") if x.strip()]
    return out if out else ["http://localhost:3000"]


# Regex allows any *.vercel.app preview URL without listing each deployment in CORS_ORIGINS.
_cors_regex = os.environ.get("CORS_ORIGIN_REGEX", r"https://.*\.vercel\.app").strip()

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_allow_origins(),
    allow_origin_regex=_cors_regex or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(teams.router)
app.include_router(players.router)
app.include_router(data.router)
app.include_router(llm.router)
app.include_router(draft.router)
app.include_router(team.router)


@app.get("/health")
def health() -> dict[str, str]:
    """Health check for deployment and load balancers."""
    return {"status": "ok"}


@app.get("/llm/env-check")
def llm_env_check() -> dict[str, bool]:
    """Check if LLM API keys are loaded (does not reveal values)."""
    import os
    openai_key = (
        os.environ.get("OPENAI_API_KEY") or os.environ.get("OPEN_AI_API_KEY") or ""
    ).strip()
    return {
        "GEMINI_API_KEY": bool(os.environ.get("GEMINI_API_KEY", "").strip()),
        "OPENAI_API_KEY": bool(openai_key),
    }


@app.get("/")
def root() -> dict[str, str]:
    """Root endpoint."""
    return {"message": "NBA Trade Support API", "docs": "/docs"}
