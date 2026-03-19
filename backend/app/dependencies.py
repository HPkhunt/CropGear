from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import verify_token


security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
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
    payload = verify_token(credentials.credentials)
    return payload  # may be None if token is expired / invalid


async def get_current_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
