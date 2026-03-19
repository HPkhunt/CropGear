from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime
from typing import Optional


class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    DISPUTED = "disputed"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class Booking(BaseModel):
    id: str = Field(alias="_id")
    equipment_id: str
    renter_id: str
    owner_id: str
    start_date: datetime
    end_date: datetime
    base_rate: float
    total_amount: float
    booking_status: BookingStatus = BookingStatus.PENDING
    payment_status: PaymentStatus = PaymentStatus.PENDING
    created_at: datetime
    updated_at: datetime
