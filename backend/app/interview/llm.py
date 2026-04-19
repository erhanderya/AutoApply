from __future__ import annotations

from langchain_openai import ChatOpenAI

from app.core.config import settings


class InterviewLLMConfigError(RuntimeError):
    pass


def build_interview_llm(model_setting: str, temperature: float = 0) -> ChatOpenAI:
    """Return a LangChain ChatOpenAI pointed at OpenRouter."""
    if not settings.openrouter_api_key:
        raise InterviewLLMConfigError("OPENROUTER_API_KEY is not configured.")

    model = model_setting.removeprefix("openrouter/")

    return ChatOpenAI(
        model=model,
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
        temperature=temperature,
        model_kwargs={
            "response_format": {"type": "json_object"},
            "extra_headers": {
                "HTTP-Referer": settings.openrouter_site_url,
                "X-Title": settings.openrouter_app_title,
            },
        },
    )
