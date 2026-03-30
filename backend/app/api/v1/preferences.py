from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.preferences import PreferencesUpdate


router = APIRouter(prefix="/api/preferences", tags=["preferences"])


@router.put("", response_model=PreferencesUpdate)
def update_preferences(
    payload: PreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PreferencesUpdate:
    current_preferences = current_user.preferences_json if isinstance(current_user.preferences_json, dict) else {}
    cv_data = current_preferences.get("cv_data")

    updated_preferences = payload.model_dump(exclude_none=True)
    if isinstance(cv_data, dict):
        updated_preferences["cv_data"] = cv_data

    current_user.preferences_json = updated_preferences
    current_user.agent_active = bool(payload.targetRoles)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return payload
