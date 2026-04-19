from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class CompanyResearch(BaseModel):
    company_summary: str
    culture_keywords: list[str]
    products_or_services: list[str]
    recent_news: list[str]
    sources: list[str]


class InterviewQuestion(BaseModel):
    id: int
    category: Literal["behavioral", "technical", "culture_fit", "role_specific"]
    question: str
    focus: str


class InterviewQuestionList(BaseModel):
    questions: list[InterviewQuestion]


class StarAnswer(BaseModel):
    question_id: int
    situation: str
    task: str
    action: str
    result: str
    talking_points: list[str]


class AnswerList(BaseModel):
    answers: list[StarAnswer]
