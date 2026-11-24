from fastapi.testclient import TestClient

from throughline.api.replay import replay_payload
from throughline.game.builder import GameBuilder
from throughline.store.analytics import AnalyticsStore


def test_games_list_newest_first(client: TestClient) -> None:
    games = client.get("/api/games").json()
    assert [g["game_id"] for g in games] == ["g2", "g1"]
    assert games[0]["champions"]["red"]["mid"] == "Orianna"


def test_champions_counts(client: TestClient) -> None:
    champions = client.get("/api/champions").json()
    assert {"name": "Ahri", "games": 2} in champions


def test_replay_payload(client: TestClient) -> None:
    replay = client.get("/api/games/g1/replay").json()
    assert replay["game"]["duration"] == 120.0
    assert len(replay["times"]) == 121
    assert len(replay["positions"]["1"]) == 121
    assert replay["positions"]["1"][0] == [500, 500, 1, 1]
    assert replay["spawns"][0] == {"t": 30.0, "kind": "dragon", "x": 9866, "y": 4414}
    assert replay["kills"][0]["side"] == "blue"
    assert replay["kills"][0]["assists"] == []
    assert replay["objectives"][0] == {"t": 90.0, "kind": "dragon", "by": "blue"}
    assert len(replay["player_stats"]["1"]) == 121
    assert replay["player_stats"]["1"][0] == [500, 1]
    assert replay["player_stats"]["1"][90] == [1040, 2]
    assert replay["team_gold"]["blue"][0] == 2500
    assert replay["team_gold"]["red"][0] == 2500
    assert replay["gold"][0] == 0
    assert replay["plates"] == []
    assert replay["fights"] == [
        {
            "start": 60.0,
            "end": 60.0,
            "x": 5000,
            "y": 5000,
            "kills": {"blue": 1, "red": 0},
            "present": {"blue": 0, "red": 0},
        }
    ]
    assert replay["setups"] == [
        {
            "kind": "dragon",
            "spawn_at": 30.0,
            "taken_at": 90.0,
            "by": "blue",
            "x": 9866,
            "y": 4414,
            "near_at_spawn": {"blue": 0, "red": 0},
            "grouped_at": {"blue": None, "red": None},
        }
    ]


def test_replay_tactical_context(store: AnalyticsStore, client: TestClient) -> None:
    game = (
        GameBuilder(duration=120.0, game_id="g3")
        .gold_lead("blue", 1000, 0.0, 100.0)
        .at(2, 20.0, 9866.0, 4414.0)
        .at(3, 20.0, 9866.0, 4414.0)
        .at(4, 20.0, 9866.0, 4414.0)
        .spawn(30.0, "dragon", 9866.0, 4414.0)
        .plate(45.0, "bot", "blue", tier=1)
        .kill(60.0, 2, 8, 9866.0, 4414.0, assists=(3, 4))
        .kill(65.0, 3, 9, 9900.0, 4500.0, assists=(2,))
        .objective(90.0, "dragon", "blue")
        .spawn(100.0, "herald", 5007.0, 10471.0)
        .spawn(110.0, "atakhan")
        .build()
    )
    store.write_game(game)

    replay = client.get("/api/games/g3/replay").json()
    assert replay["player_stats"]["1"][50] == [900, 1]
    assert replay["player_stats"]["6"][50] == [800, 1]
    assert replay["player_stats"]["1"][100] == [1300, 2]
    assert replay["player_stats"]["6"][100] == [1100, 2]
    assert replay["team_gold"]["blue"][50] == 4500
    assert replay["team_gold"]["red"][50] == 4000
    assert replay["team_gold"]["blue"][100] == 6500
    assert replay["team_gold"]["red"][100] == 5500
    assert replay["gold"][0] == 0
    assert replay["gold"][50] == 500
    assert replay["gold"][100] == 1000
    assert replay["kills"][0]["assists"] == [3, 4]
    assert replay["kills"][1]["assists"] == [2]
    assert replay["plates"] == [{"t": 45.0, "lane": "bot", "by": "blue", "tier": 1}]
    assert replay["fights"] == [
        {
            "start": 60.0,
            "end": 65.0,
            "x": 9883,
            "y": 4457,
            "kills": {"blue": 2, "red": 0},
            "present": {"blue": 3, "red": 0},
        }
    ]
    assert replay["setups"] == [
        {
            "kind": "dragon",
            "spawn_at": 30.0,
            "taken_at": 90.0,
            "by": "blue",
            "x": 9866,
            "y": 4414,
            "near_at_spawn": {"blue": 3, "red": 0},
            "grouped_at": {"blue": 20.0, "red": None},
        },
        {
            "kind": "herald",
            "spawn_at": 100.0,
            "taken_at": None,
            "by": None,
            "x": 5007,
            "y": 10471,
            "near_at_spawn": {"blue": 0, "red": 0},
            "grouped_at": {"blue": None, "red": None},
        },
    ]


def test_replay_missing_frames_defaults() -> None:
    game = GameBuilder(duration=2.0, game_id="g_empty").build()
    game.frames = []
    replay = replay_payload(game)
    assert replay["player_stats"]["1"] == [[0, 1], [0, 1], [0, 1]]
    assert replay["team_gold"] == {"blue": [0, 0, 0], "red": [0, 0, 0]}
    assert replay["gold"] == [0, 0, 0]


def test_replay_404(client: TestClient) -> None:
    assert client.get("/api/games/nope/replay").status_code == 404
