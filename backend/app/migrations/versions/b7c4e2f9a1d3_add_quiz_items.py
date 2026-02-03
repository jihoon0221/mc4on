"""add quiz items

Revision ID: b7c4e2f9a1d3
Revises: 1f2d7c9a0b3e
Create Date: 2026-02-03
"""
from __future__ import annotations

from typing import Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b7c4e2f9a1d3"
down_revision: Union[str, None] = "1f2d7c9a0b3e"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.create_table(
        "quiz_items",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("conversation_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quiz_date", sa.Date(), nullable=False),
        sa.Column("quiz_text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"]),
    )


def downgrade() -> None:
    op.drop_table("quiz_items")
