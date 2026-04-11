from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    REJECTED = "rejected"
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
