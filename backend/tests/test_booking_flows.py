from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from app.api.v1.endpoints.bookings import (
    TrackingUpdateRequest,
    ServiceTicketCreateRequest,
    ServiceTicketStatusRequest,
    add_booking_tracking_update,
    approve_booking,
    booking_requests,
    cancel_booking,
    complete_booking,
    create_booking_service_ticket,
    get_booking_service_tickets,
    get_booking_tracking,
    start_booking,
    update_booking_service_ticket_status,
)
from app.core.exceptions import APIException


class DummyNotificationManager:
    def __init__(self) -> None:
        self.events = []

    async def broadcast(self, payload):
        self.events.append(payload)


def _request_with_notifications():
    return SimpleNamespace(
        app=SimpleNamespace(state=SimpleNamespace(notification_manager=DummyNotificationManager()))
    )


async def _insert_booking(
    db,
    *,
    booking_id: str,
    status: str = "pending",
    payment_status: str = "pending",
):
    await db.bookings.insert_one(
        {
            "_id": booking_id,
            "equipment_id": "eq-1",
            "equipment_name": "Harvester Prime",
            "owner_id": "owner-1",
            "owner_name": "Owner One",
            "renter_id": "farmer-1",
            "farmer_name": "Farmer One",
            "booking_status": status,
            "payment_status": payment_status,
            "start_date": "2026-03-26",
            "end_date": "2026-03-27",
            "total_amount": 250.0,
            "admin_cut": 25.0,
            "owner_payout": 225.0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
    )


@pytest.mark.asyncio
async def test_owner_can_progress_booking_from_approve_to_complete(db):
    await _insert_booking(db, booking_id="booking-1", status="pending")
    request = _request_with_notifications()
    owner = {"sub": "owner-1", "role": "equipment_owner"}

    approved = await approve_booking("booking-1", request=request, current_user=owner, db=db)
    started = await start_booking("booking-1", request=request, current_user=owner, db=db)
    completed = await complete_booking("booking-1", request=request, current_user=owner, db=db)
    stored = await db.bookings.find_one({"_id": "booking-1"})

    assert approved["booking"]["booking_status"] == "confirmed"
    assert started["booking"]["booking_status"] == "in_progress"
    assert completed["booking"]["booking_status"] == "completed"
    assert stored["booking_status"] == "completed"
    assert stored.get("started_at") is not None
    assert stored.get("completed_at") is not None
    assert [event["type"] for event in request.app.state.notification_manager.events] == [
        "booking_approved",
        "booking_in_progress",
        "booking_completed",
    ]


@pytest.mark.asyncio
async def test_farmer_can_cancel_confirmed_unpaid_booking(db):
    await _insert_booking(db, booking_id="booking-2", status="confirmed", payment_status="pending")
    request = _request_with_notifications()
    farmer = {"sub": "farmer-1", "role": "farmer"}

    result = await cancel_booking("booking-2", request=request, current_user=farmer, db=db)
    stored = await db.bookings.find_one({"_id": "booking-2"})

    assert result["booking"]["booking_status"] == "cancelled"
    assert stored["booking_status"] == "cancelled"
    assert stored["cancelled_by"] == "farmer-1"
    assert request.app.state.notification_manager.events[-1]["type"] == "booking_cancelled"


@pytest.mark.asyncio
async def test_paid_booking_cannot_be_cancelled_automatically(db):
    await _insert_booking(
        db, booking_id="booking-3", status="confirmed", payment_status="completed"
    )
    request = _request_with_notifications()
    farmer = {"sub": "farmer-1", "role": "farmer"}

    with pytest.raises(APIException) as exc_info:
        await cancel_booking("booking-3", request=request, current_user=farmer, db=db)

    assert exc_info.value.status_code == 400
    assert "Paid bookings cannot be cancelled automatically yet" in exc_info.value.detail


@pytest.mark.asyncio
async def test_booking_requests_returns_owner_history_and_filters(db):
    await _insert_booking(db, booking_id="booking-4", status="pending")
    await _insert_booking(db, booking_id="booking-5", status="confirmed")
    await _insert_booking(db, booking_id="booking-6", status="completed")
    owner = {"sub": "owner-1", "role": "equipment_owner"}

    all_requests = await booking_requests(status_filter="all", current_user=owner, db=db)
    confirmed_requests = await booking_requests(
        status_filter="confirmed", current_user=owner, db=db
    )

    assert {item["id"] for item in all_requests} == {"booking-4", "booking-5", "booking-6"}
    assert [item["id"] for item in confirmed_requests] == ["booking-5"]


@pytest.mark.asyncio
async def test_owner_can_publish_tracking_updates_and_farmer_can_view_them(db):
    await _insert_booking(db, booking_id="booking-7", status="confirmed")
    request = _request_with_notifications()
    owner = {"sub": "owner-1", "role": "equipment_owner", "full_name": "Owner One"}
    farmer = {"sub": "farmer-1", "role": "farmer", "full_name": "Farmer One"}

    updated = await add_booking_tracking_update(
        "booking-7",
        payload=TrackingUpdateRequest(
            label="Driver left the yard",
            status="en_route",
            latitude=41.5908,
            longitude=-93.6208,
            note="ETA 30 minutes",
            eta_label="30 min",
        ),
        request=request,
        current_user=owner,
        db=db,
    )
    visible = await get_booking_tracking("booking-7", current_user=farmer, db=db)

    assert updated["tracking"]["current_update"]["status"] == "en_route"
    assert visible["current_update"]["label"] == "Driver left the yard"
    assert visible["updates"][0]["eta_label"] == "30 min"
    assert request.app.state.notification_manager.events[-1]["type"] == "booking_tracking_updated"


@pytest.mark.asyncio
async def test_farmer_can_create_service_ticket_and_owner_can_resolve_it(db):
    await _insert_booking(db, booking_id="booking-8", status="confirmed")
    request = _request_with_notifications()
    farmer = {"sub": "farmer-1", "role": "farmer", "full_name": "Farmer One"}
    owner = {"sub": "owner-1", "role": "equipment_owner", "full_name": "Owner One"}

    created = await create_booking_service_ticket(
        "booking-8",
        payload=ServiceTicketCreateRequest(
            title="Hydraulic warning light",
            issue_type="mechanical",
            priority="high",
            description="The dashboard warning light turned on after the first hour of use.",
        ),
        request=request,
        current_user=farmer,
        db=db,
    )
    ticket_id = created["ticket"]["id"]

    updated = await update_booking_service_ticket_status(
        "booking-8",
        ticket_id=ticket_id,
        payload=ServiceTicketStatusRequest(
            status="resolved",
            note="Owner dispatched a technician and cleared the issue on-site.",
        ),
        request=request,
        current_user=owner,
        db=db,
    )
    visible = await get_booking_service_tickets("booking-8", current_user=farmer, db=db)

    assert created["ticket"]["status"] == "open"
    assert updated["ticket"]["status"] == "resolved"
    assert updated["ticket"]["resolution_note"] == "Owner dispatched a technician and cleared the issue on-site."
    assert visible["tickets"][0]["activity"][-1]["action"] == "resolved"
    assert request.app.state.notification_manager.events[-1]["type"] == "booking_service_ticket_updated"
