from typing import Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from app.core.exceptions import APIException
from app.db.client import get_required_db
from app.db.repositories.user_repo import UserRepository
from app.dependencies import get_current_user, get_current_admin
from app.core.security import verify_password, hash_password

router = APIRouter()


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    phone_number: Optional[str] = Field(default=None, max_length=20)
    bio: Optional[str] = Field(default=None, max_length=1000)
    location: Optional[str] = Field(default=None, max_length=200)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=6, max_length=128)


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
    payload: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    user_id = current_user.get("sub")
    if not user_id:
        raise APIException("Invalid token payload", status.HTTP_401_UNAUTHORIZED)

    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise APIException("No fields to update", status.HTTP_400_BAD_REQUEST)

    # Update phone_digits if phone_number changed
    if "phone_number" in update_data:
        update_data["phone_digits"] = "".join(ch for ch in str(update_data["phone_number"]) if ch.isdigit())

    repo = UserRepository(db)
    success = await repo.update(user_id, update_data)
    if not success:
        raise APIException("User not found", status.HTTP_404_NOT_FOUND)

    user = await repo.get_by_id(user_id, public=True)
    return user


@router.post("/me/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    user_id = current_user.get("sub")
    if not user_id:
        raise APIException("Invalid token payload", status.HTTP_401_UNAUTHORIZED)

    repo = UserRepository(db)
    user = await repo.get_by_id(user_id, public=False)
    if not user:
        raise APIException("User not found", status.HTTP_404_NOT_FOUND)

    hashed = user.get("hashed_password", "")
    if not verify_password(payload.current_password, hashed):
        raise APIException("Current password is incorrect", status.HTTP_400_BAD_REQUEST)

    new_hashed = hash_password(payload.new_password)
    await repo.update(user_id, {"hashed_password": new_hashed})

    return {"ok": True, "message": "Password changed successfully"}


@router.get("/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(get_current_user), db=Depends(get_required_db)):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id, public=True)
    if not user:
        raise APIException("User not found", status.HTTP_404_NOT_FOUND)
    return user
