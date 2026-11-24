from __future__ import annotations

from statistics import mean

from throughline.game.model import LANE_ROLES, LANES, Lane, Role
from throughline.knowledge.base import KnowledgeSource
from throughline.knowledge.features import CURVE_MINUTES
from throughline.plan.constants import LANE_GOLD, WINDOW_GOLD
from throughline.plan.models import Draft, LanePriority, Owner, TempoPoint, Window
from throughline.plan.text import fmt_gold

WINDOW_HALF_WIDTH = 150.0  # each tempo point stands for 2.5 minutes either side


def draft_tempo(kb: KnowledgeSource, draft: Draft) -> list[TempoPoint]:
    ours = [kb.curve(role, champion) for role, champion in draft.ours().items()]
    theirs = [kb.curve(role, champion) for role, champion in draft.theirs().items()]
    points: list[TempoPoint] = []
    for m in CURVE_MINUTES:
        value = mean(c[m].value for c in ours) - mean(c[m].value for c in theirs)
        games = min(c[m].games for c in ours + theirs)
        points.append(TempoPoint(minute=m, value=round(value, 1), games=games))
    return points


def tempo_at(points: list[TempoPoint], t: float) -> float:
    xs = [0.0] + [p.minute * 60.0 for p in points]
    ys = [0.0] + [p.value for p in points]
    if t >= xs[-1]:
        return ys[-1]
    for i in range(1, len(xs)):
        if t <= xs[i]:
            u = (t - xs[i - 1]) / (xs[i] - xs[i - 1])
            return ys[i - 1] + (ys[i] - ys[i - 1]) * u
    return ys[-1]


def tempo_games_at(points: list[TempoPoint], t: float) -> int:
    nearest = min(points, key=lambda p: abs(p.minute * 60.0 - t))
    return nearest.games


def windows(points: list[TempoPoint]) -> list[Window]:
    out: list[Window] = []
    for p in points:
        if abs(p.value) < WINDOW_GOLD:
            continue
        owner: Owner = "us" if p.value > 0 else "them"
        start, end = p.minute * 60.0 - WINDOW_HALF_WIDTH, p.minute * 60.0 + WINDOW_HALF_WIDTH
        last = out[-1] if out else None
        if last and last.owner == owner and last.end >= start:
            out[-1] = Window(
                start=last.start,
                end=end,
                owner=owner,
                peak=max(last.peak, abs(p.value)),
                games=min(last.games, p.games),
            )
        else:
            out.append(Window(start=max(0.0, start), end=end, owner=owner, peak=abs(p.value), games=p.games))
    return out


def _role_value(kb: KnowledgeSource, draft: Draft, role: Role) -> tuple[float, int, str]:
    ours, theirs = draft.ours()[role], draft.theirs()[role]
    matchup = kb.matchup(role, ours, theirs)
    if matchup is not None:
        return (
            matchup.value,
            matchup.games,
            f"{ours} vs {theirs}: {fmt_gold(matchup.value)} gold at 10:00 ({matchup.games} games)",
        )
    a, b = kb.role_edge(role, ours), kb.role_edge(role, theirs)
    games = min(a.games, b.games)
    return (
        a.value - b.value,
        games,
        f"{ours} {fmt_gold(a.value)} vs {theirs} {fmt_gold(b.value)} "
        f"gold at 10:00 on average ({games} games)",
    )


def lane_priorities(kb: KnowledgeSource, draft: Draft) -> dict[Lane, LanePriority]:
    out: dict[Lane, LanePriority] = {}
    for lane in LANES:
        parts = [_role_value(kb, draft, role) for role in LANE_ROLES[lane]]
        value = mean(p[0] for p in parts)
        owner: Owner | None = None
        if abs(value) >= LANE_GOLD:
            owner = "us" if value > 0 else "them"
        out[lane] = LanePriority(
            lane=lane,
            owner=owner,
            value=round(value, 1),
            games=min(p[1] for p in parts),
            detail="; ".join(p[2] for p in parts),
        )
    return out
