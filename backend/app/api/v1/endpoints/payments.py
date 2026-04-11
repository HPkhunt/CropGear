import logging
from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, Query, Request, status
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

DEFAULT_PAYMENT_CURRENCY = "usd"

# Initialize Stripe
if settings.STRIPE_SECRET_KEY:
    stripe.api_key = settings.STRIPE_SECRET_KEY

# Version-safe Stripe error class (SDK v4 vs v5+)
try:
    _StripeError = stripe.error.StripeError
except AttributeError:
    _StripeError = getattr(stripe, "StripeError", Exception)

try:
    _SignatureVerificationError = stripe.error.SignatureVerificationError
except AttributeError:
    _SignatureVerificationError = getattr(stripe, "SignatureVerificationError", _StripeError)


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


def _stripe_ready() -> bool:
    return bool(
        settings.STRIPE_ENABLED and settings.STRIPE_SECRET_KEY and settings.STRIPE_PUBLISHABLE_KEY
    )


def _stripe_unavailable_message() -> str:
    if not settings.STRIPE_ENABLED:
        return "Payments are currently disabled."
    if not settings.STRIPE_SECRET_KEY or not settings.STRIPE_PUBLISHABLE_KEY:
        return "Stripe is not fully configured."
    return "Stripe is not configured."


def _require_stripe() -> None:
    if not _stripe_ready():
        raise APIException(_stripe_unavailable_message(), status.HTTP_503_SERVICE_UNAVAILABLE)


def _payment_summary(payment_doc: dict) -> dict:
    return {
        "payment_intent_id": payment_doc.get("payment_intent_id"),
        "booking_id": payment_doc.get("booking_id"),
        "equipment_name": payment_doc.get("equipment_name"),
        "owner_name": payment_doc.get("owner_name"),
        "amount": payment_doc.get("amount"),
        "currency": payment_doc.get("currency", DEFAULT_PAYMENT_CURRENCY),
        "status": payment_doc.get("status"),
        "receipt_url": payment_doc.get("receipt_url"),
        "created_at": (
            payment_doc.get("created_at").isoformat() if payment_doc.get("created_at") else None
        ),
        "completed_at": (
            payment_doc.get("completed_at").isoformat() if payment_doc.get("completed_at") else None
        ),
    }


def _receipt_url_from_charge(charge: object) -> str | None:
    if not charge:
        return None
    if isinstance(charge, dict):
        return charge.get("receipt_url")
    return getattr(charge, "receipt_url", None)


def _latest_charge_id(intent: object) -> str | None:
    if isinstance(intent, dict):
        return intent.get("latest_charge")
    return getattr(intent, "latest_charge", None)


async def _fetch_receipt_url(intent: object) -> str | None:
    charge_id = _latest_charge_id(intent)
    if not charge_id:
        return None
    try:
        charge = stripe.Charge.retrieve(charge_id)
        return _receipt_url_from_charge(charge)
    except Exception as exc:
        logger.warning("Failed to retrieve Stripe charge receipt URL: %s", exc)
        return None


@router.get("/config")
async def payment_config():
    enabled = _stripe_ready()
    return {
        "stripe_enabled": enabled,
        "publishable_key": settings.STRIPE_PUBLISHABLE_KEY if enabled else "",
        "currency": DEFAULT_PAYMENT_CURRENCY,
        "message": None if enabled else _stripe_unavailable_message(),
    }


