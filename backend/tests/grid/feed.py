"""Builds small GRID series feeds for parser tests: one envelope per event, each with a snapshot."""

from __future__ import annotations

import json
from typing import Any, Self

TEAM_IDS = {"blue": "100", "red": "200"}
TEAM_NAMES = {"blue": "Alpha", "red": "Beta"}
FOUNTAINS = {"blue": (500.0, 500.0), "red": (14300.0, 14300.0)}
# (player id, role, champion, name), deliberately not in role order.
PLAYERS: dict[str, list[tuple[str, str, str, str]]] = {
    "blue": [
        ("15", "support", "Rakan", "Sup1"),
        ("11", "top", "Aatrox", "Top1"),
        ("13", "mid", "Ahri", "Mid1"),
        ("12", "jungle", "Vi", "Jgl1"),
        ("14", "bot", "Ezreal", "Bot1"),
    ],
    "red": [
        ("23", "mid", "Orianna", "Mid2"),
        ("25", "support", "Nautilus", "Sup2"),
        ("21", "top", "Gnar", "Top2"),
        ("24", "bot", "Kaisa", "Bot2"),
        ("22", "jungle", "Sejuani", "Jgl2"),
    ],
}
LANE_SPOTS: dict[str, dict[str, tuple[float, float]]] = {
    "blue": {
        "top": (1000.0, 9000.0),
        "jungle": (4000.0, 8000.0),
        "mid": (7500.0, 7500.0),
        "bot": (9000.0, 1000.0),
        "support": (9500.0, 1200.0),
    },
    "red": {
        "top": (6000.0, 14000.0),
        "jungle": (11000.0, 7000.0),
        "mid": (8000.0, 8000.0),
        "bot": (14000.0, 6000.0),
        "support": (14000.0, 6500.0),
    },
}


