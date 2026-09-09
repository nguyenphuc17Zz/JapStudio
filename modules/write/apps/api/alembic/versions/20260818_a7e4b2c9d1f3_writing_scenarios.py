"""writing scenarios: scenario table, exercise link, recommendation genre

Revision ID: a7e4b2c9d1f3
Revises: c3f9a2d1b5e8
Create Date: 2026-08-18 21:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a7e4b2c9d1f3"
down_revision: str | None = "c3f9a2d1b5e8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "writing_scenarios",
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("genre", sa.String(length=32), nullable=False),
        sa.Column("medium", sa.String(length=24), nullable=False),
        sa.Column("audience", sa.String(length=24), nullable=False),
        sa.Column("relationship", sa.String(length=24), nullable=False),
        sa.Column("purpose", sa.String(length=24), nullable=False),
        sa.Column("register", sa.String(length=16), nullable=False),
        sa.Column("tone", sa.String(length=24), nullable=False),
        sa.Column("target_length", sa.String(length=24), nullable=False),
        sa.Column("jlpt_level", sa.String(length=8), nullable=False),
        sa.Column("topic", sa.String(length=100), nullable=False),
        sa.Column("situation_vi", sa.Text(), nullable=False),
        sa.Column("context_vi", sa.Text(), nullable=False),
        sa.Column("required_points", sa.JSON(), nullable=False),
        sa.Column("optional_points", sa.JSON(), nullable=False),
        sa.Column("forbidden_patterns", sa.JSON(), nullable=False),
        sa.Column("difficulty_metadata", sa.JSON(), nullable=False),
        sa.Column("difficulty", sa.Integer(), nullable=False),
        sa.Column("generation_metadata", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
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
        op.f("ix_writing_scenarios_genre"), "writing_scenarios", ["genre"], unique=False
    )
    op.create_index(
        op.f("ix_writing_scenarios_user_id"), "writing_scenarios", ["user_id"], unique=False
    )
    op.add_column(
        "exercises",
        sa.Column("scenario_id", sa.String(length=36), nullable=True),
    )
    op.create_index(op.f("ix_exercises_scenario_id"), "exercises", ["scenario_id"], unique=False)
    op.create_foreign_key(
        "fk_exercises_scenario_id",
        "exercises",
        "writing_scenarios",
        ["scenario_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.add_column(
        "learning_recommendations",
        sa.Column("scenario_genre", sa.String(length=32), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("learning_recommendations", "scenario_genre")
    op.drop_constraint("fk_exercises_scenario_id", "exercises", type_="foreignkey")
    op.drop_index(op.f("ix_exercises_scenario_id"), table_name="exercises")
    op.drop_column("exercises", "scenario_id")
    op.drop_index(op.f("ix_writing_scenarios_user_id"), table_name="writing_scenarios")
    op.drop_index(op.f("ix_writing_scenarios_genre"), table_name="writing_scenarios")
    op.drop_table("writing_scenarios")
