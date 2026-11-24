from throughline.game.builder import GameBuilder


def test_defaults_fill_every_second_at_fountain() -> None:
    game = GameBuilder(duration=10.0).build()
    assert len(game.frames) == 10 * 11
    first_blue = next(f for f in game.frames if f.pid == 1 and f.t == 5.0)
    assert (first_blue.x, first_blue.y, first_blue.gold, first_blue.alive) == (500.0, 500.0, 530, True)
    assert game.champions("blue")["top"] == "Aatrox"


def test_walk_and_gold_lead() -> None:
    game = (
        GameBuilder(duration=100.0)
        .walk(2, 10.0, 20.0, (1000.0, 1000.0), (2000.0, 1000.0))
        .gold_lead("red", 1000, 50.0, 60.0)
        .build()
    )
    mid = next(f for f in game.frames if f.pid == 2 and f.t == 15.0)
    assert (mid.x, mid.y) == (1500.0, 1000.0)
    red_after = next(f for f in game.frames if f.pid == 6 and f.t == 70.0)
    blue_after = next(f for f in game.frames if f.pid == 1 and f.t == 70.0)
    assert red_after.gold - blue_after.gold == 200  # 1000 spread over 5 players
