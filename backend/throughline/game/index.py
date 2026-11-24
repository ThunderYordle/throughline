from __future__ import annotations

import math
from bisect import bisect_right
from collections import defaultdict

from throughline.game.geometry import Point, dist
from throughline.game.model import LANE_ROLES, Frame, Game, Lane, Role, Side, other

POSITION_MAX_GAP = 20.0  # interpolate between two observations at most this far apart
POSITION_TOLERANCE = 5.0  # otherwise use an observation at most this far from the asked time


class GameIndex:
    """Fast lookups over one game's frames, which the feed samples irregularly."""

    def __init__(self, game: Game) -> None:
        self.game = game
        frames: dict[int, list[Frame]] = defaultdict(list)
        for f in game.frames:
            frames[f.pid].append(f)
        self._frames = {pid: sorted(fs, key=lambda f: f.t) for pid, fs in frames.items()}
        self._times = {pid: [f.t for f in fs] for pid, fs in self._frames.items()}
        self._pids: dict[Side, list[int]] = {
            "blue": sorted(p.pid for p in game.participants if p.side == "blue"),
            "red": sorted(p.pid for p in game.participants if p.side == "red"),
        }

    def frame(self, pid: int, t: float) -> Frame | None:
        """The last observation at or before `t`: gold, level and alive as of `t`."""
        times = self._times.get(pid)
        if not times:
            return None
        i = bisect_right(times, t) - 1
        return self._frames[pid][i] if i >= 0 else None

    def position(self, pid: int, t: float) -> Point | None:
        """Where the player was at `t`, or None when the feed has no observation close enough."""
        times = self._times.get(pid)
        if not times:
            return None
        frames = self._frames[pid]
        i = bisect_right(times, t) - 1
        before = frames[i] if i >= 0 else None
        after = frames[i + 1] if i + 1 < len(frames) else None
        if before is not None and before.t == t:
            return (before.x, before.y)
        if (
            before is not None
            and after is not None
            and before.alive
            and after.alive
            and after.t - before.t <= POSITION_MAX_GAP
        ):
            u = (t - before.t) / (after.t - before.t)
            return (before.x + (after.x - before.x) * u, before.y + (after.y - before.y) * u)
        close = [f for f in (before, after) if f is not None and abs(f.t - t) <= POSITION_TOLERANCE]
        if not close:
            return None
        nearest = min(close, key=lambda f: abs(f.t - t))
        return (nearest.x, nearest.y)

    def pids(self, side: Side) -> list[int]:
        return list(self._pids[side])

    def _gold(self, pid: int, t: float) -> int:
        f = self.frame(pid, t)
        return f.gold if f else 0

    def team_gold(self, side: Side, t: float) -> int:
        return sum(self._gold(pid, t) for pid in self._pids[side])

    def gold_diff(self, side: Side, t: float) -> int:
        return self.team_gold(side, t) - self.team_gold(other(side), t)

    def role_gold_diff(self, side: Side, role: Role, t: float) -> int:
        ours = self.game.player(side, role).pid
        theirs = self.game.player(other(side), role).pid
        return self._gold(ours, t) - self._gold(theirs, t)

    def lane_gold_diff(self, side: Side, lane: Lane, t: float) -> int:
        return sum(self.role_gold_diff(side, role, t) for role in LANE_ROLES[lane])

    def _alive_at(self, pid: int, t: float) -> Point | None:
        f = self.frame(pid, t)
        if f is None or not f.alive:
            return None
        return self.position(pid, t)

    def near(self, side: Side, point: Point, radius: float, t: float) -> int:
        """Alive players of `side` known to be within `radius` of `point` at `t`."""
        count = 0
        for pid in self._pids[side]:
            pos = self._alive_at(pid, t)
            if pos is not None and dist(pos, point) <= radius:
                count += 1
        return count

    def nearest_ally_distance(self, pid: int, t: float) -> float:
        me = self.position(pid, t)
        if me is None:
            return math.inf
        side = self.game.side_of(pid)
        best = math.inf
        for ally in self._pids[side]:
            if ally == pid:
                continue
            pos = self._alive_at(ally, t)
            if pos is not None:
                best = min(best, dist(pos, me))
        return best
