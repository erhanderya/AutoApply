from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from celery.utils.log import get_task_logger
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.application import Application
from app.models.enums import ApplicationStatus
from app.models.job import Job
from app.models.user import User
from app.services.agent_events import (
    add_agent_log,
    publish_agent_action,
    publish_agent_status,
    publish_application_update,
)
from app.services.llm_agents import LLMResponseError, analyze_jobs_batch, write_application_materials
from app.tasks.celery_app import celery_app


logger = get_task_logger(__name__)

RUN_IDLE = "idle"
RUN_QUEUED = "queued"
RUN_RUNNING = "running"
RUN_COMPLETED = "completed"
RUN_FAILED = "failed"


def _get_cv_data(user: User) -> dict:
    preferences = user.preferences_json if isinstance(user.preferences_json, dict) else {}
    cv_data = preferences.get("cv_data")
    if not isinstance(cv_data, dict):
        raise ValueError("Upload your CV before running the analyzer.")
    return cv_data


def _parse_job_ids(job_ids: list[str]) -> list[UUID]:
    parsed: list[UUID] = []
    for job_id in job_ids:
        try:
            parsed.append(UUID(job_id))
        except ValueError as exc:
            raise ValueError(f"Invalid job id: {job_id}") from exc
    return parsed


def _select_latest_pending_by_job(applications: list[Application]) -> dict[UUID, Application]:
    latest: dict[UUID, Application] = {}
    for application in applications:
        if application.job_id not in latest:
            latest[application.job_id] = application
    return latest


def _application_uuid(application_id: str) -> UUID:
    return UUID(application_id)


def _user_uuid(user_id: str) -> UUID:
    return UUID(user_id)


def _job_payload(job: Job) -> dict[str, object]:
    return {
        "job_id": str(job.id),
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "apply_url": job.apply_url,
        "description": (job.description or "")[:1500],
    }


def _mark_analysis_failure(db: Session, user_id: str, application_ids: list[str], message: str) -> None:
    for application_id in application_ids:
        application = db.get(Application, _application_uuid(application_id))
        if application is None:
            continue
        application.analysis_status = RUN_FAILED
        application.writer_status = RUN_IDLE
        application.last_updated_at = datetime.now(timezone.utc)
        db.add(application)
        add_agent_log(db, application.id, "analyzer", f"Analysis failed: {message}")
        publish_agent_action(user_id, "analyzer", f"Analysis failed: {message}", str(application.id), str(application.job_id))
        publish_application_update(user_id, str(application.id), application.status.value, str(application.job_id), message)
    db.commit()


