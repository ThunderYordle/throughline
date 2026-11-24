from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

# The GRID starter data is cloned next to this repository, never inside it: its license forbids
# committing it.
DEFAULT_STL_DIR = Path(__file__).resolve().parents[3] / "stl-hackathon-2026-grid-starter"


@dataclass(frozen=True)
class Settings:
    data_dir: Path
    analytics_db: Path
    app_db: Path
    stl_data_dir: Path | None
    frontend_dist: Path | None

    @classmethod
    def from_env(cls) -> Settings:
        data_dir = Path(os.environ.get("TL_DATA_DIR", "data"))
        dist = os.environ.get("TL_FRONTEND_DIST")
        return cls(
            data_dir=data_dir,
            analytics_db=Path(os.environ.get("TL_ANALYTICS_DB", data_dir / "throughline.duckdb")),
            app_db=Path(os.environ.get("TL_APP_DB", data_dir / "app.sqlite")),
            stl_data_dir=Path(os.environ.get("STL_DATA_DIR", DEFAULT_STL_DIR)),
            frontend_dist=Path(dist) if dist else None,
        )
