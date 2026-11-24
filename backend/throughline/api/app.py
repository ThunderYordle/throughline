from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware

from throughline.api import routes_games
from throughline.settings import Settings
from throughline.store.analytics import AnalyticsStore


def create_app(settings: Settings, analytics: AnalyticsStore | None = None) -> FastAPI:
    app = FastAPI(title="Throughline")
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.state.settings = settings
    if analytics is None:
        analytics = AnalyticsStore(settings.analytics_db)
        analytics.init_schema()
    app.state.analytics = analytics

    @app.get("/api/health")
    def health() -> dict[str, bool]:
        return {"ok": True}

    app.include_router(routes_games.router)
    return app
