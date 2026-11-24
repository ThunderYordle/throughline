from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware

from throughline.settings import Settings


def create_app(settings: Settings) -> FastAPI:
    app = FastAPI(title="Throughline")
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.state.settings = settings

    @app.get("/api/health")
    def health() -> dict[str, bool]:
        return {"ok": True}

    return app
