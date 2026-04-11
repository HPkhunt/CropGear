import hashlib
import logging
import secrets
import smtplib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field

from app.config import settings
from app.core.exceptions import APIException
from app.core.password_policy import validate_password_strength
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
    verify_token,
)
from app.db.client import get_required_db
from app.db.repositories.user_repo import UserRepository
from app.dependencies import get_current_user_optional, security_optional
from app.services.cache_service import cache_service
from app.utils.email import EmailService

router = APIRouter()
email_service = EmailService()
logger = logging.getLogger(__name__)

MIN_TOKEN_REVOKE_TTL_SECONDS = 60


def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _access_token_ttl_seconds() -> int:
    return max(int(settings.ACCESS_TOKEN_EXPIRE_MINUTES), 1) * 60


def _refresh_token_ttl_seconds() -> int:
    return max(int(settings.REFRESH_TOKEN_EXPIRE_DAYS), 1) * 86400


def _token_ttl_from_payload(payload: Optional[dict], fallback: int) -> int:
    expire_at = (payload or {}).get("exp")
    if expire_at is None:
        return fallback
    return max(
        int(float(expire_at) - datetime.now(timezone.utc).timestamp()), MIN_TOKEN_REVOKE_TTL_SECONDS
    )


def _assert_user_can_authenticate(user: Optional[dict]) -> dict:
    if not user:
        raise APIException("Invalid email/phone or password", status.HTTP_401_UNAUTHORIZED)
    if user.get("approval_status", "approved") == "pending":
        raise APIException("Account pending admin approval", status.HTTP_403_FORBIDDEN)
    if user.get("approval_status", "approved") == "rejected" or not user.get("is_active", True):
        raise APIException("Account rejected by admin", status.HTTP_403_FORBIDDEN)
    return user


def _build_access_claims(user: dict, session_id: str) -> dict:
    return {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "name": user["full_name"],
        "sid": session_id,
    }


def _build_refresh_claims(user: dict, session_id: str) -> dict:
    return {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "sid": session_id,
    }


def _build_session_data(
    user: dict,
    session_id: str,
    access_token: str,
    refresh_token: str,
    *,
    created_at: Optional[str] = None,
) -> dict:
    now = datetime.now(timezone.utc)
    return {
        "session_id": session_id,
        "user_id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "full_name": user["full_name"],
        "token": access_token,
        "refresh_token_hash": _hash_reset_token(refresh_token),
        "created_at": created_at or now.isoformat(),
        "updated_at": now.isoformat(),
    }


def _build_auth_response(
    user: dict, access_token: str, refresh_token: str, session_id: str
) -> dict:
    return {
        "token": access_token,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": _access_token_ttl_seconds(),
        "refresh_expires_in": _refresh_token_ttl_seconds(),
        "session_id": session_id,
        "user": user,
    }


async def _persist_auth_session(
    user: dict,
    session_id: str,
    access_token: str,
    refresh_token: str,
    *,
    created_at: Optional[str] = None,
) -> None:
    session_data = _build_session_data(
        user, session_id, access_token, refresh_token, created_at=created_at
    )
    await cache_service.cache_token(user["id"], access_token, expire=_access_token_ttl_seconds())
    await cache_service.create_session(
        session_id, session_data, expire=_refresh_token_ttl_seconds()
    )


async def _revoke_token_if_present(
    token: Optional[str], fallback_ttl: int, *, expected_type: Optional[str] = None
) -> None:
    if not token:
        return
    payload = verify_token(token, expected_type=expected_type)
    ttl = _token_ttl_from_payload(payload, fallback_ttl)
    await cache_service.revoke_token(token, expire=ttl)


async def _issue_auth_tokens(
    user: dict, session_id: Optional[str] = None, *, created_at: Optional[str] = None
) -> dict:
    active_session_id = session_id or str(uuid.uuid4())
    access_token = create_access_token(_build_access_claims(user, active_session_id))
    refresh_token = create_refresh_token(_build_refresh_claims(user, active_session_id))
    await _persist_auth_session(
        user, active_session_id, access_token, refresh_token, created_at=created_at
    )
    return _build_auth_response(user, access_token, refresh_token, active_session_id)

