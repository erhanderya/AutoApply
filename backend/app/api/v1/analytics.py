from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.application import Application
from app.models.enums import ApplicationStatus
from app.models.user import User


router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _api_status(status_value: ApplicationStatus) -> str:
    if status_value == ApplicationStatus.reviewing:
        return "in_review"
    if status_value == ApplicationStatus.pending:
        return "applied"
    return status_value.value


@router.get("/summary")
def analytics_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    applications = db.scalars(
        select(Application).where(Application.user_id == current_user.id)
    ).all()

    total = len(applications)
    interviews = sum(1 for app in applications if app.status == ApplicationStatus.interview)
    non_applied = sum(1 for app in applications if _api_status(app.status) != "applied")
    response_rate = round((non_applied / total) * 100) if total else 0

    fit_scores = [int(app.fit_score) for app in applications if app.fit_score is not None]
    avg_fit_score = round(sum(fit_scores) / len(fit_scores)) if fit_scores else 0

    status_counts = {
        "applied": 0,
        "in_review": 0,
        "interview": 0,
        "offer": 0,
        "rejected": 0,
    }
    for app in applications:
        mapped = _api_status(app.status)
        if mapped in status_counts:
            status_counts[mapped] += 1

    today = datetime.now(timezone.utc).date()
    applications_per_day: list[dict[str, int | str]] = []
    for offset in range(13, -1, -1):
        day = today - timedelta(days=offset)
        count = 0
        for app in applications:
            ts = app.submitted_at or app.last_updated_at
            if ts and ts.date() == day:
                count += 1
        applications_per_day.append({"date": day.isoformat(), "count": count})

    distribution = {
        "0-20": 0,
        "21-40": 0,
        "41-60": 0,
        "61-80": 0,
        "81-100": 0,
    }
    for score in fit_scores:
        if score <= 20:
            distribution["0-20"] += 1
        elif score <= 40:
            distribution["21-40"] += 1
        elif score <= 60:
            distribution["41-60"] += 1
        elif score <= 80:
            distribution["61-80"] += 1
        else:
            distribution["81-100"] += 1

    return {
        "totalApplications": total,
        "responseRate": response_rate,
        "avgFitScore": avg_fit_score,
        "interviewsScheduled": interviews,
        "applicationsByStatus": status_counts,
        "applicationsPerDay": applications_per_day,
        "fitScoreDistribution": [{"range": bucket, "count": count} for bucket, count in distribution.items()],
    }
