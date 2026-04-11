from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.password_policy import validate_password_strength
from app.core.security import hash_password, verify_password

from app.core.exceptions import APIException
from app.db.client import get_required_db
from app.db.repositories.user_repo import UserRepository
from app.dependencies import get_current_admin, get_current_user

router = APIRouter()


def _phone_digits(value: str) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


class UserProfileUpdateRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone_number: str = Field(default="", max_length=40)
    avatar_url: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("phone_number", mode="before")
    @classmethod
    def _clean_phone_number(cls, value: Optional[str]) -> str:
        return str(value or "").strip()

    @field_validator("avatar_url", mode="before")
    @classmethod
    def _clean_avatar_url(cls, value: Optional[str]) -> Optional[str]:
        cleaned = str(value or "").strip()
        return cleaned or None


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=72)
    new_password: str = Field(max_length=72)


class FavoriteSyncRequest(BaseModel):
    equipment_ids: List[str] = Field(default_factory=list)

    @field_validator("equipment_ids", mode="before")
    @classmethod
    def _clean_equipment_ids(cls, value):
        if not isinstance(value, list):
            return []
        cleaned = []
        seen = set()
        for item in value:
            candidate = str(item or "").strip()
            if not candidate or candidate in seen:
                continue
            seen.add(candidate)
            cleaned.append(candidate)
        return cleaned[:100]


class FavoriteToggleRequest(BaseModel):
    active: bool


class KYCProfileRequest(BaseModel):
    business_name: str = Field(min_length=2, max_length=120)
    business_type: str = Field(min_length=2, max_length=80)
    operating_region: str = Field(min_length=2, max_length=120)
    government_id_last4: str = Field(pattern=r"^\d{4}$")
    tax_id_reference: str = Field(default="", max_length=40)
    contact_address: str = Field(min_length=8, max_length=240)
    document_urls: List[str] = Field(default_factory=list)

    @field_validator("tax_id_reference", mode="before")
    @classmethod
    def _clean_tax_id_reference(cls, value: Optional[str]) -> str:
        return str(value or "").strip()

    @field_validator("document_urls", mode="before")
    @classmethod
    def _clean_document_urls(cls, value):
        if not isinstance(value, list):
            return []
        cleaned = []
        for item in value:
            candidate = str(item or "").strip()
            if candidate:
                cleaned.append(candidate[:2000])
        return cleaned[:5]


@router.get("/")
async def list_users(current_user: dict = Depends(get_current_admin), db=Depends(get_required_db)):
    repo = UserRepository(db)
    return {"users": await repo.list_users()}


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user), db=Depends(get_required_db)):
    user_id = current_user.get("sub")
    if not user_id:
        raise APIException("Invalid token payload", status.HTTP_401_UNAUTHORIZED)
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id, public=True)
    if not user:
        raise APIException("User not found", status.HTTP_404_NOT_FOUND)
    return user


