"""add last ingested date

Revision ID: 8f1a6b7c4e2a
Revises: 402ccd884bb2
Create Date: 2026-02-02 09:12:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8f1a6b7c4e2a"
down_revision: Union[str, None] = "402ccd884bb2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("conversations", sa.Column("last_ingested_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("conversations", "last_ingested_date")
