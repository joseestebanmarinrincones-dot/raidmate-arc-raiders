#!/usr/bin/env python3
"""Build the static RaidMate data files from public community data.

Data sources:
  - MetaForge API (items, map markers, event schedules)
  - MetaForge item pages (community marketplace median, opt-in)
  - Map artwork/OG images from MetaForge (credited in NOTICE.md)

The output is intentionally static so the app can be hosted on GitHub Pages
and can also be served locally by server.py.
"""

from __future__ import annotations

import argparse
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path
from typing import Any

try:
    from PIL import Image
except ImportError:  # pragma: no cover - Pillow is optional for image conversion
    Image = None

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
RAW = DATA / "raw"
ASSETS = ROOT / "assets"
MAP_ASSETS = ASSETS / "maps"
DATA_MAPS = DATA / "maps"
DATA_EVENTS = DATA / "events"

UA = "RaidMate/1.0 (open-source fan companion; +https://github.com/joseestebanmarinrincones-dot/raidmate-arc-raiders)"
API = "https://metaforge.app/api/arc-raiders"
MAP_API = "https://metaforge.app/api/game-map-data"
CUSTOM = "https://static.metaforge.app/arc-raiders/custom"

MAPS = [
    {"id": "dam", "name": "Dam Battlegrounds", "code": "DAM", "image": "dam"},
    {"id": "spaceport", "name": "Spaceport", "code": "SPA", "image": "spaceport"},
    {"id": "buried-city", "name": "Buried City", "code": "BUR", "image": "buried-city"},
    {"id": "blue-gate", "name": "The Blue Gate", "code": "GATE", "image": "blue-gate"},
    {"id": "stella-montis", "name": "Stella Montis", "code": "STE", "image": "stella-montis"},
    {"id": "riven-tides", "name": "Riven Tides", "code": "RIV", "image": "riven-tides"},
    {"id": "pendola-pass", "name": "Pendola Pass", "code": "PEN", "image": "pendola-pass"},
]

REGIONS = [
    {"id": "europe", "label": "Europa", "short": "EU"},
    {"id": "north-america", "label": "Norteamérica", "short": "NA"},
    {"id": "brazil", "label": "Sudamérica", "short": "SA"},
    {"id": "east-asia", "label": "Asia", "short": "ASIA"},
    {"id": "oceania", "label": "Oceanía", "short": "OCE"},
]

INCLUDE_TYPES = {
    "Weapon",
    "Recyclable",
    "Trinket",
    "Blueprint",
    "Quick Use",
    "Topside Material",
    "Refined Material",
    "Basic Material",
    "Key",
    "Modification",
    "Augment",
    "Shield",
    "Ammunition",
    "Nature",
    "Research Item",
    "Misc",
    "Material",
    "Quest Item",
}

# Keep the bit positions stable: the browser builds masks from this list too.
AREA_NAMES = [
    "Industrial",
    "Mechanical",
    "Medical",
    "Electrical",
    "Security",
    "Technological",
    "Commercial",
    "Residential",
    "Nature",
    "ARC",
    "Old World",
    "Military",
    "Raider",
    "Weapon",
    "Key",
    "Event",
    "Civilian",
    "Research",
    "Explosive",
    "Fuel",
]
AREA_INDEX = {name: i for i, name in enumerate(AREA_NAMES)}

TYPE_AREA_DEFAULTS = {
    "Trinket": ["Commercial", "Residential", "Old World"],
    "Key": ["Key", "Security", "Raider"],
    "Blueprint": ["Raider", "Security", "Weapon"],
    "Quick Use": ["Medical", "Commercial", "Residential"],
    "Weapon": ["Security", "Weapon", "Military"],
    "Nature": ["Nature"],
    "Topside Material": ["ARC", "Industrial", "Electrical", "Mechanical"],
    "Refined Material": ["Industrial", "Electrical", "Mechanical"],
    "Basic Material": ["Industrial", "Mechanical"],
    "Recyclable": ["Industrial", "Commercial", "Residential"],
    "Research Item": ["Research", "Technological", "Security"],
    "Augment": ["Security", "Technological"],
    "Shield": ["Security", "Military"],
    "Modification": ["Security", "Weapon"],
    "Ammunition": ["Security", "Military"],
    "Misc": ["Industrial", "Commercial"],
    "Material": ["Industrial", "Commercial"],
    "Quest Item": ["Commercial", "Residential"],
}

