"""A seeded synthetic league for anyone without the GRID starter data, end-to-end tests and offline work.

Each champion has a hidden early and late strength; gold leads, objectives and results follow them with noise,
so the knowledge base finds real (synthetic) patterns.
"""

from __future__ import annotations

import random
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

from throughline.game.builder import GameBuilder
from throughline.game.geometry import FOUNTAIN, PITS
from throughline.game.model import LANES, ROLES, SIDES, Game, Side, other

OFFLINE_LEGENDARY = {"Infinity Edge", "Rabadon's Deathcap", "Black Cleaver", "Zhonya's Hourglass"}
POOLS: dict[str, list[str]] = {
    "top": ["Aatrox", "Gnar", "Jax", "Renekton", "Rumble", "KSante", "Ornn", "Jayce"],
    "jungle": ["Vi", "Sejuani", "LeeSin", "Maokai", "Xinzhao", "Viego", "Wukong", "Nidalee"],
    "mid": ["Ahri", "Orianna", "Azir", "Syndra", "Taliyah", "Yone", "Sylas", "Corki"],
    "bot": ["Ezreal", "Kaisa", "Varus", "Xayah", "Jinx", "Aphelios", "Zeri", "Kalista"],
    "support": ["Rakan", "Nautilus", "Alistar", "Rell", "Braum", "Leona", "Renata", "Bard"],
}
T0 = datetime(2026, 6, 1, tzinfo=UTC)
LANE_SPOT = {"top": (1500.0, 12500.0), "mid": (7500.0, 7500.0), "bot": (12500.0, 1500.0)}


def synthetic_games(n: int, seed: int = 7) -> Iterator[Game]:
    rng = random.Random(seed)
    strength = {c: (rng.gauss(0, 1), rng.gauss(0, 1)) for pool in POOLS.values() for c in pool}
    for i in range(n):
        picks = {role: rng.sample(POOLS[role], 2) for role in ROLES}
        champions: dict[Side, list[str]] = {
            "blue": [picks[role][0] for role in ROLES],
            "red": [picks[role][1] for role in ROLES],
        }
        early = sum(strength[c][0] for c in champions["blue"]) - sum(strength[c][0] for c in champions["red"])
        late = sum(strength[c][1] for c in champions["blue"]) - sum(strength[c][1] for c in champions["red"])
        early += rng.gauss(0, 1.5)
        late += rng.gauss(0, 1.5)
        winner: Side = "blue" if early * 0.4 + late * 0.6 > 0 else "red"
        early_side: Side = "blue" if early > 0 else "red"
        duration = float(rng.randint(1560, 2280))
        builder = GameBuilder(
            duration=duration,
            winner=winner,
            patch=rng.choice(["15.21", "15.22", "15.23"]),
            started_at=T0 + timedelta(hours=8 * i),
            champions=champions,
            game_id=f"syn{i:04d}-1",
            tournament="Synthetic League",
        )
        builder.gold_lead(early_side, int(abs(early) * 450), 120.0, 900.0)
        builder.gold_lead(winner, int(1500 + abs(late) * 900), 900.0, duration - 60.0)

        dragon_side = early_side if rng.random() < 0.7 else other(early_side)
        pids = range(1, 6) if dragon_side == "blue" else range(6, 11)
        for pid in list(pids)[1:4]:
            builder.walk(pid, 230.0, 285.0, FOUNTAIN[dragon_side], PITS["dragon"])
        builder.spawn(294.0, "dragon", *PITS["dragon"])
        builder.spawn(473.0, "grubs", *PITS["baron"])
        builder.spawn(897.0, "herald", *PITS["baron"])
        builder.spawn(1480.0, "baron", *PITS["baron"])
        builder.objective(300.0 + rng.uniform(15, 60), "dragon", dragon_side)
        builder.objective(
            480.0 + rng.uniform(20, 90), "grubs", early_side if rng.random() < 0.6 else other(early_side)
        )
        builder.objective(900.0 + rng.uniform(20, 90), "herald", rng.choice(SIDES))
        builder.objective(1500.0 + rng.uniform(30, 200), "baron", winner)

        builder.plate(rng.uniform(300, 840), "mid", early_side)
        for lane in LANES:
            for _ in range(rng.randint(0, 3)):
                builder.plate(
                    rng.uniform(300, 840), lane, early_side if rng.random() < 0.65 else other(early_side)
                )
        builder.structure(rng.uniform(800, 1100), "turret", "bot", early_side)
        builder.structure(rng.uniform(1300, 1700), "turret", "top", winner)

        for _ in range(rng.randint(6, 14)):
            t = rng.uniform(180, duration - 30)
            lane = rng.choice(["top", "mid", "bot"])
            x, y = LANE_SPOT[lane]
            scorer = (
                winner
                if (t > 900 and rng.random() < 0.65) or (t <= 900 and rng.random() < 0.5)
                else other(winner)
            )
            killer = rng.randint(1, 5) if scorer == "blue" else rng.randint(6, 10)
            victim = rng.randint(6, 10) if scorer == "blue" else rng.randint(1, 5)
            builder.kill(t, killer, victim, x + rng.uniform(-400, 400), y + rng.uniform(-400, 400))

        for pid in range(1, 11):
            builder.item(rng.uniform(720, 960), pid, rng.choice(sorted(OFFLINE_LEGENDARY)))
        yield builder.build()
