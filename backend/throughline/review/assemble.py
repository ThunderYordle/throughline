from __future__ import annotations

from collections import Counter
from typing import Literal

from pydantic import BaseModel

from throughline.game.model import SIDES, Game, Side
from throughline.plan.models import Draft, Plan
from throughline.review.checks import ItemCheck, check_item
from throughline.review.context import ReviewContext
from throughline.review.moments import Moment, detect_moments

GOLD_STEP = 30.0


class ReviewSummary(BaseModel):
    followed: int
    partly: int
    not_followed: int
    not_applicable: int


class ReviewBody(BaseModel):
    plan_id: str
    game_id: str
    us: Side
    teams: dict[Side, str]
    checks: list[ItemCheck]
    moments: list[Moment]
    summary: ReviewSummary
    gold: list[tuple[float, int]]


class EntryState(BaseModel):
    status: Literal["confirmed", "dismissed"] | None = None
    note: str = ""


def side_for_draft(game: Game, draft: Draft) -> Side | None:
    ours = sorted(draft.ours().values())
    for side in SIDES:
        if sorted(game.champions(side).values()) == ours:
            return side
    return None


def build_review(plan_id: str, plan: Plan, game: Game) -> ReviewBody:
    us = side_for_draft(game, plan.draft)
    if us is None:
        raise ValueError("this game was not played with the plan's draft")
    ctx = ReviewContext.build(game, us)
    checks = [check_item(item, ctx) for item in plan.items]
    counts = Counter(c.status for c in checks)
    gold: list[tuple[float, int]] = []
    t = 0.0
    while t <= game.duration:
        gold.append((t, ctx.index.gold_diff(us, t)))
        t += GOLD_STEP
    return ReviewBody(
        plan_id=plan_id,
        game_id=game.meta.game_id,
        us=us,
        teams=game.meta.teams,
        checks=checks,
        moments=detect_moments(ctx),
        gold=gold,
        summary=ReviewSummary(
            followed=counts["followed"],
            partly=counts["partly"],
            not_followed=counts["not_followed"],
            not_applicable=counts["not_applicable"],
        ),
    )
