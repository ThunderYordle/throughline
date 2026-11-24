from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from tests.plan.fake_knowledge import FakeKnowledge
from throughline.api.app import create_app
from throughline.game.builder import DEFAULT_CHAMPIONS, GameBuilder
from throughline.settings import Settings
from throughline.store.analytics import AnalyticsStore
from throughline.store.app import AppStore


def fake_knowledge(store: AnalyticsStore, patch: str, before: datetime | None) -> FakeKnowledge:
    return FakeKnowledge(
        curves={c: {5: 400.0, 10: 400.0, 15: 400.0} for c in DEFAULT_CHAMPIONS["blue"]},
        edges={"Ezreal": 300.0},
    )


@pytest.fixture
def store(tmp_path: Path) -> AnalyticsStore:
    store = AnalyticsStore(tmp_path / "a.duckdb")
    store.init_schema()
    store.write_game(
        GameBuilder(duration=120.0, game_id="g1", started_at=datetime(2026, 11, 1, tzinfo=UTC))
        .spawn(30.0, "dragon", 9866.0, 4414.0)
        .kill(60.0, 2, 8, 5000.0, 5000.0)
        .objective(90.0, "dragon", "blue")
        .build()
    )
    store.write_game(
        GameBuilder(duration=120.0, game_id="g2", started_at=datetime(2026, 11, 2, tzinfo=UTC)).build()
    )
    return store


@pytest.fixture
def client(tmp_path: Path, store: AnalyticsStore) -> Iterator[TestClient]:
    settings = Settings(tmp_path, tmp_path / "a.duckdb", tmp_path / "app.sqlite", None, None)
    app_store = AppStore(tmp_path / "app.sqlite")
    with TestClient(
        create_app(settings, analytics=store, app_store=app_store, knowledge=fake_knowledge)
    ) as client:
        yield client
