"""Render entrypoint: the existing FastAPI app plus the built React frontend on the same origin.

Serving both from one service keeps the httpOnly SameSite=Lax login cookie first-party,
so no CORS or cross-site cookie changes are needed.
Run with:  uvicorn render_app:app --host 0.0.0.0 --port $PORT
"""
import os
from pathlib import Path

from fastapi import HTTPException
from fastapi.responses import FileResponse

from server import app  # noqa: E402  (registers /health, /api/* and all startup tasks)

BUILD_DIR = Path(os.environ.get("FRONTEND_BUILD_DIR", Path(__file__).resolve().parent.parent / "frontend_build")).resolve()
INDEX = BUILD_DIR / "index.html"

if INDEX.is_file():

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        candidate = (BUILD_DIR / full_path).resolve()
        if full_path and BUILD_DIR in candidate.parents and candidate.is_file():
            headers = {"Cache-Control": "public, max-age=31536000, immutable"} if full_path.startswith("static/") else None
            return FileResponse(candidate, headers=headers)
        return FileResponse(INDEX, headers={"Cache-Control": "no-cache"})
