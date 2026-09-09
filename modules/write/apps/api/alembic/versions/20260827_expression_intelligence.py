"""expression intelligence (phase 21)

Revision ID: e5f0a1b2c3d4
Revises: d4e9f8a7b6c5
Create Date: 2026-08-27 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e5f0a1b2c3d4"
down_revision: str | None = "d4e9f8a7b6c5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "expression_records" not in tables:
        op.create_table(
            "expression_records",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True),
            sa.Column("expression", sa.String(length=200), index=True, nullable=False),
            sa.Column("base_word", sa.String(length=100), index=True, nullable=True),
            sa.Column("expression_type", sa.String(length=32), index=True, server_default="collocation", nullable=False),
            sa.Column("used_count", sa.Integer(), server_default="1", nullable=False),
            sa.Column("misused_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("avoided_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("natural_use_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("registers_used", sa.JSON(), nullable=False),
            sa.Column("naturalness_avg", sa.Float(), server_default="75.0", nullable=False),
            sa.Column("is_overused", sa.Boolean(), server_default=sa.false(), index=True, nullable=False),
            sa.Column("overuse_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("vietnamese_literal", sa.Boolean(), server_default=sa.false(), index=True, nullable=False),
            sa.Column("transfer_classification", sa.String(length=40), server_default="natural", nullable=False),
            sa.Column("native_alternatives", sa.JSON(), nullable=False),
            sa.Column("collocations", sa.JSON(), nullable=False),
            sa.Column("example_contexts", sa.JSON(), nullable=False),
            sa.Column("nuance_notes", sa.Text(), nullable=True),
            sa.Column(
                "expression_key",
                sa.String(length=300),
                sa.Computed("CONCAT(COALESCE(user_id,''),'#',expression)", persisted=False),
                nullable=False,
            ),
            sa.Column("first_used_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("last_used_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint("expression_key", name="uq_expression_record_key"),
        )


def downgrade() -> None:
    op.drop_table("expression_records")
