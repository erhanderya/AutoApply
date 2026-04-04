from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class JobAnalysisItem(BaseModel):
    job_id: str
    fit_score: int = Field(ge=0, le=100)
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    cv_advice: list[str] = Field(default_factory=list)
    recommendation: Literal["apply", "skip"]
    rationale: str = ""


class BatchJobAnalysisOutput(BaseModel):
    jobs: list[JobAnalysisItem]


class TailoredWritingOutput(BaseModel):
    cv_summary: str
    cover_letter: str
