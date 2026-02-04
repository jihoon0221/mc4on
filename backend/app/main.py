from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes_auth import router as auth_router
from app.api.routes_analysis_jobs import router as analysis_jobs_router
from app.api.routes_evidence import router as evidence_router
from app.api.routes_learning import router as learning_router
from app.api.routes_profile import router as profile_router
from app.api.routes_reports import router as reports_router
from app.api.routes_report_requests import router as report_requests_router
from app.api.routes_timeline import router as timeline_router
from app.api.routes_upload import router as upload_router
from app.api.routes_dev import router as dev_router

app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/")
def root():
    return {"message": f"{settings.app_name} up", "env": settings.environment}


app.include_router(auth_router)
app.include_router(upload_router)
app.include_router(evidence_router)
app.include_router(reports_router)
app.include_router(report_requests_router)
app.include_router(learning_router)
app.include_router(profile_router)
app.include_router(analysis_jobs_router)
app.include_router(timeline_router)
app.include_router(dev_router)
