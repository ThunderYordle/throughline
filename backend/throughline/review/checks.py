from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

from throughline.game.geometry import PIT_RADIUS, half_of, lane_at, objective_center
from throughline.game.model import LANE_ROLES, ROLE_LANE, Side
from throughline.game.setups import GROUP_SIZE, ObjectiveInstance, Setup, setup_for
from throughline.plan.models import (
    ConcedeItem,
    LaneItem,
    ObjectiveItem,
    PlanItem,
    SideItem,
    SpikeItem,
    WindowItem,
)
from throughline.plan.text import fmt_gold, fmt_time
from throughline.review.context import ReviewContext

Status = Literal["followed", "partly", "not_followed", "not_applicable"]

CLIP_BEFORE = 15.0
CLIP_AFTER = 10.0
CONCEDE_MAX_NEAR = 1
CONCEDE_TRADE_SPAN = 60.0
SPIKE_WATCH = 120.0
SIDE_START = 90.0
SIDE_STEP = 5.0
SIDE_FOLLOWED = 0.6
SIDE_PARTLY = 0.45


class ItemCheck(BaseModel):
    item_id: str
    status: Status
    numbers: str
    at: float
    clip: tuple[float, float]


def plural(n: int, word: str) -> str:
    return f"{n} {word}" if n == 1 else f"{n} {word}s"


def _by_count(passed: int, total: int) -> Status:
    if passed == total:
        return "followed"
    return "partly" if passed > 0 else "not_followed"


def _clip(ctx: ReviewContext, start: float, end: float) -> tuple[float, float]:
    return max(0.0, start), min(ctx.game.duration, end)


def _na(item: PlanItem, ctx: ReviewContext, why: str) -> ItemCheck:
    return ItemCheck(item_id=item.id, status="not_applicable", numbers=why, at=0.0, clip=(0.0, 0.0))


def _instance(ctx: ReviewContext, kind: str) -> ObjectiveInstance | None:
    return next((i for i in ctx.instances if i.kind == kind), None)


def _grouping(setup: Setup | None, us: Side, them: Side) -> tuple[bool, str]:
    """Whether `us` had GROUP_SIZE at the pit before `them`, and how to say it."""
    ours = setup.grouped_at[us] if setup else None
    theirs = setup.grouped_at[them] if setup else None
    if ours is None:
        return False, f"never {GROUP_SIZE}+ there"
    if theirs is None or ours <= theirs:
        return True, f"grouped first at {fmt_time(ours)}"
    return False, f"grouped at {fmt_time(ours)}, after them ({fmt_time(theirs)})"


def _check_objective(item: ObjectiveItem, ctx: ReviewContext) -> ItemCheck:
    inst = _instance(ctx, item.objective)
    if inst is None or item.spawn_at >= ctx.game.duration:
        return _na(item, ctx, "The game ended before it spawned.")
    center = objective_center(item.objective, inst.taken)
    assert center is not None
    near = ctx.index.near(ctx.us, center, PIT_RADIUS, item.by)
    first, grouping = _grouping(setup_for(ctx.index, inst), ctx.us, ctx.them)
    status = _by_count(int(near >= item.min_players) + int(first), 2)
    if inst.taken is None:
        outcome = "nobody took it"
    else:
        outcome = f"{'we' if inst.taken.by == ctx.us else 'they'} took it at {fmt_time(inst.taken.t)}"
    end = (inst.taken.t if inst.taken else item.spawn_at) + CLIP_AFTER
    return ItemCheck(
        item_id=item.id,
        status=status,
        at=item.by,
        clip=_clip(ctx, item.by - CLIP_BEFORE, end),
        numbers=f"{near} of 5 near the pit at {fmt_time(item.by)}, {grouping}; {outcome}",
    )


def _check_concede(item: ConcedeItem, ctx: ReviewContext) -> ItemCheck:
    inst = _instance(ctx, item.objective)
    if inst is None or item.spawn_at >= ctx.game.duration:
        return _na(item, ctx, "The game ended before it spawned.")
    center = objective_center(item.objective, inst.taken)
    assert center is not None
    near = ctx.index.near(ctx.us, center, PIT_RADIUS, item.spawn_at)
    start, end = item.spawn_at - CONCEDE_TRADE_SPAN, item.spawn_at + CONCEDE_TRADE_SPAN
    gains = [
        p for p in ctx.game.plates if p.by == ctx.us and p.lane in item.trade_lanes and start <= p.t <= end
    ]
    gains_s = [
        s
        for s in ctx.game.structures
        if s.by == ctx.us and s.lane in item.trade_lanes and start <= s.t <= end
    ]
    traded = len(gains) + len(gains_s)
    stayed_away = near <= CONCEDE_MAX_NEAR
    if stayed_away and traded:
        status: Status = "followed"
    elif stayed_away:
        status = "partly"
    else:
        status = "not_followed"
    lanes = " and ".join(item.trade_lanes)
    taken_word = "plate or structure" if traded == 1 else "plates or structures"
    return ItemCheck(
        item_id=item.id,
        status=status,
        at=item.spawn_at,
        clip=_clip(ctx, item.spawn_at - CLIP_BEFORE, item.spawn_at + CLIP_AFTER),
        numbers=(
            f"{near} of 5 at the pit at {fmt_time(item.spawn_at)}; {traded} {taken_word} "
            f"taken in {lanes} meanwhile"
        ),
    )


