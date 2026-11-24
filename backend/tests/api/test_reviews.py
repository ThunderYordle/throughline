import json

from fastapi.testclient import TestClient


def make_review(client: TestClient) -> dict:  # type: ignore[type-arg]
    plan = client.post("/api/plans/from-game", json={"game_id": "g1", "us": "blue"}).json()
    response = client.post("/api/reviews", json={"plan_id": plan["id"], "game_id": "g1"})
    assert response.status_code == 200
    return response.json()  # type: ignore[no-any-return]


def test_create_read_and_annotate_review(client: TestClient) -> None:
    created = make_review(client)
    assert created["review"]["us"] == "blue"
    assert created["entries"] == {}
    entry_id = created["review"]["checks"][0]["item_id"]
    denied = client.patch(
        f"/api/reviews/{created['id']}/entries/{entry_id}",
        json={"status": "confirmed", "note": "x"},
        headers={"X-Edit-Token": "nope"},
    )
    assert denied.status_code == 403
    updated = client.patch(
        f"/api/reviews/{created['id']}/entries/{entry_id}",
        json={"status": "confirmed", "note": "Late by 20 s"},
        headers={"X-Edit-Token": created["edit_token"]},
    )
    assert updated.json()["entries"][entry_id] == {"status": "confirmed", "note": "Late by 20 s"}
    read = client.get(f"/api/reviews/{created['id']}")
    assert read.json()["entries"][entry_id]["note"] == "Late by 20 s"
    assert "edit_token" not in read.json()


def test_review_errors(client: TestClient) -> None:
    created = make_review(client)
    invalid_entry = client.patch(
        f"/api/reviews/{created['id']}/entries/nope",
        json={"status": None, "note": ""},
        headers={"X-Edit-Token": created["edit_token"]},
    )
    assert invalid_entry.status_code == 404
    assert client.post("/api/reviews", json={"plan_id": "missing", "game_id": "g1"}).status_code == 404
    assert client.get("/api/reviews/missing").status_code == 404


def test_validation_report_route(client: TestClient) -> None:
    response = client.get("/api/validation")
    assert response.status_code == 404
    path = client.app.state.settings.data_dir / "validation.json"
    path.write_text(json.dumps({"sides": 3}))
    assert client.get("/api/validation").json() == {"sides": 3}
