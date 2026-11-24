from datetime import date
from pathlib import Path

import zstandard

from tests.grid.feed import FeedBuilder
from tests.grid.test_parser import played
from throughline.grid.ingest import ingest
from throughline.store.analytics import AnalyticsStore

INDEX = (
    "series_id,event,stage,scheduled_start,teams,file\n"
    "s1,LCS - Split 3 2026,Regular Season,2026-07-26T20:00:00Z,Alpha vs Beta,lol/events_s1_grid.jsonl.zst\n"
    "s2,LEC - Spring 2026,Regular Season,2026-04-01T17:00:00Z,Gamma vs Delta,lol/events_s2_grid.jsonl.zst\n"
)


def starter_data(tmp_path: Path) -> Path:
    """A tiny stand-in for the starter repository: an index and one series file (s2's file is missing)."""
    (tmp_path / "lol").mkdir(parents=True)
    (tmp_path / "lol" / "series.csv").write_text(INDEX)
    feed = played(FeedBuilder("s1"), "g1", 1).win(1500, "blue")
    played(feed, "g2", 2).win(1600, "red")
    raw = "\n".join(feed.lines()).encode()
    (tmp_path / "lol" / "events_s1_grid.jsonl.zst").write_bytes(zstandard.ZstdCompressor().compress(raw))
    return tmp_path


def test_ingest_stores_games_and_skips_known_series(tmp_path: Path) -> None:
    stl = starter_data(tmp_path / "stl")
    store = AnalyticsStore(tmp_path / "a.duckdb")
    store.init_schema()
    first = ingest(stl, store)
    assert (first.added, first.skipped_series) == (2, 0)
    assert first.failed == [("s2", "missing file lol/events_s2_grid.jsonl.zst")]
    assert store.load_game("g2").meta.tournament == "LCS - Split 3 2026"
    second = ingest(stl, store)
    assert (second.added, second.skipped_series) == (0, 1)


def test_ingest_filters_by_event_and_date(tmp_path: Path) -> None:
    stl = starter_data(tmp_path / "stl")
    store = AnalyticsStore(tmp_path / "a.duckdb")
    store.init_schema()
    assert ingest(stl, store, event="lec").failed == [("s2", "missing file lol/events_s2_grid.jsonl.zst")]
    assert ingest(stl, store, since=date(2026, 8, 1)).added == 0
    assert ingest(stl, store, event="LCS", since=date(2026, 7, 1)).added == 2
