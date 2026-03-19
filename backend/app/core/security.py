from datetime import datetime, timedelta, timezone
import hashlib
import os
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
try:
    import bcrypt as _bcrypt

    _USE_PASSLIB_BCRYPT = hasattr(_bcrypt, "__about__")
except Exception:
    _USE_PASSLIB_BCRYPT = False


def _fallback_hash(password: str, salt: bytes = None) -> str:
    """SHA-256 with a random 16-byte salt (hex-encoded). Format: sha256$salt$digest"""
    if salt is None:
        salt = os.urandom(16)
    salt_hex = salt.hex()
    digest = hashlib.sha256((salt_hex + password).encode("utf-8")).hexdigest()
    return f"sha256${salt_hex}${digest}"


def hash_password(password: str) -> str:
    if _USE_PASSLIB_BCRYPT:
        return pwd_context.hash(password)
    return _fallback_hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if hashed_password.startswith("sha256$"):
        parts = hashed_password.split("$")
        if len(parts) == 3:
            # New salted format: sha256$salt$digest
            salt_hex = parts[1]
            salt = bytes.fromhex(salt_hex)
            return _fallback_hash(plain_password, salt) == hashed_password
        elif len(parts) == 2:
            # Legacy unsalted format: sha256$digest (backward compat)
            digest = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
            return hashed_password == f"sha256${digest}"
        return False
    if _USE_PASSLIB_BCRYPT:
        return pwd_context.verify(plain_password, hashed_password)
    # Unrecognized hash format — cannot verify
    return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
