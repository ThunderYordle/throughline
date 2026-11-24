from dataclasses import replace
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

from throughline.knowledge.base import KnowledgeBase, patch_key, shrink
from throughline.knowledge.features import CURVE_MINUTES, ParticipantFeatures
from throughline.store.analytics import AnalyticsStore

T0 = datetime(2026, 10, 1, tzinfo=UTC)


def row(n: int, **overrides: object) -> ParticipantFeatures:
    base = ParticipantFeatures(
        game_id=f"g{n}",
        started_at=T0 + timedelta(days=n),
        patch="15.23",
        side="blue",
        role="mid",
        champion="Ahri",
        opponent="Orianna",
        won=True,
        team_gd={m: 0 for m in CURVE_MINUTES},
        role_gd10=0,
        role_gd14=0,
        level6_at=400.0,
        item1_at=800.0,
        item2_at=None,
        gd_after_level6=0,
        gd_after_item1=0,
        first_dragon=None,
        first_grubs=None,
        first_herald=None,
        first_baron=None,
        dragon_spawn=294.0,
        grubs_spawn=473.0,
        herald_spawn=897.0,
        baron_spawn=1180.0,
    )
    return replace(base, **overrides)  # type: ignore[arg-type]


@pytest.fixture
def store(tmp_path: Path) -> AnalyticsStore:
    s = AnalyticsStore(tmp_path / "a.duckdb")
    s.init_schema()
    return s


def write(store: AnalyticsStore, rows: list[ParticipantFeatures]) -> None:
    for r in rows:
        store.write_features(r.game_id + r.side + r.role, [r])


def test_shrink_and_patch_key() -> None:
    assert shrink(500.0, 20) == 250.0
    assert shrink(500.0, 0) == 0.0
    assert patch_key("15.9") < patch_key("15.10")


def test_curve_is_shrunk_by_sample(store: AnalyticsStore) -> None:
    write(store, [row(n, team_gd={m: 500 for m in CURVE_MINUTES}) for n in range(20)])
    kb = KnowledgeBase(store, "15.23", min_scope_games=1)
    stat = kb.curve("mid", "Ahri")[10]
    assert (stat.value, stat.games) == (250.0, 20)
    assert kb.curve("mid", "Zed")[10].games == 0


def test_patch_window_and_time_split(store: AnalyticsStore) -> None:
    rows = [
        row(1, patch="15.20", role_gd10=1000),
        row(2, patch="15.21", role_gd10=100),
        row(3, patch="15.22", role_gd10=100),
        row(4, patch="15.23", role_gd10=100),
        row(5, patch="15.23", role_gd10=100),
        row(6, patch="15.24", role_gd10=100),
    ]
    write(store, rows)
    kb = KnowledgeBase(store, "15.23", before=T0 + timedelta(days=5), min_scope_games=1)
    assert kb.patches == ["15.21", "15.22", "15.23"]
    assert kb.scope_games == 3  # g2, g3, g4: g5 is not before day 5, g1 is outside the window
    season = KnowledgeBase(store, "15.23", min_scope_games=5)
    assert season.patches == ["15.20", "15.21", "15.22", "15.23"]
    assert season.scope_games == 5
    fallback = KnowledgeBase(store, "15.23", min_scope_games=100)
    assert fallback.patches == []
    assert fallback.scope_games == 6


def test_matchup_needs_enough_games(store: AnalyticsStore) -> None:
    write(store, [row(n, role_gd10=300) for n in range(4)])
    kb = KnowledgeBase(store, "15.23", min_scope_games=1)
    assert kb.matchup("mid", "Ahri", "Orianna") is None
    write(store, [row(10 + n, role_gd10=300) for n in range(2)])
    kb = KnowledgeBase(store, "15.23", min_scope_games=1)
    matchup = kb.matchup("mid", "Ahri", "Orianna")
    assert matchup is not None and (matchup.value, matchup.games) == (300.0, 6)


def test_spike_and_tendency(store: AnalyticsStore) -> None:
    write(
        store, [row(n, level6_at=380.0 + n, gd_after_level6=400, first_dragon=n % 4 != 0) for n in range(20)]
    )
    kb = KnowledgeBase(store, "15.23", min_scope_games=1)
    spike = kb.spike("mid", "Ahri", "level6")
    assert spike is not None
    assert spike.at == pytest.approx(389.5)
    assert spike.gd_after == pytest.approx(200.0)
    assert kb.tendency("Ahri", "dragon").value == pytest.approx(shrink(0.75 - 0.5, 20))
    assert kb.spike("mid", "Zed", "level6") is None


def test_first_spawn_is_the_median_in_scope(store: AnalyticsStore) -> None:
    write(store, [row(n, dragon_spawn=290.0 + n % 3) for n in range(12)])
    kb = KnowledgeBase(store, "15.23", min_scope_games=1)
    assert kb.first_spawn("dragon") == 291.0
    assert kb.first_spawn("baron") == 1180.0
    few = KnowledgeBase(store, "15.23", before=T0 + timedelta(days=5), min_scope_games=1)
    assert few.first_spawn("dragon") is None  # fewer than MIN_SPAWN_GAMES games


def test_first_spawn_reads_the_season_even_when_statistics_widen(store: AnalyticsStore) -> None:
    write(store, [row(n, patch="15.23", baron_spawn=1480.0) for n in range(12)])
    write(store, [row(20 + n, patch="16.1", baron_spawn=1180.0) for n in range(12)])
    kb = KnowledgeBase(store, "16.1", min_scope_games=100)
    assert kb.patches == []  # champion statistics use every game...
    assert kb.first_spawn("baron") == 1180.0  # ...spawn times stay in the season
