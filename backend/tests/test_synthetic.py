from throughline.synthetic import synthetic_games


def test_synthetic_games_are_deterministic_and_complete() -> None:
    first = list(synthetic_games(3, seed=1))
    again = list(synthetic_games(3, seed=1))
    assert [g.meta.game_id for g in first] == ["syn0000-1", "syn0001-1", "syn0002-1"]
    assert [g.winner for g in first] == [g.winner for g in again]
    for game in first:
        assert len(game.participants) == 10
        assert game.objectives and game.kills and game.spawns and game.plates
        assert game.meta.started_at < first[-1].meta.started_at or game is first[-1]
