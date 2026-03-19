from datetime import datetime, timedelta, timezone
from typing import Optional
import hashlib
import secrets
import smtplib
import uuid
import logging
from urllib.parse import quote

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, EmailStr, Field

from app.core.exceptions import APIException
from app.core.security import create_access_token, hash_password, verify_password
from app.db.client import get_required_db
from app.db.repositories.user_repo import UserRepository
from app.services.cache_service import cache_service
from app.utils.email import EmailService
from app.config import settings
from app.dependencies import get_current_user_optional

router = APIRouter()
email_service = EmailService()
logger = logging.getLogger(__name__)

def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class LoginRequest(BaseModel):
    credential: str = Field(min_length=3, max_length=160)
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    phone_number: str = ""
    role: str = Field(pattern=r"^(farmer|equipment_owner)$")
    password: str = Field(min_length=6, max_length=72)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=20, max_length=256)
    new_password: str = Field(min_length=6, max_length=72)


class OTPRequest(BaseModel):
    email: EmailStr


class OTPVerify(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)


@router.post("/login")
async def login(data: LoginRequest, db=Depends(get_required_db)):
    credential = data.credential.strip()
    password = data.password.strip()
    repo = UserRepository(db)
    existing = await repo.get_by_email(credential.lower(), public=False) if "@" in credential else await repo.get_by_phone_digits(credential, public=False)
    if not existing:
        raise APIException("Invalid email/phone or password", status.HTTP_401_UNAUTHORIZED)
    if existing.get("approval_status", "approved") == "pending":
        raise APIException("Account pending admin approval", status.HTTP_403_FORBIDDEN)
    if existing.get("approval_status", "approved") == "rejected" or not existing.get("is_active", True):
        raise APIException("Account rejected by admin", status.HTTP_403_FORBIDDEN)

    if not verify_password(password, existing.get("hashed_password", "")):
        raise APIException("Invalid email/phone or password", status.HTTP_401_UNAUTHORIZED)

    await repo.update(existing["id"], {"last_login": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)})
    user = await repo.get_by_id(existing["id"], public=True)

    token = create_access_token(
        {
            "sub": user["id"],
            "email": user["email"],
            "role": user["role"],
            "name": user["full_name"],
        }
    )
    
    # Cache token and create session
    session_id = str(uuid.uuid4())
    session_data = {
        "user_id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "full_name": user["full_name"],
        "token": token,
        "created_at": str(datetime.now(timezone.utc))
    }
    
    # Cache token for 24 hours
    await cache_service.cache_token(user["id"], token, expire=86400)
    # Create session for 7 days
    await cache_service.create_session(session_id, session_data, expire=604800)
    
    return {
        "token": token,
        "access_token": token,
        "token_type": "bearer",
        "session_id": session_id,
        "user": user,
    }


@router.get("/email-health")
async def email_health():
    try:
        await email_service.check_smtp_connection()
    except smtplib.SMTPAuthenticationError:
        raise APIException("SMTP auth failed. Check EMAIL_USER/EMAIL_PASSWORD.", status.HTTP_503_SERVICE_UNAVAILABLE)
    except smtplib.SMTPConnectError:
        raise APIException("SMTP connection failed. Check SMTP_SERVER/SMTP_PORT and network.", status.HTTP_503_SERVICE_UNAVAILABLE)
    except RuntimeError as exc:
        raise APIException(str(exc), status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception:
        raise APIException("Email health check failed.", status.HTTP_503_SERVICE_UNAVAILABLE)

    return {"ok": True, "message": "SMTP configuration is valid and login succeeded."}


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db=Depends(get_required_db)):
    email = data.email.strip().lower()

    payload = data.model_dump()
    payload["email"] = email

    repo = UserRepository(db)
    if await repo.get_by_email(email, public=False):
        raise APIException("Email already registered", status.HTTP_409_CONFLICT)

    payload["hashed_password"] = hash_password(payload.pop("password"))
    payload.setdefault("is_active", False)
    payload.setdefault("is_verified", False)
    payload.setdefault("approval_status", "pending")
    payload.setdefault("created_at", datetime.now(timezone.utc))
    payload.setdefault("updated_at", datetime.now(timezone.utc))

    new_id = await repo.create(payload)
    user = await repo.get_by_id(new_id, public=True)
    if settings.ENABLE_ADMIN_APPROVAL_EMAIL and user.get("email"):
        try:
            await email_service.send_registration_received(user["email"], user.get("full_name", "User"))
        except Exception as exc:
            logger.warning("Registration received email failed: %s", exc)
    return {"message": "Registration submitted. Please verify your email with the OTP sent.", "user": user}


