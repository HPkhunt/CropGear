from __future__ import annotations

from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import uuid

from fastapi import APIRouter, Depends, Query, status, UploadFile, File
from pydantic import BaseModel, Field

from app.core.exceptions import APIException
from app.dependencies import get_current_user
from app.db.client import get_required_db
from app.db.repositories.booking_repo import BookingRepository
from app.db.repositories.media_repo import MediaRepository
from app.db.repositories.review_repo import ReviewRepository
from app.db.utils import serialize_doc, serialize_docs, to_object_id
from app.services.cache_service import cache_service
from app.utils.media import extract_public_media_id, public_media_url

router = APIRouter()

UPLOAD_DIR = Path(__file__).resolve().parents[3] / "uploads"
MAX_REVIEW_UPLOAD_BYTES = 2 * 1024 * 1024
MAX_REVIEW_PHOTOS = 5
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
EXT_BY_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


def _now_iso() -> datetime:
    return datetime.now(timezone.utc)


def _parse_date(value: Any) -> Optional[date]:
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


def _clean_photo_urls(items: Optional[List[str]]) -> List[str]:
    urls: List[str] = []
    for item in items or []:
        cleaned = str(item or "").strip()
        if not cleaned:
            continue
        media_id = extract_public_media_id(cleaned)
        if media_id:
            urls.append(media_id)
            continue
        urls.append(cleaned)
    if len(urls) > MAX_REVIEW_PHOTOS:
        raise APIException(
            f"Maximum {MAX_REVIEW_PHOTOS} review photos allowed.",
            status.HTTP_400_BAD_REQUEST,
        )
    return urls


async def _validate_photo_assets(asset_ids: List[str], current_user: dict, db) -> List[str]:
    if not asset_ids:
        return []
    if len(asset_ids) > MAX_REVIEW_PHOTOS:
        raise APIException(
            f"Maximum {MAX_REVIEW_PHOTOS} review photos allowed.",
            status.HTTP_400_BAD_REQUEST,
        )
    repo = MediaRepository(db)
    validated: List[str] = []
    role = current_user.get("role")
    user_id = current_user.get("sub")
    for asset_id in asset_ids:
        asset = await repo.get_by_id(asset_id)
        if not asset:
            raise APIException("Review photo asset not found.", status.HTTP_404_NOT_FOUND)
        if asset.get("purpose") != "review_photo":
            raise APIException("Media asset is not a review photo.", status.HTTP_400_BAD_REQUEST)
        if asset.get("status") != "ready":
            raise APIException("Media asset is not ready yet.", status.HTTP_409_CONFLICT)
        if role != "admin" and asset.get("owner_id") != user_id:
            raise APIException("Not authorized to use this media asset.", status.HTTP_403_FORBIDDEN)
        validated.append(asset_id)
    return validated


def _apply_review_media(review: Dict[str, Any]) -> Dict[str, Any]:
    asset_ids = review.get("photo_asset_ids") or []
    if asset_ids:
        review["photos"] = [public_media_url(asset_id) for asset_id in asset_ids]
    return review


def _public_review(doc: Dict[str, Any]) -> Dict[str, Any]:
    data = serialize_doc(doc)
    data = _apply_review_media(data)
    for key in ("flags", "moderation", "dispute", "recipient_id", "reviewer_id", "reviewer_role"):
        data.pop(key, None)
    return data


async def _recalculate_equipment_rating(db, equipment_id: str) -> None:
    if not equipment_id:
        return
    match = {
        "equipment_id": equipment_id,
        "review_type": "equipment",
        "status": "approved",
    }
    pipeline = [
        {"$match": match},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]
    result = await db.reviews.aggregate(pipeline).to_list(length=1)
    avg_rating = round(float(result[0]["avg"]), 2) if result else 0.0
    count = int(result[0]["count"]) if result else 0
    update = {
        "rating": avg_rating,
        "average_rating": avg_rating,
        "total_reviews": count,
        "reviews_count": count,
        "updated_at": _now_iso(),
    }
    oid = to_object_id(equipment_id)
    query = {"_id": oid} if oid else {"_id": equipment_id}
    await db.equipment.update_one(query, {"$set": update})


