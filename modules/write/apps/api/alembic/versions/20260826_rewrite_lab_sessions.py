"""rewrite lab sessions (phase 19)

Revision ID: d4e9f8a7b6c5
Revises: c3d9e8b7a6f5
Create Date: 2026-08-26 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d4e9f8a7b6c5"
down_revision: str | None = "c3d9e8b7a6f5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "rewrite_lab_sessions" not in tables:
        op.create_table(
            "rewrite_lab_sessions",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True),
            sa.Column("source_type", sa.String(length=32), server_default="standalone", nullable=False),
            sa.Column("source_id", sa.String(length=64), nullable=True),
            sa.Column("original_text", sa.Text(), nullable=False),
            sa.Column("context_vi", sa.Text(), nullable=True),
            sa.Column("has_issue", sa.Boolean(), server_default=sa.true(), nullable=False),
            sa.Column("issue_category", sa.String(length=64), nullable=True),
            sa.Column("issue_category_name_vi", sa.String(length=128), nullable=True),
            sa.Column("issue_explanation_vi", sa.Text(), nullable=True),
            sa.Column("target_concept", sa.String(length=200), nullable=True),
            sa.Column("target_segment", sa.String(length=200), nullable=True),
            sa.Column("current_step", sa.Integer(), server_default="2", nullable=False),
            sa.Column("status", sa.String(length=32), server_default="active", nullable=False),
            sa.Column("clue", sa.Text(), nullable=True),
            sa.Column("pattern", sa.Text(), nullable=True),
            sa.Column("attempts", sa.JSON(), nullable=False),
            sa.Column("revealed_variants", sa.JSON(), nullable=True),
            sa.Column("transfer_task", sa.JSON(), nullable=True),
            sa.Column("transfer_attempts", sa.JSON(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )


def downgrade() -> None:
    op.drop_table("rewrite_lab_sessions")
