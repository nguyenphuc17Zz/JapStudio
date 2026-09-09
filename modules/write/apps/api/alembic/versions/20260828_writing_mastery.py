"""writing mastery and boss assessment (phase 23)

Revision ID: f6a1b2c3d4e5
Revises: e5f0a1b2c3d4
Create Date: 2026-08-28 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f6a1b2c3d4e5"
down_revision: str | None = "e5f0a1b2c3d4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "boss_writing_tasks" not in tables:
        op.create_table(
            "boss_writing_tasks",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True),
            sa.Column("task_type", sa.String(length=32), index=True, nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("situation_vi", sa.Text(), nullable=False),
            sa.Column("context_vi", sa.Text(), nullable=False),
            sa.Column("audience", sa.String(length=255), nullable=False),
            sa.Column("relationship", sa.String(length=255), nullable=False),
            sa.Column("target_register", sa.String(length=64), nullable=False),
            sa.Column("required_constraints", sa.JSON(), nullable=False),
            sa.Column("forbidden_patterns", sa.JSON(), nullable=False),
            sa.Column("target_word_count_min", sa.Integer(), server_default="100", nullable=False),
            sa.Column("target_word_count_max", sa.Integer(), server_default="300", nullable=False),
            sa.Column("time_limit_minutes", sa.Integer(), server_default="15", nullable=False),
            sa.Column("target_weakness_ids", sa.JSON(), nullable=False),
            sa.Column("adversarial_traps", sa.JSON(), nullable=False),
            sa.Column("jlpt_level", sa.String(length=8), server_default="N3", nullable=False),
            sa.Column("difficulty", sa.Integer(), server_default="7", nullable=False),
            sa.Column("status", sa.String(length=24), index=True, server_default="pending", nullable=False),
            sa.Column("generation_metadata", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    if "boss_writing_submissions" not in tables:
        op.create_table(
            "boss_writing_submissions",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("task_id", sa.String(length=36), sa.ForeignKey("boss_writing_tasks.id", ondelete="CASCADE"), index=True, nullable=False),
            sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True),
            sa.Column("text", sa.Text(), nullable=False),
            sa.Column("character_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("duration_seconds", sa.Integer(), server_default="0", nullable=False),
            sa.Column("status", sa.String(length=24), server_default="evaluated", nullable=False),
            sa.Column("overall_score", sa.Float(), server_default="0.0", nullable=False),
            sa.Column("verdict", sa.String(length=32), server_default="PASS", nullable=False),
            sa.Column("scores", sa.JSON(), nullable=False),
            sa.Column("feedback_vi", sa.Text(), nullable=False),
            sa.Column("strengths", sa.JSON(), nullable=False),
            sa.Column("critical_gaps", sa.JSON(), nullable=False),
            sa.Column("rewrites", sa.JSON(), nullable=False),
            sa.Column("historical_comparison", sa.JSON(), nullable=False),
            sa.Column("weakness_impacts", sa.JSON(), nullable=False),
            sa.Column("regression_diagnoses", sa.JSON(), nullable=False),
            sa.Column("evaluated_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "boss_writing_submissions" in tables:
        op.drop_table("boss_writing_submissions")
    if "boss_writing_tasks" in tables:
        op.drop_table("boss_writing_tasks")
