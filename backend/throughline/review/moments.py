from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel

from throughline.game.fights import kill_side
from throughline.game.geometry import FOUNTAIN, half_of, objective_center
from throughline.game.model import Side
from throughline.game.setups import setup_for
from throughline.plan.text import fmt_gold, fmt_time
from throughline.review.checks import plural
from throughline.review.context import ReviewContext

MomentKind = Literal["objective_setup", "unused_advantage", "cross_map_trade", "caught", "gold_swing"]
Verdict = Literal["good", "bad", "neutral"]

MAX_MOMENTS = 15
KILL_GOLD = 300
PLATE_GOLD = 250
OBJECTIVE_GOLD = {"dragon": 1000, "elder": 3000, "grubs": 600, "herald": 1200, "baron": 3000, "atakhan": 1500}
STRUCTURE_GOLD = {"turret": 800, "inhibitor": 1000, "nexus": 0}
OBJECTIVE_TITLES = {
    "dragon": "Dragon",
    "grubs": "Void grubs",
    "herald": "Rift Herald",
    "baron": "Baron",
    "atakhan": "Atakhan",
}
ADVANTAGE_WINDOW = 60.0
ADVANTAGE_KILLS = 2
ADVANTAGE_KILL_SPAN = 10.0
RECALL_MIN = 3
RECALL_RADIUS = 1500.0
RECALL_FROM = 180.0
RECALL_STEP = 5.0
TRADE_GAP = 45.0
TRADE_EVEN = 200
CAUGHT_FROM = 840.0
CAUGHT_ALLY_DISTANCE = 2000.0
CAUGHT_BEFORE = 90.0
SWING_GOLD = 1500
SWING_SPAN = 60.0
SWING_STEP = 10.0


class Moment(BaseModel):
    id: str
    kind: MomentKind
    t: float
    verdict: Verdict
    text: str
    impact: int
    clip: tuple[float, float]


def _clip(ctx: ReviewContext, start: float, end: float) -> tuple[float, float]:
    return max(0.0, start), min(ctx.game.duration, end)


def _who(ctx: ReviewContext, side: Side) -> str:
    return "we" if side == ctx.us else "they"


def objective_setups(ctx: ReviewContext) -> list[Moment]:
    out: list[Moment] = []
    for inst in ctx.instances:
        if inst.spawn_at >= ctx.game.duration:
            continue
        setup = setup_for(ctx.index, inst)
        if setup is None:
            continue
        us, them = ctx.us, ctx.them
        grouped = [
            f"{_who(ctx, side)} grouped at {fmt_time(t)}"
            for side, t in setup.grouped_at.items()
            if t is not None
        ]
        parts = [
            f"{OBJECTIVE_TITLES[inst.kind]} {fmt_time(inst.spawn_at)}: {setup.near_at_spawn[us]} vs "
            f"{setup.near_at_spawn[them]} at the pit",
            "; ".join(grouped) if grouped else "nobody grouped",
        ]
        if inst.taken is None:
            parts.append("nobody took it")
            verdict: Verdict = "neutral"
        else:
            parts.append(f"{_who(ctx, inst.taken.by)} took it at {fmt_time(inst.taken.t)}")
            verdict = "good" if inst.taken.by == us else "bad"
        kind = inst.taken.kind if inst.taken else inst.kind
        end = (inst.taken.t if inst.taken else inst.spawn_at) + 10.0
        out.append(
            Moment(
                id=f"setup-{inst.kind}-{int(inst.spawn_at)}",
                kind="objective_setup",
                t=inst.spawn_at,
                verdict=verdict,
                text="; ".join(parts) + ".",
                impact=OBJECTIVE_GOLD[kind],
                clip=_clip(ctx, inst.spawn_at - 30.0, end),
            )
        )
    return out


@dataclass(frozen=True)
class _Gain:
    t: float
    label: str
    value: int


