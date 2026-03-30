from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "002_create_jobs"
down_revision = "001_create_users"
branch_labels = None
depends_on = None


job_source_type = postgresql.ENUM("remoteok", "adzuna", name="job_source")
apply_type_type = postgresql.ENUM("email", "platform", name="apply_type")

# Prevent SQLAlchemy from trying to auto-create enum types during table creation.
job_source = postgresql.ENUM("remoteok", "adzuna", name="job_source", create_type=False)
apply_type = postgresql.ENUM("email", "platform", name="apply_type", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("jobs"):
        return

    job_source_type.create(bind, checkfirst=True)
    apply_type_type.create(bind, checkfirst=True)
    op.create_table(
        "jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("company", sa.String(length=255), nullable=False),
        sa.Column("location", sa.String(length=255), nullable=False),
        sa.Column("source", job_source, nullable=False),
        sa.Column("apply_url", sa.Text(), nullable=False),
        sa.Column("apply_type", apply_type, nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("salary_min", sa.Integer(), nullable=True),
        sa.Column("salary_max", sa.Integer(), nullable=True),
        sa.Column("scraped_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_jobs_apply_url", "jobs", ["apply_url"], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("jobs"):
        return

    op.drop_index("ix_jobs_apply_url", table_name="jobs")
    op.drop_table("jobs")
    apply_type_type.drop(bind, checkfirst=True)
    job_source_type.drop(bind, checkfirst=True)
