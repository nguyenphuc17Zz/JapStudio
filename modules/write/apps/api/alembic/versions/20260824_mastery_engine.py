"""mastery engine (phase 17)

Revision ID: b2e8d7c6a5f4
Revises: a1f9e8c7b6d5
Create Date: 2026-08-24 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b2e8d7c6a5f4"
down_revision: str | None = "a1f9e8c7b6d5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_cols = {c["name"] for c in inspector.get_columns("writing_weaknesses")}
    existing_indexes = {idx["name"] for idx in inspector.get_indexes("writing_weaknesses")}

    if "lifecycle_state" not in existing_cols:
        op.add_column(
            "writing_weaknesses",
            sa.Column("lifecycle_state", sa.String(length=24), server_default="new", nullable=False),
        )
    if "correct_count_by_context" not in existing_cols:
        op.add_column(
            "writing_weaknesses",
            sa.Column("correct_count_by_context", sa.JSON(), nullable=True),
        )
    if "incorrect_count_by_context" not in existing_cols:
        op.add_column(
            "writing_weaknesses",
            sa.Column("incorrect_count_by_context", sa.JSON(), nullable=True),
        )
    if "context_generalization_score" not in existing_cols:
        op.add_column(
            "writing_weaknesses",
            sa.Column("context_generalization_score", sa.Float(), server_default="0.0", nullable=False),
        )
    if "register_diversity_score" not in existing_cols:
        op.add_column(
            "writing_weaknesses",
            sa.Column("register_diversity_score", sa.Float(), server_default="0.0", nullable=False),
        )
    if "last_correct_at" not in existing_cols:
        op.add_column(
            "writing_weaknesses",
            sa.Column("last_correct_at", sa.DateTime(timezone=True), nullable=True),
        )
    if "last_incorrect_at" not in existing_cols:
        op.add_column(
            "writing_weaknesses",
            sa.Column("last_incorrect_at", sa.DateTime(timezone=True), nullable=True),
        )
    if "days_since_last_error" not in existing_cols:
        op.add_column(
            "writing_weaknesses",
            sa.Column("days_since_last_error", sa.Float(), server_default="0.0", nullable=False),
        )
    if "retest_due_at" not in existing_cols:
        op.add_column(
            "writing_weaknesses",
            sa.Column("retest_due_at", sa.DateTime(timezone=True), nullable=True),
        )
    if "retest_interval_days" not in existing_cols:
        op.add_column(
            "writing_weaknesses",
            sa.Column("retest_interval_days", sa.Integer(), server_default="0", nullable=False),
        )
    if "retest_passed_count" not in existing_cols:
        op.add_column(
            "writing_weaknesses",
            sa.Column("retest_passed_count", sa.Integer(), server_default="0", nullable=False),
        )
    if "mastery_evidence" not in existing_cols:
        op.add_column(
            "writing_weaknesses",
            sa.Column("mastery_evidence", sa.JSON(), nullable=True),
        )
    if "mastery_history" not in existing_cols:
        op.add_column(
            "writing_weaknesses",
            sa.Column("mastery_history", sa.JSON(), nullable=True),
        )
    if "mastery_narrative" not in existing_cols:
        op.add_column(
            "writing_weaknesses",
            sa.Column("mastery_narrative", sa.JSON(), nullable=True),
        )
    if "narrative_generated_at" not in existing_cols:
        op.add_column(
            "writing_weaknesses",
            sa.Column("narrative_generated_at", sa.DateTime(timezone=True), nullable=True),
        )

    idx_lifecycle = op.f("ix_writing_weaknesses_lifecycle_state")
    if idx_lifecycle not in existing_indexes:
        op.create_index(
            idx_lifecycle,
            "writing_weaknesses",
            ["lifecycle_state"],
            unique=False,
        )
    idx_retest = op.f("ix_writing_weaknesses_retest_due_at")
    if idx_retest not in existing_indexes:
        op.create_index(
            idx_retest,
            "writing_weaknesses",
            ["retest_due_at"],
            unique=False,
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_writing_weaknesses_retest_due_at"), table_name="writing_weaknesses")
    op.drop_index(op.f("ix_writing_weaknesses_lifecycle_state"), table_name="writing_weaknesses")

    op.drop_column("writing_weaknesses", "narrative_generated_at")
    op.drop_column("writing_weaknesses", "mastery_narrative")
    op.drop_column("writing_weaknesses", "mastery_history")
    op.drop_column("writing_weaknesses", "mastery_evidence")
    op.drop_column("writing_weaknesses", "retest_passed_count")
    op.drop_column("writing_weaknesses", "retest_interval_days")
    op.drop_column("writing_weaknesses", "retest_due_at")
    op.drop_column("writing_weaknesses", "days_since_last_error")
    op.drop_column("writing_weaknesses", "last_incorrect_at")
    op.drop_column("writing_weaknesses", "last_correct_at")
    op.drop_column("writing_weaknesses", "register_diversity_score")
    op.drop_column("writing_weaknesses", "context_generalization_score")
    op.drop_column("writing_weaknesses", "incorrect_count_by_context")
    op.drop_column("writing_weaknesses", "correct_count_by_context")
    op.drop_column("writing_weaknesses", "lifecycle_state")
