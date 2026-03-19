from __future__ import annotations

import logging
import mimetypes
import re
import uuid
from typing import Any, Dict, Optional

import anyio
import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.config import settings
from app.core.exceptions import APIException

logger = logging.getLogger(__name__)


def _safe_segment(value: str, fallback: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_-]", "", value or "").strip()
    return cleaned or fallback


def _extension_for(content_type: str, filename: Optional[str]) -> str:
    extension = ""
    if filename:
        extension = (filename.rsplit(".", 1)[-1] if "." in filename else "").lower()
        if extension:
            extension = f".{extension}"
    if not extension:
        extension = mimetypes.guess_extension(content_type or "") or ""
    if extension == ".jpe":
        extension = ".jpg"
    return extension


class MediaService:
    def __init__(self) -> None:
        self._client = None

    def _get_client(self):
        if self._client is None:
            session = boto3.session.Session(
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
                region_name=settings.AWS_REGION or None,
            )
            self._client = session.client("s3")
        return self._client

    def _bucket(self) -> str:
        bucket = (settings.S3_BUCKET_NAME or "").strip()
        if not bucket:
            raise APIException("S3 bucket is not configured.", 503)
        return bucket

    def build_key(self, purpose: str, owner_id: str, filename: Optional[str], content_type: str) -> str:
        safe_purpose = _safe_segment(purpose, "media")
        safe_owner = _safe_segment(owner_id, "user")
        extension = _extension_for(content_type, filename)
        unique_id = uuid.uuid4().hex
        return f"media/{safe_purpose}/{safe_owner}/{unique_id}{extension}"

    def _create_presigned_post(
        self,
        key: str,
        content_type: str,
        max_bytes: int,
        expires_in: int,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        client = self._get_client()
        bucket = self._bucket()
        fields: Dict[str, Any] = {
            "key": key,
            "Content-Type": content_type,
        }
        conditions = [
            {"key": key},
            {"Content-Type": content_type},
            ["content-length-range", 1, max_bytes],
        ]
        for meta_key, meta_value in (metadata or {}).items():
            header = f"x-amz-meta-{meta_key}"
            fields[header] = str(meta_value)
            conditions.append({header: str(meta_value)})
        try:
            return client.generate_presigned_post(
                Bucket=bucket,
                Key=key,
                Fields=fields,
                Conditions=conditions,
                ExpiresIn=expires_in,
            )
        except (BotoCoreError, ClientError) as exc:
            logger.warning("Failed to generate presigned POST: %s", exc)
            raise APIException("Unable to generate upload credentials.", 502)

    def _head_object(self, key: str) -> Dict[str, Any]:
        client = self._get_client()
        bucket = self._bucket()
        try:
            return client.head_object(Bucket=bucket, Key=key)
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            if code in {"404", "NoSuchKey", "NotFound"}:
                raise APIException("Uploaded object not found.", 404)
            logger.warning("Failed to verify upload: %s", exc)
            raise APIException("Unable to verify upload.", 502)
        except BotoCoreError as exc:
            logger.warning("Failed to verify upload: %s", exc)
            raise APIException("Unable to verify upload.", 502)

    def _create_presigned_get(self, key: str, expires_in: int) -> str:
        client = self._get_client()
        bucket = self._bucket()
        try:
            return client.generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket, "Key": key},
                ExpiresIn=expires_in,
            )
        except (BotoCoreError, ClientError) as exc:
            logger.warning("Failed to generate presigned URL: %s", exc)
            raise APIException("Unable to generate download URL.", 502)

    async def create_presigned_post(
        self,
        key: str,
        content_type: str,
        max_bytes: int,
        expires_in: int,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        return await anyio.to_thread.run_sync(
            self._create_presigned_post,
            key,
            content_type,
            max_bytes,
            expires_in,
            metadata,
        )

    async def head_object(self, key: str) -> Dict[str, Any]:
        return await anyio.to_thread.run_sync(self._head_object, key)

    async def create_presigned_get(self, key: str, expires_in: int) -> str:
        return await anyio.to_thread.run_sync(self._create_presigned_get, key, expires_in)


media_service = MediaService()
