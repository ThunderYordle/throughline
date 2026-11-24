from __future__ import annotations

import math
from typing import Literal

from throughline.game.model import Lane, Objective, ObjectiveKind, Side

MAP_MAX = 15000.0
FOUNTAIN: dict[Side, tuple[float, float]] = {"blue": (500.0, 500.0), "red": (14300.0, 14300.0)}
PITS: dict[str, tuple[float, float]] = {"dragon": (9866.0, 4414.0), "baron": (5007.0, 10471.0)}
PIT_RADIUS = 2500.0
OBJECTIVE_PIT: dict[ObjectiveKind, str | None] = {
    "dragon": "dragon",
    "elder": "dragon",
    "grubs": "baron",
    "herald": "baron",
    "baron": "baron",
    "atakhan": None,
}
LANE_PATHS: dict[Lane, tuple[tuple[float, float], ...]] = {
    "top": ((1000.0, 3000.0), (1000.0, 14000.0), (12000.0, 14000.0)),
    "mid": ((3500.0, 3500.0), (11500.0, 11500.0)),
    "bot": ((3000.0, 1000.0), (14000.0, 1000.0), (14000.0, 12000.0)),
}
LANE_WIDTH = 1500.0

Point = tuple[float, float]


def dist(a: Point, b: Point) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def to_side_frame(x: float, y: float, side: Side) -> Point:
    """Read a position from `side`'s point of view: their base bottom left, lanes in place."""
    if side == "blue":
        return (x, y)
    return (MAP_MAX - y, MAP_MAX - x)


def half_of(x: float, y: float) -> Literal["top", "bot"]:
    return "top" if y > x else "bot"


def _segment_distance(p: Point, a: Point, b: Point) -> float:
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    length2 = dx * dx + dy * dy
    if length2 == 0:
        return dist(p, a)
    u = max(0.0, min(1.0, ((p[0] - ax) * dx + (p[1] - ay) * dy) / length2))
    return dist(p, (ax + u * dx, ay + u * dy))


def lane_at(x: float, y: float) -> Lane | None:
    best: tuple[float, Lane] | None = None
    for lane, path in LANE_PATHS.items():
        d = min(_segment_distance((x, y), path[i], path[i + 1]) for i in range(len(path) - 1))
        if d <= LANE_WIDTH and (best is None or d < best[0]):
            best = (d, lane)
    return best[1] if best else None


def objective_center(kind: ObjectiveKind, objective: Objective | None = None) -> Point | None:
    pit = OBJECTIVE_PIT[kind]
    if pit is not None:
        return PITS[pit]
    if objective is not None and objective.x is not None and objective.y is not None:
        return (objective.x, objective.y)
    return None