def _gains(ctx: ReviewContext, side: Side, start: float, end: float) -> list[_Gain]:
    gains = [
        _Gain(o.t, o.kind, OBJECTIVE_GOLD[o.kind])
        for o in ctx.game.objectives
        if o.by == side and start < o.t <= end
    ]
    gains += [
        _Gain(s.t, f"the {s.lane + ' ' if s.lane else ''}{s.kind}", STRUCTURE_GOLD[s.kind])
        for s in ctx.game.structures
        if s.by == side and start < s.t <= end
    ]
    gains += [
        _Gain(p.t, f"a {p.lane} plate", PLATE_GOLD)
        for p in ctx.game.plates
        if p.by == side and start < p.t <= end
    ]
    return sorted(gains, key=lambda g: g.t)


def _triggers(ctx: ReviewContext) -> list[tuple[float, str, int]]:
    """(time, description, size) of moments where the enemy is down: kill streaks and group recalls."""
    streaks: list[list[float]] = []
    for k in ctx.game.kills:
        if kill_side(ctx.game, k) != ctx.us:
            continue
        if streaks and k.t - streaks[-1][-1] <= ADVANTAGE_KILL_SPAN:
            streaks[-1].append(k.t)
        else:
            streaks.append([k.t])
    out: list[tuple[float, str, int]] = [
        (s[-1], plural(len(s), "kill"), len(s)) for s in streaks if len(s) >= ADVANTAGE_KILLS
    ]

    fountain = FOUNTAIN[ctx.them]
    # Start from the state just before RECALL_FROM, so standing in base since the start is not a recall.
    previous = ctx.index.near(ctx.them, fountain, RECALL_RADIUS, RECALL_FROM - RECALL_STEP)
    t = RECALL_FROM
    while t <= ctx.game.duration:
        home = ctx.index.near(ctx.them, fountain, RECALL_RADIUS, t)
        if home >= RECALL_MIN and previous < RECALL_MIN:
            out.append((t, f"{home} of them recalled", home))
        previous = home
        t += RECALL_STEP
    out.sort()
    deduped: list[tuple[float, str, int]] = []
    for trigger in out:
        if deduped and trigger[0] - deduped[-1][0] < ADVANTAGE_WINDOW:
            continue
        deduped.append(trigger)
    return deduped


def unused_advantages(ctx: ReviewContext) -> list[Moment]:
    out: list[Moment] = []
    for t, what, size in _triggers(ctx):
        gains = _gains(ctx, ctx.us, t, t + ADVANTAGE_WINDOW)
        if gains:
            labels = ", ".join(g.label for g in gains)
            text = f"Converted {what} at {fmt_time(t)}: took {labels} within {int(ADVANTAGE_WINDOW)} s."
            verdict: Verdict = "good"
            impact = sum(g.value for g in gains)
        else:
            text = f"Unused: {what} at {fmt_time(t)}, nothing taken in the next {int(ADVANTAGE_WINDOW)} s."
            verdict = "bad"
            impact = KILL_GOLD * size
        out.append(
            Moment(
                id=f"advantage-{int(t)}",
                kind="unused_advantage",
                t=t,
                verdict=verdict,
                text=text,
                impact=impact,
                clip=_clip(ctx, t - 15.0, t + ADVANTAGE_WINDOW),
            )
        )
    return out


def _half_events(ctx: ReviewContext) -> list[tuple[float, Side, str, int, str]]:
    """(time, side, label, value, half) for objectives and structures that sit on one half of the map."""
    events: list[tuple[float, Side, str, int, str]] = []
    for o in ctx.game.objectives:
        center = objective_center(o.kind, o)
        if center is not None:
            events.append((o.t, o.by, o.kind, OBJECTIVE_GOLD[o.kind], half_of(*center)))
    for s in ctx.game.structures:
        if s.lane in ("top", "bot"):
            events.append((s.t, s.by, f"the {s.lane} {s.kind}", STRUCTURE_GOLD[s.kind], s.lane))
    return sorted(events)


def cross_map_trades(ctx: ReviewContext) -> list[Moment]:
    events = _half_events(ctx)
    used: set[int] = set()
    out: list[Moment] = []
    for i, (t, side, label, value, half) in enumerate(events):
        if side != ctx.us or i in used:
            continue
        for j, (t2, side2, label2, value2, half2) in enumerate(events):
            if j in used or side2 != ctx.them or half2 == half or abs(t2 - t) > TRADE_GAP:
                continue
            used.update({i, j})
            diff = value - value2
            verdict: Verdict = "good" if diff > TRADE_EVEN else "bad" if diff < -TRADE_EVEN else "neutral"
            start = min(t, t2)
            out.append(
                Moment(
                    id=f"trade-{int(start)}",
                    kind="cross_map_trade",
                    t=start,
                    verdict=verdict,
                    impact=max(value, value2),
                    clip=_clip(ctx, start - 15.0, max(t, t2) + 10.0),
                    text=(
                        f"Cross-map trade at {fmt_time(start)}: we took {label} ({fmt_gold(value)}), "
                        f"they took {label2} ({fmt_gold(-value2)})."
                    ),
                )
            )
            break
    return out