async def _recalculate_user_rating(db, user_id: str) -> None:
    if not user_id:
        return
    match = {"recipient_id": user_id, "status": "approved"}
    pipeline = [
        {"$match": match},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]
    result = await db.reviews.aggregate(pipeline).to_list(length=1)
    avg_rating = round(float(result[0]["avg"]), 2) if result else 0.0
    count = int(result[0]["count"]) if result else 0
    update = {
        "average_rating": avg_rating,
        "total_reviews": count,
        "updated_at": _now_iso(),
    }
    oid = to_object_id(user_id)
    query = {"_id": oid} if oid else {"_id": user_id}
    await db.users.update_one(query, {"$set": update})


class ReviewCreateRequest(BaseModel):
    booking_id: str = Field(min_length=1)
    review_type: str = Field(pattern=r"^(equipment|user)$")
    rating: int = Field(ge=1, le=5)
    title: str = Field(default="", max_length=120)
    comment: str = Field(default="", max_length=2000)
    photo_urls: List[str] = Field(default_factory=list)
    photo_asset_ids: List[str] = Field(default_factory=list)


class ReviewResponseRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)


class ReviewDisputeRequest(BaseModel):
    reason: str = Field(min_length=5, max_length=1000)


class ReviewModerationRequest(BaseModel):
    action: str = Field(pattern=r"^(approve|reject|hide|restore)$")
    reason: str = Field(default="", max_length=500)


class ReviewFlagRequest(BaseModel):
    reason: str = Field(min_length=5, max_length=500)


@router.post("/upload")
async def upload_review_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in {"farmer", "equipment_owner", "admin"}:
        raise APIException("Authentication required", status.HTTP_403_FORBIDDEN)

    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise APIException("Unsupported image type. Use JPG, PNG, WEBP, or GIF.", status.HTTP_400_BAD_REQUEST)

    data = await file.read()
    if not data:
        raise APIException("Empty upload.", status.HTTP_400_BAD_REQUEST)
    if len(data) > MAX_REVIEW_UPLOAD_BYTES:
        raise APIException("Image must be smaller than 2MB.", status.HTTP_400_BAD_REQUEST)

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in EXT_BY_TYPE.values():
        suffix = EXT_BY_TYPE.get(content_type, ".jpg")
    filename = f"review_{uuid.uuid4().hex}{suffix}"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    (UPLOAD_DIR / filename).write_bytes(data)

    return {"url": f"/uploads/{filename}"}


