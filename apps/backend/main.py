"""
NBA Trade Support API — FastAPI app entrypoint.
Uses nba_api for teams, players, and player career stats (static data cached to JSON).
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import data, players, teams

app = FastAPI(
    title="NBA Trade Support API",
    description="IDSS backend for real and fantasy managers",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(teams.router)
app.include_router(players.router)
app.include_router(data.router)


@app.get("/health")
def health() -> dict[str, str]:
    """Health check for deployment and load balancers."""
    return {"status": "ok"}


@app.get("/")
def root() -> dict[str, str]:
    """Root endpoint."""
    return {"message": "NBA Trade Support API", "docs": "/docs"}
