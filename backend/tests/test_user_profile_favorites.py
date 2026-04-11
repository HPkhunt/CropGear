import pytest

from app.api.v1.endpoints.users import (
    ChangePasswordRequest,
    FavoriteSyncRequest,
    FavoriteToggleRequest,
    KYCProfileRequest,
    get_my_kyc,
    UserProfileUpdateRequest,
    change_my_password,
    replace_my_favorites,
    toggle_my_favorite,
    update_my_kyc,
    update_me,
)
from app.api.v1.endpoints.admin import KYCDecisionRequest, decide_user_kyc
from app.core.security import hash_password, verify_password


@pytest.mark.asyncio
async def test_user_can_update_profile_and_change_password(db):
    await db.users.insert_one(
        {
            "_id": "user-1",
            "full_name": "Farmer One",
            "email": "farmer@example.com",
            "phone_number": "+1 555 000 1111",
            "phone_digits": "15550001111",
            "hashed_password": hash_password("StrongPass1!"),
            "role": "farmer",
            "approval_status": "approved",
            "is_active": True,
            "is_verified": True,
        }
    )

    updated = await update_me(
        payload=UserProfileUpdateRequest(
            full_name="Farmer Updated",
            email="updated@example.com",
            phone_number="+1 555 222 3333",
            avatar_url="https://example.com/avatar.png",
        ),
        current_user={"sub": "user-1", "role": "farmer"},
        db=db,
    )
    password_result = await change_my_password(
        payload=ChangePasswordRequest(
            current_password="StrongPass1!",
            new_password="BetterPass2@",
        ),
        current_user={"sub": "user-1", "role": "farmer"},
        db=db,
    )
    stored = await db.users.find_one({"_id": "user-1"})

    assert updated["full_name"] == "Farmer Updated"
    assert updated["email"] == "updated@example.com"
    assert updated["avatar_url"] == "https://example.com/avatar.png"
    assert stored["phone_digits"] == "15552223333"
    assert password_result["ok"] is True
    assert verify_password("BetterPass2@", stored["hashed_password"])


@pytest.mark.asyncio
async def test_favorite_sync_and_toggle_persist_ids(db):
    await db.users.insert_one(
        {
            "_id": "user-2",
            "full_name": "Farmer Two",
            "email": "farmer2@example.com",
            "hashed_password": hash_password("StrongPass1!"),
            "role": "farmer",
            "approval_status": "approved",
            "is_active": True,
            "is_verified": True,
            "favorite_equipment_ids": [],
        }
    )

    replaced = await replace_my_favorites(
        payload=FavoriteSyncRequest(equipment_ids=["eq-1", "eq-2", "eq-1"]),
        current_user={"sub": "user-2", "role": "farmer"},
        db=db,
    )
    toggled_off = await toggle_my_favorite(
        equipment_id="eq-1",
        payload=FavoriteToggleRequest(active=False),
        current_user={"sub": "user-2", "role": "farmer"},
        db=db,
    )
    toggled_on = await toggle_my_favorite(
        equipment_id="eq-3",
        payload=FavoriteToggleRequest(active=True),
        current_user={"sub": "user-2", "role": "farmer"},
        db=db,
    )
    stored = await db.users.find_one({"_id": "user-2"})

    assert replaced["equipment_ids"] == ["eq-1", "eq-2"]
    assert toggled_off["equipment_ids"] == ["eq-2"]
    assert toggled_on["equipment_ids"] == ["eq-2", "eq-3"]
    assert stored["favorite_equipment_ids"] == ["eq-2", "eq-3"]


@pytest.mark.asyncio
async def test_owner_can_submit_kyc_and_admin_can_review(db):
    await db.users.insert_one(
        {
            "_id": "owner-1",
            "full_name": "Owner One",
            "email": "owner@example.com",
            "hashed_password": hash_password("StrongPass1!"),
            "role": "equipment_owner",
            "approval_status": "approved",
            "is_active": True,
            "is_verified": True,
            "kyc_status": "not_started",
        }
    )

    submitted = await update_my_kyc(
        payload=KYCProfileRequest(
            business_name="Owner Operations",
            business_type="Equipment rental",
            operating_region="Iowa",
            government_id_last4="1234",
            tax_id_reference="EIN-22-4444",
            contact_address="123 Market Street, Des Moines, IA",
            document_urls=["https://example.com/doc-1.pdf"],
        ),
        current_user={"sub": "owner-1", "role": "equipment_owner"},
        db=db,
    )
    reviewed = await decide_user_kyc(
        user_id="owner-1",
        payload=KYCDecisionRequest(decision="approved", notes="All owner documents verified."),
        current_user={"sub": "admin-1", "role": "admin"},
        db=db,
    )
    current = await get_my_kyc(
        current_user={"sub": "owner-1", "role": "equipment_owner"},
        db=db,
    )

    assert submitted["status"] == "pending"
    assert current["profile"]["business_name"] == "Owner Operations"
    assert reviewed["user"]["kyc_status"] == "approved"
    assert reviewed["user"]["kyc_review_notes"] == "All owner documents verified."
