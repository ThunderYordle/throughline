import os
from pathlib import Path

import pytest

from throughline.store.analytics import AnalyticsStore

pytestmark = pytest.mark.realdata


@pytest.mark.skipif(not os.environ.get("TL_DATA_DIR"), reason="needs TL_DATA_DIR")
def test_every_game_has_spawns_and_nothing_is_taken_before_it_spawns() -> None:
    store = AnalyticsStore(Path(os.environ["TL_DATA_DIR"]) / "throughline.duckdb", read_only=True)
    early = store.con.execute(
        "SELECT o.game_id, o.kind, o.t FROM objectives o "
        "JOIN (SELECT game_id, kind, min(t) AS first FROM spawns GROUP BY ALL) s USING (game_id, kind) "
        "WHERE o.t < s.first"
    ).fetchall()
    assert early == []
    row = store.con.execute(
        "SELECT (SELECT count(*) FROM games), (SELECT count(DISTINCT game_id) FROM spawns)"
    ).fetchone()
    assert row is not None and row[0] == row[1]
