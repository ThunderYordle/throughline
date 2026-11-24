from __future__ import annotations

from collections import OrderedDict
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from throughline.api.replay import replay_payload
from throughline.store.analytics import AnalyticsStore

router = APIRouter(prefix="/api")
REPLAY_CACHE_SIZE = 32
_replays: OrderedDict[str, dict[str, Any]] = OrderedDict()


def analytics(request: Request) -> AnalyticsStore:
    store: AnalyticsStore = request.app.state.analytics
    return store.reader()


@router.get("/champions")
def champions(request: Request) -> list[dict[str, Any]]:
    return [{"name": name, "games": n} for name, n in analytics(request).champion_counts()]


@router.get("/games")
def games(request: Request, q: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
    return [
        {
            "game_id": s.game_id,
            "tournament": s.tournament,
            "started_at": s.started_at.isoformat(),
            "patch": s.patch,
            "teams": s.teams,
            "winner": s.winner,
            "champions": s.champions,
        }
        for s in analytics(request).list_games(q=q, limit=min(limit, 200))
    ]


@router.get("/games/{game_id}/replay")
def replay(request: Request, game_id: str) -> dict[str, Any]:
    if game_id in _replays:
        _replays.move_to_end(game_id)
        return _replays[game_id]
    try:
        game = analytics(request).load_game(game_id)
    except KeyError as error:
        raise HTTPException(status_code=404, detail="game not found") from error
    payload = replay_payload(game)
    _replays[game_id] = payload
    if len(_replays) > REPLAY_CACHE_SIZE:
        _replays.popitem(last=False)
    return payload
