from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import get_current_user_id
from db.database import get_db
from schema.user import UserCreate, UserResponse, UserUpdate
from services import user_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Create a new user (admin / internal use)."""
    return await user_service.create_user(data, db)


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Return the authenticated user's profile."""
    return await user_service.get_user_by_id(current_user_id, db)


@router.get("/", response_model=list[UserResponse])
async def list_users(
    _: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """List all users (requires authentication)."""
    return await user_service.get_all_users(db)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    _: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get a user by ID."""
    return await user_service.get_user_by_id(user_id, db)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    data: UserUpdate,
    _: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update a user's email or password."""
    return await user_service.update_user(user_id, data, db)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    _: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete a user by ID."""
    await user_service.delete_user(user_id, db)
