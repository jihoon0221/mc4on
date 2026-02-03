"""add timeline entries

Revision ID: 2c7f0d9a1f3b
Revises: 7e2b9a4d1c11
Create Date: 2026-02-02 12:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2c7f0d9a1f3b"
down_revision: Union[str, None] = "7e2b9a4d1c11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "timeline_entries",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("conversation_id", sa.UUID(), nullable=False),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("bird_state", sa.Text(), nullable=False),
        sa.Column("summary_text", sa.Text(), nullable=True),
        sa.Column("tags_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("timeline_entries")