class LoginRequest(BaseModel):
    credential: str = Field(min_length=3, max_length=160)
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    phone_number: str = ""
    role: str = Field(pattern=r"^(farmer|equipment_owner)$")
    password: str = Field(max_length=72)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=20, max_length=256)
    new_password: str = Field(max_length=72)


class OTPRequest(BaseModel):
    email: EmailStr


class OTPVerify(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=20, max_length=4096)
    session_id: Optional[str] = Field(default=None, min_length=1)


@router.post("/login")
async def login(data: LoginRequest, db=Depends(get_required_db)):
    credential = data.credential.strip()
    password = data.password
    repo = UserRepository(db)
    existing = (
        await repo.get_by_email(credential.lower(), public=False)
        if "@" in credential
        else await repo.get_by_phone_digits(credential, public=False)
    )
    existing = _assert_user_can_authenticate(existing)

    if not verify_password(password, existing.get("hashed_password", "")):
        raise APIException("Invalid email/phone or password", status.HTTP_401_UNAUTHORIZED)

    await repo.update(
        existing["id"],
        {"last_login": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)},
    )
    user = await repo.get_by_id(existing["id"], public=True)
    return await _issue_auth_tokens(user)


@router.post("/refresh")
async def refresh_access_token(payload: RefreshTokenRequest, db=Depends(get_required_db)):
    refresh_token = payload.refresh_token.strip()
    if await cache_service.is_token_revoked(refresh_token):
        raise APIException("Refresh token has been revoked.", status.HTTP_401_UNAUTHORIZED)

    token_payload = verify_token(refresh_token, expected_type="refresh")
    if not token_payload:
        raise APIException("Invalid or expired refresh token.", status.HTTP_401_UNAUTHORIZED)

    session_id = payload.session_id or token_payload.get("sid")
    if not session_id:
        raise APIException("Refresh session is invalid.", status.HTTP_401_UNAUTHORIZED)

    session = await cache_service.get_session(session_id)
    if not session:
        raise APIException(
            "Refresh session has expired. Please sign in again.", status.HTTP_401_UNAUTHORIZED
        )

    if session.get("refresh_token_hash") != _hash_reset_token(refresh_token):
        raise APIException(
            "Refresh token does not match the active session.", status.HTTP_401_UNAUTHORIZED
        )

    user_id = token_payload.get("sub") or session.get("user_id")
    repo = UserRepository(db)
    existing = await repo.get_by_id(user_id, public=False)
    if not existing:
        raise APIException("User account no longer exists.", status.HTTP_401_UNAUTHORIZED)
    user = await repo.get_by_id(existing["id"], public=True)
    user = _assert_user_can_authenticate(user)

    await _revoke_token_if_present(
        refresh_token, _refresh_token_ttl_seconds(), expected_type="refresh"
    )

    refreshed = await _issue_auth_tokens(
        user,
        session_id=session_id,
        created_at=session.get("created_at"),
    )
    return refreshed


