from __future__ import annotations

import json
import logging

from langchain_core.messages import HumanMessage, SystemMessage

from app.core.config import settings
from app.interview.llm import build_interview_llm
from app.interview.schemas import AnswerList, CompanyResearch, InterviewQuestionList
from app.interview.state import InterviewPrepState
from app.services.agent_events import publish_agent_action

logger = logging.getLogger(__name__)

_RESEARCH_SYSTEM = """\
You are a company research analyst. Given web search results and/or your knowledge, produce a concise structured analysis \
of the company. Respond ONLY with raw JSON matching the provided schema, no markdown or code fences."""

_RESEARCH_USER = """\
Company name: {company}
Job title: {title}

Search results:
{search_results}

Return a JSON object with this exact shape:
{{
  "company_summary": "2-3 sentence overview of the company",
  "culture_keywords": ["keyword1", "keyword2"],
  "products_or_services": ["product/service 1"],
  "recent_news": ["notable item 1", "notable item 2"],
  "sources": ["url1", "url2"]
}}"""

_QUESTION_SYSTEM = """\
You are an expert technical interviewer. Generate role-specific interview questions based on the job and candidate profile. \
Respond ONLY with raw JSON, no markdown or code fences."""

_QUESTION_USER = """\
Job title: {title}
Company: {company}
Job description excerpt: {description}

Candidate profile:
{cv_profile}

Company research summary: {research_summary}

Generate exactly {count} interview questions covering:
- ~4 behavioral (STAR format)
- ~3 technical (skills and tools in the JD)
- ~2 role_specific (specific to this exact role)
- ~1 culture_fit (about company values/culture)

Return JSON in this exact shape:
{{
  "questions": [
    {{
      "id": 1,
      "category": "behavioral",
      "question": "Tell me about a time...",
      "focus": "Why this question is relevant for the role"
    }}
  ]
}}"""

_ANSWER_SYSTEM = """\
You are a career coach who writes STAR-format interview answers. \
Use ONLY facts present in the candidate CV — never invent employers, metrics, technologies, or experiences. \
Respond ONLY with raw JSON, no markdown or code fences."""

_ANSWER_USER = """\
Candidate CV data:
{cv_data}

Job: {title} at {company}

Interview questions:
{questions}

Write a STAR answer for each question. Return JSON in this exact shape:
{{
  "answers": [
    {{
      "question_id": 1,
      "situation": "Brief context from the candidate's real experience",
      "task": "What was required",
      "action": "Specific actions taken",
      "result": "Measurable outcome or learning",
      "talking_points": ["key point 1", "key point 2"]
    }}
  ]
}}"""


def _run_tavily_search(company: str, title: str) -> str:
    """Run Tavily searches and return concatenated result text. Returns empty string if unavailable."""
    if not settings.tavily_api_key:
        return ""
    try:
        from langchain_tavily import TavilySearch  # type: ignore[import-untyped]
        tool = TavilySearch(
            max_results=settings.tavily_max_results,
            tavily_api_key=settings.tavily_api_key,
        )
        queries = [
            f"{company} company culture values",
            f"{company} products services overview",
            f"{company} {title} interview",
        ]
        snippets: list[str] = []
        for query in queries:
            try:
                results = tool.invoke(query)
                if isinstance(results, list):
                    for r in results:
                        content = r.get("content", "") if isinstance(r, dict) else str(r)
                        if content:
                            snippets.append(content[:400])
                elif isinstance(results, str):
                    snippets.append(results[:400])
            except Exception as exc:
                logger.warning("Tavily query failed: %s", exc)
        return "\n\n".join(snippets)
    except ImportError:
        logger.warning("langchain-tavily not installed; skipping web search.")
        return ""
    except Exception as exc:
        logger.warning("Tavily search failed: %s", exc)
        return ""


