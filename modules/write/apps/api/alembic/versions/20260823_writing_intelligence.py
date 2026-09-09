"""writing intelligence foundation

Revision ID: a1f9e8c7b6d5
Revises: e3c8b1a9f4d2
Create Date: 2026-08-23 19:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a1f9e8c7b6d5"
down_revision: str | None = "e3c8b1a9f4d2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "writing_weaknesses",
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("subtype", sa.String(length=64), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("examples", sa.JSON(), nullable=False),
        sa.Column("frequency", sa.Integer(), nullable=False),
        sa.Column(
            "first_seen_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "last_seen_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("severity", sa.String(length=16), nullable=False),
        sa.Column("recurrence_count", sa.Integer(), nullable=False),
        sa.Column("corrected_count", sa.Integer(), nullable=False),
        sa.Column("exposure_count", sa.Integer(), nullable=False),
        sa.Column("mastery_score", sa.Float(), nullable=False),
        sa.Column("confidence", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("affected_registers", sa.JSON(), nullable=False),
        sa.Column("affected_contexts", sa.JSON(), nullable=False),
        sa.Column("affected_jlpt_levels", sa.JSON(), nullable=False),
        sa.Column("related_expressions", sa.JSON(), nullable=False),
        sa.Column("related_grammar_patterns", sa.JSON(), nullable=False),
        sa.Column("evidence_refs", sa.JSON(), nullable=False),
        sa.Column(
            "weakness_key",
            sa.String(length=300),
            sa.Computed("CONCAT(COALESCE(user_id,''),'#',category,'#',subtype)", persisted=False),
            nullable=False,
        ),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("weakness_key", name="uq_writing_weakness_key"),
    )
    op.create_index(
        op.f("ix_writing_weaknesses_user_id"), "writing_weaknesses", ["user_id"], unique=False
    )
    op.create_index(
        op.f("ix_writing_weaknesses_category"), "writing_weaknesses", ["category"], unique=False
    )
    op.create_index(
        op.f("ix_writing_weaknesses_subtype"), "writing_weaknesses", ["subtype"], unique=False
    )
    op.create_index(
        op.f("ix_writing_weaknesses_status"), "writing_weaknesses", ["status"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_writing_weaknesses_status"), table_name="writing_weaknesses")
    op.drop_index(op.f("ix_writing_weaknesses_subtype"), table_name="writing_weaknesses")
    op.drop_index(op.f("ix_writing_weaknesses_category"), table_name="writing_weaknesses")
    op.drop_index(op.f("ix_writing_weaknesses_user_id"), table_name="writing_weaknesses")
    op.drop_table("writing_weaknesses")
