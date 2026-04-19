from __future__ import annotations

import logging
from typing import Any

from langgraph.graph import END, StateGraph
from sqlalchemy import select

from app.core.database import SessionLocal
from app.interview.nodes import answer_node, question_node, research_node
from app.interview.state import InterviewPrepState
from app.models.application import Application
from app.models.job import Job
from app.models.user import User

logger = logging.getLogger(__name__)

_graph_builder = StateGraph(InterviewPrepState)
_graph_builder.add_node("research_node", research_node)
_graph_builder.add_node("questions_node", question_node)
_graph_builder.add_node("answers_node", answer_node)
_graph_builder.set_entry_point("research_node")
_graph_builder.add_edge("research_node", "questions_node")
_graph_builder.add_edge("questions_node", "answers_node")
_graph_builder.add_edge("answers_node", END)

interview_prep_graph = _graph_builder.compile()


def run_interview_prep_graph(
    application_id: str,
    user_id: str,
    prep_id: str = "",
) -> dict[str, Any]:
    """Load context from DB and run the full interview prep pipeline."""
    db = SessionLocal()
    try:
        from uuid import UUID

        app_uuid = UUID(application_id)
        user_uuid = UUID(user_id)

        application = db.scalar(
            select(Application).where(
                Application.id == app_uuid,
                Application.user_id == user_uuid,
            )
        )
        if application is None:
            raise ValueError(f"Application {application_id} not found for user {user_id}.")

        job = db.get(Job, application.job_id)
        user = db.get(User, application.user_id)
        if job is None or user is None:
            raise ValueError("Interview prep context is incomplete: job or user not found.")

        preferences = user.preferences_json if isinstance(user.preferences_json, dict) else {}
        cv_data = preferences.get("cv_data")
        if not isinstance(cv_data, dict):
            raise ValueError("CV data not found. Please upload your CV before interview prep.")

        initial_state: InterviewPrepState = {
            "job": {
                "title": job.title,
                "company": job.company,
                "location": job.location or "",
                "description": (job.description or "")[:3000],
                "apply_url": job.apply_url,
            },
            "cv_data": cv_data,
            "research": {},
            "questions": [],
            "answers": [],
            "user_id": user_id,
            "application_id": application_id,
            "prep_id": prep_id,
            "errors": [],
        }
    finally:
        db.close()

    final_state: dict[str, Any] = interview_prep_graph.invoke(initial_state)
    return final_state
