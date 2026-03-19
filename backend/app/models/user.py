from pydantic import BaseModel, EmailStr, Field
from enum import Enum
from datetime import datetime
from typing import Optional


class UserRole(str, Enum):
    FARMER = "farmer"
    EQUIPMENT_OWNER = "equipment_owner"
    ADMIN = "admin"


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    phone_number: str
    role: UserRole
    password: str


class UserInDB(BaseModel):
    id: str = Field(alias="_id")
    email: EmailStr
    full_name: str
    phone_number: str
    role: UserRole
    hashed_password: str
    created_at: datetime
    updated_at: datetime
    is_active: bool = True
    is_verified: bool = False
    average_rating: float = 0.0
    total_reviews: int = 0
    last_login: Optional[datetime] = None
