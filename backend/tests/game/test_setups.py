from throughline.game.builder import GameBuilder
from throughline.game.index import GameIndex
from throughline.game.setups import objective_instances, setup_for

PIT = (9866.0, 4414.0)


def test_without_spawn_records_dragons_follow_the_respawn_schedule() -> None:
    game = (
        GameBuilder(duration=1100.0)
        .objective(330.0, "dragon", "blue")
        .objective(700.0, "dragon", "red")
        .build()
    )
    dragons = [i for i in objective_instances(game) if i.kind == "dragon"]
    assert [(i.spawn_at, i.taken.t if i.taken else None) for i in dragons] == [
        (300.0, 330.0),
        (630.0, 700.0),
        (1000.0, None),
    ]


def test_spawn_records_define_instances_and_grubs_merge() -> None:
    game = (
        GameBuilder(duration=1400.0)
        .spawn(294.0, "dragon", *PIT)
        .spawn(473.0, "grubs")
        .spawn(473.0, "grubs")
        .spawn(474.0, "grubs")
        .spawn(640.0, "dragon", *PIT)
        .spawn(1180.0, "baron")
        .objective(330.0, "dragon", "blue")
        .objective(500.0, "grubs", "red")
        .objective(505.0, "grubs", "red")
        .build()
    )
    instances = [(i.kind, i.spawn_at, i.taken.t if i.taken else None) for i in objective_instances(game)]
    assert instances == [
        ("dragon", 294.0, 330.0),
        ("grubs", 473.0, 500.0),
        ("dragon", 640.0, None),
        ("baron", 1180.0, None),
    ]


def test_setup_counts_players_and_grouping() -> None:
    builder = GameBuilder(duration=400.0)
    for pid in (1, 2, 3):
        builder.walk(pid, 200.0, 260.0, (6000.0, 2000.0), PIT)
    builder.walk(8, 280.0, 300.0, (12000.0, 3000.0), PIT)
    builder.objective(330.0, "dragon", "blue")
    game = builder.build()
    instance = next(i for i in objective_instances(game) if i.kind == "dragon")
    setup = setup_for(GameIndex(game), instance)
    assert setup is not None
    assert setup.near_at_spawn == {"blue": 3, "red": 1}
    # They enter the 2,500-unit radius at 228 s; samples run every 5 s from 210 s.
    assert setup.grouped_at["blue"] == 230.0
    assert setup.grouped_at["red"] is None


def test_atakhan_without_position_has_no_setup() -> None:
    game = GameBuilder(duration=1500.0).objective(1250.0, "atakhan", "red").build()
    instance = next(i for i in objective_instances(game) if i.kind == "atakhan")
    assert setup_for(GameIndex(game), instance) is None


def test_atakhan_setup_uses_the_spawn_position() -> None:
    game = GameBuilder(duration=1500.0).spawn(1189.0, "atakhan", 7000.0, 5000.0).build()
    instance = next(i for i in objective_instances(game) if i.kind == "atakhan")
    setup = setup_for(GameIndex(game), instance)
    assert setup is not None and setup.center == (7000.0, 5000.0)