@router.get("/email-health")
async def email_health():
    try:
        await email_service.check_smtp_connection()
    except smtplib.SMTPAuthenticationError:
        raise APIException(
            "SMTP auth failed. Check EMAIL_USER/EMAIL_PASSWORD.",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except smtplib.SMTPConnectError:
        raise APIException(
            "SMTP connection failed. Check SMTP_SERVER/SMTP_PORT and network.",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except RuntimeError as exc:
        raise APIException(str(exc), status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception:
        raise APIException("Email health check failed.", status.HTTP_503_SERVICE_UNAVAILABLE)

    return {"ok": True, "message": "SMTP configuration is valid and login succeeded."}


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db=Depends(get_required_db)):
    email = data.email.strip().lower()
    try:
        password = validate_password_strength(data.password)
    except ValueError as exc:
        raise APIException(str(exc), status.HTTP_400_BAD_REQUEST)

    payload = data.model_dump()
    payload["email"] = email
    payload["password"] = password

    repo = UserRepository(db)
    if await repo.get_by_email(email, public=False):
        raise APIException("Email already registered", status.HTTP_409_CONFLICT)

    payload["hashed_password"] = hash_password(payload.pop("password"))
    payload.setdefault("is_active", False)
    payload.setdefault("is_verified", False)
    payload.setdefault("approval_status", "pending")
    if payload.get("role") == "equipment_owner":
        payload.setdefault("kyc_status", "not_started")
    payload.setdefault("created_at", datetime.now(timezone.utc))
    payload.setdefault("updated_at", datetime.now(timezone.utc))

    new_id = await repo.create(payload)
    user = await repo.get_by_id(new_id, public=True)
    if settings.ENABLE_ADMIN_APPROVAL_EMAIL and user.get("email"):
        try:
            await email_service.send_registration_received(
                user["email"], user.get("full_name", "User")
            )
        except Exception as exc:
            logger.warning("Registration received email failed: %s", exc)
    return {
        "message": "Registration submitted. Please verify your email with the OTP sent.",
        "user": user,
    }


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
        raise APIException(
            "Failed to send verification email", status.HTTP_500_INTERNAL_SERVER_ERROR
        )

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
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.PASSWORD_RESET_TOKEN_TTL_MINUTES
    )

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
    reset_url = (
        f"{base_url.rstrip('/')}/auth/reset-password?token={quote(token)}" if base_url else None
    )

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
            raise APIException(
                "SMTP auth failed. Check EMAIL_USER/EMAIL_PASSWORD.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except smtplib.SMTPConnectError:
            raise APIException(
                "SMTP connection failed. Check SMTP_SERVER/SMTP_PORT and network.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except RuntimeError as exc:
            raise APIException(str(exc), status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception:
            raise APIException(
                "Unable to send password reset email. Check SMTP settings and try again.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    return response


@router.post("/password-reset/confirm")
async def confirm_password_reset(
    payload: PasswordResetConfirm,
    request: Request = None,
    db=Depends(get_required_db),
):
    try:
        new_password = validate_password_strength(payload.new_password)
    except ValueError as exc:
        raise APIException(str(exc), status.HTTP_400_BAD_REQUEST)

    token_hash = _hash_reset_token(payload.token.strip())
    token_doc = await db.password_reset_tokens.find_one({"token_hash": token_hash})
    if not token_doc:
        raise APIException("Invalid or expired reset token", status.HTTP_400_BAD_REQUEST)

    expires_at = token_doc.get("expires_at", datetime.min.replace(tzinfo=timezone.utc))
    if getattr(expires_at, "tzinfo", None) is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
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
        {"hashed_password": hash_password(new_password), "updated_at": datetime.now(timezone.utc)},
    )
    await db.password_reset_tokens.delete_many({"user_id": user["id"]})

    if settings.ENABLE_PASSWORD_RESET_EMAIL and user.get("email"):
        try:
            await email_service.send_password_reset_confirmation(
                user["email"], user.get("full_name", "User")
            )
        except Exception as exc:
            logger.warning("Password reset confirmation email failed: %s", exc)

    return {"message": "Password reset successful."}


class LogoutRequest(BaseModel):
    session_id: Optional[str] = Field(default=None)
    refresh_token: Optional[str] = Field(default=None, max_length=4096)


@router.post("/logout")
async def logout(
    data: LogoutRequest,
    current_user: dict = Depends(get_current_user_optional),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
):
    """Logout user and invalidate session/token"""
    user_id = current_user.get("sub") if current_user else None
    session_id = data.session_id
    refresh_token = (data.refresh_token or "").strip() or None
    refresh_payload = (
        verify_token(refresh_token, expected_type="refresh") if refresh_token else None
    )

    if refresh_payload and not user_id:
        user_id = refresh_payload.get("sub")
    if refresh_payload and not session_id:
        session_id = refresh_payload.get("sid")

    if user_id:
        # Invalidate cached token
        await cache_service.invalidate_token(user_id)
        logger.info("Invalidated cached token for user %s", user_id)

    if credentials and current_user:
        revoke_ttl = _token_ttl_from_payload(current_user, _access_token_ttl_seconds())
        await cache_service.revoke_token(credentials.credentials, expire=revoke_ttl)
        logger.info("Revoked bearer token for user %s", user_id)

    if refresh_token:
        await _revoke_token_if_present(
            refresh_token, _refresh_token_ttl_seconds(), expected_type="refresh"
        )
        logger.info("Revoked refresh token for user %s", user_id)

    if session_id:
        # Delete specific session
        await cache_service.delete_session(session_id)
        logger.info("Deleted session %s", session_id)

    return {"ok": True, "message": "Successfully logged out"}
