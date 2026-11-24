"""GRID series feed -> one Game per finished game on the Rift."""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field, replace
from datetime import datetime
from typing import Any

from throughline.game.geometry import FOUNTAIN, lane_at
from throughline.game.model import (
    LANES,
    ROLES,
    SIDES,
    Frame,
    Game,
    GameMeta,
    ItemPurchase,
    Kill,
    Lane,
    Objective,
    Participant,
    Plate,
    Side,
    Spawn,
    Structure,
    other,
)
from throughline.game.roles import RoleEvidence, assign_roles
from throughline.grid import schema as S

ROLE_FROM = 90.0  # role inference reads positions from here...
ROLE_UNTIL = 480.0  # ...to here, the laning phase


class ParseError(ValueError):
    pass


@dataclass(frozen=True)
class SeriesInfo:
    series_id: str
    tournament: str
    scheduled_start: datetime


@dataclass
class SeriesParse:
    games: list[Game] = field(default_factory=list)
    failures: list[tuple[str, str]] = field(default_factory=list)


@dataclass(frozen=True)
class _Obs:
    t: float
    x: float
    y: float
    alive: bool
    gold: int
    level: int


@dataclass(frozen=True)
class _Kill:
    t: float
    killer: str
    victim: str
    assists: tuple[str, ...]
    x: float
    y: float


@dataclass
class _GameState:
    """Everything read for one game, keyed by GRID ids until roles turn them into pids."""

    game_id: str
    number: int
    started_at: datetime
    t: float = 0.0
    patch: str = ""
    ended: bool = False
    winner: Side | None = None
    team_sides: dict[str, Side] = field(default_factory=dict)
    team_names: dict[Side, str] = field(default_factory=dict)
    sides: dict[str, Side] = field(default_factory=dict)
    names: dict[str, str] = field(default_factory=dict)
    champions: dict[str, str] = field(default_factory=dict)
    levels: dict[str, int] = field(default_factory=lambda: defaultdict(lambda: 1))
    scuttles: Counter[str] = field(default_factory=Counter)
    obs: dict[str, list[_Obs]] = field(default_factory=lambda: defaultdict(list))
    kills: list[_Kill] = field(default_factory=list)
    spawns: list[Spawn] = field(default_factory=list)
    objectives: list[Objective] = field(default_factory=list)
    structures: list[Structure] = field(default_factory=list)
    plates: list[Plate] = field(default_factory=list)
    purchases: list[tuple[float, str, str]] = field(default_factory=list)  # (t, player id, item id)


def parse_series(lines: Iterable[bytes | str], info: SeriesInfo) -> SeriesParse:
    games: dict[str, _GameState] = {}
    current: _GameState | None = None
    item_names: dict[str, str] = {}

    for raw in lines:
        text = raw.decode() if isinstance(raw, bytes) else raw
        if not text.strip():
            continue
        envelope: dict[str, Any] = json.loads(text)
        for event in envelope.get(S.EVENTS) or []:
            kind = str(event.get(S.TYPE, ""))
            target = event.get(S.TARGET) or {}
            item_names.update(S.inventory_names(event))
            if kind == S.EV_GAME_STARTED:
                state = target.get(S.STATE) or {}
                current = _GameState(
                    game_id=str(target.get(S.ID)),
                    number=int(state.get(S.SEQUENCE) or len(games) + 1),
                    started_at=S.timestamp(state.get(S.STARTED_AT)) or info.scheduled_start,
                )
                games[current.game_id] = current
            elif kind == S.EV_GAME_ROLLED_BACK:
                games.pop(str(target.get(S.ID)), None)
                if current is not None and current.game_id == str(target.get(S.ID)):
                    current = None
                continue
            if current is None:
                continue
            snapshot = S.game_snapshot(event, current.game_id)
            if snapshot is None:
                continue
            _read_snapshot(current, snapshot)
            _apply_event(current, kind, event, snapshot)
            if kind == S.EV_GAME_ENDED:
                current.ended = True
                current = None

    result = SeriesParse()
    for state in sorted(games.values(), key=lambda g: g.number):
        try:
            result.games.append(_finish(state, info, item_names))
        except ParseError as error:
            result.failures.append((state.game_id, str(error)))
    return result


def _read_snapshot(state: _GameState, game: Mapping[str, Any]) -> None:
    clock = S.clock_seconds(game)
    if clock is not None:
        state.t = max(0.0, float(clock))
    state.patch = S.patch_of(game) or state.patch
    for team, player in S.players(game):
        team_id = str(team.get(S.ID))
        side = S.side_of(team) or state.team_sides.get(team_id)
        if side is None:
            continue
        state.team_sides[team_id] = side
        if team.get(S.NAME):
            state.team_names[side] = str(team[S.NAME])
        player_id = str(player.get(S.ID))
        state.sides[player_id] = side
        if player.get(S.NAME):
            state.names[player_id] = str(player[S.NAME])
        champion = S.character_name(player)
        if champion:
            state.champions[player_id] = champion
        pos = S.position(player)
        if clock is None or clock < 0 or pos is None:
            continue
        track = state.obs[player_id]
        last = track[-1] if track else None
        gold = player.get(S.GOLD)
        alive = player.get(S.ALIVE)
        obs = _Obs(
            t=state.t,
            x=pos[0],
            y=pos[1],
            alive=bool(alive) if alive is not None else (last.alive if last else True),
            gold=int(gold) if gold is not None else (last.gold if last else 0),
            level=state.levels[player_id],
        )
        if last is not None and last.t == obs.t:
            track[-1] = obs
        else:
            track.append(obs)


def _side_of_actor(state: _GameState, actor: Mapping[str, Any]) -> Side | None:
    actor_id = str(actor.get(S.ID))
    if actor.get(S.TYPE) == S.TEAM_ACTOR:
        return state.team_sides.get(actor_id)
    return state.sides.get(actor_id)


