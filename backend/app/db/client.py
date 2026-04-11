import logging
from typing import Optional

import certifi
from fastapi import status
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings
from app.core.exceptions import APIException
from app.db.seed import seed_demo_data

logger = logging.getLogger(__name__)


class MongoDBClient:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None


mongodb_client = MongoDBClient()


async def ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("phone_digits", unique=True, sparse=True)
        await db.users.create_index([("role", 1), ("approval_status", 1)])
        await db.equipment.create_index([("category", 1), ("daily_rate", 1)])
        await db.equipment.create_index([("owner_id", 1), ("created_at", -1)])
        await db.equipment.create_index([("location_coords", "2dsphere")])
        await db.bookings.create_index([("owner_id", 1), ("booking_status", 1)])
        await db.bookings.create_index([("renter_id", 1), ("created_at", -1)])
        await db.reviews.create_index([("equipment_id", 1), ("status", 1), ("created_at", -1)])
        await db.reviews.create_index([("recipient_id", 1), ("status", 1), ("created_at", -1)])
        await db.reviews.create_index(
            [("booking_id", 1), ("reviewer_id", 1), ("review_type", 1)], unique=True
        )
        await db.reviews.create_index([("status", 1), ("created_at", -1)])
        await db.reviews.create_index([("dispute.status", 1), ("created_at", -1)])
        await db.media_assets.create_index("s3_key", unique=True)
        await db.media_assets.create_index([("owner_id", 1), ("created_at", -1)])
        await db.media_assets.create_index([("purpose", 1), ("created_at", -1)])
        await db.media_assets.create_index([("status", 1), ("created_at", -1)])
        await db.newsletters.create_index("email", unique=True)
        await db.registration_otps.create_index("email", unique=True)
        await db.registration_otps.create_index("expires_at", expireAfterSeconds=0)
        await db.password_reset_tokens.create_index("token_hash", unique=True)
        await db.password_reset_tokens.create_index("user_id")
        await db.password_reset_tokens.create_index("email")
        await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
        await db.auth_sessions.create_index("session_id", unique=True)
        await db.auth_sessions.create_index("user_id")
        await db.auth_sessions.create_index("expires_at", expireAfterSeconds=0)
        await db.revoked_tokens.create_index("token_hash", unique=True)
        await db.revoked_tokens.create_index("expires_at", expireAfterSeconds=0)
        await db.testimonials.create_index([("created_at", -1)])
        logger.info("MongoDB indexes ensured.")
    except Exception as exc:
        logger.warning("MongoDB index creation failed: %s", exc)


async def connect_db():
    # Add tls settings depending on protocol or use defaults that don't break Atlas connections on Windows
    kwargs = {
        "serverSelectionTimeoutMS": 5000,
    }

    # Only use certifi if explicitly needed, or we can use tlsAllowInvalidCertificates=True to bypass the issue.
    # The error TLSV1_ALERT_INTERNAL_ERROR often happens when certs are misconfigured or with certifi on some Windows setups.
    if settings.MONGODB_URL.startswith("mongodb+srv://"):
        kwargs["tls"] = True
        kwargs["tlsCAFile"] = certifi.where()
    elif "tls=true" in settings.MONGODB_URL.lower():
        kwargs["tlsCAFile"] = certifi.where()

    if settings.USE_MOCK_DB:
        try:
            from mongomock_motor import AsyncMongoMockClient
        except ImportError as exc:
            raise RuntimeError(
                "USE_MOCK_DB=True requires mongomock_motor to be installed."
            ) from exc
        mongodb_client.client = AsyncMongoMockClient()
        mongodb_client.db = mongodb_client.client[settings.DATABASE_NAME]
        logger.warning("Using in-memory mock MongoDB because USE_MOCK_DB=True.")
        logger.info("Connected to MongoDB")
        await ensure_indexes(mongodb_client.db)
        await seed_demo_data(mongodb_client.db)
    else:
        mongodb_client.client = AsyncIOMotorClient(settings.MONGODB_URL, **kwargs)
        try:
            await mongodb_client.client.admin.command("ping")
            mongodb_client.db = mongodb_client.client[settings.DATABASE_NAME]
            logger.info("Connected to MongoDB")
            await ensure_indexes(mongodb_client.db)
            await seed_demo_data(mongodb_client.db)
        except Exception as exc:
            mongodb_client.db = None
            logger.warning(
                "MongoDB unavailable; API requests will be rejected until connectivity is restored: %s",
                exc,
            )


async def close_db():
    if mongodb_client.client:
        mongodb_client.client.close()
        logger.info("Closed MongoDB connection")


def get_db():
    return mongodb_client.db


def get_required_db():
    db = get_db()
    if db is None:
        raise APIException("Database unavailable", status.HTTP_503_SERVICE_UNAVAILABLE)
    return db
