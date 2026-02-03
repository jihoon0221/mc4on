"""add risk explanation and tags

Revision ID: 0d3c8a9f6b2a
Revises: 2c7f0d9a1f3b
Create Date: 2026-02-02 12:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0d3c8a9f6b2a"
down_revision: Union[str, None] = "2c7f0d9a1f3b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("analysis_results", "advice_text")
    op.add_column("analysis_results", sa.Column("risk_explanation_text", sa.Text(), nullable=True))
    op.add_column("analysis_results", sa.Column("tags_text", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("analysis_results", "tags_text")
    op.drop_column("analysis_results", "risk_explanation_text")
    op.add_column("analysis_results", sa.Column("advice_text", sa.Text(), nullable=True))
