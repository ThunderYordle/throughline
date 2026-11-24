from __future__ import annotations

from dataclasses import dataclass

from throughline.game.fights import Fight, detect_fights
from throughline.game.index import GameIndex
from throughline.game.model import Game, Side, other
from throughline.game.setups import ObjectiveInstance, objective_instances


@dataclass
class ReviewContext:
    game: Game
    index: GameIndex
    us: Side
    fights: list[Fight]
    instances: list[ObjectiveInstance]

    @classmethod
    def build(cls, game: Game, us: Side) -> ReviewContext:
        index = GameIndex(game)
        return cls(game, index, us, detect_fights(index), objective_instances(game))

    @property
    def them(self) -> Side:
        return other(self.us)
