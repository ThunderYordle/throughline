from __future__ import annotations

from datetime import datetime
from typing import Any, Protocol

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

from throughline.api.routes_games import analytics
from throughline.game.model import Side
from throughline.knowledge.base import KnowledgeSource
from throughline.plan.generator import build_plan
from throughline.plan.models import Draft, Plan, PlanItem, item_time
from throughline.store.analytics import AnalyticsStore, GameSummary
from throughline.store.app import AppStore

router = APIRouter(prefix="/api")


class KnowledgeFactory(Protocol):
    def __call__(self, store: AnalyticsStore, patch: str, before: datetime | None) -> KnowledgeSource: ...


class CreatePlan(BaseModel):
    draft: Draft


class PlanFromGame(BaseModel):
    game_id: str
    us: Side


class UpdatePlan(BaseModel):
    items: list[PlanItem]


def app_store(request: Request) -> AppStore:
    store: AppStore = request.app.state.app_store
    return store


def knowledge(
    request: Request, store: AnalyticsStore, patch: str, before: datetime | None
) -> KnowledgeSource:
    factory: KnowledgeFactory = request.app.state.knowledge
    return factory(store, patch, before)


def _summary_json(summary: GameSummary) -> dict[str, Any]:
    return {
        "game_id": summary.game_id,
        "tournament": summary.tournament,
        "started_at": summary.started_at.isoformat(),
        "patch": summary.patch,
        "teams": summary.teams,
        "winner": summary.winner,
        "champions": summary.champions,
    }


def _created(plan_id: str, token: str, plan: Plan) -> dict[str, Any]:
    return {"id": plan_id, "edit_token": token, "plan": plan.model_dump(mode="json")}


@router.post("/plans")
def create_plan(request: Request, body: CreatePlan) -> dict[str, Any]:
    store = analytics(request)
    patch = body.draft.patch or store.latest_patch()
    if patch is None:
        raise HTTPException(status_code=409, detail="no games ingested yet")
    draft = body.draft.model_copy(update={"patch": patch})
    plan = build_plan(knowledge(request, store, patch, None), draft)
    plan_id, token = app_store(request).create_plan(plan)
    return _created(plan_id, token, plan)


@router.post("/plans/from-game")
def create_plan_from_game(request: Request, body: PlanFromGame) -> dict[str, Any]:
    store = analytics(request)
    try:
        game = store.load_game(body.game_id)
    except KeyError as error:
        raise HTTPException(status_code=404, detail="game not found") from error
    draft = Draft(blue=game.champions("blue"), red=game.champions("red"), us=body.us, patch=game.patch)
    plan = build_plan(knowledge(request, store, game.patch, game.meta.started_at), draft)
    plan_id, token = app_store(request).create_plan(plan)
    return {**_created(plan_id, token, plan), "game_id": game.meta.game_id}


def _get(request: Request, plan_id: str) -> Plan:
    plan = app_store(request).get_plan(plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="plan not found")
    return plan


@router.get("/plans/{plan_id}")
def get_plan(request: Request, plan_id: str) -> dict[str, Any]:
    return {"id": plan_id, "plan": _get(request, plan_id).model_dump(mode="json")}


@router.patch("/plans/{plan_id}")
def update_plan(
    request: Request, plan_id: str, body: UpdatePlan, x_edit_token: str = Header(default="")
) -> dict[str, Any]:
    plan = _get(request, plan_id).model_copy(update={"items": sorted(body.items, key=item_time)})
    if not app_store(request).update_plan(plan_id, x_edit_token, plan):
        raise HTTPException(status_code=403, detail="this link cannot edit the plan")
    return {"id": plan_id, "plan": plan.model_dump(mode="json")}


@router.get("/plans/{plan_id}/games")
def plan_games(request: Request, plan_id: str) -> list[dict[str, Any]]:
    plan = _get(request, plan_id)
    games = analytics(request).games_with_champions(plan.draft.ours(), plan.draft.theirs())
    return [_summary_json(summary) for summary in games]
