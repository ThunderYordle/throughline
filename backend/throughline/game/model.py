from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal

Side = Literal["blue", "red"]
Role = Literal["top", "jungle", "mid", "bot", "support"]
Lane = Literal["top", "mid", "bot"]
ObjectiveKind = Literal["dragon", "elder", "grubs", "herald", "baron", "atakhan"]
StructureKind = Literal["turret", "inhibitor", "nexus"]

SIDES: tuple[Side, Side] = ("blue", "red")
ROLES: tuple[Role, ...] = ("top", "jungle", "mid", "bot", "support")
LANES: tuple[Lane, ...] = ("top", "mid", "bot")
ROLE_LANE: dict[Role, Lane | None] = {
    "top": "top",
    "jungle": None,
    "mid": "mid",
    "bot": "bot",
    "support": "bot",
}
LANE_ROLES: dict[Lane, tuple[Role, ...]] = {"top": ("top",), "mid": ("mid",), "bot": ("bot", "support")}


def other(side: Side) -> Side:
    return "red" if side == "blue" else "blue"


@dataclass(frozen=True)
class Participant:
    """pid is 1-5 for blue and 6-10 for red, in ROLES order; player_id is GRID's player id."""

    pid: int
    side: Side
    role: Role
    champion: str
    player: str
    player_id: str


@dataclass(frozen=True)
class Frame:
    """One observation of a player. The feed samples irregularly (about every 2 s, gaps up to a minute)."""

    t: float
    pid: int
    x: float
    y: float
    alive: bool
    gold: int
    level: int


@dataclass(frozen=True)
class Kill:
    t: float
    killer: int | None
    victim: int
    assists: tuple[int, ...]
    x: float
    y: float


@dataclass(frozen=True)
class Spawn:
    """An epic monster appearing on the map, as the feed reports it. Grubs spawn as three records."""

    t: float
    kind: ObjectiveKind
    x: float | None
    y: float | None


@dataclass(frozen=True)
class Objective:
    """An epic monster taken. Grubs are one record per grub."""

    t: float
    kind: ObjectiveKind
    by: Side
    x: float | None
    y: float | None


@dataclass(frozen=True)
class Structure:
    t: float
    kind: StructureKind
    lane: Lane | None
    by: Side


@dataclass(frozen=True)
class Plate:
    """A turret plate taken by `by` in `lane`; tier is the turret's tier as the feed names it."""

    t: float
    lane: Lane
    by: Side
    tier: int = 1


@dataclass(frozen=True)
class ItemPurchase:
    t: float
    pid: int
    item: str


@dataclass(frozen=True)
class GameMeta:
    game_id: str
    series_id: str
    game_number: int
    tournament: str
    started_at: datetime
    teams: dict[Side, str]


@dataclass
class Game:
    meta: GameMeta
    patch: str
    duration: float
    winner: Side
    participants: tuple[Participant, ...]
    frames: list[Frame] = field(default_factory=list)
    kills: list[Kill] = field(default_factory=list)
    spawns: list[Spawn] = field(default_factory=list)
    objectives: list[Objective] = field(default_factory=list)
    structures: list[Structure] = field(default_factory=list)
    plates: list[Plate] = field(default_factory=list)
    items: list[ItemPurchase] = field(default_factory=list)

    def participant(self, pid: int) -> Participant:
        for p in self.participants:
            if p.pid == pid:
                return p
        raise KeyError(pid)

    def side_of(self, pid: int) -> Side:
        return self.participant(pid).side

    def player(self, side: Side, role: Role) -> Participant:
        for p in self.participants:
            if p.side == side and p.role == role:
                return p
        raise KeyError((side, role))

    def champions(self, side: Side) -> dict[Role, str]:
        return {p.role: p.champion for p in self.participants if p.side == side}
