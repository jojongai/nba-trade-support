"""
Vercel serverless entry: re-export the FastAPI ASGI app (see Vercel FastAPI docs).
Local dev continues to use: uvicorn main:app --reload
"""
from main import app

__all__ = ["app"]
