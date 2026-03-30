from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "004_create_agent_logs"
down_revision = "003_create_applications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("agent_logs"):
        return

    op.create_table(
        "agent_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("applications.id"), nullable=False),
        sa.Column("agent_name", sa.String(length=100), nullable=False),
        sa.Column("action", sa.String(length=255), nullable=False),
        sa.Column("payload_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("agent_logs"):
        return

    op.drop_table("agent_logs")
