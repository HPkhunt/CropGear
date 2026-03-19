from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.db.base import BaseRepository
from app.db.utils import serialize_doc, to_object_id


def _now_iso() -> datetime:
    return datetime.now(timezone.utc)


class MediaRepository(BaseRepository):
    def __init__(self, db) -> None:
        self.db = db
        self.collection = db["media_assets"]

    async def get_by_id(self, _id: str) -> Optional[Dict[str, Any]]:
        if not _id:
            return None
        oid = to_object_id(_id)
        doc = await self.collection.find_one({"_id": oid}) if oid else None
        if not doc:
            doc = await self.collection.find_one({"_id": _id})
        if not doc:
            return None
        return serialize_doc(doc)

    async def find_by_key(self, key: str) -> Optional[Dict[str, Any]]:
        if not key:
            return None
        doc = await self.collection.find_one({"s3_key": key})
        return serialize_doc(doc) if doc else None

    async def create(self, data: Dict[str, Any]) -> str:
        payload = dict(data)
        payload.setdefault("created_at", _now_iso())
        payload.setdefault("updated_at", _now_iso())
        result = await self.collection.insert_one(payload)
        return str(result.inserted_id)

    async def update(self, _id: str, data: Dict[str, Any]) -> bool:
        if not _id:
            return False
        payload = dict(data)
        payload.setdefault("updated_at", _now_iso())
        oid = to_object_id(_id)
        if oid:
            result = await self.collection.update_one({"_id": oid}, {"$set": payload})
            if result.matched_count > 0:
                return True
        result = await self.collection.update_one({"_id": _id}, {"$set": payload})
        return result.matched_count > 0

    async def find(self, query: Dict[str, Any]) -> List[Dict[str, Any]]:
        cursor = self.collection.find(query)
        docs = [serialize_doc(doc) async for doc in cursor]
        return docs
