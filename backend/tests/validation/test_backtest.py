from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

from tests.plan.fake_knowledge import FakeKnowledge
from throughline.game.builder import DEFAULT_CHAMPIONS, GameBuilder
from throughline.store.analytics import AnalyticsStore
from throughline.validation.backtest import CheckRow, SideResult, adherence, run_backtest, summarize

T0 = datetime(2026, 9, 1, tzinfo=UTC)


def test_adherence() -> None:
    assert adherence(["followed", "partly", "not_followed", "not_applicable"]) == pytest.approx(0.5)
    assert adherence(["not_applicable"]) is None


def test_backtest_only_reads_the_past(tmp_path: Path) -> None:
    store = AnalyticsStore(tmp_path / "a.duckdb")
    store.init_schema()
    for n in range(4):
        game = GameBuilder(
            duration=900.0,
            game_id=f"g{n}",
            started_at=T0 + timedelta(days=n),
        ).build()
        store.write_game(game)
    seen: list[datetime | None] = []

    def knowledge(s: AnalyticsStore, patch: str, before: datetime | None) -> FakeKnowledge:
        seen.append(before)
        return FakeKnowledge(edges={DEFAULT_CHAMPIONS["blue"][3]: 300.0})

    sides, checks = run_backtest(store, knowledge=knowledge, min_prior_games=2)
    assert seen == [T0 + timedelta(days=2), T0 + timedelta(days=3)]
    assert {(s.game_id, s.side) for s in sides} == {
        ("g2", "blue"),
        ("g2", "red"),
        ("g3", "blue"),
        ("g3", "red"),
    }
    assert all(c.game_id in {"g2", "g3"} for c in checks)


def test_summarize_quartiles_and_adjusted_difference() -> None:
    late = T0 + timedelta(days=100)
    sides = [SideResult(f"g{n}", late, "blue", n % 2 == 0, n / 10, 4) for n in range(10)]
    checks = (
        [CheckRow(f"f{n}", late, "blue", True, "lane", "followed", 0) for n in range(6)]
        + [CheckRow(f"f{n}", late, "blue", False, "lane", "followed", 0) for n in range(6, 10)]
        + [CheckRow(f"n{n}", late, "blue", True, "lane", "not_followed", 0) for n in range(4)]
        + [CheckRow(f"n{n}", late, "blue", False, "lane", "not_followed", 0) for n in range(4, 10)]
        + [CheckRow("early", T0, "blue", True, "lane", "followed", 0)]
    )
    report = summarize(sides, checks, holdout_from=T0 + timedelta(days=50))
    assert report["sides"] == 10
    assert sum(q["sides"] for q in report["adherence_quartiles"]) == 10
    lane = next(t for t in report["by_type"] if t["type"] == "lane")
    assert (lane["followed"], lane["not_followed"]) == (10, 10)
    assert lane["followed_win_rate"] == pytest.approx(0.6)
    assert lane["not_followed_win_rate"] == pytest.approx(0.4)
    assert lane["adjusted_difference"] == pytest.approx(0.2)
