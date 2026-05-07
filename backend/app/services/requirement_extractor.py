from __future__ import annotations

import json
import re
from typing import Any

from app.agents.schemas import JobRequirements


class RequirementExtractionError(RuntimeError):
    pass


SYSTEM_PROMPT = """You extract structured job requirements from job descriptions.
Return raw JSON only. Do not include markdown, code fences, headings, or commentary."""

USER_PROMPT_TEMPLATE = """Extract hiring requirements from this job posting.

Job title: {job_title}
Company: {company}

Job description:
{job_description}

Return exactly this JSON shape:
{{
  "must_have": ["hard requirements explicitly required for the role"],
  "nice_to_have": ["preferred or bonus qualifications"],
  "tech_stack": ["programming languages, frameworks, libraries, databases, platforms, cloud tools, or methodologies"],
  "seniority": "intern|junior|mid|senior|lead|manager|unspecified",
  "keywords": ["short ATS/search keywords from the posting"]
}}

Rules:
- Use only the provided job posting.
- Do not infer unstated technologies or credentials.
- Keep each item short and specific.
- If a category is not present, return an empty array.
- Use "unspecified" for seniority when it is not clear.
- Return at most 20 keywords.
"""


def _extract_json_fragment(raw: str) -> str:
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if len(lines) >= 3:
            text = "\n".join(lines[1:-1]).strip()

    match = re.search(r"(\{.*\})", text, re.DOTALL)
    if match:
        return match.group(1)
    return text


def _message_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                text = item.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return "\n".join(parts)
    return str(content or "")


def _call_extractor_llm(job_description: str, job_title: str = "", company: str = "") -> str:
    from app.agents.llm import build_openrouter_llm
    from app.core.config import settings

    llm = build_openrouter_llm(settings.analyzer_model, temperature=0)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": USER_PROMPT_TEMPLATE.format(
                job_title=job_title or "Not provided",
                company=company or "Not provided",
                job_description=job_description[:6000],
            ),
        },
    ]
    return _message_text(llm.call(messages))


def normalize_requirements(payload: Any) -> JobRequirements:
    if isinstance(payload, JobRequirements):
        return payload
    if not isinstance(payload, dict):
        payload = {}
    return JobRequirements.model_validate(payload)


def extract_requirements(job_description: str, job_title: str = "", company: str = "") -> JobRequirements:
    description = str(job_description or "").strip()
    if not description:
        return JobRequirements()

    try:
        raw_output = _call_extractor_llm(description, str(job_title or ""), str(company or ""))
        payload = json.loads(_extract_json_fragment(raw_output))
    except Exception as exc:
        raise RequirementExtractionError(f"Requirement extraction failed: {exc}") from exc

    return normalize_requirements(payload)