@router.post("/create-intent")
async def create_payment_intent(
    payload: CreatePaymentIntentRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    """Create a Stripe payment intent for a booking"""
    _require_stripe()

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
    payer_id = booking.get("renter_id") or booking.get("farmer_id") or current_user["sub"]

    # Validate amount matches booking total
    expected_amount = float(booking.get("total_amount", 0))
    if abs(expected_amount - payload.amount) > 0.01:
        raise APIException("Amount mismatch for booking payment", status.HTTP_400_BAD_REQUEST)

    if booking.get("booking_status") not in {"confirmed", "in_progress"}:
        raise APIException(
            "Only confirmed or active bookings can be paid.", status.HTTP_400_BAD_REQUEST
        )

    if booking.get("payment_status") == "completed":
        raise APIException("Booking already paid", status.HTTP_400_BAD_REQUEST)

    try:
        # Create Stripe payment intent
        intent = stripe.PaymentIntent.create(
            amount=int(payload.amount * 100),  # Convert to cents
            currency=DEFAULT_PAYMENT_CURRENCY,
            payment_method_types=["card"],
            receipt_email=payload.email,
            metadata={
                "booking_id": payload.booking_id,
                "farmer_id": payer_id,
                "equipment_id": booking.get("equipment_id", ""),
            },
            description=payload.description
            or f"Equipment rental payment for booking {payload.booking_id}",
        )

        # Store payment record
        await db.payments.insert_one(
            {
                "payment_intent_id": intent.id,
                "booking_id": payload.booking_id,
                "farmer_id": payer_id,
                "equipment_name": booking.get("equipment_name"),
                "owner_name": booking.get("owner_name"),
                "amount": payload.amount,
                "currency": DEFAULT_PAYMENT_CURRENCY,
                "status": "pending",
                "email": payload.email,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
        )

        return {
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id,
            "amount": payload.amount,
            "currency": DEFAULT_PAYMENT_CURRENCY,
            "status": intent.status,
            "booking_id": payload.booking_id,
            "receipt_email": payload.email,
        }
    except _StripeError as e:
        raise APIException(f"Stripe error: {str(e)}", status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        raise APIException(
            f"Payment creation failed: {str(e)}", status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.post("/confirm-payment")
async def confirm_payment(
    payload: ConfirmPaymentRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
):
    """Confirm a payment and update booking status"""
    _require_stripe()

    try:
        payment_doc = await db.payments.find_one({"payment_intent_id": payload.payment_intent_id})
        if not payment_doc:
            raise APIException("Payment record not found.", status.HTTP_404_NOT_FOUND)
        if current_user.get("role") != "admin" and payment_doc.get("farmer_id") != current_user.get(
            "sub"
        ):
            raise APIException("Unauthorized access to payment.", status.HTTP_403_FORBIDDEN)

        if payment_doc.get("status") == "completed":
            return {
                "ok": True,
                "message": "Payment already confirmed",
                "payment": _payment_summary(payment_doc),
            }

        # Retrieve intent from Stripe
        intent = stripe.PaymentIntent.retrieve(payload.payment_intent_id)

        if intent.status != "succeeded":
            raise APIException(
                f"Payment not completed. Status: {intent.status}", status.HTTP_400_BAD_REQUEST
            )

        # Get booking ID from metadata
        booking_id = intent.metadata.get("booking_id")

        # Update payment record
        receipt_url = await _fetch_receipt_url(intent)
        await db.payments.update_one(
            {"payment_intent_id": payload.payment_intent_id},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                    "charge_id": intent.latest_charge,
                    "receipt_url": receipt_url,
                }
            },
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
                payment_doc = await db.payments.find_one(
                    {"payment_intent_id": payload.payment_intent_id}
                )
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
            "payment": _payment_summary(
                await db.payments.find_one({"payment_intent_id": payload.payment_intent_id})
            ),
        }
    except _StripeError as e:
        raise APIException(f"Stripe error: {str(e)}", status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        raise APIException(
            f"Payment confirmation failed: {str(e)}", status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.get("/history")
async def payment_history(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_required_db),
    limit: int = Query(default=50, ge=1, le=200),
):
    """Get payment history for current user"""
    if current_user.get("role") not in {"farmer", "admin"}:
        raise APIException("Farmer access required", status.HTTP_403_FORBIDDEN)

    payments = (
        await db.payments.find(
            {} if current_user.get("role") == "admin" else {"farmer_id": current_user["sub"]}
        )
        .sort("created_at", -1)
        .limit(limit)
        .to_list(length=limit)
    )

    return {"total": len(payments), "payments": [_payment_summary(p) for p in payments]}


@router.post("/webhook")
async def stripe_webhook(request: Request, db=Depends(get_required_db)):
    """Handle Stripe webhook events"""
    _require_stripe()
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise APIException("Webhook not configured", status.HTTP_400_BAD_REQUEST)

    try:
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")

        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except ValueError:
        raise APIException("Invalid payload", status.HTTP_400_BAD_REQUEST)
    except _SignatureVerificationError:
        raise APIException("Invalid signature", status.HTTP_400_BAD_REQUEST)

    # Handle specific event types
    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        booking_id = intent["metadata"].get("booking_id")

        if booking_id:
            receipt_url = await _fetch_receipt_url(intent)
            await db.payments.update_one(
                {"payment_intent_id": intent["id"]},
                {
                    "$set": {
                        "status": "completed",
                        "webhook_processed": True,
                        "completed_at": datetime.now(timezone.utc),
                        "receipt_url": receipt_url,
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
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
                            amount=(
                                payment_doc.get("amount") if payment_doc else intent["amount"] / 100
                            ),
                            currency=(
                                payment_doc.get("currency", "USD")
                                if payment_doc
                                else intent.get("currency", "USD")
                            ),
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
                },
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
                },
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
