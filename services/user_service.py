from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from core.security import hash_password
from model.user import User
from schema.user import UserCreate, UserUpdate


async def create_user(data: UserCreate, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    user = User(email=data.email, password_hash=hash_password(data.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_user_by_id(user_id: UUID, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


async def get_all_users(db: AsyncSession) -> list[User]:
    result = await db.execute(
        select(User).options(selectinload(User.tasks))
    )
    return result.scalars().all()


async def update_user(user_id: UUID, data: UserUpdate, db: AsyncSession) -> User:
    user = await get_user_by_id(user_id, db)
    if data.email is not None:
        user.email = data.email
    if data.password is not None:
        user.password_hash = hash_password(data.password)
    await db.commit()
    await db.refresh(user)
    return user


async def delete_user(user_id: UUID, db: AsyncSession) -> None:
    user = await get_user_by_id(user_id, db)
    await db.delete(user)
    await db.commit()
