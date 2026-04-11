from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Set

from app.db.base import BaseRepository
from app.db.utils import serialize_doc, split_object_ids, to_object_id


def _now_iso() -> datetime:
    return datetime.now(timezone.utc)


class EquipmentRepository(BaseRepository):
    def __init__(self, db) -> None:
        self.db = db
        self.collection = db["equipment"]
        self.users = db["users"]

    async def _verified_owner_ids(self) -> List[str]:
        cursor = self.users.find(
            {
                "role": "equipment_owner",
                "is_verified": True,
                "is_active": True,
                "approval_status": "approved",
            },
            {"_id": 1},
        )
        docs = await cursor.to_list(length=5000)
        return [str(doc["_id"]) for doc in docs]

    async def _owner_verification_map(self, owner_ids: Iterable[str]) -> Dict[str, bool]:
        ids: Set[str] = {str(item) for item in owner_ids if item}
        if not ids:
            return {}
        object_ids, string_ids = split_object_ids(ids)
        queries = []
        if object_ids:
            queries.append({"_id": {"$in": object_ids}})
        if string_ids:
            queries.append({"_id": {"$in": string_ids}})
        if not queries:
            return {}
        query = {"$or": queries} if len(queries) > 1 else queries[0]
        cursor = self.users.find(query)
        docs = await cursor.to_list(length=len(ids))
        verified_map: Dict[str, bool] = {}
        for doc in docs:
            verified_map[str(doc["_id"])] = (
                bool(doc.get("is_verified", False))
                and bool(doc.get("is_active", True))
                and doc.get("approval_status", "approved") == "approved"
            )
        return verified_map

    async def _annotate_owner_verification(
        self, items: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        owner_ids = {item.get("owner_id") for item in items if item.get("owner_id")}
        verified_map = await self._owner_verification_map(owner_ids)
        for item in items:
            item["owner_verified"] = verified_map.get(str(item.get("owner_id")), False)
        return items

    async def get_by_id(self, _id: str) -> Optional[Dict[str, Any]]:
        if not _id:
            return None
        oid = to_object_id(_id)
        doc = await self.collection.find_one({"_id": oid}) if oid else None
        if not doc:
            doc = await self.collection.find_one({"_id": _id})
        if not doc:
            return None
        item = serialize_doc(doc)
        await self._annotate_owner_verification([item])
        return item

    async def create(self, data: Dict[str, Any]) -> str:
        data = dict(data)
        data.setdefault("created_at", _now_iso())
        data.setdefault("is_available", True)
        data.setdefault("is_visible_to_farmers", True)
        result = await self.collection.insert_one(data)
        return str(result.inserted_id)

    async def update(self, _id: str, data: Dict[str, Any]) -> bool:
        if not _id:
            return False
        oid = to_object_id(_id)
        if oid:
            result = await self.collection.update_one({"_id": oid}, {"$set": data})
            if result.matched_count > 0:
                return True
        result = await self.collection.update_one({"_id": _id}, {"$set": data})
        return result.matched_count > 0

    async def delete(self, _id: str) -> bool:
        if not _id:
            return False
        oid = to_object_id(_id)
        if oid:
            result = await self.collection.delete_one({"_id": oid})
            if result.deleted_count > 0:
                return True
        result = await self.collection.delete_one({"_id": _id})
        return result.deleted_count > 0

    async def find(self, query: Dict[str, Any]) -> List[Dict[str, Any]]:
        cursor = self.collection.find(query)
        docs = [serialize_doc(doc) async for doc in cursor]
        await self._annotate_owner_verification(docs)
        return docs

    async def browse(
        self,
        q: str = "",
        category: str = "all",
        sort: str = "newest",
        min_rate: float = 0,
        max_rate: float = 1_000_000,
        available_only: bool = False,
        owner_verified_only: bool = False,  # kept for API parity; ignored if not stored
        include_hidden: bool = False,
        page: int = 1,
        page_size: int = 12,
    ) -> Dict[str, Any]:
        search = (q or "").strip().lower()
        filters: Dict[str, Any] = {"daily_rate": {"$gte": float(min_rate), "$lte": float(max_rate)}}
        if category and category != "all":
            filters["category"] = category
        if not include_hidden:
            filters["is_visible_to_farmers"] = True
        if available_only:
            filters["is_available"] = True
        if owner_verified_only:
            verified_owner_ids = await self._verified_owner_ids()
            if not verified_owner_ids:
                return {
                    "items": [],
                    "total": 0,
                    "page": max(int(page), 1),
                    "page_size": max(min(int(page_size), 200), 1),
                    "total_pages": 1,
                }
            filters["owner_id"] = {"$in": verified_owner_ids}
        if search:
            filters["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"category": {"$regex": search, "$options": "i"}},
                {"location": {"$regex": search, "$options": "i"}},
            ]

        sort_map = {
            "newest": ("created_at", -1),
            "price_low": ("daily_rate", 1),
            "price_high": ("daily_rate", -1),
            "name": ("name", 1),
            "rating": ("rating", -1),
        }
        sort_field, sort_dir = sort_map.get(sort, ("created_at", -1))

        safe_page = max(int(page), 1)
        safe_page_size = max(min(int(page_size), 200), 1)
        skip = (safe_page - 1) * safe_page_size

        total = await self.collection.count_documents(filters)
        cursor = (
            self.collection.find(filters)
            .sort(sort_field, sort_dir)
            .skip(skip)
            .limit(safe_page_size)
        )
        items = [serialize_doc(doc) async for doc in cursor]
        await self._annotate_owner_verification(items)
        total_pages = max((total + safe_page_size - 1) // safe_page_size, 1)

        return {
            "items": items,
            "total": total,
            "page": safe_page,
            "page_size": safe_page_size,
            "total_pages": total_pages,
        }

    async def list_equipment(self, q: str = "", category: str = "all") -> List[Dict[str, Any]]:
        result = await self.browse(q=q, category=category, page_size=250)
        return result["items"]

    async def my_equipment(self, owner_id: str) -> List[Dict[str, Any]]:
        return await self.find({"owner_id": owner_id})

    async def list_all_equipment(self) -> List[Dict[str, Any]]:
        return await self.find({})

    async def set_visibility(self, equipment_id: str, visible: bool) -> Optional[Dict[str, Any]]:
        updated = await self.update(equipment_id, {"is_visible_to_farmers": bool(visible)})
        if not updated:
            return None
        return await self.get_by_id(equipment_id)
