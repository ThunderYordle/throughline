from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, Field, model_validator

from throughline.game.model import ROLES, Lane, Role, Side

Owner = Literal["us", "them"]
PlanObjective = Literal["dragon", "grubs", "herald"]
Origin = Literal["generated", "edited", "manual"]


class Evidence(BaseModel):
    text: str
    games: int


class ItemBase(BaseModel):
    id: str
    text: str
    evidence: list[Evidence] = []
    score: float = 0.0
    origin: Origin = "generated"


class ObjectiveItem(ItemBase):
    """Contest an objective: `min_players` near the pit by `by`, and grouped there before the enemy.

    The feed has no wards, so the second promise is about timing, not vision.
    """

    type: Literal["objective"] = "objective"
    objective: PlanObjective
    spawn_at: float
    by: float
    min_players: int = 3


class ConcedeItem(ItemBase):
    type: Literal["concede"] = "concede"
    objective: PlanObjective
    spawn_at: float
    trade_lanes: list[Lane]


class LaneItem(ItemBase):
    type: Literal["lane"] = "lane"
    lane: Lane
    until: float


class WindowItem(ItemBase):
    type: Literal["window"] = "window"
    stance: Literal["force", "avoid"]
    start: float
    end: float


class SpikeItem(ItemBase):
    type: Literal["spike"] = "spike"
    enemy_champion: str
    role: Role
    kind: Literal["level6", "item1"]
    at: float


class SideItem(ItemBase):
    type: Literal["side"] = "side"
    half: Literal["top", "bot"]
    until: float


PlanItem = Annotated[
    ObjectiveItem | ConcedeItem | LaneItem | WindowItem | SpikeItem | SideItem,
    Field(discriminator="type"),
]


def item_time(item: PlanItem) -> float:
    match item:
        case ObjectiveItem() | ConcedeItem():
            return item.spawn_at
        case WindowItem():
            return item.start
        case SpikeItem():
            return item.at
        case _:
            return 0.0


class Draft(BaseModel):
    blue: dict[Role, str]
    red: dict[Role, str]
    us: Side
    patch: str | None = None

    @model_validator(mode="after")
    def _five_roles(self) -> Draft:
        for side in (self.blue, self.red):
            if set(side) != set(ROLES) or not all(side.values()):
                raise ValueError("each side needs a champion for top, jungle, mid, bot and support")
        return self

    def ours(self) -> dict[Role, str]:
        return self.blue if self.us == "blue" else self.red

    def theirs(self) -> dict[Role, str]:
        return self.red if self.us == "blue" else self.blue


class TempoPoint(BaseModel):
    minute: int
    value: float
    games: int


class Window(BaseModel):
    start: float
    end: float
    owner: Owner
    peak: float
    games: int


class LanePriority(BaseModel):
    lane: Lane
    owner: Owner | None
    value: float
    games: int
    detail: str


class Plan(BaseModel):
    draft: Draft
    items: list[PlanItem]
    tempo: list[TempoPoint]
    windows: list[Window]
    lanes: list[LanePriority]
    scope_games: int
