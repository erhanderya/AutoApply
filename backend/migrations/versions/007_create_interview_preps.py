from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "007_create_interview_preps"
down_revision = "006_app_analysis_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("interview_preps"):
        return

    op.create_table(
        "interview_preps",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "application_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("applications.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("status", sa.String(50), nullable=False, server_default="idle"),
        sa.Column("company_research_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("questions_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("answers_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("interview_preps"):
        op.drop_table("interview_preps")
