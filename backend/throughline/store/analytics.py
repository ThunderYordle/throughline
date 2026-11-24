from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

import duckdb
import pyarrow as pa

from throughline.game.model import (
    Frame,
    Game,
    GameMeta,
    ItemPurchase,
    Kill,
    Objective,
    Participant,
    Plate,
    Role,
    Side,
    Spawn,
    Structure,
)

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS games (
  game_id TEXT, series_id TEXT, game_number INTEGER, tournament TEXT,
  started_at TIMESTAMPTZ, patch TEXT, duration DOUBLE, winner TEXT, blue_team TEXT, red_team TEXT);
CREATE TABLE IF NOT EXISTS participants (
  game_id TEXT, pid INTEGER, side TEXT, role TEXT, champion TEXT, player TEXT, player_id TEXT);
CREATE TABLE IF NOT EXISTS frames (
  game_id TEXT, t DOUBLE, pid INTEGER, x DOUBLE, y DOUBLE, alive BOOLEAN, gold INTEGER, level INTEGER);
CREATE TABLE IF NOT EXISTS kills (
  game_id TEXT, t DOUBLE, killer INTEGER, victim INTEGER, assists INTEGER[], x DOUBLE, y DOUBLE);
CREATE TABLE IF NOT EXISTS spawns (game_id TEXT, t DOUBLE, kind TEXT, x DOUBLE, y DOUBLE);
CREATE TABLE IF NOT EXISTS objectives (
  game_id TEXT, t DOUBLE, kind TEXT, by_side TEXT, x DOUBLE, y DOUBLE);
