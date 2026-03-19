from datetime import datetime, timezone
import logging
import stripe
from fastapi import APIRouter, Depends, status, Request, Query
from pydantic import BaseModel, EmailStr, Field

from app.config import settings
from app.core.exceptions import APIException
from app.db.client import get_required_db
from app.db.repositories.booking_repo import BookingRepository
from app.db.repositories.user_repo import UserRepository
from app.dependencies import get_current_user
from app.utils.email import EmailService

router = APIRouter()
logger = logging.getLogger(__name__)
email_service = EmailService()

# Initialize Stripe
if settings.STRIPE_SECRET_KEY:
    stripe.api_key = settings.STRIPE_SECRET_KEY

# Version-safe Stripe error class (SDK v4 vs v5+)
try:
    _StripeError = stripe.error.StripeError
except AttributeError:
    _StripeError = getattr(stripe, 'StripeError', Exception)

try:
    _SignatureVerificationError = stripe.error.SignatureVerificationError
except AttributeError:
    _SignatureVerificationError = getattr(stripe, 'SignatureVerificationError', _StripeError)


class CreatePaymentIntentRequest(BaseModel):
    booking_id: str = Field(min_length=1)
    amount: float = Field(gt=0)
    email: EmailStr
    description: str = ""


class ConfirmPaymentRequest(BaseModel):
    payment_intent_id: str = Field(min_length=1)
    
    
class WebhookRequest(BaseModel):
    id: str
    type: str
    data: dict


