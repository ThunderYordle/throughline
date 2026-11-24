from throughline.game.builder import GameBuilder
from throughline.game.geometry import FOUNTAIN
from throughline.review.context import ReviewContext
from throughline.review.moments import (
    MAX_MOMENTS,
    caught_before_objectives,
    cross_map_trades,
    detect_moments,
    gold_swings,
    objective_setups,
    unused_advantages,
)

PIT = (9866.0, 4414.0)


def test_objective_setup_moment() -> None:
    builder = GameBuilder(duration=600.0)
    for pid in (6, 7, 8, 9):
        builder.walk(pid, 200.0, 260.0, (12000.0, 6000.0), PIT)
    game = builder.objective(321.0, "dragon", "red").build()
    moments = objective_setups(ReviewContext.build(game, "blue"))
    dragon = next(m for m in moments if m.id == "setup-dragon-300")
    assert dragon.verdict == "bad"
    # They are inside the 2,500-unit radius from 204 s; the first sample is at 210 s (3:30).
    assert dragon.text == "Dragon 5:00: 0 vs 4 at the pit; they grouped at 3:30; they took it at 5:21."
    assert dragon.impact == 1000


def test_unused_and_converted_advantage() -> None:
    unused = (
        GameBuilder(duration=1500.0)
        .kill(700.0, 1, 6, 3000.0, 9000.0)
        .kill(705.0, 2, 7, 3000.0, 9000.0)
        .build()
    )
    [moment] = unused_advantages(ReviewContext.build(unused, "blue"))
    assert moment.verdict == "bad"
    assert moment.text == "Unused: 2 kills at 11:45, nothing taken in the next 60 s."
    converted = (
        GameBuilder(duration=1500.0)
        .kill(700.0, 1, 6, 3000.0, 9000.0)
        .kill(705.0, 2, 7, 3000.0, 9000.0)
        .structure(740.0, "turret", "top", "blue")
        .build()
    )
    [moment] = unused_advantages(ReviewContext.build(converted, "blue"))
    assert moment.verdict == "good"
    assert moment.text == "Converted 2 kills at 11:45: took the top turret within 60 s."


def test_recall_triggers_an_advantage() -> None:
    builder = GameBuilder(duration=1500.0)
    for pid in (6, 7, 8, 9, 10):
        builder.walk(pid, 380.0, 395.0, (9000.0, 9000.0), (9000.0, 9000.0))
        builder.at(pid, 400.0, *FOUNTAIN["red"])  # back home at 400 s, and they stay there
    game = builder.build()
    moments = unused_advantages(ReviewContext.build(game, "blue"))
    assert [m.text for m in moments] == [
        "Unused: 5 of them recalled at 6:40, nothing taken in the next 60 s."
    ]


def test_cross_map_trade() -> None:
    game = (
        GameBuilder(duration=1500.0)
        .objective(900.0, "herald", "blue")
        .objective(920.0, "dragon", "red")
        .build()
    )
    [trade] = cross_map_trades(ReviewContext.build(game, "blue"))
    assert trade.verdict == "neutral"
    assert trade.text == "Cross-map trade at 15:00: we took herald (+1,200), they took dragon (-1,000)."


def test_caught_before_objective() -> None:
    game = (
        GameBuilder(duration=1700.0)
        .walk(3, 1400.0, 1450.0, (7500.0, 7500.0), (3000.0, 12000.0))
        .kill(1450.0, 8, 3, 3000.0, 12000.0)
        .objective(1520.0, "baron", "red")
        .build()
    )
    [caught] = caught_before_objectives(ReviewContext.build(game, "blue"))
    assert caught.verdict == "bad"
    assert caught.text == "Caught at 24:10: Ahri died alone 50 s before baron; they took it."


def test_gold_swing() -> None:
    game = (
        GameBuilder(duration=1500.0)
        .gold_lead("red", 2000, 1000.0, 1040.0)
        .kill(1005.0, 8, 3, 7500.0, 7500.0)
        .build()
    )
    swings = gold_swings(ReviewContext.build(game, "blue"))
    assert len(swings) == 1
    assert swings[0].verdict == "bad"
    assert swings[0].text.startswith("Gold swing -2,000 in 60 s from 16:")
    assert swings[0].text.endswith("starting with the kill on Ahri.")


def test_detect_moments_caps_and_orders() -> None:
    builder = GameBuilder(duration=2400.0)
    for n in range(20):
        t = 300.0 + n * 100.0
        builder.kill(t, 1, 6, 3000.0, 9000.0).kill(t + 2.0, 2, 7, 3000.0, 9000.0)
    moments = detect_moments(ReviewContext.build(builder.build(), "blue"))
    assert len(moments) == MAX_MOMENTS
    assert [m.t for m in moments] == sorted(m.t for m in moments)
