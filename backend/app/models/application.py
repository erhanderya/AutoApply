import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import ApplicationStatus


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus, name="application_status"),
        default=ApplicationStatus.pending,
        nullable=False,
    )
    fit_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    analysis_payload_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    analysis_status: Mapped[str] = mapped_column(String(50), default="idle", server_default="idle", nullable=False)
    writer_status: Mapped[str] = mapped_column(String(50), default="idle", server_default="idle", nullable=False)
    cv_variant_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_letter_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", back_populates="applications")
    job = relationship("Job", back_populates="applications")
    agent_logs = relationship("AgentLog", back_populates="application", cascade="all, delete-orphan")
    follow_ups = relationship("FollowUp", back_populates="application", cascade="all, delete-orphan")
