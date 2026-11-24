from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

from throughline.api.routes_games import analytics
from throughline.api.routes_plans import app_store
from throughline.review.assemble import EntryState, ReviewBody, build_review

router = APIRouter(prefix="/api")


class CreateReview(BaseModel):
    plan_id: str
    game_id: str


def _entries_json(request: Request, review_id: str) -> dict[str, Any]:
    return {key: value.model_dump() for key, value in app_store(request).entries(review_id).items()}


def _get(request: Request, review_id: str) -> ReviewBody:
    review = app_store(request).get_review(review_id)
    if review is None:
        raise HTTPException(status_code=404, detail="review not found")
    return review


@router.post("/reviews")
def create_review(request: Request, body: CreateReview) -> dict[str, Any]:
    plan = app_store(request).get_plan(body.plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="plan not found")
    try:
        game = analytics(request).load_game(body.game_id)
    except KeyError as error:
        raise HTTPException(status_code=404, detail="game not found") from error
    try:
        review = build_review(body.plan_id, plan, game)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    review_id, token = app_store(request).create_review(review)
    return {"id": review_id, "edit_token": token, "review": review.model_dump(mode="json"), "entries": {}}


@router.get("/reviews/{review_id}")
def get_review(request: Request, review_id: str) -> dict[str, Any]:
    review = _get(request, review_id)
    return {
        "id": review_id,
        "review": review.model_dump(mode="json"),
        "entries": _entries_json(request, review_id),
    }


@router.patch("/reviews/{review_id}/entries/{entry_id}")
def set_entry(
    request: Request, review_id: str, entry_id: str, state: EntryState, x_edit_token: str = Header(default="")
) -> dict[str, Any]:
    review = _get(request, review_id)
    known = {check.item_id for check in review.checks} | {moment.id for moment in review.moments}
    if entry_id not in known:
        raise HTTPException(status_code=404, detail="no such entry in this review")
    if not app_store(request).set_entry(review_id, x_edit_token, entry_id, state):
        raise HTTPException(status_code=403, detail="this link cannot edit the review")
    return {"entries": _entries_json(request, review_id)}


@router.get("/validation")
def validation(request: Request) -> dict[str, Any]:
    path = request.app.state.settings.data_dir / "validation.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="no validation report yet")
    report: dict[str, Any] = json.loads(path.read_text())
    return report
