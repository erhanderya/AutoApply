from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.interview_prep import InterviewPrep
from app.models.user import User

router = APIRouter(prefix="/api/applications", tags=["interview-prep"])


def _get_prep_or_404(db: Session, application_id: str, user_id: UUID) -> InterviewPrep:
    try:
        app_uuid = UUID(application_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid application id",
        ) from exc

    from app.models.application import Application

    application = db.scalar(
        select(Application).where(
            Application.id == app_uuid,
            Application.user_id == user_id,
        )
    )
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    prep = db.scalar(
        select(InterviewPrep).where(InterviewPrep.application_id == app_uuid)
    )
    if prep is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview prep not found for this application",
        )
    return prep


def _prep_payload(prep: InterviewPrep) -> dict:
    return {
        "id": str(prep.id),
        "applicationId": str(prep.application_id),
        "status": prep.status,
        "companyResearch": prep.company_research_json,
        "questions": prep.questions_json or [],
        "answers": prep.answers_json or [],
        "errorMessage": prep.error_message,
        "createdAt": prep.created_at.isoformat() if prep.created_at else "",
        "lastUpdatedAt": prep.last_updated_at.isoformat() if prep.last_updated_at else "",
    }


@router.get("/{application_id}/interview-prep")
def get_interview_prep(
    application_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    prep = _get_prep_or_404(db, application_id, current_user.id)
    return _prep_payload(prep)


@router.post("/{application_id}/interview-prep/regenerate")
def regenerate_interview_prep(
    application_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    try:
        app_uuid = UUID(application_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid application id",
        ) from exc

    from app.models.application import Application

    application = db.scalar(
        select(Application).where(
            Application.id == app_uuid,
            Application.user_id == current_user.id,
        )
    )
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    from datetime import datetime, timezone

    prep = db.scalar(
        select(InterviewPrep).where(InterviewPrep.application_id == app_uuid)
    )
    if prep is None:
        import uuid as _uuid
        prep = InterviewPrep(
            id=_uuid.uuid4(),
            application_id=app_uuid,
            status="queued",
        )
        db.add(prep)
    else:
        prep.status = "queued"
        prep.error_message = None
        prep.last_updated_at = datetime.now(timezone.utc)
        db.add(prep)

    db.commit()
    db.refresh(prep)

    from app.tasks.interview_prep_task import run_interview_prep
    run_interview_prep.delay(application_id, str(current_user.id))

    return _prep_payload(prep)
