from __future__ import annotations

from abc import ABC, abstractmethod

import httpx
from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.job import Job


SCOUT_USER_AGENT = "AutoApply Scout/1.0"


def infer_work_type(location: str) -> str:
    normalized = (location or "").lower()
    if "remote" in normalized:
        return "remote"
    if "hybrid" in normalized:
        return "hybrid"
    return "onsite"


class BaseJobSource(ABC):
    source_name: str

    @abstractmethod
    async def fetch(self, prefs: dict) -> list[dict]:
        raise NotImplementedError

    def _target_roles(self, prefs: dict) -> list[str]:
        roles = prefs.get("targetRoles")
        if isinstance(roles, list):
            return [str(role).strip() for role in roles if str(role).strip()]

        legacy_role = str(prefs.get("targetRole") or "").strip()
        return [legacy_role] if legacy_role else []

    def _matches_role(self, title: str, roles: list[str]) -> bool:
        if not roles:
            return True

        normalized_title = (title or "").lower()
        return any(role.lower() in normalized_title for role in roles)

    def _matches_work_type(self, location: str, preferred_work_type: str | None) -> bool:
        if not preferred_work_type:
            return True
        return infer_work_type(location) == preferred_work_type


class RemoteOKSource(BaseJobSource):
    source_name = "remoteok"

    async def fetch(self, prefs: dict) -> list[dict]:
        preferred_work_type = prefs.get("workType")
        if preferred_work_type and preferred_work_type != "remote":
            return []

        target_roles = self._target_roles(prefs)
        salary_expectation = prefs.get("salaryExpectation")

        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                "https://remoteok.com/api",
                headers={"User-Agent": SCOUT_USER_AGENT},
            )
            response.raise_for_status()

        jobs = response.json()[1:]
        results: list[dict] = []

        for job in jobs:
            normalized = self._normalize(job)
            if not self._matches_role(normalized["title"], target_roles):
                continue
            if salary_expectation and (normalized.get("salary_max") or 0) and normalized["salary_max"] < salary_expectation:
                continue
            results.append(normalized)

        return results

    def _normalize(self, job: dict) -> dict:
        return {
            "title": job.get("position", "") or "Untitled role",
            "company": job.get("company", "") or "Unknown company",
            "location": "Remote",
            "apply_url": job.get("url", ""),
            "apply_type": "platform",
            "description": (job.get("description") or "")[:5000],
            "source": self.source_name,
            "salary_min": job.get("salary_min"),
            "salary_max": job.get("salary_max"),
        }


class AdzunaSource(BaseJobSource):
    source_name = "adzuna"

    COUNTRY_URLS = {
        "gb": "https://api.adzuna.com/v1/api/jobs/gb/search/1",
        "us": "https://api.adzuna.com/v1/api/jobs/us/search/1",
        "de": "https://api.adzuna.com/v1/api/jobs/de/search/1",
    }

    async def fetch(self, prefs: dict) -> list[dict]:
        if not settings.adzuna_app_id or not settings.adzuna_app_key:
            return []

        target_roles = self._target_roles(prefs)
        location = prefs.get("location")
        salary_expectation = prefs.get("salaryExpectation")
        preferred_work_type = prefs.get("workType")

        params = {
            "app_id": settings.adzuna_app_id,
            "app_key": settings.adzuna_app_key,
            "what": " OR ".join(target_roles) if target_roles else "",
            "results_per_page": 50,
        }
        if location:
            params["where"] = location
        if salary_expectation:
            params["salary_min"] = salary_expectation

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(self.COUNTRY_URLS[settings.adzuna_country], params=params)
            response.raise_for_status()

        results: list[dict] = []
        for job in response.json().get("results", []):
            normalized = self._normalize(job)
            if not self._matches_role(normalized["title"], target_roles):
                continue
            if not self._matches_work_type(normalized["location"], preferred_work_type):
                continue
            results.append(normalized)

        return results

    def _normalize(self, job: dict) -> dict:
        apply_url = job.get("redirect_url", "")
        return {
            "title": job.get("title", "") or "Untitled role",
            "company": (job.get("company") or {}).get("display_name", "") or "Unknown company",
            "location": (job.get("location") or {}).get("display_name", "") or "Location not specified",
            "apply_url": apply_url,
            "apply_type": "email" if "mailto:" in apply_url else "platform",
            "description": (job.get("description") or "")[:5000],
            "source": self.source_name,
            "salary_min": job.get("salary_min"),
            "salary_max": job.get("salary_max"),
        }


class JobFetcherService:
    def __init__(self) -> None:
        self.sources: list[BaseJobSource] = [
            RemoteOKSource(),
            AdzunaSource(),
        ]

    async def fetch_for_user(self, prefs: dict) -> list[dict]:
        all_jobs: list[dict] = []

        for source in self.sources:
            try:
                jobs = await source.fetch(prefs)
                all_jobs.extend(jobs)
            except httpx.HTTPError:
                continue

        return self._deduplicate(all_jobs)

    def _deduplicate(self, jobs: list[dict]) -> list[dict]:
        unique_jobs: list[dict] = []
        seen_urls: set[str] = set()

        for job in jobs:
            apply_url = job.get("apply_url")
            if not apply_url or apply_url in seen_urls:
                continue
            seen_urls.add(apply_url)
            unique_jobs.append(job)

        if not unique_jobs:
            return []

        db = SessionLocal()
        try:
            existing_urls = set(
                db.scalars(select(Job.apply_url).where(Job.apply_url.in_(seen_urls))).all()
            )
        finally:
            db.close()

        return [job for job in unique_jobs if job["apply_url"] not in existing_urls]
