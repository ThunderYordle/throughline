from throughline.game.builder import GameBuilder
from throughline.plan.models import ConcedeItem, LaneItem, ObjectiveItem, SideItem, SpikeItem, WindowItem
from throughline.review.checks import check_item
from throughline.review.context import ReviewContext

PIT = (9866.0, 4414.0)


def dragon_item() -> ObjectiveItem:
    return ObjectiveItem(id="objective-dragon", text="", objective="dragon", spawn_at=300.0, by=280.0)


def grouped_at_dragon(builder: GameBuilder) -> GameBuilder:
    for pid in (1, 2, 3):
        builder.walk(pid, 200.0, 260.0, (6000.0, 2000.0), PIT)
    return builder


def test_objective_followed() -> None:
    game = grouped_at_dragon(GameBuilder(duration=1200.0)).objective(320.0, "dragon", "blue").build()
    check = check_item(dragon_item(), ReviewContext.build(game, "blue"))
    assert check.status == "followed"
    # They enter the pit radius at 228 s; grouping is sampled every 5 s from 210 s.
    assert check.numbers == "3 of 5 near the pit at 4:40, grouped first at 3:50; we took it at 5:20"
    assert check.at == 280.0


def test_objective_partly_when_they_group_first_and_red_view() -> None:
    builder = grouped_at_dragon(GameBuilder(duration=1200.0))
    for pid in (6, 7, 8):
        builder.walk(pid, 150.0, 200.0, (12000.0, 3000.0), PIT)
    game = builder.objective(320.0, "dragon", "blue").build()
    check = check_item(dragon_item(), ReviewContext.build(game, "blue"))
    assert check.status == "partly"
    assert (
        check.numbers == "3 of 5 near the pit at 4:40, grouped at 3:50, after them (3:30); we took it at 5:20"
    )

    alone = grouped_at_dragon(GameBuilder(duration=1200.0)).objective(320.0, "dragon", "blue").build()
    red = check_item(dragon_item(), ReviewContext.build(alone, "red"))
    assert red.status == "not_followed"
    assert red.numbers == "0 of 5 near the pit at 4:40, never 3+ there; they took it at 5:20"


def test_objective_not_applicable_when_game_ends_first() -> None:
    game = GameBuilder(duration=250.0).build()
    assert check_item(dragon_item(), ReviewContext.build(game, "blue")).status == "not_applicable"


def test_concede_followed_with_a_trade() -> None:
    item = ConcedeItem(
        id="objective-dragon", text="", objective="dragon", spawn_at=300.0, trade_lanes=["top"]
    )
    game = (
        GameBuilder(duration=1200.0)
        .walk(8, 250.0, 290.0, (12000.0, 3000.0), PIT)
        .plate(310.0, "top", "blue")
        .objective(330.0, "dragon", "red")
        .build()
    )
    check = check_item(item, ReviewContext.build(game, "blue"))
    assert check.status == "followed"
    assert check.numbers == "0 of 5 at the pit at 5:00; 1 plate or structure taken in top meanwhile"


def test_lane_followed_and_partly() -> None:
    item = LaneItem(id="lane-bot", text="", lane="bot", until=480.0)
    ahead = (
        GameBuilder(duration=1200.0)
        .gold_lead("blue", 1000, 0.0, 400.0)
        .plate(400.0, "bot", "blue")
        .plate(450.0, "bot", "blue")
        .build()
    )
    check = check_item(item, ReviewContext.build(ahead, "blue"))
    assert check.status == "followed"
    assert check.numbers == "Bot gold +400 at 8:00; plates 2-0"
    behind_on_plates = (
        GameBuilder(duration=1200.0).gold_lead("blue", 1000, 0.0, 400.0).plate(400.0, "bot", "red").build()
    )
    assert check_item(item, ReviewContext.build(behind_on_plates, "blue")).status == "partly"


def fight(
    builder: GameBuilder,
    t: float,
    blue: tuple[int, ...],
    red: tuple[int, ...],
    kills: list[tuple[int, int]],
) -> GameBuilder:
    for pid in blue + red:
        builder.walk(pid, t - 10.0, t + 5.0, (5000.0, 5000.0), (5000.0, 5000.0))
    for n, (killer, victim) in enumerate(kills):
        builder.kill(t + n, killer, victim, 5000.0, 5000.0)
    return builder


def test_window_force_and_avoid() -> None:
    force = WindowItem(id="window-1", text="", stance="force", start=900.0, end=1200.0)
    won = fight(GameBuilder(duration=1500.0), 1000.0, (1, 2, 3), (6, 7), [(1, 6), (2, 7)]).build()
    check = check_item(force, ReviewContext.build(won, "blue"))
    assert check.status == "followed"
    assert check.numbers == "1 fight from 15:00 to 20:00: won 1, lost 0"
    assert (
        check_item(force, ReviewContext.build(GameBuilder(duration=1500.0).build(), "blue")).status
        == "not_followed"
    )

    avoid = WindowItem(id="window-2", text="", stance="avoid", start=900.0, end=1200.0)
    lost_even = fight(GameBuilder(duration=1500.0), 1000.0, (1, 2), (6, 7, 8), [(6, 1), (7, 2)]).build()
    assert check_item(avoid, ReviewContext.build(lost_even, "blue")).status == "not_followed"
    assert (
        check_item(avoid, ReviewContext.build(GameBuilder(duration=1500.0).build(), "blue")).status
        == "followed"
    )


def test_spike_and_side() -> None:
    spike = SpikeItem(
        id="spike-mid-level6", text="", enemy_champion="Orianna", role="mid", kind="level6", at=380.0
    )
    died = GameBuilder(duration=1200.0).kill(420.0, 8, 3, 7500.0, 7500.0).build()
    check = check_item(spike, ReviewContext.build(died, "blue"))
    assert (check.status, check.at) == ("not_followed", 420.0)
    assert check.numbers == "1 death in mid from 6:20 to 8:20"
    assert (
        check_item(spike, ReviewContext.build(GameBuilder(duration=1200.0).build(), "blue")).status
        == "followed"
    )

    side = SideItem(id="side", text="", half="top", until=360.0)
    topside = GameBuilder(duration=1200.0).walk(2, 90.0, 360.0, (3000.0, 9000.0), (4000.0, 11000.0)).build()
    check = check_item(side, ReviewContext.build(topside, "blue"))
    assert check.status == "followed"
    assert check.numbers == "Jungler spent 100% of 1:30-6:00 on the top side"
