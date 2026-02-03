"""add warning text

Revision ID: 41a2f6b1d3ce
Revises: 8f1a6b7c4e2a
Create Date: 2026-02-02 10:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "41a2f6b1d3ce"
down_revision: Union[str, None] = "8f1a6b7c4e2a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("analysis_results", sa.Column("warning_text", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("analysis_results", "warning_text")
