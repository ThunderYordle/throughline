from pathlib import Path

from throughline.plan.models import Draft, Plan
from throughline.review.assemble import EntryState, ReviewBody, ReviewSummary
from throughline.store.app import AppStore

BLUE = {"top": "Aatrox", "jungle": "Vi", "mid": "Ahri", "bot": "Ezreal", "support": "Rakan"}
RED = {"top": "Gnar", "jungle": "Sejuani", "mid": "Orianna", "bot": "Kaisa", "support": "Nautilus"}


def test_plans_round_trip_and_token(tmp_path: Path) -> None:
    store = AppStore(tmp_path / "app.sqlite")
    plan = Plan(
        draft=Draft(blue=BLUE, red=RED, us="blue", patch="15.23"),
        items=[],
        tempo=[],
        windows=[],
        lanes=[],
        scope_games=10,
    )
    plan_id, token = store.create_plan(plan)
    assert store.get_plan(plan_id) == plan
    assert store.get_plan("missing") is None
    changed = plan.model_copy(update={"scope_games": 11})
    assert store.update_plan(plan_id, "wrong", changed) is False
    assert store.update_plan(plan_id, token, changed) is True
    stored = store.get_plan(plan_id)
    assert stored is not None and stored.scope_games == 11


def test_reviews_and_entries(tmp_path: Path) -> None:
    store = AppStore(tmp_path / "app.sqlite")
    body = ReviewBody(
        plan_id="p",
        game_id="g",
        us="blue",
        teams={"blue": "A", "red": "B"},
        checks=[],
        moments=[],
        summary=ReviewSummary(followed=0, partly=0, not_followed=0, not_applicable=0),
        gold=[],
    )
    review_id, token = store.create_review(body)
    assert store.get_review(review_id) == body
    assert store.set_entry(review_id, "bad", "e1", EntryState(status="confirmed", note="")) is False
    assert store.set_entry(review_id, token, "e1", EntryState(status="dismissed", note="n")) is True
    assert store.set_entry(review_id, token, "e1", EntryState(status=None, note="n2")) is True
    assert store.entries(review_id) == {"e1": EntryState(status=None, note="n2")}
