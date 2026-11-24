from __future__ import annotations

import json
from collections.abc import Iterable
from pathlib import Path
from typing import Any

import httpx

DDRAGON = "https://ddragon.leagueoflegends.com"
LEGENDARY_MIN_GOLD = 2200
EXCLUDED_TAGS = {"Boots", "Consumable", "Trinket"}


def legendary_item_names(item_jsons: Iterable[dict[str, Any]]) -> set[str]:
    """Finished Summoner's Rift items at or above LEGENDARY_MIN_GOLD, by name, across Data Dragon versions.

    The feed names items in English, so names are the join key.
    """
    out: set[str] = set()
    for item_json in item_jsons:
        for item in item_json["data"].values():
            gold = item.get("gold", {})
            if not item.get("maps", {}).get("11", False):
                continue
            if not gold.get("purchasable", False) or gold.get("total", 0) < LEGENDARY_MIN_GOLD:
                continue
            if item.get("into") or EXCLUDED_TAGS & set(item.get("tags", [])):
                continue
            out.add(str(item["name"]))
    return out


def ddragon_version(patch: str, versions: list[str]) -> str | None:
    """The first Data Dragon version of a patch: "16.14" -> "16.14.1"."""
    return next((v for v in versions if v.startswith(f"{patch}.")), None)


def fetch_item_jsons(
    patches: Iterable[str], cache_dir: Path, http: httpx.Client | None = None
) -> list[dict[str, Any]]:
    """item.json for every patch that Data Dragon knows, cached on disk."""
    client = http or httpx.Client(timeout=30.0)
    versions: list[str] = client.get(f"{DDRAGON}/api/versions.json").json()
    out: list[dict[str, Any]] = []
    for patch in sorted(set(patches)):
        version = ddragon_version(patch, versions)
        if version is None:
            continue
        path = cache_dir / f"items-{version}.json"
        if not path.exists():
            body = client.get(f"{DDRAGON}/cdn/{version}/data/en_US/item.json").json()
            cache_dir.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(body))
        out.append(json.loads(path.read_text()))
    return out
