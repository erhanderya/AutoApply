from __future__ import annotations

from mcp.server.fastmcp import FastMCP

from app.mcp.tools import extract_job_requirements


mcp = FastMCP("AutoApply Job Tools")


@mcp.tool(
    name="job.extract_requirements",
    description="Extract must-have, nice-to-have, tech stack, seniority, and keywords from a job description.",
)
def job_extract_requirements(job_description: str, job_title: str = "", company: str = "") -> dict[str, object]:
    """Extract structured hiring requirements from a job description."""
    return extract_job_requirements(job_description=job_description, job_title=job_title, company=company)


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
