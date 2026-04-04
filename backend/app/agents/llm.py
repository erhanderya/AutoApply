from __future__ import annotations

from functools import lru_cache

import httpx
from crewai import LLM

from app.core.config import settings


class CrewAIConfigError(RuntimeError):
    pass


def _candidate_models(raw: str) -> list[str]:
    return [item.strip() for item in str(raw or "").split(",") if item.strip()]


def _strip_openrouter_prefix(model: str) -> str:
    return model.removeprefix("openrouter/")


def _with_openrouter_prefix(model: str) -> str:
    return model if model.startswith("openrouter/") else f"openrouter/{model}"


@lru_cache(maxsize=1)
def _model_catalog() -> set[str]:
    if not settings.openrouter_api_key:
        return set()

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
        return set()

    items = payload.get("data", []) if isinstance(payload, dict) else []
    return {
        str(item.get("id") or "").strip()
        for item in items
        if isinstance(item, dict) and str(item.get("id") or "").strip()
    }


def resolve_openrouter_model(model_setting: str) -> str:
    candidates = [_strip_openrouter_prefix(model) for model in _candidate_models(model_setting)]
    catalog = _model_catalog()

    for candidate in candidates:
        if not catalog or candidate in catalog:
            return candidate

    for candidate in sorted(catalog):
        if candidate.endswith(":free"):
            return candidate

    if candidates:
        return candidates[0]

    raise CrewAIConfigError("No CrewAI model candidates configured.")


def build_openrouter_llm(model_setting: str, temperature: float) -> LLM:
    if not settings.openrouter_api_key:
        raise CrewAIConfigError("OPENROUTER_API_KEY is not configured.")

    model = _with_openrouter_prefix(resolve_openrouter_model(model_setting))
    return LLM(
        model=model,
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
        temperature=temperature,
        response_format={"type": "json_object"},
        extra_headers={
            "HTTP-Referer": settings.openrouter_site_url,
            "X-Title": settings.openrouter_app_title,
        },
    )
