from __future__ import annotations

import uuid
from datetime import datetime, timezone

from celery.utils.log import get_task_logger

from app.core.database import SessionLocal
from app.models.interview_prep import InterviewPrep
from app.services.agent_events import (
    add_agent_log,
    publish_agent_action,
    publish_agent_status,
    publish_application_update,
)
from app.tasks.celery_app import celery_app

logger = get_task_logger(__name__)

RUNNING = "running"
COMPLETED = "completed"
FAILED = "failed"


def _upsert_prep(db, application_id: str, status: str) -> InterviewPrep:
    from uuid import UUID
    from sqlalchemy import select

    app_uuid = UUID(application_id)
    prep = db.scalar(select(InterviewPrep).where(InterviewPrep.application_id == app_uuid))
    if prep is None:
        prep = InterviewPrep(
            id=uuid.uuid4(),
            application_id=app_uuid,
            status=status,
        )
        db.add(prep)
    else:
        prep.status = status
        prep.error_message = None
        prep.last_updated_at = datetime.now(timezone.utc)
        db.add(prep)
    db.flush()
    return prep


@celery_app.task(name="interview_prep.run", bind=True, max_retries=1, default_retry_delay=120)
def run_interview_prep(self, application_id: str, user_id: str) -> dict[str, str]:
    db = SessionLocal()
    prep_id: str = ""

    try:
        prep = _upsert_prep(db, application_id, RUNNING)
        prep_id = str(prep.id)
        add_agent_log(db, application_id, "interview_coach", "Interview prep pipeline started")
        db.commit()

        publish_agent_status(user_id, "interview_coach", RUNNING)
        publish_agent_action(
            user_id,
            "interview_coach",
            "Interview prep started: researching company, generating questions and answers...",
            application_id,
        )

        from app.interview.graph import run_interview_prep_graph

        final_state = run_interview_prep_graph(application_id, user_id, prep_id=prep_id)

        db2 = SessionLocal()
        try:
            from uuid import UUID
            from sqlalchemy import select

            prep2 = db2.scalar(
                select(InterviewPrep).where(InterviewPrep.id == UUID(prep_id))
            )
            if prep2 is not None:
                prep2.company_research_json = final_state.get("research") or {}
                prep2.questions_json = final_state.get("questions") or []
                prep2.answers_json = final_state.get("answers") or []
                prep2.status = COMPLETED
                prep2.error_message = None
                prep2.last_updated_at = datetime.now(timezone.utc)
                db2.add(prep2)
                add_agent_log(
                    db2,
                    application_id,
                    "interview_coach",
                    "Interview prep completed",
                    {
                        "questions_count": len(prep2.questions_json or []),
                        "answers_count": len(prep2.answers_json or []),
                    },
                )
                db2.commit()
        finally:
            db2.close()

        publish_agent_status(user_id, "interview_coach", "idle")
        publish_agent_action(
            user_id,
            "interview_coach",
            "Interview prep completed — questions and STAR answers are ready.",
            application_id,
        )
        publish_application_update(
            user_id,
            application_id,
            "interview",
            message="Interview prep ready",
        )

        return {"prep_id": prep_id, "status": COMPLETED}

    except Exception as exc:
        logger.exception("Interview prep failed for application %s", application_id)

        db3 = SessionLocal()
        try:
            if prep_id:
                from uuid import UUID
                from sqlalchemy import select

                prep3 = db3.scalar(
                    select(InterviewPrep).where(InterviewPrep.id == UUID(prep_id))
                )
                if prep3 is not None:
                    prep3.status = FAILED
                    prep3.error_message = str(exc)[:2000]
                    prep3.last_updated_at = datetime.now(timezone.utc)
                    db3.add(prep3)
                    add_agent_log(
                        db3, application_id, "interview_coach", f"Interview prep failed: {exc}"
                    )
                    db3.commit()
        finally:
            db3.close()

        publish_agent_status(user_id, "interview_coach", FAILED)
        publish_agent_action(
            user_id, "interview_coach", f"Interview prep failed: {exc}", application_id
        )

        raise self.retry(exc=exc)
    finally:
        db.close()
