import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, Request, WebSocket
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.router import api_v1_router
from app.config import settings
from app.core.exceptions import APIException
from app.db.client import close_db, connect_db, get_db
from app.middleware.error_handler import (
    global_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from app.middleware.request_context import RequestContextMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.services.cache_service import cache_service
from app.services.notification_service import NotificationManager


def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


setup_logging()
logger = logging.getLogger(__name__)
BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
PROJECT_ROOT = BASE_DIR.parent  # cropgear/
FRONTEND_DIST_DIR = PROJECT_ROOT / "frontend" / "dist"
UPLOADS_DIR = BASE_DIR / "app" / "uploads"


class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code == 404:
                return await super().get_response("index.html", scope)
            raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting CropGear application...")
    await connect_db()
    await cache_service.connect()
    # Initialize notification manager
    app.state.notification_manager = NotificationManager()
    yield
    logger.info("Shutting down CropGear application...")
    await close_db()
    await cache_service.disconnect()


app = FastAPI(
    title="CropGear API",
    description="Smart Equipment Rental System API",
    version="1.0.0",
    lifespan=lifespan,
)

trusted_hosts = list(settings.ALLOWED_HOSTS or [])
if settings.DEBUG and "*" not in trusted_hosts:
    trusted_hosts.append("*")
if not trusted_hosts:
    trusted_hosts = ["*"]
app.add_middleware(TrustedHostMiddleware, allowed_hosts=trusted_hosts)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=settings.ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600,
)
app.add_middleware(RequestContextMiddleware)

app.include_router(api_v1_router, prefix="/api/v1")

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)


@app.exception_handler(APIException)
async def api_exception_handler(request: Request, exc: APIException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "request_id": getattr(request.state, "request_id", None),
        },
    )


@app.get("/health")
async def health_check():
    db_connected = get_db() is not None
    cache_connected = cache_service.is_connected
    status = "healthy" if db_connected else "degraded"
    return {
        "status": status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "components": {
            "mongo": "connected" if db_connected else "unavailable",
            "cache": "connected" if cache_connected else "unavailable",
            "demo_seed": bool(settings.ENABLE_DEMO_SEED),
        },
    }


@app.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket):
    import asyncio

    from starlette.websockets import WebSocketDisconnect

    from app.core.security import verify_token

    # Require authentication via ?token= query parameter
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008, reason="Missing authentication token")
        return
    payload = verify_token(token, expected_type="access")
    if not payload:
        await websocket.close(code=1008, reason="Invalid or expired token")
        return

    notification_manager = websocket.app.state.notification_manager
    await notification_manager.connect(websocket)
    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
                await websocket.send_text(f"Echo: {data}")
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        logger.info("WebSocket gracefully disconnected")
    except Exception as e:
        logger.warning(f"WebSocket error: {e}")
    finally:
        await notification_manager.disconnect(websocket)


UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

if FRONTEND_DIST_DIR.exists():
    app.mount("/", SPAStaticFiles(directory=str(FRONTEND_DIST_DIR), html=True), name="web")
else:

    @app.get("/")
    async def root():
        return {
            "status": "ok",
            "message": "Frontend not built. Run `npm install` and `npm run build` inside frontend/.",
        }


# --- port conflict helpers -------------------------------------------------


def _bind_available_socket(starting_port: int, host: str = "0.0.0.0"):
    """Bind and return the first available socket at or above *starting_port*."""

    import socket

    family = socket.AF_INET6 if host and ":" in host else socket.AF_INET
    port = starting_port
    while port <= 65535:
        sock = socket.socket(family, socket.SOCK_STREAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((host, port))
            sock.set_inheritable(True)
            if port != starting_port:
                logger.warning("port %d was in use, switching to %d", starting_port, port)
            return sock, port
        except OSError:
            sock.close()
            port += 1
    raise RuntimeError("no available ports found")


if __name__ == "__main__":
    import uvicorn
    from uvicorn.main import STARTUP_FAILURE
    from uvicorn.supervisors import ChangeReload, Multiprocess

    # Bind the socket up front and pass it to Uvicorn so another process
    # cannot claim the port between probing and startup.
    bound_socket, chosen_port = _bind_available_socket(settings.PORT, settings.HOST)
    config = uvicorn.Config(
        "app.main:app",
        host=settings.HOST,
        port=chosen_port,
        reload=settings.DEBUG,
        log_level="info",
        ws="wsproto",
    )
    server = uvicorn.Server(config)

    if config.should_reload:
        ChangeReload(config, target=server.run, sockets=[bound_socket]).run()
    elif config.workers > 1:
        Multiprocess(config, target=server.run, sockets=[bound_socket]).run()
    else:
        server.run(sockets=[bound_socket])

    if not server.started and not config.should_reload and config.workers == 1:
        raise SystemExit(STARTUP_FAILURE)
