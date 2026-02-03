"""add summary short text

Revision ID: c4d1f2e7a9b0
Revises: b7c4e2f9a1d3
Create Date: 2026-02-03
"""
from __future__ import annotations

from typing import Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4d1f2e7a9b0"
down_revision: Union[str, None] = "b7c4e2f9a1d3"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.add_column("analysis_results", sa.Column("summary_short_text", sa.Text(), nullable=True))
    op.add_column("timeline_entries", sa.Column("summary_short_text", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("timeline_entries", "summary_short_text")
    op.drop_column("analysis_results", "summary_short_text")
