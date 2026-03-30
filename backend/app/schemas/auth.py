from pydantic import BaseModel, EmailStr

from app.schemas.user import UserRead


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    user: UserRead
