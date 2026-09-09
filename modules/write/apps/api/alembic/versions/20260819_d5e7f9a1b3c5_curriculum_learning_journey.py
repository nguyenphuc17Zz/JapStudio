"""curriculum & learning journey engine

Revision ID: d5e7f9a1b3c5
Revises: c4a1f8e2d9b0
Create Date: 2026-08-19 14:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d5e7f9a1b3c5"
down_revision: str | None = "c4a1f8e2d9b0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "learning_journeys",
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("goal_type", sa.String(length=32), nullable=False),
        sa.Column("goal", sa.String(length=50), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("progress", sa.Integer(), nullable=False),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_milestone_id", sa.String(length=64), nullable=True),
        sa.Column("current_objective_id", sa.String(length=64), nullable=True),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("planning_prompt_version", sa.String(length=64), nullable=False),
        sa.Column("planning_provider", sa.String(length=50), nullable=False),
        sa.Column("planning_model", sa.String(length=100), nullable=False),
        sa.Column("source", sa.String(length=16), nullable=False),
        sa.Column("review_meta", sa.JSON(), nullable=True),
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
        op.f("ix_learning_journeys_user_id"), "learning_journeys", ["user_id"], unique=False
    )

    op.create_table(
        "learning_milestones",
        sa.Column("journey_id", sa.String(length=36), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("entry_criteria", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("unlocked_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(["journey_id"], ["learning_journeys.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_learning_milestones_journey_id"),
        "learning_milestones",
        ["journey_id"],
        unique=False,
    )

    op.create_table(
        "learning_objectives",
        sa.Column("milestone_id", sa.String(length=36), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("target_competencies", sa.JSON(), nullable=False),
        sa.Column("target_skills", sa.JSON(), nullable=False),
        sa.Column("exercise_modes", sa.JSON(), nullable=False),
        sa.Column("target_level", sa.String(length=32), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.Column("entry_criteria", sa.JSON(), nullable=False),
        sa.Column("success_criteria", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("unlocked_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(["milestone_id"], ["learning_milestones.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_learning_objectives_milestone_id"),
        "learning_objectives",
        ["milestone_id"],
        unique=False,
    )

    op.create_table(
        "objective_progress",
        sa.Column("objective_id", sa.String(length=36), nullable=False),
        sa.Column("exercises_completed", sa.Integer(), nullable=False),
        sa.Column("attempts_submitted", sa.Integer(), nullable=False),
        sa.Column("average_score", sa.Integer(), nullable=False),
        sa.Column("best_score", sa.Integer(), nullable=False),
        sa.Column("mastery_state", sa.String(length=16), nullable=False),
        sa.Column("skill_evidence", sa.JSON(), nullable=False),
        sa.Column("modes_used", sa.JSON(), nullable=False),
        sa.Column("last_attempt_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(["objective_id"], ["learning_objectives.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_objective_progress_objective_id"),
        "objective_progress",
        ["objective_id"],
        unique=False,
    )

    op.create_table(
        "curriculum_plans",
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("journey_id", sa.String(length=36), nullable=True),
        sa.Column("plan_type", sa.String(length=16), nullable=False),
        sa.Column("goal_type", sa.String(length=32), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("model", sa.String(length=100), nullable=False),
        sa.Column("prompt_version", sa.String(length=64), nullable=False),
        sa.Column("review_meta", sa.JSON(), nullable=True),
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
        sa.ForeignKeyConstraint(["journey_id"], ["learning_journeys.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_curriculum_plans_user_id"), "curriculum_plans", ["user_id"], unique=False
    )
    op.create_index(
        op.f("ix_curriculum_plans_journey_id"), "curriculum_plans", ["journey_id"], unique=False
    )

    op.create_table(
        "curriculum_replanning_events",
        sa.Column("journey_id", sa.String(length=36), nullable=False),
        sa.Column("trigger", sa.String(length=32), nullable=False),
        sa.Column("replan_requested", sa.Boolean(), nullable=False),
        sa.Column("current_progress", sa.JSON(), nullable=True),
        sa.Column("reason", sa.String(length=500), nullable=False),
        sa.Column("applied", sa.Boolean(), nullable=False),
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
        sa.ForeignKeyConstraint(["journey_id"], ["learning_journeys.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_curriculum_replanning_events_journey_id"),
        "curriculum_replanning_events",
        ["journey_id"],
        unique=False,
    )

    op.add_column("learner_profiles", sa.Column("goal_type", sa.String(length=32), nullable=True))
    op.create_index(
        op.f("ix_learner_profiles_goal_type"), "learner_profiles", ["goal_type"], unique=False
    )

    op.add_column(
        "exercises",
        sa.Column("objective_id", sa.String(length=36), nullable=True),
    )
    op.create_index(op.f("ix_exercises_objective_id"), "exercises", ["objective_id"], unique=False)

    op.add_column(
        "learning_recommendations",
        sa.Column("objective_id", sa.String(length=36), nullable=True),
    )
    op.add_column(
        "learning_recommendations",
        sa.Column("milestone_id", sa.String(length=36), nullable=True),
    )
    op.create_index(
        op.f("ix_learning_recommendations_objective_id"),
        "learning_recommendations",
        ["objective_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_learning_recommendations_milestone_id"),
        "learning_recommendations",
        ["milestone_id"],
        unique=False,
    )

    op.add_column("daily_missions", sa.Column("objective_id", sa.String(length=36), nullable=True))
    op.create_index(
        op.f("ix_daily_missions_objective_id"), "daily_missions", ["objective_id"], unique=False
    )

    op.add_column("challenges", sa.Column("objective_id", sa.String(length=36), nullable=True))
    op.create_index(
        op.f("ix_challenges_objective_id"), "challenges", ["objective_id"], unique=False
    )

    op.add_column("user_vocabulary", sa.Column("curriculum_context", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("user_vocabulary", "curriculum_context")
    op.drop_index(op.f("ix_challenges_objective_id"), table_name="challenges")
    op.drop_column("challenges", "objective_id")
    op.drop_index(op.f("ix_daily_missions_objective_id"), table_name="daily_missions")
    op.drop_column("daily_missions", "objective_id")
    op.drop_index(
        op.f("ix_learning_recommendations_milestone_id"), table_name="learning_recommendations"
    )
    op.drop_index(
        op.f("ix_learning_recommendations_objective_id"), table_name="learning_recommendations"
    )
    op.drop_column("learning_recommendations", "milestone_id")
    op.drop_column("learning_recommendations", "objective_id")
    op.drop_index(op.f("ix_exercises_objective_id"), table_name="exercises")
    op.drop_column("exercises", "objective_id")
    op.drop_index(op.f("ix_learner_profiles_goal_type"), table_name="learner_profiles")
    op.drop_column("learner_profiles", "goal_type")
    op.drop_index(
        op.f("ix_curriculum_replanning_events_journey_id"),
        table_name="curriculum_replanning_events",
    )
    op.drop_table("curriculum_replanning_events")
    op.drop_index(op.f("ix_curriculum_plans_journey_id"), table_name="curriculum_plans")
    op.drop_index(op.f("ix_curriculum_plans_user_id"), table_name="curriculum_plans")
    op.drop_table("curriculum_plans")
    op.drop_index(op.f("ix_objective_progress_objective_id"), table_name="objective_progress")
    op.drop_table("objective_progress")
    op.drop_index(op.f("ix_learning_objectives_milestone_id"), table_name="learning_objectives")
    op.drop_table("learning_objectives")
    op.drop_index(op.f("ix_learning_milestones_journey_id"), table_name="learning_milestones")
    op.drop_table("learning_milestones")
    op.drop_index(op.f("ix_learning_journeys_user_id"), table_name="learning_journeys")
    op.drop_table("learning_journeys")
