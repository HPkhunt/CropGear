from typing import Dict
from datetime import datetime, timedelta
import logging

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.services.cache_service import cache_service

logger = logging.getLogger(__name__)


class RateLimiter:
    SWEEP_INTERVAL = 100  # evict stale clients every N checks

    def __init__(self, requests: int = 100, window: int = 3600):
        self.requests = requests
        self.window = window
        # Fallback in-memory storage if cache service is unavailable
        self.client_requests: Dict[str, list] = {}
        self._check_count = 0

    def _sweep_stale_clients(self) -> None:
        """Remove clients whose timestamps have all expired."""
        now = datetime.utcnow()
        cutoff = timedelta(seconds=self.window)
        stale_keys = [
            cid for cid, timestamps in self.client_requests.items()
            if not timestamps or (now - timestamps[-1]) >= cutoff
        ]
        for key in stale_keys:
            del self.client_requests[key]

    async def check_rate_limit(self, client_id: str) -> tuple[bool, int]:
        """
        Check if client has exceeded rate limit.
        Returns (is_allowed, remaining_requests)
        """
        # Try cache service first
        if cache_service.is_connected:
            rate_key = f"rate_limit:{client_id}"
            is_allowed, remaining = await cache_service.check_rate_limit(rate_key, self.requests, self.window)
            return is_allowed, remaining
        
        # Fallback to in-memory storage
        now = datetime.utcnow()
        self.client_requests.setdefault(client_id, [])
        self.client_requests[client_id] = [
            t for t in self.client_requests[client_id] if now - t < timedelta(seconds=self.window)
        ]
        
        if len(self.client_requests[client_id]) >= self.requests:
            return False, 0
        
        self.client_requests[client_id].append(now)
        remaining = max(0, self.requests - len(self.client_requests[client_id]))

        # Periodic sweep to evict fully-expired one-shot clients
        self._check_count += 1
        if self._check_count >= self.SWEEP_INTERVAL:
            self._check_count = 0
            self._sweep_stale_clients()

        return True, remaining


def _client_id_from_request(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.rate_limiter = RateLimiter(
            requests=settings.RATE_LIMIT_REQUESTS,
            window=settings.RATE_LIMIT_WINDOW,
        )

    async def dispatch(self, request: Request, call_next):
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)
        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        client_id = _client_id_from_request(request)
        allowed, remaining = await self.rate_limiter.check_rate_limit(client_id)
        
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "retry_after_seconds": settings.RATE_LIMIT_WINDOW,
                    "remaining_requests": remaining,
                },
                headers={
                    "X-RateLimit-Limit": str(self.rate_limiter.requests),
                    "X-RateLimit-Remaining": str(remaining),
                    "X-RateLimit-Reset": str(settings.RATE_LIMIT_WINDOW),
                }
            )
        
        # Add rate limit info to response headers
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.rate_limiter.requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(settings.RATE_LIMIT_WINDOW)
        return response