@router.post("/register/request-otp")
async def request_registration_otp(data: OTPRequest, db=Depends(get_required_db)):
    email = data.email.strip().lower()
    repo = UserRepository(db)
    user = await repo.get_by_email(email, public=False)
    
    if not user:
        raise APIException("User not found", status.HTTP_404_NOT_FOUND)
    
    if user.get("is_verified"):
        return {"message": "Email already verified"}

    otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    # Cache OTP for 10 minutes
    cache_key = f"reg_otp:{email}"
    await cache_service.set(cache_key, otp, expire=600)
    
    try:
        await email_service.send_registration_otp(email, otp)
    except Exception as exc:
        logger.error("Failed to send registration OTP: %s", exc)
        raise APIException("Failed to send verification email", status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    return {"message": "Verification code sent to email"}


@router.post("/register/verify-otp")
async def verify_registration_otp(data: OTPVerify, db=Depends(get_required_db)):
    email = data.email.strip().lower()
    otp = data.otp.strip()
    
    cache_key = f"reg_otp:{email}"
    cached_otp = await cache_service.get(cache_key)
    
    if not cached_otp or cached_otp != otp:
        raise APIException("Invalid or expired verification code", status.HTTP_400_BAD_REQUEST)
    
    repo = UserRepository(db)
    user = await repo.get_by_email(email, public=False)
    if not user:
        raise APIException("User not found", status.HTTP_404_NOT_FOUND)
        
    await repo.update(user["id"], {"is_verified": True, "updated_at": datetime.now(timezone.utc)})
    await cache_service.delete(cache_key)
    
    return {"message": "Email verified successfully. You can now login after admin approval."}


@router.post("/password-reset/request")
async def request_password_reset(payload: PasswordResetRequest, db=Depends(get_required_db)):
    email = payload.email.strip().lower()
    repo = UserRepository(db)
    user = await repo.get_by_email(email, public=False)
    response = {
        "message": "If an account exists for this email, a password reset link has been sent.",
        "expires_in_minutes": settings.PASSWORD_RESET_TOKEN_TTL_MINUTES,
    }

    if not user:
        return response

    token = secrets.token_urlsafe(48)
    token_hash = _hash_reset_token(token)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_TTL_MINUTES)

    await db.password_reset_tokens.delete_many({"user_id": user["id"]})
    await db.password_reset_tokens.insert_one(
        {
            "user_id": user["id"],
            "email": user.get("email", email),
            "token_hash": token_hash,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc),
        }
    )

    base_url = str(settings.FRONTEND_BASE_URL or "").strip()
    reset_url = f"{base_url.rstrip('/')}/auth/reset-password?token={quote(token)}" if base_url else None

    if settings.ENABLE_PASSWORD_RESET_EMAIL and user.get("email"):
        try:
            await email_service.send_password_reset(
                recipient_email=user["email"],
                token=token,
                reset_url=reset_url,
                full_name=user.get("full_name", "User"),
                expires_in_minutes=settings.PASSWORD_RESET_TOKEN_TTL_MINUTES,
            )
        except smtplib.SMTPAuthenticationError:
            raise APIException("SMTP auth failed. Check EMAIL_USER/EMAIL_PASSWORD.", status.HTTP_503_SERVICE_UNAVAILABLE)
        except smtplib.SMTPConnectError:
            raise APIException("SMTP connection failed. Check SMTP_SERVER/SMTP_PORT and network.", status.HTTP_503_SERVICE_UNAVAILABLE)
        except RuntimeError as exc:
            raise APIException(str(exc), status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception:
            raise APIException("Unable to send password reset email. Check SMTP settings and try again.", status.HTTP_503_SERVICE_UNAVAILABLE)

    return response


@router.post("/password-reset/confirm")
async def confirm_password_reset(payload: PasswordResetConfirm, db=Depends(get_required_db)):
    token_hash = _hash_reset_token(payload.token.strip())
    token_doc = await db.password_reset_tokens.find_one({"token_hash": token_hash})
    if not token_doc:
        raise APIException("Invalid or expired reset token", status.HTTP_400_BAD_REQUEST)

    expires_at = token_doc.get("expires_at", datetime.min.replace(tzinfo=timezone.utc))
    if datetime.now(timezone.utc) > expires_at:
        await db.password_reset_tokens.delete_one({"_id": token_doc.get("_id")})
        raise APIException("Invalid or expired reset token", status.HTTP_400_BAD_REQUEST)

    repo = UserRepository(db)
    user = await repo.get_by_id(str(token_doc.get("user_id", "")), public=False)
    if not user:
        await db.password_reset_tokens.delete_one({"_id": token_doc.get("_id")})
        raise APIException("Invalid or expired reset token", status.HTTP_400_BAD_REQUEST)

    await repo.update(
        user["id"],
        {"hashed_password": hash_password(payload.new_password), "updated_at": datetime.now(timezone.utc)},
    )
    await db.password_reset_tokens.delete_many({"user_id": user["id"]})

    if settings.ENABLE_PASSWORD_RESET_EMAIL and user.get("email"):
        try:
            await email_service.send_password_reset_confirmation(user["email"], user.get("full_name", "User"))
        except Exception as exc:
            logger.warning("Password reset confirmation email failed: %s", exc)

    return {"message": "Password reset successful."}


class LogoutRequest(BaseModel):
    session_id: Optional[str] = Field(default=None)


@router.post("/logout")
async def logout(
    data: LogoutRequest,
    current_user: dict = Depends(get_current_user_optional),
):
    """Logout user and invalidate session/token"""
    user_id = current_user.get("sub") if current_user else None

    if user_id:
        # Invalidate cached token
        await cache_service.invalidate_token(user_id)
        logger.info("Invalidated cached token for user %s", user_id)

    if data.session_id:
        # Delete specific session
        await cache_service.delete_session(data.session_id)
        logger.info("Deleted session %s", data.session_id)

    return {"ok": True, "message": "Successfully logged out"}
