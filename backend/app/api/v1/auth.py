from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.core.security import create_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest
from app.schemas.user import UserRead


router = APIRouter(prefix="/api/auth", tags=["auth"])


def split_preferences(data: dict | None) -> tuple[dict | None, dict | None]:
    if not isinstance(data, dict):
        return None, None

    cv_data = data.get("cv_data")
    preferences = {key: value for key, value in data.items() if key != "cv_data"}
    return (preferences or None), (cv_data if isinstance(cv_data, dict) else None)


def to_user_read(user: User) -> UserRead:
    preferences, cv_data = split_preferences(user.preferences_json)
    return UserRead(
        id=user.id,
        email=user.email,
        preferences=preferences,
        cvParsed=bool(cv_data),
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    existing_user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")

    user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        preferences_json=None,
        agent_active=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return AuthResponse(access_token=create_token(user.id), user=to_user_read(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    return AuthResponse(access_token=create_token(user.id), user=to_user_read(user))


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> UserRead:
    return to_user_read(current_user)