def _apply_event(state: _GameState, kind: str, event: Mapping[str, Any], game: Mapping[str, Any]) -> None:
    t = state.t
    actor: Mapping[str, Any] = event.get(S.ACTOR) or {}
    target: Mapping[str, Any] = event.get(S.TARGET) or {}
    actor_id, target_id = str(actor.get(S.ID)), str(target.get(S.ID))

    if kind == S.EV_KILL:
        victim_side = state.sides.get(target_id, "blue")
        x, y = (
            S.player_position(game, target_id) or S.player_position(game, actor_id) or FOUNTAIN[victim_side]
        )
        state.kills.append(_Kill(t, actor_id, target_id, S.assists(actor), x, y))
    elif kind in S.EV_NPC_KILLED:
        objective = S.objective_of(target_id)
        side = _side_of_actor(state, actor)
        if objective is not None and side is not None:
            pos = S.npc_position(game, target_id)
            state.objectives.append(Objective(t, objective, side, *(pos or (None, None))))
    elif kind in S.EV_NPC_SPAWNED:
        objective = S.objective_of(target_id)
        if objective is not None:
            pos = S.npc_position(game, target_id)
            state.spawns.append(Spawn(t, objective, *(pos or (None, None))))
    elif kind == S.EV_SCUTTLE_KILLED:
        state.scuttles[actor_id] += 1
    elif S.is_structure_event(kind):
        found = S.structure_of(target_id)
        if found is not None:
            structure, lane, owner = found
            state.structures.append(Structure(t, structure, lane, other(owner)))
    elif (plate := S.plate_of(kind)) is not None:
        _, lane, tier = plate
        side = _side_of_actor(state, actor)
        if side is not None:
            state.plates.append(Plate(t, lane, side, tier))
    elif kind == S.EV_LEVEL:
        state.levels[actor_id] += 1
        track = state.obs.get(actor_id)
        if track and track[-1].t == t:
            track[-1] = replace(track[-1], level=state.levels[actor_id])
    elif kind == S.EV_PURCHASE:
        state.purchases.append((t, actor_id, target_id))
    elif kind == S.EV_PURCHASE_UNDONE:
        for i in range(len(state.purchases) - 1, -1, -1):
            if state.purchases[i][1:] == (actor_id, target_id):
                del state.purchases[i]
                break
    elif kind == S.EV_GAME_WON:
        state.winner = state.team_sides.get(actor_id)


def _role_evidence(state: _GameState, player_id: str, item_names: dict[str, str]) -> RoleEvidence:
    lanes: Counter[Lane | None] = Counter(
        lane_at(o.x, o.y) for o in state.obs.get(player_id, []) if ROLE_FROM <= o.t <= ROLE_UNTIL and o.alive
    )
    total = sum(lanes.values()) or 1
    return RoleEvidence(
        player_id=player_id,
        lane_share={lane: lanes[lane] / total for lane in LANES},
        offlane_share=lanes[None] / total,
        scuttles=state.scuttles[player_id],
        support_item=any(
            p == player_id and item_names.get(item) == S.SUPPORT_ITEM for _, p, item in state.purchases
        ),
    )


def _finish(state: _GameState, info: SeriesInfo, item_names: dict[str, str]) -> Game:
    if not state.ended:
        raise ParseError("the feed never ends the game")
    if state.winner is None:
        raise ParseError("no winner")
    if set(state.team_names) != set(SIDES):
        raise ParseError(f"team names for {sorted(state.team_names)} only")
    pid_of: dict[str, int] = {}
    participants: list[Participant] = []
    for side_index, side in enumerate(SIDES):
        # A benched substitute can appear in the snapshot; only players with a champion played.
        team = sorted(p for p, s in state.sides.items() if s == side and p in state.champions)
        if len(team) != len(ROLES):
            raise ParseError(f"{side} has {len(team)} players with a champion")
        roles = assign_roles([_role_evidence(state, p, item_names) for p in team])
        for role_index, role in enumerate(ROLES):
            player_id = next(p for p, r in roles.items() if r == role)
            pid = side_index * len(ROLES) + role_index + 1
            pid_of[player_id] = pid
            participants.append(
                Participant(
                    pid, side, role, state.champions[player_id], state.names.get(player_id, ""), player_id
                )
            )

    frames = sorted(
        (
            Frame(o.t, pid_of[p], o.x, o.y, o.alive, o.gold, o.level)
            for p, track in state.obs.items()
            if p in pid_of
            for o in track
        ),
        key=lambda f: (f.t, f.pid),
    )
    kills = [
        Kill(
            k.t,
            pid_of.get(k.killer),
            pid_of[k.victim],
            tuple(pid_of[a] for a in k.assists if a in pid_of),
            k.x,
            k.y,
        )
        for k in state.kills
        if k.victim in pid_of
    ]
    items = [
        ItemPurchase(t, pid_of[p], item_names.get(item, item))
        for t, p, item in state.purchases
        if p in pid_of
    ]
    meta = GameMeta(
        state.game_id, info.series_id, state.number, info.tournament, state.started_at, dict(state.team_names)
    )
    return Game(
        meta=meta,
        patch=state.patch,
        duration=state.t,
        winner=state.winner,
        participants=tuple(participants),
        frames=frames,
        kills=sorted(kills, key=lambda k: k.t),
        spawns=sorted(state.spawns, key=lambda s: s.t),
        objectives=sorted(state.objectives, key=lambda o: o.t),
        structures=sorted(state.structures, key=lambda s: s.t),
        plates=sorted(state.plates, key=lambda p: p.t),
        items=sorted(items, key=lambda i: i.t),
    )
