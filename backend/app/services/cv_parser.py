import asyncio
import json
import logging
import re
from pathlib import Path
from typing import Any

import pdfplumber
from docx import Document

from app.agents.llm import CrewAIConfigError, build_groq_cv_parser_llm
from app.core.config import settings

logger = logging.getLogger(__name__)

CV_PARSE_PROMPT = """
Analyze the CV text below and respond with JSON only.

Return exactly this shape:
{
  "full_name": "string",
  "email": "string",
  "phone": "string",
  "summary": "string",
  "skills": ["skill1", "skill2"],
  "languages": ["English"],
  "experience": [
    {
      "title": "string",
      "company": "string",
      "duration": "string",
      "description": "string"
    }
  ],
  "education": [
    {
      "degree": "string",
      "school": "string",
      "year": "string"
    }
  ]
}

CV Text:
__CV_TEXT__
""".strip()

KNOWN_SKILLS = [
    "python",
    "java",
    "javascript",
    "typescript",
    "react",
    "next.js",
    "node.js",
    "fastapi",
    "django",
    "flask",
    "sql",
    "postgresql",
    "mysql",
    "mongodb",
    "docker",
    "kubernetes",
    "aws",
    "azure",
    "gcp",
    "html",
    "css",
    "tailwind",
    "redux",
    "git",
    "github",
    "linux",
    "c#",
    ".net",
    "php",
    "laravel",
    "figma",
    "selenium",
    "playwright",
]


def extract_text_from_pdf(file_path: str | Path) -> str:
    with pdfplumber.open(str(file_path)) as pdf:
        return "\n".join((page.extract_text() or "").strip() for page in pdf.pages).strip()


def extract_text_from_docx(file_path: str | Path) -> str:
    document = Document(str(file_path))
    return "\n".join(paragraph.text.strip() for paragraph in document.paragraphs if paragraph.text.strip()).strip()


def extract_text_from_file(file_path: str | Path) -> str:
    path = Path(file_path)
    suffix = path.suffix.lower()

    if suffix == ".pdf":
        return extract_text_from_pdf(path)
    if suffix == ".docx":
        return extract_text_from_docx(path)
    raise ValueError(f"Unsupported file type: {suffix}")


def _strip_code_fences(raw: str) -> str:
    content = raw.strip()
    if content.startswith("```"):
        content = re.sub(r"^```[a-zA-Z0-9_-]*\s*", "", content)
        content = re.sub(r"\s*```$", "", content)
    return content.strip()


def _find_first_json_block(raw: str) -> str:
    cleaned = _strip_code_fences(raw)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and start < end:
        return cleaned[start : end + 1]
    return cleaned


def normalize_cv_payload(payload: dict[str, Any]) -> dict[str, Any]:
    experience = payload.get("experience") if isinstance(payload.get("experience"), list) else []
    education = payload.get("education") if isinstance(payload.get("education"), list) else []
    skills = payload.get("skills") if isinstance(payload.get("skills"), list) else []
    languages = payload.get("languages") if isinstance(payload.get("languages"), list) else []

    return {
        "full_name": str(payload.get("full_name") or payload.get("name") or "").strip(),
        "email": str(payload.get("email") or "").strip(),
        "phone": str(payload.get("phone") or "").strip(),
        "summary": str(payload.get("summary") or "").strip(),
        "skills": [str(skill).strip() for skill in skills if str(skill).strip()],
        "languages": [str(language).strip() for language in languages if str(language).strip()],
        "experience": [
            {
                "title": str(item.get("title") or "").strip(),
                "company": str(item.get("company") or "").strip(),
                "duration": str(item.get("duration") or "").strip(),
                "description": str(item.get("description") or "").strip(),
            }
            for item in experience
            if isinstance(item, dict)
        ],
        "education": [
            {
                "degree": str(item.get("degree") or "").strip(),
                "school": str(item.get("school") or "").strip(),
                "year": str(item.get("year") or "").strip(),
            }
            for item in education
            if isinstance(item, dict)
        ],
    }


def _fallback_summary(lines: list[str]) -> str:
    relevant = [line for line in lines[1:5] if "@" not in line][:2]
    summary = " ".join(relevant).strip()
    return summary[:280]


