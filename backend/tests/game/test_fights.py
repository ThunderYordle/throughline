from throughline.game.builder import GameBuilder
from throughline.game.fights import detect_fights
from throughline.game.index import GameIndex


def test_kills_close_in_time_and_space_form_one_fight() -> None:
    builder = GameBuilder(duration=400.0)
    for pid in (1, 2, 3, 6, 7):
        builder.walk(pid, 90.0, 100.0, (5000.0, 5000.0), (5000.0, 5000.0))
    builder.kill(100.0, 1, 6, 5000.0, 5000.0)
    builder.kill(105.0, 2, 7, 5100.0, 5000.0)
    builder.kill(108.0, 6, 3, 5000.0, 5100.0)
    builder.kill(300.0, 9, 4, 12000.0, 2000.0)
    fights = detect_fights(GameIndex(builder.build()))
    assert len(fights) == 2
    first = fights[0]
    assert (first.start, first.end) == (100.0, 108.0)
    assert first.kills == {"blue": 2, "red": 1}
    assert first.present == {"blue": 3, "red": 2}
    assert first.winner() == "blue"
    assert fights[1].kills == {"blue": 0, "red": 1}
