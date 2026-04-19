from __future__ import annotations

from typing import TypedDict


class InterviewPrepState(TypedDict):
    job: dict
    cv_data: dict
    research: dict
    questions: list
    answers: list
    user_id: str
    application_id: str
    prep_id: str
    errors: list[str]