class FeedBuilder:
    def __init__(self, series_id: str = "s1") -> None:
        self.series_id = series_id
        self.game_id = ""
        self.game_number = 0
        self.t = 0
        self.patch = "16.14"
        self._lines: list[str] = []
        self._seq = 0
        self.pos: dict[str, tuple[float, float]] = {}
        self.alive: dict[str, bool] = {}
        self.gold: dict[str, int] = {}
        self.inventory: dict[str, list[tuple[str, str]]] = {}
        self.npcs: dict[str, tuple[float, float]] = {}
        self.players = {side: list(players) for side, players in PLAYERS.items()}

    def lines(self) -> list[str]:
        return list(self._lines)

    def _snapshot(self, full: bool) -> dict[str, Any]:
        teams = []
        for side, players in self.players.items():
            team: dict[str, Any] = {
                "id": TEAM_IDS[side],
                "side": side,
                "name": TEAM_NAMES[side],
                "players": [],
            }
            for pid, _, champion, name in players:
                x, y = self.pos[pid]
                player: dict[str, Any] = {
                    "id": pid,
                    "name": name,
                    "position": {"x": x, "y": y},
                    "alive": self.alive[pid],
                    "totalMoneyEarned": self.gold[pid],
                    "inventory": {"items": [{"id": i, "name": n} for i, n in self.inventory[pid]]},
                }
                if full and champion:
                    player["character"] = {"id": f"c-{champion}", "name": champion}
                team["players"].append(player)
            teams.append(team)
        game: dict[str, Any] = {
            "id": self.game_id,
            "sequenceNumber": self.game_number,
            "clock": {"type": "gameClock", "currentSeconds": self.t},
            "teams": teams,
            "nonPlayerCharacters": [
                {"id": n, "position": {"x": x, "y": y}} for n, (x, y) in self.npcs.items()
            ],
        }
        if full:
            game["titleVersion"] = {"name": self.patch}
        return {"id": self.series_id, "games": [game]}

    def event(
        self, t: int, kind: str, actor: dict[str, Any], target: dict[str, Any], full: bool = False
    ) -> Self:
        self.t = t
        self._seq += 1
        event = {
            "id": f"e{self._seq}",
            "type": kind,
            "actor": actor,
            "target": target,
            "seriesState": self._snapshot(full),
            "seriesStateDelta": {},
            "includesFullState": full,
        }
        self._lines.append(
            json.dumps(
                {
                    "id": f"env{self._seq}",
                    "seriesId": self.series_id,
                    "sequenceNumber": self._seq,
                    "events": [event],
                }
            )
        )
        return self

    def bench(self, side: str, player_id: str) -> Self:
        """A substitute who shows up in snapshots without a champion."""
        self.players[side].append((player_id, "bench", "", "Sub"))
        return self

    def start_game(
        self, game_id: str = "g1", number: int = 1, started_at: str = "2026-07-26T20:24:33Z"
    ) -> Self:
        self.game_id, self.game_number = game_id, number
        self.npcs = {}
        for side, players in self.players.items():
            for pid, *_ in players:
                self.pos[pid], self.alive[pid], self.gold[pid], self.inventory[pid] = (
                    FOUNTAINS[side],
                    True,
                    500,
                    [],
                )
        return self.event(
            0,
            "series-started-game",
            {"type": "series", "id": self.series_id},
            {
                "type": "game",
                "id": game_id,
                "state": {"id": game_id, "sequenceNumber": number, "startedAt": started_at},
            },
            full=True,
        )

    def tick(self, t: int) -> Self:
        return self.event(
            t, "player-used-ability", {"type": "player", "id": "11"}, {"type": "ability", "id": "q"}
        )

    def laning(self, t0: int, t1: int, step: int) -> Self:
        """Every player at their lane spot (the jungler off-lane), one snapshot every `step` seconds."""
        for t in range(t0, t1 + 1, step):
            for side, players in self.players.items():
                for pid, role, *_ in players:
                    self.pos[pid] = LANE_SPOTS[side].get(role, FOUNTAINS[side])
                    self.gold[pid] += step * 3
            self.tick(t)
        return self

    def move(self, t: int, player: str, x: float, y: float) -> Self:
        self.pos[player] = (x, y)
        return self.tick(t)

    def kill(
        self, t: int, killer: str, victim: str, at: tuple[float, float], assists: tuple[str, ...] = ()
    ) -> Self:
        self.pos[victim], self.alive[victim] = at, False
        delta = {
            "game": {
                "killAssistsReceivedFromPlayer": [
                    {"id": f"killAssistsReceivedFromPlayer-{a}", "playerId": a, "killAssistsReceived": 1}
                    for a in assists
                ]
            }
        }
        return self.event(
            t,
            "player-killed-player",
            {"type": "player", "id": killer, "stateDelta": delta},
            {"type": "player", "id": victim},
        )

    def npc_spawn(self, t: int, npc: str, at: tuple[float, float], tier: str = "ATierNPC") -> Self:
        self.npcs[npc] = at
        return self.event(
            t, f"game-respawned-{tier}", {"type": "game", "id": self.game_id}, {"type": tier, "id": npc}
        )

    def npc_kill(self, t: int, killer: str, npc: str, tier: str = "ATierNPC") -> Self:
        return self.event(
            t, f"player-killed-{tier}", {"type": "player", "id": killer}, {"type": tier, "id": npc}
        )

    def scuttle(self, t: int, killer: str) -> Self:
        return self.npc_kill(t, killer, "riftScuttlerBot", tier="BTierNPC")

    def destroy(self, t: int, structure: str, actor: str, by_team: bool = False) -> Self:
        word = {"turret": "tower", "inhibitor": "fortifier", "nexus": "base"}[structure.split("-")[1]]
        actor_type = "team" if by_team else "player"
        return self.event(
            t,
            f"{actor_type}-destroyed-{word}",
            {"type": actor_type, "id": actor},
            {"type": word, "id": structure},
        )

    def plate(self, t: int, actor: str, lane: str, tier: int, by_team: bool = False) -> Self:
        actor_type = "team" if by_team else "player"
        name = f"destroyTurretPlate{lane.title()}{tier}"
        return self.event(
            t, f"{actor_type}-completed-{name}", {"type": actor_type, "id": actor}, {"type": name, "id": name}
        )

    def level_up(self, t: int, player: str) -> Self:
        return self.event(
            t,
            "player-completed-increaseLevel",
            {"type": "player", "id": player},
            {"type": "increaseLevel", "id": "increaseLevel"},
        )

    def buy(self, t: int, player: str, item_id: str, name: str) -> Self:
        self.inventory[player].append((item_id, name))
        return self.event(
            t, "player-purchased-item", {"type": "player", "id": player}, {"type": "item", "id": item_id}
        )

    def undo_buy(self, t: int, player: str, item_id: str) -> Self:
        self.inventory[player] = [(i, n) for i, n in self.inventory[player] if i != item_id]
        return self.event(
            t, "player-!purchased-item", {"type": "player", "id": player}, {"type": "item", "id": item_id}
        )

    def win(self, t: int, side: str) -> Self:
        game = {"type": "game", "id": self.game_id}
        self.event(t, "team-won-game", {"type": "team", "id": TEAM_IDS[side]}, game)
        return self.event(t, "series-ended-game", {"type": "series", "id": self.series_id}, game, full=True)

    def rollback(self, t: int, game_id: str) -> Self:
        return self.event(
            t,
            "series-!started-game",
            {"type": "series", "id": self.series_id},
            {"type": "game", "id": game_id},
        )
