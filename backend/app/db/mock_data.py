from __future__ import annotations

import json
import logging
import secrets
from copy import deepcopy
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.config import settings
from app.core.security import hash_password, verify_password

logger = logging.getLogger(__name__)

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

CATEGORY_BASE_RATE: Dict[str, float] = {
    "tractor": 200,
    "harvester": 380,
    "seeder": 150,
    "tillage": 130,
    "irrigation": 95,
    "crop_care": 85,
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


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_phone(value: str) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def _public_user(user: Dict[str, Any]) -> Dict[str, Any]:
    data = deepcopy(user)
    data.pop("hashed_password", None)
    return data


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


class MockDatabase:
    def __init__(self) -> None:
        self._runtime_equipment_file = Path(__file__).with_name("runtime_equipment.json")
        self._users: List[Dict[str, Any]] = []
        self._registration_otps: Dict[str, Dict[str, Any]] = {}
        self._equipment: List[Dict[str, Any]] = []
        self._seed_equipment_ids: set[str] = set()
        self._bookings: List[Dict[str, Any]] = []
        # new collections for homepage features
        self._newsletters: List[str] = []
        self._testimonials: List[Dict[str, Any]] = [
            {"quote": "Excellent service, highly recommend!", "author": "A. Farmer"},
            {"quote": "Found the perfect trailer quickly.", "author": "B. Owner"},
        ]
        self._stats: Dict[str, int] = {}
        self._seed()

    def _next_id(self, prefix: str, data: List[Dict[str, Any]]) -> str:
        return f"{prefix}{len(data) + 1}"

    def _seed(self) -> None:
        created = _now_iso()
        demo_users = _load_demo_credentials()
        if not demo_users:
            logger.warning("No demo credentials loaded. Mock database will start empty.")
            return
        default_profiles = {
            "farmer": {"full_name": "Maya Farmer", "phone_number": "+1-555-010-1010"},
            "equipment_owner": {"full_name": "Equipment Owner", "phone_number": "+1-555-010-2020"},
            "admin": {"full_name": "Ava Admin", "phone_number": "+1-555-010-3030"},
        }
        email_profile_map = {
            "farmer@cropgear.com": {"full_name": "Maya Farmer", "phone_number": "+1-555-010-1010"},
            "owner@cropgear.com": {
                "full_name": "Noah Equipment",
                "phone_number": "+1-555-010-2020",
            },
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
        for index, demo_user in enumerate(demo_users, start=1):
            profile = email_profile_map.get(
                demo_user["email"].lower(),
                default_profiles.get(
                    demo_user["role"], {"full_name": "Demo User", "phone_number": ""}
                ),
            )
            self._users.append(
                {
                    "id": f"u{index}",
                    "email": demo_user["email"],
                    "full_name": profile["full_name"],
                    "phone_number": profile["phone_number"],
                    "role": demo_user["role"],
                    "is_active": True,
                    "is_verified": True,
                    "approval_status": "approved",
                    "kyc_status": "approved" if demo_user["role"] == "equipment_owner" else "not_started",
                    "created_at": created,
                    "updated_at": created,
                    "hashed_password": hash_password(demo_user["password"]),
                }
            )

        owners = [u for u in self._users if u.get("role") == "equipment_owner"]
        self._equipment = []
        equipment_index = 1

        # Static demo images live in FastAPI's /uploads (copied from web/src/assets/images)
        category_image_urls = {
            "tractor": "/uploads/category_tractor_1772246270519.png",
            "harvester": "/uploads/category_harvester_1772246289195.png",
            "seeder": "/uploads/category_seeder_1772246342425.png",
            "tillage": "/uploads/category_plough_1772246305462.png",
            "irrigation": "/uploads/equip_rotavator_1772246357421.png",
            "crop_care": "/uploads/cta_bg_1772246513626.png",
        }

        for category, variants in EQUIPMENT_VARIANTS_BY_CATEGORY.items():
            base_rate = CATEGORY_BASE_RATE.get(category, 120)

            for variant_index, variant in enumerate(variants):
                owner = owners[(equipment_index - 1) % max(len(owners), 1)]
                location = SEED_LOCATIONS[(equipment_index - 1) % len(SEED_LOCATIONS)]
                rating = round(4.2 + ((equipment_index % 7) * 0.1), 1)
                self._equipment.append(
                    {
                        "id": f"seed_eq{equipment_index}",
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
                        "image_url": category_image_urls.get(
                            category, category_image_urls["tractor"]
                        ),
                        "is_available": True,
                        "created_at": created,
                        "is_visible_to_farmers": True,
                    }
                )
                equipment_index += 1

        # Top up inventory to ~60 demo items with AI-tagged models and images
        target_count = 60
        category_cycle = list(EQUIPMENT_VARIANTS_BY_CATEGORY.keys()) or ["tractor"]
        while len(self._equipment) < target_count:
            cat = category_cycle[len(self._equipment) % len(category_cycle)]
            base_rate = CATEGORY_BASE_RATE.get(cat, 120)
            owner = (
                owners[(len(self._equipment) - 1) % max(len(owners), 1)]
                if owners
                else {"id": "u2", "full_name": "Noah Equipment"}
            )
            location = SEED_LOCATIONS[len(self._equipment) % len(SEED_LOCATIONS)]
            idx = len(self._equipment) + 1
            self._equipment.append(
                {
                    "id": f"seed_eq{idx}",
                    "name": f"AI {cat.replace('_', ' ').title()} Model {idx}",
                    "category": cat,
                    "daily_rate": float(base_rate + ((idx % 9) * 7)),
                    "rating": min(4.9, 4.4 + ((idx % 5) * 0.1)),
                    "location": location,
                    "owner_id": owner["id"],
                    "owner_name": owner.get("full_name", "Equipment Owner"),
                    "description": "AI-generated listing for demo inventory.",
                    "specs": [f"Category: {cat}", "Model: AI", "Ready for demo bookings"],
                    "image_url": category_image_urls.get(cat, category_image_urls.get("tractor")),
                    "is_available": True,
                    "created_at": created,
                    "is_visible_to_farmers": True,
                }
            )

        self._seed_equipment_ids = {item["id"] for item in self._equipment}
        self._load_runtime_equipment()

        self._bookings = []

    def _load_runtime_equipment(self) -> None:
        try:
            if not self._runtime_equipment_file.exists():
                return
            with self._runtime_equipment_file.open("r", encoding="utf-8") as file:
                runtime_items = json.load(file)
            if not isinstance(runtime_items, list):
                return

            def _normalize_image_url(url: str) -> str:
                """Rewrite old dev-server URLs to backend-served uploads so images render."""
                if not url:
                    return url
                prefix = "http://localhost:5173/src/assets/images/"
                if url.startswith(prefix):
                    filename = url.split("/")[-1]
                    return f"/uploads/{filename}"
                return url

            existing_by_id = {item["id"]: item for item in self._equipment}
            for item in runtime_items:
                if not isinstance(item, dict):
                    continue
                if "id" not in item:
                    continue
                item.setdefault("is_visible_to_farmers", True)
                if "image_url" in item:
                    item["image_url"] = _normalize_image_url(item.get("image_url", ""))
                if item["id"] in existing_by_id:
                    existing_by_id[item["id"]].update(item)
                else:
                    self._equipment.append(item)
                    existing_by_id[item["id"]] = item
        except Exception:
            return

    def _persist_runtime_equipment(self) -> None:
        runtime_items = [
            item for item in self._equipment if item.get("id") not in self._seed_equipment_ids
        ]
        try:
            with self._runtime_equipment_file.open("w", encoding="utf-8") as file:
                json.dump(runtime_items, file, ensure_ascii=True, indent=2)
        except Exception:
            return

    def list_users(self) -> List[Dict[str, Any]]:
        return [_public_user(u) for u in self._users]

    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        for user in self._users:
            if user["id"] == user_id:
                return _public_user(user)
        return None

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        for user in self._users:
            if user["email"].lower() == email.lower():
                return user
        return None

    def get_user_by_phone(self, phone_number: str) -> Optional[Dict[str, Any]]:
        candidate = _normalize_phone(phone_number)
        if not candidate:
            return None
        for user in self._users:
            if _normalize_phone(user.get("phone_number", "")) == candidate:
                return user
        return None

    def authenticate(self, credential: str, password: str) -> Optional[Dict[str, Any]]:
        credential = (credential or "").strip()
        user = (
            self.get_user_by_email(credential)
            if "@" in credential
            else self.get_user_by_phone(credential)
        )
        if not user or not verify_password(password, user["hashed_password"]):
            return None
        if user.get("approval_status", "approved") != "approved":
            return None
        if not user.get("is_active", True):
            return None
        user["updated_at"] = _now_iso()
        return _public_user(user)

    def create_user(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        new_user = {
            "id": self._next_id("u", self._users),
            "email": payload["email"].lower(),
            "full_name": payload["full_name"],
            "phone_number": payload.get("phone_number", ""),
            "role": payload["role"],
            "hashed_password": hash_password(payload["password"]),
            "is_active": False,
            "is_verified": False,
            "approval_status": "pending",
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        }
        self._users.append(new_user)
        return _public_user(new_user)

    def create_registration_otp(self, email: str, ttl_minutes: int = 10) -> str:
        code = f"{secrets.randbelow(1_000_000):06d}"
        self._registration_otps[email.lower()] = {
            "code": code,
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes),
        }
        return code

    def consume_registration_otp(self, email: str, code: str) -> bool:
        key = email.lower()
        item = self._registration_otps.get(key)
        if not item:
            return False
        if datetime.now(timezone.utc) > item["expires_at"]:
            self._registration_otps.pop(key, None)
            return False
        if str(item["code"]) != str(code).strip():
            return False
        self._registration_otps.pop(key, None)
        return True

    def _is_owner_verified(self, owner_id: str) -> bool:
        owner = next((u for u in self._users if u.get("id") == owner_id), None)
        if not owner:
            return False
        return (
            bool(owner.get("is_verified", False))
            and owner.get("approval_status", "approved") == "approved"
        )

    def browse_equipment(
        self,
        q: str = "",
        category: str = "all",
        sort: str = "newest",
        min_rate: float = 0,
        max_rate: float = 1_000_000,
        available_only: bool = False,
        owner_verified_only: bool = False,
        include_hidden: bool = False,
        page: int = 1,
        page_size: int = 12,
    ) -> Dict[str, Any]:
        # Keep listings synchronized with runtime persistence so owner additions
        # are visible to farmers even across process reloads.
        self._load_runtime_equipment()
        search = q.lower().strip()
        category_filter = category.lower().strip()

        results = deepcopy(self._equipment)
        for item in results:
            item["owner_verified"] = self._is_owner_verified(item.get("owner_id", ""))
            item.setdefault("is_visible_to_farmers", True)

        if category_filter and category_filter != "all":
            results = [e for e in results if e["category"].lower() == category_filter]
        if not include_hidden:
            results = [e for e in results if e.get("is_visible_to_farmers", True)]
        results = [e for e in results if float(e.get("daily_rate", 0)) >= float(min_rate)]
        results = [e for e in results if float(e.get("daily_rate", 0)) <= float(max_rate)]
        if available_only:
            results = [e for e in results if e.get("is_available", True)]
        if owner_verified_only:
            results = [e for e in results if e.get("owner_verified", False)]
        if search:
            results = [
                e
                for e in results
                if search in e["name"].lower()
                or search in e["category"].lower()
                or search in e["location"].lower()
            ]

        if sort == "newest":
            results.sort(key=lambda e: e.get("created_at", ""), reverse=True)
        elif sort == "price_low":
            results.sort(key=lambda e: float(e.get("daily_rate", 0)))
        elif sort == "price_high":
            results.sort(key=lambda e: float(e.get("daily_rate", 0)), reverse=True)
        elif sort == "name":
            results.sort(key=lambda e: e.get("name", "").lower())
        else:
            results.sort(key=lambda e: float(e.get("rating", 0)), reverse=True)

        total = len(results)
        safe_page = max(int(page), 1)
        safe_page_size = max(min(int(page_size), 200), 1)
        start = (safe_page - 1) * safe_page_size
        end = start + safe_page_size
        items = results[start:end]
        total_pages = max((total + safe_page_size - 1) // safe_page_size, 1)

        return {
            "items": items,
            "total": total,
            "page": safe_page,
            "page_size": safe_page_size,
            "total_pages": total_pages,
        }

    def list_equipment(self, q: str = "", category: str = "all") -> List[Dict[str, Any]]:
        # Return a generous page size so demo callers see the full seeded inventory.
        return self.browse_equipment(q=q, category=category, page_size=250)["items"]

    def list_all_equipment_for_admin(self) -> List[Dict[str, Any]]:
        self._load_runtime_equipment()
        items = deepcopy(self._equipment)
        for item in items:
            item["owner_verified"] = self._is_owner_verified(item.get("owner_id", ""))
            item.setdefault("is_visible_to_farmers", True)
        return items

    def my_equipment(self, owner_id: str) -> List[Dict[str, Any]]:
        self._load_runtime_equipment()
        return deepcopy([e for e in self._equipment if e["owner_id"] == owner_id])

    def get_equipment(self, equipment_id: str) -> Optional[Dict[str, Any]]:
        self._load_runtime_equipment()
        for equipment in self._equipment:
            if equipment["id"] == equipment_id:
                return deepcopy(equipment)
        return None

    def create_equipment(
        self, owner_id: str, owner_name: str, payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        # Check if owner is verified
        owner = self.get_user(owner_id)
        if not owner or not self.is_owner_verified(owner_id):
            raise ValueError("Only verified equipment owners can list equipment")

        category = str(payload.get("category", "tractor")).strip().lower()
        image_url = payload.get("image_url")
        new_item = {
            "id": self._next_id("eq", self._equipment),
            "name": payload["name"],
            "category": category,
            "daily_rate": float(payload["daily_rate"]),
            "rating": 4.5,
            "location": payload.get("location", "Unspecified"),
            "owner_id": owner_id,
            "owner_name": owner_name,
            "description": payload.get("description", "Recently added listing."),
            "specs": payload.get("specs", []),
            "is_available": True,
            "created_at": _now_iso(),
            "is_visible_to_farmers": True,
        }
        if image_url:
            new_item["image_url"] = image_url
        self._equipment.append(new_item)
        self._persist_runtime_equipment()
        return deepcopy(new_item)

    def set_equipment_visibility(
        self, equipment_id: str, visible: bool
    ) -> Optional[Dict[str, Any]]:
        for item in self._equipment:
            if item.get("id") != equipment_id:
                continue
            item["is_visible_to_farmers"] = bool(visible)
            self._persist_runtime_equipment()
            return deepcopy(item)
        return None

    def delete_equipment(self, equipment_id: str) -> bool:
        index = next(
            (i for i, item in enumerate(self._equipment) if item.get("id") == equipment_id), None
        )
        if index is None:
            return False
        self._equipment.pop(index)
        self._bookings = [b for b in self._bookings if b.get("equipment_id") != equipment_id]
        self._persist_runtime_equipment()
        return True

    def my_bookings(self, user_id: str, role: str) -> List[Dict[str, Any]]:
        if role == "farmer":
            items = [b for b in self._bookings if b["farmer_id"] == user_id]
        elif role == "equipment_owner":
            items = [b for b in self._bookings if b["owner_id"] == user_id]
        else:
            items = self._bookings
        return deepcopy(items)

    def owner_requests(self, owner_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if owner_id is None:
            items = [b for b in self._bookings if b["booking_status"] == "pending"]
        else:
            items = [
                b
                for b in self._bookings
                if b["owner_id"] == owner_id and b["booking_status"] == "pending"
            ]
        return deepcopy(items)

    def update_booking_status(
        self, booking_id: str, status: str, actor_id: str, actor_role: str
    ) -> Dict[str, Any]:
        if actor_role not in {"equipment_owner", "admin"}:
            raise PermissionError("Owner access required")

        for booking in self._bookings:
            if booking["id"] != booking_id:
                continue

            if actor_role == "equipment_owner" and booking["owner_id"] != actor_id:
                raise PermissionError("You can only manage requests for your own equipment")

            current = booking.get("booking_status", "pending")
            if current != "pending":
                raise ValueError(f"Cannot update booking in '{current}' state")

            booking["booking_status"] = status
            return deepcopy(booking)

        raise LookupError("Booking not found")

    def create_booking(
        self, farmer_id: str, start_date: str, end_date: str, equipment_id: str
    ) -> Dict[str, Any]:
        equipment = self.get_equipment(equipment_id)
        if not equipment:
            raise ValueError("Equipment not found")

        farmer = self.get_user(farmer_id)
        if not farmer:
            raise ValueError("Farmer not found")

        start = date.fromisoformat(start_date)
        end = date.fromisoformat(end_date)
        if end < start:
            raise ValueError("End date must be after start date")

        duration_days = max((end - start).days + 1, 1)
        # Calculate rates
        base_rate = float(equipment.get("daily_rate", 0))
        subtotal = base_rate * duration_days
        admin_cut = subtotal * 0.10
        total_amount = subtotal + admin_cut

        new_booking = {
            "id": self._next_id("bk", self._bookings),
            "equipment_id": equipment["id"],
            "equipment_name": equipment["name"],
            "owner_id": equipment["owner_id"],
            "owner_name": equipment.get("owner_name", "Equipment Owner"),
            "farmer_id": farmer_id,
            "farmer_name": farmer["full_name"],
            "booking_status": "pending",
            "start_date": start_date,
            "end_date": end_date,
            "total_amount": total_amount,
            "admin_cut": admin_cut,
            "owner_payout": subtotal,
        }
        self._bookings.append(new_booking)
        return deepcopy(new_booking)

    def dashboard_metrics(self) -> Dict[str, Any]:
        pending_owners = len(
            [u for u in self._users if u["role"] == "equipment_owner" and not u["is_verified"]]
        )
        pending_users = len(
            [u for u in self._users if u.get("approval_status", "approved") == "pending"]
        )

        confirmed_bookings = [
            b for b in self._bookings if b.get("booking_status") in {"confirmed", "completed"}
        ]
        total_admin_revenue = sum(float(b.get("admin_cut", 0.0)) for b in confirmed_bookings)

        return {
            "users": len(self._users),
            "equipment": len(self._equipment),
            "bookings": len(self._bookings),
            "pending_owner_verifications": pending_owners,
            "pending_user_approvals": pending_users,
            "total_admin_revenue": total_admin_revenue,
        }

    def list_users_for_approval(
        self, status_filter: str = "pending", role_filter: str = "all"
    ) -> List[Dict[str, Any]]:
        users = self._users
        if role_filter != "all":
            users = [u for u in users if u.get("role") == role_filter]
        if status_filter != "all":
            users = [u for u in users if u.get("approval_status", "approved") == status_filter]

        return [
            {
                "id": user["id"],
                "full_name": user.get("full_name", "User"),
                "email": user["email"],
                "role": user.get("role", "farmer"),
                "approval_status": user.get("approval_status", "approved"),
                "is_active": user.get("is_active", True),
                "is_verified": user.get("is_verified", False),
                "kyc_status": user.get("kyc_status", "not_started"),
                "kyc_business_name": (
                    user.get("kyc_profile", {}).get("business_name", "")
                    if isinstance(user.get("kyc_profile"), dict)
                    else ""
                ),
                "kyc_submitted_at": user.get("kyc_submitted_at"),
                "kyc_review_notes": user.get("kyc_review_notes", ""),
                "created_at": user.get("created_at"),
            }
            for user in users
        ]

    def set_user_approval_status(self, user_id: str, decision: str) -> Optional[Dict[str, Any]]:
        for user in self._users:
            if user["id"] != user_id:
                continue

            if decision == "approved":
                user["approval_status"] = "approved"
                user["is_active"] = True
                user["is_verified"] = True
            elif decision == "rejected":
                user["approval_status"] = "rejected"
                user["is_active"] = False
                user["is_verified"] = False
            elif decision == "pending":
                user["approval_status"] = "pending"
                user["is_active"] = False
                user["is_verified"] = False
            else:
                return None

            user["updated_at"] = _now_iso()
            return {
                "id": user["id"],
                "full_name": user.get("full_name", "User"),
                "email": user["email"],
                "role": user.get("role", "farmer"),
                "approval_status": user.get("approval_status", "pending"),
                "is_active": user.get("is_active", False),
                "is_verified": user.get("is_verified", False),
                "created_at": user.get("created_at"),
            }
        return None

    def revenue_summary(self, period: str = "30d") -> Dict[str, Any]:
        period_days_map = {"7d": 7, "30d": 30, "90d": 90}
        days = period_days_map.get(period, 30)
        today = date.today()
        start = today - timedelta(days=days - 1)

        bookings_in_window = []
        for booking in self._bookings:
            start_date = booking.get("start_date")
            if not start_date:
                continue
            try:
                booking_day = date.fromisoformat(start_date)
            except ValueError:
                continue
            if start <= booking_day <= today:
                bookings_in_window.append(booking)

        confirmed = [
            b for b in bookings_in_window if b.get("booking_status") in {"confirmed", "completed"}
        ]
        revenue = sum(float(b.get("total_amount", 0)) for b in confirmed)
        admin_revenue = sum(float(b.get("admin_cut", 0)) for b in confirmed)
        utilization = (
            round((len(confirmed) / max(len(bookings_in_window), 1)) * 100, 1)
            if bookings_in_window
            else 0.0
        )

        daily_counts: List[int] = []
        for offset in range(days):
            day = start + timedelta(days=offset)
            count = 0
            for booking in bookings_in_window:
                try:
                    booking_day = date.fromisoformat(booking.get("start_date", ""))
                except ValueError:
                    continue
                if booking_day == day:
                    count += 1
            daily_counts.append(count)

        return {
            "period": period if period in period_days_map else "30d",
            "period_days": days,
            "revenue": revenue,
            "admin_revenue": admin_revenue,
            "utilization": utilization,
            "average_rating": round(
                sum(e["rating"] for e in self._equipment) / max(len(self._equipment), 1), 2
            ),
            "daily_bookings": daily_counts,
        }

    # newsletter/testimonial/stats helpers appended below
    def add_newsletter(self, email: str) -> None:
        if email and email not in self._newsletters:
            self._newsletters.append(email)

    def list_newsletters(self) -> List[str]:
        return list(self._newsletters)

    def list_testimonials(self) -> List[Dict[str, Any]]:
        return list(self._testimonials)

    def add_testimonial(self, quote: str, author: str) -> Dict[str, Any]:
        item = {"quote": quote, "author": author}
        self._testimonials.append(item)
        return item

    def remove_testimonial(self, index: int) -> bool:
        if 0 <= index < len(self._testimonials):
            self._testimonials.pop(index)
            return True
        return False

    def remove_newsletter(self, email: str) -> bool:
        if email in self._newsletters:
            self._newsletters.remove(email)
            return True
        return False

    def get_stats(self) -> Dict[str, int]:
        # Keep homepage metrics meaningful even when running purely in mock mode.
        base = {"equipments": 1250, "owners": 480, "bookings": 8900}
        return {
            "equipments": max(len(self._equipment), base["equipments"]),
            "owners": max(
                len([u for u in self._users if u.get("role") == "equipment_owner"]), base["owners"]
            ),
            "bookings": max(len(self._bookings), base["bookings"]),
        }


mock_db = MockDatabase()
