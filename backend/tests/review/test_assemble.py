import pytest

from throughline.game.builder import DEFAULT_CHAMPIONS, GameBuilder
from throughline.game.model import ROLES
from throughline.plan.models import Draft, LaneItem, Plan
from throughline.review.assemble import build_review, side_for_draft

BLUE = dict(zip(ROLES, DEFAULT_CHAMPIONS["blue"], strict=True))
RED = dict(zip(ROLES, DEFAULT_CHAMPIONS["red"], strict=True))


def plan(us: str) -> Plan:
    draft = Draft(blue=BLUE, red=RED, us=us, patch="15.23")  # type: ignore[arg-type]
    return Plan(
        draft=draft,
        items=[LaneItem(id="lane-bot", text="", lane="bot", until=480.0)],
        tempo=[],
        windows=[],
        lanes=[],
        scope_games=1,
    )


def test_side_follows_the_champions_not_the_draft_sides() -> None:
    swapped = GameBuilder(
        champions={"blue": DEFAULT_CHAMPIONS["red"], "red": DEFAULT_CHAMPIONS["blue"]}
    ).build()
    assert side_for_draft(swapped, plan("blue").draft) == "red"
    assert side_for_draft(GameBuilder().build(), plan("red").draft) == "red"


def test_build_review_summarises() -> None:
    game = (
        GameBuilder(duration=1200.0).gold_lead("blue", 1000, 0.0, 400.0).plate(400.0, "bot", "blue").build()
    )
    review = build_review("p1", plan("blue"), game)
    assert review.us == "blue"
    assert review.summary.followed == 1
    assert review.checks[0].item_id == "lane-bot"
    assert review.gold[0] == (0.0, 0)
    assert review.gold[-1][1] == 1000


def test_mismatched_game_is_refused() -> None:
    other = GameBuilder(
        champions={"blue": ["Jax", "Vi", "Ahri", "Ezreal", "Rakan"], "red": DEFAULT_CHAMPIONS["red"]}
    ).build()
    with pytest.raises(ValueError):
        build_review("p1", plan("blue"), other)
