from app.schemas.cv import CVData, CVUploadResponse
from app.schemas.preferences import PreferencesUpdate
from app.schemas.application import ApplicationRead
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest
from app.schemas.job import JobRead
from app.schemas.user import UserRead

__all__ = [
    "ApplicationRead",
    "AuthResponse",
    "CVData",
    "CVUploadResponse",
    "JobRead",
    "LoginRequest",
    "PreferencesUpdate",
    "RegisterRequest",
    "UserRead",
]
