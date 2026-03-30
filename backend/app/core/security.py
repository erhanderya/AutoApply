from datetime import datetime, timedelta, timezone
from uuid import UUID

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE = timedelta(hours=settings.access_token_expire_hours)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_token(user_id: UUID | str) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + ACCESS_TOKEN_EXPIRE,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> str:
    return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])["sub"]


def safe_decode_token(token: str) -> str | None:
    try:
        return decode_token(token)
    except JWTError:
        return None
