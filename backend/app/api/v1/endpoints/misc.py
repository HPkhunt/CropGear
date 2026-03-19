from typing import Dict
import logging

from fastapi import APIRouter, status, Body, Depends
from pydantic import BaseModel, Field

from app.core.exceptions import APIException
from app.db.client import get_required_db, mongodb_client
from app.db.utils import serialize_docs
from app.dependencies import get_current_admin
from app.config import settings
from app.utils.email import EmailService
from datetime import datetime, timezone

router = APIRouter()
logger = logging.getLogger(__name__)
email_service = EmailService()

@router.get("/stats")
async def get_stats(db=Depends(get_required_db)) -> Dict:
    equipments = await db.equipment.count_documents({})
    owners = await db.users.count_documents({"role": "equipment_owner"})
    bookings = await db.bookings.count_documents({})
    return {"equipments": equipments, "owners": owners, "bookings": bookings, "is_demo": mongodb_client.is_demo}

@router.get("/testimonials")
async def get_testimonials(db=Depends(get_required_db)):
    docs = await db.testimonials.find().sort("created_at", -1).to_list(length=50)
    return serialize_docs(docs)

class NewsletterPayload(BaseModel):
    email: str

@router.post("/newsletter", status_code=status.HTTP_201_CREATED)
async def subscribe_newsletter(payload: NewsletterPayload = Body(...), db=Depends(get_required_db)):
    email = payload.email.strip()
    if not email or "@" not in email:
        raise APIException("Valid email required", status.HTTP_400_BAD_REQUEST)
    await db.newsletters.update_one({"email": email}, {"$set": {"email": email, "subscribed_at": datetime.now(timezone.utc)}}, upsert=True)
    if settings.ENABLE_NEWSLETTER_WELCOME_EMAIL:
        try:
            await email_service.send_newsletter_welcome(email)
        except Exception as exc:
            logger.warning("Newsletter welcome email failed: %s", exc)
    return {"ok": True}

# admin-only management routes

@router.get("/admin/newsletters", dependencies=[Depends(get_current_admin)])
async def list_newsletters(db=Depends(get_required_db)):
    docs = await db.newsletters.find().sort("subscribed_at", -1).to_list(length=1000)
    return serialize_docs(docs)

@router.get("/admin/testimonials", dependencies=[Depends(get_current_admin)])
async def list_testimonials_admin(db=Depends(get_required_db)):
    docs = await db.testimonials.find().sort("created_at", -1).to_list(length=1000)
    return serialize_docs(docs)

class TestimonialPayload(BaseModel):
    quote: str = Field(min_length=3, max_length=1000)
    author: str = Field(default="Anonymous", max_length=120)

@router.post("/admin/testimonials", dependencies=[Depends(get_current_admin)])
async def create_testimonial(payload: TestimonialPayload = Body(...), db=Depends(get_required_db)):
    doc = {
        "quote": payload.quote.strip(),
        "author": payload.author.strip() or "Anonymous",
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.testimonials.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return doc

# delete newsletter subscriber
@router.delete("/admin/newsletters/{email}", dependencies=[Depends(get_current_admin)])
async def delete_newsletter(email: str, db=Depends(get_required_db)):
    await db.newsletters.delete_one({"email": email})
    return {"ok": True}

# delete testimonial by document ID
@router.delete("/admin/testimonials/{testimonial_id}", dependencies=[Depends(get_current_admin)])
async def delete_testimonial(testimonial_id: str, db=Depends(get_required_db)):
    from app.db.utils import to_object_id
    oid = to_object_id(testimonial_id)
    result = None
    if oid:
        result = await db.testimonials.delete_one({"_id": oid})
    if not result or result.deleted_count == 0:
        result = await db.testimonials.delete_one({"_id": testimonial_id})
    if not result or result.deleted_count == 0:
        raise APIException("Testimonial not found", status.HTTP_404_NOT_FOUND)
    return {"ok": True, "deleted_id": testimonial_id}
