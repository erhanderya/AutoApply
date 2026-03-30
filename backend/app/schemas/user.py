from typing import Any
from uuid import UUID

from pydantic import BaseModel, EmailStr


class UserRead(BaseModel):
    id: UUID
    email: EmailStr
    preferences: dict[str, Any] | None = None
    cvParsed: bool = False
