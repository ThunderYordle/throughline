from datetime import UTC, datetime
from pathlib import Path

import zstandard

from throughline.grid.source import read_lines, read_series_index

INDEX = (
    "series_id,event,stage,scheduled_start,teams,file\n"
    "2,LCS - Split 3 2026,Regular Season,2026-07-27T20:00:00Z,C vs D,lol/events_2_grid.jsonl.zst\n"
    "1,LCK - LCK Cup 2025,Groups,2025-01-15T08:00:00Z,A vs B,lol/events_1_grid.jsonl.zst\n"
)


def test_index_is_read_oldest_first(tmp_path: Path) -> None:
    (tmp_path / "lol").mkdir()
    (tmp_path / "lol" / "series.csv").write_text(INDEX)
    rows = read_series_index(tmp_path)
    assert [r.series_id for r in rows] == ["1", "2"]
    assert rows[1].event == "LCS - Split 3 2026"
    assert rows[1].scheduled_start == datetime(2026, 7, 27, 20, 0, tzinfo=UTC)
    assert rows[1].file == "lol/events_2_grid.jsonl.zst"


def test_read_lines_streams_zstd(tmp_path: Path) -> None:
    path = tmp_path / "f.jsonl.zst"
    path.write_bytes(zstandard.ZstdCompressor().compress(b'{"a": 1}\n{"b": 2}\n'))
    assert [line.strip() for line in read_lines(path)] == ['{"a": 1}', '{"b": 2}']
