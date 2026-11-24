from __future__ import annotations

from statistics import mean
from typing import Literal

from throughline.game.model import ROLE_LANE, Lane, Role
from throughline.game.setups import SPAWNS
from throughline.knowledge.base import KnowledgeSource
from throughline.plan.constants import (
    CONFIDENT_GAMES,
    LANE_GOLD,
    LANE_UNTIL,
    MAX_ITEMS,
    MIN_ITEM_GAMES,
    OBJECTIVE_LANES,
    OBJECTIVE_LEAD,
    OBJECTIVE_MIN_PLAYERS,
    OBJECTIVE_NAMES,
    OBJECTIVE_SIGNAL,
    PLAN_OBJECTIVES,
    SIDE_UNTIL,
    SIDE_WEIGHT,
    SPIKE_GOLD,
    TENDENCY_UNIT,
    TRADE_FALLBACK,
    WINDOW_GOLD,
)
from throughline.plan.models import (
    ConcedeItem,
    Draft,
    Evidence,
    LaneItem,
    LanePriority,
    ObjectiveItem,
    Plan,
    PlanItem,
    SideItem,
    SpikeItem,
    TempoPoint,
    Window,
    WindowItem,
    item_time,
)
from throughline.plan.tempo import draft_tempo, lane_priorities, tempo_at, tempo_games_at, windows
from throughline.plan.text import fmt_gold, fmt_time

SPIKE_ROLES: tuple[Role, ...] = ("top", "mid", "bot")
SIDE_LANES: tuple[Literal["top", "bot"], ...] = ("top", "bot")


def confidence(games: int) -> float:
    return min(1.0, games / CONFIDENT_GAMES)


def _objective_items(
    kb: KnowledgeSource, draft: Draft, tempo: list[TempoPoint], lanes: dict[Lane, LanePriority]
) -> list[PlanItem]:
    items: list[PlanItem] = []
    for objective in PLAN_OBJECTIVES:
        observed = kb.first_spawn(objective)
        spawn = observed if observed is not None else SPAWNS[objective][0]
        name = OBJECTIVE_NAMES[objective]
        lane_list = OBJECTIVE_LANES[objective]
        lane_value = mean(lanes[lane].value for lane in lane_list)
        lane_games = min(lanes[lane].games for lane in lane_list)
        tempo_value = tempo_at(tempo, spawn)
        tempo_games = tempo_games_at(tempo, spawn)
        ours = [kb.tendency(c, objective) for c in draft.ours().values()]
        theirs = [kb.tendency(c, objective) for c in draft.theirs().values()]
        tendency = sum(s.value for s in ours) - sum(s.value for s in theirs)
        tendency_games = min(s.games for s in ours + theirs)
        signal = lane_value / LANE_GOLD + tempo_value / WINDOW_GOLD + tendency / TENDENCY_UNIT
        evidence = [
            Evidence(
                text=f"{', '.join(lane_list).title()} lane: {fmt_gold(lane_value)} gold at 10:00",
                games=lane_games,
            ),
            Evidence(
                text=f"Draft tempo at {fmt_time(spawn)}: {fmt_gold(tempo_value)} gold",
                games=tempo_games,
            ),
            Evidence(
                text=f"These champions' {name} rate: {tendency * 100:+.0f} points",
                games=tendency_games,
            ),
        ]
        score = abs(signal) * confidence(min(e.games for e in evidence))
        if signal >= OBJECTIVE_SIGNAL:
            by = spawn - OBJECTIVE_LEAD
            items.append(
                ObjectiveItem(
                    id=f"objective-{objective}",
                    objective=objective,
                    spawn_at=spawn,
                    by=by,
                    min_players=OBJECTIVE_MIN_PLAYERS,
                    evidence=evidence,
                    score=score,
                    text=(
                        f"Contest {name} ({fmt_time(spawn)}): {OBJECTIVE_MIN_PLAYERS}+ near the pit by "
                        f"{fmt_time(by)}, grouped there before them."
                    ),
                )
            )
        elif signal <= -OBJECTIVE_SIGNAL:
            trade = [lane for lane, p in lanes.items() if p.owner == "us"] or TRADE_FALLBACK[objective]
            items.append(
                ConcedeItem(
                    id=f"objective-{objective}",
                    objective=objective,
                    spawn_at=spawn,
                    trade_lanes=trade,
                    evidence=evidence,
                    score=score,
                    text=f"Give {name} ({fmt_time(spawn)}); trade for plates {' and '.join(trade)}.",
                )
            )
    return items


