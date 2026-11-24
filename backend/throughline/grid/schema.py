"""Every GRID series-event field name and value format Throughline reads. Nothing else touches raw keys."""

from __future__ import annotations

import re
from collections.abc import Iterator, Mapping
from datetime import datetime
from typing import Any

from throughline.game.model import Lane, ObjectiveKind, Side, StructureKind

# Envelope and event
EVENTS = "events"
TYPE = "type"
ACTOR = "actor"
TARGET = "target"
ID = "id"
STATE = "state"
STATE_DELTA = "stateDelta"
SERIES_STATE = "seriesState"

# Snapshot: series -> games -> teams -> players
GAMES = "games"
CLOCK = "clock"
CURRENT_SECONDS = "currentSeconds"
STARTED_AT = "startedAt"
SEQUENCE = "sequenceNumber"
TITLE_VERSION = "titleVersion"
NAME = "name"
TEAMS = "teams"
SIDE = "side"
PLAYERS = "players"
CHARACTER = "character"
POSITION = "position"
X = "x"
Y = "y"
ALIVE = "alive"
GOLD = "totalMoneyEarned"
INVENTORY = "inventory"
ITEMS = "items"
NPCS = "nonPlayerCharacters"
STRUCTURES = "structures"
FINISHED = "finished"
ACTOR_GAME_DELTA = "game"
ASSISTS = "killAssistsReceivedFromPlayer"
ASSIST_PLAYER = "playerId"

TEAM_ACTOR = "team"

# Event types
EV_GAME_STARTED = "series-started-game"
EV_GAME_ROLLED_BACK = "series-!started-game"
EV_GAME_ENDED = "series-ended-game"
EV_GAME_WON = "team-won-game"
EV_KILL = "player-killed-player"
EV_NPC_KILLED = ("player-killed-ATierNPC", "player-killed-STierNPC")
EV_NPC_SPAWNED = ("game-respawned-ATierNPC", "game-respawned-STierNPC")
EV_SCUTTLE_KILLED = "player-killed-BTierNPC"
EV_STRUCTURE_SUFFIXES = ("-destroyed-tower", "-destroyed-fortifier", "-destroyed-base")
EV_LEVEL = "player-completed-increaseLevel"
EV_PURCHASE = "player-purchased-item"
EV_PURCHASE_UNDONE = "player-!purchased-item"
PLATE_EVENT = re.compile(r"^(player|team)-completed-destroyTurretPlate(Top|Mid|Bot)(\d)$")

SUPPORT_ITEM = "World Atlas"

SIDE_NAMES: dict[str, Side] = {"blue": "blue", "red": "red"}
LANE_NAMES: dict[str, Lane] = {"top": "top", "mid": "mid", "bot": "bot"}
STRUCTURE_NAMES: dict[str, StructureKind] = {"turret": "turret", "inhibitor": "inhibitor", "nexus": "nexus"}


def timestamp(value: Any) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def game_snapshot(event: Mapping[str, Any], game_id: str) -> Mapping[str, Any] | None:
    """The state of one game after this event. Partial snapshots hold only the current game."""
    for game in (event.get(SERIES_STATE) or {}).get(GAMES) or []:
        if str(game.get(ID)) == game_id:
            return game  # type: ignore[no-any-return]
    return None


def clock_seconds(game: Mapping[str, Any]) -> int | None:
    value = (game.get(CLOCK) or {}).get(CURRENT_SECONDS)
    return int(value) if value is not None else None


def patch_of(game: Mapping[str, Any]) -> str:
    parts = str((game.get(TITLE_VERSION) or {}).get(NAME) or "").split(".")
    return ".".join(parts[:2]) if len(parts) >= 2 else ""


def side_of(team: Mapping[str, Any]) -> Side | None:
    return SIDE_NAMES.get(str(team.get(SIDE, "")).lower())


def position(obj: Mapping[str, Any]) -> tuple[float, float] | None:
    pos = obj.get(POSITION)
    if not pos or pos.get(X) is None or pos.get(Y) is None:
        return None
    return float(pos[X]), float(pos[Y])


def character_name(player: Mapping[str, Any]) -> str | None:
    name = (player.get(CHARACTER) or {}).get(NAME)
    return str(name) if name else None


def players(game: Mapping[str, Any]) -> Iterator[tuple[Mapping[str, Any], Mapping[str, Any]]]:
    """(team, player) pairs of a game snapshot."""
    for team in game.get(TEAMS) or []:
        for player in team.get(PLAYERS) or []:
            yield team, player


def player_position(game: Mapping[str, Any], player_id: str) -> tuple[float, float] | None:
    for _, player in players(game):
        if str(player.get(ID)) == player_id:
            return position(player)
    return None


def npc_position(game: Mapping[str, Any], npc_id: str) -> tuple[float, float] | None:
    for npc in game.get(NPCS) or []:
        if str(npc.get(ID)) == npc_id:
            return position(npc)
    return None


def inventory_names(event: Mapping[str, Any]) -> Iterator[tuple[str, str]]:
    """(item id, item name) pairs from every inventory in the event's snapshot."""
    for game in (event.get(SERIES_STATE) or {}).get(GAMES) or []:
        for _, player in players(game):
            for item in (player.get(INVENTORY) or {}).get(ITEMS) or []:
                if item.get(ID) and item.get(NAME):
                    yield str(item[ID]), str(item[NAME])


def assists(actor: Mapping[str, Any]) -> tuple[str, ...]:
    delta = (actor.get(STATE_DELTA) or {}).get(ACTOR_GAME_DELTA) or {}
    return tuple(str(a[ASSIST_PLAYER]) for a in delta.get(ASSISTS) or [] if a.get(ASSIST_PLAYER))


def objective_of(npc_id: str) -> ObjectiveKind | None:
    if npc_id == "elderDragon":
        return "elder"
    if npc_id.endswith("Drake"):
        return "dragon"
    if npc_id.startswith("voidGrub"):
        return "grubs"
    if npc_id == "riftHerald":
        return "herald"
    if npc_id == "baron":
        return "baron"
    if npc_id.endswith("Atakhan"):
        return "atakhan"
    return None


def is_structure_event(event_type: str) -> bool:
    return event_type.endswith(EV_STRUCTURE_SUFFIXES)


def structure_of(structure_id: str) -> tuple[StructureKind, Lane | None, Side] | None:
    """`red-turret-mid-1`, `red-turret-base-2`, `blue-inhibitor-top`, `red-nexus` -> (kind, lane, owner)."""
    parts = structure_id.split("-")
    owner = SIDE_NAMES.get(parts[0]) if parts else None
    kind = STRUCTURE_NAMES.get(parts[1]) if len(parts) > 1 else None
    if owner is None or kind is None:
        return None
    lane = LANE_NAMES.get(parts[2]) if len(parts) > 2 else None
    return kind, lane, owner


def plate_of(event_type: str) -> tuple[str, Lane, int] | None:
    """`player-completed-destroyTurretPlateBot1` -> ("player", "bot", 1)."""
    match = PLATE_EVENT.match(event_type)
    if match is None:
        return None
    return match.group(1), LANE_NAMES[match.group(2).lower()], int(match.group(3))
