from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.analytics import router as analytics_router
from app.api.v1.applications import router as applications_router
from app.api.v1.auth import router as auth_router
from app.api.v1.cv import router as cv_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.preferences import router as preferences_router
from app.api.v1.scout import router as scout_router
from app.api.v1.websocket import router as websocket_router
from app.core.config import settings


app = FastAPI(title="AutoApply API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(cv_router)
app.include_router(jobs_router)
app.include_router(applications_router)
app.include_router(preferences_router)
app.include_router(analytics_router)
app.include_router(scout_router)
app.include_router(websocket_router)
