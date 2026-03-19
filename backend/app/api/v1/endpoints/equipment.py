from pathlib import Path
from typing import Optional, List
import uuid

from fastapi import APIRouter, Depends, Query, status, UploadFile, File
from pydantic import BaseModel, Field, field_validator
from datetime import datetime, timezone

from app.core.exceptions import APIException
from app.dependencies import get_current_user
from app.db.client import get_required_db
from app.config import settings
from app.db.repositories.equipment_repo import EquipmentRepository
from app.db.repositories.media_repo import MediaRepository
from app.db.repositories.user_repo import UserRepository
from app.db.utils import serialize_docs
from app.services.cache_service import cache_service
from app.utils.media import public_media_url

router = APIRouter()

UPLOAD_DIR = Path(__file__).resolve().parents[3] / "uploads"
MAX_UPLOAD_BYTES = 2 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
EXT_BY_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


class CreateEquipmentRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    category: str = Field(pattern=r"^(tractor|harvester|seeder|tillage|irrigation|crop_care)$")
    daily_rate: float = Field(gt=0)
    location: str = "Unspecified"
    location_coords: Optional["LocationPoint"] = None
    description: str = ""
    specs: list[str] = []
    image_url: Optional[str] = Field(default=None, max_length=2_000_000)
    image_asset_id: Optional[str] = Field(default=None, min_length=1)

    @field_validator("image_url", mode="before")
    @classmethod
    def _validate_image_url(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            return None
        return cleaned

    @field_validator("image_asset_id", mode="before")
    @classmethod
    def _validate_image_asset_id(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = str(value).strip()
        return cleaned or None


# Advanced Search Models - Task 4
class LocationCoordinates(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    radius_km: float = Field(default=50, ge=1, le=500)


class LocationPoint(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class AdvancedSearchRequest(BaseModel):
    query: str = Field(default="", max_length=200)
    category: Optional[str] = None
    min_price: float = Field(default=0, ge=0)
    max_price: float = Field(default=100000, ge=0)
    min_condition: int = Field(default=1, ge=1, le=5)
    min_rating: float = Field(default=0, ge=0, le=5)
    available_only: bool = True
    condition_types: List[str] = Field(default=["excellent", "good", "fair"])
    features: List[str] = Field(default=[])


class LocationSearchRequest(BaseModel):
    query: str = Field(default="", max_length=200)
    location: LocationCoordinates
    category: Optional[str] = None
    min_price: float = Field(default=0, ge=0)
    max_price: float = Field(default=100000, ge=0)


class EquipmentComparisonRequest(BaseModel):
    equipment_ids: List[str] = Field(min_items=2, max_items=5)


class SearchSuggestionRequest(BaseModel):
    query: str = Field(min_length=1, max_length=100)
    category: Optional[str] = None


@router.post("/upload")
async def upload_equipment_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in {"equipment_owner", "admin"}:
        raise APIException("Owner access required", status.HTTP_403_FORBIDDEN)

    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise APIException("Unsupported image type. Use JPG, PNG, WEBP, or GIF.", status.HTTP_400_BAD_REQUEST)

    data = await file.read()
    if not data:
        raise APIException("Empty upload.", status.HTTP_400_BAD_REQUEST)
    if len(data) > MAX_UPLOAD_BYTES:
        raise APIException("Image must be smaller than 2MB.", status.HTTP_400_BAD_REQUEST)

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in EXT_BY_TYPE.values():
        suffix = EXT_BY_TYPE.get(content_type, ".jpg")
    filename = f"eq_{uuid.uuid4().hex}{suffix}"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    (UPLOAD_DIR / filename).write_bytes(data)

    return {"url": f"/uploads/{filename}"}


def _now_iso() -> datetime:
    return datetime.now(timezone.utc)


def _apply_media_url(item: dict) -> dict:
    asset_id = item.get("image_asset_id")
    if asset_id:
        item["image_url"] = public_media_url(asset_id)
    return item


async def _ensure_equipment_media_asset(asset_id: str, current_user: dict, db) -> dict:
    repo = MediaRepository(db)
    asset = await repo.get_by_id(asset_id)
    if not asset:
        raise APIException("Equipment image asset not found.", status.HTTP_404_NOT_FOUND)
    if asset.get("purpose") != "equipment_image":
        raise APIException("Media asset is not an equipment image.", status.HTTP_400_BAD_REQUEST)
    if asset.get("status") != "ready":
        raise APIException("Media asset is not ready yet.", status.HTTP_409_CONFLICT)
    role = current_user.get("role")
    if role != "admin" and asset.get("owner_id") != current_user.get("sub"):
        raise APIException("Not authorized to use this media asset.", status.HTTP_403_FORBIDDEN)
    return asset


@router.get("")
async def list_equipment(q: str = Query(default=""), category: str = Query(default="all"), db=Depends(get_required_db)):
    repo = EquipmentRepository(db)
    items = await repo.list_equipment(q=q, category=category)
    return [_apply_media_url(item) for item in items]


@router.get("/browse")
async def browse_equipment(
    q: str = Query(default=""),
    category: str = Query(default="all"),
    sort: str = Query(default="newest", pattern=r"^(newest|rating|price_low|price_high|name)$"),
    min_rate: float = Query(default=0, ge=0),
    max_rate: float = Query(default=1000000, ge=0),
    available_only: bool = Query(default=False),
    owner_verified_only: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=200),
    db=Depends(get_required_db),
):
    # Generate cache key based on search parameters
    cache_key = f"equipment:list:{q}:{category}:{sort}:{min_rate}:{max_rate}:{available_only}:{owner_verified_only}:{page}:{page_size}"
    
    # Try to get from cache
    cached_result = await cache_service.get_cached_equipment(cache_key)
    if cached_result is not None:
        return cached_result
    
    repo = EquipmentRepository(db)
    result = await repo.browse(
        q=q,
        category=category,
        sort=sort,
        min_rate=min_rate,
        max_rate=max_rate,
        available_only=available_only,
        owner_verified_only=owner_verified_only,
        include_hidden=False,
        page=page,
        page_size=page_size,
    )
    result["items"] = [_apply_media_url(item) for item in result.get("items", [])]
    
    # Cache the result for 10 minutes
    await cache_service.cache_equipment(cache_key, result, expire=600)
    return result


@router.get("/mine")
async def my_equipment(current_user: dict = Depends(get_current_user), db=Depends(get_required_db)):
    if current_user.get("role") not in {"equipment_owner", "admin"}:
        raise APIException("Owner access required", status.HTTP_403_FORBIDDEN)
    repo = EquipmentRepository(db)
    items = await repo.my_equipment(current_user["sub"])
    return [_apply_media_url(item) for item in items]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_equipment(
    payload: CreateEquipmentRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    if current_user.get("role") not in {"equipment_owner", "admin"}:
        raise APIException("Owner access required", status.HTTP_403_FORBIDDEN)

    # Check if owner is verified (skip for admin)
    user_repo = UserRepository(db)
    if current_user.get("role") == "equipment_owner":
        if not await user_repo.is_owner_verified(current_user["sub"]):
            raise APIException("Account verification required before listing equipment. Please contact admin.", status.HTTP_403_FORBIDDEN)

    owner = await user_repo.get_by_id(current_user["sub"], public=True)
    owner_name = owner.get("full_name") if owner else (current_user.get("full_name") or current_user.get("name") or "Owner")

    repo = EquipmentRepository(db)
    data = payload.model_dump()
    if data.get("image_url") and str(data.get("image_url", "")).startswith("/uploads/"):
        raise APIException("Use the media upload flow instead of /uploads for equipment images.", status.HTTP_400_BAD_REQUEST)
    location_point = payload.location_coords
    if location_point:
        data["location_coords"] = {
            "type": "Point",
            "coordinates": [location_point.longitude, location_point.latitude],
        }
    media_asset = None
    if payload.image_asset_id:
        media_asset = await _ensure_equipment_media_asset(payload.image_asset_id, current_user, db)
        data["image_asset_id"] = payload.image_asset_id
        data["image_url"] = public_media_url(payload.image_asset_id)
    elif data.get("image_asset_id") is None:
        data.pop("image_asset_id", None)
    data.update(
        {
            "owner_id": current_user["sub"],
            "owner_name": owner_name,
            "rating": 4.5,
            "created_at": _now_iso(),
            "is_available": True,
            "is_visible_to_farmers": True,
        }
    )
    new_id = await repo.create(data)
    result = await repo.get_by_id(new_id)
    if media_asset:
        related = dict(media_asset.get("related") or {})
        related["equipment_id"] = new_id
        media_repo = MediaRepository(db)
        await media_repo.update(payload.image_asset_id, {"related": related})
    
    # Invalidate equipment list cache
    await cache_service.invalidate_equipment_list()
    
    return _apply_media_url(result)


@router.get("/{equipment_id}")
async def get_equipment(equipment_id: str, db=Depends(get_required_db)):
    # Try cache first
    cached = await cache_service.get_cached_equipment(equipment_id)
    if cached is not None:
        return cached
    
    repo = EquipmentRepository(db)
    equipment = await repo.get_by_id(equipment_id)
    
    if not equipment:
        raise APIException("Equipment not found", status.HTTP_404_NOT_FOUND)
    
    # Cache for 30 minutes
    equipment = _apply_media_url(equipment)
    await cache_service.cache_equipment(equipment_id, equipment, expire=1800)
    return equipment


@router.delete("/{equipment_id}")
async def delete_equipment(
    equipment_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    role = current_user.get("role")
    if role not in {"equipment_owner", "admin"}:
        raise APIException("Owner access required", status.HTTP_403_FORBIDDEN)

    repo = EquipmentRepository(db)
    equipment = await repo.get_by_id(equipment_id)
    if not equipment:
        raise APIException("Equipment not found", status.HTTP_404_NOT_FOUND)
    if role == "equipment_owner" and equipment.get("owner_id") != current_user.get("sub"):
        raise APIException("You can only delete your own equipment", status.HTTP_403_FORBIDDEN)
    deleted = await repo.delete(equipment_id)

    if not deleted:
        raise APIException("Equipment not found", status.HTTP_404_NOT_FOUND)
    
    # Invalidate cache
    await cache_service.invalidate_equipment(equipment_id)
    await cache_service.invalidate_equipment_list()
    
    return {"ok": True, "deleted_id": equipment_id}


# ==================== TASK 4: Advanced Search & Filtering ====================

@router.post("/search/advanced")
async def advanced_search(
    request: AdvancedSearchRequest,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=100),
    db=Depends(get_required_db),
):
    """Advanced equipment search with multiple filters"""
    
    # Generate cache key
    cache_key = f"equipment:search:advanced:{request.query}:{request.category}:{request.min_price}:{request.max_price}:{request.min_rating}:{page}:{page_size}"
    
    # Try cache first
    cached = await cache_service.get_cached_equipment(cache_key)
    if cached is not None:
        return cached
    
    repo = EquipmentRepository(db)
    
    # Build query filters
    filters = {
        "is_visible_to_farmers": True,
    }
    if request.available_only:
        filters["is_available"] = True
    
    if request.query:
        filters["$or"] = [
            {"name": {"$regex": request.query, "$options": "i"}},
            {"description": {"$regex": request.query, "$options": "i"}},
        ]
    
    if request.category:
        filters["category"] = request.category
    
    if request.min_price is not None or request.max_price is not None:
        filters["daily_rate"] = {}
        if request.min_price is not None and request.min_price > 0:
            filters["daily_rate"]["$gte"] = request.min_price
        if request.max_price is not None and request.max_price > 0:
            filters["daily_rate"]["$lte"] = request.max_price
        if not filters["daily_rate"]:
            del filters["daily_rate"]
    
    if request.min_rating:
        filters["rating"] = {"$gte": request.min_rating}
    
    if request.condition_types:
        filters["condition"] = {"$in": request.condition_types}
    
    if request.features:
        filters["specs"] = {"$in": request.features}
    
    # Execute query with pagination
    skip = (page - 1) * page_size
    raw_results = await db.equipment.find(filters).skip(skip).limit(page_size).to_list(length=page_size)
    results = serialize_docs(raw_results)
    total = await db.equipment.count_documents(filters)
    results = [_apply_media_url(item) for item in results]
    
    response = {
        "items": results,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
        }
    }
    
    # Cache for 10 minutes
    await cache_service.cache_equipment(cache_key, response, expire=600)
    return response


@router.post("/search/location")
async def location_based_search(
    request: LocationSearchRequest,
    db=Depends(get_required_db),
):
    """Search for equipment near a geographic location"""
    
    if not settings.GOOGLE_MAPS_API_KEY or not settings.ENABLE_LOCATION_SEARCH:
        raise APIException(
            "Location-based search is not enabled. Configure GOOGLE_MAPS_API_KEY",
            status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    # Check cache
    cache_key = f"equipment:location:{request.location.latitude}:{request.location.longitude}:{request.location.radius_km}"
    cached = await cache_service.get_cached_equipment(cache_key)
    if cached is not None:
        return cached
    
    # Use MongoDB geospatial query (requires 2dsphere index on location field)
    query = {
        "is_visible_to_farmers": True,
        "is_available": True,
        "location_coords": {
            "$near": {
                "$geometry": {
                    "type": "Point",
                    "coordinates": [request.location.longitude, request.location.latitude]
                },
                "$maxDistance": int(request.location.radius_km * 1000)  # Convert km to meters
            }
        }
    }
    
    if request.query:
        query["$or"] = [
            {"name": {"$regex": request.query, "$options": "i"}},
            {"description": {"$regex": request.query, "$options": "i"}},
        ]
    
    if request.category:
        query["category"] = request.category
    
    if request.min_price is not None or request.max_price is not None:
        query["daily_rate"] = {}
        if request.min_price is not None and request.min_price > 0:
            query["daily_rate"]["$gte"] = request.min_price
        if request.max_price is not None and request.max_price > 0:
            query["daily_rate"]["$lte"] = request.max_price
        if not query["daily_rate"]:
            del query["daily_rate"]
    
    raw_results = await db.equipment.find(query).limit(50).to_list(length=50)
    results = serialize_docs(raw_results)
    results = [_apply_media_url(item) for item in results]
    
    response = {
        "center": {
            "latitude": request.location.latitude,
            "longitude": request.location.longitude,
        },
        "radius_km": request.location.radius_km,
        "items": results,
        "count": len(results),
    }
    
    # Cache for 15 minutes
    await cache_service.cache_equipment(cache_key, response, expire=900)
    return response


@router.post("/search/suggestions")
async def search_suggestions(
    request: SearchSuggestionRequest,
    db=Depends(get_required_db),
):
    """Get search suggestions and autocomplete"""
    
    # Check cache
    cache_key = f"equipment:suggestions:{request.query}:{request.category}"
    cached = await cache_service.get(cache_key)
    if cached is not None:
        return cached
    
    pipeline = [
        {
            "$match": {
                "is_visible_to_farmers": True,
                "$or": [
                    {"name": {"$regex": request.query, "$options": "i"}},
                    {"description": {"$regex": request.query, "$options": "i"}},
                ]
            }
        }
    ]
    
    if request.category:
        pipeline[0]["$match"]["category"] = request.category
    
    pipeline.extend([
        {
            "$group": {
                "_id": None,
                "names": {"$addToSet": "$name"},
                "categories": {"$addToSet": "$category"},
                "locations": {"$addToSet": "$location"},
            }
        },
        {
            "$project": {
                "_id": 0,
                "name_suggestions": {"$slice": ["$names", 5]},
                "category_suggestions": "$categories",
                "location_suggestions": {"$slice": ["$locations", 5]},
            }
        }
    ])
    
    results = await db.equipment.aggregate(pipeline).to_list(length=1)
    
    response = results[0] if results else {
        "name_suggestions": [],
        "category_suggestions": [],
        "location_suggestions": [],
    }
    
    # Cache for 1 hour
    await cache_service.set(cache_key, response, expire=3600)
    return response


@router.post("/compare")
async def compare_equipment(
    request: EquipmentComparisonRequest,
    db=Depends(get_required_db),
):
    """Compare multiple equipment items side by side"""
    
    if len(request.equipment_ids) < 2:
        raise APIException("At least 2 equipment items required for comparison", status.HTTP_400_BAD_REQUEST)
    
    repo = EquipmentRepository(db)
    equipment_list = []
    for eq_id in request.equipment_ids:
        eq = await repo.get_by_id(eq_id)
        if eq and eq.get("is_visible_to_farmers", True):
            equipment_list.append(_apply_media_url(eq))
    
    if len(equipment_list) < 2:
        raise APIException("Could not find enough equipment items", status.HTTP_404_NOT_FOUND)
    
    # Comparison data
    comparison = {
        "items": equipment_list,
        "comparison_fields": {
            "name": [eq.get("name") for eq in equipment_list],
            "category": [eq.get("category") for eq in equipment_list],
            "daily_rate": [eq.get("daily_rate") for eq in equipment_list],
            "condition": [eq.get("condition") for eq in equipment_list],
            "rating": [eq.get("rating") for eq in equipment_list],
            "location": [eq.get("location") for eq in equipment_list],
            "specs": [eq.get("specs", []) for eq in equipment_list],
        }
    }
    
    return comparison


@router.get("/search/history")
async def get_search_history(
    current_user: dict = Depends(get_current_user),
    limit: int = Query(default=10, ge=1, le=50),
    db=Depends(get_required_db),
):
    """Get user's search history"""
    
    history = await db.search_history.find(
        {"user_id": current_user["sub"]}
    ).sort("created_at", -1).limit(limit).to_list(length=limit)
    
    return {
        "history": [
            {
                "query": h.get("query"),
                "category": h.get("category"),
                "filters": h.get("filters"),
                "results_count": h.get("results_count"),
                "searched_at": h.get("created_at").isoformat() if h.get("created_at") else None,
            }
            for h in history
        ]
    }


@router.post("/search/history")
async def save_search_history(
    query: str = Query(min_length=1),
    category: Optional[str] = None,
    results_count: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    """Save search to user's history"""
    
    search_record = {
        "user_id": current_user["sub"],
        "query": query,
        "category": category,
        "results_count": results_count,
        "created_at": datetime.now(timezone.utc),
    }
    
    result = await db.search_history.insert_one(search_record)
    
    return {
        "ok": True,
        "search_id": str(result.inserted_id),
        "saved_at": search_record["created_at"].isoformat(),
    }
