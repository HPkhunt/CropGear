from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class Review(BaseModel):
    id: str = Field(alias="_id")
    booking_id: str
    equipment_id: str
    equipment_name: Optional[str] = None
    reviewer_id: str
    reviewer_name: Optional[str] = None
    recipient_id: str
    recipient_name: Optional[str] = None
    review_type: str
    reviewer_role: Optional[str] = None
    rating: int
    title: str
    comment: str
    photos: List[str] = []
    photo_asset_ids: List[str] = []
    status: str = "pending"
    response: Optional[Dict[str, Any]] = None
    moderation: Optional[Dict[str, Any]] = None
    flags: List[Dict[str, Any]] = []
    dispute: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
