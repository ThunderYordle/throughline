from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Literal, Protocol

from throughline.game.model import Role
from throughline.knowledge.features import CURVE_MINUTES
from throughline.store.analytics import AnalyticsStore

PRIOR_GAMES = 20.0
MIN_MATCHUP_GAMES = 5
MIN_SPIKE_GAMES = 10
PATCH_WINDOW = 3
MIN_SCOPE_GAMES = 200
MIN_SPAWN_GAMES = 10

SpikeKind = Literal["level6", "item1"]
TendencyKind = Literal["dragon", "grubs", "herald", "baron"]
SPIKE_COLUMNS: dict[SpikeKind, tuple[str, str]] = {
    "level6": ("level6_at", "gd_after_level6"),
    "item1": ("item1_at", "gd_after_item1"),
}


@dataclass(frozen=True)
class Stat:
    value: float
    games: int


@dataclass(frozen=True)
class Spike:
    at: float
    gd_after: float
    games: int


def shrink(mean: float, n: int, k: float = PRIOR_GAMES) -> float:
    """Pull a mean toward zero by its sample size: n games weigh against k games of 'no effect'."""
    return 0.0 if n == 0 else mean * n / (n + k)


def patch_key(patch: str) -> tuple[int, int]:
    major, _, minor = patch.partition(".")
    try:
        return int(major), int(minor)
    except ValueError:
        return (0, 0)


class KnowledgeSource(Protocol):
    scope_games: int

    def curve(self, role: Role, champion: str) -> dict[int, Stat]: ...
    def role_edge(self, role: Role, champion: str) -> Stat: ...
    def matchup(self, role: Role, champion: str, opponent: str) -> Stat | None: ...
    def spike(self, role: Role, champion: str, kind: SpikeKind) -> Spike | None: ...
    def tendency(self, champion: str, objective: TendencyKind) -> Stat: ...
    def first_spawn(self, objective: TendencyKind) -> float | None: ...


class KnowledgeBase:
    """Aggregates over participant_features, limited to a patch window and to games before a time."""

    def __init__(
        self,
        store: AnalyticsStore,
        patch: str,
        before: datetime | None = None,
        min_scope_games: int = MIN_SCOPE_GAMES,
    ) -> None:
        self.con = store.con
        time_sql, time_params = ("started_at < ?", [before]) if before else ("TRUE", [])
        known = sorted(
            {
                r[0]
                for r in self.con.execute(
                    f"SELECT DISTINCT patch FROM participant_features WHERE {time_sql}", time_params
                ).fetchall()
                if r[0]
            },
            key=patch_key,
        )
        upto = [p for p in known if patch_key(p) <= patch_key(patch)]
        season = [p for p in upto if patch_key(p)[0] == patch_key(patch)[0]]
        # Widen until there are enough games: the patch window, the season so far, then every game.
        # Seasons change the map (spawn times, objectives), so the season comes before everything.
        self._season_where, self._season_params = self._scope(time_sql, time_params, season)
        for patches in (upto[-PATCH_WINDOW:], season, []):
            self.patches = patches
            self._where, self._params = self._scope(time_sql, time_params, patches)
            self.scope_games = self._count_games()
            if patches and self.scope_games >= min_scope_games:
                break

    @staticmethod
    def _scope(time_sql: str, time_params: list[Any], patches: list[str]) -> tuple[str, list[Any]]:
        if not patches:
            return time_sql, list(time_params)
        marks = ", ".join("?" for _ in patches)
        return f"{time_sql} AND patch IN ({marks})", [*time_params, *patches]

    def _count_games(self) -> int:
        row = self.con.execute(
            f"SELECT count(DISTINCT game_id) FROM participant_features WHERE {self._where}", self._params
        ).fetchone()
        return int(row[0]) if row else 0

    def _one(self, select: str, where: str, params: list[Any]) -> tuple[Any, ...]:
        row = self.con.execute(
            f"SELECT {select} FROM participant_features WHERE {self._where} AND {where}",
            [*self._params, *params],
        ).fetchone()
        assert row is not None
        return tuple(row)

    def curve(self, role: Role, champion: str) -> dict[int, Stat]:
        select = ", ".join(f"avg(gd{m}), count(gd{m})" for m in CURVE_MINUTES)
        row = self._one(select, "role = ? AND champion = ?", [role, champion])
        out: dict[int, Stat] = {}
        for i, m in enumerate(CURVE_MINUTES):
            mean, n = row[2 * i], int(row[2 * i + 1])
            out[m] = Stat(shrink(float(mean or 0.0), n), n)
        return out

    def role_edge(self, role: Role, champion: str) -> Stat:
        mean, n = self._one("avg(role_gd10), count(role_gd10)", "role = ? AND champion = ?", [role, champion])
        return Stat(shrink(float(mean or 0.0), int(n)), int(n))

    def matchup(self, role: Role, champion: str, opponent: str) -> Stat | None:
        mean, n = self._one(
            "avg(role_gd10), count(role_gd10)",
            "role = ? AND champion = ? AND opponent = ?",
            [role, champion, opponent],
        )
        return Stat(float(mean), int(n)) if int(n) >= MIN_MATCHUP_GAMES else None

    def spike(self, role: Role, champion: str, kind: SpikeKind) -> Spike | None:
        at_col, gd_col = SPIKE_COLUMNS[kind]
        at, gd, n = self._one(
            f"median({at_col}), avg({gd_col}), count({gd_col})",
            f"role = ? AND champion = ? AND {at_col} IS NOT NULL",
            [role, champion],
        )
        if int(n) < MIN_SPIKE_GAMES or at is None:
            return None
        return Spike(float(at), shrink(float(gd or 0.0), int(n)), int(n))

    def tendency(self, champion: str, objective: TendencyKind) -> Stat:
        column = f"first_{objective}"
        rate, n = self._one(
            f"avg(CASE WHEN {column} THEN 1.0 ELSE 0.0 END), count({column})",
            f"champion = ? AND {column} IS NOT NULL",
            [champion],
        )
        return Stat(shrink(float(rate) - 0.5, int(n)) if rate is not None else 0.0, int(n))

    def first_spawn(self, objective: TendencyKind) -> float | None:
        """The median first spawn this season so far, on the feed's clock.

        Spawn times are a property of the map, which changes between seasons, so this reads the season
        even when the champion statistics had to widen to every game.
        """
        column = f"{objective}_spawn"
        row = self.con.execute(
            f"SELECT median({column}), count(DISTINCT game_id) FROM participant_features "
            f"WHERE {self._season_where} AND {column} IS NOT NULL",
            self._season_params,
        ).fetchone()
        assert row is not None
        at, n = row
        return float(at) if at is not None and int(n) >= MIN_SPAWN_GAMES else None
