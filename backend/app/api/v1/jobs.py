from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.dependencies import get_current_user, get_db
from app.models.agent_log import AgentLog
from app.models.application import Application
from app.models.enums import ApplicationStatus
from app.models.job import Job
from app.models.user import User
from app.tasks.analysis_task import run_manual_job_analysis


router = APIRouter(prefix="/api/jobs", tags=["jobs"])


class AnalyzeJobsRequest(BaseModel):
    jobIds: list[str]


def infer_work_type(location: str) -> str:
    normalized = (location or "").lower()
    if "remote" in normalized:
        return "remote"
    if "hybrid" in normalized:
        return "hybrid"
    return "onsite"


def to_api_status(status_value: ApplicationStatus) -> str:
    if status_value == ApplicationStatus.reviewing:
        return "in_review"
    return status_value.value


def to_agent_log_payload(log: AgentLog) -> dict:
    return {
        "id": str(log.id),
        "applicationId": str(log.application_id),
        "agentName": log.agent_name,
        "action": log.action,
        "timestamp": log.timestamp.isoformat() if log.timestamp else "",
    }


def to_application_payload(application: Application) -> dict:
    return {
        "id": str(application.id),
        "jobId": str(application.job_id),
        "status": to_api_status(application.status),
        "fitScore": int(application.fit_score or 0),
        "analysisPayload": application.analysis_payload_json,
        "analysisStatus": application.analysis_status,
        "writerStatus": application.writer_status,
        "cvVariantText": application.cv_variant_text,
        "coverLetterText": application.cover_letter_text,
        "submittedAt": application.submitted_at.isoformat() if application.submitted_at else application.last_updated_at.isoformat(),
        "lastUpdatedAt": application.last_updated_at.isoformat() if application.last_updated_at else "",
        "followUpScheduledAt": None,
    }


def to_job_payload(job: Job, application: Application | None = None) -> dict:
    return {
        "id": str(job.id),
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "salaryMin": job.salary_min,
        "salaryMax": job.salary_max,
        "workType": infer_work_type(job.location),
        "source": job.source.value,
        "applyType": job.apply_type.value,
        "applyUrl": job.apply_url,
        "description": job.description,
        "scrapedAt": job.scraped_at.isoformat() if job.scraped_at else "",
        "fitScore": int(application.fit_score) if application and application.fit_score is not None else None,
        "analysisStatus": application.analysis_status if application else None,
        "writerStatus": application.writer_status if application else None,
        "applicationId": str(application.id) if application else None,
    }


def _latest_application_by_job(db: Session, user_id: UUID, job_ids: list[UUID]) -> dict[UUID, Application]:
    if not job_ids:
        return {}

    applications = db.scalars(
        select(Application)
        .where(Application.user_id == user_id, Application.job_id.in_(job_ids))
        .order_by(Application.last_updated_at.desc())
    ).all()

    latest: dict[UUID, Application] = {}
    for application in applications:
        if application.job_id not in latest:
            latest[application.job_id] = application
    return latest


def _cv_ready(current_user: User) -> bool:
    preferences = current_user.preferences_json if isinstance(current_user.preferences_json, dict) else {}
    return isinstance(preferences.get("cv_data"), dict)


def _openrouter_ready() -> bool:
    return bool(settings.openrouter_api_key and settings.openrouter_api_key.strip())


@router.get("")
def get_jobs(
    search: str | None = Query(default=None),
    workType: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    query = select(Job)

    if search:
        pattern = f"%{search.strip()}%"
        query = query.where((Job.title.ilike(pattern)) | (Job.company.ilike(pattern)))

    if workType and workType != "any":
        if workType == "remote":
            query = query.where(Job.location.ilike("%remote%"))
        elif workType == "hybrid":
            query = query.where(Job.location.ilike("%hybrid%"))
        elif workType == "onsite":
            query = query.where(~Job.location.ilike("%remote%"))

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    jobs = db.scalars(
        query.order_by(Job.scraped_at.desc()).offset((page - 1) * limit).limit(limit)
    ).all()

    applications_by_job = _latest_application_by_job(db, current_user.id, [job.id for job in jobs])

    return {
        "jobs": [to_job_payload(job, applications_by_job.get(job.id)) for job in jobs],
        "total": int(total),
        "page": page,
    }


@router.get("/{job_id}")
def get_job_detail(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    try:
        job_uuid = UUID(job_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid job id") from exc

    job = db.get(Job, job_uuid)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    application = db.execute(
        select(Application)
        .options(joinedload(Application.agent_logs))
        .where(Application.user_id == current_user.id, Application.job_id == job_uuid)
        .order_by(Application.last_updated_at.desc())
    ).unique().scalars().first()

    recent_logs: list[dict] = []
    if application is not None:
        logs = sorted(application.agent_logs, key=lambda item: item.timestamp, reverse=True)[:20]
        recent_logs = [to_agent_log_payload(log) for log in logs]

    return {
        "job": to_job_payload(job, application),
        "application": to_application_payload(application) if application else None,
        "analysis": application.analysis_payload_json if application else None,
        "agentLogs": recent_logs,
        "cvReady": _cv_ready(current_user),
    }


@router.post("/analyze", status_code=status.HTTP_202_ACCEPTED)
def analyze_jobs(
    payload: AnalyzeJobsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    job_ids = [job_id.strip() for job_id in payload.jobIds if job_id.strip()]
    if not job_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Select at least one job to analyze.")
    if len(job_ids) > settings.analyze_batch_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You can analyze up to {settings.analyze_batch_size} jobs at once.",
        )
    if not _cv_ready(current_user):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload your CV before running the analyzer.")
    if not _openrouter_ready():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OPENROUTER_API_KEY is missing. Set it in backend/.env for api/worker/beat and restart containers.",
        )

    try:
        job_uuid_ids = [UUID(job_id) for job_id in job_ids]
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="One or more job ids are invalid.") from exc

    found_ids = {
        str(job_id)
        for job_id in db.scalars(select(Job.id).where(Job.id.in_(job_uuid_ids))).all()
    }
    missing_ids = [job_id for job_id in job_ids if job_id not in found_ids]
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Jobs not found: {', '.join(missing_ids)}",
        )

    task = run_manual_job_analysis.delay(str(current_user.id), job_ids)
    return {
        "taskId": task.id,
        "status": "queued",
        "acceptedJobIds": job_ids,
    }
