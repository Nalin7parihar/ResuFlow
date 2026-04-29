from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from core.settings import settings

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------
def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT. `subject` is typically the user's UUID as a string."""
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    payload = {"sub": subject, "exp": expire, "iat": datetime.utcnow()}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT. Raises HTTPException on failure."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---------------------------------------------------------------------------
# HTTPBearer dependency
# ---------------------------------------------------------------------------
_bearer_scheme = HTTPBearer()


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> UUID:
    """FastAPI dependency — extracts and validates the JWT, returns the user UUID."""
    payload = decode_access_token(credentials.credentials)
    user_id_str: Optional[str] = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing subject",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user identifier in token",
            headers={"WWW-Authenticate": "Bearer"},
        )
