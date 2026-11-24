from pathlib import Path

from throughline.game.builder import GameBuilder
from throughline.store.analytics import AnalyticsStore


def test_round_trip(tmp_path: Path) -> None:
    store = AnalyticsStore(tmp_path / "a.duckdb")
    store.init_schema()
    game = (
        GameBuilder(duration=60.0, game_id="s1-1")
        .kill(30.0, 2, 8, 5000.0, 6000.0, assists=(3, 4))
        .spawn(10.0, "dragon", 9866.0, 4414.0)
        .spawn(12.0, "atakhan")
        .objective(40.0, "dragon", "red", 9866.0, 4414.0)
        .structure(45.0, "turret", "bot", "blue")
        .plate(35.0, "top", "red", tier=2)
        .item(25.0, 4, "Infinity Edge")
        .build()
    )
    store.write_game(game)
    assert store.has_game("s1-1")
    assert store.has_series("s1") and not store.has_series("s2")
    loaded = store.load_game("s1-1")
    assert loaded.participants == game.participants
    assert loaded.frames == game.frames
    assert loaded.kills == game.kills
    assert loaded.spawns == game.spawns
    assert loaded.objectives == game.objectives
    assert loaded.structures == game.structures
    assert loaded.plates == game.plates
    assert loaded.items == game.items
    assert (loaded.patch, loaded.duration, loaded.winner, loaded.meta.teams) == (
        game.patch,
        game.duration,
        game.winner,
        game.meta.teams,
    )


def test_write_replaces_and_lists(tmp_path: Path) -> None:
    store = AnalyticsStore(tmp_path / "a.duckdb")
    store.init_schema()
    store.write_game(GameBuilder(duration=10.0, game_id="s1-1", patch="15.22").build())
    store.write_game(GameBuilder(duration=10.0, game_id="s1-1", patch="15.23").build())
    store.write_game(GameBuilder(duration=10.0, game_id="s2-1", patch="15.23").build())
    summaries = store.list_games()
    assert sorted(s.game_id for s in summaries) == ["s1-1", "s2-1"]
    assert summaries[0].champions["blue"]["mid"] == "Ahri"
    assert store.latest_patch() == "15.23"
    assert store.list_games(q="ahri")[0].game_id in {"s1-1", "s2-1"}
