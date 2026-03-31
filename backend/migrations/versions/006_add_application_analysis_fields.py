from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "006_app_analysis_fields"
down_revision = "005_create_follow_ups"
branch_labels = None
depends_on = None


def _has_column(columns: list[dict[str, object]], name: str) -> bool:
    return any(column["name"] == name for column in columns)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("applications"):
        return

    columns = inspector.get_columns("applications")

    if not _has_column(columns, "analysis_payload_json"):
        op.add_column("applications", sa.Column("analysis_payload_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    if not _has_column(columns, "analysis_status"):
        op.add_column("applications", sa.Column("analysis_status", sa.String(length=50), nullable=False, server_default="idle"))
    if not _has_column(columns, "writer_status"):
        op.add_column("applications", sa.Column("writer_status", sa.String(length=50), nullable=False, server_default="idle"))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("applications"):
        return

    columns = inspector.get_columns("applications")

    if _has_column(columns, "writer_status"):
        op.drop_column("applications", "writer_status")
    if _has_column(columns, "analysis_status"):
        op.drop_column("applications", "analysis_status")
    if _has_column(columns, "analysis_payload_json"):
        op.drop_column("applications", "analysis_payload_json")
