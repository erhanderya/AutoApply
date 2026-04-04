from __future__ import annotations

import json
import re
from typing import Any, Callable

from crewai import Agent, Crew, Process, Task
from pydantic import BaseModel

from app.agents.config_loader import get_agent_config, get_task_config
from app.agents.llm import CrewAIConfigError, build_openrouter_llm
from app.agents.schemas import BatchJobAnalysisOutput, TailoredWritingOutput
from app.core.config import settings


TaskCallback = Callable[[str, str], None] | None


class CrewAIRuntimeError(RuntimeError):
    pass


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


def _render_template(value: Any, context: dict[str, Any]) -> Any:
    if isinstance(value, str):
        rendered = value
        for key, replacement in context.items():
            rendered = rendered.replace(f"{{{key}}}", str(replacement))
        return rendered
    if isinstance(value, list):
        return [_render_template(item, context) for item in value]
    if isinstance(value, dict):
        return {key: _render_template(item, context) for key, item in value.items()}
    return value


def _iter_output_candidates(value: Any, seen: set[int] | None = None):
    if value is None:
        return

    if seen is None:
        seen = set()

    if not isinstance(value, (str, bytes, bytearray, int, float, bool)):
        object_id = id(value)
        if object_id in seen:
            return
        seen.add(object_id)

    yield value

    if isinstance(value, bytes):
        try:
            yield value.decode("utf-8")
        except UnicodeDecodeError:
            return
        return

    if isinstance(value, (str, bytearray, int, float, bool)):
        return

    for attr_name in ("pydantic", "json_dict", "raw", "output", "result"):
        attr_value = getattr(value, attr_name, None)
        if attr_value is not None:
            yield from _iter_output_candidates(attr_value, seen)

    tasks_output = getattr(value, "tasks_output", None)
    if isinstance(tasks_output, list):
        for item in tasks_output:
            yield from _iter_output_candidates(item, seen)

    if hasattr(value, "model_dump"):
        try:
            yield from _iter_output_candidates(value.model_dump(), seen)
        except Exception:
            pass

    if hasattr(value, "to_dict"):
        try:
            yield from _iter_output_candidates(value.to_dict(), seen)
        except Exception:
            pass

    if isinstance(value, dict):
        for item in value.values():
            yield from _iter_output_candidates(item, seen)
        return

    if isinstance(value, list):
        for item in value:
            yield from _iter_output_candidates(item, seen)


def _build_agent(config_name: str, llm) -> Agent:
    config = get_agent_config(config_name)
    return Agent(
        role=str(config["role"]),
        goal=str(config["goal"]),
        backstory=str(config["backstory"]),
        allow_delegation=bool(config.get("allow_delegation", False)),
        verbose=bool(config.get("verbose", False)),
        llm=llm,
    )


def _coerce_output(raw_output: Any, output_model: type[BaseModel]) -> BaseModel:
    if isinstance(raw_output, output_model):
        return raw_output
    if isinstance(raw_output, dict):
        return _normalize_payload_for_model(raw_output, output_model)
    if hasattr(raw_output, "model_dump"):
        return _normalize_payload_for_model(raw_output.model_dump(), output_model)
    if hasattr(raw_output, "json_dict") and isinstance(raw_output.json_dict, dict):
        return _normalize_payload_for_model(raw_output.json_dict, output_model)
    if hasattr(raw_output, "pydantic") and raw_output.pydantic is not None:
        payload = raw_output.pydantic
        if isinstance(payload, output_model):
            return payload
        if hasattr(payload, "model_dump"):
            return _normalize_payload_for_model(payload.model_dump(), output_model)
    if hasattr(raw_output, "raw") and isinstance(raw_output.raw, str):
        return _normalize_payload_for_model(json.loads(_extract_json_fragment(raw_output.raw)), output_model)
    if hasattr(raw_output, "to_dict"):
        payload = raw_output.to_dict()
        if isinstance(payload, dict):
            return _normalize_payload_for_model(payload, output_model)
    if isinstance(raw_output, str):
        return _normalize_payload_for_model(json.loads(_extract_json_fragment(raw_output)), output_model)
    raise CrewAIRuntimeError("CrewAI task output could not be converted into the expected schema.")


def _normalize_payload_for_model(payload: Any, output_model: type[BaseModel]) -> BaseModel:
    normalized = payload

    if output_model is BatchJobAnalysisOutput:
        if isinstance(payload, list):
            normalized = {"jobs": payload}
        elif isinstance(payload, dict):
            if isinstance(payload.get("jobs"), list):
                normalized = {"jobs": payload["jobs"]}
            elif isinstance(payload.get("results"), list):
                normalized = {"jobs": payload["results"]}
            elif isinstance(payload.get("data"), list):
                normalized = {"jobs": payload["data"]}
            elif any(
                key in payload
                for key in ("job_id", "fit_score", "matched_skills", "missing_skills", "recommendation", "rationale", "notes")
            ):
                normalized = {"jobs": [payload]}
            else:
                for value in payload.values():
                    if isinstance(value, list):
                        normalized = {"jobs": value}
                        break

    if output_model is TailoredWritingOutput and isinstance(payload, dict):
        if isinstance(payload.get("output"), dict):
            normalized = payload["output"]
        elif isinstance(payload.get("result"), dict):
            normalized = payload["result"]

    return output_model.model_validate(normalized)