CONTAINER_WEIGHTS = {
    "weapon_case": 5.0,
    "security_breach": 5.0,
    "raider_cache": 4.0,
    "safe": 4.0,
    "med_crate": 3.5,
    "locker": 3.0,
    "breachable_container": 2.5,
    "hurricane_cache": 3.0,
    "baron_husk": 3.5,
    "deforester_husk": 3.0,
    "combat_supplies": 2.2,
    "utility_crate": 2.0,
    "arc_probe": 2.0,
    "arc_courier": 2.0,
    "wasp_husk": 2.0,
    "rocketeer_husk": 2.0,
    "base_container": 1.4,
    "ammo_crate": 1.4,
    "bag": 1.4,
    "suitcase": 1.4,
    "basket": 1.2,
    "field_crate": 1.2,
    "car": 0.8,
    "worn_backpack": 1.2,
    "raider_bag": 2.2,
}

CONTAINER_AREA_DEFAULTS = {
    "weapon_case": ["Security", "Weapon", "Military"],
    "security_breach": ["Security", "Technological"],
    "raider_cache": ["Raider", "Commercial"],
    "safe": ["Security", "Commercial"],
    "med_crate": ["Medical"],
    "locker": ["Residential", "Security", "Commercial"],
    "breachable_container": ["Industrial", "Security"],
    "hurricane_cache": ["Residential", "Commercial"],
    "baron_husk": ["ARC", "Mechanical"],
    "deforester_husk": ["ARC", "Mechanical"],
    "combat_supplies": ["Military", "Security"],
    "utility_crate": ["Industrial", "Electrical", "Mechanical"],
    "arc_probe": ["ARC", "Electrical", "Technological"],
    "arc_courier": ["ARC", "Technological"],
    "wasp_husk": ["ARC", "Mechanical"],
    "rocketeer_husk": ["ARC", "Mechanical"],
    "base_container": ["Industrial", "Commercial", "Residential"],
    "ammo_crate": ["Security", "Military"],
    "bag": ["Commercial", "Residential"],
    "suitcase": ["Commercial", "Residential"],
    "basket": ["Nature", "Residential"],
    "field_crate": ["Industrial", "Residential"],
    "car": ["Industrial", "Mechanical"],
    "worn_backpack": ["Raider", "Residential"],
    "raider_bag": ["Raider", "Commercial"],
}

EVENT_WEIGHTS = {
    "ship_model": 5.0,
    "assessor": 5.0,
    "harvester": 5.0,
    "frigate_cargo": 5.0,
    "snow_pile": 2.0,
    "piano": 1.0,
    "car_alarm": 1.0,
}

MARKET_RE = re.compile(
    r"MetaForge Marketplace Value \(24h Median\).{0,900}?([\d,]+)\s*Seeds",
    re.IGNORECASE | re.DOTALL,
)
UPDATED_RE = re.compile(r"Updated on ([A-Z][a-z]{2} \d{1,2}, 20\d{2})")


def http_get(url: str, timeout: int = 60) -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "application/json,text/html;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return response.read()
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as exc:
            last_error = exc
            time.sleep(1.5 + attempt * 2)
    raise RuntimeError(f"Could not fetch {url}: {last_error}")


def fetch_json(url: str, cache: Path | None = None, max_age: float | None = None) -> Any:
    if cache and cache.exists() and max_age is not None and time.time() - cache.stat().st_mtime < max_age:
        return json.loads(cache.read_text(encoding="utf-8"))
    payload = json.loads(http_get(url).decode("utf-8"))
    if cache:
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    return payload


def normalize_area(value: str) -> str:
    value = value.strip()
    aliases = {
        "oldworld": "Old World",
        "old world": "Old World",
        "technological": "Technological",
        "tech": "Technological",
        "raider": "Raider",
        "civilian": "Civilian",
        "explosives": "Explosive",
    }
    return aliases.get(value.lower(), value)


