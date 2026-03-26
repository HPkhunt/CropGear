from datetime import date, datetime, timezone
from typing import Optional
import logging

from fastapi import APIRouter, Depends, Query, status, Request
from pydantic import BaseModel, Field

from app.core.exceptions import APIException
from app.dependencies import get_current_user
from app.db.client import get_required_db
from app.db.repositories.booking_repo import BookingRepository
from app.db.repositories.equipment_repo import EquipmentRepository
from app.db.repositories.user_repo import UserRepository
from app.config import settings
# from app.services.notification_service import notification_manager
from app.services.cache_service import cache_service
from app.utils.email import EmailService

router = APIRouter()
logger = logging.getLogger(__name__)
email_service = EmailService()

def _now_iso() -> datetime:
    return datetime.now(timezone.utc)


class CreateBookingRequest(BaseModel):
    equipment_id: str = Field(min_length=1)
    start_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    end_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")


class CancelBookingRequest(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=500)


async def _check_date_conflict(db, equipment_id: str, start_date: str, end_date: str, exclude_booking_id: str = None) -> bool:
    """Check if the equipment already has an active booking that overlaps with the given dates."""
    conflict_query = {
        "equipment_id": equipment_id,
        "booking_status": {"$in": ["pending", "confirmed"]},
        "$or": [
            {"start_date": {"$lte": end_date}, "end_date": {"$gte": start_date}},
        ],
    }
    if exclude_booking_id:
        from app.db.utils import to_object_id
        oid = to_object_id(exclude_booking_id)
        if oid:
            conflict_query["_id"] = {"$ne": oid}
        else:
            conflict_query["_id"] = {"$ne": exclude_booking_id}
    count = await db["bookings"].count_documents(conflict_query)
    return count > 0


@router.get("/")
async def list_bookings(current_user: dict = Depends(get_current_user), db=Depends(get_required_db)):
    # Generate cache key based on user role and id
    cache_key = f"bookings:{current_user.get('role', 'farmer')}:{current_user['sub']}"
    
    # Try cache first
    cached = await cache_service.get(cache_key)
    if cached is not None:
        return cached
    
    repo = BookingRepository(db)
    role = current_user.get("role", "farmer")
    user_id = current_user["sub"]
    if role == "farmer":
        result = await repo.find({"renter_id": user_id})
    elif role == "equipment_owner":
        result = await repo.find({"owner_id": user_id})
    else:
        result = await repo.find({})
    
    # Cache for 5 minutes
    await cache_service.set(cache_key, result, expire=300)
    return result

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_booking(payload: CreateBookingRequest, current_user: dict = Depends(get_current_user), db=Depends(get_required_db)):
    if current_user.get("role") not in {"farmer", "admin"}:
        raise APIException("Farmer access required", status.HTTP_403_FORBIDDEN)
        
    try:
        start = date.fromisoformat(payload.start_date)
        end = date.fromisoformat(payload.end_date)
        if end < start:
            raise ValueError("End date must be after start date")
    except ValueError as e:
        raise APIException(str(e), status.HTTP_400_BAD_REQUEST)
    
    eq_repo = EquipmentRepository(db)
    equipment = await eq_repo.get_by_id(payload.equipment_id)
    if not equipment:
        raise APIException("Equipment not found", status.HTTP_400_BAD_REQUEST)

    # Check for date conflicts (prevent double-booking)
    has_conflict = await _check_date_conflict(db, payload.equipment_id, payload.start_date, payload.end_date)
    if has_conflict:
        raise APIException(
            "This equipment is already booked for the selected dates. Please choose different dates.",
            status.HTTP_409_CONFLICT,
        )

    duration_days = max((end - start).days + 1, 1)
    base_rate = float(equipment.get("daily_rate", 0))
    subtotal = base_rate * duration_days
    admin_cut = subtotal * 0.10
    total_amount = subtotal + admin_cut
    
    farmer_name = current_user.get("full_name") or current_user.get("name") or "Farmer"
    
    booking_data = {
        "equipment_id": equipment["id"],
        "equipment_name": equipment.get("name"),
        "owner_id": equipment.get("owner_id"),
        "owner_name": equipment.get("owner_name", "Equipment Owner"),
        "renter_id": current_user["sub"],
        "farmer_name": farmer_name,
        "booking_status": "pending",
        "start_date": payload.start_date,
        "end_date": payload.end_date,
        "total_amount": total_amount,
        "admin_cut": admin_cut,
        "owner_payout": subtotal,
        "created_at": _now_iso(),
        "updated_at": _now_iso()
    }
    repo = BookingRepository(db)
    new_id = await repo.create(booking_data)
    result = await repo.get_by_id(new_id)
    
    # Invalidate booking list caches
    await cache_service.delete_pattern(f"bookings:*:{current_user['sub']}")
    await cache_service.delete_pattern(f"bookings:*:{equipment.get('owner_id')}")

    if settings.ENABLE_BOOKING_REQUEST_EMAIL:
        try:
            user_repo = UserRepository(db)
            owner = await user_repo.get_by_id(equipment.get("owner_id"), public=True)
            if owner and owner.get("email"):
                await email_service.send_booking_request(result or booking_data, owner["email"])
        except Exception as exc:
            logger.warning("Booking request email failed: %s", exc)
    
    return result

