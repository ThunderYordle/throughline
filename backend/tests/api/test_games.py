from fastapi.testclient import TestClient


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
    assert replay["objectives"][0] == {"t": 90.0, "kind": "dragon", "by": "blue"}


def test_replay_404(client: TestClient) -> None:
    assert client.get("/api/games/nope/replay").status_code == 404
