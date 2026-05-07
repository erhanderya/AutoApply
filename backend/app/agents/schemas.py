from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


SENIORITY_VALUES = {"intern", "junior", "mid", "senior", "lead", "manager", "unspecified"}


def clean_string_list(value: object, *, limit: int | None = None) -> list[str]:
    if not isinstance(value, list):
        return []

    cleaned: list[str] = []
    seen: set[str] = set()
    for item in value:
        if item is None:
            continue
        text = str(item).strip()
        lowered = text.lower()
        if not text or lowered in seen:
            continue
        seen.add(lowered)
        cleaned.append(text)
        if limit is not None and len(cleaned) >= limit:
            break
    return cleaned


class JobRequirements(BaseModel):
    must_have: list[str] = Field(default_factory=list)
    nice_to_have: list[str] = Field(default_factory=list)
    tech_stack: list[str] = Field(default_factory=list)
    seniority: Literal["intern", "junior", "mid", "senior", "lead", "manager", "unspecified"] = "unspecified"
    keywords: list[str] = Field(default_factory=list)

    @field_validator("must_have", "nice_to_have", "tech_stack", mode="before")
    @classmethod
    def normalize_string_lists(cls, value: object) -> list[str]:
        return clean_string_list(value)

    @field_validator("keywords", mode="before")
    @classmethod
    def normalize_keywords(cls, value: object) -> list[str]:
        return clean_string_list(value, limit=20)

    @field_validator("seniority", mode="before")
    @classmethod
    def normalize_seniority(cls, value: object) -> str:
        normalized = str(value or "").strip().lower()
        return normalized if normalized in SENIORITY_VALUES else "unspecified"


class JobAnalysisItem(BaseModel):
    job_id: str
    fit_score: int = Field(ge=0, le=100)
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    cv_advice: list[str] = Field(default_factory=list)
    recommendation: Literal["apply", "skip"]
    rationale: str = ""
    requirements: JobRequirements


class BatchJobAnalysisOutput(BaseModel):
    jobs: list[JobAnalysisItem]


class TailoredWritingOutput(BaseModel):
    cv_summary: str
    cover_letter: str
