from __future__ import annotations

from app.services.requirement_extractor import extract_requirements


def extract_job_requirements(job_description: str, job_title: str = "", company: str = "") -> dict[str, object]:
    requirements = extract_requirements(job_description=job_description, job_title=job_title, company=company)
    return requirements.model_dump()
