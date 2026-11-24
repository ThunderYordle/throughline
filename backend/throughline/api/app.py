from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from throughline.api import routes_games, routes_plans, routes_reviews
from throughline.api.routes_plans import KnowledgeFactory
from throughline.knowledge.base import KnowledgeBase
from throughline.settings import Settings
from throughline.store.analytics import AnalyticsStore
from throughline.store.app import AppStore


def create_app(
    settings: Settings,
    analytics: AnalyticsStore | None = None,
    app_store: AppStore | None = None,
    knowledge: KnowledgeFactory | None = None,
) -> FastAPI:
    app = FastAPI(title="Throughline")
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.state.settings = settings
    if analytics is None:
        analytics = AnalyticsStore(settings.analytics_db)
        analytics.init_schema()
    app.state.analytics = analytics
    app.state.app_store = app_store or AppStore(settings.app_db)
    app.state.knowledge = knowledge or KnowledgeBase

    @app.get("/api/health")
    def health() -> dict[str, bool]:
        return {"ok": True}

    app.include_router(routes_games.router)
    app.include_router(routes_plans.router)
    app.include_router(routes_reviews.router)
    if settings.frontend_dist is not None:
        dist = settings.frontend_dist.resolve()
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

        @app.get("/{path:path}", include_in_schema=False)
        def spa(path: str) -> FileResponse:
            if path.startswith("api/"):
                raise HTTPException(status_code=404)
            candidate = dist / path
            if path and candidate.is_file() and dist in candidate.resolve().parents:
                return FileResponse(candidate)
            return FileResponse(dist / "index.html")

    return app
