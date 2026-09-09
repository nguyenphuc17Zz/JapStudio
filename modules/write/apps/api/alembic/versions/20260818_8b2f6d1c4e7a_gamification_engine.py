"""gamification engine: xp ledger, streaks, daily goals, missions, challenges, milestones

Revision ID: 8b2f6d1c4e7a
Revises: 28003658254e
Create Date: 2026-08-18 16:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "8b2f6d1c4e7a"
down_revision: str | None = "28003658254e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "challenges",
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("challenge_type", sa.String(length=32), nullable=False),
        sa.Column("instruction_vi", sa.Text(), nullable=False),
        sa.Column("source_text", sa.Text(), nullable=False),
        sa.Column("target_skill", sa.String(length=32), nullable=False),
        sa.Column("difficulty", sa.Integer(), nullable=False),
        sa.Column("objective", sa.String(length=500), nullable=False),
        sa.Column("required_expression", sa.String(length=100), nullable=True),
        sa.Column("exercise_id", sa.String(length=36), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("model", sa.String(length=100), nullable=False),
        sa.Column("prompt_version", sa.String(length=64), nullable=False),
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
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_challenges_exercise_id"), "challenges", ["exercise_id"], unique=False)
    op.create_index(op.f("ix_challenges_user_id"), "challenges", ["user_id"], unique=False)
    op.create_table(
        "challenge_attempts",
        sa.Column("challenge_id", sa.String(length=36), nullable=False),
        sa.Column("attempt_id", sa.String(length=36), nullable=False),
        sa.Column("success", sa.Boolean(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("xp_awarded", sa.Integer(), nullable=False),
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
        sa.ForeignKeyConstraint(["challenge_id"], ["challenges.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("challenge_id", "attempt_id", name="uq_challenge_attempt"),
    )
    op.create_index(
        op.f("ix_challenge_attempts_attempt_id"), "challenge_attempts", ["attempt_id"], unique=False
    )
    op.create_index(
        op.f("ix_challenge_attempts_challenge_id"),
        "challenge_attempts",
        ["challenge_id"],
        unique=False,
    )
    op.create_table(
        "daily_goals",
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("goal_date", sa.Date(), nullable=False),
        sa.Column("target", sa.Integer(), nullable=False),
        sa.Column("completed_count", sa.Integer(), nullable=False),
        sa.Column("completed", sa.Boolean(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.UniqueConstraint("user_id", "goal_date", name="uq_daily_goal_user_date"),
    )
    op.create_index(op.f("ix_daily_goals_user_id"), "daily_goals", ["user_id"], unique=False)
    op.create_table(
        "daily_missions",
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("mission_date", sa.Date(), nullable=False),
        sa.Column("mission_type", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=1000), nullable=False),
        sa.Column("target_count", sa.Integer(), nullable=False),
        sa.Column("completed_count", sa.Integer(), nullable=False),
        sa.Column("focus_skills", sa.JSON(), nullable=False),
        sa.Column("topic", sa.String(length=100), nullable=False),
        sa.Column("register", sa.String(length=16), nullable=False),
        sa.Column("difficulty", sa.Integer(), nullable=False),
        sa.Column("reason", sa.String(length=1000), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("model", sa.String(length=100), nullable=False),
        sa.Column("prompt_version", sa.String(length=64), nullable=False),
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
    op.create_index(op.f("ix_daily_missions_user_id"), "daily_missions", ["user_id"], unique=False)
    op.create_table(
        "milestones",
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("milestone_key", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column(
            "achieved_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("celebration", sa.JSON(), nullable=True),
        sa.Column("xp_awarded", sa.Integer(), nullable=False),
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
        sa.UniqueConstraint("user_id", "milestone_key", name="uq_milestone_user_key"),
    )
    op.create_index(op.f("ix_milestones_user_id"), "milestones", ["user_id"], unique=False)
    op.create_table(
        "user_streaks",
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("current_streak", sa.Integer(), nullable=False),
        sa.Column("longest_streak", sa.Integer(), nullable=False),
        sa.Column("last_active_date", sa.Date(), nullable=True),
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
    op.create_index(op.f("ix_user_streaks_user_id"), "user_streaks", ["user_id"], unique=True)
    op.create_table(
        "xp_events",
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("event_type", sa.String(length=32), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("source_type", sa.String(length=32), nullable=False),
        sa.Column("source_id", sa.String(length=64), nullable=False),
        sa.Column("idempotency_key", sa.String(length=96), nullable=False),
        sa.Column("event_metadata", sa.JSON(), nullable=True),
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
        sa.UniqueConstraint("user_id", "idempotency_key", name="uq_xp_event_idempotency"),
    )
    op.create_index(op.f("ix_xp_events_user_id"), "xp_events", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_xp_events_user_id"), table_name="xp_events")
    op.drop_table("xp_events")
    op.drop_index(op.f("ix_user_streaks_user_id"), table_name="user_streaks")
    op.drop_table("user_streaks")
    op.drop_index(op.f("ix_milestones_user_id"), table_name="milestones")
    op.drop_table("milestones")
    op.drop_index(op.f("ix_daily_missions_user_id"), table_name="daily_missions")
    op.drop_table("daily_missions")
    op.drop_index(op.f("ix_daily_goals_user_id"), table_name="daily_goals")
    op.drop_table("daily_goals")
    op.drop_index(op.f("ix_challenges_user_id"), table_name="challenges")
    op.drop_index(op.f("ix_challenges_exercise_id"), table_name="challenges")
    op.drop_table("challenges")
    op.drop_index(op.f("ix_challenge_attempts_challenge_id"), table_name="challenge_attempts")
    op.drop_index(op.f("ix_challenge_attempts_attempt_id"), table_name="challenge_attempts")
    op.drop_table("challenge_attempts")