@celery_app.task(name="analysis.run_manual", bind=True, max_retries=1, default_retry_delay=90)
def run_manual_job_analysis(self, user_id: str, job_ids: list[str]) -> dict[str, int]:
    db = SessionLocal()
    application_ids: list[str] = []

    try:
        if not job_ids:
            raise ValueError("At least one job must be selected.")
        if len(job_ids) > settings.analyze_batch_size:
            raise ValueError(f"You can analyze up to {settings.analyze_batch_size} jobs at once.")

        user = db.get(User, _user_uuid(user_id))
        if user is None:
            raise ValueError("User not found.")

        cv_data = _get_cv_data(user)
        job_uuid_ids = _parse_job_ids(job_ids)

        jobs = db.scalars(select(Job).where(Job.id.in_(job_uuid_ids))).all()
        jobs_by_id = {str(job.id): job for job in jobs}
        missing_job_ids = [job_id for job_id in job_ids if job_id not in jobs_by_id]
        if missing_job_ids:
            raise ValueError(f"Jobs not found: {', '.join(missing_job_ids)}")

        ordered_jobs = [jobs_by_id[job_id] for job_id in job_ids]
        existing_pending = db.scalars(
            select(Application)
            .where(
                Application.user_id == user.id,
                Application.job_id.in_(job_uuid_ids),
                Application.status == ApplicationStatus.pending,
            )
            .order_by(Application.last_updated_at.desc())
        ).all()
        pending_by_job = _select_latest_pending_by_job(existing_pending)

        draft_applications: dict[str, Application] = {}
        now = datetime.now(timezone.utc)
        for job in ordered_jobs:
            application = pending_by_job.get(job.id)
            if application is None:
                application = Application(
                    user_id=user.id,
                    job_id=job.id,
                    status=ApplicationStatus.pending,
                    analysis_status=RUN_QUEUED,
                    writer_status=RUN_IDLE,
                )
                db.add(application)
                db.flush()
            else:
                application.analysis_payload_json = None
                application.fit_score = None
                application.analysis_status = RUN_QUEUED
                application.writer_status = RUN_IDLE
                application.cv_variant_text = None
                application.cover_letter_text = None
                application.last_updated_at = now
                db.add(application)
                db.flush()

            draft_applications[str(job.id)] = application
            application_ids.append(str(application.id))
            add_agent_log(db, application.id, "analyzer", f"Queued manual analysis for {job.title} at {job.company}")
            publish_agent_action(
                user_id,
                "analyzer",
                f"Queued manual analysis for {job.title} at {job.company}",
                str(application.id),
                str(job.id),
            )
            publish_application_update(user_id, str(application.id), application.status.value, str(job.id), "Analysis queued")
        db.commit()

        publish_agent_status(user_id, "analyzer", RUN_RUNNING)

        for job in ordered_jobs:
            application = draft_applications[str(job.id)]
            application.analysis_status = RUN_RUNNING
            application.last_updated_at = now
            db.add(application)
            add_agent_log(db, application.id, "analyzer", f"Analyzing fit for {job.title} at {job.company}")
            publish_agent_action(
                user_id,
                "analyzer",
                f"Analyzing fit for {job.title} at {job.company}",
                str(application.id),
                str(job.id),
            )
        db.commit()
        publish_agent_action(
            user_id,
            "analyzer",
            f"Dispatching batch analyzer request for {len(ordered_jobs)} jobs",
        )

        analysis_results = analyze_jobs_batch([_job_payload(job) for job in ordered_jobs], cv_data)

        queued_writer_application_ids: list[str] = []
        for job in ordered_jobs:
            application = draft_applications[str(job.id)]
            analysis_payload = analysis_results[str(job.id)]
            application.analysis_payload_json = analysis_payload
            application.fit_score = int(analysis_payload["fit_score"])
            application.analysis_status = RUN_COMPLETED
            application.writer_status = RUN_QUEUED if application.fit_score >= settings.fit_score_threshold else RUN_IDLE
            application.last_updated_at = datetime.now(timezone.utc)
            db.add(application)
            add_agent_log(
                db,
                application.id,
                "analyzer",
                f"Fit score calculated: {application.fit_score}/100",
                analysis_payload,
            )
            publish_agent_action(
                user_id,
                "analyzer",
                f"Fit score calculated: {application.fit_score}/100 for {job.title}",
                str(application.id),
                str(job.id),
            )
            publish_application_update(
                user_id,
                str(application.id),
                application.status.value,
                str(job.id),
                f"Fit score updated to {application.fit_score}",
            )
            if application.fit_score >= settings.fit_score_threshold:
                queued_writer_application_ids.append(str(application.id))
        db.commit()

        for application_id in queued_writer_application_ids:
            run_writer_for_application.delay(application_id, user_id)

        publish_agent_status(user_id, "analyzer", RUN_IDLE)
        if not queued_writer_application_ids:
            publish_agent_status(user_id, "writer", RUN_IDLE)

        return {
            "processed_jobs": len(ordered_jobs),
            "queued_writer_jobs": len(queued_writer_application_ids),
        }
    except ValueError as exc:
        db.rollback()
        if application_ids:
            _mark_analysis_failure(db, user_id, application_ids, str(exc))
        publish_agent_status(user_id, "analyzer", RUN_FAILED)
        raise
    except LLMResponseError as exc:
        db.rollback()
        if application_ids:
            _mark_analysis_failure(db, user_id, application_ids, str(exc))
        publish_agent_status(user_id, "analyzer", RUN_FAILED)
        logger.exception("Analyzer LLM failure for user %s", user_id)
        message = str(exc).lower()
        if (
            "not configured" in message
            or "http 401" in message
            or "http 403" in message
            or ("http 404" in message and "no endpoints found" in message)
        ):
            raise
        raise self.retry(exc=exc)
    except Exception as exc:
        db.rollback()
        if application_ids:
            _mark_analysis_failure(db, user_id, application_ids, "Unexpected analysis failure.")
        publish_agent_status(user_id, "analyzer", RUN_FAILED)
        logger.exception("Manual analysis failed for user %s", user_id)
        raise self.retry(exc=exc)
    finally:
        db.close()


