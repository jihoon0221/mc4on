"""add analysis job photo flags and entity checks

Revision ID: 6a4f9b2d8c10
Revises: 0d3c8a9f6b2a
Create Date: 2026-02-02 13:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6a4f9b2d8c10"
down_revision: Union[str, None] = "0d3c8a9f6b2a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("analysis_jobs", sa.Column("photo_flags_text", sa.Text(), nullable=True))
    op.create_table(
        "entity_checks",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("detected_entity_id", sa.UUID(), nullable=False),
        sa.Column("check_type", sa.Text(), nullable=False),
        sa.Column("is_risky", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["detected_entity_id"], ["detected_entities.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("entity_checks")
    op.drop_column("analysis_jobs", "photo_flags_text")
