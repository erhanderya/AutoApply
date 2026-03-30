from pydantic import BaseModel


class CVExperience(BaseModel):
    title: str = ""
    company: str = ""
    duration: str = ""
    description: str = ""


class CVEducation(BaseModel):
    degree: str = ""
    school: str = ""
    year: str = ""


class CVData(BaseModel):
    name: str = ""
    email: str = ""
    phone: str = ""
    summary: str = ""
    skills: list[str] = []
    languages: list[str] = []
    experience: list[CVExperience] = []
    education: list[CVEducation] = []


class CVUploadResponse(BaseModel):
    parsed: CVData
    parserMode: str | None = None
    parserModel: str | None = None
