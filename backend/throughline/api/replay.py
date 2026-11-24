from __future__ import annotations

from typing import Any

from throughline.game.fights import kill_side
from throughline.game.geometry import FOUNTAIN
from throughline.game.index import GameIndex
from throughline.game.model import Game


def _round(value: float | None) -> int | None:
    return None if value is None else round(value)


def replay_payload(game: Game) -> dict[str, Any]:
    index = GameIndex(game)
    times = list(range(int(game.duration) + 1))
    positions: dict[str, list[list[int]]] = {}
    for p in game.participants:
        track: list[list[int]] = []
        for t in times:
            f = index.frame(p.pid, float(t))
            pos = index.position(p.pid, float(t))
            seen = pos is not None
            if pos is None:
                pos = (f.x, f.y) if f else FOUNTAIN[p.side]
            alive = f.alive if f else True
            track.append([round(pos[0]), round(pos[1]), int(alive), int(seen)])
        positions[str(p.pid)] = track
    return {
        "game": {
            "id": game.meta.game_id,
            "duration": game.duration,
            "patch": game.patch,
            "teams": game.meta.teams,
            "winner": game.winner,
            "tournament": game.meta.tournament,
        },
        "participants": [
            {"pid": p.pid, "side": p.side, "role": p.role, "champion": p.champion, "player": p.player}
            for p in game.participants
        ],
        "times": times,
        "positions": positions,
        "spawns": [{"t": s.t, "kind": s.kind, "x": _round(s.x), "y": _round(s.y)} for s in game.spawns],
        "kills": [
            {
                "t": k.t,
                "killer": k.killer,
                "victim": k.victim,
                "x": round(k.x),
                "y": round(k.y),
                "side": kill_side(game, k),
            }
            for k in game.kills
        ],
        "objectives": [{"t": o.t, "kind": o.kind, "by": o.by} for o in game.objectives],
        "structures": [{"t": s.t, "kind": s.kind, "lane": s.lane, "by": s.by} for s in game.structures],
    }
