from __future__ import annotations

from datetime import UTC, datetime
from typing import Self

from throughline.game.geometry import FOUNTAIN, Point
from throughline.game.model import (
    ROLES,
    Frame,
    Game,
    GameMeta,
    ItemPurchase,
    Kill,
    Lane,
    Objective,
    ObjectiveKind,
    Participant,
    Plate,
    Side,
    Spawn,
    Structure,
    StructureKind,
)

DEFAULT_CHAMPIONS: dict[Side, list[str]] = {
    "blue": ["Aatrox", "Vi", "Ahri", "Ezreal", "Rakan"],
    "red": ["Gnar", "Sejuani", "Orianna", "Kaisa", "Nautilus"],
}


def _side(pid: int) -> Side:
    return "blue" if pid <= 5 else "red"


class GameBuilder:
    """Builds exact games for tests and synthetic data. Every player has a frame every second."""

    def __init__(
        self,
        duration: float = 1800.0,
        winner: Side = "blue",
        patch: str = "16.14",
        started_at: datetime = datetime(2026, 11, 1, tzinfo=UTC),
        champions: dict[Side, list[str]] | None = None,
        game_id: str = "g1",
        tournament: str = "Test Cup",
    ) -> None:
        self.duration = duration
        self.winner = winner
        self.patch = patch
        self.started_at = started_at
        self.champions = champions or DEFAULT_CHAMPIONS
        self.game_id = game_id
        self.tournament = tournament
        self._pos: dict[tuple[int, int], tuple[float, float, bool]] = {}
        self._gold_leads: list[tuple[Side, int, float, float]] = []
        self.kills: list[Kill] = []
        self.spawns: list[Spawn] = []
        self.objectives: list[Objective] = []
        self.structures: list[Structure] = []
        self.plates: list[Plate] = []
        self.items: list[ItemPurchase] = []

    def at(self, pid: int, t: float, x: float, y: float, alive: bool = True) -> Self:
        self._pos[(pid, int(t))] = (x, y, alive)
        return self

    def walk(self, pid: int, t0: float, t1: float, start: Point, end: Point) -> Self:
        steps = max(1, int(t1) - int(t0))
        for i in range(steps + 1):
            u = i / steps
            self.at(pid, t0 + i, start[0] + (end[0] - start[0]) * u, start[1] + (end[1] - start[1]) * u)
        return self

    def dead(self, pid: int, t0: float, t1: float) -> Self:
        x, y = FOUNTAIN[_side(pid)]
        for t in range(int(t0), int(t1) + 1):
            self._pos[(pid, t)] = (x, y, False)
        return self

    def gold_lead(self, side: Side, amount: int, t0: float, t1: float) -> Self:
        """`side` gains `amount` extra team gold, linearly from t0 to t1, and keeps it."""
        self._gold_leads.append((side, amount, t0, t1))
        return self

    def kill(
        self, t: float, killer: int | None, victim: int, x: float, y: float, assists: tuple[int, ...] = ()
    ) -> Self:
        self.kills.append(Kill(t, killer, victim, assists, x, y))
        return self

    def spawn(self, t: float, kind: ObjectiveKind, x: float | None = None, y: float | None = None) -> Self:
        self.spawns.append(Spawn(t, kind, x, y))
        return self

    def objective(
        self, t: float, kind: ObjectiveKind, by: Side, x: float | None = None, y: float | None = None
    ) -> Self:
        self.objectives.append(Objective(t, kind, by, x, y))
        return self

    def structure(self, t: float, kind: StructureKind, lane: Lane | None, by: Side) -> Self:
        self.structures.append(Structure(t, kind, lane, by))
        return self

    def plate(self, t: float, lane: Lane, by: Side, tier: int = 1) -> Self:
        self.plates.append(Plate(t, lane, by, tier))
        return self

    def item(self, t: float, pid: int, item: str) -> Self:
        self.items.append(ItemPurchase(t, pid, item))
        return self

    def _extra_gold(self, side: Side, t: float) -> float:
        total = 0.0
        for lead_side, amount, t0, t1 in self._gold_leads:
            if lead_side != side or t < t0:
                continue
            u = 1.0 if t >= t1 or t1 == t0 else (t - t0) / (t1 - t0)
            total += amount * u
        return total / 5.0

    def build(self) -> Game:
        participants = tuple(
            Participant(
                pid,
                _side(pid),
                ROLES[(pid - 1) % 5],
                self.champions[_side(pid)][(pid - 1) % 5],
                f"P{pid}",
                f"grid-{pid}",
            )
            for pid in range(1, 11)
        )
        frames: list[Frame] = []
        last: dict[int, tuple[float, float, bool]] = {}
        for t in range(int(self.duration) + 1):
            for pid in range(1, 11):
                side = _side(pid)
                pos = self._pos.get((pid, t))
                if pos is None:
                    # No explicit frame: stay where the player last was, alive.
                    lx, ly, _ = last.get(pid, (*FOUNTAIN[side], True))
                    pos = (lx, ly, True)
                last[pid] = pos
                gold = int(500 + 6 * t + self._extra_gold(side, float(t)))
                frames.append(Frame(float(t), pid, pos[0], pos[1], pos[2], gold, min(18, 1 + t // 90)))
        meta = GameMeta(
            self.game_id,
            self.game_id.split("-")[0],
            1,
            self.tournament,
            self.started_at,
            {"blue": "Blue Team", "red": "Red Team"},
        )
        return Game(
            meta=meta,
            patch=self.patch,
            duration=self.duration,
            winner=self.winner,
            participants=participants,
            frames=frames,
            kills=sorted(self.kills, key=lambda k: k.t),
            spawns=sorted(self.spawns, key=lambda s: s.t),
            objectives=sorted(self.objectives, key=lambda o: o.t),
            structures=sorted(self.structures, key=lambda s: s.t),
            plates=sorted(self.plates, key=lambda p: p.t),
            items=sorted(self.items, key=lambda i: i.t),
        )
