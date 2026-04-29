from sqlalchemy.ext.asyncio import create_async_engine,AsyncSession
from sqlalchemy.orm import sessionmaker,DeclarativeBase
from core.settings import settings

engine = create_async_engine(
    settings.DB_URL,
    echo=True,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    connect_args={"statement_cache_size" : 0}
)

AsyncSessionLocal = sessionmaker(engine,class_=AsyncSession,expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def init_db() -> None:
    """Create all tables on startup (dev convenience). Use Alembic for production migrations."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)