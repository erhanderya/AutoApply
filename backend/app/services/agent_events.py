from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from functools import lru_cache
from uuid import UUID

import redis
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.agent_log import AgentLog


logger = logging.getLogger(__name__)
CHANNEL_PREFIX = "agent_events"


@lru_cache(maxsize=1)
def get_redis_client() -> redis.Redis:
    return redis.Redis.from_url(settings.redis_url, decode_responses=True)


def _publish(user_id: str, payload: dict) -> None:
    try:
        get_redis_client().publish(f"{CHANNEL_PREFIX}:{user_id}", json.dumps(payload))
    except redis.RedisError:
        logger.warning("Failed to publish websocket event", exc_info=True)


def publish_agent_status(user_id: str, agent_name: str, status: str) -> None:
    _publish(
        user_id,
        {
            "type": "agent_status",
            "payload": {
                "agentName": agent_name,
                "status": status,
            },
        },
    )


def publish_agent_action(
    user_id: str,
    agent_name: str,
    action: str,
    application_id: str | None = None,
    job_id: str | None = None,
) -> None:
    _publish(
        user_id,
        {
            "type": "agent_action",
            "payload": {
                "agentName": agent_name,
                "action": action,
                "applicationId": application_id,
                "jobId": job_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        },
    )


def publish_application_update(
    user_id: str,
    application_id: str,
    new_status: str,
    job_id: str | None = None,
    message: str | None = None,
) -> None:
    _publish(
        user_id,
        {
            "type": "application_update",
            "payload": {
                "applicationId": application_id,
                "jobId": job_id,
                "newStatus": new_status,
                "message": message,
            },
        },
    )


def add_agent_log(
    db: Session,
    application_id: UUID | str,
    agent_name: str,
    action: str,
    payload: dict | None = None,
) -> AgentLog:
    log = AgentLog(
        application_id=application_id,
        agent_name=agent_name,
        action=action,
        payload_json=payload,
    )
    db.add(log)
    db.flush()
    return log
