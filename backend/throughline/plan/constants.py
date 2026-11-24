"""Every threshold the plan generator uses. Tuned on the earlier, held-out split only (see validation)."""

from __future__ import annotations

from typing import Literal

from throughline.game.model import Lane

WINDOW_GOLD = 300.0  # draft tempo beyond this is a window
LANE_GOLD = 150.0  # lane edge at 10:00 beyond this is priority
SPIKE_GOLD = 250.0  # team gold gained in the 3 minutes after a spike
TENDENCY_UNIT = 0.10  # objective-rate edge that counts as one unit of signal
OBJECTIVE_SIGNAL = 1.0  # signal needed to contest (or concede) an objective
MIN_ITEM_GAMES = 10  # every piece of evidence needs this many games
CONFIDENT_GAMES = 50  # games at which an item's score is no longer discounted
MAX_ITEMS = 8
LANE_UNTIL = 480.0
SIDE_UNTIL = 360.0
SIDE_WEIGHT = 0.8
OBJECTIVE_LEAD = 20.0  # be set up this long before the spawn
OBJECTIVE_MIN_PLAYERS = 3

PLAN_OBJECTIVES: tuple[Literal["dragon", "grubs", "herald"], ...] = ("dragon", "grubs", "herald")
OBJECTIVE_LANES: dict[str, tuple[Lane, ...]] = {
    "dragon": ("bot",),
    "grubs": ("top",),
    "herald": ("top", "mid"),
}
TRADE_FALLBACK: dict[str, list[Lane]] = {"dragon": ["top"], "grubs": ["bot"], "herald": ["bot"]}
OBJECTIVE_NAMES = {"dragon": "first dragon", "grubs": "void grubs", "herald": "Rift Herald"}
