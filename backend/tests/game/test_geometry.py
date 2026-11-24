import pytest

from throughline.game.geometry import (
    FOUNTAIN,
    PITS,
    dist,
    half_of,
    lane_at,
    objective_center,
    to_side_frame,
)
from throughline.game.model import Objective


def test_red_frame_maps_red_base_to_blue_base_and_keeps_lanes() -> None:
    assert to_side_frame(*FOUNTAIN["red"], "red") == pytest.approx((700.0, 700.0))
    assert to_side_frame(1000.0, 14000.0, "red") == (1000.0, 14000.0)  # top corner stays top
    assert to_side_frame(14000.0, 1000.0, "red") == (14000.0, 1000.0)  # bot corner stays bot
    assert to_side_frame(123.0, 456.0, "blue") == (123.0, 456.0)


def test_halves_and_lanes() -> None:
    assert half_of(1000.0, 9000.0) == "top"
    assert half_of(9000.0, 1000.0) == "bot"
    assert lane_at(1000.0, 8000.0) == "top"
    assert lane_at(7500.0, 7500.0) == "mid"
    assert lane_at(8000.0, 1000.0) == "bot"
    assert lane_at(4000.0, 9000.0) is None


def test_objective_centers() -> None:
    assert objective_center("dragon") == PITS["dragon"]
    assert objective_center("grubs") == PITS["baron"]
    assert objective_center("atakhan") is None
    assert objective_center("atakhan", Objective(1200.0, "atakhan", "blue", 7000.0, 5000.0)) == (
        7000.0,
        5000.0,
    )
    assert dist((0.0, 0.0), (3.0, 4.0)) == 5.0
