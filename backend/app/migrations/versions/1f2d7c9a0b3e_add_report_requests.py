"""add report requests

Revision ID: 1f2d7c9a0b3e
Revises: 6a4f9b2d8c10
Create Date: 2026-02-02 13:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "1f2d7c9a0b3e"
down_revision: Union[str, None] = "6a4f9b2d8c10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "report_requests",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("conversation_id", sa.UUID(), nullable=False),
        sa.Column("requested_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column(
            "status",
            sa.Enum("PENDING", "SUBMITTED", "CLOSED", name="report_status_enum"),
            server_default="PENDING",
            nullable=False,
        ),
        sa.Column("report_note", sa.Text(), nullable=True),
        sa.Column("evidence_bundle_path", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("report_requests")
    op.execute("DROP TYPE IF EXISTS report_status_enum")
