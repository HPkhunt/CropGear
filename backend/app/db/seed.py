from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from app.config import settings
from app.core.security import hash_password

logger = logging.getLogger(__name__)


CATEGORY_IMAGE_URLS: Dict[str, str] = {
    "tractor": "/uploads/category_tractor_1772246270519.png",
    "harvester": "/uploads/category_harvester_1772246289195.png",
    "seeder": "/uploads/category_seeder_1772246342425.png",
    "tillage": "/uploads/category_plough_1772246305462.png",
    "irrigation": "/uploads/equip_rotavator_1772246357421.png",
    "crop_care": "/uploads/cta_bg_1772246513626.png",
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _load_demo_credentials() -> List[Dict[str, str]]:
    if not settings.ENABLE_DEMO_SEED:
        return []
    seed_file = Path(__file__).with_name("demo_credentials.json")
    try:
        with seed_file.open("r", encoding="utf-8") as file:
            data = json.load(file)
        items = [item for item in data if "role" in item and "email" in item and "password" in item]
        if items:
            return items
    except Exception as exc:
        logger.warning("Demo credential seed file unavailable or invalid: %s", exc)
    return []


def _profile_for_email(email: str, role: str) -> Dict[str, str]:
    email_profile_map = {
        "farmer@cropgear.com": {"full_name": "Maya Farmer", "phone_number": "+1-555-010-1010"},
        "owner@cropgear.com": {"full_name": "Noah Equipment", "phone_number": "+1-555-010-2020"},
        "owner2@cropgear.com": {
            "full_name": "Liam TractorWorks",
            "phone_number": "+1-555-010-2222",
        },
        "owner3@cropgear.com": {
            "full_name": "Sophia HarvestTech",
            "phone_number": "+1-555-010-3333",
        },
        "owner4@cropgear.com": {
            "full_name": "Ethan FieldMachines",
            "phone_number": "+1-555-010-4444",
        },
        "admin@cropgear.com": {"full_name": "Ava Admin", "phone_number": "+1-555-010-3030"},
    }
    default_profiles = {
        "farmer": {"full_name": "Maya Farmer", "phone_number": "+1-555-010-1010"},
        "equipment_owner": {"full_name": "Equipment Owner", "phone_number": "+1-555-010-2020"},
        "admin": {"full_name": "Ava Admin", "phone_number": "+1-555-010-3030"},
    }
    return email_profile_map.get(
        email.lower(), default_profiles.get(role, {"full_name": "Demo User", "phone_number": ""})
    )


def _phone_digits(value: str) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def _coords_for_location(location: str) -> Dict[str, Any] | None:
    coords = SEED_LOCATION_COORDS.get(location)
    if not coords:
        return None
    latitude, longitude = coords
    return {"type": "Point", "coordinates": [longitude, latitude]}


def _generate_equipment_seed(
    owners: List[Dict[str, Any]], target_count: int = 60
) -> List[Dict[str, Any]]:
    created = _now()
    items: List[Dict[str, Any]] = []
    equipment_index = 1

    for category, variants in EQUIPMENT_VARIANTS_BY_CATEGORY.items():
        base_rate = CATEGORY_BASE_RATE.get(category, 120)
        for variant_index, variant in enumerate(variants):
            owner = owners[(equipment_index - 1) % len(owners)]
            location = SEED_LOCATIONS[(equipment_index - 1) % len(SEED_LOCATIONS)]
            rating = round(4.2 + ((equipment_index % 7) * 0.1), 1)
            location_coords = _coords_for_location(location)
            items.append(
                {
                    "name": variant,
                    "category": category,
                    "daily_rate": float(base_rate + (variant_index * 12)),
                    "rating": min(rating, 4.9),
                    "location": location,
                    **({"location_coords": location_coords} if location_coords else {}),
                    "owner_id": str(owner["_id"]),
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
        location_coords = _coords_for_location(location)
        idx = len(items) + 1
        items.append(
            {
                "name": f"AI {cat.replace('_', ' ').title()} Model {idx}",
                "category": cat,
                "daily_rate": float(base_rate + ((idx % 9) * 7)),
                "rating": min(4.9, 4.4 + ((idx % 5) * 0.1)),
                "location": location,
                **({"location_coords": location_coords} if location_coords else {}),
                "owner_id": str(owner["_id"]),
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


async def seed_demo_data(db) -> None:
    if not settings.ENABLE_DEMO_SEED:
        return

    try:
        users_count = await db.users.count_documents({})
        if users_count == 0:
            demo_users = _load_demo_credentials()
            if demo_users:
                now = _now()
                user_docs: List[Dict[str, Any]] = []
                for demo_user in demo_users:
                    email = demo_user["email"].strip().lower()
                    role = demo_user["role"]
                    profile = _profile_for_email(email, role)
                    phone_number = profile.get("phone_number", "")
                    user_docs.append(
                        {
                            "email": email,
                            "full_name": profile.get("full_name", "Demo User"),
                            "phone_number": phone_number,
                            "phone_digits": _phone_digits(phone_number),
                            "role": role,
                            "hashed_password": hash_password(demo_user["password"]),
                            "is_active": True,
                            "is_verified": True,
                            "approval_status": "approved",
                            "kyc_status": "approved" if role == "equipment_owner" else "not_started",
                            "created_at": now,
                            "updated_at": now,
                        }
                    )
                if user_docs:
                    await db.users.insert_many(user_docs)
                    logger.info("Seeded %s demo users into MongoDB.", len(user_docs))
        owners = await db.users.find({"role": "equipment_owner"}).to_list(length=1000)
        equipment_count = await db.equipment.count_documents({})
        if equipment_count == 0 and owners:
            items = _generate_equipment_seed(owners)
            await db.equipment.insert_many(items)
            logger.info("Seeded %s equipment documents into MongoDB.", len(items))

        testimonials_count = await db.testimonials.count_documents({})
        if testimonials_count == 0:
            now = _now()
            await db.testimonials.insert_many(
                [
                    {
                        "quote": "Excellent service, highly recommend!",
                        "author": "A. Farmer",
                        "created_at": now,
                    },
                    {
                        "quote": "Found the perfect trailer quickly.",
                        "author": "B. Owner",
                        "created_at": now,
                    },
                ]
            )
            logger.info("Seeded testimonials into MongoDB.")
    except Exception as exc:
        logger.warning("Demo seed failed: %s", exc)


CATEGORY_BASE_RATE: Dict[str, float] = {
    "tractor": 200,
    "harvester": 380,
    "seeder": 150,
    "tillage": 130,
    "irrigation": 95,
    "crop_care": 85,
}

EQUIPMENT_VARIANTS_BY_CATEGORY: Dict[str, List[str]] = {
    "tractor": [
        "Utility Tractor",
        "Compact Tractor",
        "Mini Tractor",
        "Row Crop Tractor",
        "Garden Tractor",
        "4WD Tractor",
        "Orchard Tractor",
    ],
    "harvester": [
        "Combine Harvester",
        "Mini Combine Harvester",
        "Paddy Harvester",
        "Wheat Harvester",
        "Sugarcane Harvester",
        "Forage Harvester",
    ],
    "seeder": [
        "Seed Drill",
        "Zero Till Seed Drill",
        "Pneumatic Seed Drill",
        "Multi Crop Planter",
        "Rice Transplanter",
        "Maize Planter",
    ],
    "tillage": [
        "Rotavator",
        "Power Tiller",
        "Cultivator",
        "Disc Harrow",
        "Plough",
        "MB Plough",
        "Subsoiler",
    ],
    "irrigation": [
        "Drip Irrigation System",
        "Sprinkler System",
        "Water Pump",
        "Submersible Pump",
        "Solar Pump",
        "Boom Sprayer",
    ],
    "crop_care": [
        "Power Sprayer",
        "Knapsack Sprayer",
        "Mist Blower",
        "Fertilizer Spreader",
        "Mulching Machine",
    ],
}

SEED_LOCATIONS = [
    "Des Moines, IA",
    "Ames, IA",
    "Iowa City, IA",
    "Cedar Rapids, IA",
    "Sioux Falls, SD",
    "Lincoln, NE",
    "Fargo, ND",
    "Wichita, KS",
]

SEED_LOCATION_COORDS: Dict[str, tuple[float, float]] = {
    "Des Moines, IA": (41.5868, -93.6250),
    "Ames, IA": (42.0347, -93.6200),
    "Iowa City, IA": (41.6611, -91.5302),
    "Cedar Rapids, IA": (41.9779, -91.6656),
    "Sioux Falls, SD": (43.5446, -96.7311),
    "Lincoln, NE": (40.8136, -96.7026),
    "Fargo, ND": (46.8772, -96.7898),
    "Wichita, KS": (37.6872, -97.3301),
}
