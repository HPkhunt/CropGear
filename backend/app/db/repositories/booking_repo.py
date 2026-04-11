from typing import Any, Dict, List, Optional

from app.db.base import BaseRepository
from app.db.utils import serialize_doc, to_object_id


class BookingRepository(BaseRepository):
    def __init__(self, db) -> None:
        self.collection = db["bookings"]

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

    async def find_conflicting_booking(
        self,
        equipment_id: str,
        start_date: str,
        end_date: str,
        *,
        exclude_booking_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        query: Dict[str, Any] = {
            "equipment_id": equipment_id,
            "booking_status": {"$in": ["confirmed", "in_progress", "completed"]},
            "start_date": {"$lte": end_date},
            "end_date": {"$gte": start_date},
        }

        if exclude_booking_id:
            oid = to_object_id(exclude_booking_id)
            query["_id"] = {
                "$nin": [value for value in (oid, exclude_booking_id) if value is not None]
            }

        doc = await self.collection.find_one(query)
        return serialize_doc(doc) if doc else None
