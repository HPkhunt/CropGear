from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional, List
from datetime import datetime


class EquipmentCategory(str, Enum):
    TRACTOR = "tractor"
    HARVESTER = "harvester"
    SEEDER = "seeder"
    TILLAGE = "tillage"
    IRRIGATION = "irrigation"
    CROP_CARE = "crop_care"


class Equipment(BaseModel):
    id: str = Field(alias="_id")
    owner_id: str
    name: str
    category: EquipmentCategory
    description: Optional[str] = None
    hourly_rate: float
    daily_rate: float
    location: dict = Field(default_factory=dict)
    images: List[dict] = Field(default_factory=list)
    image_asset_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    is_active: bool = True
    average_rating: float = 0.0
    total_reviews: int = 0
    reviews_count: int = 0
