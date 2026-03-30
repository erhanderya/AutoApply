from celery import Celery
from celery.schedules import crontab

from app.core.config import settings


celery_app = Celery(
    "autoapply",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.scout_task"],
)

celery_app.conf.beat_schedule = {
    "scout-every-5-minutes": {
        "task": "scout.run_all_users",
        "schedule": crontab(minute="*/5"),
    }
}
