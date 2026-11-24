from throughline.knowledge.items import ddragon_version, legendary_item_names

ITEMS = {
    "data": {
        "3031": {
            "name": "Infinity Edge",
            "gold": {"total": 3400, "purchasable": True},
            "maps": {"11": True},
            "tags": ["CriticalStrike"],
        },
        "1038": {
            "name": "B. F. Sword",
            "gold": {"total": 1300, "purchasable": True},
            "maps": {"11": True},
            "into": ["3031"],
            "tags": [],
        },
        "3006": {
            "name": "Berserker's Greaves",
            "gold": {"total": 1100, "purchasable": True},
            "maps": {"11": True},
            "tags": ["Boots"],
        },
        "3157": {
            "name": "Zhonya's Hourglass",
            "gold": {"total": 3250, "purchasable": True},
            "maps": {"11": False},
            "tags": [],
        },
    }
}
OLDER = {
    "data": {
        "3089": {
            "name": "Rabadon's Deathcap",
            "gold": {"total": 3600, "purchasable": True},
            "maps": {"11": True},
            "tags": [],
        }
    }
}


def test_legendaries_are_finished_rift_items_above_the_threshold_across_versions() -> None:
    assert legendary_item_names([ITEMS, OLDER]) == {"Infinity Edge", "Rabadon's Deathcap"}


def test_ddragon_version_of_a_patch() -> None:
    versions = ["16.15.1", "16.14.1", "15.24.1", "15.2.1"]
    assert ddragon_version("16.14", versions) == "16.14.1"
    assert ddragon_version("15.2", versions) == "15.2.1"
    assert ddragon_version("14.1", versions) is None
