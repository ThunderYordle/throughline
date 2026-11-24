"""The hackathon's GRID starter data: a local clone, read in place and never copied into this repository."""

from __future__ import annotations

import csv
import io
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import zstandard

SERIES_INDEX = Path("lol") / "series.csv"


@dataclass(frozen=True)
class SeriesRow:
    series_id: str
    event: str
    stage: str
    scheduled_start: datetime
    teams: str
    file: str


def read_series_index(stl_dir: Path) -> list[SeriesRow]:
    """Every League of Legends series in the starter data, oldest first."""
    with (stl_dir / SERIES_INDEX).open(newline="", encoding="utf-8") as f:
        rows = [
            SeriesRow(
                series_id=r["series_id"],
                event=r["event"],
                stage=r["stage"],
                scheduled_start=datetime.fromisoformat(r["scheduled_start"].replace("Z", "+00:00")),
                teams=r["teams"],
                file=r["file"],
            )
            for r in csv.DictReader(f)
        ]
    return sorted(rows, key=lambda r: (r.scheduled_start, r.series_id))


def read_lines(path: Path) -> Iterator[str]:
    """Stream the lines of a .jsonl.zst file without decompressing it to disk."""
    with path.open("rb") as raw, zstandard.ZstdDecompressor().stream_reader(raw) as reader:
        yield from io.TextIOWrapper(reader, encoding="utf-8")
