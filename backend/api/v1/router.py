from fastapi import APIRouter

from api.v1.endpoints import auth, users, resumes

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(resumes.router)
