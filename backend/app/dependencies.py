from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import verify_token
from app.services.cache_service import cache_service

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)


async def _resolve_token_payload(token: str):
    payload = verify_token(token, expected_type="access")
    if not payload:
        return None
    if await cache_service.is_token_revoked(token):
        return None
    return payload


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = await _resolve_token_payload(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials"
        )
    return payload


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
) -> Optional[dict]:
    """Return the current user if a valid token is present, otherwise None.

    Used for endpoints like logout where we *want* to identify the user
    but must not reject the request when the token is expired or missing.
    """
    if credentials is None:
        return None
    payload = await _resolve_token_payload(credentials.credentials)
    return payload  # may be None if token is expired / invalid


async def get_current_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