@router.get("/requests")
async def booking_requests(current_user: dict = Depends(get_current_user), db=Depends(get_required_db)):
    if current_user.get("role") not in {"equipment_owner", "admin"}:
        raise APIException("Owner access required", status.HTTP_403_FORBIDDEN)

    repo = BookingRepository(db)
    if current_user.get("role") == "admin":
        return await repo.find({"booking_status": "pending"})
    return await repo.find({"owner_id": current_user["sub"], "booking_status": "pending"})

@router.get("/check-availability")
async def check_availability(
    equipment_id: str = Query(min_length=1),
    start_date: str = Query(pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: str = Query(pattern=r"^\d{4}-\d{2}-\d{2}$"),
    db=Depends(get_required_db),
):
    """Check if equipment is available for the given date range."""
    has_conflict = await _check_date_conflict(db, equipment_id, start_date, end_date)
    return {"available": not has_conflict, "equipment_id": equipment_id, "start_date": start_date, "end_date": end_date}

@router.post("/{booking_id}/approve")
async def approve_booking(booking_id: str, request: Request, current_user: dict = Depends(get_current_user), db=Depends(get_required_db)):
    if current_user.get("role") not in {"equipment_owner", "admin"}:
        raise APIException("Owner access required", status.HTTP_403_FORBIDDEN)
        
    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise APIException("Booking not found", status.HTTP_404_NOT_FOUND)
    if current_user.get("role") == "equipment_owner" and booking.get("owner_id") != current_user["sub"]:
        raise APIException("You can only manage requests for your own equipment", status.HTTP_403_FORBIDDEN)
    if booking.get("booking_status", "pending") != "pending":
        raise APIException(f"Cannot update booking in '{booking.get('booking_status')}' state", status.HTTP_400_BAD_REQUEST)
        
    await repo.update(booking_id, {"booking_status": "confirmed", "updated_at": _now_iso()})
    updated_booking = await repo.get_by_id(booking_id)
    
    # Send notification
    notification_manager = request.app.state.notification_manager
    await notification_manager.broadcast({
        "type": "booking_approved",
        "booking_id": booking_id,
        "farmer_id": booking.get("renter_id"),
        "equipment_name": booking.get("equipment_name"),
        "message": f"Your booking for {booking.get('equipment_name')} has been approved!"
    })
    
    # Invalidate booking caches
    await cache_service.delete_pattern(f"bookings:*:{booking.get('renter_id')}")
    await cache_service.delete_pattern(f"bookings:*:{current_user['sub']}")

    if settings.ENABLE_BOOKING_CONFIRMATION_EMAIL:
        try:
            user_repo = UserRepository(db)
            farmer = await user_repo.get_by_id(booking.get("renter_id"), public=True)
            if farmer and farmer.get("email"):
                await email_service.send_booking_confirmation(updated_booking or booking, farmer["email"])
        except Exception as exc:
            logger.warning("Booking confirmation email failed: %s", exc)
    
    return {"ok": True, "booking": updated_booking}

@router.post("/{booking_id}/reject")
async def reject_booking(booking_id: str, request: Request, current_user: dict = Depends(get_current_user), db=Depends(get_required_db)):
    if current_user.get("role") not in {"equipment_owner", "admin"}:
        raise APIException("Owner access required", status.HTTP_403_FORBIDDEN)
        
    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise APIException("Booking not found", status.HTTP_404_NOT_FOUND)
    if current_user.get("role") == "equipment_owner" and booking.get("owner_id") != current_user["sub"]:
        raise APIException("You can only manage requests for your own equipment", status.HTTP_403_FORBIDDEN)
    if booking.get("booking_status", "pending") != "pending":
        raise APIException(f"Cannot update booking in '{booking.get('booking_status')}' state", status.HTTP_400_BAD_REQUEST)
        
    await repo.update(booking_id, {"booking_status": "rejected", "updated_at": _now_iso()})
    updated_booking = await repo.get_by_id(booking_id)
    
    # Send notification
    notification_manager = request.app.state.notification_manager
    await notification_manager.broadcast({
        "type": "booking_rejected",
        "booking_id": booking_id,
        "farmer_id": booking.get("renter_id"),
        "equipment_name": booking.get("equipment_name"),
        "message": f"Your booking for {booking.get('equipment_name')} has been rejected."
    })
    
    # Invalidate booking caches
    await cache_service.delete_pattern(f"bookings:*:{booking.get('renter_id')}")
    await cache_service.delete_pattern(f"bookings:*:{current_user['sub']}")

    if settings.ENABLE_BOOKING_STATUS_EMAIL:
        try:
            user_repo = UserRepository(db)
            farmer = await user_repo.get_by_id(booking.get("renter_id"), public=True)
            if farmer and farmer.get("email"):
                await email_service.send_booking_rejected(updated_booking or booking, farmer["email"])
        except Exception as exc:
            logger.warning("Booking rejection email failed: %s", exc)
    
    return {"ok": True, "booking": updated_booking}

@router.post("/{booking_id}/cancel")
async def cancel_booking(
    booking_id: str,
    request: Request,
    payload: CancelBookingRequest = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    """Cancel a booking. Farmers can cancel their own pending bookings. Owners/admins can cancel any active booking."""
    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise APIException("Booking not found", status.HTTP_404_NOT_FOUND)

    role = current_user.get("role", "farmer")
    user_id = current_user["sub"]

    # Authorization
    if role == "farmer":
        if booking.get("renter_id") != user_id:
            raise APIException("You can only cancel your own bookings", status.HTTP_403_FORBIDDEN)
        if booking.get("booking_status") not in {"pending", "confirmed"}:
            raise APIException(f"Cannot cancel a booking in '{booking.get('booking_status')}' state", status.HTTP_400_BAD_REQUEST)
    elif role == "equipment_owner":
        if booking.get("owner_id") != user_id:
            raise APIException("You can only cancel bookings for your own equipment", status.HTTP_403_FORBIDDEN)
        if booking.get("booking_status") in {"completed", "cancelled"}:
            raise APIException(f"Cannot cancel a booking in '{booking.get('booking_status')}' state", status.HTTP_400_BAD_REQUEST)
    elif role != "admin":
        raise APIException("Not authorized", status.HTTP_403_FORBIDDEN)

    update_data = {
        "booking_status": "cancelled",
        "cancelled_by": user_id,
        "cancelled_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    if payload and payload.reason:
        update_data["cancel_reason"] = payload.reason

    await repo.update(booking_id, update_data)
    updated_booking = await repo.get_by_id(booking_id)

    # Notify the other party
    notification_manager = request.app.state.notification_manager
    notify_user = booking.get("renter_id") if role != "farmer" else booking.get("owner_id")
    await notification_manager.broadcast({
        "type": "booking_cancelled",
        "booking_id": booking_id,
        "target_user_id": notify_user,
        "equipment_name": booking.get("equipment_name"),
        "message": f"Booking for {booking.get('equipment_name')} has been cancelled.",
    })

    # Invalidate caches
    await cache_service.delete_pattern(f"bookings:*:{booking.get('renter_id')}")
    await cache_service.delete_pattern(f"bookings:*:{booking.get('owner_id')}")

    return {"ok": True, "booking": updated_booking}


@router.post("/{booking_id}/complete")
async def complete_booking(
    booking_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    """Mark a booking as completed. Only owner or admin can complete a confirmed booking."""
    role = current_user.get("role", "farmer")
    if role not in {"equipment_owner", "admin"}:
        raise APIException("Owner or admin access required", status.HTTP_403_FORBIDDEN)

    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise APIException("Booking not found", status.HTTP_404_NOT_FOUND)

    if role == "equipment_owner" and booking.get("owner_id") != current_user["sub"]:
        raise APIException("You can only complete bookings for your own equipment", status.HTTP_403_FORBIDDEN)

    if booking.get("booking_status") != "confirmed":
        raise APIException(
            f"Only confirmed bookings can be completed. Current status: '{booking.get('booking_status')}'",
            status.HTTP_400_BAD_REQUEST,
        )

    await repo.update(booking_id, {
        "booking_status": "completed",
        "completed_at": _now_iso(),
        "updated_at": _now_iso(),
    })
    updated_booking = await repo.get_by_id(booking_id)

    # Notify farmer
    notification_manager = request.app.state.notification_manager
    await notification_manager.broadcast({
        "type": "booking_completed",
        "booking_id": booking_id,
        "farmer_id": booking.get("renter_id"),
        "equipment_name": booking.get("equipment_name"),
        "message": f"Your booking for {booking.get('equipment_name')} has been marked as completed. Please leave a review!",
    })

    # Invalidate caches
    await cache_service.delete_pattern(f"bookings:*:{booking.get('renter_id')}")
    await cache_service.delete_pattern(f"bookings:*:{booking.get('owner_id')}")

    return {"ok": True, "booking": updated_booking}


@router.get("/{booking_id}")
async def get_booking(booking_id: str, current_user: dict = Depends(get_current_user), db=Depends(get_required_db)):
    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise APIException("Booking not found", status.HTTP_404_NOT_FOUND)

    role = current_user.get("role", "farmer")
    if role == "admin":
        return booking
    if role == "farmer" and booking.get("renter_id") != current_user["sub"]:
        raise APIException("Booking not found", status.HTTP_404_NOT_FOUND)
    if role == "equipment_owner" and booking.get("owner_id") != current_user["sub"]:
        raise APIException("Booking not found", status.HTTP_404_NOT_FOUND)
    return booking
