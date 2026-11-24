from tests.grid.feed import FeedBuilder
from throughline.grid.census import census, census_markdown


def test_census_counts_types_keys_and_position_gaps() -> None:
    feed = (
        FeedBuilder()
        .start_game()
        .move(10, "11", 1000.0, 2000.0)
        .move(14, "11", 1200.0, 2000.0)
        .win(100, "blue")
    )
    result = census(feed.lines())
    assert result.events["series-started-game"] == 1
    assert result.events["player-used-ability"] == 2
    assert {"position", "totalMoneyEarned", "character"} <= result.keys["player"]
    assert 4.0 in result.position_gaps


def test_census_markdown_has_types_and_no_values() -> None:
    feed = FeedBuilder().start_game().win(100, "blue")
    text = census_markdown(census(feed.lines()), "series s1")
    assert "| `team-won-game` | 1 |" in text
    assert "Aatrox" not in text and "Alpha" not in text
