from __future__ import annotations

from dataclasses import dataclass

from throughline.game.geometry import dist
from throughline.game.index import GameIndex
from throughline.game.model import SIDES, Game, Kill, Side, other

FIGHT_GAP = 15.0
FIGHT_JOIN_RADIUS = 3000.0
PRESENT_RADIUS = 2500.0
PRESENT_LOOKBACK = 2.0


@dataclass(frozen=True)
class Fight:
    start: float
    end: float
    x: float
    y: float
    kills: dict[Side, int]
    present: dict[Side, int]

    def winner(self) -> Side | None:
        if self.kills["blue"] == self.kills["red"]:
            return None
        return "blue" if self.kills["blue"] > self.kills["red"] else "red"


def kill_side(game: Game, kill: Kill) -> Side:
    """The side that scored the kill."""
    return other(game.side_of(kill.victim))


def detect_fights(index: GameIndex) -> list[Fight]:
    groups: list[list[Kill]] = []
    for kill in index.game.kills:
        if groups:
            current = groups[-1]
            cx = sum(k.x for k in current) / len(current)
            cy = sum(k.y for k in current) / len(current)
            if kill.t - current[-1].t <= FIGHT_GAP and dist((kill.x, kill.y), (cx, cy)) <= FIGHT_JOIN_RADIUS:
                current.append(kill)
                continue
        groups.append([kill])

    fights: list[Fight] = []
    for group in groups:
        x = sum(k.x for k in group) / len(group)
        y = sum(k.y for k in group) / len(group)
        kills: dict[Side, int] = {"blue": 0, "red": 0}
        for k in group:
            kills[kill_side(index.game, k)] += 1
        present = {
            side: max(index.near(side, (x, y), PRESENT_RADIUS, k.t - PRESENT_LOOKBACK) for k in group)
            for side in SIDES
        }
        fights.append(Fight(group[0].t, group[-1].t, x, y, kills, present))
    return fights
