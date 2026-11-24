import pytest
from pydantic import TypeAdapter, ValidationError

from throughline.plan.models import Draft, LaneItem, PlanItem, item_time
from throughline.plan.text import fmt_gold, fmt_time

BLUE = {"top": "Aatrox", "jungle": "Vi", "mid": "Ahri", "bot": "Ezreal", "support": "Rakan"}
RED = {"top": "Gnar", "jungle": "Sejuani", "mid": "Orianna", "bot": "Kaisa", "support": "Nautilus"}


def test_text_helpers() -> None:
    assert fmt_time(280.0) == "4:40"
    assert fmt_time(3605.0) == "60:05"
    assert fmt_gold(1240.4) == "+1,240"
    assert fmt_gold(-300.0) == "-300"
    assert fmt_gold(0.2) == "0"


def test_draft_sides() -> None:
    draft = Draft(blue=BLUE, red=RED, us="red", patch="15.23")
    assert draft.ours()["mid"] == "Orianna"
    assert draft.theirs()["mid"] == "Ahri"


def test_draft_needs_five_roles() -> None:
    with pytest.raises(ValidationError):
        Draft(blue={"top": "Aatrox"}, red=RED, us="blue", patch=None)


def test_plan_items_round_trip_by_type() -> None:
    adapter = TypeAdapter(PlanItem)
    item = adapter.validate_python(
        {
            "type": "lane",
            "id": "lane-bot",
            "text": "Bot has priority",
            "lane": "bot",
            "until": 480.0,
            "evidence": [{"text": "x", "games": 12}],
        }
    )
    assert isinstance(item, LaneItem)
    assert item.origin == "generated"
    assert item_time(item) == 0.0
    assert adapter.validate_json(adapter.dump_json(item)) == item