@router.post("", status_code=status.HTTP_201_CREATED)
async def submit_review(
    payload: ReviewCreateRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    role = current_user.get("role")
    if role not in {"farmer", "equipment_owner", "admin"}:
        raise APIException("Authentication required", status.HTTP_403_FORBIDDEN)

    booking_repo = BookingRepository(db)
    booking = await booking_repo.get_by_id(payload.booking_id)
    if not booking:
        raise APIException("Booking not found", status.HTTP_404_NOT_FOUND)

    reviewer_id = current_user["sub"]
    if role != "admin" and reviewer_id not in {booking.get("renter_id"), booking.get("owner_id")}:
        raise APIException("You can only review your own bookings.", status.HTTP_403_FORBIDDEN)

    if role != "admin":
        status_value = booking.get("booking_status", "")
        if status_value in {"pending", "rejected", "cancelled"}:
            raise APIException("Booking is not eligible for review.", status.HTTP_400_BAD_REQUEST)
        end_date = _parse_date(booking.get("end_date"))
        if end_date and end_date > date.today():
            raise APIException("Review can be submitted after the booking end date.", status.HTTP_400_BAD_REQUEST)

    if payload.review_type == "equipment":
        if role != "admin" and reviewer_id != booking.get("renter_id"):
            raise APIException("Only the renter can review equipment.", status.HTTP_403_FORBIDDEN)
        recipient_id = booking.get("owner_id")
        recipient_name = booking.get("owner_name") or "Owner"
    else:
        if role != "admin" and reviewer_id != booking.get("owner_id"):
            raise APIException("Only the owner can review renters.", status.HTTP_403_FORBIDDEN)
        recipient_id = booking.get("renter_id")
        recipient_name = booking.get("farmer_name") or "Farmer"

    if not recipient_id:
        raise APIException("Review recipient not found.", status.HTTP_400_BAD_REQUEST)

    review_repo = ReviewRepository(db)
    existing = await review_repo.find_by_booking_reviewer(
        payload.booking_id, reviewer_id, payload.review_type
    )
    if existing:
        raise APIException("Review already submitted for this booking.", status.HTTP_409_CONFLICT)

    if not payload.title.strip() and not payload.comment.strip():
        raise APIException("Provide a title or comment for the review.", status.HTTP_400_BAD_REQUEST)

    raw_photo_assets = payload.photo_asset_ids or []
    if payload.photo_urls:
        extracted = _clean_photo_urls(payload.photo_urls)
        raw_photo_assets = raw_photo_assets + extracted
    if payload.photo_urls and any(url.startswith("/uploads/") for url in payload.photo_urls):
        raise APIException(
            "Review photos must be uploaded via /media/presign and referenced by asset id.",
            status.HTTP_400_BAD_REQUEST,
        )
    seen_assets = set()
    deduped_assets: List[str] = []
    for asset_id in raw_photo_assets:
        asset_id = str(asset_id).strip()
        if not asset_id or asset_id in seen_assets:
            continue
        seen_assets.add(asset_id)
        deduped_assets.append(asset_id)
    photo_asset_ids = await _validate_photo_assets(deduped_assets, current_user, db)
    photo_urls = [public_media_url(asset_id) for asset_id in photo_asset_ids]
    now = _now_iso()
    status_value = "approved" if role == "admin" else "pending"
    reviewer_name = (
        current_user.get("name")
        or current_user.get("full_name")
        or booking.get("farmer_name")
        or booking.get("owner_name")
        or "User"
    )

    review_doc: Dict[str, Any] = {
        "booking_id": payload.booking_id,
        "equipment_id": booking.get("equipment_id"),
        "equipment_name": booking.get("equipment_name"),
        "owner_id": booking.get("owner_id"),
        "reviewer_id": reviewer_id,
        "reviewer_name": reviewer_name,
        "reviewer_role": role,
        "recipient_id": recipient_id,
        "recipient_name": recipient_name,
        "review_type": payload.review_type,
        "rating": payload.rating,
        "title": payload.title.strip(),
        "comment": payload.comment.strip(),
        "photos": photo_urls,
        "photo_asset_ids": photo_asset_ids,
        "status": status_value,
        "created_at": now,
        "updated_at": now,
    }

    if role == "admin":
        review_doc["moderation"] = {
            "action": "approve",
            "moderated_by": reviewer_id,
            "moderated_at": now,
            "reason": "Admin submitted review.",
        }

    result = await db.reviews.insert_one(review_doc)
    review_doc["_id"] = result.inserted_id
    if photo_asset_ids:
        media_repo = MediaRepository(db)
        for asset_id in photo_asset_ids:
            asset = await media_repo.get_by_id(asset_id)
            if not asset:
                continue
            related = dict(asset.get("related") or {})
            related["review_id"] = str(result.inserted_id)
            await media_repo.update(asset_id, {"related": related})

    if status_value == "approved":
        if payload.review_type == "equipment":
            await _recalculate_equipment_rating(db, review_doc.get("equipment_id"))
            await cache_service.invalidate_equipment(review_doc.get("equipment_id"))
            await cache_service.invalidate_equipment_list()
        await _recalculate_user_rating(db, recipient_id)

    return _apply_review_media(serialize_doc(review_doc))


@router.get("/equipment/{equipment_id}")
async def list_equipment_reviews(
    equipment_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    db=Depends(get_required_db),
):
    match = {"equipment_id": equipment_id, "review_type": "equipment", "status": "approved"}
    total = await db.reviews.count_documents(match)
    skip = (page - 1) * page_size
    cursor = db.reviews.find(match).sort("created_at", -1).skip(skip).limit(page_size)
    docs = await cursor.to_list(length=page_size)
    reviews = [_public_review(doc) for doc in docs]

    avg_result = await db.reviews.aggregate(
        [
            {"$match": match},
            {"$group": {"_id": None, "avg": {"$avg": "$rating"}}},
        ]
    ).to_list(length=1)
    avg_rating = round(float(avg_result[0]["avg"]), 2) if avg_result else 0.0

    breakdown_docs = await db.reviews.aggregate(
        [
            {"$match": match},
            {"$group": {"_id": "$rating", "count": {"$sum": 1}}},
        ]
    ).to_list(length=10)
    breakdown = {str(item["_id"]): int(item["count"]) for item in breakdown_docs if item.get("_id")}
    for rating in range(1, 6):
        breakdown.setdefault(str(rating), 0)

    return {
        "equipment_id": equipment_id,
        "average_rating": avg_rating,
        "total_reviews": total,
        "rating_breakdown": breakdown,
        "reviews": reviews,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": max((total + page_size - 1) // page_size, 1),
        },
    }


