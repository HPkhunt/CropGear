from fastapi import APIRouter, Depends, status

from app.core.exceptions import APIException
from app.db.client import get_required_db
from app.db.repositories.user_repo import UserRepository
from app.dependencies import get_current_user, get_current_admin

router = APIRouter()


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


@router.get("/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(get_current_user), db=Depends(get_required_db)):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id, public=True)
    if not user:
        raise APIException("User not found", status.HTTP_404_NOT_FOUND)
    return user
