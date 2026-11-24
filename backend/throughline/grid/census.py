"""What one series feed carries: event types, snapshot keys and how often positions update. No values."""

from __future__ import annotations

import json
import statistics
from collections import Counter
from collections.abc import Iterable
from dataclasses import dataclass, field
from typing import Any

from throughline.grid import schema as S


@dataclass
class Census:
    events: Counter[str] = field(default_factory=Counter)
    keys: dict[str, set[str]] = field(default_factory=dict)  # "game", "team", "player", "npc", "structure"
    position_gaps: list[float] = field(default_factory=list)  # seconds between a player's position changes


def _add_keys(result: Census, level: str, obj: dict[str, Any]) -> None:
    result.keys.setdefault(level, set()).update(obj.keys())


def census(lines: Iterable[bytes | str]) -> Census:
    result = Census()
    last: dict[tuple[str, str], tuple[tuple[float, float], int]] = {}
    for raw in lines:
        text = raw.decode() if isinstance(raw, bytes) else raw
        if not text.strip():
            continue
        for event in json.loads(text).get(S.EVENTS) or []:
            result.events[str(event.get(S.TYPE))] += 1
            for game in (event.get(S.SERIES_STATE) or {}).get(S.GAMES) or []:
                _add_keys(result, "game", game)
                for npc in game.get(S.NPCS) or []:
                    _add_keys(result, "npc", npc)
                for structure in game.get(S.STRUCTURES) or []:
                    _add_keys(result, "structure", structure)
                clock = S.clock_seconds(game)
                for team, player in S.players(game):
                    _add_keys(result, "team", dict(team))
                    _add_keys(result, "player", dict(player))
                    pos = S.position(player)
                    if clock is None or clock < 0 or pos is None or game.get(S.FINISHED):
                        continue
                    key = (str(game.get(S.ID)), str(player.get(S.ID)))
                    previous = last.get(key)
                    if previous is None or previous[0] != pos:
                        if previous is not None and clock > previous[1]:
                            result.position_gaps.append(float(clock - previous[1]))
                        last[key] = (pos, clock)
    return result


def census_markdown(result: Census, title: str) -> str:
    lines = [
        f"# GRID event census: {title}",
        "",
        "Event types, snapshot keys and position sampling (no values).",
        "",
    ]
    if len(result.position_gaps) >= 10:
        gaps = result.position_gaps
        deciles = statistics.quantiles(gaps, n=10)
        lines += [
            "## Position updates",
            "",
            f"Seconds between a player's position changes: median {statistics.median(gaps):g}, "
            f"90th percentile {deciles[8]:g}, max {max(gaps):g} ({len(gaps)} gaps).",
            "",
        ]
    lines += ["## Event types", "", "| Type | Count |", "|---|---|---|"]
    lines += [f"| `{name}` | {count} |" for name, count in result.events.most_common()]
    lines += ["", "## Snapshot keys", ""]
    lines += [f"- {level}: {', '.join(sorted(keys))}" for level, keys in sorted(result.keys.items())]
    return "\n".join(lines) + "\n"
