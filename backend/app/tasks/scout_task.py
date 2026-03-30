from __future__ import annotations

import asyncio

from celery.utils.log import get_task_logger
from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.enums import ApplyType, JobSource
from app.models.job import Job
from app.models.user import User
from app.services.job_fetcher import JobFetcherService
from app.tasks.celery_app import celery_app


logger = get_task_logger(__name__)


def extract_target_roles(preferences: dict) -> list[str]:
    roles = preferences.get("targetRoles")
    if isinstance(roles, list):
        return [str(role).strip() for role in roles if str(role).strip()]

    legacy_role = str(preferences.get("targetRole") or "").strip()
    return [legacy_role] if legacy_role else []


@celery_app.task(name="scout.run_all_users")
def run_scout_all_users() -> dict[str, int]:
    db = SessionLocal()
    try:
        user_ids = db.scalars(select(User.id).where(User.agent_active.is_(True))).all()
    finally:
        db.close()

    queued = 0
    for user_id in user_ids:
        run_scout_for_user.delay(str(user_id))
        queued += 1

    return {"queued_users": queued}


@celery_app.task(name="scout.run_for_user", bind=True, max_retries=2, default_retry_delay=60)
def run_scout_for_user(self, user_id: str) -> dict[str, int]:
    db = SessionLocal()

    try:
        user = db.scalar(select(User).where(User.id == user_id))
        if user is None:
            return {"new_jobs": 0}

        preferences = user.preferences_json if isinstance(user.preferences_json, dict) else {}
        target_roles = extract_target_roles(preferences)

        if not target_roles:
            user.agent_active = False
            db.add(user)
            db.commit()
            return {"new_jobs": 0}

        preferences = {**preferences, "targetRoles": target_roles}

        fetcher = JobFetcherService()
        new_jobs = asyncio.run(fetcher.fetch_for_user(preferences))

        for job_data in new_jobs:
            job = Job(
                title=job_data["title"],
                company=job_data["company"],
                location=job_data["location"],
                source=JobSource(job_data["source"]),
                apply_url=job_data["apply_url"],
                apply_type=ApplyType(job_data["apply_type"]),
                description=job_data["description"],
                salary_min=job_data.get("salary_min"),
                salary_max=job_data.get("salary_max"),
            )
            db.add(job)

        db.commit()
        return {"new_jobs": len(new_jobs)}
    except Exception as exc:
        db.rollback()
        logger.exception("Scout run failed for user %s", user_id)
        raise self.retry(exc=exc)
    finally:
        db.close()
