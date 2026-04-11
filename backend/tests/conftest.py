import sys
from pathlib import Path

import pytest
from mongomock_motor import AsyncMongoMockClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.config import settings
from app.services.cache_service import _store


@pytest.fixture(autouse=True)
def reset_cache_and_email_flags(monkeypatch):
    with _store._lock:
        _store._data.clear()
        _store._write_count = 0

    monkeypatch.setattr(settings, "ENABLE_ADMIN_APPROVAL_EMAIL", False)
    monkeypatch.setattr(settings, "ENABLE_BOOKING_CONFIRMATION_EMAIL", False)
    monkeypatch.setattr(settings, "ENABLE_BOOKING_REQUEST_EMAIL", False)
    monkeypatch.setattr(settings, "ENABLE_BOOKING_STATUS_EMAIL", False)
    monkeypatch.setattr(settings, "ENABLE_PASSWORD_RESET_EMAIL", False)
    yield
    with _store._lock:
        _store._data.clear()
        _store._write_count = 0


@pytest.fixture
def db():
    client = AsyncMongoMockClient()
    return client["cropgear_test"]
