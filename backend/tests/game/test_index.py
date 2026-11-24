from dataclasses import replace

from throughline.game.builder import GameBuilder
from throughline.game.index import GameIndex
from throughline.game.model import Frame


def test_frames_gold_and_proximity() -> None:
    game = (
        GameBuilder(duration=120.0)
        .walk(1, 10.0, 20.0, (1000.0, 1000.0), (1000.0, 2000.0))
        .at(2, 50.0, 9800.0, 4400.0)
        .at(3, 50.0, 9900.0, 4500.0)
        .at(7, 50.0, 9700.0, 4300.0)
        .dead(3, 51.0, 60.0)
        .gold_lead("blue", 1000, 0.0, 100.0)
        .build()
    )
    index = GameIndex(game)
    frame = index.frame(1, 15.5)
    assert frame is not None and (frame.t, frame.y) == (15.0, 1500.0)
    assert index.frame(1, -1.0) is None
    assert index.pids("red") == [6, 7, 8, 9, 10]
    assert index.gold_diff("blue", 100.0) == 1000
    assert index.gold_diff("red", 100.0) == -1000
    assert index.role_gold_diff("blue", "mid", 100.0) == 200
    assert index.lane_gold_diff("blue", "bot", 100.0) == 400
    assert index.near("blue", (9866.0, 4414.0), 2500.0, 50.0) == 2
    assert index.near("blue", (9866.0, 4414.0), 2500.0, 55.0) == 1  # player 3 is dead
    assert index.near("red", (9866.0, 4414.0), 2500.0, 50.0) == 1
    assert index.nearest_ally_distance(2, 50.0) < 200.0


def test_positions_interpolate_short_gaps_and_are_unknown_in_long_ones() -> None:
    base = GameBuilder(duration=100.0).build()
    sparse = [
        Frame(0.0, 1, 0.0, 0.0, True, 500, 1),
        Frame(10.0, 1, 1000.0, 0.0, True, 600, 1),
        Frame(60.0, 1, 5000.0, 0.0, True, 900, 1),
    ]
    index = GameIndex(replace(base, frames=sparse + [f for f in base.frames if f.pid != 1]))
    assert index.position(1, 4.0) == (400.0, 0.0)
    assert index.position(1, 13.0) == (1000.0, 0.0)  # 50 s gap: the observation 3 s away
    assert index.position(1, 30.0) is None
    assert index.position(1, 57.0) == (5000.0, 0.0)
    frame = index.frame(1, 30.0)
    assert frame is not None and frame.gold == 600
    assert index.near("blue", (1000.0, 0.0), 500.0, 30.0) == 0  # unknown is not near