def caught_before_objectives(ctx: ReviewContext) -> list[Moment]:
    out: list[Moment] = []
    for k in ctx.game.kills:
        if k.t < CAUGHT_FROM or ctx.game.side_of(k.victim) != ctx.us:
            continue
        if ctx.index.nearest_ally_distance(k.victim, k.t - 1.0) <= CAUGHT_ALLY_DISTANCE:
            continue
        upcoming = [i for i in ctx.instances if k.t < i.spawn_at <= k.t + CAUGHT_BEFORE]
        if not upcoming:
            continue
        inst = upcoming[0]
        champion = ctx.game.participant(k.victim).champion
        lost = inst.taken is not None and inst.taken.by == ctx.them
        outcome = "they took it" if lost else "we kept it" if inst.taken else "nobody took it"
        out.append(
            Moment(
                id=f"caught-{int(k.t)}",
                kind="caught",
                t=k.t,
                verdict="bad",
                impact=KILL_GOLD + (OBJECTIVE_GOLD[inst.kind] if lost else 0),
                clip=_clip(ctx, k.t - 15.0, k.t + 10.0),
                text=(
                    f"Caught at {fmt_time(k.t)}: {champion} died alone {int(inst.spawn_at - k.t)} s before "
                    f"{inst.kind}; {outcome}."
                ),
            )
        )
    return out


def _first_event_label(ctx: ReviewContext, start: float, end: float) -> str:
    kills = [
        (k.t, f"the kill on {ctx.game.participant(k.victim).champion}")
        for k in ctx.game.kills
        if start <= k.t <= end
    ]
    objectives = [
        (o.t, f"{o.kind} taken by {'us' if o.by == ctx.us else 'them'}")
        for o in ctx.game.objectives
        if start <= o.t <= end
    ]
    structures = [
        (s.t, f"the {s.lane + ' ' if s.lane else ''}{s.kind}")
        for s in ctx.game.structures
        if start <= s.t <= end
    ]
    events = sorted(kills + objectives + structures)
    return events[0][1] if events else "no single event"


def gold_swings(ctx: ReviewContext) -> list[Moment]:
    candidates: list[tuple[int, float]] = []
    t = 0.0
    while t + SWING_SPAN <= ctx.game.duration:
        swing = ctx.index.gold_diff(ctx.us, t + SWING_SPAN) - ctx.index.gold_diff(ctx.us, t)
        if abs(swing) >= SWING_GOLD:
            candidates.append((swing, t))
        t += SWING_STEP
    chosen: list[tuple[int, float]] = []
    for swing, start in sorted(candidates, key=lambda c: -abs(c[0])):
        if all(abs(start - other) >= SWING_SPAN for _, other in chosen):
            chosen.append((swing, start))
    return [
        Moment(
            id=f"swing-{int(start)}",
            kind="gold_swing",
            t=start,
            verdict="good" if swing > 0 else "bad",
            impact=abs(swing),
            clip=_clip(ctx, start - 10.0, start + SWING_SPAN),
            text=(
                f"Gold swing {fmt_gold(swing)} in {int(SWING_SPAN)} s from {fmt_time(start)}, starting with "
                f"{_first_event_label(ctx, start, start + SWING_SPAN)}."
            ),
        )
        for swing, start in chosen
    ]


def detect_moments(ctx: ReviewContext) -> list[Moment]:
    found = [
        *objective_setups(ctx),
        *unused_advantages(ctx),
        *cross_map_trades(ctx),
        *caught_before_objectives(ctx),
        *gold_swings(ctx),
    ]
    top = sorted(found, key=lambda m: m.impact, reverse=True)[:MAX_MOMENTS]
    return sorted(top, key=lambda m: m.t)