def _lane_items(lanes: dict[Lane, LanePriority]) -> list[PlanItem]:
    return [
        LaneItem(
            id=f"lane-{lane}",
            lane=lane,
            until=LANE_UNTIL,
            text=f"{lane.title()} has priority to {fmt_time(LANE_UNTIL)}: play for plates.",
            evidence=[Evidence(text=p.detail, games=p.games)],
            score=abs(p.value) / LANE_GOLD * confidence(p.games),
        )
        for lane, p in lanes.items()
        if p.owner == "us"
    ]


def _window_items(found: list[Window]) -> list[PlanItem]:
    items: list[PlanItem] = []
    for n, w in enumerate(found, start=1):
        span = f"{fmt_time(w.start)}-{fmt_time(w.end)}"
        text = (
            f"Our window {span}: force fights and objectives."
            if w.owner == "us"
            else f"Their window {span}: avoid even fights."
        )
        items.append(
            WindowItem(
                id=f"window-{n}",
                stance="force" if w.owner == "us" else "avoid",
                start=w.start,
                end=w.end,
                text=text,
                evidence=[
                    Evidence(
                        text=f"Draft tempo peaks at {fmt_gold(w.peak if w.owner == 'us' else -w.peak)} gold",
                        games=w.games,
                    )
                ],
                score=w.peak / WINDOW_GOLD * confidence(w.games),
            )
        )
    return items


def _spike_items(kb: KnowledgeSource, draft: Draft) -> list[PlanItem]:
    items: list[PlanItem] = []
    for role in SPIKE_ROLES:
        champion = draft.theirs()[role]
        lane = ROLE_LANE[role]
        for kind in ("level6", "item1"):
            spike = kb.spike(role, champion, kind)  # type: ignore[arg-type]
            if spike is None or spike.gd_after < SPIKE_GOLD:
                continue
            if kind == "level6":
                text = (
                    f"Their {champion} hits level 6 near {fmt_time(spike.at)}: "
                    f"no {lane} trades without jungle near."
                )
                what = "reaches level 6"
            else:
                text = (
                    f"Their {champion} completes a first item near {fmt_time(spike.at)}: "
                    f"back off {lane} until ours."
                )
                what = "completes a first item"
            items.append(
                SpikeItem(
                    id=f"spike-{role}-{kind}",
                    enemy_champion=champion,
                    role=role,
                    kind=kind,  # type: ignore[arg-type]
                    at=spike.at,
                    text=text,
                    score=spike.gd_after / SPIKE_GOLD * confidence(spike.games),
                    evidence=[
                        Evidence(
                            text=(
                                f"{champion} {what} at a median {fmt_time(spike.at)}; their team gains "
                                f"{fmt_gold(spike.gd_after)} gold in the 3 minutes after"
                            ),
                            games=spike.games,
                        )
                    ],
                )
            )
    return items


def _side_items(lanes: dict[Lane, LanePriority]) -> list[PlanItem]:
    candidates = [lanes[lane] for lane in SIDE_LANES if lanes[lane].owner == "us"]
    if not candidates:
        return []
    best = max(candidates, key=lambda p: p.value)
    half: Literal["top", "bot"] = "top" if best.lane == "top" else "bot"
    return [
        SideItem(
            id="side",
            half=half,
            until=SIDE_UNTIL,
            text=f"Jungle plays {half} side to {fmt_time(SIDE_UNTIL)}, toward the {best.lane} priority.",
            evidence=[Evidence(text=best.detail, games=best.games)],
            score=best.value / LANE_GOLD * confidence(best.games) * SIDE_WEIGHT,
        )
    ]


def build_plan(kb: KnowledgeSource, draft: Draft) -> Plan:
    tempo = draft_tempo(kb, draft)
    found = windows(tempo)
    lanes = lane_priorities(kb, draft)
    candidates = [
        *_objective_items(kb, draft, tempo, lanes),
        *_lane_items(lanes),
        *_window_items(found),
        *_spike_items(kb, draft),
        *_side_items(lanes),
    ]
    kept = [i for i in candidates if i.evidence and min(e.games for e in i.evidence) >= MIN_ITEM_GAMES]
    top = sorted(kept, key=lambda i: i.score, reverse=True)[:MAX_ITEMS]
    return Plan(
        draft=draft,
        items=sorted(top, key=item_time),
        tempo=tempo,
        windows=found,
        lanes=list(lanes.values()),
        scope_games=kb.scope_games,
    )
