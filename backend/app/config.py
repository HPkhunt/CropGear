import json
from typing import Any, List

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _parse_env_list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        trimmed = value.strip()
        if not trimmed:
            return []
        if trimmed.startswith("["):
            try:
                parsed = json.loads(trimmed)
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed if str(item).strip()]
            except json.JSONDecodeError:
                pass
        return [item.strip() for item in trimmed.split(",") if item.strip()]
    return [str(item).strip() for item in list(value) if str(item).strip()]


def _parse_env_bool(value: Any) -> Any:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "1", "yes", "y", "on", "debug"}:
            return True
        if lowered in {"false", "0", "no", "n", "off", "release", "prod", "production"}:
            return False
    return value


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    STRICT_SECRET_VALIDATION: bool = False
    APP_NAME: str = "CropGear"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "cropgear_db"
    USE_MOCK_DB: bool = False

    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    @model_validator(mode="after")
    def _validate_secret_key(self) -> "Settings":
        import logging as _log

        secret = str(self.SECRET_KEY or "").strip()
        env = str(self.ENVIRONMENT or "development").lower()
        debug = bool(self.DEBUG)
        strict = bool(self.STRICT_SECRET_VALIDATION)
        is_dev = env in {"development", "dev", "local", "test"}
        enforce = (env in {"production", "prod"} or strict) and not debug

        placeholder_values = {
            "change-me",
            "your-super-secret-key-change-this-in-production-use-openssl-rand-hex-32",
        }

        if env in {"production", "prod"} and self.USE_MOCK_DB:
            raise ValueError("USE_MOCK_DB must be False in production environments.")

        if secret in placeholder_values or len(secret) < 32:
            if enforce:
                raise ValueError(
                    "SECRET_KEY must be a strong, unique value (at least 32 characters) "
                    "when running in production. Set SECRET_KEY in your .env file."
                )
            if is_dev:
                _log.getLogger("app.config").warning(
                    "WARNING: SECRET_KEY is set to a weak/default value. "
                    "This is acceptable for local development ONLY. "
                    "Set a strong, random SECRET_KEY before deploying."
                )
        return self

    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ]
    ALLOWED_ORIGIN_REGEX: str = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
    ALLOWED_HOSTS: List[str] = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "testserver"]

    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    EMAIL_USER: str = ""
    EMAIL_PASSWORD: str = ""
    EMAIL_FROM: str = ""
    ENABLE_EMAIL_VERIFICATION: bool = True
    ENABLE_BOOKING_CONFIRMATION_EMAIL: bool = True
    ENABLE_BOOKING_REQUEST_EMAIL: bool = True
    ENABLE_BOOKING_STATUS_EMAIL: bool = True
    ENABLE_PAYMENT_RECEIPT_EMAIL: bool = True
    ENABLE_NEWSLETTER_WELCOME_EMAIL: bool = True
    ENABLE_ADMIN_APPROVAL_EMAIL: bool = True
    ENABLE_OWNER_VERIFICATION_EMAIL: bool = True
    ENABLE_PASSWORD_RESET_EMAIL: bool = True
    PASSWORD_RESET_TOKEN_TTL_MINUTES: int = 30
    FRONTEND_BASE_URL: str = "http://localhost:5173"

    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = "cropgear-images"

    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = ""
    CELERY_RESULT_BACKEND: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_ENABLED: bool = False

    GOOGLE_MAPS_API_KEY: str = ""
    ENABLE_LOCATION_SEARCH: bool = True

    ENABLE_DEMO_SEED: bool = True

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="allow")

    @field_validator(
        "DEBUG",
        "STRICT_SECRET_VALIDATION",
        "USE_MOCK_DB",
        "ENABLE_DEMO_SEED",
        "ENABLE_EMAIL_VERIFICATION",
        "ENABLE_BOOKING_CONFIRMATION_EMAIL",
        "ENABLE_BOOKING_REQUEST_EMAIL",
        "ENABLE_BOOKING_STATUS_EMAIL",
        "ENABLE_PAYMENT_RECEIPT_EMAIL",
        "ENABLE_NEWSLETTER_WELCOME_EMAIL",
        "ENABLE_ADMIN_APPROVAL_EMAIL",
        "ENABLE_OWNER_VERIFICATION_EMAIL",
        "ENABLE_PASSWORD_RESET_EMAIL",
        mode="before",
    )
    @classmethod
    def _normalize_bools(cls, value: Any) -> Any:
        return _parse_env_bool(value)

    @field_validator("ALLOWED_ORIGINS", "ALLOWED_HOSTS", mode="before")
    @classmethod
    def _normalize_lists(cls, value: Any) -> List[str]:
        return _parse_env_list(value)


settings = Settings()
