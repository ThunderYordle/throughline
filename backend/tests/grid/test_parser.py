from datetime import UTC, datetime

from tests.grid.feed import FeedBuilder
from throughline.grid.parser import SeriesInfo, parse_series

INFO = SeriesInfo("s1", "LCS - Split 3 2026", datetime(2026, 7, 26, 20, 0, tzinfo=UTC))


def played(feed: FeedBuilder, game_id: str = "g1", number: int = 1) -> FeedBuilder:
    """A game through laning: supports buy the support item, junglers take scuttles."""
    return (
        feed.start_game(game_id, number)
        .buy(10, "15", "i-atlas", "World Atlas")
        .buy(10, "25", "i-atlas", "World Atlas")
        .laning(100, 480, 20)
        .scuttle(490, "12")
        .scuttle(495, "22")
    )


def test_participants_roles_frames_and_result() -> None:
    feed = played(FeedBuilder()).level_up(500, "13").win(1800, "red")
    [game] = parse_series(feed.lines(), INFO).games
    assert (game.meta.game_id, game.meta.game_number, game.meta.tournament) == (
        "g1",
        1,
        "LCS - Split 3 2026",
    )
    assert game.meta.started_at == datetime(2026, 7, 26, 20, 24, 33, tzinfo=UTC)
    assert game.meta.teams == {"blue": "Alpha", "red": "Beta"}
    assert (game.patch, game.winner, game.duration) == ("16.14", "red", 1800.0)
    assert [(p.pid, p.role, p.champion) for p in game.participants[:5]] == [
        (1, "top", "Aatrox"),
        (2, "jungle", "Vi"),
        (3, "mid", "Ahri"),
        (4, "bot", "Ezreal"),
        (5, "support", "Rakan"),
    ]
    assert [p.role for p in game.participants[5:]] == ["top", "jungle", "mid", "bot", "support"]
    assert (game.participant(10).champion, game.participant(10).player_id) == ("Nautilus", "25")
    mid = [f for f in game.frames if f.pid == 3]
    assert (mid[0].t, mid[0].x, mid[0].y, mid[0].gold) == (0.0, 500.0, 500.0, 500)
    assert (mid[-1].t, mid[-1].level) == (1800.0, 2)
    assert all(a.t < b.t for a, b in zip(mid, mid[1:], strict=False))


def test_kills_spawns_objectives_structures_plates_and_items() -> None:
    feed = (
        played(FeedBuilder())
        .npc_spawn(600, "oceanDrake", (9866.0, 4414.0))
        .kill(610, "12", "24", (9500.0, 4300.0), assists=("14", "15"))
        .npc_kill(620, "12", "oceanDrake")
        .plate(630, "21", "mid", 1)
        .plate(640, "100", "bot", 1, by_team=True)
        .destroy(700, "red-turret-bot-1", "14")
        .destroy(1700, "blue-inhibitor-mid", "200", by_team=True)
        .buy(800, "13", "i-ldr", "Lord Dominik's Regards")
        .buy(805, "13", "i-ie", "Infinity Edge")
        .undo_buy(806, "13", "i-ie")
        .win(1800, "blue")
    )
    [game] = parse_series(feed.lines(), INFO).games
    kill = game.kills[0]
    assert (kill.t, kill.killer, kill.victim, kill.assists, kill.x, kill.y) == (
        610.0,
        2,
        9,
        (4, 5),
        9500.0,
        4300.0,
    )
    assert [(s.t, s.kind, s.x) for s in game.spawns] == [(600.0, "dragon", 9866.0)]
    assert [(o.t, o.kind, o.by, o.x) for o in game.objectives] == [(620.0, "dragon", "blue", 9866.0)]
    assert [(p.lane, p.by, p.tier) for p in game.plates] == [("mid", "red", 1), ("bot", "blue", 1)]
    assert [(s.kind, s.lane, s.by) for s in game.structures] == [
        ("turret", "bot", "blue"),
        ("inhibitor", "mid", "red"),
    ]
    assert [(i.t, i.pid, i.item) for i in game.items if i.t > 100] == [(800.0, 3, "Lord Dominik's Regards")]


def test_series_splits_games_and_drops_rolled_back_ones() -> None:
    feed = FeedBuilder().start_game("void", 1).rollback(5, "void")
    played(feed, "g1", 1).win(1500, "blue")
    played(feed, "g2", 2).win(1600, "red")
    result = parse_series(feed.lines(), INFO)
    assert [(g.meta.game_id, g.meta.game_number, g.winner) for g in result.games] == [
        ("g1", 1, "blue"),
        ("g2", 2, "red"),
    ]
    assert result.failures == []


def test_a_benched_substitute_without_a_champion_is_ignored() -> None:
    [game] = parse_series(played(FeedBuilder().bench("blue", "16")).win(1500, "blue").lines(), INFO).games
    assert len(game.participants) == 10
    assert "16" not in {p.player_id for p in game.participants}


def test_unfinished_game_is_a_failure() -> None:
    result = parse_series(played(FeedBuilder()).lines(), INFO)
    assert result.games == []
    assert result.failures == [("g1", "the feed never ends the game")]
