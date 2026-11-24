import pytest

from throughline.game.roles import RoleEvidence, assign_roles


def test_items_lanes_and_scuttles_decide_roles() -> None:
    team = [
        RoleEvidence("a", {"bot": 0.8}, 0.1, 0, True),
        RoleEvidence("b", {"top": 0.9}, 0.1, 0, False),
        RoleEvidence("c", {}, 0.9, 3, False),
        RoleEvidence("d", {"bot": 0.9}, 0.0, 0, False),
        RoleEvidence("e", {"mid": 0.85}, 0.1, 0, False),
    ]
    assert assign_roles(team) == {"a": "support", "b": "top", "c": "jungle", "d": "bot", "e": "mid"}


def test_without_the_support_item_the_bot_laner_has_more_bot_lane_time() -> None:
    team = [
        RoleEvidence("a", {"bot": 0.6}, 0.3, 0, False),
        RoleEvidence("b", {"top": 0.9}, 0.1, 0, False),
        RoleEvidence("c", {}, 0.9, 2, False),
        RoleEvidence("d", {"bot": 0.9}, 0.0, 0, False),
        RoleEvidence("e", {"mid": 0.85}, 0.1, 0, False),
    ]
    roles = assign_roles(team)
    assert (roles["a"], roles["d"]) == ("support", "bot")


def test_needs_five_players() -> None:
    with pytest.raises(ValueError):
        assign_roles([RoleEvidence("a", {}, 1.0, 0, False)])
