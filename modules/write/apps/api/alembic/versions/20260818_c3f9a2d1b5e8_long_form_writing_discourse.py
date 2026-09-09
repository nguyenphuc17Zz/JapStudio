"""long-form writing: submissions, revisions, discourse evaluations, issues

Revision ID: c3f9a2d1b5e8
Revises: 8b2f6d1c4e7a
Create Date: 2026-08-18 20:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c3f9a2d1b5e8"
down_revision: str | None = "8b2f6d1c4e7a"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "writing_submissions",
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("exercise_id", sa.String(length=36), nullable=False),
        sa.Column("mode", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
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
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_writing_submissions_exercise_id"),
        "writing_submissions",
        ["exercise_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_writing_submissions_user_id"), "writing_submissions", ["user_id"], unique=False
    )
    op.create_table(
        "writing_revisions",
        sa.Column("submission_id", sa.String(length=36), nullable=False),
        sa.Column("revision_number", sa.Integer(), nullable=False),
        sa.Column("attempt_id", sa.String(length=36), nullable=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("sentence_count", sa.Integer(), nullable=False),
        sa.Column("hints_revealed_count", sa.Integer(), nullable=False),
        sa.Column("revealed", sa.Boolean(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
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
        sa.ForeignKeyConstraint(["attempt_id"], ["exercise_attempts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["submission_id"], ["writing_submissions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("submission_id", "revision_number", name="uq_writing_revision_number"),
    )
    op.create_index(
        op.f("ix_writing_revisions_attempt_id"), "writing_revisions", ["attempt_id"], unique=True
    )
    op.create_index(
        op.f("ix_writing_revisions_submission_id"),
        "writing_revisions",
        ["submission_id"],
        unique=False,
    )
    op.create_table(
        "discourse_evaluations",
        sa.Column("revision_id", sa.String(length=36), nullable=False),
        sa.Column("sentence_quality", sa.Integer(), nullable=False),
        sa.Column("discourse_quality", sa.Integer(), nullable=False),
        sa.Column("overall_writing", sa.Integer(), nullable=False),
        sa.Column("scores", sa.JSON(), nullable=False),
        sa.Column("sentence_scores", sa.JSON(), nullable=False),
        sa.Column("strengths", sa.JSON(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("improved_structure", sa.Text(), nullable=True),
        sa.Column("rewrites", sa.JSON(), nullable=True),
        sa.Column("structure_suggestion", sa.JSON(), nullable=True),
        sa.Column("evaluation_version", sa.String(length=64), nullable=False),
        sa.Column("provenance", sa.JSON(), nullable=True),
        sa.Column("evaluated_at", sa.DateTime(timezone=True), nullable=False),
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
        sa.ForeignKeyConstraint(["revision_id"], ["writing_revisions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_discourse_evaluations_revision_id"),
        "discourse_evaluations",
        ["revision_id"],
        unique=True,
    )
    op.create_table(
        "discourse_issues",
        sa.Column("evaluation_id", sa.String(length=36), nullable=False),
        sa.Column("issue_number", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("severity", sa.String(length=16), nullable=False),
        sa.Column("sentence_index", sa.Integer(), nullable=True),
        sa.Column("sentence_range", sa.JSON(), nullable=True),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("suggested_fix", sa.Text(), nullable=False),
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
        sa.ForeignKeyConstraint(
            ["evaluation_id"], ["discourse_evaluations.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_discourse_issues_evaluation_id"),
        "discourse_issues",
        ["evaluation_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_discourse_issues_evaluation_id"), table_name="discourse_issues")
    op.drop_table("discourse_issues")
    op.drop_index(op.f("ix_discourse_evaluations_revision_id"), table_name="discourse_evaluations")
    op.drop_table("discourse_evaluations")
    op.drop_index(op.f("ix_writing_revisions_submission_id"), table_name="writing_revisions")
    op.drop_index(op.f("ix_writing_revisions_attempt_id"), table_name="writing_revisions")
    op.drop_table("writing_revisions")
    op.drop_index(op.f("ix_writing_submissions_user_id"), table_name="writing_submissions")
    op.drop_index(op.f("ix_writing_submissions_exercise_id"), table_name="writing_submissions")
    op.drop_table("writing_submissions")
