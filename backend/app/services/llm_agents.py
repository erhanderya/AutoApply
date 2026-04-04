from __future__ import annotations

from typing import Any

from app.agents.runtime import CrewAIRuntimeError, run_batch_analysis_crew, run_writer_crew


class LLMResponseError(RuntimeError):
    pass


def _clean_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    cleaned: list[str] = []
    seen: set[str] = set()
    for item in value:
        text = str(item).strip()
        lowered = text.lower()
        if not text or lowered in seen:
            continue
        seen.add(lowered)
        cleaned.append(text)
    return cleaned


def analyze_jobs_batch(
    jobs: list[dict[str, Any]],
    cv_data: dict[str, Any],
    callback=None,
) -> dict[str, dict[str, Any]]:
    try:
        output = run_batch_analysis_crew(jobs, cv_data, callback=callback)
    except CrewAIRuntimeError as exc:
        raise LLMResponseError(str(exc)) from exc

    normalized: dict[str, dict[str, Any]] = {}
    for item in output.jobs:
        normalized[item.job_id] = {
            "job_id": item.job_id,
            "fit_score": int(item.fit_score),
            "matched_skills": _clean_string_list(item.matched_skills),
            "missing_skills": _clean_string_list(item.missing_skills),
            "cv_advice": _clean_string_list(item.cv_advice),
            "recommendation": item.recommendation,
            "rationale": item.rationale.strip(),
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
        output = run_writer_crew(job, cv_data, analysis_payload, callback=callback)
    except CrewAIRuntimeError as exc:
        raise LLMResponseError(str(exc)) from exc

    return {
        "cv_summary": output.cv_summary.strip(),
        "cover_letter": output.cover_letter.strip(),
    }
