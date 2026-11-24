import csv
from pathlib import Path

import pytest

from throughline.game.model import Game
from throughline.grid.parser import SeriesInfo, parse_series
from throughline.grid.source import read_lines, read_series_index
from throughline.settings import Settings

pytestmark = pytest.mark.realdata
STEP = 25  # every 25th series: about 30 series and 70 games, a few seconds


def stl_dir() -> Path | None:
    stl = Settings.from_env().stl_data_dir
    return stl if stl is not None and (stl / "lol" / "series.csv").exists() else None


@pytest.mark.skipif(stl_dir() is None, reason="needs the GRID starter data")
def test_parsed_games_match_the_metadata() -> None:
    stl = stl_dir()
    assert stl is not None
    with (stl / "meta" / "games.csv").open(encoding="utf-8") as f:
        meta = {r["game_id"]: r for r in csv.DictReader(f) if r["title"] == "lol"}
    games: list[Game] = []
    for row in read_series_index(stl)[::STEP]:
        info = SeriesInfo(row.series_id, row.event, row.scheduled_start)
        games += parse_series(read_lines(stl / row.file), info).games
    assert len(games) > 50
    supports_with_atlas = 0
    for game in games:
        m = meta[game.meta.game_id]
        winner = m["team1_side"] if m["winner_team_id"] == m["team1_id"] else m["team2_side"]
        assert (game.winner, game.patch) == (winner, m["patch"]), game.meta.game_id
        assert [p.pid for p in game.participants] == list(range(1, 11))
        assert max(f.level for f in game.frames) <= (20 if game.patch.startswith("16.") else 18)
        assert any(s.kind == "dragon" for s in game.spawns)
        atlas = {i.pid for i in game.items if i.item == "World Atlas"}
        supports_with_atlas += all(game.player(side, "support").pid in atlas for side in ("blue", "red"))
    assert supports_with_atlas / len(games) >= 0.95