def area_mask(areas: list[str]) -> int:
    mask = 0
    for area in areas:
        normalized = normalize_area(area)
        if normalized in AREA_INDEX:
            mask |= 1 << AREA_INDEX[normalized]
    return mask


def split_areas(value: str | None) -> list[str]:
    if not value:
        return []
    return [normalize_area(part) for part in re.split(r"[,;/]", value) if part.strip()]


def display_category(item_type: str | None) -> str:
    return (item_type or "Misc").strip()


def clean_text(value: str | None) -> str:
    if not value:
        return ""
    text = re.sub(r"<[^>]+>", " ", value)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def map_id_from_name(name: str) -> str | None:
    lowered = name.lower()
    rules = [
        ("dam ", "dam"),
        ("buried city", "buried-city"),
        ("spaceport", "spaceport"),
        ("blue gate", "blue-gate"),
        ("stella montis", "stella-montis"),
        ("riven tides", "riven-tides"),
        ("pendola", "pendola-pass"),
        ("observatory", "pendola-pass"),
        ("emperor gateway", "pendola-pass"),
        ("raider hatch", None),
    ]
    for needle, map_id in rules:
        if lowered.startswith(needle):
            return map_id
    return None


# ---------------------------------------------------------------------------
# Items
# ---------------------------------------------------------------------------


def fetch_all_items() -> list[dict[str, Any]]:
    cache = RAW / "items.json"
    if cache.exists():
        cached = json.loads(cache.read_text(encoding="utf-8"))
        if isinstance(cached, list) and len(cached) > 100:
            print(f"items: using cached raw data ({len(cached)})")
            return cached

    cache.parent.mkdir(parents=True, exist_ok=True)
    records: list[dict[str, Any]] = []
    page = 1
    while True:
        url = f"{API}/items?page={page}&limit=50"
        payload = json.loads(http_get(url).decode("utf-8"))
        records.extend(payload.get("data", []))
        pagination = payload.get("pagination", {})
        print(
            f"items: page {page}/{pagination.get('totalPages', '?')} "
            f"({len(records)}/{pagination.get('total', '?')})"
        )
        if not pagination.get("hasNextPage"):
            break
        page += 1
        time.sleep(0.35)
    cache.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")
    return records


