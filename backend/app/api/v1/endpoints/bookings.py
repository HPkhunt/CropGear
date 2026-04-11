import logging
from datetime import date, datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel, Field

from app.config import settings
from app.core.exceptions import APIException
from app.db.client import get_required_db
from app.db.repositories.booking_repo import BookingRepository
from app.db.repositories.equipment_repo import EquipmentRepository
from app.db.repositories.user_repo import UserRepository
from app.dependencies import get_current_user

# from app.services.notification_service import notification_manager
from app.services.cache_service import cache_service
from app.utils.email import EmailService

router = APIRouter()
logger = logging.getLogger(__name__)
email_service = EmailService()
BOOKING_REQUEST_STATUSES = {
    "pending",
    "confirmed",
    "in_progress",
    "completed",
    "cancelled",
    "rejected",
}
BOOKING_ACTIVE_STATUSES = {"confirmed", "in_progress"}
TRACKING_STATUSES = {"scheduled", "en_route", "arrived", "active", "completed"}
SERVICE_TICKET_STATUSES = {"open", "in_progress", "resolved"}
SERVICE_TICKET_TYPES = {"delivery", "mechanical", "operator", "payment", "safety", "other"}
SERVICE_TICKET_PRIORITIES = {"low", "medium", "high", "critical"}


def _now_iso() -> datetime:
    return datetime.now(timezone.utc)


def _parse_booking_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _ensure_booking_access(booking: dict, current_user: dict) -> None:
    role = current_user.get("role", "farmer")
    user_id = current_user.get("sub")

    if role == "admin":
        return
    if role == "farmer" and booking.get("renter_id") == user_id:
        return
    if role == "equipment_owner" and booking.get("owner_id") == user_id:
        return

    raise APIException("Booking not found", status.HTTP_404_NOT_FOUND)


def _ensure_owner_booking_access(booking: dict, current_user: dict) -> None:
    role = current_user.get("role")
    if role == "admin":
        return
    if role == "equipment_owner" and booking.get("owner_id") == current_user.get("sub"):
        return
    raise APIException("Owner access required", status.HTTP_403_FORBIDDEN)


def _tracking_updates_for_booking(booking: dict) -> list[dict]:
    raw_updates = booking.get("tracking_updates")
    if not isinstance(raw_updates, list):
        return []
    return [dict(item) for item in raw_updates if isinstance(item, dict)]


def _service_tickets_for_booking(booking: dict) -> list[dict]:
    raw_tickets = booking.get("service_tickets")
    if not isinstance(raw_tickets, list):
        return []
    return [dict(item) for item in raw_tickets if isinstance(item, dict)]


async def _invalidate_booking_caches(
    *, farmer_id: str | None = None, owner_id: str | None = None
) -> None:
    cache_keys = []
    if farmer_id:
        cache_keys.append(f"bookings:farmer:{farmer_id}")
    if owner_id:
        cache_keys.append(f"bookings:equipment_owner:{owner_id}")

    for cache_key in dict.fromkeys(cache_keys):
        await cache_service.delete(cache_key)

    # Admin booking lists aggregate all bookings, so any mutation should
    # invalidate every cached admin view.
    await cache_service.delete_pattern("bookings:admin:*")


async def _broadcast_booking_event(
    request: Request,
    *,
    booking_id: str,
    booking: dict,
    event_type: str,
    message: str,
    recipient_user_id: str | None = None,
) -> None:
    notification_manager = getattr(request.app.state, "notification_manager", None)
    if not notification_manager:
        return

    payload = {
        "type": event_type,
        "booking_id": booking_id,
        "equipment_name": booking.get("equipment_name"),
        "message": message,
    }
    if recipient_user_id:
        payload["user_id"] = recipient_user_id
    await notification_manager.broadcast(payload)


