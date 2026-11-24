"""Role inference: the feed carries no roles, so each team's five players are matched to the five roles."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from itertools import permutations

from throughline.game.model import ROLE_LANE, ROLES, Lane, Role

SUPPORT_ITEM_WEIGHT = 3.0  # buying the support item is near-certain evidence
LANE_WEIGHT = 2.0
JUNGLE_WEIGHT = 2.0
SCUTTLE_WEIGHT = 0.5
MAX_SCUTTLES = 4


@dataclass(frozen=True)
class RoleEvidence:
    player_id: str
    lane_share: dict[Lane, float]  # share of early observations in each lane
    offlane_share: float  # share of early observations in no lane
    scuttles: int
    support_item: bool


def role_score(evidence: RoleEvidence, role: Role) -> float:
    if role == "support":
        return SUPPORT_ITEM_WEIGHT * evidence.support_item + evidence.lane_share.get("bot", 0.0)
    if role == "jungle":
        return JUNGLE_WEIGHT * evidence.offlane_share + SCUTTLE_WEIGHT * min(evidence.scuttles, MAX_SCUTTLES)
    lane = ROLE_LANE[role]
    assert lane is not None
    score = LANE_WEIGHT * evidence.lane_share.get(lane, 0.0)
    if role == "bot":
        score -= SUPPORT_ITEM_WEIGHT * evidence.support_item
    return score


def assign_roles(team: Sequence[RoleEvidence]) -> dict[str, Role]:
    """The assignment of the five roles to the five players with the highest total score."""
    if len(team) != len(ROLES):
        raise ValueError(f"a team needs {len(ROLES)} players, got {len(team)}")
    best = max(
        permutations(ROLES),
        key=lambda roles: sum(role_score(e, r) for e, r in zip(team, roles, strict=True)),
    )
    return {e.player_id: r for e, r in zip(team, best, strict=True)}
