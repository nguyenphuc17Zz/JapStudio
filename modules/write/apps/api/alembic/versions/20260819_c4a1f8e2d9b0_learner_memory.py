"""learner memory

Revision ID: c4a1f8e2d9b0
Revises: b1c3e5d7f9a2
Create Date: 2026-08-19 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c4a1f8e2d9b0"
down_revision: str | None = "b1c3e5d7f9a2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "learner_memories",
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("type", sa.String(length=16), nullable=False),
        sa.Column("content", sa.String(length=500), nullable=False),
        sa.Column("confidence", sa.String(length=16), nullable=False),
        sa.Column("importance", sa.Integer(), nullable=False),
        sa.Column("source_type", sa.String(length=32), nullable=False),
        sa.Column("source_id", sa.String(length=36), nullable=True),
        sa.Column("evidence", sa.JSON(), nullable=False),
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
        sa.Column("occurrence_count", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("memory_class", sa.String(length=16), nullable=False),
        sa.Column("retention_policy", sa.JSON(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
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
    )
    op.create_index(
        op.f("ix_learner_memories_user_id"), "learner_memories", ["user_id"], unique=False
    )
    op.create_index(
        op.f("ix_learner_memories_category"), "learner_memories", ["category"], unique=False
    )
    op.create_index(op.f("ix_learner_memories_type"), "learner_memories", ["type"], unique=False)
    op.create_index(
        op.f("ix_learner_memories_confidence"),
        "learner_memories",
        ["confidence"],
        unique=False,
    )
    op.create_index(
        op.f("ix_learner_memories_importance"),
        "learner_memories",
        ["importance"],
        unique=False,
    )
    op.create_index(
        op.f("ix_learner_memories_status"), "learner_memories", ["status"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_learner_memories_status"), table_name="learner_memories")
    op.drop_index(op.f("ix_learner_memories_importance"), table_name="learner_memories")
    op.drop_index(op.f("ix_learner_memories_confidence"), table_name="learner_memories")
    op.drop_index(op.f("ix_learner_memories_type"), table_name="learner_memories")
    op.drop_index(op.f("ix_learner_memories_category"), table_name="learner_memories")
    op.drop_index(op.f("ix_learner_memories_user_id"), table_name="learner_memories")
    op.drop_table("learner_memories")
