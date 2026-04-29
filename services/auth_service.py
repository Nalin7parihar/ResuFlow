from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.security import create_access_token, hash_password, verify_password
from model.user import User
from schema.auth import LoginRequest, TokenResponse
from schema.user import UserCreate


async def register_user(data: UserCreate, db: AsyncSession) -> User:
    """Create a new user after checking for duplicate e-mail."""
    result = await db.execute(select(User).where(User.email == data.email))
    existing = result.scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )
    user = User(email=data.email, password_hash=hash_password(data.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(data: LoginRequest, db: AsyncSession) -> TokenResponse:
    """Verify credentials and return a JWT access token."""
    result = await db.execute(select(User).where(User.email == data.email))
    user: User | None = result.scalars().first()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token)
