"""
In-memory cache service.

Drop-in replacement for the Redis-backed implementation.  Every public
method that existed before is kept so that callers (endpoints, middleware,
etc.) require **zero changes**.

Internally the cache is a simple dictionary with TTL support driven by
``time.monotonic()``.  A lightweight reaper runs on every write to evict
expired entries so memory stays bounded.
"""

import json
import logging
import time
from datetime import date, datetime
from fnmatch import fnmatch
from functools import wraps
from threading import Lock
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Internal TTL store
# ---------------------------------------------------------------------------

class _Entry:
    """A cached value with an expiry timestamp."""
    __slots__ = ("value", "expires_at")

    def __init__(self, value: Any, ttl: int):
        self.value = value
        self.expires_at = time.monotonic() + ttl


class _TTLStore:
    """Thread-safe dict with per-key TTL."""

    _REAP_EVERY = 100  # run a full sweep every N writes

    def __init__(self) -> None:
        self._data: Dict[str, _Entry] = {}
        self._lock = Lock()
        self._write_count = 0

    # -- helpers --

    def _is_alive(self, entry: _Entry) -> bool:
        return entry.expires_at > time.monotonic()

    def _maybe_reap(self) -> None:
        self._write_count += 1
        if self._write_count >= self._REAP_EVERY:
            self._write_count = 0
            now = time.monotonic()
            stale = [k for k, e in self._data.items() if e.expires_at <= now]
            for k in stale:
                del self._data[k]

    # -- public API --

    def get(self, key: str) -> Any:
        with self._lock:
            entry = self._data.get(key)
            if entry is None or not self._is_alive(entry):
                self._data.pop(key, None)
                return None
            return entry.value

    def set(self, key: str, value: Any, ttl: int = 3600) -> None:
        with self._lock:
            self._data[key] = _Entry(value, ttl)
            self._maybe_reap()

    def delete(self, key: str) -> bool:
        with self._lock:
            return self._data.pop(key, None) is not None

    def exists(self, key: str) -> bool:
        with self._lock:
            entry = self._data.get(key)
            if entry and self._is_alive(entry):
                return True
            self._data.pop(key, None)
            return False

    def keys_matching(self, pattern: str) -> List[str]:
        """Return keys matching a glob pattern (e.g. ``equipment:*``)."""
        with self._lock:
            now = time.monotonic()
            return [
                k for k, e in self._data.items()
                if e.expires_at > now and fnmatch(k, pattern)
            ]

    def ttl(self, key: str) -> int:
        with self._lock:
            entry = self._data.get(key)
            if entry is None or not self._is_alive(entry):
                return -2  # key does not exist
            return max(0, int(entry.expires_at - time.monotonic()))

    def expire(self, key: str, seconds: int) -> bool:
        with self._lock:
            entry = self._data.get(key)
            if entry is None or not self._is_alive(entry):
                return False
            entry.expires_at = time.monotonic() + seconds
            return True

    def incrby(self, key: str, amount: int = 1, ttl: Optional[int] = None) -> int:
        with self._lock:
            entry = self._data.get(key)
            if entry is None or not self._is_alive(entry):
                self._data[key] = _Entry(amount, ttl or 3600)
                self._maybe_reap()
                return amount
            entry.value = int(entry.value) + amount
            if ttl is not None:
                entry.expires_at = time.monotonic() + ttl
            return entry.value

    def decrby(self, key: str, amount: int = 1) -> int:
        return self.incrby(key, -amount)

    def mget(self, keys: List[str]) -> Dict[str, Any]:
        result: Dict[str, Any] = {}
        with self._lock:
            for k in keys:
                entry = self._data.get(k)
                if entry and self._is_alive(entry):
                    result[k] = entry.value
        return result

    def clear(self) -> None:
        with self._lock:
            self._data.clear()


# Single global store
_store = _TTLStore()


# ---------------------------------------------------------------------------
# CacheService  (keeps the same public API as the old Redis version)
# ---------------------------------------------------------------------------

def _json_default(obj: Any) -> Any:
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    return str(obj)


