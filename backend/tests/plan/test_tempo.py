import pytest

from tests.plan.fake_knowledge import FakeKnowledge
from throughline.plan.models import Draft
from throughline.plan.tempo import draft_tempo, lane_priorities, tempo_at, windows

BLUE = {"top": "Aatrox", "jungle": "Vi", "mid": "Ahri", "bot": "Ezreal", "support": "Rakan"}
RED = {"top": "Gnar", "jungle": "Sejuani", "mid": "Orianna", "bot": "Kaisa", "support": "Nautilus"}
DRAFT = Draft(blue=BLUE, red=RED, us="blue", patch="15.23")


def test_tempo_is_mean_of_ours_minus_mean_of_theirs() -> None:
    kb = FakeKnowledge(curves={"Vi": {5: 1000.0}, "Sejuani": {5: 500.0}})
    points = draft_tempo(kb, DRAFT)
    assert points[0].minute == 5
    assert points[0].value == pytest.approx(100.0)  # (1000 - 500) / 5
    assert points[0].games == 60


def test_tempo_at_interpolates_from_zero() -> None:
    kb = FakeKnowledge(curves={c: {5: 500.0, 10: 1000.0} for c in BLUE.values()})
    points = draft_tempo(kb, DRAFT)
    assert tempo_at(points, 150.0) == pytest.approx(250.0)
    assert tempo_at(points, 450.0) == pytest.approx(750.0)
    assert tempo_at(points, 5000.0) == pytest.approx(0.0)


def test_windows_merge_and_take_owner() -> None:
    kb = FakeKnowledge(
        curves={
            **{c: {5: 400.0, 10: 400.0} for c in BLUE.values()},
            **{c: {25: 400.0, 30: 400.0} for c in RED.values()},
        }
    )
    found = windows(draft_tempo(kb, DRAFT))
    assert [(w.start, w.end, w.owner) for w in found] == [(150.0, 750.0, "us"), (1350.0, 1950.0, "them")]
    assert found[0].peak == pytest.approx(400.0)


def test_lane_priorities_prefer_matchups() -> None:
    kb = FakeKnowledge(
        edges={"Ezreal": 400.0, "Rakan": 0.0, "Aatrox": 100.0}, matchups={("Ahri", "Orianna"): -200.0}
    )
    lanes = lane_priorities(kb, DRAFT)
    assert (lanes["bot"].owner, lanes["bot"].value) == ("us", 200.0)
    assert lanes["top"].owner is None
    assert (lanes["mid"].owner, lanes["mid"].value) == ("them", -200.0)
    assert "Ahri vs Orianna" in lanes["mid"].detail
