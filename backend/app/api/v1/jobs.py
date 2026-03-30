from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.job import Job
from app.models.user import User


router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def infer_work_type(location: str) -> str:
    normalized = (location or "").lower()
    if "remote" in normalized:
        return "remote"
    if "hybrid" in normalized:
        return "hybrid"
    return "onsite"


def to_job_payload(job: Job) -> dict:
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
        "description": job.description,
        "scrapedAt": job.scraped_at.isoformat() if job.scraped_at else "",
        "fitScore": None,
    }


@router.get("")
def get_jobs(
    search: str | None = Query(default=None),
    workType: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    _ = current_user
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

    return {
        "jobs": [to_job_payload(job) for job in jobs],
        "total": int(total),
        "page": page,
    }
