from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from app.api.v1.endpoints.auth import (
    PasswordResetConfirm,
    RegisterRequest,
    _hash_reset_token,
    confirm_password_reset,
    register,
)
from app.core.exceptions import APIException
from app.core.password_policy import PASSWORD_POLICY_MESSAGE
from app.core.security import hash_password, verify_password


@pytest.mark.asyncio
async def test_register_rejects_weak_password(db):
    payload = RegisterRequest(
        email="weak@example.com",
        full_name="Weak User",
        phone_number="",
        role="farmer",
        password="weakpw1!",
    )

    with pytest.raises(APIException) as exc_info:
        await register(payload, db=db)

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == PASSWORD_POLICY_MESSAGE


@pytest.mark.asyncio
async def test_register_hashes_strong_password_and_sets_pending_flags(db):
    payload = RegisterRequest(
        email="strong@example.com",
        full_name="Strong User",
        phone_number="+1-555-010-1010",
        role="farmer",
        password="Strong@123",
    )

    response = await register(payload, db=db)
    created_user = await db.users.find_one({"email": "strong@example.com"})

    assert response["user"]["email"] == "strong@example.com"
    assert response["user"]["approval_status"] == "pending"
    assert response["user"]["is_active"] is False
    assert response["user"]["is_verified"] is False
    assert created_user is not None
    assert created_user["phone_digits"] == "15550101010"
    assert verify_password("Strong@123", created_user["hashed_password"])


@pytest.mark.asyncio
async def test_password_reset_rejects_weak_password_before_updating_user(db):
    user_id = "user-1"
    await db.users.insert_one(
        {
            "_id": user_id,
            "email": "reset@example.com",
            "full_name": "Reset User",
            "role": "farmer",
            "hashed_password": hash_password("Original@123"),
            "is_active": True,
            "is_verified": True,
            "approval_status": "approved",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
    )
    token = "x" * 24
    await db.password_reset_tokens.insert_one(
        {
            "user_id": user_id,
            "email": "reset@example.com",
            "token_hash": _hash_reset_token(token),
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=30),
            "created_at": datetime.now(timezone.utc),
        }
    )

    with pytest.raises(APIException) as exc_info:
        await confirm_password_reset(
            PasswordResetConfirm(token=token, new_password="short1!"),
            request=SimpleNamespace(headers={}, client=SimpleNamespace(host="127.0.0.1")),
            db=db,
        )

    reloaded_user = await db.users.find_one({"_id": user_id})
    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == PASSWORD_POLICY_MESSAGE
    assert verify_password("Original@123", reloaded_user["hashed_password"])


@pytest.mark.asyncio
async def test_password_reset_updates_password_for_strong_password(db):
    user_id = "user-2"
    await db.users.insert_one(
        {
            "_id": user_id,
            "email": "reset2@example.com",
            "full_name": "Reset User",
            "role": "farmer",
            "hashed_password": hash_password("Original@123"),
            "is_active": True,
            "is_verified": True,
            "approval_status": "approved",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
    )
    token = "y" * 24
    await db.password_reset_tokens.insert_one(
        {
            "user_id": user_id,
            "email": "reset2@example.com",
            "token_hash": _hash_reset_token(token),
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=30),
            "created_at": datetime.now(timezone.utc),
        }
    )

    response = await confirm_password_reset(
        PasswordResetConfirm(token=token, new_password="Updated@123"),
        request=SimpleNamespace(headers={}, client=SimpleNamespace(host="127.0.0.1")),
        db=db,
    )

    reloaded_user = await db.users.find_one({"_id": user_id})
    token_count = await db.password_reset_tokens.count_documents({"user_id": user_id})
    assert response["message"] == "Password reset successful."
    assert verify_password("Updated@123", reloaded_user["hashed_password"])
    assert token_count == 0