async def _send_status_email(
    *,
    db,
    booking: dict,
    recipient_id: str | None,
    status_value: str,
    intro: str,
) -> None:
    if not settings.ENABLE_BOOKING_STATUS_EMAIL or not recipient_id:
        return

    try:
        user_repo = UserRepository(db)
        recipient = await user_repo.get_by_id(recipient_id, public=True)
        if recipient and recipient.get("email"):
            await email_service.send_booking_status_update(
                booking,
                recipient["email"],
                status_value,
                intro=intro,
            )
    except Exception as exc:
        logger.warning("Booking status email failed: %s", exc)


async def _ensure_dates_available(
    repo: BookingRepository,
    equipment_id: str,
    start_date: str,
    end_date: str,
    *,
    exclude_booking_id: str | None = None,
) -> None:
    conflict = await repo.find_conflicting_booking(
        equipment_id,
        start_date,
        end_date,
        exclude_booking_id=exclude_booking_id,
    )
    if conflict:
        raise APIException(
            "Equipment is already booked for the selected dates", status.HTTP_409_CONFLICT
        )


class CreateBookingRequest(BaseModel):
    equipment_id: str = Field(min_length=1)
    start_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    end_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")


class TrackingUpdateRequest(BaseModel):
    label: str = Field(min_length=2, max_length=80)
    status: str = Field(pattern=r"^(scheduled|en_route|arrived|active|completed)$")
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    note: str = Field(default="", max_length=280)
    eta_label: str = Field(default="", max_length=80)


class ServiceTicketCreateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    issue_type: str = Field(pattern=r"^(delivery|mechanical|operator|payment|safety|other)$")
    priority: str = Field(pattern=r"^(low|medium|high|critical)$")
    description: str = Field(min_length=6, max_length=1000)


class ServiceTicketStatusRequest(BaseModel):
    status: str = Field(pattern=r"^(open|in_progress|resolved)$")
    note: str = Field(default="", max_length=280)