CREATE TABLE IF NOT EXISTS structures (game_id TEXT, t DOUBLE, kind TEXT, lane TEXT, by_side TEXT);
CREATE TABLE IF NOT EXISTS plates (game_id TEXT, t DOUBLE, lane TEXT, by_side TEXT, tier INTEGER);
CREATE TABLE IF NOT EXISTS items (game_id TEXT, t DOUBLE, pid INTEGER, item TEXT);
"""

RECORD_TABLES = ("participants", "frames", "kills", "spawns", "objectives", "structures", "plates", "items")


@dataclass(frozen=True)
class GameSummary:
    game_id: str
    tournament: str
    started_at: datetime
    patch: str
    teams: dict[Side, str]
    winner: Side
    champions: dict[Side, dict[Role, str]]


class AnalyticsStore:
    def __init__(self, path: Path, read_only: bool = False) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self.con = duckdb.connect(str(path), read_only=read_only)

    def close(self) -> None:
        self.con.close()

    def init_schema(self) -> None:
        self.con.execute(SCHEMA_SQL)

    def has_game(self, game_id: str) -> bool:
        return self.con.execute("SELECT 1 FROM games WHERE game_id = ?", [game_id]).fetchone() is not None

    def has_series(self, series_id: str) -> bool:
        return self.con.execute("SELECT 1 FROM games WHERE series_id = ?", [series_id]).fetchone() is not None

    def _insert(self, table: str, rows: list[dict[str, Any]]) -> None:
        if not rows:
            return
        arrow = pa.Table.from_pylist(rows)
        self.con.register("incoming", arrow)
        columns = ", ".join(arrow.column_names)
        self.con.execute(f"INSERT INTO {table} ({columns}) SELECT {columns} FROM incoming")
        self.con.unregister("incoming")

    def write_game(self, game: Game) -> None:
        gid = game.meta.game_id
        self.con.execute("BEGIN")
        try:
            self.con.execute("DELETE FROM games WHERE game_id = ?", [gid])
            for table in RECORD_TABLES:
                self.con.execute(f"DELETE FROM {table} WHERE game_id = ?", [gid])
            m = game.meta
            self.con.execute(
                "INSERT INTO games VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    gid,
                    m.series_id,
                    m.game_number,
                    m.tournament,
                    m.started_at,
                    game.patch,
                    game.duration,
                    game.winner,
                    m.teams["blue"],
                    m.teams["red"],
                ],
            )
            self._insert("participants", [{"game_id": gid, **asdict(p)} for p in game.participants])
            self._insert("frames", [{"game_id": gid, **asdict(f)} for f in game.frames])
            self._insert(
                "kills", [{"game_id": gid, **asdict(k), "assists": list(k.assists)} for k in game.kills]
            )
            self._insert("spawns", [{"game_id": gid, **asdict(s)} for s in game.spawns])
            self._insert(
                "objectives",
                [
                    {"game_id": gid, "t": o.t, "kind": o.kind, "by_side": o.by, "x": o.x, "y": o.y}
                    for o in game.objectives
                ],
            )
            self._insert(
                "structures",
                [
                    {"game_id": gid, "t": s.t, "kind": s.kind, "lane": s.lane, "by_side": s.by}
                    for s in game.structures
                ],
            )
            self._insert(
                "plates",
                [
                    {"game_id": gid, "t": p.t, "lane": p.lane, "by_side": p.by, "tier": p.tier}
                    for p in game.plates
                ],
            )
            self._insert("items", [{"game_id": gid, **asdict(i)} for i in game.items])
            self.con.execute("COMMIT")
        except Exception:
            self.con.execute("ROLLBACK")
            raise

    def load_game(self, game_id: str) -> Game:
        row = self.con.execute(
            "SELECT series_id, game_number, tournament, started_at, patch, duration, winner, "
            "blue_team, red_team FROM games WHERE game_id = ?",
            [game_id],
        ).fetchone()
        if row is None:
            raise KeyError(game_id)
        series_id, number, tournament, started_at, patch, duration, winner, blue, red = row

        def rows(sql: str) -> list[tuple[Any, ...]]:
            return self.con.execute(sql, [game_id]).fetchall()

        return Game(
            meta=GameMeta(game_id, series_id, number, tournament, started_at, {"blue": blue, "red": red}),
            patch=patch,
            duration=duration,
            winner=winner,
            participants=tuple(
                Participant(*r)
                for r in rows(
                    "SELECT pid, side, role, champion, player, player_id FROM participants "
                    "WHERE game_id = ? ORDER BY pid"
                )
            ),
            frames=[
                Frame(*r)
                for r in rows(
                    "SELECT t, pid, x, y, alive, gold, level FROM frames WHERE game_id = ? ORDER BY t, pid"
                )
            ],
            kills=[
                Kill(t, killer, victim, tuple(assists or ()), x, y)
                for t, killer, victim, assists, x, y in rows(
                    "SELECT t, killer, victim, assists, x, y FROM kills WHERE game_id = ? ORDER BY t"
                )
            ],
            spawns=[Spawn(*r) for r in rows("SELECT t, kind, x, y FROM spawns WHERE game_id = ? ORDER BY t")],
            objectives=[
                Objective(*r)
                for r in rows("SELECT t, kind, by_side, x, y FROM objectives WHERE game_id = ? ORDER BY t")
            ],
            structures=[
                Structure(*r)
                for r in rows("SELECT t, kind, lane, by_side FROM structures WHERE game_id = ? ORDER BY t")
            ],
            plates=[
                Plate(*r)
                for r in rows("SELECT t, lane, by_side, tier FROM plates " "WHERE game_id = ? ORDER BY t")
            ],
            items=[
                ItemPurchase(*r) for r in rows("SELECT t, pid, item FROM items WHERE game_id = ? ORDER BY t")
            ],
        )

    def list_games(self, q: str | None = None, limit: int = 50) -> list[GameSummary]:
        sql = (
            "SELECT g.game_id, g.tournament, g.started_at, g.patch, g.blue_team, g.red_team, g.winner, "
            "list(p.side || ':' || p.role || ':' || p.champion ORDER BY p.pid) "
            "FROM games g JOIN participants p USING (game_id) GROUP BY ALL "
        )
        params: list[Any] = []
        if q:
            sql += (
                "HAVING lower(g.blue_team || ' ' || g.red_team || ' ' || g.tournament || ' ' || "
                "string_agg(p.champion, ' ')) LIKE ? "
            )
            params.append(f"%{q.lower()}%")
        sql += "ORDER BY g.started_at DESC LIMIT ?"
        params.append(limit)
        out: list[GameSummary] = []
        for gid, tournament, started_at, patch, blue, red, winner, picks in self.con.execute(
            sql, params
        ).fetchall():
            champions: dict[Side, dict[Role, str]] = {"blue": {}, "red": {}}
            for entry in picks:
                side, role, champion = entry.split(":", 2)
                champions[side][role] = champion
            out.append(
                GameSummary(gid, tournament, started_at, patch, {"blue": blue, "red": red}, winner, champions)
            )
        return out

    def game_ids_by_time(self) -> list[str]:
        rows = self.con.execute("SELECT game_id FROM games ORDER BY started_at, game_id").fetchall()
        return [row[0] for row in rows]

    def latest_patch(self) -> str | None:
        row = self.con.execute(
            "SELECT patch FROM games ORDER BY "
            "try_cast(split_part(patch, '.', 1) AS INTEGER) DESC, "
            "try_cast(split_part(patch, '.', 2) AS INTEGER) DESC LIMIT 1"
        ).fetchone()
        return row[0] if row else None
