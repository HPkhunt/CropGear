from __future__ import annotations

import io
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import boto3
from bson import ObjectId
from celery.utils.log import get_task_logger
from PIL import Image, ImageOps
from pymongo import MongoClient

from app.config import settings
from app.core.celery_app import celery_app

logger = get_task_logger(__name__)

VARIANT_SIZES: List[Tuple[str, int]] = [
    ("thumb", 256),
    ("small", 640),
    ("medium", 1280),
]


def _now_iso() -> datetime:
    return datetime.now(timezone.utc)


def _to_object_id(value: str) -> Optional[ObjectId]:
    try:
        return ObjectId(str(value))
    except Exception:
        return None


def _mongo() -> MongoClient:
    return MongoClient(settings.MONGODB_URL, serverSelectionTimeoutMS=5000)


def _s3_client():
    session = boto3.session.Session(
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
        region_name=settings.AWS_REGION or None,
    )
    return session.client("s3")


def _variant_key(original_key: str, label: str, extension: str = "webp") -> str:
    base = original_key.rsplit(".", 1)[0] if "." in original_key else original_key
    return f"{base}_{label}.{extension}"


@celery_app.task(name="media.optimize_variants", bind=True, max_retries=2)
def optimize_media_variants(self, asset_id: str) -> Dict[str, Any]:
    client = _mongo()
    try:
        db = client[settings.DATABASE_NAME]
        oid = _to_object_id(asset_id)
        query = {"_id": oid} if oid else {"_id": asset_id}
        asset = db.media_assets.find_one(query)
        if not asset:
            return {"status": "skipped", "reason": "asset_not_found"}

        content_type = str(asset.get("content_type") or "")
        if not content_type.startswith("image/"):
            db.media_assets.update_one(
                query,
                {"$set": {"optimization_status": "skipped", "updated_at": _now_iso()}},
            )
            return {"status": "skipped", "reason": "not_image"}

        if asset.get("status") != "ready":
            return {"status": "skipped", "reason": "not_ready"}

        bucket = asset.get("bucket") or settings.S3_BUCKET_NAME
        key = asset.get("s3_key")
        if not bucket or not key:
            return {"status": "skipped", "reason": "missing_bucket_or_key"}

        s3 = _s3_client()
        try:
            obj = s3.get_object(Bucket=bucket, Key=key)
            original_bytes = obj["Body"].read()
        except Exception as exc:
            db.media_assets.update_one(
                query,
                {"$set": {"optimization_status": "failed", "optimization_error": str(exc), "updated_at": _now_iso()}},
            )
            raise self.retry(exc=exc, countdown=5)

        try:
            image = Image.open(io.BytesIO(original_bytes))
            image = ImageOps.exif_transpose(image)
        except Exception as exc:
            db.media_assets.update_one(
                query,
                {"$set": {"optimization_status": "failed", "optimization_error": str(exc), "updated_at": _now_iso()}},
            )
            return {"status": "failed", "reason": "decode_error"}

        variants: Dict[str, Dict[str, Any]] = {"webp": {}}
        for label, size in VARIANT_SIZES:
            working = image.copy()
            working.thumbnail((size, size), Image.LANCZOS)
            buffer = io.BytesIO()
            try:
                if working.mode not in {"RGB", "RGBA"}:
                    working = working.convert("RGB")
                working.save(buffer, format="WEBP", quality=82, method=6)
            except Exception as exc:
                logger.warning("Failed to encode variant %s: %s", label, exc)
                continue
            data = buffer.getvalue()
            variant_key = _variant_key(key, label, "webp")
            try:
                s3.put_object(
                    Bucket=bucket,
                    Key=variant_key,
                    Body=data,
                    ContentType="image/webp",
                )
            except Exception as exc:
                logger.warning("Failed to upload variant %s: %s", label, exc)
                continue
            variants["webp"][label] = {
                "key": variant_key,
                "width": working.size[0],
                "height": working.size[1],
                "size": len(data),
                "content_type": "image/webp",
            }

        update: Dict[str, Any] = {
            "variants": variants,
            "optimization_status": "ready",
            "optimized_at": _now_iso(),
            "updated_at": _now_iso(),
        }
        db.media_assets.update_one(query, {"$set": update})
        return {"status": "ok", "variants": variants}
    finally:
        client.close()
