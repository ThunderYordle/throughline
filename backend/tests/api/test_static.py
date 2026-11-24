from pathlib import Path

from fastapi.testclient import TestClient

from throughline.api.app import create_app
from throughline.settings import Settings


def test_spa_fallback(tmp_path: Path) -> None:
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<!doctype html><title>Throughline</title>")
    (dist / "assets" / "app.js").write_text("console.log(1)")
    settings = Settings(tmp_path, tmp_path / "a.duckdb", tmp_path / "app.sqlite", None, dist)
    client = TestClient(create_app(settings))
    assert "Throughline" in client.get("/review/abc").text
    assert client.get("/assets/app.js").text == "console.log(1)"
    assert client.get("/api/health").json() == {"ok": True}
    assert client.get("/api/nope").status_code == 404
