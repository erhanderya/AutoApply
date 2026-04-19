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
    openrouter_base_url: str = Field(default="https://openrouter.ai/api/v1", alias="OPENROUTER_BASE_URL")
    openrouter_site_url: str = Field(default="https://autoapply.local", alias="OPENROUTER_SITE_URL")
    openrouter_app_title: str = Field(default="AutoApply", alias="OPENROUTER_APP_TITLE")
    groq_api_key: str | None = Field(default=None, alias="GROQ_API_KEY")
    groq_base_url: str = Field(default="https://api.groq.com/openai/v1", alias="GROQ_BASE_URL")
    cv_parser_model: str = Field(default="openai/gpt-oss-20b", alias="CV_PARSER_MODEL")
    cv_refiner_model: str = Field(default="qwen/qwen3.6-plus-preview:free", alias="CV_REFINER_MODEL")
    analyzer_model: str = Field(default="qwen/qwen3.6-plus-preview:free", alias="ANALYZER_MODEL")
    writer_model: str = Field(default="qwen/qwen3.6-plus-preview:free", alias="WRITER_MODEL")
    fit_score_threshold: int = Field(default=75, alias="FIT_SCORE_THRESHOLD")
    analyze_batch_size: int = Field(default=10, alias="ANALYZE_BATCH_SIZE")
    tavily_api_key: str | None = Field(default=None, alias="TAVILY_API_KEY")
    interview_research_model: str = Field(default="qwen/qwen3.6-plus-preview:free", alias="INTERVIEW_RESEARCH_MODEL")
    interview_question_model: str = Field(default="qwen/qwen3.6-plus-preview:free", alias="INTERVIEW_QUESTION_MODEL")
    interview_answer_model: str = Field(default="openai/gpt-4o-mini", alias="INTERVIEW_ANSWER_MODEL")
    interview_question_count: int = Field(default=10, alias="INTERVIEW_QUESTION_COUNT")
    tavily_max_results: int = Field(default=5, alias="TAVILY_MAX_RESULTS")
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
