from __future__ import annotations

from typing import Any

from app.agents.errors import CrewAIRuntimeError
from app.agents.schemas import clean_string_list


class LLMResponseError(RuntimeError):
    pass


def analyze_jobs_batch(
    jobs: list[dict[str, Any]],
    cv_data: dict[str, Any],
    callback=None,
) -> dict[str, dict[str, Any]]:
    try:
        from app.agents.runtime import run_batch_analysis_crew

        output = run_batch_analysis_crew(jobs, cv_data, callback=callback)
    except CrewAIRuntimeError as exc:
        raise LLMResponseError(str(exc)) from exc

    normalized: dict[str, dict[str, Any]] = {}
    for item in output.jobs:
        normalized[item.job_id] = {
            "job_id": item.job_id,
            "fit_score": int(item.fit_score),
            "matched_skills": clean_string_list(item.matched_skills),
            "missing_skills": clean_string_list(item.missing_skills),
            "cv_advice": clean_string_list(item.cv_advice),
            "recommendation": item.recommendation,
            "rationale": item.rationale.strip(),
            "requirements": item.requirements.model_dump(),
        }

    missing_ids = [job["job_id"] for job in jobs if job["job_id"] not in normalized]
    if missing_ids:
        raise LLMResponseError(f"CrewAI analyzer output missing jobs: {', '.join(missing_ids)}")

    return normalized


def write_application_materials(
    job: dict[str, Any],
    cv_data: dict[str, Any],
    analysis_payload: dict[str, Any],
    callback=None,
) -> dict[str, str]:
    try:
        from app.agents.runtime import run_writer_crew

        output = run_writer_crew(job, cv_data, analysis_payload, callback=callback)
    except CrewAIRuntimeError as exc:
        raise LLMResponseError(str(exc)) from exc

    return {
        "cv_summary": output.cv_summary.strip(),
        "cover_letter": output.cover_letter.strip(),
    }
