from fastapi.testclient import TestClient

from throughline.game.builder import DEFAULT_CHAMPIONS
from throughline.game.model import ROLES

BLUE = dict(zip(ROLES, DEFAULT_CHAMPIONS["blue"], strict=True))
RED = dict(zip(ROLES, DEFAULT_CHAMPIONS["red"], strict=True))


def test_create_read_and_edit_plan(client: TestClient) -> None:
    response = client.post("/api/plans", json={"draft": {"blue": BLUE, "red": RED, "us": "blue"}})
    assert response.status_code == 200
    created = response.json()
    assert created["plan"]["draft"]["patch"] == "16.14"
    assert "objective-dragon" in [item["id"] for item in created["plan"]["items"]]

    read = client.get(f"/api/plans/{created['id']}")
    assert read.json()["plan"] == created["plan"]

    items = [item for item in created["plan"]["items"] if item["id"] != "objective-dragon"]
    items[0] = {**items[0], "text": "Edited", "origin": "edited"}
    denied = client.patch(f"/api/plans/{created['id']}", json={"items": items}, headers={"X-Edit-Token": "x"})
    assert denied.status_code == 403
    updated = client.patch(
        f"/api/plans/{created['id']}", json={"items": items}, headers={"X-Edit-Token": created["edit_token"]}
    )
    assert updated.status_code == 200
    assert updated.json()["plan"]["items"][0]["text"] == "Edited"
    assert "objective-dragon" not in [item["id"] for item in updated.json()["plan"]["items"]]


def test_plan_from_game_and_matching_games(client: TestClient) -> None:
    created = client.post("/api/plans/from-game", json={"game_id": "g1", "us": "blue"}).json()
    assert created["plan"]["draft"]["blue"]["mid"] == "Ahri"
    games = client.get(f"/api/plans/{created['id']}/games").json()
    assert {game["game_id"] for game in games} == {"g1", "g2"}


def test_bad_plan_requests(client: TestClient) -> None:
    assert client.get("/api/plans/missing").status_code == 404
    assert client.post("/api/plans/from-game", json={"game_id": "nope", "us": "blue"}).status_code == 404
    invalid = client.post("/api/plans", json={"draft": {"blue": {"top": "Aatrox"}, "red": RED, "us": "blue"}})
    assert invalid.status_code == 422
