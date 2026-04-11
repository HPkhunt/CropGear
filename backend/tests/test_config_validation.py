import pytest
from pydantic import ValidationError

from app.config import Settings


def test_production_rejects_mock_database_mode():
    with pytest.raises(ValidationError):
        Settings(
            ENVIRONMENT="production",
            USE_MOCK_DB=True,
            SECRET_KEY="x" * 32,
        )
