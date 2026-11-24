from __future__ import annotations

import json
from datetime import UTC, date, datetime
from pathlib import Path

import typer

from throughline.grid.census import census, census_markdown
from throughline.grid.ingest import ingest as run_ingest
from throughline.grid.source import read_lines, read_series_index
from throughline.knowledge.features import participant_features
from throughline.knowledge.items import fetch_item_jsons, legendary_item_names
from throughline.settings import Settings
from throughline.store.analytics import AnalyticsStore
from throughline.synthetic import OFFLINE_LEGENDARY, synthetic_games
from throughline.validation.backtest import run_backtest, summarize

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


def _patches(store: AnalyticsStore) -> list[str]:
    return [str(r[0]) for r in store.con.execute("SELECT DISTINCT patch FROM games").fetchall()]


@app.command()
def seed(games: int = 300) -> None:
    """Fill the analytics database with a synthetic league (no GRID data needed)."""
    settings = Settings.from_env()
    store = AnalyticsStore(settings.analytics_db)
    store.init_schema()
    for n, game in enumerate(synthetic_games(games), start=1):
        store.write_game(game)
        if n % 50 == 0 or n == games:
            typer.echo(f"{n}/{games} games")


@app.command()
def build(offline: bool = False) -> None:
    """Compute participant features for every stored game. --offline skips Data Dragon (synthetic data)."""
    settings = Settings.from_env()
    store = AnalyticsStore(settings.analytics_db)
    store.init_schema()
    if offline:
        legendary = OFFLINE_LEGENDARY
    else:
        legendary = legendary_item_names(fetch_item_jsons(_patches(store), settings.data_dir / "ddragon"))
    ids = store.game_ids_by_time()
    for n, game_id in enumerate(ids, start=1):
        store.write_features(game_id, participant_features(store.load_game(game_id), legendary))
        if n % 50 == 0 or n == len(ids):
            typer.echo(f"{n}/{len(ids)} games")


@app.command()
def validate(holdout_from: str = "2026-06-01") -> None:
    """Backtest plans using only earlier games, then write data/validation.json."""
    settings = Settings.from_env()
    store = AnalyticsStore(settings.analytics_db)
    sides, checks = run_backtest(store)
    report = summarize(sides, checks, datetime.fromisoformat(holdout_from).replace(tzinfo=UTC))
    out = settings.data_dir / "validation.json"
    out.write_text(json.dumps(report, indent=2))
    typer.echo(f"wrote {out}: {report['sides']} sides in the holdout")
