from throughline.game.builder import GameBuilder
from throughline.knowledge.features import participant_features


def test_features_per_participant() -> None:
    game = (
        GameBuilder(duration=1000.0)
        .gold_lead("blue", 1000, 0.0, 300.0)
        .item(800.0, 3, "Rabadon's Deathcap")
        .item(820.0, 3, "Needlessly Large Rod")
        .objective(330.0, "dragon", "blue")
        .build()
    )
    rows = {(r.side, r.role): r for r in participant_features(game, legendary={"Rabadon's Deathcap"})}
    mid = rows[("blue", "mid")]
    assert (mid.champion, mid.opponent, mid.won) == ("Ahri", "Orianna", True)
    assert mid.team_gd[5] == 1000 and mid.team_gd[15] == 1000
    assert mid.team_gd[20] is None  # game shorter than 20 minutes
    assert rows[("red", "mid")].team_gd[5] == -1000
    assert mid.role_gd10 == 200
    assert mid.level6_at == 450.0  # level = 1 + t // 90
    assert (mid.item1_at, mid.item2_at) == (800.0, None)
    assert mid.gd_after_level6 == 0
    assert mid.gd_after_item1 == 0  # 800 + 180 is still inside the game
    assert rows[("blue", "top")].gd_after_item1 is None  # no legendary bought
    assert mid.first_dragon is True and rows[("red", "top")].first_dragon is False
    assert mid.first_grubs is None
    assert (mid.dragon_spawn, mid.grubs_spawn, mid.baron_spawn) == (300.0, 480.0, None)


def test_feature_spawns_come_from_the_feed_when_present() -> None:
    game = GameBuilder(duration=1300.0).spawn(294.0, "dragon").spawn(1180.0, "baron").build()
    row = participant_features(game, legendary=set())[0]
    assert (row.dragon_spawn, row.baron_spawn, row.grubs_spawn) == (294.0, 1180.0, None)
