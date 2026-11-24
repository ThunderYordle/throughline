from pathlib import Path

from fastapi.testclient import TestClient

from throughline.api.app import create_app
from throughline.settings import Settings


def make_settings(tmp_path: Path) -> Settings:
    return Settings(
        data_dir=tmp_path,
        analytics_db=tmp_path / "a.duckdb",
        app_db=tmp_path / "app.sqlite",
        stl_data_dir=None,
        frontend_dist=None,
    )


def test_health(tmp_path: Path) -> None:
    client = TestClient(create_app(make_settings(tmp_path)))
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True}
