from celery.result import AsyncResult
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_user
from app.models.user import User
from app.tasks.celery_app import celery_app
from app.tasks.scout_task import run_scout_for_user


router = APIRouter(prefix="/api/scout", tags=["scout"])


def extract_target_roles(preferences: dict) -> list[str]:
    roles = preferences.get("targetRoles")
    if isinstance(roles, list):
        return [str(role).strip() for role in roles if str(role).strip()]

    legacy_role = str(preferences.get("targetRole") or "").strip()
    return [legacy_role] if legacy_role else []


@router.post("/trigger", status_code=status.HTTP_202_ACCEPTED)
def trigger_scout(current_user: User = Depends(get_current_user)) -> dict[str, str]:
    preferences = current_user.preferences_json if isinstance(current_user.preferences_json, dict) else {}
    if not extract_target_roles(preferences):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Save at least one target role before triggering Scout.",
        )

    task = run_scout_for_user.delay(str(current_user.id))
    return {"taskId": task.id, "status": "queued"}


@router.get("/status/{task_id}")
def scout_status(task_id: str, current_user: User = Depends(get_current_user)) -> dict[str, object]:
    _ = current_user
    result = AsyncResult(task_id, app=celery_app)
    return {
        "taskId": task_id,
        "state": result.state,
        "result": str(result.result) if result.ready() and result.result is not None else None,
    }
