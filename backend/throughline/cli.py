from __future__ import annotations

from datetime import date
from pathlib import Path

import typer

from throughline.grid.census import census, census_markdown
from throughline.grid.ingest import ingest as run_ingest
from throughline.grid.source import read_lines, read_series_index
from throughline.settings import Settings
from throughline.store.analytics import AnalyticsStore

app = typer.Typer(no_args_is_help=True)
grid_app = typer.Typer(no_args_is_help=True)
app.add_typer(grid_app, name="grid")


def _stl_dir(settings: Settings) -> Path:
    stl = settings.stl_data_dir
    if stl is None or not (stl / "lol" / "series.csv").exists():
        raise typer.BadParameter(
            "GRID starter data not found: clone it next to this repository or set STL_DATA_DIR"
        )
    return stl


@grid_app.command("census")
def grid_census(series: str, out: Path = Path("../docs/data/events.md")) -> None:
    """Write the event types, snapshot keys and position sampling of one series (no values)."""
    stl = _stl_dir(Settings.from_env())
    row = next((r for r in read_series_index(stl) if r.series_id == series), None)
    if row is None:
        raise typer.BadParameter(f"series {series} is not in lol/series.csv")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(census_markdown(census(read_lines(stl / row.file)), f"series {series}"))
    typer.echo(f"wrote {out}")


@app.command()
def ingest(event: str | None = None, since: str | None = None) -> None:
    """Parse and store every LoL game of the starter data; --event filters by event name, --since by date."""
    settings = Settings.from_env()
    store = AnalyticsStore(settings.analytics_db)
    store.init_schema()
    report = run_ingest(_stl_dir(settings), store, event, date.fromisoformat(since) if since else None)
    skipped, failed = report.skipped_series, len(report.failed)
    typer.echo(f"added {report.added} games, skipped {skipped} known series, failed {failed}")
    for key, error in report.failed:
        typer.echo(f"  {key}: {error}")
