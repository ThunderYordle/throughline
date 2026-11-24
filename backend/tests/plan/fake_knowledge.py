from __future__ import annotations

from dataclasses import dataclass, field

from throughline.game.model import Role
from throughline.knowledge.base import Spike, SpikeKind, Stat, TendencyKind
from throughline.knowledge.features import CURVE_MINUTES


@dataclass
class FakeKnowledge:
    games: int = 60
    scope_games: int = 600
    curves: dict[str, dict[int, float]] = field(default_factory=dict)  # champion -> minute -> gold
    edges: dict[str, float] = field(default_factory=dict)  # champion -> role gd at 10
    matchups: dict[tuple[str, str], float] = field(default_factory=dict)
    spikes: dict[tuple[str, SpikeKind], tuple[float, float]] = field(default_factory=dict)  # (at, gd_after)
    tendencies: dict[tuple[str, TendencyKind], float] = field(default_factory=dict)
    spawns: dict[TendencyKind, float] = field(default_factory=dict)  # objective -> first spawn

    def curve(self, role: Role, champion: str) -> dict[int, Stat]:
        values = self.curves.get(champion, {})
        return {m: Stat(values.get(m, 0.0), self.games) for m in CURVE_MINUTES}

    def role_edge(self, role: Role, champion: str) -> Stat:
        return Stat(self.edges.get(champion, 0.0), self.games)

    def matchup(self, role: Role, champion: str, opponent: str) -> Stat | None:
        value = self.matchups.get((champion, opponent))
        return Stat(value, self.games) if value is not None else None

    def spike(self, role: Role, champion: str, kind: SpikeKind) -> Spike | None:
        found = self.spikes.get((champion, kind))
        return Spike(found[0], found[1], self.games) if found else None

    def tendency(self, champion: str, objective: TendencyKind) -> Stat:
        return Stat(self.tendencies.get((champion, objective), 0.0), self.games)

    def first_spawn(self, objective: TendencyKind) -> float | None:
        return self.spawns.get(objective)
