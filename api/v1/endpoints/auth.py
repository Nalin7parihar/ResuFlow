from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from schema.auth import LoginRequest, TokenResponse
from schema.user import UserCreate, UserResponse
from services.auth_service import authenticate_user, register_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user account."""
    user = await register_user(data, db)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate and receive a JWT access token."""
    return await authenticate_user(data, db)