@router.get("/user/{user_id}")
async def list_user_reviews(
    user_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    db=Depends(get_required_db),
):
    match = {"recipient_id": user_id, "review_type": "user", "status": "approved"}
    total = await db.reviews.count_documents(match)
    skip = (page - 1) * page_size
    cursor = db.reviews.find(match).sort("created_at", -1).skip(skip).limit(page_size)
    docs = await cursor.to_list(length=page_size)
    reviews = [_public_review(doc) for doc in docs]

    avg_result = await db.reviews.aggregate(
        [
            {"$match": match},
            {"$group": {"_id": None, "avg": {"$avg": "$rating"}}},
        ]
    ).to_list(length=1)
    avg_rating = round(float(avg_result[0]["avg"]), 2) if avg_result else 0.0

    return {
        "user_id": user_id,
        "average_rating": avg_rating,
        "total_reviews": total,
        "reviews": reviews,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": max((total + page_size - 1) // page_size, 1),
        },
    }


@router.get("/mine")
async def my_reviews(
    view: str = Query(default="all", pattern=r"^(all|received|written)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    reviewer_id = current_user["sub"]
    query: Dict[str, Any]
    if view == "received":
        query = {"recipient_id": reviewer_id}
    elif view == "written":
        query = {"reviewer_id": reviewer_id}
    else:
        query = {"$or": [{"recipient_id": reviewer_id}, {"reviewer_id": reviewer_id}]}

    total = await db.reviews.count_documents(query)
    skip = (page - 1) * page_size
    docs = await db.reviews.find(query).sort("created_at", -1).skip(skip).limit(page_size).to_list(length=page_size)
    items = [_apply_review_media(item) for item in serialize_docs(docs)]
    return {
        "items": items,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": max((total + page_size - 1) // page_size, 1),
        },
    }


@router.post("/{review_id}/response")
async def respond_to_review(
    review_id: str,
    payload: ReviewResponseRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    reviewer_id = current_user["sub"]
    role = current_user.get("role")
    if role not in {"equipment_owner", "admin"}:
        raise APIException("Owner access required", status.HTTP_403_FORBIDDEN)

    oid = to_object_id(review_id)
    query = {"_id": oid} if oid else {"_id": review_id}
    review = await db.reviews.find_one(query)
    if not review:
        raise APIException("Review not found", status.HTTP_404_NOT_FOUND)

    if review.get("review_type") != "equipment":
        raise APIException("Responses are only supported for equipment reviews.", status.HTTP_400_BAD_REQUEST)
    if role != "admin" and review.get("recipient_id") != reviewer_id:
        raise APIException("You can only respond to reviews for your listings.", status.HTTP_403_FORBIDDEN)
    if review.get("status") != "approved":
        raise APIException("Review must be approved before responding.", status.HTTP_400_BAD_REQUEST)

    now = _now_iso()
    response = review.get("response") or {
        "responder_id": reviewer_id,
        "responder_name": current_user.get("name") or current_user.get("full_name") or "Owner",
        "created_at": now,
    }
    response.update({"message": payload.message.strip(), "updated_at": now})

    await db.reviews.update_one(
        query,
        {"$set": {"response": response, "updated_at": now}},
    )
    updated = await db.reviews.find_one(query)
    return _apply_review_media(serialize_doc(updated))


@router.post("/{review_id}/flag")
async def flag_review(
    review_id: str,
    payload: ReviewFlagRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    user_id = current_user["sub"]
    oid = to_object_id(review_id)
    query = {"_id": oid} if oid else {"_id": review_id}
    review = await db.reviews.find_one(query)
    if not review:
        raise APIException("Review not found", status.HTTP_404_NOT_FOUND)

    flags = review.get("flags", [])
    if any(flag.get("user_id") == user_id for flag in flags):
        raise APIException("You have already flagged this review.", status.HTTP_409_CONFLICT)

    flags.append({"user_id": user_id, "reason": payload.reason.strip(), "created_at": _now_iso()})
    update: Dict[str, Any] = {"flags": flags, "updated_at": _now_iso()}
    if review.get("status") in {"approved", "pending"}:
        update["status"] = "flagged"

    await db.reviews.update_one(query, {"$set": update})
    updated = await db.reviews.find_one(query)
    return _apply_review_media(serialize_doc(updated))


@router.post("/{review_id}/dispute")
async def dispute_review(
    review_id: str,
    payload: ReviewDisputeRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    user_id = current_user["sub"]
    oid = to_object_id(review_id)
    query = {"_id": oid} if oid else {"_id": review_id}
    review = await db.reviews.find_one(query)
    if not review:
        raise APIException("Review not found", status.HTTP_404_NOT_FOUND)
    if review.get("recipient_id") != user_id and current_user.get("role") != "admin":
        raise APIException("Only the review recipient can open a dispute.", status.HTTP_403_FORBIDDEN)
    dispute = review.get("dispute")
    if dispute and dispute.get("status") == "open":
        raise APIException("A dispute is already open for this review.", status.HTTP_409_CONFLICT)

    now = _now_iso()
    dispute_payload = {
        "status": "open",
        "reason": payload.reason.strip(),
        "created_by": user_id,
        "created_at": now,
    }

    await db.reviews.update_one(
        query,
        {"$set": {"dispute": dispute_payload, "status": "disputed", "updated_at": now}},
    )
    updated = await db.reviews.find_one(query)
    return _apply_review_media(serialize_doc(updated))


@router.get("/moderation")
async def moderation_queue(
    status_filter: str = Query(default="pending", pattern=r"^(pending|flagged|disputed|rejected|approved|hidden|all)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    if current_user.get("role") != "admin":
        raise APIException("Admin access required", status.HTTP_403_FORBIDDEN)

    query: Dict[str, Any] = {}
    if status_filter != "all":
        query["status"] = status_filter

    total = await db.reviews.count_documents(query)
    skip = (page - 1) * page_size
    docs = await db.reviews.find(query).sort("created_at", -1).skip(skip).limit(page_size).to_list(length=page_size)
    items = [_apply_review_media(item) for item in serialize_docs(docs)]
    return {
        "items": items,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": max((total + page_size - 1) // page_size, 1),
        },
    }


@router.post("/{review_id}/moderate")
async def moderate_review(
    review_id: str,
    payload: ReviewModerationRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    if current_user.get("role") != "admin":
        raise APIException("Admin access required", status.HTTP_403_FORBIDDEN)

    oid = to_object_id(review_id)
    query = {"_id": oid} if oid else {"_id": review_id}
    review = await db.reviews.find_one(query)
    if not review:
        raise APIException("Review not found", status.HTTP_404_NOT_FOUND)

    action = payload.action
    status_map = {
        "approve": "approved",
        "reject": "rejected",
        "hide": "hidden",
        "restore": "approved",
    }
    new_status = status_map[action]
    now = _now_iso()
    update: Dict[str, Any] = {
        "status": new_status,
        "updated_at": now,
        "moderation": {
            "action": action,
            "moderated_by": current_user["sub"],
            "moderated_at": now,
            "reason": payload.reason.strip(),
        },
    }

    dispute = review.get("dispute")
    if dispute and dispute.get("status") == "open" and action in {"approve", "reject"}:
        dispute_update = dict(dispute)
        dispute_update.update(
            {
                "status": "resolved",
                "resolved_by": current_user["sub"],
                "resolved_at": now,
                "resolution_note": payload.reason.strip() or f"Admin {action}.",
            }
        )
        update["dispute"] = dispute_update

    await db.reviews.update_one(query, {"$set": update})
    updated = await db.reviews.find_one(query)

    recipient_id = review.get("recipient_id")
    if review.get("review_type") == "equipment":
        await _recalculate_equipment_rating(db, review.get("equipment_id"))
        await cache_service.invalidate_equipment(review.get("equipment_id"))
        await cache_service.invalidate_equipment_list()
    if recipient_id:
        await _recalculate_user_rating(db, recipient_id)

    return _apply_review_media(serialize_doc(updated))


@router.get("/analytics/owner")
async def owner_review_analytics(
    owner_id: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    role = current_user.get("role")
    if role == "equipment_owner":
        owner_id = current_user["sub"]
    elif role == "admin":
        if not owner_id:
            raise APIException("Owner id required.", status.HTTP_400_BAD_REQUEST)
    else:
        raise APIException("Owner access required", status.HTTP_403_FORBIDDEN)

    equipment_docs = await db.equipment.find({"owner_id": owner_id}).to_list(length=2000)
    equipment_ids = [str(doc.get("_id")) for doc in equipment_docs if doc.get("_id") is not None]
    equipment_name_map = {str(doc.get("_id")): doc.get("name") for doc in equipment_docs}

    if not equipment_ids:
        return {
            "owner_id": owner_id,
            "equipment_count": 0,
            "total_reviews": 0,
            "average_rating": 0.0,
            "rating_breakdown": {str(r): 0 for r in range(1, 6)},
            "response_rate": 0.0,
            "pending_reviews": 0,
            "recent_reviews": [],
            "equipment_performance": [],
        }

    match = {
        "equipment_id": {"$in": equipment_ids},
        "review_type": "equipment",
        "status": "approved",
    }
    total = await db.reviews.count_documents(match)

    avg_result = await db.reviews.aggregate(
        [{"$match": match}, {"$group": {"_id": None, "avg": {"$avg": "$rating"}}}]
    ).to_list(length=1)
    avg_rating = round(float(avg_result[0]["avg"]), 2) if avg_result else 0.0

    breakdown_docs = await db.reviews.aggregate(
        [{"$match": match}, {"$group": {"_id": "$rating", "count": {"$sum": 1}}}]
    ).to_list(length=10)
    breakdown = {str(item["_id"]): int(item["count"]) for item in breakdown_docs if item.get("_id")}
    for rating in range(1, 6):
        breakdown.setdefault(str(rating), 0)

    responded_count = await db.reviews.count_documents({**match, "response.message": {"$exists": True}})
    response_rate = round((responded_count / max(total, 1)) * 100, 1) if total else 0.0

    pending_count = await db.reviews.count_documents(
        {"equipment_id": {"$in": equipment_ids}, "review_type": "equipment", "status": "pending"}
    )

    recent_docs = (
        await db.reviews.find(match)
        .sort("created_at", -1)
        .limit(5)
        .to_list(length=5)
    )
    recent_reviews = [_apply_review_media(item) for item in serialize_docs(recent_docs)]

    per_equipment_docs = await db.reviews.aggregate(
        [
            {"$match": match},
            {"$group": {"_id": "$equipment_id", "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
            {"$sort": {"avg": -1}},
        ]
    ).to_list(length=200)
    equipment_performance = [
        {
            "equipment_id": str(item.get("_id")),
            "equipment_name": equipment_name_map.get(str(item.get("_id")), "Equipment"),
            "average_rating": round(float(item.get("avg", 0.0)), 2),
            "total_reviews": int(item.get("count", 0)),
        }
        for item in per_equipment_docs
    ]

    return {
        "owner_id": owner_id,
        "equipment_count": len(equipment_ids),
        "total_reviews": total,
        "average_rating": avg_rating,
        "rating_breakdown": breakdown,
        "response_rate": response_rate,
        "pending_reviews": pending_count,
        "recent_reviews": recent_reviews,
        "equipment_performance": equipment_performance,
    }