class CacheService:
    def __init__(self) -> None:
        self.is_connected = True  # always "connected" — it's in-memory

    async def connect(self) -> None:
        """No-op — in-memory cache is always ready."""
        logger.info("In-memory cache service ready")

    async def disconnect(self) -> None:
        """No-op."""
        pass

    # ===== Basic Operations =====
    async def get(self, key: str) -> Optional[Any]:
        return _store.get(key)

    async def set(self, key: str, value: Any, expire: int = 3600) -> bool:
        try:
            stored = (
                json.dumps(value, default=_json_default)
                if isinstance(value, (dict, list))
                else value
            )
            _store.set(key, stored, expire)
            return True
        except Exception as e:
            logger.warning("Cache set error for key %s: %s", key, e)
            return False

    async def delete(self, key: str) -> bool:
        return _store.delete(key)

    async def exists(self, key: str) -> bool:
        return _store.exists(key)

    # ===== Batch Operations =====
    async def mget(self, keys: List[str]) -> dict:
        if not keys:
            return {}
        return _store.mget(keys)

    async def mset(self, data: dict, expire: int = 3600) -> bool:
        if not data:
            return False
        try:
            for key, value in data.items():
                stored = (
                    json.dumps(value, default=_json_default)
                    if isinstance(value, (dict, list))
                    else value
                )
                _store.set(key, stored, expire)
            return True
        except Exception as e:
            logger.warning("Cache mset error: %s", e)
            return False

    async def delete_pattern(self, pattern: str) -> int:
        keys = _store.keys_matching(pattern)
        count = 0
        for k in keys:
            if _store.delete(k):
                count += 1
        return count

    # ===== TTL & Expiry =====
    async def get_ttl(self, key: str) -> int:
        return _store.ttl(key)

    async def expire(self, key: str, seconds: int) -> bool:
        return _store.expire(key, seconds)

    # ===== Counter Operations (for rate limiting) =====
    async def increment(self, key: str, amount: int = 1, expire: Optional[int] = None) -> int:
        return _store.incrby(key, amount, expire)

    async def decrement(self, key: str, amount: int = 1) -> int:
        return _store.decrby(key, amount)

    # ===== Session Management =====
    async def create_session(self, session_id: str, user_data: dict, expire: int = 86400) -> bool:
        return await self.set(f"session:{session_id}", user_data, expire)

    async def get_session(self, session_id: str) -> Optional[dict]:
        return await self.get(f"session:{session_id}")

    async def update_session(self, session_id: str, user_data: dict, expire: int = 86400) -> bool:
        return await self.set(f"session:{session_id}", user_data, expire)

    async def delete_session(self, session_id: str) -> bool:
        return await self.delete(f"session:{session_id}")

    # ===== Token Caching =====
    async def cache_token(self, user_id: str, token: str, expire: int = 3600) -> bool:
        return await self.set(f"token:{user_id}", {"token": token, "created_at": time.time()}, expire)

    async def get_cached_token(self, user_id: str) -> Optional[str]:
        data = await self.get(f"token:{user_id}")
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except Exception:
                return data
        return data.get("token") if isinstance(data, dict) else None

    async def invalidate_token(self, user_id: str) -> bool:
        return await self.delete(f"token:{user_id}")

    async def invalidate_all_user_tokens(self, user_id: str) -> int:
        return await self.delete_pattern(f"token:{user_id}:*")

    # ===== Equipment Caching =====
    async def cache_equipment(self, equipment_id: str, data: dict, expire: int = 3600) -> bool:
        return await self.set(f"equipment:{equipment_id}", data, expire)

    async def get_cached_equipment(self, equipment_id: str) -> Optional[dict]:
        return await self.get(f"equipment:{equipment_id}")

    async def invalidate_equipment(self, equipment_id: str) -> bool:
        return await self.delete(f"equipment:{equipment_id}")

    async def invalidate_equipment_list(self) -> int:
        return await self.delete_pattern("equipment:list:*")

    # ===== Rate Limiting =====
    async def check_rate_limit(self, key: str, limit: int, window: int) -> Tuple[bool, int]:
        """Check if rate limit is exceeded. Returns (is_allowed, remaining_requests)."""
        current = _store.incrby(key, 1, window)
        remaining = max(0, limit - current)
        return current <= limit, remaining

    async def get_rate_limit_info(self, key: str, limit: int) -> dict:
        raw = _store.get(key)
        current_num = int(raw) if raw is not None else 0
        ttl_val = _store.ttl(key)
        return {
            "current": current_num,
            "limit": limit,
            "remaining": max(0, limit - current_num),
            "reset_in": max(0, ttl_val),
            "exceeded": current_num > limit,
        }

    # ===== Health Check =====
    async def health_check(self) -> bool:
        return True


# Global singleton
cache_service = CacheService()


async def get_cache_service() -> CacheService:
    return cache_service


# ===== Decorator for caching function results =====
def cache_result(expire: int = 3600, key_prefix: str = None):
    """Decorator to cache async function results."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key_parts = [key_prefix or func.__name__]
            cache_key_parts.extend(
                str(arg) for arg in args if isinstance(arg, (str, int, float))
            )
            cache_key_parts.extend(
                f"{k}={v}" for k, v in kwargs.items() if isinstance(v, (str, int, float))
            )
            cache_key = ":".join(cache_key_parts)

            cached = await cache_service.get(cache_key)
            if cached is not None:
                logger.debug("Cache hit for %s", cache_key)
                return cached

            result = await func(*args, **kwargs)
            if result is not None:
                await cache_service.set(cache_key, result, expire)
            return result
        return wrapper
    return decorator
