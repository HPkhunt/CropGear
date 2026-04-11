from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin,
    auth,
    bookings,
    chat,
    equipment,
    media,
    misc,
    payments,
    reviews,
    users,
)

api_v1_router = APIRouter()

api_v1_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_v1_router.include_router(users.router, prefix="/users", tags=["Users"])
api_v1_router.include_router(equipment.router, prefix="/equipment", tags=["Equipment"])
api_v1_router.include_router(bookings.router, prefix="/bookings", tags=["Bookings"])
api_v1_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
api_v1_router.include_router(chat.router, prefix="/chat", tags=["Chat"])
api_v1_router.include_router(reviews.router, prefix="/reviews", tags=["Reviews"])
api_v1_router.include_router(media.router, prefix="/media", tags=["Media"])
api_v1_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_v1_router.include_router(misc.router, prefix="", tags=["Misc"])