@celery_app.task(name="writer.run_for_application", bind=True, max_retries=1, default_retry_delay=90)
def run_writer_for_application(self, application_id: str, user_id: str) -> dict[str, str]:
    db = SessionLocal()

    try:
        application = db.scalar(
            select(Application)
            .where(Application.id == _application_uuid(application_id), Application.user_id == _user_uuid(user_id))
        )
        if application is None:
            raise ValueError("Application not found.")

        job = db.get(Job, application.job_id)
        user = db.get(User, application.user_id)
        if job is None or user is None:
            raise ValueError("Writer context is incomplete.")

        cv_data = _get_cv_data(user)
        analysis_payload = application.analysis_payload_json
        if not isinstance(analysis_payload, dict):
            raise ValueError("Analysis result is missing.")

        publish_agent_status(user_id, "writer", RUN_RUNNING)

        application.writer_status = RUN_RUNNING
        application.last_updated_at = datetime.now(timezone.utc)
        db.add(application)
        add_agent_log(db, application.id, "writer", f"Generating tailored materials for {job.title} at {job.company}")
        db.commit()

        publish_agent_action(
            user_id,
            "writer",
            f"Generating tailored materials for {job.title} at {job.company}",
            str(application.id),
            str(job.id),
        )

        writing = write_application_materials(_job_payload(job), cv_data, analysis_payload)

        application.cv_variant_text = writing["cv_summary"]
        application.cover_letter_text = writing["cover_letter"]
        application.writer_status = RUN_COMPLETED
        application.last_updated_at = datetime.now(timezone.utc)
        db.add(application)
        add_agent_log(db, application.id, "writer", "Generated CV summary and cover letter", writing)
        db.commit()

        publish_agent_action(
            user_id,
            "writer",
            "Generated CV summary and cover letter",
            str(application.id),
            str(job.id),
        )
        publish_application_update(
            user_id,
            str(application.id),
            application.status.value,
            str(job.id),
            "Writer completed application materials",
        )
        publish_agent_status(user_id, "writer", RUN_IDLE)
        return {"application_id": str(application.id), "status": application.writer_status}
    except ValueError:
        db.rollback()
        publish_agent_status(user_id, "writer", RUN_FAILED)
        raise
    except LLMResponseError as exc:
        db.rollback()
        application = db.get(Application, _application_uuid(application_id))
        if application is not None:
            application.writer_status = RUN_FAILED
            application.last_updated_at = datetime.now(timezone.utc)
            db.add(application)
            add_agent_log(db, application.id, "writer", f"Writer failed: {exc}")
            db.commit()
            publish_agent_action(user_id, "writer", f"Writer failed: {exc}", str(application.id), str(application.job_id))
        publish_agent_status(user_id, "writer", RUN_FAILED)
        logger.exception("Writer LLM failure for application %s", application_id)
        message = str(exc).lower()
        if (
            "not configured" in message
            or "http 401" in message
            or "http 403" in message
            or ("http 404" in message and "no endpoints found" in message)
        ):
            raise
        raise self.retry(exc=exc)
    except Exception as exc:
        db.rollback()
        application = db.get(Application, _application_uuid(application_id))
        if application is not None:
            application.writer_status = RUN_FAILED
            application.last_updated_at = datetime.now(timezone.utc)
            db.add(application)
            add_agent_log(db, application.id, "writer", "Writer failed unexpectedly.")
            db.commit()
            publish_agent_action(user_id, "writer", "Writer failed unexpectedly.", str(application.id), str(application.job_id))
        publish_agent_status(user_id, "writer", RUN_FAILED)
        logger.exception("Writer task failed for application %s", application_id)
        raise self.retry(exc=exc)
    finally:
        db.close()