def process_items(raw_items: list[dict[str, Any]], market: dict[str, Any]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    seen: set[str] = set()

    for raw in raw_items:
        item_type = raw.get("item_type")
        if item_type not in INCLUDE_TYPES:
            continue
        item_id = raw.get("id")
        name = (raw.get("name") or "").strip().replace("\ufffd", '"').replace('""', '"')
        if not item_id or not name or item_id in seen:
            continue
        seen.add(item_id)

        # Keys sometimes point at the wrong map in the raw dataset.
        map_ids: list[str] = []
        if item_type == "Key":
            mapped = map_id_from_name(name)
            if mapped:
                map_ids = [mapped]
            elif "patrol car" in name.lower():
                map_ids = ["dam", "blue-gate"]
            elif "raider hatch" in name.lower():
                map_ids = []
            else:
                for location in raw.get("locations") or []:
                    candidate = location.get("map")
                    if candidate in {m["id"] for m in MAPS} and candidate not in map_ids:
                        map_ids.append(candidate)
        else:
            for location in raw.get("locations") or []:
                candidate = location.get("map")
                if candidate in {m["id"] for m in MAPS} and candidate not in map_ids:
                    map_ids.append(candidate)

        areas = split_areas(raw.get("loot_area"))
        if not areas:
            areas = list(TYPE_AREA_DEFAULTS.get(item_type or "Misc", []))
        # De-duplicate while keeping order.
        areas = list(dict.fromkeys(areas))

        stat = raw.get("stat_block") or {}
        market_entry = market.get(item_id) or {}
        item = {
            "id": item_id,
            "name": name,
            "type": display_category(item_type),
            "rarity": raw.get("rarity") or "Common",
            "value": raw.get("value"),
            "weight": stat.get("weight") if isinstance(stat, dict) else None,
            "stack": stat.get("stackSize") if isinstance(stat, dict) else None,
            "areas": areas,
            "maps": map_ids,
            "description": clean_text(raw.get("description") or raw.get("flavor_text")),
            "icon": raw.get("icon"),
        }
        if market_entry:
            item["market"] = market_entry.get("seeds")
            item["marketAt"] = market_entry.get("updatedAt")
        result.append(item)

    result.sort(key=lambda entry: entry["name"].lower())
    return result


# ---------------------------------------------------------------------------
# Maps and markers
# ---------------------------------------------------------------------------


def fetch_map_markers(map_id: str) -> list[dict[str, Any]]:
    cache = RAW / f"map-{map_id}.json"
    cache.parent.mkdir(parents=True, exist_ok=True)
    if cache.exists():
        return json.loads(cache.read_text(encoding="utf-8"))
    url = f"{MAP_API}?tableID=arc_map_data&mapID={urllib.parse.quote(map_id)}"
    payload = json.loads(http_get(url, timeout=90).decode("utf-8"))
    markers = payload.get("allData", payload if isinstance(payload, list) else [])
    cache.write_text(json.dumps(markers, ensure_ascii=False), encoding="utf-8")
    print(f"map {map_id}: {len(markers)} markers")
    return markers


def ensure_map_image(map_id: str, image_name: str) -> tuple[str, int, int] | None:
    raw_path = RAW / "maps" / f"{image_name}.png"
    raw_path.parent.mkdir(parents=True, exist_ok=True)
    if not raw_path.exists():
        try:
            raw_path.write_bytes(http_get(f"{CUSTOM}/{image_name}.png", timeout=90))
        except Exception as exc:
            print(f"map image {image_name}: {exc}")
            return None
    if Image is None:
        return None
    out_path = MAP_ASSETS / f"{map_id}.webp"
    MAP_ASSETS.mkdir(parents=True, exist_ok=True)
    with Image.open(raw_path) as image:
        image = image.convert("RGB")
        max_width = 1400
        if image.width > max_width:
            ratio = max_width / image.width
            image = image.resize((max_width, round(image.height * ratio)), Image.Resampling.LANCZOS)
        image.save(out_path, "WEBP", quality=82, method=6)
        return f"assets/maps/{map_id}.webp", image.width, image.height


def marker_weight(category: str, subcategory: str) -> float:
    if category == "containers":
        return CONTAINER_WEIGHTS.get(subcategory, 1.0)
    if category == "nature":
        return 2.0
    if category == "events":
        return EVENT_WEIGHTS.get(subcategory, 1.0)
    if category == "arc":
        if subcategory in {"queen", "matriarch", "harvester", "bastion", "bombardier", "leaper", "turbine"}:
            return 3.0
        return 1.0
    return 0.0


def marker_areas(category: str, subcategory: str, loot_areas: str | None) -> list[str]:
    areas = split_areas(loot_areas)
    if category == "nature":
        areas.append("Nature")
    elif category == "arc":
        areas.append("ARC")
        if subcategory in {"bastion", "matriarch", "queen", "harvester", "leaper", "turbine", "bombardier"}:
            areas.append("Mechanical")
    elif category == "events":
        areas.append("Event")
        if subcategory == "ship_model":
            areas.extend(["Commercial", "Residential", "Old World"])
        elif subcategory in {"assessor", "frigate_cargo"}:
            areas.extend(["ARC", "Technological"])
    if not areas:
        areas.extend(CONTAINER_AREA_DEFAULTS.get(subcategory, []))
    return list(dict.fromkeys(normalize_area(area) for area in areas))


def build_map(map_def: dict[str, Any]) -> dict[str, Any]:
    map_id = map_def["id"]
    markers = fetch_map_markers(map_id)
    if not markers:
        raise RuntimeError(f"No markers for {map_id}")

    lats = [float(m["lat"]) for m in markers if m.get("lat") is not None]
    lngs = [float(m["lng"]) for m in markers if m.get("lng") is not None]
    min_lat, max_lat = min(lats), max(lats)
    min_lng, max_lng = min(lngs), max(lngs)
    lat_span = max(max_lat - min_lat, 1)
    lng_span = max(max_lng - min_lng, 1)

    points: list[list[Any]] = []
    labels: list[dict[str, Any]] = []
    types: list[str] = []
    type_weights: list[float] = []
    type_index: dict[str, int] = {}

    def add_type(name: str, weight: float) -> int:
        if name not in type_index:
            type_index[name] = len(types)
            types.append(name)
            type_weights.append(weight)
        return type_index[name]

    for marker in markers:
        category = marker.get("category")
        subcategory = (marker.get("subcategory") or "").strip()
        if category not in {"containers", "nature", "arc", "events"}:
            if category == "locations":
                name = (marker.get("instanceName") or "").strip()
                if name and subcategory in {
                    "locked_room",
                    "extraction",
                    "hatch",
                    "field_depot",
                    "raider_camp",
                    "breach_room",
                    "field_crate",
                }:
                    x = (float(marker["lng"]) - min_lng) / lng_span * 100
                    y = (float(marker["lat"]) - min_lat) / lat_span * 100
                    labels.append(
                        {
                            "name": name,
                            "kind": subcategory,
                            "x": round(x, 2),
                            "y": round(y, 2),
                        }
                    )
            continue

        if category == "events" and subcategory not in EVENT_WEIGHTS:
            continue

        lat = marker.get("lat")
        lng = marker.get("lng")
        if lat is None or lng is None:
            continue
        x = (float(lng) - min_lng) / lng_span * 100
        y = (float(lat) - min_lat) / lat_span * 100
        type_name = f"{category}:{subcategory or 'unknown'}"
        weight = marker_weight(category, subcategory)
        if weight <= 0:
            continue
        type_id = add_type(type_name, weight)
        areas = marker_areas(category, subcategory, marker.get("lootAreas"))
        mask = area_mask(areas)
        # Unknown areas are ignored; points without an area match still act
        # as low-level generic containers.
        locked = 1 if marker.get("behindLockedDoor") else 0
        points.append([round(x, 2), round(y, 2), type_id, mask, locked])

        if category == "locations":
            name = (marker.get("instanceName") or "").strip()
            if name:
                labels.append(
                    {
                        "name": name,
                        "kind": subcategory,
                        "x": round(x, 2),
                        "y": round(y, 2),
                    }
                )
        elif category == "events" and subcategory in {"ship_model", "frigate_cargo", "assessor", "harvester"}:
            name = (marker.get("instanceName") or "").strip()
            if not name or name.lower() in {"ship model", "ship model "}:
                name = {
                    "ship_model": "Modelo de nave",
                    "frigate_cargo": "Carga de fragata",
                    "assessor": "Assessor",
                    "harvester": "Harvester",
                }[subcategory]
            labels.append(
                {
                    "name": name,
                    "kind": f"event:{subcategory}",
                    "x": round(x, 2),
                    "y": round(y, 2),
                }
            )
        elif category == "arc" and subcategory in {"matriarch", "queen", "harvester", "bastion"}:
            labels.append(
                {
                    "name": subcategory.capitalize(),
                    "kind": f"arc:{subcategory}",
                    "x": round(x, 2),
                    "y": round(y, 2),
                }
            )

    # De-duplicate labels by name and rounded coordinates.
    unique_labels: list[dict[str, Any]] = []
    seen_labels: set[tuple[str, int, int]] = set()
    for label in labels:
        key = (label["name"], round(label["x"] / 2), round(label["y"] / 2))
        if key in seen_labels:
            continue
        seen_labels.add(key)
        unique_labels.append(label)

    image_info = ensure_map_image(map_id, map_def["image"])
    image_path, image_width, image_height = image_info or (None, 1200, 900)

    return {
        "id": map_id,
        "name": map_def["name"],
        "code": map_def["code"],
        "image": image_path,
        "width": image_width,
        "height": image_height,
        "bounds": {
            "minLat": round(min_lat, 4),
            "maxLat": round(max_lat, 4),
            "minLng": round(min_lng, 4),
            "maxLng": round(max_lng, 4),
        },
        "areas": AREA_NAMES,
        "types": types,
        "weights": type_weights,
        "points": points,
        "labels": unique_labels,
        "markerCount": len(markers),
    }


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------


def build_events(region: str) -> dict[str, Any]:
    url = f"{API}/events-schedule?region={urllib.parse.quote(region)}&includeAll=true"
    payload = json.loads(http_get(url).decode("utf-8"))
    events = []
    for raw in payload.get("data", []):
        start = raw.get("startTime")
        end = raw.get("endTime")
        if not start or not end or end <= start:
            continue
        events.append([raw.get("name"), raw.get("map"), int(start), int(end)])
    events.sort(key=lambda item: item[2])
    return {
        "region": region,
        "fetchedAt": int(time.time() * 1000),
        "events": events,
        "attribution": "MetaForge (metaforge.app/arc-raiders)",
    }


# ---------------------------------------------------------------------------
# Market snapshot
# ---------------------------------------------------------------------------


POPULAR_IDS = [
    "advanced-electrical-components",
    "advanced-mechanical-components",
    "advanced-arc-powercell",
    "processor",
    "elephant-obelisk",
    "lances-mixtape-5th-edition",
    "sirena-dorata-ship-model",
    "queen-reactor",
    "matriarch-reactor",
    "assessor-matrix",
    "bastion-cell",
    "arc-data-module",
    "frigate-inductor",
    "looting-mk-3-survivor-blueprint",
    "dolabra-blueprint",
    "snap-hook",
    "dam-control-center-tower-key",
    "blue-gate-confiscation-room-key",
    "observatory-key",
    "emperor-gateway-conduit",
    "rusted-gears",
    "assorted-seeds",
    "antiseptic",
    "defibrillator",
    "wolfpack",
    "radial-press",
    "dead-flowers",
    "air-freshener",
    "alarm-clock",
    "bicycle-pump",
    "advanced-camera",
    "complex-gun-parts",
    "rocketeer-driver",
]


def market_candidates(items: list[dict[str, Any]], limit: int = 120) -> list[dict[str, Any]]:
    # Prioritise popular, high-value and high-rarity items. Exclude the
    # hundreds of Amplified weapon variants that rarely have marketplace data.
    rarity_bonus = {"Legendary": 3, "Epic": 2, "Rare": 1}
    by_id = {item["id"]: item for item in items}
    selected: list[dict[str, Any]] = []
    seen: set[str] = set()

    for item_id in POPULAR_IDS:
        item = by_id.get(item_id)
        if item and item_id not in seen:
            selected.append(item)
            seen.add(item_id)

    candidates = []
    for item in items:
        name = item.get("name", "")
        if item.get("rarity") == "Amplified" or "Amplified" in name:
            continue
        if item.get("type") == "Weapon" and "(" in name:
            continue
        candidates.append(item)
    candidates.sort(
        key=lambda item: (
            (item.get("value") or 0)
            + rarity_bonus.get(item.get("rarity"), 0) * 2000
            + (3000 if item.get("type") == "Trinket" else 0)
            + (1500 if item.get("type") in {"Blueprint", "Key"} else 0),
            item.get("name", ""),
        ),
        reverse=True,
    )
    for item in candidates:
        if len(selected) >= limit:
            break
        if item["id"] in seen:
            continue
        selected.append(item)
        seen.add(item["id"])
    return selected


def market_payload(result: dict[str, Any]) -> dict[str, Any]:
    return {
        "updatedAt": int(time.time() * 1000),
        "source": "MetaForge Marketplace (24h median; community trades in Seeds)",
        "url": "https://metaforge.app/arc-raiders/market/insights",
        "items": result,
    }


def fetch_market(items: list[dict[str, Any]], limit: int = 120) -> dict[str, Any]:
    cached_path = DATA / "market.json"
    cached: dict[str, Any] = {}
    if cached_path.exists():
        try:
            previous = json.loads(cached_path.read_text(encoding="utf-8"))
            cached = previous.get("items", {})
        except Exception:
            cached = {}

    result = dict(cached)
    candidates = market_candidates(items, limit)
    print(f"market: refreshing up to {len(candidates)} popular items")
    for index, item in enumerate(candidates, 1):
        item_id = item["id"]
        # Keep a fresh-enough cached value for 24h to make repeated builds cheap.
        old = result.get(item_id)
        if old and time.time() * 1000 - int(old.get("updatedAt", 0)) < 24 * 60 * 60 * 1000:
            continue
        try:
            html = http_get(
                f"https://metaforge.app/arc-raiders/database/item/{urllib.parse.quote(item_id)}",
                timeout=30,
            ).decode("utf-8", "ignore")
            match = MARKET_RE.search(html)
            seeds = None
            if match:
                seeds = int(match.group(1).replace(",", ""))
            updated_match = UPDATED_RE.search(html)
            updated = updated_match.group(1) if updated_match else None
            result[item_id] = {
                "seeds": seeds,
                "updatedAt": int(time.time() * 1000),
                "updatedLabel": updated,
            }
            print(f"  {index}/{len(candidates)} {item['name']}: {seeds if seeds is not None else 'sin dato'}")
        except Exception as exc:
            print(f"  {index}/{len(candidates)} {item['name']}: error {exc}")
        # Checkpoint every few items, so an interrupted build does not lose work.
        if index % 5 == 0:
            cached_path.write_text(
                json.dumps(market_payload(result), ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8",
            )
        time.sleep(0.2)

    payload = market_payload(result)
    cached_path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return payload


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build RaidMate static data")
    parser.add_argument("--events-only", action="store_true", help="Only refresh the event schedule")
    parser.add_argument("--market-only", action="store_true", help="Only refresh the market snapshot")
    parser.add_argument("--skip-market", action="store_true", help="Do not fetch market pages")
    parser.add_argument("--skip-maps", action="store_true", help="Reuse existing map JSON")
    parser.add_argument("--market-limit", type=int, default=120, help="Max item pages to refresh")
    args = parser.parse_args()

    RAW.mkdir(parents=True, exist_ok=True)
    DATA_EVENTS.mkdir(parents=True, exist_ok=True)
    DATA_MAPS.mkdir(parents=True, exist_ok=True)
    MAP_ASSETS.mkdir(parents=True, exist_ok=True)

    if args.events_only:
        meta = json.loads((DATA / "meta.json").read_text(encoding="utf-8")) if (DATA / "meta.json").exists() else {}
        for region in REGIONS:
            payload = build_events(region["id"])
            write_json(DATA_EVENTS / f"{region['id']}.json", payload)
            print(f"events {region['id']}: {len(payload['events'])}")
        meta["eventsUpdatedAt"] = int(time.time() * 1000)
        write_json(DATA / "meta.json", meta)
        return

    raw_items = fetch_all_items()
    processed_items = process_items(raw_items, {})

    if args.market_only:
        payload = fetch_market(raw_items, args.market_limit)
        processed_items = process_items(raw_items, payload.get("items", {}))
        write_json(DATA / "items.json", processed_items)
        print(f"items: wrote {len(processed_items)} with refreshed market data")
        return

    market = {}
    if not args.skip_market:
        market = fetch_market(raw_items, args.market_limit).get("items", {})
    else:
        market_path = DATA / "market.json"
        if market_path.exists():
            market = json.loads(market_path.read_text(encoding="utf-8")).get("items", {})
    processed_items = process_items(raw_items, market)
    write_json(DATA / "items.json", processed_items)
    print(f"items: wrote {len(processed_items)}")

    if not args.skip_maps:
        for map_def in MAPS:
            payload = build_map(map_def)
            write_json(DATA_MAPS / f"{map_def['id']}.json", payload)
            print(f"map {map_def['id']}: {len(payload['points'])} points, {len(payload['labels'])} labels")

    for region in REGIONS:
        payload = build_events(region["id"])
        write_json(DATA_EVENTS / f"{region['id']}.json", payload)
        print(f"events {region['id']}: {len(payload['events'])}")

    write_json(
        DATA / "events" / "index.json",
        {
            "regions": REGIONS,
            "updatedAt": int(time.time() * 1000),
            "attribution": "MetaForge (metaforge.app/arc-raiders)",
        },
    )
    write_json(
        DATA / "meta.json",
        {
            "generatedAt": int(time.time() * 1000),
            "itemsCount": len(processed_items),
            "maps": [map_def["id"] for map_def in MAPS],
            "regions": [region["id"] for region in REGIONS],
            "attribution": "MetaForge (metaforge.app/arc-raiders)",
            "market": "Community marketplace medians in Seeds; not an official auction house.",
        },
    )
    print("done")


if __name__ == "__main__":
    main()
