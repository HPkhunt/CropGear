from datetime import date, datetime, timedelta
import logging

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from app.core.exceptions import APIException
from app.db.client import get_required_db
from app.db.repositories.equipment_repo import EquipmentRepository
from app.db.repositories.user_repo import UserRepository
from app.dependencies import get_current_user
from app.config import settings
from app.utils.email import EmailService

router = APIRouter()
logger = logging.getLogger(__name__)
email_service = EmailService()


def _parse_booking_date(value):
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value[:10])
        except ValueError:
            return None
    return None


@router.get("/dashboard")
async def admin_dashboard(current_user: dict = Depends(get_current_user), db=Depends(get_required_db)):
    if current_user.get("role") != "admin":
        raise APIException("Admin access required", status.HTTP_403_FORBIDDEN)

    users_count = await db.users.count_documents({})
    equipment_count = await db.equipment.count_documents({})
    bookings_count = await db.bookings.count_documents({})
    pending_owners = await db.users.count_documents({"role": "equipment_owner", "is_verified": False})
    pending_users = await db.users.count_documents({"approval_status": "pending"})

    revenue_pipeline = [
        {"$match": {"booking_status": {"$in": ["confirmed", "completed"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$admin_cut"}}},
    ]
    revenue_result = await db.bookings.aggregate(revenue_pipeline).to_list(length=1)
    total_admin_revenue = float(revenue_result[0]["total"]) if revenue_result else 0.0

    return {
        "users": users_count,
        "equipment": equipment_count,
        "bookings": bookings_count,
        "pending_owner_verifications": pending_owners,
        "pending_user_approvals": pending_users,
        "total_admin_revenue": total_admin_revenue,
    }


@router.get("/reports")
async def admin_reports(
    period: str = "30d",
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    if current_user.get("role") != "admin":
        raise APIException("Admin access required", status.HTTP_403_FORBIDDEN)
    if period not in {"7d", "30d", "90d"}:
        raise APIException("Invalid period. Use one of: 7d, 30d, 90d.", status.HTTP_400_BAD_REQUEST)

    period_days_map = {"7d": 7, "30d": 30, "90d": 90}
    days = period_days_map.get(period, 30)
    today = date.today()
    start = today - timedelta(days=days - 1)

    # ISO strings for $gte / $lte comparison (start_date stored as "YYYY-MM-DD")
    start_str = start.isoformat()
    today_str = today.isoformat()
    window_filter = {"start_date": {"$gte": start_str, "$lte": today_str}}

    # --- Totals in window (single query) ---
    total_in_window = await db.bookings.count_documents(window_filter)

    # --- Revenue aggregation (push to MongoDB) ---
    revenue_pipeline = [
        {"$match": {**window_filter, "booking_status": {"$in": ["confirmed", "completed"]}}},
        {"$group": {
            "_id": None,
            "count": {"$sum": 1},
            "revenue": {"$sum": {"$ifNull": ["$total_amount", 0]}},
            "admin_revenue": {"$sum": {"$ifNull": ["$admin_cut", 0]}},
        }},
    ]
    rev_result = await db.bookings.aggregate(revenue_pipeline).to_list(length=1)
    confirmed_count = rev_result[0]["count"] if rev_result else 0
    revenue = float(rev_result[0]["revenue"]) if rev_result else 0.0
    admin_revenue = float(rev_result[0]["admin_revenue"]) if rev_result else 0.0
    utilization = round((confirmed_count / max(total_in_window, 1)) * 100, 1) if total_in_window else 0.0

    # --- Daily booking counts (group by start_date, O(D) fill) ---
    daily_pipeline = [
        {"$match": window_filter},
        {"$group": {"_id": "$start_date", "count": {"$sum": 1}}},
    ]
    daily_result = await db.bookings.aggregate(daily_pipeline).to_list(length=days + 1)
    daily_map = {doc["_id"]: doc["count"] for doc in daily_result if doc.get("_id")}
    daily_counts = [
        daily_map.get((start + timedelta(days=offset)).isoformat(), 0)
        for offset in range(days)
    ]

    # --- Average equipment rating ---
    avg_result = await db.equipment.aggregate([{"$group": {"_id": None, "avg": {"$avg": "$rating"}}}]).to_list(length=1)
    average_rating = round(float(avg_result[0]["avg"]) if avg_result else 0.0, 2)

    return {
        "period": period if period in period_days_map else "30d",
        "period_days": days,
        "revenue": revenue,
        "admin_revenue": admin_revenue,
        "utilization": utilization,
        "average_rating": average_rating,
        "daily_bookings": daily_counts,
    }


class OwnerStatusUpdateRequest(BaseModel):
    status: str = Field(pattern=r"^(pending|verified|rejected)$")


class UserApprovalDecisionRequest(BaseModel):
    decision: str = Field(pattern=r"^(pending|approved|rejected)$")

class EquipmentVisibilityRequest(BaseModel):
    visible: bool


@router.get("/owners")
async def owner_verification_list(
    status_filter: str = "all",
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    if current_user.get("role") != "admin":
        raise APIException("Admin access required", status.HTTP_403_FORBIDDEN)
    repo = UserRepository(db)
    return await repo.list_owner_verifications(status_filter=status_filter)


@router.post("/owners/{owner_id}/status")
async def set_owner_status(
    owner_id: str,
    payload: OwnerStatusUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    if current_user.get("role") != "admin":
        raise APIException("Admin access required", status.HTTP_403_FORBIDDEN)

    repo = UserRepository(db)
    result = await repo.set_owner_verification_status(owner_id=owner_id, status=payload.status)
    if not result:
        raise APIException("Owner not found", status.HTTP_404_NOT_FOUND)
    if settings.ENABLE_OWNER_VERIFICATION_EMAIL and result.get("email"):
        try:
            await email_service.send_owner_verification_status(
                result,
                result["email"],
                result.get("status", payload.status),
            )
        except Exception as exc:
            logger.warning("Owner verification email failed: %s", exc)
    return {"ok": True, "owner": result}


@router.get("/users")
async def approval_queue(
    status_filter: str = "pending",
    role_filter: str = "all",
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    if current_user.get("role") != "admin":
        raise APIException("Admin access required", status.HTTP_403_FORBIDDEN)
    repo = UserRepository(db)
    return await repo.list_users_for_approval(status_filter=status_filter, role_filter=role_filter)


@router.post("/users/{user_id}/decision")
async def decide_user_approval(
    user_id: str,
    payload: UserApprovalDecisionRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    if current_user.get("role") != "admin":
        raise APIException("Admin access required", status.HTTP_403_FORBIDDEN)
    repo = UserRepository(db)
    user = await repo.set_user_approval_status(user_id=user_id, decision=payload.decision)
    if not user:
        raise APIException("User not found", status.HTTP_404_NOT_FOUND)
    if settings.ENABLE_ADMIN_APPROVAL_EMAIL and user.get("email"):
        try:
            if user.get("approval_status") == "approved":
                await email_service.send_account_approval(user, user["email"])
            elif user.get("approval_status") == "rejected":
                await email_service.send_account_rejection(user, user["email"])
        except Exception as exc:
            logger.warning("User approval email failed: %s", exc)
    return {"ok": True, "user": user}


@router.get("/equipment")
async def admin_equipment_list(current_user: dict = Depends(get_current_user), db=Depends(get_required_db)):
    if current_user.get("role") != "admin":
        raise APIException("Admin access required", status.HTTP_403_FORBIDDEN)
    repo = EquipmentRepository(db)
    return await repo.list_all_equipment()


@router.post("/equipment/{equipment_id}/visibility")
async def admin_set_equipment_visibility(
    equipment_id: str,
    payload: EquipmentVisibilityRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    if current_user.get("role") != "admin":
        raise APIException("Admin access required", status.HTTP_403_FORBIDDEN)
    repo = EquipmentRepository(db)
    item = await repo.set_visibility(equipment_id, payload.visible)
    if not item:
        raise APIException("Equipment not found", status.HTTP_404_NOT_FOUND)
    return {"ok": True, "equipment": item}
