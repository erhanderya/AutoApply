from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = Field(alias="DATABASE_URL")
    redis_url: str = Field(alias="REDIS_URL")
    secret_key: str = Field(alias="SECRET_KEY")
    access_token_expire_hours: int = Field(default=336, alias="ACCESS_TOKEN_EXPIRE_HOURS")
    openrouter_api_key: str | None = Field(default=None, alias="OPENROUTER_API_KEY")
    cv_refiner_model: str = Field(default="meta-llama/llama-3.1-8b-instruct:free", alias="CV_REFINER_MODEL")
    adzuna_app_id: str | None = Field(default=None, alias="ADZUNA_APP_ID")
    adzuna_app_key: str | None = Field(default=None, alias="ADZUNA_APP_KEY")
    adzuna_country: Literal["gb", "us", "de"] = Field(default="gb", alias="ADZUNA_COUNTRY")
    cors_origins_raw: str = Field(
        default="http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173",
        alias="CORS_ORIGINS",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]


settings = Settings()