@router.post("/create-intent")
async def create_payment_intent(
    payload: CreatePaymentIntentRequest, 
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db)
):
    """Create a Stripe payment intent for a booking"""
    if not settings.STRIPE_SECRET_KEY:
        raise APIException("Stripe is not configured", status.HTTP_503_SERVICE_UNAVAILABLE)
    
    role = current_user.get("role", "")
    if role not in {"farmer", "admin"}:
        raise APIException("Farmer access required", status.HTTP_403_FORBIDDEN)

    # Verify booking exists and belongs to user
    booking_repo = BookingRepository(db)
    booking = await booking_repo.get_by_id(payload.booking_id)
    
    if not booking:
        raise APIException("Booking not found", status.HTTP_404_NOT_FOUND)
    
    if role != "admin":
        renter_id = booking.get("renter_id") or booking.get("farmer_id")
        if renter_id != current_user["sub"]:
            raise APIException("Unauthorized access to booking", status.HTTP_403_FORBIDDEN)
    
    # Validate amount matches booking total
    expected_amount = float(booking.get("total_amount", 0))
    if abs(expected_amount - payload.amount) > 0.01:
        raise APIException("Amount mismatch for booking payment", status.HTTP_400_BAD_REQUEST)
    
    if booking.get("payment_status") == "completed":
        raise APIException("Booking already paid", status.HTTP_400_BAD_REQUEST)

    try:
        # Create Stripe payment intent
        intent = stripe.PaymentIntent.create(
            amount=int(payload.amount * 100),  # Convert to cents
            currency="usd",
            payment_method_types=["card"],
            receipt_email=payload.email,
            metadata={
                "booking_id": payload.booking_id,
                "farmer_id": current_user["sub"],
                "equipment_id": booking.get("equipment_id", ""),
            },
            description=payload.description or f"Equipment rental payment for booking {payload.booking_id}"
        )
        
        # Store payment record
        await db.payments.insert_one({
            "payment_intent_id": intent.id,
            "booking_id": payload.booking_id,
            "farmer_id": current_user["sub"],
            "amount": payload.amount,
            "currency": "usd",
            "status": "pending",
            "email": payload.email,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        })
        
        return {
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id,
            "amount": payload.amount,
            "currency": "usd",
            "status": intent.status,
            "booking_id": payload.booking_id,
            "receipt_email": payload.email,
        }
    except _StripeError as e:
        raise APIException(f"Stripe error: {str(e)}", status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        raise APIException(f"Payment creation failed: {str(e)}", status.HTTP_500_INTERNAL_SERVER_ERROR)


@router.post("/confirm-payment")
async def confirm_payment(
    payload: ConfirmPaymentRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db)
):
    """Confirm a payment and update booking status"""
    if not settings.STRIPE_SECRET_KEY:
        raise APIException("Stripe is not configured", status.HTTP_503_SERVICE_UNAVAILABLE)
    
    try:
        # Retrieve intent from Stripe
        intent = stripe.PaymentIntent.retrieve(payload.payment_intent_id)
        
        if intent.status != "succeeded":
            raise APIException(f"Payment not completed. Status: {intent.status}", status.HTTP_400_BAD_REQUEST)
        
        # Get booking ID from metadata
        booking_id = intent.metadata.get("booking_id")
        
        # Update payment record
        await db.payments.update_one(
            {"payment_intent_id": payload.payment_intent_id},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                    "charge_id": intent.latest_charge,
                }
            }
        )
        
        # Update booking status
        booking_repo = BookingRepository(db)
        await booking_repo.update(
            booking_id,
            {
                "payment_status": "completed",
                "paid_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            },
        )

        if settings.ENABLE_PAYMENT_RECEIPT_EMAIL:
            try:
                payment_doc = await db.payments.find_one({"payment_intent_id": payload.payment_intent_id})
                booking = await booking_repo.get_by_id(booking_id) if booking_id else None
                recipient_email = None
                if payment_doc and payment_doc.get("email"):
                    recipient_email = payment_doc.get("email")
                elif booking and booking.get("renter_id"):
                    user_repo = UserRepository(db)
                    renter = await user_repo.get_by_id(booking.get("renter_id"), public=True)
                    recipient_email = renter.get("email") if renter else None

                if recipient_email and booking:
                    await email_service.send_payment_receipt(
                        booking,
                        recipient_email,
                        amount=payment_doc.get("amount") if payment_doc else intent.amount / 100,
                        currency=payment_doc.get("currency", "USD") if payment_doc else "USD",
                    )
                    await db.payments.update_one(
                        {"payment_intent_id": payload.payment_intent_id},
                        {"$set": {"receipt_sent_at": datetime.now(timezone.utc)}},
                    )
            except Exception as exc:
                logger.warning("Payment receipt email failed: %s", exc)
        
        return {
            "ok": True,
            "message": "Payment confirmed",
            "payment_intent_id": payload.payment_intent_id,
            "booking_id": booking_id,
            "amount": intent.amount / 100,  # Convert from cents
            "status": "completed"
        }
    except _StripeError as e:
        raise APIException(f"Stripe error: {str(e)}", status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        raise APIException(f"Payment confirmation failed: {str(e)}", status.HTTP_500_INTERNAL_SERVER_ERROR)


@router.get("/history")
async def payment_history(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
    limit: int = Query(default=50, ge=1, le=200)
):
    """Get payment history for current user"""
    payments = await db.payments.find(
        {"farmer_id": current_user["sub"]}
    ).sort("created_at", -1).limit(limit).to_list(length=limit)
    
    return {
        "total": len(payments),
        "payments": [
            {
                "payment_intent_id": p.get("payment_intent_id"),
                "booking_id": p.get("booking_id"),
                "amount": p.get("amount"),
                "status": p.get("status"),
                "created_at": p.get("created_at").isoformat() if p.get("created_at") else None,
                "completed_at": p.get("completed_at").isoformat() if p.get("completed_at") else None,
            }
            for p in payments
        ]
    }


@router.post("/webhook")
async def stripe_webhook(request: Request, db=Depends(get_required_db)):
    """Handle Stripe webhook events"""
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise APIException("Webhook not configured", status.HTTP_400_BAD_REQUEST)
    
    try:
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")
        
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise APIException("Invalid payload", status.HTTP_400_BAD_REQUEST)
    except _SignatureVerificationError:
        raise APIException("Invalid signature", status.HTTP_400_BAD_REQUEST)

    # Handle specific event types
    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        booking_id = intent["metadata"].get("booking_id")
        
        if booking_id:
            await db.payments.update_one(
                {"payment_intent_id": intent["id"]},
                {
                    "$set": {
                        "status": "completed",
                        "webhook_processed": True,
                        "updated_at": datetime.now(timezone.utc),
                    }
                }
            )
            
            booking_repo = BookingRepository(db)
            await booking_repo.update(
                booking_id,
                {
                    "payment_status": "completed",
                    "paid_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                },
            )

            if settings.ENABLE_PAYMENT_RECEIPT_EMAIL:
                try:
                    payment_doc = await db.payments.find_one({"payment_intent_id": intent["id"]})
                    if payment_doc and payment_doc.get("receipt_sent_at"):
                        return {"status": "success"}
                    booking = await booking_repo.get_by_id(booking_id)
                    recipient_email = payment_doc.get("email") if payment_doc else None
                    if not recipient_email and booking and booking.get("renter_id"):
                        user_repo = UserRepository(db)
                        renter = await user_repo.get_by_id(booking.get("renter_id"), public=True)
                        recipient_email = renter.get("email") if renter else None
                    if recipient_email and booking:
                        await email_service.send_payment_receipt(
                            booking,
                            recipient_email,
                            amount=payment_doc.get("amount") if payment_doc else intent["amount"] / 100,
                            currency=payment_doc.get("currency", "USD") if payment_doc else intent.get("currency", "USD"),
                        )
                        await db.payments.update_one(
                            {"payment_intent_id": intent["id"]},
                            {"$set": {"receipt_sent_at": datetime.now(timezone.utc)}},
                        )
                except Exception as exc:
                    logger.warning("Webhook payment receipt email failed: %s", exc)
    
    elif event["type"] == "payment_intent.payment_failed":
        intent = event["data"]["object"]
        booking_id = intent["metadata"].get("booking_id")
        
        if booking_id:
            await db.payments.update_one(
                {"payment_intent_id": intent["id"]},
                {
                    "$set": {
                        "status": "failed",
                        "error_message": intent.get("last_payment_error", {}).get("message"),
                        "webhook_processed": True,
                        "updated_at": datetime.now(timezone.utc),
                    }
                }
            )
    
    elif event["type"] == "charge.refunded":
        charge = event["data"]["object"]
        payment_intent_id = charge.get("payment_intent")
        
        if payment_intent_id:
            await db.payments.update_one(
                {"payment_intent_id": payment_intent_id},
                {
                    "$set": {
                        "status": "refunded",
                        "refund_id": charge.get("refunds", {}).get("data", [{}])[0].get("id"),
                        "updated_at": datetime.now(timezone.utc),
                    }
                }
            )
            
            # Update booking status
            payment = await db.payments.find_one({"payment_intent_id": payment_intent_id})
            if payment:
                booking_repo = BookingRepository(db)
                await booking_repo.update(
                    payment.get("booking_id"),
                    {
                        "payment_status": "refunded",
                        "updated_at": datetime.now(timezone.utc),
                    },
                )

    return {"status": "success"}
