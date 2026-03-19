from datetime import datetime, timezone
import logging

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def _base_payload(request: Request, error: str, status_code: int, extra: dict | None = None) -> dict:
    payload = {
        "error": error,
        "status_code": status_code,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    request_id = _request_id(request)
    if request_id:
        payload["request_id"] = request_id
    if extra:
        payload.update(extra)
    return payload


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed."
    return JSONResponse(
        status_code=exc.status_code,
        content=_base_payload(request, detail, exc.status_code),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_base_payload(
            request,
            "Validation error.",
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            extra={"errors": exc.errors()},
        ),
    )


async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content=_base_payload(request, "Internal Server Error", 500),
    )
