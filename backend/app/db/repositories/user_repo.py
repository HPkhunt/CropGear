from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.db.base import BaseRepository
from app.db.utils import serialize_doc, to_object_id


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def _phone_digits(value: str) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def _normalize_favorite_ids(equipment_ids: List[str]) -> List[str]:
    seen = set()
    normalized: List[str] = []
    for equipment_id in equipment_ids:
        candidate = str(equipment_id or "").strip()
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        normalized.append(candidate)
    return normalized


class UserRepository(BaseRepository):
    def __init__(self, db) -> None:
        self.collection = db["users"]

    def _public_user(self, doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not doc:
            return None
        data = serialize_doc(doc)
        data.pop("hashed_password", None)
        data.pop("phone_digits", None)
        data.pop("favorite_equipment_ids", None)
        return data

    async def _find_by_id(self, _id: str) -> Optional[Dict[str, Any]]:
        if not _id:
            return None
        oid = to_object_id(_id)
        doc = await self.collection.find_one({"_id": oid}) if oid else None
        if not doc:
            doc = await self.collection.find_one({"_id": _id})
        return doc

    async def get_by_id(self, _id: str, public: bool = True) -> Optional[Dict[str, Any]]:
        doc = await self._find_by_id(_id)
        return self._public_user(doc) if public else serialize_doc(doc) if doc else None

    async def get_by_email(self, email: str, public: bool = True) -> Optional[Dict[str, Any]]:
        if not email:
            return None
        doc = await self.collection.find_one({"email": _normalize_email(email)})
        return self._public_user(doc) if public else serialize_doc(doc) if doc else None

    async def get_by_phone_digits(
        self, phone_digits: str, public: bool = True
    ) -> Optional[Dict[str, Any]]:
        digits = _phone_digits(phone_digits)
        if not digits:
            return None
        doc = await self.collection.find_one({"phone_digits": digits})
        return self._public_user(doc) if public else serialize_doc(doc) if doc else None

    async def create(self, data: Dict[str, Any]) -> str:
        payload = dict(data)
        payload["email"] = _normalize_email(payload.get("email", ""))
        payload["phone_digits"] = payload.get("phone_digits") or _phone_digits(
            payload.get("phone_number", "")
        )
        payload["favorite_equipment_ids"] = _normalize_favorite_ids(
            payload.get("favorite_equipment_ids", [])
        )
        payload.setdefault("created_at", _now())
        payload.setdefault("updated_at", _now())
        result = await self.collection.insert_one(payload)
        return str(result.inserted_id)

    async def update(self, _id: str, data: Dict[str, Any]) -> bool:
        if not _id:
            return False
        payload = dict(data)
        payload.setdefault("updated_at", _now())
        oid = to_object_id(_id)
        if oid:
            result = await self.collection.update_one({"_id": oid}, {"$set": payload})
            if result.matched_count > 0:
                return True
        result = await self.collection.update_one({"_id": _id}, {"$set": payload})
        return result.matched_count > 0

    async def find(self, query: Dict[str, Any], public: bool = True) -> List[Dict[str, Any]]:
        cursor = self.collection.find(query).sort("created_at", -1)
        docs = [serialize_doc(doc) async for doc in cursor]
        if public:
            for doc in docs:
                doc.pop("hashed_password", None)
        return docs

    async def list_users(self) -> List[Dict[str, Any]]:
        return await self.find({}, public=True)

    async def list_users_for_approval(
        self, status_filter: str = "pending", role_filter: str = "all"
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if role_filter != "all":
            query["role"] = role_filter
        if status_filter != "all":
            query["approval_status"] = status_filter
        docs = await self.collection.find(query).sort("created_at", -1).to_list(length=1000)
        results: List[Dict[str, Any]] = []
        for user in docs:
            kyc_profile = user.get("kyc_profile") if isinstance(user.get("kyc_profile"), dict) else {}
            results.append(
                {
                    "id": str(user.get("_id")),
                    "full_name": user.get("full_name", "User"),
                    "email": user.get("email", ""),
                    "role": user.get("role", "farmer"),
                    "approval_status": user.get("approval_status", "approved"),
                    "is_active": user.get("is_active", True),
                    "is_verified": user.get("is_verified", False),
                    "kyc_status": user.get("kyc_status", "not_started"),
                    "kyc_business_name": kyc_profile.get("business_name", ""),
                    "kyc_submitted_at": user.get("kyc_submitted_at"),
                    "kyc_review_notes": user.get("kyc_review_notes", ""),
                    "created_at": user.get("created_at"),
                }
            )
        return results

    async def set_user_approval_status(
        self, user_id: str, decision: str
    ) -> Optional[Dict[str, Any]]:
        if decision not in {"approved", "rejected", "pending"}:
            return None
        user = await self._find_by_id(user_id)
        if not user:
            return None

        update: Dict[str, Any] = {"approval_status": decision, "updated_at": _now()}
        if decision == "approved":
            update.update({"is_active": True, "is_verified": True})
        elif decision == "rejected":
            update.update({"is_active": False, "is_verified": False})
        else:
            update.update({"is_active": False, "is_verified": False})

        await self.update(str(user["_id"]), update)
        user.update(update)
        return {
            "id": str(user.get("_id")),
            "full_name": user.get("full_name", "User"),
            "email": user.get("email", ""),
            "role": user.get("role", "farmer"),
            "approval_status": user.get("approval_status", "pending"),
            "is_active": user.get("is_active", False),
            "is_verified": user.get("is_verified", False),
            "created_at": user.get("created_at"),
        }

    async def is_owner_verified(self, owner_id: str) -> bool:
        owner = await self._find_by_id(owner_id)
        if not owner or owner.get("role") != "equipment_owner":
            return False
        kyc_status = str(owner.get("kyc_status") or "").strip().lower()
        kyc_ok = not kyc_status or kyc_status == "approved"
        return (
            bool(owner.get("is_verified", False))
            and bool(owner.get("is_active", True))
            and owner.get("approval_status", "approved") == "approved"
            and kyc_ok
        )

    async def get_favorite_equipment_ids(self, user_id: str) -> List[str]:
        user = await self._find_by_id(user_id)
        if not user:
            return []
        return _normalize_favorite_ids(user.get("favorite_equipment_ids", []))

    async def set_favorite_equipment_ids(self, user_id: str, equipment_ids: List[str]) -> List[str]:
        user = await self._find_by_id(user_id)
        if not user:
            return []
        normalized = _normalize_favorite_ids(equipment_ids)
        await self.update(str(user["_id"]), {"favorite_equipment_ids": normalized})
        return normalized
