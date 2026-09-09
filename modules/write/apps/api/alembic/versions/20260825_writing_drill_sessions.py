"""writing drill sessions (phase 18)

Revision ID: c3d9e8b7a6f5
Revises: b2e8d7c6a5f4
Create Date: 2026-08-25 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c3d9e8b7a6f5"
down_revision: str | None = "b2e8d7c6a5f4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "writing_drill_sessions" not in tables:
        op.create_table(
            "writing_drill_sessions",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True),
            sa.Column("weakness_id", sa.String(length=36), sa.ForeignKey("writing_weaknesses.id", ondelete="SET NULL"), index=True, nullable=True),
            sa.Column("weakness_category", sa.String(length=32), index=True, nullable=False),
            sa.Column("weakness_subtype", sa.String(length=64), index=True, nullable=False),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("target_focus", sa.String(length=200), nullable=False),
            sa.Column("jlpt_level", sa.String(length=8), server_default="N3", nullable=False),
            sa.Column("difficulty", sa.Integer(), server_default="5", nullable=False),
            sa.Column("status", sa.String(length=24), server_default="active", index=True, nullable=False),
            sa.Column("current_item_index", sa.Integer(), server_default="0", nullable=False),
            sa.Column("items", sa.JSON(), nullable=False),
            sa.Column("attempts", sa.JSON(), nullable=False),
            sa.Column("outcome", sa.JSON(), nullable=True),
            sa.Column("mastery_delta", sa.Float(), server_default="0.0", nullable=False),
            sa.Column("generation_metadata", sa.JSON(), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )


def downgrade() -> None:
    op.drop_table("writing_drill_sessions")
