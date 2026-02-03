"""add warning tags text

Revision ID: 9b2e3f1c7d4a
Revises: c4d1f2e7a9b0
Create Date: 2026-02-03 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "9b2e3f1c7d4a"
down_revision = "c4d1f2e7a9b0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("analysis_results", sa.Column("warning_tags_text", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("analysis_results", "warning_tags_text")
