from typing import Literal

from pydantic import BaseModel, Field, field_validator


WorkType = Literal["remote", "hybrid", "onsite"]


class PreferencesUpdate(BaseModel):
    targetRoles: list[str] = Field(default_factory=list)
    location: str | None = None
    salaryExpectation: int | None = Field(default=None, ge=0)
    workType: WorkType | None = None

    @field_validator("targetRoles", mode="before")
    @classmethod
    def ensure_roles_list(cls, value: object) -> list[str]:
        if value is None:
            return []
        if isinstance(value, str):
            return [value]
        if isinstance(value, list):
            return value
        raise ValueError("targetRoles must be a list of strings")

    @field_validator("targetRoles")
    @classmethod
    def normalize_roles(cls, value: list[str]) -> list[str]:
        unique_roles: list[str] = []
        seen: set[str] = set()

        for item in value:
            role = item.strip()
            if not role:
                continue

            lowered = role.lower()
            if lowered in seen:
                continue

            seen.add(lowered)
            unique_roles.append(role)

        return unique_roles

    @field_validator("location", mode="before")
    @classmethod
    def normalize_location(cls, value: object) -> str | None:
        if value is None:
            return None
        location = str(value).strip()
        return location or None
