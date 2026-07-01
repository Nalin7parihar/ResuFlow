from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.v1.router import api_router
from core.settings import settings
from db.database import init_db
from mq.producer import kafka_producer

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialise DB tables
    await init_db()
    # Start Kafka producer (single shared connection for all requests)
    await kafka_producer.start()
    yield
    # Graceful shutdown — flush pending messages before closing
    await kafka_producer.stop()


app = FastAPI(
    lifespan=lifespan,
    title="ResuFlow",
    version="0.0.1",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "service": "ResuFlow"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )
