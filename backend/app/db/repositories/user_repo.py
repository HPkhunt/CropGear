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


class UserRepository(BaseRepository):
    def __init__(self, db) -> None:
        self.collection = db["users"]

    def _public_user(self, doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not doc:
            return None
        data = serialize_doc(doc)
        data.pop("hashed_password", None)
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

    async def get_by_phone_digits(self, phone_digits: str, public: bool = True) -> Optional[Dict[str, Any]]:
        digits = _phone_digits(phone_digits)
        if not digits:
            return None
        doc = await self.collection.find_one({"phone_digits": digits})
        return self._public_user(doc) if public else serialize_doc(doc) if doc else None

    async def create(self, data: Dict[str, Any]) -> str:
        payload = dict(data)
        payload["email"] = _normalize_email(payload.get("email", ""))
        payload["phone_digits"] = payload.get("phone_digits") or _phone_digits(payload.get("phone_number", ""))
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

    async def list_users_for_approval(self, status_filter: str = "pending", role_filter: str = "all") -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if role_filter != "all":
            query["role"] = role_filter
        if status_filter != "all":
            query["approval_status"] = status_filter
        docs = await self.collection.find(query).sort("created_at", -1).to_list(length=1000)
        results: List[Dict[str, Any]] = []
        for user in docs:
            results.append(
                {
                    "id": str(user.get("_id")),
                    "full_name": user.get("full_name", "User"),
                    "email": user.get("email", ""),
                    "role": user.get("role", "farmer"),
                    "approval_status": user.get("approval_status", "approved"),
                    "is_active": user.get("is_active", True),
                    "is_verified": user.get("is_verified", False),
                    "created_at": user.get("created_at"),
                }
            )
        return results

    async def set_user_approval_status(self, user_id: str, decision: str) -> Optional[Dict[str, Any]]:
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

    async def list_owner_verifications(self, status_filter: str = "all") -> List[Dict[str, Any]]:
        owners = await self.collection.find({"role": "equipment_owner"}).sort("created_at", -1).to_list(length=1000)
        results: List[Dict[str, Any]] = []
        for owner in owners:
            if not owner.get("is_active", True):
                status = "rejected"
            elif owner.get("is_verified", False):
                status = "verified"
            else:
                status = "pending"

            if status_filter != "all" and status != status_filter:
                continue

            results.append(
                {
                    "id": str(owner.get("_id")),
                    "name": owner.get("full_name", "Owner"),
                    "email": owner.get("email", ""),
                    "status": status,
                    "created_at": owner.get("created_at"),
                }
            )
        return results

    async def set_owner_verification_status(self, owner_id: str, status: str) -> Optional[Dict[str, Any]]:
        if status not in {"verified", "pending", "rejected"}:
            return None
        owner = await self._find_by_id(owner_id)
        if not owner or owner.get("role") != "equipment_owner":
            return None

        update: Dict[str, Any] = {"updated_at": _now()}
        if status == "verified":
            update.update({"is_verified": True, "is_active": True})
        elif status == "pending":
            update.update({"is_verified": False, "is_active": True})
        else:
            update.update({"is_verified": False, "is_active": False})

        await self.update(str(owner["_id"]), update)
        owner.update(update)
        return {
            "id": str(owner.get("_id")),
            "name": owner.get("full_name", "Owner"),
            "email": owner.get("email", ""),
            "status": status,
            "created_at": owner.get("created_at"),
        }

    async def is_owner_verified(self, owner_id: str) -> bool:
        owner = await self._find_by_id(owner_id)
        if not owner or owner.get("role") != "equipment_owner":
            return False
        return bool(owner.get("is_verified", False)) and bool(owner.get("is_active", True)) and owner.get("approval_status", "approved") == "approved"