def _check_lane(item: LaneItem, ctx: ReviewContext) -> ItemCheck:
    if ctx.game.duration < item.until:
        return _na(item, ctx, "The game ended before the lane phase did.")
    gd = ctx.index.lane_gold_diff(ctx.us, item.lane, item.until)
    ours = sum(1 for p in ctx.game.plates if p.lane == item.lane and p.by == ctx.us and p.t <= item.until)
    theirs = sum(1 for p in ctx.game.plates if p.lane == item.lane and p.by == ctx.them and p.t <= item.until)
    status = _by_count(int(gd >= 0) + int(ours > theirs), 2)
    return ItemCheck(
        item_id=item.id,
        status=status,
        at=item.until,
        clip=_clip(ctx, item.until - CLIP_BEFORE, item.until + CLIP_AFTER),
        numbers=f"{item.lane.title()} gold {fmt_gold(gd)} at {fmt_time(item.until)}; plates {ours}-{theirs}",
    )


def _check_window(item: WindowItem, ctx: ReviewContext) -> ItemCheck:
    if ctx.game.duration < item.start:
        return _na(item, ctx, "The game ended before the window.")
    fights = [f for f in ctx.fights if item.start <= f.start <= item.end]
    won = sum(1 for f in fights if f.winner() == ctx.us)
    lost = sum(1 for f in fights if f.winner() == ctx.them)
    span = f"from {fmt_time(item.start)} to {fmt_time(item.end)}"
    at = fights[0].start if fights else item.start
    numbers = f"{plural(len(fights), 'fight')} {span}: won {won}, lost {lost}"
    if item.stance == "force":
        taken = [o for o in ctx.game.objectives if o.by == ctx.us and item.start <= o.t <= item.end]
        if fights and won >= lost:
            status: Status = "followed"
        elif fights or taken:
            status = "partly"
        else:
            status = "not_followed"
        if taken:
            numbers += f"; took {', '.join(o.kind for o in taken)}"
    else:
        risky = [f for f in fights if f.present[ctx.us] <= f.present[ctx.them]]
        lost_risky = [f for f in risky if f.winner() == ctx.them]
        if lost_risky:
            status = "not_followed"
            at = lost_risky[0].start
        elif risky:
            status = "partly"
        else:
            status = "followed"
    return ItemCheck(
        item_id=item.id,
        status=status,
        at=at,
        clip=_clip(ctx, at - CLIP_BEFORE, at + CLIP_AFTER),
        numbers=numbers,
    )


def _check_spike(item: SpikeItem, ctx: ReviewContext) -> ItemCheck:
    if ctx.game.duration < item.at:
        return _na(item, ctx, "The game ended before the spike.")
    lane = ROLE_LANE[item.role]
    assert lane is not None
    ours = {ctx.game.player(ctx.us, role).pid for role in LANE_ROLES[lane]}
    deaths = [
        k
        for k in ctx.game.kills
        if k.victim in ours and item.at <= k.t <= item.at + SPIKE_WATCH and lane_at(k.x, k.y) == lane
    ]
    at = deaths[0].t if deaths else item.at
    return ItemCheck(
        item_id=item.id,
        status="not_followed" if deaths else "followed",
        at=at,
        clip=_clip(ctx, at - CLIP_BEFORE, at + CLIP_AFTER),
        numbers=(
            f"{plural(len(deaths), 'death')} in {lane} from {fmt_time(item.at)} "
            f"to {fmt_time(item.at + SPIKE_WATCH)}"
        ),
    )


def _check_side(item: SideItem, ctx: ReviewContext) -> ItemCheck:
    end = min(item.until, ctx.game.duration)
    if end <= SIDE_START:
        return _na(item, ctx, "The game ended too early.")
    jungler = ctx.game.player(ctx.us, "jungle").pid
    samples, on_side = 0, 0
    t = SIDE_START
    while t <= end:
        f = ctx.index.frame(jungler, t)
        if f is not None and f.alive:
            samples += 1
            on_side += int(half_of(f.x, f.y) == item.half)
        t += SIDE_STEP
    share = on_side / samples if samples else 0.0
    status: Status = (
        "followed" if share >= SIDE_FOLLOWED else "partly" if share >= SIDE_PARTLY else "not_followed"
    )
    return ItemCheck(
        item_id=item.id,
        status=status,
        at=SIDE_START,
        clip=_clip(ctx, SIDE_START, end),
        numbers=(
            f"Jungler spent {share:.0%} of {fmt_time(SIDE_START)}-{fmt_time(end)} " f"on the {item.half} side"
        ),
    )


def check_item(item: PlanItem, ctx: ReviewContext) -> ItemCheck:
    match item:
        case ObjectiveItem():
            return _check_objective(item, ctx)
        case ConcedeItem():
            return _check_concede(item, ctx)
        case LaneItem():
            return _check_lane(item, ctx)
        case WindowItem():
            return _check_window(item, ctx)
        case SpikeItem():
            return _check_spike(item, ctx)
        case SideItem():
            return _check_side(item, ctx)
    raise TypeError(f"unknown plan item {item!r}")
