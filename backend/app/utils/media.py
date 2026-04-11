from __future__ import annotations

from typing import Optional
from urllib.parse import urlparse

PUBLIC_MEDIA_PREFIX = "/api/v1/media/public/"


def public_media_url(asset_id: str) -> str:
    return f"{PUBLIC_MEDIA_PREFIX}{asset_id}"


def extract_public_media_id(url: str) -> Optional[str]:
    if not url:
        return None
    candidate = url.strip()
    if not candidate:
        return None
    path = urlparse(candidate).path if "://" in candidate else candidate
    if path.startswith(PUBLIC_MEDIA_PREFIX):
        return path[len(PUBLIC_MEDIA_PREFIX) :].strip("/").split("/", 1)[0] or None
    fallback_prefix = "/media/public/"
    if path.startswith(fallback_prefix):
        return path[len(fallback_prefix) :].strip("/").split("/", 1)[0] or None
    return None
