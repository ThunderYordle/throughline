from __future__ import annotations

from dataclasses import dataclass

from throughline.game.geometry import PIT_RADIUS, Point, objective_center
from throughline.game.index import GameIndex
from throughline.game.model import SIDES, Game, Objective, ObjectiveKind, Side

#: Fallback (first spawn, respawn after a take or None) in seconds, for games without spawn records
#: (GameBuilder games). Real games use the feed's own spawn events.
SPAWNS: dict[ObjectiveKind, tuple[float, float | None]] = {
    "dragon": (300.0, 300.0),
    "grubs": (480.0, None),
    "herald": (900.0, None),
    "atakhan": (1200.0, None),
    "baron": (1500.0, 360.0),
}
#: Spawn records of one kind this close together are one instance (grubs spawn as three).
SPAWN_MERGE = 60.0
INSTANCE_KINDS: dict[ObjectiveKind, ObjectiveKind] = {
    "dragon": "dragon",
    "elder": "dragon",
    "grubs": "grubs",
    "herald": "herald",
    "baron": "baron",
    "atakhan": "atakhan",
}
SETUP_WINDOW = 90.0
SAMPLE_STEP = 5.0
GROUP_SIZE = 3


@dataclass(frozen=True)
class ObjectiveInstance:
    kind: ObjectiveKind
    spawn_at: float
    taken: Objective | None


@dataclass(frozen=True)
class Setup:
    instance: ObjectiveInstance
    center: Point
    near_at_spawn: dict[Side, int]
    grouped_at: dict[Side, float | None]


def _takes(game: Game, kind: ObjectiveKind) -> list[Objective]:
    return [o for o in game.objectives if INSTANCE_KINDS[o.kind] == kind]


def _observed_instances(game: Game) -> list[ObjectiveInstance]:
    out: list[ObjectiveInstance] = []
    starts: dict[ObjectiveKind, list[float]] = {}
    for spawn in game.spawns:
        kind = INSTANCE_KINDS[spawn.kind]
        times = starts.setdefault(kind, [])
        if not times or spawn.t - times[-1] > SPAWN_MERGE:
            times.append(spawn.t)
    for kind, times in starts.items():
        takes = _takes(game, kind)
        for i, spawn_at in enumerate(times):
            until = times[i + 1] if i + 1 < len(times) else game.duration + 1.0
            taken = next((o for o in takes if spawn_at <= o.t < until), None)
            out.append(ObjectiveInstance(kind, spawn_at, taken))
    return out


def _scheduled_instances(game: Game) -> list[ObjectiveInstance]:
    out: list[ObjectiveInstance] = []
    for kind, (first, respawn) in SPAWNS.items():
        takes = _takes(game, kind)
        spawn = first
        while spawn < game.duration:
            taken = next((o for o in takes if o.t >= spawn), None)
            out.append(ObjectiveInstance(kind, spawn, taken))
            if taken is None or respawn is None:
                break
            spawn = taken.t + respawn
    return out


def objective_instances(game: Game) -> list[ObjectiveInstance]:
    """Every time an epic monster was up: from the feed's spawns, or from SPAWNS when a game has none."""
    instances = _observed_instances(game) if game.spawns else _scheduled_instances(game)
    return sorted(instances, key=lambda i: i.spawn_at)


def setup_for(index: GameIndex, instance: ObjectiveInstance) -> Setup | None:
    spawn_record = next(
        (
            s
            for s in index.game.spawns
            if INSTANCE_KINDS[s.kind] == instance.kind and s.t >= instance.spawn_at
        ),
        None,
    )
    located = instance.taken or (
        Objective(spawn_record.t, spawn_record.kind, "blue", spawn_record.x, spawn_record.y)
        if spawn_record
        else None
    )
    center = objective_center(instance.kind, located)
    if center is None:
        return None
    spawn = instance.spawn_at
    grouped: dict[Side, float | None] = {}
    for side in SIDES:
        grouped[side] = None
        t = spawn - SETUP_WINDOW
        while t <= spawn:
            if index.near(side, center, PIT_RADIUS, t) >= GROUP_SIZE:
                grouped[side] = t
                break
            t += SAMPLE_STEP
    return Setup(
        instance=instance,
        center=center,
        near_at_spawn={side: index.near(side, center, PIT_RADIUS, spawn) for side in SIDES},
        grouped_at=grouped,
    )
