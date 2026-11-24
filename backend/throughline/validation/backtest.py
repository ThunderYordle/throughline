"""Does following the plan go with winning? A strict time-split backtest over the whole dataset."""

from __future__ import annotations

from bisect import bisect_right
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from statistics import quantiles
from typing import Any

from throughline.api.routes_plans import KnowledgeFactory
from throughline.game.model import SIDES, Side
from throughline.knowledge.base import KnowledgeBase
from throughline.plan.generator import build_plan
from throughline.plan.models import Draft, item_time
from throughline.review.checks import check_item
from throughline.review.context import ReviewContext
from throughline.store.analytics import AnalyticsStore

MIN_PRIOR_GAMES = 200
GD_EDGES = (-1500, -500, 500, 1500)


@dataclass(frozen=True)
class SideResult:
    game_id: str
    started_at: datetime
    side: Side
    won: bool
    adherence: float | None
    items: int


@dataclass(frozen=True)
class CheckRow:
    game_id: str
    started_at: datetime
    side: Side
    won: bool
    item_type: str
    status: str
    gd_at: int


def adherence(statuses: list[str]) -> float | None:
    applicable = [status for status in statuses if status != "not_applicable"]
    if not applicable:
        return None
    score = sum(1.0 if status == "followed" else 0.5 if status == "partly" else 0.0 for status in applicable)
    return score / len(applicable)


def run_backtest(
    store: AnalyticsStore,
    knowledge: KnowledgeFactory = KnowledgeBase,
    min_prior_games: int = MIN_PRIOR_GAMES,
) -> tuple[list[SideResult], list[CheckRow]]:
    sides: list[SideResult] = []
    rows: list[CheckRow] = []
    for n, game_id in enumerate(store.game_ids_by_time()):
        if n < min_prior_games:
            continue
        game = store.load_game(game_id)
        kb = knowledge(store, game.patch, game.meta.started_at)
        for side in SIDES:
            draft = Draft(blue=game.champions("blue"), red=game.champions("red"), us=side, patch=game.patch)
            plan = build_plan(kb, draft)
            ctx = ReviewContext.build(game, side)
            checks = [check_item(item, ctx) for item in plan.items]
            won = game.winner == side
            sides.append(
                SideResult(
                    game_id,
                    game.meta.started_at,
                    side,
                    won,
                    adherence([check.status for check in checks]),
                    len(checks),
                )
            )
            for item, check in zip(plan.items, checks, strict=True):
                rows.append(
                    CheckRow(
                        game_id,
                        game.meta.started_at,
                        side,
                        won,
                        item.type,
                        check.status,
                        ctx.index.gold_diff(side, item_time(item)),
                    )
                )
    return sides, rows


def _rate(rows: list[CheckRow]) -> float | None:
    return sum(row.won for row in rows) / len(rows) if rows else None


def summarize(sides: list[SideResult], checks: list[CheckRow], holdout_from: datetime) -> dict[str, Any]:
    held = [side for side in sides if side.started_at >= holdout_from and side.adherence is not None]
    values = sorted(side.adherence for side in held if side.adherence is not None)
    quartiles_out: list[dict[str, Any]] = []
    if len(values) >= 4:
        edges = quantiles(values, n=4)
        buckets: dict[int, list[SideResult]] = defaultdict(list)
        for side in held:
            assert side.adherence is not None
            buckets[bisect_right(edges, side.adherence) if side.adherence < values[-1] else 3].append(side)
        bounds = [values[0], *edges, values[-1]]
        for quartile in range(4):
            group = buckets.get(quartile, [])
            quartiles_out.append(
                {
                    "low": bounds[quartile],
                    "high": bounds[quartile + 1],
                    "sides": len(group),
                    "win_rate": sum(side.won for side in group) / len(group) if group else None,
                }
            )

    eval_checks = [check for check in checks if check.started_at >= holdout_from]
    by_type: list[dict[str, Any]] = []
    for item_type in sorted({check.item_type for check in eval_checks}):
        of_type = [check for check in eval_checks if check.item_type == item_type]
        followed = [check for check in of_type if check.status == "followed"]
        not_followed = [check for check in of_type if check.status == "not_followed"]
        weighted, weight = 0.0, 0
        for bucket in range(len(GD_EDGES) + 1):
            followed_bucket = [check for check in followed if bisect_right(GD_EDGES, check.gd_at) == bucket]
            not_followed_bucket = [
                check for check in not_followed if bisect_right(GD_EDGES, check.gd_at) == bucket
            ]
            bucket_weight = min(len(followed_bucket), len(not_followed_bucket))
            if bucket_weight:
                followed_rate = _rate(followed_bucket)
                not_followed_rate = _rate(not_followed_bucket)
                assert followed_rate is not None and not_followed_rate is not None
                weighted += bucket_weight * (followed_rate - not_followed_rate)
                weight += bucket_weight
        by_type.append(
            {
                "type": item_type,
                "followed": len(followed),
                "not_followed": len(not_followed),
                "followed_win_rate": _rate(followed),
                "not_followed_win_rate": _rate(not_followed),
                "adjusted_difference": weighted / weight if weight else None,
            }
        )
    return {
        "holdout_from": holdout_from.isoformat(),
        "sides": len(held),
        "adherence_quartiles": quartiles_out,
        "by_type": by_type,
    }