@router.put("/me")
async def update_me(
    payload: UserProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    user_id = current_user.get("sub")
    if not user_id:
        raise APIException("Invalid token payload", status.HTTP_401_UNAUTHORIZED)

    repo = UserRepository(db)
    existing_user = await repo.get_by_id(user_id, public=False)
    if not existing_user:
        raise APIException("User not found", status.HTTP_404_NOT_FOUND)

    email_owner = await repo.get_by_email(payload.email, public=False)
    if email_owner and email_owner.get("id") != user_id:
        raise APIException("Email address is already in use.", status.HTTP_409_CONFLICT)

    next_phone_digits = _phone_digits(payload.phone_number)
    if next_phone_digits:
        phone_owner = await repo.get_by_phone_digits(next_phone_digits, public=False)
        if phone_owner and phone_owner.get("id") != user_id:
            raise APIException("Phone number is already in use.", status.HTTP_409_CONFLICT)

    await repo.update(
        user_id,
        {
            "full_name": payload.full_name,
            "email": str(payload.email).strip().lower(),
            "phone_number": payload.phone_number,
            "phone_digits": next_phone_digits,
            "avatar_url": payload.avatar_url,
        },
    )

    updated_user = await repo.get_by_id(user_id, public=True)
    if not updated_user:
        raise APIException("User not found after update.", status.HTTP_404_NOT_FOUND)
    return updated_user


@router.post("/me/password")
async def change_my_password(
    payload: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    user_id = current_user.get("sub")
    if not user_id:
        raise APIException("Invalid token payload", status.HTTP_401_UNAUTHORIZED)

    repo = UserRepository(db)
    existing_user = await repo.get_by_id(user_id, public=False)
    if not existing_user:
        raise APIException("User not found", status.HTTP_404_NOT_FOUND)

    if not verify_password(payload.current_password, existing_user.get("hashed_password", "")):
        raise APIException("Current password is incorrect.", status.HTTP_400_BAD_REQUEST)

    new_password = validate_password_strength(payload.new_password)
    await repo.update(user_id, {"hashed_password": hash_password(new_password)})
    return {"ok": True, "message": "Password updated successfully."}


@router.get("/me/kyc")
async def get_my_kyc(current_user: dict = Depends(get_current_user), db=Depends(get_required_db)):
    user_id = current_user.get("sub")
    if not user_id:
        raise APIException("Invalid token payload", status.HTTP_401_UNAUTHORIZED)
    if current_user.get("role") != "equipment_owner":
        raise APIException("Owner access required", status.HTTP_403_FORBIDDEN)

    repo = UserRepository(db)
    user = await repo.get_by_id(user_id, public=False)
    if not user:
        raise APIException("User not found", status.HTTP_404_NOT_FOUND)

    return {
        "status": user.get("kyc_status", "not_started"),
        "profile": user.get("kyc_profile", {}) if isinstance(user.get("kyc_profile"), dict) else {},
        "submitted_at": user.get("kyc_submitted_at"),
        "reviewed_at": user.get("kyc_reviewed_at"),
        "review_notes": user.get("kyc_review_notes", ""),
    }


@router.put("/me/kyc")
async def update_my_kyc(
    payload: KYCProfileRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    user_id = current_user.get("sub")
    if not user_id:
        raise APIException("Invalid token payload", status.HTTP_401_UNAUTHORIZED)
    if current_user.get("role") != "equipment_owner":
        raise APIException("Owner access required", status.HTTP_403_FORBIDDEN)

    repo = UserRepository(db)
    existing_user = await repo.get_by_id(user_id, public=False)
    if not existing_user:
        raise APIException("User not found", status.HTTP_404_NOT_FOUND)

    now = datetime.now(timezone.utc)
    kyc_profile = payload.model_dump()
    await repo.update(
        user_id,
        {
            "kyc_profile": kyc_profile,
            "kyc_status": "pending",
            "kyc_submitted_at": now,
            "kyc_review_notes": "",
            "kyc_reviewed_at": None,
            "updated_at": now,
        },
    )

    return {
        "status": "pending",
        "profile": kyc_profile,
        "submitted_at": now,
        "reviewed_at": None,
        "review_notes": "",
    }


@router.get("/me/favorites")
async def get_my_favorites(
    current_user: dict = Depends(get_current_user), db=Depends(get_required_db)
):
    user_id = current_user.get("sub")
    if not user_id:
        raise APIException("Invalid token payload", status.HTTP_401_UNAUTHORIZED)

    repo = UserRepository(db)
    favorite_ids = await repo.get_favorite_equipment_ids(user_id)
    return {"equipment_ids": favorite_ids}


@router.put("/me/favorites")
async def replace_my_favorites(
    payload: FavoriteSyncRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    user_id = current_user.get("sub")
    if not user_id:
        raise APIException("Invalid token payload", status.HTTP_401_UNAUTHORIZED)

    repo = UserRepository(db)
    favorite_ids = await repo.set_favorite_equipment_ids(user_id, payload.equipment_ids)
    return {"ok": True, "equipment_ids": favorite_ids}


@router.post("/me/favorites/{equipment_id}")
async def toggle_my_favorite(
    equipment_id: str,
    payload: FavoriteToggleRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    user_id = current_user.get("sub")
    if not user_id:
        raise APIException("Invalid token payload", status.HTTP_401_UNAUTHORIZED)

    repo = UserRepository(db)
    current_favorites = await repo.get_favorite_equipment_ids(user_id)
    equipment_id = str(equipment_id or "").strip()
    if not equipment_id:
        raise APIException("Equipment id is required.", status.HTTP_400_BAD_REQUEST)

    if payload.active:
        next_favorites = [*current_favorites, equipment_id]
    else:
        next_favorites = [item for item in current_favorites if item != equipment_id]

    favorite_ids = await repo.set_favorite_equipment_ids(user_id, next_favorites)
    return {"ok": True, "active": payload.active, "equipment_ids": favorite_ids}


@router.get("/{user_id}")
async def get_user(
    user_id: str, current_user: dict = Depends(get_current_user), db=Depends(get_required_db)
):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id, public=True)
    if not user:
        raise APIException("User not found", status.HTTP_404_NOT_FOUND)
    return user
