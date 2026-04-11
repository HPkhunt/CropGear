from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List

from app.db.client import close_db, connect_db, get_db
from app.db.mock_data import CATEGORY_BASE_RATE, EQUIPMENT_VARIANTS_BY_CATEGORY, SEED_LOCATIONS
from app.db.repositories.equipment_repo import _now_iso

logger = logging.getLogger(__name__)


CATEGORY_IMAGE_URLS = {
    # Point seeded inventory images to backend-served static uploads so they work
    # in both dev (proxy /uploads -> FastAPI) and production (FastAPI serves /uploads).
    "tractor": "/uploads/category_tractor_1772246270519.png",
    "harvester": "/uploads/category_harvester_1772246289195.png",
    "seeder": "/uploads/category_seeder_1772246342425.png",
    "tillage": "/uploads/category_plough_1772246305462.png",
    "irrigation": "/uploads/equip_rotavator_1772246357421.png",
    "crop_care": "/uploads/cta_bg_1772246513626.png",
}


def _generate_seed_items(target_count: int = 60) -> List[Dict[str, Any]]:
    created = _now_iso()
    owners = [
        {"id": "seed_owner1", "full_name": "Noah Equipment"},
        {"id": "seed_owner2", "full_name": "Liam TractorWorks"},
        {"id": "seed_owner3", "full_name": "Sophia HarvestTech"},
        {"id": "seed_owner4", "full_name": "Ethan FieldMachines"},
    ]

    items: List[Dict[str, Any]] = []
    equipment_index = 1

    for category, variants in EQUIPMENT_VARIANTS_BY_CATEGORY.items():
        base_rate = CATEGORY_BASE_RATE.get(category, 120)
        for variant_index, variant in enumerate(variants):
            owner = owners[(equipment_index - 1) % len(owners)]
            location = SEED_LOCATIONS[(equipment_index - 1) % len(SEED_LOCATIONS)]
            rating = round(4.2 + ((equipment_index % 7) * 0.1), 1)
            items.append(
                {
                    "name": variant,
                    "category": category,
                    "daily_rate": float(base_rate + (variant_index * 12)),
                    "rating": min(rating, 4.9),
                    "location": location,
                    "owner_id": owner["id"],
                    "owner_name": owner.get("full_name", "Equipment Owner"),
                    "description": f"{variant} listed by {owner.get('full_name', 'Equipment Owner')} for farm operations.",
                    "specs": [
                        f"Variant: {variant}",
                        f"Category: {category}",
                        "Well maintained",
                    ],
                    "image_url": CATEGORY_IMAGE_URLS.get(category, CATEGORY_IMAGE_URLS["tractor"]),
                    "is_available": True,
                    "created_at": created,
                    "is_visible_to_farmers": True,
                }
            )
            equipment_index += 1

    category_cycle = list(EQUIPMENT_VARIANTS_BY_CATEGORY.keys()) or ["tractor"]
    while len(items) < target_count:
        cat = category_cycle[len(items) % len(category_cycle)]
        base_rate = CATEGORY_BASE_RATE.get(cat, 120)
        owner = owners[len(items) % len(owners)]
        location = SEED_LOCATIONS[len(items) % len(SEED_LOCATIONS)]
        idx = len(items) + 1
        items.append(
            {
                "name": f"AI {cat.replace('_', ' ').title()} Model {idx}",
                "category": cat,
                "daily_rate": float(base_rate + ((idx % 9) * 7)),
                "rating": min(4.9, 4.4 + ((idx % 5) * 0.1)),
                "location": location,
                "owner_id": owner["id"],
                "owner_name": owner.get("full_name", "Equipment Owner"),
                "description": "AI-generated listing for demo inventory.",
                "specs": [f"Category: {cat}", "Model: AI", "Ready for demo bookings"],
                "image_url": CATEGORY_IMAGE_URLS.get(cat, CATEGORY_IMAGE_URLS.get("tractor")),
                "is_available": True,
                "created_at": created,
                "is_visible_to_farmers": True,
            }
        )
    return items


async def seed():
    db = get_db()
    if db is None:
        logger.error("MongoDB is not available; cannot seed equipment.")
        return
    existing = await db["equipment"].count_documents({})
    if existing > 0:
        logger.info("Equipment collection already has %s documents; skipping seed.", existing)
        return
    items = _generate_seed_items()
    await db["equipment"].insert_many(items)
    logger.info("Seeded %s equipment documents into MongoDB.", len(items))


async def main():
    await connect_db()
    try:
        await seed()
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(main())
