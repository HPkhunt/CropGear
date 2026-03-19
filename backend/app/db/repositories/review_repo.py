from typing import Any, Dict, List, Optional

from app.db.base import BaseRepository
from app.db.utils import serialize_doc, to_object_id


class ReviewRepository(BaseRepository):
    def __init__(self, db) -> None:
        self.collection = db["reviews"]

    async def get_by_id(self, _id: str) -> Optional[Dict[str, Any]]:
        if not _id:
            return None
        oid = to_object_id(_id)
        doc = await self.collection.find_one({"_id": oid}) if oid else None
        if not doc:
            doc = await self.collection.find_one({"_id": _id})
        return serialize_doc(doc) if doc else None

    async def create(self, data: Dict[str, Any]) -> str:
        result = await self.collection.insert_one(data)
        return str(result.inserted_id)

    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        doc = await self.collection.find_one(query)
        return serialize_doc(doc) if doc else None

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

    async def find(self, query: Dict[str, Any]) -> List[Dict[str, Any]]:
        cursor = self.collection.find(query).sort("created_at", -1)
        return [serialize_doc(doc) async for doc in cursor]

    async def find_by_booking_reviewer(
        self, booking_id: str, reviewer_id: str, review_type: str
    ) -> Optional[Dict[str, Any]]:
        if not booking_id or not reviewer_id:
            return None
        return await self.find_one(
            {"booking_id": booking_id, "reviewer_id": reviewer_id, "review_type": review_type}
        )