def _run_single_task_crew(
    *,
    agent_name: str,
    task_name: str,
    task_context: dict[str, Any],
    llm,
    output_model: type[BaseModel],
    callback: TaskCallback = None,
) -> BaseModel:
    task_config = _render_template(get_task_config(task_name), task_context)
    configured_agent_name = str(task_config.pop("agent", agent_name))
    agent = _build_agent(configured_agent_name, llm)

    def _task_callback(task_output) -> None:
        if callback is None:
            return
        for candidate in _iter_output_candidates(task_output):
            if isinstance(candidate, str) and candidate.strip():
                callback(task_name, candidate)
                return
        callback(task_name, str(task_output))

    task = Task(
        description=str(task_config["description"]),
        expected_output=str(task_config["expected_output"]),
        agent=agent,
        output_json=output_model,
        markdown=bool(task_config.get("markdown", False)),
        callback=_task_callback if callback is not None else None,
    )
    crew = Crew(
        agents=[agent],
        tasks=[task],
        process=Process.sequential,
        verbose=bool(task_config.get("verbose", False)),
    )

    try:
        result = crew.kickoff()
    except CrewAIConfigError as exc:
        raise CrewAIRuntimeError(str(exc)) from exc
    except Exception as exc:
        raise CrewAIRuntimeError(f"CrewAI execution failed for task '{task_name}': {exc}") from exc

    candidate_outputs: list[Any] = []
    for source in (task.output, result):
        candidate_outputs.extend(list(_iter_output_candidates(source)))

    parse_errors: list[str] = []
    for output in candidate_outputs:
        if output is None:
            continue
        try:
            return _coerce_output(output, output_model)
        except Exception as exc:
            parse_errors.append(f"{type(output).__name__}: {exc}")
            continue

    debug_preview = ""
    for output in candidate_outputs:
        text = str(output).strip()
        if text:
            debug_preview = text[:500]
            break

    if callback is not None and debug_preview:
        callback(task_name, f"Structured parse fallback failed. Preview: {debug_preview}")

    if parse_errors:
        raise CrewAIRuntimeError(
            f"CrewAI task '{task_name}' completed without a structured output. Parse attempts: {' | '.join(parse_errors[:5])}"
        )
    raise CrewAIRuntimeError(f"CrewAI task '{task_name}' completed without a structured output.")


def run_batch_analysis_crew(
    jobs: list[dict[str, Any]],
    cv_data: dict[str, Any],
    callback: TaskCallback = None,
) -> BatchJobAnalysisOutput:
    try:
        llm = build_openrouter_llm(settings.analyzer_model, temperature=0)
        task_context = {
            "job_count": len(jobs),
            "fit_score_threshold": settings.fit_score_threshold,
            "candidate_profile_json": json.dumps(
                {
                    "summary": cv_data.get("summary", ""),
                    "skills": cv_data.get("skills", []),
                    "experience": cv_data.get("experience", []),
                    "education": cv_data.get("education", []),
                    "languages": cv_data.get("languages", []),
                },
                ensure_ascii=True,
            ),
            "jobs_json": json.dumps(jobs, ensure_ascii=True),
        }
        return _run_single_task_crew(
            agent_name="analyzer",
            task_name="batch_job_analysis",
            task_context=task_context,
            llm=llm,
            output_model=BatchJobAnalysisOutput,
            callback=callback,
        )
    except CrewAIConfigError as exc:
        raise CrewAIRuntimeError(str(exc)) from exc


def run_writer_crew(
    job: dict[str, Any],
    cv_data: dict[str, Any],
    analysis_payload: dict[str, Any],
    callback: TaskCallback = None,
) -> TailoredWritingOutput:
    try:
        llm = build_openrouter_llm(settings.writer_model, temperature=0.2)
        task_context = {
            "candidate_profile_json": json.dumps(
                {
                    "name": cv_data.get("name", ""),
                    "summary": cv_data.get("summary", ""),
                    "skills": cv_data.get("skills", []),
                    "experience": cv_data.get("experience", []),
                    "education": cv_data.get("education", []),
                },
                ensure_ascii=True,
            ),
            "job_json": json.dumps(job, ensure_ascii=True),
            "analysis_json": json.dumps(analysis_payload, ensure_ascii=True),
        }
        return _run_single_task_crew(
            agent_name="writer",
            task_name="tailored_application_writing",
            task_context=task_context,
            llm=llm,
            output_model=TailoredWritingOutput,
            callback=callback,
        )
    except CrewAIConfigError as exc:
        raise CrewAIRuntimeError(str(exc)) from exc
