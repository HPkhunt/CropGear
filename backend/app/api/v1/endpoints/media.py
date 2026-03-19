from __future__ import annotations

from datetime import datetime, timedelta, timezone
import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field, field_validator

from app.config import settings
from app.core.exceptions import APIException
from app.core.celery_app import celery_app
from app.dependencies import get_current_user
from app.db.client import get_required_db
from app.db.repositories.media_repo import MediaRepository
from app.services.media_service import media_service

router = APIRouter()
logger = logging.getLogger(__name__)

DEFAULT_PRESIGN_EXPIRES_IN = 900
MAX_PRESIGN_EXPIRES_IN = 3600
DEFAULT_DOWNLOAD_EXPIRES_IN = 900
MAX_DOWNLOAD_EXPIRES_IN = 3600

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_DOC_TYPES = {"application/pdf"}

PURPOSE_RULES = {
    "equipment_image": {
        "content_types": ALLOWED_IMAGE_TYPES,
        "max_bytes": 5 * 1024 * 1024,
        "public": True,
    },
    "review_photo": {
        "content_types": ALLOWED_IMAGE_TYPES,
        "max_bytes": 2 * 1024 * 1024,
        "public": True,
    },
    "chat_attachment": {
        "content_types": ALLOWED_IMAGE_TYPES | ALLOWED_DOC_TYPES,
        "max_bytes": 10 * 1024 * 1024,
        "public": False,
    },
}

PURPOSE_ROLES = {
    "equipment_image": {"equipment_owner", "admin"},
    "review_photo": {"farmer", "equipment_owner", "admin"},
    "chat_attachment": {"farmer", "equipment_owner", "admin"},
}

RELATED_KEYS = {"equipment_id", "review_id", "chat_id", "message_id"}


def _now_iso() -> datetime:
    return datetime.now(timezone.utc)


def _rules_for(purpose: str) -> Dict[str, Any]:
    rules = PURPOSE_RULES.get(purpose)
    if not rules:
        raise APIException("Unsupported media purpose.", 400)
    return rules


