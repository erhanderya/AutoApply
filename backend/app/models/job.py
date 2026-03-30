import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import ApplyType, JobSource


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    source: Mapped[JobSource] = mapped_column(Enum(JobSource, name="job_source"), nullable=False)
    apply_url: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    apply_type: Mapped[ApplyType] = mapped_column(Enum(ApplyType, name="apply_type"), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    salary_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    scraped_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")
