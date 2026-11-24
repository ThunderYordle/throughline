from tests.plan.fake_knowledge import FakeKnowledge
from throughline.plan.generator import build_plan
from throughline.plan.models import ConcedeItem, Draft, ObjectiveItem, item_time

BLUE = {"top": "Aatrox", "jungle": "Vi", "mid": "Ahri", "bot": "Ezreal", "support": "Rakan"}
RED = {"top": "Gnar", "jungle": "Sejuani", "mid": "Orianna", "bot": "Kaisa", "support": "Nautilus"}
DRAFT = Draft(blue=BLUE, red=RED, us="blue", patch="15.23")


def early_blue() -> FakeKnowledge:
    return FakeKnowledge(
        curves={c: {5: 400.0, 10: 400.0, 15: 400.0} for c in BLUE.values()},
        edges={"Ezreal": 300.0},
        spikes={("Orianna", "level6"): (380.0, 400.0)},
    )


def test_early_draft_plan() -> None:
    plan = build_plan(early_blue(), DRAFT)
    ids = {i.id for i in plan.items}
    assert ids == {
        "objective-dragon",
        "objective-grubs",
        "objective-herald",
        "lane-bot",
        "window-1",
        "spike-mid-level6",
        "side",
    }
    dragon = next(i for i in plan.items if i.id == "objective-dragon")
    assert isinstance(dragon, ObjectiveItem)
    assert dragon.by == 280.0
    assert dragon.text == "Contest first dragon (5:00): 3+ near the pit by 4:40, grouped there before them."
    assert all(e.games == 60 for e in dragon.evidence)
    times = [item_time(i) for i in plan.items]
    assert times == sorted(times)
    assert plan.scope_games == 600


def test_objective_times_follow_the_seasons_spawns() -> None:
    kb = early_blue()
    kb.spawns = {"dragon": 294.0}
    dragon = next(i for i in build_plan(kb, DRAFT).items if i.id == "objective-dragon")
    assert isinstance(dragon, ObjectiveItem)
    assert (dragon.spawn_at, dragon.by) == (294.0, 274.0)
    assert dragon.text.startswith("Contest first dragon (4:54): 3+ near the pit by 4:34")


def test_late_draft_concedes_dragon_and_trades() -> None:
    kb = FakeKnowledge(curves={c: {5: 400.0, 10: 400.0} for c in RED.values()}, edges={"Aatrox": 300.0})
    plan = build_plan(kb, DRAFT)
    dragon = next(i for i in plan.items if i.id == "objective-dragon")
    assert isinstance(dragon, ConcedeItem)
    assert dragon.trade_lanes == ["top"]
    assert any(i.id == "window-1" and i.type == "window" and i.stance == "avoid" for i in plan.items)


def test_thin_samples_produce_no_items() -> None:
    kb = early_blue()
    kb.games = 5
    assert build_plan(kb, DRAFT).items == []


def test_at_most_eight_items() -> None:
    kb = early_blue()
    kb.spikes.update({("Gnar", "level6"): (400.0, 500.0), ("Kaisa", "level6"): (420.0, 500.0)})
    kb.spikes[("Kaisa", "item1")] = (800.0, 500.0)
    assert len(build_plan(kb, DRAFT).items) == 8
