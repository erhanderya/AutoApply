from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import get_current_user, get_db
from app.models.application import Application
from app.models.enums import ApplicationStatus
from app.models.user import User


router = APIRouter(prefix="/api/applications", tags=["applications"])


class UpdateStatusRequest(BaseModel):
    status: str


class UpdateCoverLetterRequest(BaseModel):
    text: str


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


def from_api_status(status_value: str) -> ApplicationStatus:
    if status_value == "in_review":
        return ApplicationStatus.reviewing
    if status_value in {member.value for member in ApplicationStatus}:
        return ApplicationStatus(status_value)
    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status")


def to_agent_log_payload(log) -> dict:
    return {
        "id": str(log.id),
        "applicationId": str(log.application_id),
        "agentName": log.agent_name,
        "action": log.action,
        "timestamp": log.timestamp.isoformat() if log.timestamp else "",
    }


def to_job_payload(job, application: Application | None = None) -> dict:
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


def to_application_payload(application: Application) -> dict:
    return {
        "id": str(application.id),
        "jobId": str(application.job_id),
        "job": to_job_payload(application.job, application),
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


def get_application_for_user(db: Session, application_id: str, user_id: UUID) -> Application:
    try:
        application_uuid = UUID(application_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid application id") from exc

    application = db.execute(
        select(Application)
        .options(joinedload(Application.job), joinedload(Application.agent_logs))
        .where(Application.id == application_uuid, Application.user_id == user_id)
    ).unique().scalars().first()
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return application


@router.get("")
def get_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    applications = db.scalars(
        select(Application)
        .options(joinedload(Application.job))
        .where(Application.user_id == current_user.id)
        .order_by(Application.last_updated_at.desc())
    ).all()
    return [to_application_payload(application) for application in applications]


@router.get("/{application_id}")
def get_application(
    application_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    application = get_application_for_user(db, application_id, current_user.id)
    payload = to_application_payload(application)
    payload["agentLogs"] = [to_agent_log_payload(log) for log in sorted(application.agent_logs, key=lambda item: item.timestamp, reverse=True)]
    return payload


@router.post("/{application_id}/approve")
def approve_application(
    application_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    application = get_application_for_user(db, application_id, current_user.id)
    application.status = ApplicationStatus.applied
    application.last_updated_at = datetime.now(timezone.utc)
    if application.submitted_at is None:
        application.submitted_at = datetime.now(timezone.utc)
    db.add(application)
    db.commit()
    db.refresh(application)
    return to_application_payload(application)


@router.patch("/{application_id}/status")
def update_status(
    application_id: str,
    payload: UpdateStatusRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    application = get_application_for_user(db, application_id, current_user.id)
    old_status = application.status
    application.status = from_api_status(payload.status)
    application.last_updated_at = datetime.now(timezone.utc)
    db.add(application)
    db.commit()
    db.refresh(application)

    if old_status != ApplicationStatus.interview and application.status == ApplicationStatus.interview:
        from app.tasks.interview_prep_task import run_interview_prep
        run_interview_prep.delay(str(application.id), str(current_user.id))

    return to_application_payload(application)


@router.patch("/{application_id}/cover-letter")
def update_cover_letter(
    application_id: str,
    payload: UpdateCoverLetterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    application = get_application_for_user(db, application_id, current_user.id)
    application.cover_letter_text = payload.text
    application.last_updated_at = datetime.now(timezone.utc)
    db.add(application)
    db.commit()
    db.refresh(application)
    return to_application_payload(application)