@router.get("/")
async def list_bookings(
    current_user: dict = Depends(get_current_user), db=Depends(get_required_db)
):
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
async def create_booking(
    payload: CreateBookingRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
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

    repo = BookingRepository(db)
    await _ensure_dates_available(repo, equipment["id"], payload.start_date, payload.end_date)

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
        "tracking_updates": [],
        "service_tickets": [],
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    new_id = await repo.create(booking_data)
    result = await repo.get_by_id(new_id)

    # Invalidate booking list caches
    await _invalidate_booking_caches(
        farmer_id=current_user["sub"],
        owner_id=equipment.get("owner_id"),
    )

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
async def booking_requests(
    status_filter: str = "all",
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    if current_user.get("role") not in {"equipment_owner", "admin"}:
        raise APIException("Owner access required", status.HTTP_403_FORBIDDEN)

    if status_filter != "all" and status_filter not in BOOKING_REQUEST_STATUSES:
        raise APIException("Invalid booking status filter", status.HTTP_400_BAD_REQUEST)

    repo = BookingRepository(db)
    query = {} if current_user.get("role") == "admin" else {"owner_id": current_user["sub"]}
    if status_filter != "all":
        query["booking_status"] = status_filter
    return await repo.find(query)


@router.get("/{booking_id}/tracking")
async def get_booking_tracking(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise APIException("Booking not found", status.HTTP_404_NOT_FOUND)

    _ensure_booking_access(booking, current_user)
    updates = _tracking_updates_for_booking(booking)
    current_update = updates[-1] if updates else None

    return {
        "booking_id": booking.get("id"),
        "booking_status": booking.get("booking_status", "pending"),
        "equipment_name": booking.get("equipment_name"),
        "owner_name": booking.get("owner_name"),
        "farmer_name": booking.get("farmer_name"),
        "current_update": current_update,
        "updates": updates,
    }


@router.post("/{booking_id}/tracking")
async def add_booking_tracking_update(
    booking_id: str,
    payload: TrackingUpdateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise APIException("Booking not found", status.HTTP_404_NOT_FOUND)

    _ensure_owner_booking_access(booking, current_user)
    booking_status = str(booking.get("booking_status", "pending")).lower()
    if booking_status in {"cancelled", "rejected"}:
        raise APIException(
            "Tracking is unavailable for cancelled or rejected bookings.",
            status.HTTP_400_BAD_REQUEST,
        )

    now = _now_iso()
    updates = _tracking_updates_for_booking(booking)
    update = {
        "id": f"trk-{uuid4().hex[:12]}",
        "label": payload.label.strip(),
        "status": payload.status,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "note": payload.note.strip(),
        "eta_label": payload.eta_label.strip(),
        "recorded_at": now,
        "recorded_by": current_user.get("sub"),
        "recorded_by_role": current_user.get("role"),
    }
    updates.append(update)

    await repo.update(
        booking_id,
        {
            "tracking_updates": updates,
            "updated_at": now,
        },
    )
    updated_booking = await repo.get_by_id(booking_id)

    await _broadcast_booking_event(
        request,
        booking_id=booking_id,
        booking=updated_booking or booking,
        event_type="booking_tracking_updated",
        message=f"Tracking updated for {booking.get('equipment_name')}",
        recipient_user_id=booking.get("renter_id"),
    )
    await _invalidate_booking_caches(
        farmer_id=booking.get("renter_id"),
        owner_id=booking.get("owner_id"),
    )

    return {
        "ok": True,
        "tracking": {
            "current_update": update,
            "updates": updates,
        },
    }


@router.get("/{booking_id}/service-tickets")
async def get_booking_service_tickets(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise APIException("Booking not found", status.HTTP_404_NOT_FOUND)

    _ensure_booking_access(booking, current_user)
    tickets = _service_tickets_for_booking(booking)

    return {
        "booking_id": booking.get("id"),
        "booking_status": booking.get("booking_status", "pending"),
        "tickets": tickets,
    }


@router.post("/{booking_id}/service-tickets")
async def create_booking_service_ticket(
    booking_id: str,
    payload: ServiceTicketCreateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise APIException("Booking not found", status.HTTP_404_NOT_FOUND)

    _ensure_booking_access(booking, current_user)
    booking_status = str(booking.get("booking_status", "pending")).lower()
    if booking_status in {"pending", "rejected"}:
        raise APIException(
            "Service tickets open after a booking is confirmed.",
            status.HTTP_400_BAD_REQUEST,
        )

    now = _now_iso()
    tickets = _service_tickets_for_booking(booking)
    creator_name = current_user.get("full_name") or current_user.get("name") or "User"
    ticket = {
        "id": f"svc-{uuid4().hex[:12]}",
        "title": payload.title.strip(),
        "issue_type": payload.issue_type,
        "priority": payload.priority,
        "description": payload.description.strip(),
        "status": "open",
        "created_at": now,
        "created_by": current_user.get("sub"),
        "created_by_name": creator_name,
        "created_by_role": current_user.get("role"),
        "resolution_note": "",
        "activity": [
            {
                "id": f"act-{uuid4().hex[:10]}",
                "action": "created",
                "note": payload.description.strip(),
                "created_at": now,
                "created_by": current_user.get("sub"),
                "created_by_name": creator_name,
                "created_by_role": current_user.get("role"),
            }
        ],
    }
    tickets.append(ticket)

    await repo.update(
        booking_id,
        {
            "service_tickets": tickets,
            "updated_at": now,
        },
    )

    await _broadcast_booking_event(
        request,
        booking_id=booking_id,
        booking=booking,
        event_type="booking_service_ticket_created",
        message=f"New service ticket opened for {booking.get('equipment_name')}",
        recipient_user_id=booking.get("owner_id"),
    )
    await _invalidate_booking_caches(
        farmer_id=booking.get("renter_id"),
        owner_id=booking.get("owner_id"),
    )

    return {
        "ok": True,
        "ticket": ticket,
        "tickets": tickets,
    }


@router.post("/{booking_id}/service-tickets/{ticket_id}/status")
async def update_booking_service_ticket_status(
    booking_id: str,
    ticket_id: str,
    payload: ServiceTicketStatusRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise APIException("Booking not found", status.HTTP_404_NOT_FOUND)

    _ensure_owner_booking_access(booking, current_user)
    tickets = _service_tickets_for_booking(booking)

    matching_ticket = None
    for ticket in tickets:
        if ticket.get("id") == ticket_id:
            matching_ticket = ticket
            break

    if not matching_ticket:
        raise APIException("Service ticket not found", status.HTTP_404_NOT_FOUND)

    now = _now_iso()
    actor_name = current_user.get("full_name") or current_user.get("name") or "User"
    note = payload.note.strip()
    activity = matching_ticket.get("activity")
    if not isinstance(activity, list):
        activity = []
        matching_ticket["activity"] = activity
    activity.append(
        {
            "id": f"act-{uuid4().hex[:10]}",
            "action": payload.status,
            "note": note,
            "created_at": now,
            "created_by": current_user.get("sub"),
            "created_by_name": actor_name,
            "created_by_role": current_user.get("role"),
        }
    )
    matching_ticket["status"] = payload.status
    matching_ticket["updated_at"] = now
    matching_ticket["updated_by"] = current_user.get("sub")
    matching_ticket["updated_by_name"] = actor_name
    matching_ticket["updated_by_role"] = current_user.get("role")
    matching_ticket["resolution_note"] = note if payload.status == "resolved" else matching_ticket.get(
        "resolution_note", ""
    )

    await repo.update(
        booking_id,
        {
            "service_tickets": tickets,
            "updated_at": now,
        },
    )

    await _broadcast_booking_event(
        request,
        booking_id=booking_id,
        booking=booking,
        event_type="booking_service_ticket_updated",
        message=f"Service ticket {matching_ticket.get('title')} is now {payload.status.replace('_', ' ')}.",
        recipient_user_id=booking.get("renter_id"),
    )
    await _invalidate_booking_caches(
        farmer_id=booking.get("renter_id"),
        owner_id=booking.get("owner_id"),
    )

    return {
        "ok": True,
        "ticket": matching_ticket,
        "tickets": tickets,
    }


@router.post("/{booking_id}/approve")
async def approve_booking(
    booking_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    if current_user.get("role") not in {"equipment_owner", "admin"}:
        raise APIException("Owner access required", status.HTTP_403_FORBIDDEN)

    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise APIException("Booking not found", status.HTTP_404_NOT_FOUND)
    _ensure_owner_booking_access(booking, current_user)
    if booking.get("booking_status", "pending") != "pending":
        raise APIException(
            f"Cannot update booking in '{booking.get('booking_status')}' state",
            status.HTTP_400_BAD_REQUEST,
        )

    await _ensure_dates_available(
        repo,
        booking.get("equipment_id", ""),
        booking.get("start_date", ""),
        booking.get("end_date", ""),
        exclude_booking_id=booking_id,
    )

    await repo.update(booking_id, {"booking_status": "confirmed", "updated_at": _now_iso()})
    updated_booking = await repo.get_by_id(booking_id)

    # Send notification
    notification_manager = request.app.state.notification_manager
    await notification_manager.broadcast(
        {
            "type": "booking_approved",
            "booking_id": booking_id,
            "farmer_id": booking.get("renter_id"),
            "equipment_name": booking.get("equipment_name"),
            "message": f"Your booking for {booking.get('equipment_name')} has been approved!",
        }
    )

    # Invalidate booking caches
    await _invalidate_booking_caches(
        farmer_id=booking.get("renter_id"),
        owner_id=booking.get("owner_id"),
    )

    if settings.ENABLE_BOOKING_CONFIRMATION_EMAIL:
        try:
            user_repo = UserRepository(db)
            farmer = await user_repo.get_by_id(booking.get("renter_id"), public=True)
            if farmer and farmer.get("email"):
                await email_service.send_booking_confirmation(
                    updated_booking or booking, farmer["email"]
                )
        except Exception as exc:
            logger.warning("Booking confirmation email failed: %s", exc)

    return {"ok": True, "booking": updated_booking}


@router.post("/{booking_id}/reject")
async def reject_booking(
    booking_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    if current_user.get("role") not in {"equipment_owner", "admin"}:
        raise APIException("Owner access required", status.HTTP_403_FORBIDDEN)

    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise APIException("Booking not found", status.HTTP_404_NOT_FOUND)
    _ensure_owner_booking_access(booking, current_user)
    if booking.get("booking_status", "pending") != "pending":
        raise APIException(
            f"Cannot update booking in '{booking.get('booking_status')}' state",
            status.HTTP_400_BAD_REQUEST,
        )

    await repo.update(booking_id, {"booking_status": "rejected", "updated_at": _now_iso()})
    updated_booking = await repo.get_by_id(booking_id)

    # Send notification
    notification_manager = request.app.state.notification_manager
    await notification_manager.broadcast(
        {
            "type": "booking_rejected",
            "booking_id": booking_id,
            "farmer_id": booking.get("renter_id"),
            "equipment_name": booking.get("equipment_name"),
            "message": f"Your booking for {booking.get('equipment_name')} has been rejected.",
        }
    )

    # Invalidate booking caches
    await _invalidate_booking_caches(
        farmer_id=booking.get("renter_id"),
        owner_id=booking.get("owner_id"),
    )

    if settings.ENABLE_BOOKING_STATUS_EMAIL:
        try:
            user_repo = UserRepository(db)
            farmer = await user_repo.get_by_id(booking.get("renter_id"), public=True)
            if farmer and farmer.get("email"):
                await email_service.send_booking_rejected(
                    updated_booking or booking, farmer["email"]
                )
        except Exception as exc:
            logger.warning("Booking rejection email failed: %s", exc)

    return {"ok": True, "booking": updated_booking}


@router.post("/{booking_id}/cancel")
async def cancel_booking(
    booking_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    role = current_user.get("role")
    if role not in {"farmer", "equipment_owner", "admin"}:
        raise APIException("Booking access required", status.HTTP_403_FORBIDDEN)

    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise APIException("Booking not found", status.HTTP_404_NOT_FOUND)

    if role == "farmer" and booking.get("renter_id") != current_user["sub"]:
        raise APIException("You can only cancel your own bookings", status.HTTP_403_FORBIDDEN)
    if role in {"equipment_owner", "admin"}:
        _ensure_owner_booking_access(booking, current_user)

    status_value = str(booking.get("booking_status", "pending")).lower()
    if status_value not in {"pending", "confirmed"}:
        raise APIException(
            f"Cannot cancel booking in '{status_value}' state", status.HTTP_400_BAD_REQUEST
        )
    if str(booking.get("payment_status", "pending")).lower() == "completed":
        raise APIException(
            "Paid bookings cannot be cancelled automatically yet. Please contact support for help.",
            status.HTTP_400_BAD_REQUEST,
        )

    now = _now_iso()
    await repo.update(
        booking_id,
        {
            "booking_status": "cancelled",
            "cancelled_at": now,
            "cancelled_by": current_user["sub"],
            "cancelled_by_role": role,
            "updated_at": now,
        },
    )
    updated_booking = await repo.get_by_id(booking_id)

    actor_label = (
        "the farmer"
        if role == "farmer"
        else "the owner" if role == "equipment_owner" else "an administrator"
    )
    message = f"Booking for {booking.get('equipment_name')} was cancelled by {actor_label}."
    await _broadcast_booking_event(
        request,
        booking_id=booking_id,
        booking=booking,
        event_type="booking_cancelled",
        message=message,
        recipient_user_id=booking.get("renter_id"),
    )
    await _invalidate_booking_caches(
        farmer_id=booking.get("renter_id"),
        owner_id=booking.get("owner_id"),
    )

    if role == "admin":
        await _send_status_email(
            db=db,
            booking=updated_booking or booking,
            recipient_id=booking.get("renter_id"),
            status_value="cancelled",
            intro=message,
        )
        await _send_status_email(
            db=db,
            booking=updated_booking or booking,
            recipient_id=booking.get("owner_id"),
            status_value="cancelled",
            intro=message,
        )
    else:
        recipient_id = booking.get("owner_id") if role == "farmer" else booking.get("renter_id")
        await _send_status_email(
            db=db,
            booking=updated_booking or booking,
            recipient_id=recipient_id,
            status_value="cancelled",
            intro=message,
        )

    return {"ok": True, "booking": updated_booking}


@router.post("/{booking_id}/start")
async def start_booking(
    booking_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    if current_user.get("role") not in {"equipment_owner", "admin"}:
        raise APIException("Owner access required", status.HTTP_403_FORBIDDEN)

    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise APIException("Booking not found", status.HTTP_404_NOT_FOUND)
    _ensure_owner_booking_access(booking, current_user)

    status_value = str(booking.get("booking_status", "pending")).lower()
    if status_value != "confirmed":
        raise APIException(
            f"Cannot start booking in '{status_value}' state", status.HTTP_400_BAD_REQUEST
        )

    scheduled_start = _parse_booking_date(booking.get("start_date"))
    today = datetime.now(timezone.utc).date()
    if scheduled_start and scheduled_start > today and current_user.get("role") != "admin":
        raise APIException(
            "Booking can be started on or after the scheduled start date",
            status.HTTP_400_BAD_REQUEST,
        )

    now = _now_iso()
    await repo.update(
        booking_id,
        {
            "booking_status": "in_progress",
            "started_at": booking.get("started_at") or now,
            "started_by": current_user["sub"],
            "updated_at": now,
        },
    )
    updated_booking = await repo.get_by_id(booking_id)

    message = f"Your booking for {booking.get('equipment_name')} is now in progress."
    await _broadcast_booking_event(
        request,
        booking_id=booking_id,
        booking=booking,
        event_type="booking_in_progress",
        message=message,
        recipient_user_id=booking.get("renter_id"),
    )
    await _invalidate_booking_caches(
        farmer_id=booking.get("renter_id"),
        owner_id=booking.get("owner_id"),
    )
    await _send_status_email(
        db=db,
        booking=updated_booking or booking,
        recipient_id=booking.get("renter_id"),
        status_value="in_progress",
        intro=message,
    )

    return {"ok": True, "booking": updated_booking}


@router.post("/{booking_id}/complete")
async def complete_booking(
    booking_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    if current_user.get("role") not in {"equipment_owner", "admin"}:
        raise APIException("Owner access required", status.HTTP_403_FORBIDDEN)

    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise APIException("Booking not found", status.HTTP_404_NOT_FOUND)
    _ensure_owner_booking_access(booking, current_user)

    status_value = str(booking.get("booking_status", "pending")).lower()
    if status_value not in BOOKING_ACTIVE_STATUSES:
        raise APIException(
            f"Cannot complete booking in '{status_value}' state", status.HTTP_400_BAD_REQUEST
        )

    now = _now_iso()
    update_data = {
        "booking_status": "completed",
        "completed_at": now,
        "completed_by": current_user["sub"],
        "updated_at": now,
    }
    if not booking.get("started_at"):
        update_data["started_at"] = now
        update_data["started_by"] = current_user["sub"]

    await repo.update(booking_id, update_data)
    updated_booking = await repo.get_by_id(booking_id)

    message = f"Your booking for {booking.get('equipment_name')} has been marked completed."
    await _broadcast_booking_event(
        request,
        booking_id=booking_id,
        booking=booking,
        event_type="booking_completed",
        message=message,
        recipient_user_id=booking.get("renter_id"),
    )
    await _invalidate_booking_caches(
        farmer_id=booking.get("renter_id"),
        owner_id=booking.get("owner_id"),
    )
    await _send_status_email(
        db=db,
        booking=updated_booking or booking,
        recipient_id=booking.get("renter_id"),
        status_value="completed",
        intro=message,
    )

    return {"ok": True, "booking": updated_booking}


@router.get("/{booking_id}")
async def get_booking(
    booking_id: str, current_user: dict = Depends(get_current_user), db=Depends(get_required_db)
):
    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise APIException("Booking not found", status.HTTP_404_NOT_FOUND)

    _ensure_booking_access(booking, current_user)
    return booking
