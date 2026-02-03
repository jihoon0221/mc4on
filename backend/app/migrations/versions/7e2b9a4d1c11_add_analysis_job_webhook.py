"""add analysis job webhook fields

Revision ID: 7e2b9a4d1c11
Revises: 5b9c1d4f0a2b
Create Date: 2026-02-02 11:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7e2b9a4d1c11"
down_revision: Union[str, None] = "5b9c1d4f0a2b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("analysis_jobs", sa.Column("webhook_url", sa.Text(), nullable=True))
    op.add_column("analysis_jobs", sa.Column("webhook_status_code", sa.Integer(), nullable=True))
    op.add_column("analysis_jobs", sa.Column("webhook_error", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("analysis_jobs", "webhook_error")
    op.drop_column("analysis_jobs", "webhook_status_code")
    op.drop_column("analysis_jobs", "webhook_url")
