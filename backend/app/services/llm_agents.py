from __future__ import annotations

import json
import re
from typing import Any

import httpx

from app.core.config import settings


class LLMResponseError(RuntimeError):
    pass


def _candidate_models(raw: str) -> list[str]:
    models = [item.strip() for item in str(raw or "").split(",") if item.strip()]
    return models


def _extract_json_fragment(raw: str) -> str:
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if len(lines) >= 3:
            text = "\n".join(lines[1:-1]).strip()

    match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
    if match:
        return match.group(1)
    return text


def _list_free_models() -> list[str]:
    try:
        response = httpx.get(
            f"{settings.openrouter_base_url}/models",
            timeout=30,
            headers={
                "Authorization": f"Bearer {settings.openrouter_api_key}",
                "Content-Type": "application/json",
            },
        )
        response.raise_for_status()
        payload = response.json()
    except Exception:
        return []

    models = payload.get("data", []) if isinstance(payload, dict) else []
    free_ids: list[str] = []
    for item in models:
        if not isinstance(item, dict):
            continue
        model_id = str(item.get("id") or "").strip()
        if model_id.endswith(":free"):
            free_ids.append(model_id)
    return free_ids


def _call_openrouter(model: str, system_prompt: str, user_prompt: str, temperature: float = 0.1) -> str:
    if not settings.openrouter_api_key:
        raise LLMResponseError("OPENROUTER_API_KEY is not configured.")

    try:
        response = httpx.post(
            f"{settings.openrouter_base_url}/chat/completions",
            timeout=60,
            headers={
                "Authorization": f"Bearer {settings.openrouter_api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": settings.openrouter_site_url,
                "X-Title": settings.openrouter_app_title,
            },
            json={
                "model": model,
                "temperature": temperature,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            },
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        body = exc.response.text[:500]
        raise LLMResponseError(f"OpenRouter returned HTTP {exc.response.status_code}: {body}") from exc
    except httpx.HTTPError as exc:
        raise LLMResponseError(f"OpenRouter request failed: {exc}") from exc

    try:
        data = response.json()
        return str(data["choices"][0]["message"]["content"])
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise LLMResponseError("OpenRouter response did not contain a valid message payload.") from exc


def _call_with_model_fallback(
    model_setting: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.1,
) -> str:
    candidates = _candidate_models(model_setting)
    last_error: Exception | None = None
    tried: list[str] = []

    for candidate in candidates:
        tried.append(candidate)
        try:
            return _call_openrouter(candidate, system_prompt, user_prompt, temperature=temperature)
        except LLMResponseError as exc:
            last_error = exc
            if "http 404" in str(exc).lower() and "no endpoints found" in str(exc).lower():
                continue
            raise

    for candidate in _list_free_models():
        if candidate in tried:
            continue
        tried.append(candidate)
        try:
            return _call_openrouter(candidate, system_prompt, user_prompt, temperature=temperature)
        except LLMResponseError as exc:
            last_error = exc
            if "http 404" in str(exc).lower() and "no endpoints found" in str(exc).lower():
                continue
            raise
        if len(tried) >= 8:
            break

    if last_error is not None:
        raise LLMResponseError(f"No available model from candidates: {', '.join(tried)}. Last error: {last_error}") from last_error
    raise LLMResponseError("No analyzer/writer model candidates configured.")


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


def _normalize_analysis(job_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    raw_score = payload.get("fit_score", 0)
    try:
        fit_score = int(raw_score)
    except (TypeError, ValueError):
        fit_score = 0
    fit_score = max(0, min(100, fit_score))

    recommendation = str(payload.get("recommendation") or "").strip().lower()
    if recommendation not in {"apply", "skip"}:
        recommendation = "apply" if fit_score >= settings.fit_score_threshold else "skip"

    return {
        "job_id": job_id,
        "fit_score": fit_score,
        "matched_skills": _clean_string_list(payload.get("matched_skills")),
        "missing_skills": _clean_string_list(payload.get("missing_skills")),
        "cv_advice": _clean_string_list(payload.get("cv_advice") or payload.get("recommendations")),
        "recommendation": recommendation,
        "rationale": str(payload.get("rationale") or payload.get("notes") or "").strip(),
    }


def analyze_jobs_batch(jobs: list[dict[str, Any]], cv_data: dict[str, Any]) -> dict[str, dict[str, Any]]:
    system_prompt = (
        "You are a job fit analyzer. Return only valid JSON. "
        "Score each job independently using the provided CV data."
    )
    user_prompt = json.dumps(
        {
            "instructions": {
                "output": [
                    {
                        "job_id": "string",
                        "fit_score": "integer 0-100",
                        "matched_skills": ["string"],
                        "missing_skills": ["string"],
                        "cv_advice": ["short, job-specific CV improvement"],
                        "recommendation": "apply or skip",
                        "rationale": "short explanation",
                    }
                ],
                "rules": [
                    "Return one item for every input job.",
                    "Do not include jobs not present in input.",
                    "Keep cv_advice concise and specific to the job.",
                ],
            },
            "candidate": {
                "summary": cv_data.get("summary", ""),
                "skills": cv_data.get("skills", []),
                "experience": cv_data.get("experience", []),
                "education": cv_data.get("education", []),
                "languages": cv_data.get("languages", []),
            },
            "jobs": jobs,
        },
        ensure_ascii=True,
    )

    raw = _call_with_model_fallback(settings.analyzer_model, system_prompt, user_prompt, temperature=0)
    parsed = json.loads(_extract_json_fragment(raw))

    items: list[Any] | None = None
    if isinstance(parsed, list):
        items = parsed
    elif isinstance(parsed, dict):
        if isinstance(parsed.get("jobs"), list):
            items = parsed.get("jobs")
        elif isinstance(parsed.get("results"), list):
            items = parsed.get("results")
        elif any(key in parsed for key in ("fit_score", "matched_skills", "missing_skills", "recommendation", "rationale", "notes")):
            items = [parsed]
        else:
            # Some models wrap the actual list in the first dict value.
            for value in parsed.values():
                if isinstance(value, list):
                    items = value
                    break

    if not isinstance(items, list):
        raise LLMResponseError("Analyzer response was not a JSON array.")

    normalized: dict[str, dict[str, Any]] = {}
    for item in items:
        if not isinstance(item, dict):
            continue
        job_id = str(item.get("job_id") or "").strip()
        if not job_id and len(jobs) == 1:
            job_id = jobs[0]["job_id"]
        if not job_id:
            continue
        normalized[job_id] = _normalize_analysis(job_id, item)

    missing_ids = [job["job_id"] for job in jobs if job["job_id"] not in normalized]
    if missing_ids:
        raise LLMResponseError(f"Analyzer response missing jobs: {', '.join(missing_ids)}")

    return normalized


def write_application_materials(
    job: dict[str, Any],
    cv_data: dict[str, Any],
    analysis_payload: dict[str, Any],
) -> dict[str, str]:
    system_prompt = "You write concise, ATS-friendly application materials. Return only valid JSON."
    user_prompt = json.dumps(
        {
            "instructions": {
                "output": {
                    "cv_summary": "3-4 sentence summary tailored to the role",
                    "cover_letter": "3 short paragraphs",
                },
                "rules": [
                    "Be truthful to the CV.",
                    "Do not invent experience.",
                    "Address missing skills carefully without fabricating them.",
                ],
            },
            "job": job,
            "analysis": analysis_payload,
            "candidate": {
                "name": cv_data.get("name", ""),
                "summary": cv_data.get("summary", ""),
                "skills": cv_data.get("skills", []),
                "experience": cv_data.get("experience", []),
                "education": cv_data.get("education", []),
            },
        },
        ensure_ascii=True,
    )

    raw = _call_with_model_fallback(settings.writer_model, system_prompt, user_prompt, temperature=0.2)
    parsed = json.loads(_extract_json_fragment(raw))
    if not isinstance(parsed, dict):
        raise LLMResponseError("Writer response was not a JSON object.")

    return {
        "cv_summary": str(parsed.get("cv_summary") or "").strip(),
        "cover_letter": str(parsed.get("cover_letter") or "").strip(),
    }
