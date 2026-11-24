from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

from throughline.grid.parser import SeriesInfo, parse_series
from throughline.grid.source import read_lines, read_series_index
from throughline.store.analytics import AnalyticsStore


@dataclass
class IngestReport:
    added: int = 0
    skipped_series: int = 0
    failed: list[tuple[str, str]] = field(default_factory=list)


def ingest(
    stl_dir: Path, store: AnalyticsStore, event: str | None = None, since: date | None = None
) -> IngestReport:
    """Parse and store every game of the starter data's series, skipping series already stored."""
    report = IngestReport()
    for row in read_series_index(stl_dir):
        if event and event.lower() not in row.event.lower():
            continue
        if since and row.scheduled_start.date() < since:
            continue
        if store.has_series(row.series_id):
            report.skipped_series += 1
            continue
        path = stl_dir / row.file
        if not path.exists():
            report.failed.append((row.series_id, f"missing file {row.file}"))
            continue
        parsed = parse_series(read_lines(path), SeriesInfo(row.series_id, row.event, row.scheduled_start))
        for game in parsed.games:
            store.write_game(game)
            report.added += 1
        report.failed += parsed.failures
    return report
