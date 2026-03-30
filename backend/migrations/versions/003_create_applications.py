from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "003_create_applications"
down_revision = "002_create_jobs"
branch_labels = None
depends_on = None


application_status_type = postgresql.ENUM(
    "pending",
    "applied",
    "reviewing",
    "interview",
    "offer",
    "rejected",
    name="application_status",
)

# Prevent SQLAlchemy from trying to auto-create enum types during table creation.
application_status = postgresql.ENUM(
    "pending",
    "applied",
    "reviewing",
    "interview",
    "offer",
    "rejected",
    name="application_status",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("applications"):
        return

    application_status_type.create(bind, checkfirst=True)
    op.create_table(
        "applications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("jobs.id"), nullable=False),
        sa.Column("status", application_status, nullable=False, server_default="pending"),
        sa.Column("fit_score", sa.Integer(), nullable=True),
        sa.Column("cv_variant_text", sa.Text(), nullable=True),
        sa.Column("cover_letter_text", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("applications"):
        return

    op.drop_table("applications")
    application_status_type.drop(bind, checkfirst=True)