def _fallback_name(lines: list[str], email: str) -> str:
    if lines:
        first_line = lines[0].strip()
        if "@" not in first_line and len(first_line.split()) <= 6:
            return first_line

    if email:
        local_part = email.split("@", 1)[0]
        return " ".join(piece.capitalize() for piece in re.split(r"[._-]+", local_part) if piece)

    return ""


def _fallback_skills(cv_text: str) -> list[str]:
    found = [
        skill
        for skill in KNOWN_SKILLS
        if re.search(rf"(?<!\w){re.escape(skill)}(?!\w)", cv_text, flags=re.IGNORECASE)
    ]
    return sorted({skill.title() for skill in found})


def _fallback_education(lines: list[str]) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    for line in lines:
        lower = line.lower()
        if any(keyword in lower for keyword in ["university", "universitesi", "bachelor", "master", "degree"]):
            year_match = re.search(r"(19|20)\d{2}", line)
            results.append(
                {
                    "degree": line,
                    "school": line,
                    "year": year_match.group(0) if year_match else "",
                }
            )
        if len(results) >= 2:
            break
    return results


def _fallback_experience(lines: list[str]) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    for line in lines:
        if len(results) >= 3:
            break

        if re.search(r"(19|20)\d{2}", line) or "-" in line:
            results.append(
                {
                    "title": line,
                    "company": "",
                    "duration": line,
                    "description": "",
                }
            )
    return results


def fallback_parse_cv(cv_text: str) -> dict[str, Any]:
    lines = [line.strip() for line in cv_text.splitlines() if line.strip()]
    email_match = re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", cv_text, re.IGNORECASE)
    phone_match = re.search(r"(\+?\d[\d\s().-]{7,}\d)", cv_text)
    email = email_match.group(0) if email_match else ""

    return normalize_cv_payload(
        {
            "full_name": _fallback_name(lines, email),
            "email": email,
            "phone": phone_match.group(1).strip() if phone_match else "",
            "summary": _fallback_summary(lines),
            "skills": _fallback_skills(cv_text),
            "languages": [],
            "experience": _fallback_experience(lines),
            "education": _fallback_education(lines),
        }
    )


def _safe_json_load(raw: str) -> dict[str, Any] | None:
    try:
        maybe_json = json.loads(_find_first_json_block(raw))
    except json.JSONDecodeError:
        return None
    if isinstance(maybe_json, dict):
        return maybe_json
    return None


async def _crewai_groq_json(prompt: str) -> tuple[dict[str, Any] | None, str | None]:
    try:
        llm = build_groq_cv_parser_llm(settings.cv_parser_model, temperature=0)
    except CrewAIConfigError:
        return None, None

    try:
        raw = await asyncio.to_thread(
            llm.call,
            [{"role": "user", "content": prompt}],
        )
    except Exception:
        logger.warning("CrewAI Groq CV parser call failed", exc_info=True)
        return None, getattr(llm, "model", None)

    payload = _safe_json_load(str(raw))
    if payload is None:
        logger.warning("CrewAI Groq CV parser returned non-JSON content: %s", str(raw)[:400])
    return payload, getattr(llm, "model", None)


async def parse_cv_with_llm(cv_text: str) -> tuple[dict[str, Any], str, str | None]:
    if not settings.groq_api_key:
        logger.info("CV parser Groq key missing, falling back to heuristic parsing")
        return fallback_parse_cv(cv_text), "fallback_no_key", None

    parse_prompt = CV_PARSE_PROMPT.replace("__CV_TEXT__", cv_text[:6000])
    parsed_payload, parser_model = await _crewai_groq_json(parse_prompt)
    if parsed_payload is not None:
        logger.info("CV parser completed with standalone CrewAI Groq model '%s'", parser_model)
        return normalize_cv_payload(parsed_payload), "crewai_groq", parser_model

    logger.info("CV parser fell back to heuristic output after CrewAI Groq failure")
    return fallback_parse_cv(cv_text), "fallback_heuristic", parser_model


async def parse_cv_file(file_path: str | Path) -> tuple[dict[str, Any], str, str | None]:
    text = extract_text_from_file(file_path)
    if not text:
        return normalize_cv_payload({}), "empty_text", None
    return await parse_cv_with_llm(text)
