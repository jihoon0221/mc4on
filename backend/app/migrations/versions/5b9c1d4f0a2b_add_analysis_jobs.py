"""add analysis jobs

Revision ID: 5b9c1d4f0a2b
Revises: 41a2f6b1d3ce
Create Date: 2026-02-02 11:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5b9c1d4f0a2b"
down_revision: Union[str, None] = "41a2f6b1d3ce"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "analysis_jobs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("conversation_id", sa.UUID(), nullable=False),
        sa.Column("upload_id", sa.UUID(), nullable=False),
        sa.Column("target_date", sa.Date(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("PENDING", "RUNNING", "DONE", "FAILED", name="analysis_job_status_enum"),
            server_default="PENDING",
            nullable=False,
        ),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"]),
        sa.ForeignKeyConstraint(["upload_id"], ["uploads.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("analysis_jobs")
    op.execute("DROP TYPE IF EXISTS analysis_job_status_enum")
