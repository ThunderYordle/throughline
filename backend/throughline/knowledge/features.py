from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from throughline.game.index import GameIndex
from throughline.game.model import Game, ObjectiveKind, Role, Side, other
from throughline.game.setups import objective_instances

CURVE_MINUTES = (5, 10, 15, 20, 25, 30)
SPIKE_AFTER = 180.0
ROLE_GD_10 = 600.0
ROLE_GD_14 = 840.0
FIRST_TAKES: tuple[ObjectiveKind, ...] = ("dragon", "grubs", "herald", "baron")


@dataclass(frozen=True)
class ParticipantFeatures:
    game_id: str
    started_at: datetime
    patch: str
    side: Side
    role: Role
    champion: str
    opponent: str
    won: bool
    team_gd: dict[int, int | None]
    role_gd10: int | None
    role_gd14: int | None
    level6_at: float | None
    item1_at: float | None
    item2_at: float | None
    gd_after_level6: int | None
    gd_after_item1: int | None
    first_dragon: bool | None
    first_grubs: bool | None
    first_herald: bool | None
    first_baron: bool | None
    dragon_spawn: float | None
    grubs_spawn: float | None
    herald_spawn: float | None
    baron_spawn: float | None


def _first_taker(game: Game, kind: ObjectiveKind) -> Side | None:
    taken = next((o for o in game.objectives if o.kind == kind), None)
    return taken.by if taken else None


def participant_features(game: Game, legendary: set[str]) -> list[ParticipantFeatures]:
    index = GameIndex(game)
    duration = game.duration

    def gd_after(side: Side, t: float | None) -> int | None:
        if t is None or t + SPIKE_AFTER > duration:
            return None
        return index.gold_diff(side, t + SPIKE_AFTER) - index.gold_diff(side, t)

    takers = {kind: _first_taker(game, kind) for kind in FIRST_TAKES}
    spawns: dict[ObjectiveKind, float] = {}
    for instance in objective_instances(game):
        spawns.setdefault(instance.kind, instance.spawn_at)
    rows: list[ParticipantFeatures] = []
    for p in game.participants:
        opponent = game.player(other(p.side), p.role)
        level6 = next((f.t for f in game.frames if f.pid == p.pid and f.level >= 6), None)
        bought: list[float] = []
        seen: set[str] = set()
        for purchase in game.items:
            if purchase.pid == p.pid and purchase.item in legendary and purchase.item not in seen:
                seen.add(purchase.item)
                bought.append(purchase.t)
        item1 = bought[0] if bought else None
        rows.append(
            ParticipantFeatures(
                game_id=game.meta.game_id,
                started_at=game.meta.started_at,
                patch=game.patch,
                side=p.side,
                role=p.role,
                champion=p.champion,
                opponent=opponent.champion,
                won=game.winner == p.side,
                team_gd={
                    m: index.gold_diff(p.side, m * 60.0) if m * 60.0 <= duration else None
                    for m in CURVE_MINUTES
                },
                role_gd10=index.role_gold_diff(p.side, p.role, ROLE_GD_10)
                if duration >= ROLE_GD_10
                else None,
                role_gd14=index.role_gold_diff(p.side, p.role, ROLE_GD_14)
                if duration >= ROLE_GD_14
                else None,
                level6_at=level6,
                item1_at=item1,
                item2_at=bought[1] if len(bought) > 1 else None,
                gd_after_level6=gd_after(p.side, level6),
                gd_after_item1=gd_after(p.side, item1),
                first_dragon=None if takers["dragon"] is None else takers["dragon"] == p.side,
                first_grubs=None if takers["grubs"] is None else takers["grubs"] == p.side,
                first_herald=None if takers["herald"] is None else takers["herald"] == p.side,
                first_baron=None if takers["baron"] is None else takers["baron"] == p.side,
                dragon_spawn=spawns.get("dragon"),
                grubs_spawn=spawns.get("grubs"),
                herald_spawn=spawns.get("herald"),
                baron_spawn=spawns.get("baron"),
            )
        )
    return rows