def _clean_related(related: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    cleaned: Dict[str, Any] = {}
    for key, value in (related or {}).items():
        if key in RELATED_KEYS and value is not None:
            cleaned[key] = str(value)
    return cleaned


class MediaPresignRequest(BaseModel):
    purpose: str = Field(pattern=r"^(equipment_image|review_photo|chat_attachment)$")
    content_type: str = Field(min_length=3, max_length=120)
    content_length: int = Field(gt=0)
    filename: Optional[str] = Field(default="", max_length=255)
    related: Optional[Dict[str, Any]] = None
    expires_in: Optional[int] = Field(default=DEFAULT_PRESIGN_EXPIRES_IN, ge=60, le=MAX_PRESIGN_EXPIRES_IN)

    @field_validator("content_type", mode="before")
    @classmethod
    def _normalize_content_type(cls, value: Any) -> Any:
        if value is None:
            return value
        cleaned = str(value).strip().lower()
        return cleaned.split(";", 1)[0].strip()


class MediaFinalizeRequest(BaseModel):
    asset_id: str = Field(min_length=1)


@router.post("/presign")
async def presign_media_upload(
    payload: MediaPresignRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    purpose = payload.purpose
    role = current_user.get("role")
    if role not in PURPOSE_ROLES.get(purpose, set()):
        raise APIException("Not authorized to upload this media type.", 403)

    rules = _rules_for(purpose)
    if payload.content_type not in rules["content_types"]:
        raise APIException("Unsupported file type for this upload.", 400)
    if payload.content_length > rules["max_bytes"]:
        raise APIException("File exceeds maximum allowed size.", 400)
    upload_limit = min(int(payload.content_length), int(rules["max_bytes"]))

    owner_id = current_user.get("sub")
    if not owner_id:
        raise APIException("User identity unavailable.", 401)

    bucket = (settings.S3_BUCKET_NAME or "").strip()
    if not bucket:
        raise APIException("S3 bucket is not configured.", 503)

    key = media_service.build_key(purpose, owner_id, payload.filename, payload.content_type)
    now = _now_iso()
    expires_in = min(max(int(payload.expires_in or DEFAULT_PRESIGN_EXPIRES_IN), 60), MAX_PRESIGN_EXPIRES_IN)
    related = _clean_related(payload.related)

    repo = MediaRepository(db)
    asset_doc = {
        "owner_id": owner_id,
        "purpose": purpose,
        "bucket": bucket,
        "region": str(settings.AWS_REGION or ""),
        "s3_key": key,
        "content_type": payload.content_type,
        "expected_size": payload.content_length,
        "original_filename": payload.filename or "",
        "status": "pending",
        "is_public": bool(rules.get("public", False)),
        "related": related,
        "created_at": now,
        "updated_at": now,
        "upload_expires_at": now + timedelta(seconds=expires_in),
    }
    asset_id = await repo.create(asset_doc)

    try:
        presign = await media_service.create_presigned_post(
            key=key,
            content_type=payload.content_type,
            max_bytes=upload_limit,
            expires_in=expires_in,
            metadata={"asset_id": asset_id, "owner_id": owner_id, "purpose": purpose},
        )
    except APIException:
        await repo.update(asset_id, {"status": "error"})
        raise

    asset = await repo.get_by_id(asset_id)
    return {
        "asset": asset,
        "upload": {
            "url": presign.get("url"),
            "fields": presign.get("fields"),
            "expires_in": expires_in,
            "max_bytes": upload_limit,
        },
    }


@router.post("/finalize")
async def finalize_media_upload(
    payload: MediaFinalizeRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    repo = MediaRepository(db)
    asset = await repo.get_by_id(payload.asset_id)
    if not asset:
        raise APIException("Media asset not found.", 404)

    role = current_user.get("role")
    if role != "admin" and asset.get("owner_id") != current_user.get("sub"):
        raise APIException("Not authorized to finalize this upload.", 403)

    if asset.get("status") == "ready":
        download_url = await media_service.create_presigned_get(
            asset.get("s3_key", ""),
            DEFAULT_DOWNLOAD_EXPIRES_IN,
        )
        return {"asset": asset, "download_url": download_url, "expires_in": DEFAULT_DOWNLOAD_EXPIRES_IN}

    if asset.get("status") not in {"pending", "uploaded"}:
        raise APIException("Upload is not in a finalizable state.", 409)

    rules = _rules_for(asset.get("purpose", ""))
    head = await media_service.head_object(asset.get("s3_key", ""))
    size = int(head.get("ContentLength", 0))
    content_type = (head.get("ContentType") or asset.get("content_type") or "").lower()
    content_type = content_type.split(";", 1)[0].strip()

    if size <= 0:
        await repo.update(payload.asset_id, {"status": "rejected"})
        raise APIException("Uploaded file is empty.", 400)
    expected_size = int(asset.get("expected_size") or 0)
    if expected_size and size > expected_size:
        await repo.update(payload.asset_id, {"status": "rejected"})
        raise APIException("Uploaded file exceeds the expected size.", 400)
    if content_type not in rules["content_types"]:
        await repo.update(payload.asset_id, {"status": "rejected"})
        raise APIException("Uploaded file type does not match the allowed policy.", 400)
    if size > rules["max_bytes"]:
        await repo.update(payload.asset_id, {"status": "rejected"})
        raise APIException("Uploaded file exceeds allowed size.", 400)

    etag = str(head.get("ETag", "")).strip("\"")
    update = {
        "status": "ready",
        "size": size,
        "content_type": content_type,
        "etag": etag,
        "uploaded_at": _now_iso(),
    }
    await repo.update(payload.asset_id, update)
    updated = await repo.get_by_id(payload.asset_id)
    if content_type.startswith("image/"):
        await repo.update(payload.asset_id, {"optimization_status": "queued"})
        try:
            celery_app.send_task("media.optimize_variants", args=[payload.asset_id])
        except Exception as exc:
            logger.warning("Failed to enqueue media optimization: %s", exc)
    download_url = await media_service.create_presigned_get(
        updated.get("s3_key", ""),
        DEFAULT_DOWNLOAD_EXPIRES_IN,
    )
    return {"asset": updated, "download_url": download_url, "expires_in": DEFAULT_DOWNLOAD_EXPIRES_IN}


@router.get("/{media_id}")
async def get_media_asset(
    media_id: str,
    expires_in: int = Query(default=DEFAULT_DOWNLOAD_EXPIRES_IN, ge=60, le=MAX_DOWNLOAD_EXPIRES_IN),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    repo = MediaRepository(db)
    asset = await repo.get_by_id(media_id)
    if not asset:
        raise APIException("Media asset not found.", 404)

    role = current_user.get("role")
    if role != "admin" and not asset.get("is_public") and asset.get("owner_id") != current_user.get("sub"):
        raise APIException("Not authorized to access this media asset.", 403)

    download_url = None
    if asset.get("status") == "ready":
        download_url = await media_service.create_presigned_get(asset.get("s3_key", ""), int(expires_in))
    return {"asset": asset, "download_url": download_url, "expires_in": int(expires_in)}


@router.get("/public/{media_id}")
async def get_public_media_asset(
    media_id: str,
    expires_in: int = Query(default=DEFAULT_DOWNLOAD_EXPIRES_IN, ge=60, le=MAX_DOWNLOAD_EXPIRES_IN),
    db=Depends(get_required_db),
):
    repo = MediaRepository(db)
    asset = await repo.get_by_id(media_id)
    if not asset:
        raise APIException("Media asset not found.", 404)
    if not asset.get("is_public"):
        raise APIException("Media asset is not public.", 403)
    if asset.get("status") != "ready":
        raise APIException("Media asset is not ready.", 409)
    download_url = await media_service.create_presigned_get(asset.get("s3_key", ""), int(expires_in))
    return RedirectResponse(download_url, status_code=307)
