import uuid
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.cv import CVData, CVUploadResponse
from app.services.cv_parser import parse_cv_file

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cv", tags=["cv"])

UPLOAD_ROOT = Path("uploads") / "cv"
ALLOWED_EXTENSIONS = {".pdf", ".docx"}


def to_cv_data(payload: dict | None) -> CVData:
    data = payload if isinstance(payload, dict) else {}
    experience = data.get("experience") if isinstance(data.get("experience"), list) else []
    education = data.get("education") if isinstance(data.get("education"), list) else []

    return CVData(
        name=str(data.get("full_name") or data.get("name") or "").strip(),
        email=str(data.get("email") or "").strip(),
        phone=str(data.get("phone") or "").strip(),
        summary=str(data.get("summary") or "").strip(),
        skills=[str(skill).strip() for skill in data.get("skills", []) if str(skill).strip()],
        languages=[str(language).strip() for language in data.get("languages", []) if str(language).strip()],
        experience=[
            {
                "title": str(item.get("title") or "").strip(),
                "company": str(item.get("company") or "").strip(),
                "duration": str(item.get("duration") or "").strip(),
                "description": str(item.get("description") or "").strip(),
            }
            for item in experience
            if isinstance(item, dict)
        ],
        education=[
            {
                "degree": str(item.get("degree") or "").strip(),
                "school": str(item.get("school") or "").strip(),
                "year": str(item.get("year") or "").strip(),
            }
            for item in education
            if isinstance(item, dict)
        ],
    )


def to_storage_payload(cv_data: CVData) -> dict:
    return {
        "full_name": cv_data.name.strip(),
        "email": cv_data.email.strip(),
        "phone": cv_data.phone.strip(),
        "summary": cv_data.summary.strip(),
        "skills": [skill.strip() for skill in cv_data.skills if skill.strip()],
        "languages": [language.strip() for language in cv_data.languages if language.strip()],
        "experience": [
            {
                "title": item.title.strip(),
                "company": item.company.strip(),
                "duration": item.duration.strip(),
                "description": item.description.strip(),
            }
            for item in cv_data.experience
        ],
        "education": [
            {
                "degree": item.degree.strip(),
                "school": item.school.strip(),
                "year": item.year.strip(),
            }
            for item in cv_data.education
        ],
    }


@router.get("", response_model=CVData)
def get_cv(current_user: User = Depends(get_current_user)) -> CVData:
    preferences = current_user.preferences_json if isinstance(current_user.preferences_json, dict) else {}
    cv_data = preferences.get("cv_data")
    if not isinstance(cv_data, dict):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    return to_cv_data(cv_data)


@router.post("/upload", response_model=CVUploadResponse)
async def upload_cv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CVUploadResponse:
    filename = file.filename or "cv"
    suffix = Path(filename).suffix.lower()

    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF and DOCX files are supported")

    user_directory = UPLOAD_ROOT / str(current_user.id)
    user_directory.mkdir(parents=True, exist_ok=True)
    saved_path = user_directory / f"{uuid.uuid4()}{suffix}"
    saved_path.write_bytes(await file.read())

    parsed, parser_mode, parser_model = await parse_cv_file(saved_path)
    logger.info("CV upload parse completed with mode='%s' model='%s'", parser_mode, parser_model)
    current_preferences = current_user.preferences_json if isinstance(current_user.preferences_json, dict) else {}
    current_user.preferences_json = {**current_preferences, "cv_data": parsed}
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return CVUploadResponse(parsed=to_cv_data(parsed), parserMode=parser_mode, parserModel=parser_model)


@router.put("", response_model=CVData)
def update_cv(
    payload: CVData,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CVData:
    current_preferences = current_user.preferences_json if isinstance(current_user.preferences_json, dict) else {}
    current_user.preferences_json = {**current_preferences, "cv_data": to_storage_payload(payload)}
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return payload