def research_node(state: InterviewPrepState) -> InterviewPrepState:
    job = state["job"]
    company = job.get("company", "")
    title = job.get("title", "")
    user_id = state["user_id"]
    application_id = state.get("application_id")

    publish_agent_action(user_id, "interview_coach", f"Researching {company}...", application_id)

    search_results = _run_tavily_search(company, title)
    if not search_results:
        search_results = f"No live search results available. Use general knowledge about {company}."

    llm = build_interview_llm(settings.interview_research_model, temperature=0)
    structured_llm = llm.with_structured_output(CompanyResearch)

    prompt = [
        SystemMessage(content=_RESEARCH_SYSTEM),
        HumanMessage(
            content=_RESEARCH_USER.format(
                company=company,
                title=title,
                search_results=search_results[:3000],
            )
        ),
    ]

    try:
        research: CompanyResearch = structured_llm.invoke(prompt)
        research_dict = research.model_dump()
    except Exception as exc:
        logger.warning("Research node structured output failed: %s", exc)
        research_dict = {
            "company_summary": f"Research unavailable for {company}: {exc}",
            "culture_keywords": [],
            "products_or_services": [],
            "recent_news": [],
            "sources": [],
        }

    publish_agent_action(
        user_id, "interview_coach",
        f"Company research completed for {company}",
        application_id,
    )
    return {**state, "research": research_dict}


def question_node(state: InterviewPrepState) -> InterviewPrepState:
    job = state["job"]
    cv_data = state["cv_data"]
    research = state.get("research", {})
    user_id = state["user_id"]
    application_id = state.get("application_id")
    count = settings.interview_question_count

    publish_agent_action(
        user_id, "interview_coach",
        f"Generating {count} interview questions for {job.get('title')}...",
        application_id,
    )

    cv_profile = json.dumps(
        {
            "summary": cv_data.get("summary", ""),
            "skills": cv_data.get("skills", []),
            "experience": cv_data.get("experience", []),
        },
        ensure_ascii=True,
    )

    llm = build_interview_llm(settings.interview_question_model, temperature=0.3)
    structured_llm = llm.with_structured_output(InterviewQuestionList)

    prompt = [
        SystemMessage(content=_QUESTION_SYSTEM),
        HumanMessage(
            content=_QUESTION_USER.format(
                title=job.get("title", ""),
                company=job.get("company", ""),
                description=(job.get("description", "") or "")[:1500],
                cv_profile=cv_profile,
                research_summary=research.get("company_summary", ""),
                count=count,
            )
        ),
    ]

    try:
        question_list: InterviewQuestionList = structured_llm.invoke(prompt)
        questions = [q.model_dump() for q in question_list.questions]
    except Exception as exc:
        logger.warning("Question node structured output failed: %s", exc)
        questions = []

    publish_agent_action(
        user_id, "interview_coach",
        f"Generated {len(questions)} interview questions",
        application_id,
    )
    return {**state, "questions": questions}


def answer_node(state: InterviewPrepState) -> InterviewPrepState:
    job = state["job"]
    cv_data = state["cv_data"]
    questions = state.get("questions", [])
    user_id = state["user_id"]
    application_id = state.get("application_id")

    publish_agent_action(
        user_id, "interview_coach",
        "Writing STAR answers based on your CV...",
        application_id,
    )

    cv_json = json.dumps(
        {
            "summary": cv_data.get("summary", ""),
            "skills": cv_data.get("skills", []),
            "experience": cv_data.get("experience", []),
            "education": cv_data.get("education", []),
        },
        ensure_ascii=True,
    )

    questions_text = "\n".join(
        f'{q["id"]}. [{q["category"]}] {q["question"]}' for q in questions
    )

    llm = build_interview_llm(settings.interview_answer_model, temperature=0.2)
    structured_llm = llm.with_structured_output(AnswerList)

    prompt = [
        SystemMessage(content=_ANSWER_SYSTEM),
        HumanMessage(
            content=_ANSWER_USER.format(
                cv_data=cv_json,
                title=job.get("title", ""),
                company=job.get("company", ""),
                questions=questions_text,
            )
        ),
    ]

    try:
        answer_list: AnswerList = structured_llm.invoke(prompt)
        answers = [a.model_dump() for a in answer_list.answers]
    except Exception as exc:
        logger.warning("Answer node structured output failed: %s", exc)
        answers = []

    publish_agent_action(
        user_id, "interview_coach",
        f"STAR answers ready ({len(answers)} answers generated)",
        application_id,
    )
    return {**state, "answers": answers}
