from __future__ import annotations

from typing import Any

from throughline.game.fights import detect_fights, kill_side
from throughline.game.geometry import FOUNTAIN
from throughline.game.index import GameIndex
from throughline.game.model import Game, Side
from throughline.game.setups import Setup, objective_instances, setup_for


def _round(value: float | None) -> int | None:
    return None if value is None else round(value)


def replay_payload(game: Game) -> dict[str, Any]:
    index = GameIndex(game)
    times = list(range(int(game.duration) + 1))
    positions: dict[str, list[list[int]]] = {}
    player_stats: dict[str, list[list[int]]] = {}
    team_gold: dict[Side, list[int]] = {"blue": [0] * len(times), "red": [0] * len(times)}
    for p in game.participants:
        track: list[list[int]] = []
        stats: list[list[int]] = []
        side_gold = team_gold[p.side]
        for i, t in enumerate(times):
            f = index.frame(p.pid, float(t))
            pos = index.position(p.pid, float(t))
            seen = pos is not None
            if pos is None:
                pos = (f.x, f.y) if f else FOUNTAIN[p.side]
            alive = f.alive if f else True
            track.append([round(pos[0]), round(pos[1]), int(alive), int(seen)])
            player_gold = f.gold if f is not None else 0
            level = f.level if f is not None else 1
            stats.append([player_gold, level])
            side_gold[i] += player_gold
        positions[str(p.pid)] = track
        player_stats[str(p.pid)] = stats
    gold = [b - r for b, r in zip(team_gold["blue"], team_gold["red"], strict=True)]
    fights = detect_fights(index)
    setups: list[Setup] = [
        s for inst in objective_instances(game) if (s := setup_for(index, inst)) is not None
    ]
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
        "player_stats": player_stats,
        "team_gold": team_gold,
        "gold": gold,
        "spawns": [{"t": s.t, "kind": s.kind, "x": _round(s.x), "y": _round(s.y)} for s in game.spawns],
        "kills": [
            {
                "t": k.t,
                "killer": k.killer,
                "victim": k.victim,
                "assists": list(k.assists),
                "x": round(k.x),
                "y": round(k.y),
                "side": kill_side(game, k),
            }
            for k in game.kills
        ],
        "objectives": [{"t": o.t, "kind": o.kind, "by": o.by} for o in game.objectives],
        "structures": [{"t": s.t, "kind": s.kind, "lane": s.lane, "by": s.by} for s in game.structures],
        "plates": [{"t": p.t, "lane": p.lane, "by": p.by, "tier": p.tier} for p in game.plates],
        "fights": [
            {
                "start": f.start,
                "end": f.end,
                "x": round(f.x),
                "y": round(f.y),
                "kills": f.kills,
                "present": f.present,
            }
            for f in fights
        ],
        "setups": [
            {
                "kind": s.instance.kind,
                "spawn_at": s.instance.spawn_at,
                "taken_at": s.instance.taken.t if s.instance.taken else None,
                "by": s.instance.taken.by if s.instance.taken else None,
                "x": round(s.center[0]),
                "y": round(s.center[1]),
                "near_at_spawn": s.near_at_spawn,
                "grouped_at": s.grouped_at,
            }
            for s in setups
        ],
    }
