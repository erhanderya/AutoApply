from __future__ import annotations

import sys
import types
import unittest
from unittest.mock import patch

from app.agents.schemas import JobRequirements
from app.mcp.tools import extract_job_requirements
from app.services.requirement_extractor import normalize_requirements


class RequirementSchemaTests(unittest.TestCase):
    def test_normalizes_requirement_lists_and_seniority(self) -> None:
        requirements = normalize_requirements(
            {
                "must_have": ["Python", " python ", "", "FastAPI"],
                "nice_to_have": "not-a-list",
                "tech_stack": ["AWS", "aws", None],
                "seniority": "Principal",
                "keywords": [f"kw-{index}" for index in range(25)],
            }
        )

        self.assertEqual(requirements.must_have, ["Python", "FastAPI"])
        self.assertEqual(requirements.nice_to_have, [])
        self.assertEqual(requirements.tech_stack, ["AWS"])
        self.assertEqual(requirements.seniority, "unspecified")
        self.assertEqual(len(requirements.keywords), 20)

    def test_mcp_tool_wrapper_returns_expected_shape(self) -> None:
        fake_requirements = JobRequirements(
            must_have=["Python"],
            nice_to_have=["Kubernetes"],
            tech_stack=["FastAPI"],
            seniority="senior",
            keywords=["backend"],
        )

        with patch("app.mcp.tools.extract_requirements", return_value=fake_requirements):
            payload = extract_job_requirements("Build APIs", job_title="Backend Engineer", company="Acme")

        self.assertEqual(
            payload,
            {
                "must_have": ["Python"],
                "nice_to_have": ["Kubernetes"],
                "tech_stack": ["FastAPI"],
                "seniority": "senior",
                "keywords": ["backend"],
            },
        )


class AnalyzerNormalizationTests(unittest.TestCase):
    def test_analyze_jobs_batch_preserves_requirements_payload(self) -> None:
        from app.agents.errors import CrewAIRuntimeError
        from app.agents.schemas import BatchJobAnalysisOutput, JobAnalysisItem

        fake_runtime = types.ModuleType("app.agents.runtime")

        def fake_run_batch_analysis_crew(jobs, cv_data, callback=None):
            return BatchJobAnalysisOutput(
                jobs=[
                    JobAnalysisItem(
                        job_id=jobs[0]["job_id"],
                        fit_score=82,
                        matched_skills=["Python"],
                        missing_skills=[],
                        cv_advice=["Highlight FastAPI"],
                        recommendation="apply",
                        rationale="Strong backend match.",
                        requirements=JobRequirements(
                            must_have=["Python"],
                            nice_to_have=[],
                            tech_stack=["FastAPI"],
                            seniority="senior",
                            keywords=["api"],
                        ),
                    )
                ]
            )

        fake_runtime.CrewAIRuntimeError = CrewAIRuntimeError
        fake_runtime.run_batch_analysis_crew = fake_run_batch_analysis_crew
        previous_runtime = sys.modules.get("app.agents.runtime")
        sys.modules["app.agents.runtime"] = fake_runtime
        try:
            from app.services.llm_agents import analyze_jobs_batch

            output = analyze_jobs_batch([{"job_id": "job-1"}], {"skills": ["Python"]})
        finally:
            if previous_runtime is None:
                sys.modules.pop("app.agents.runtime", None)
            else:
                sys.modules["app.agents.runtime"] = previous_runtime

        self.assertEqual(output["job-1"]["requirements"]["must_have"], ["Python"])
        self.assertEqual(output["job-1"]["requirements"]["tech_stack"], ["FastAPI"])
        self.assertEqual(output["job-1"]["requirements"]["seniority"], "senior")


if __name__ == "__main__":
    unittest.main()
