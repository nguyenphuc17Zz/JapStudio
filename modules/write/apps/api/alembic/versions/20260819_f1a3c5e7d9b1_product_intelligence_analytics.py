"""product intelligence, learning analytics & optimization

Revision ID: f1a3c5e7d9b1
Revises: d5e7f9a1b3c5
Create Date: 2026-08-19 16:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f1a3c5e7d9b1"
down_revision: str | None = "d5e7f9a1b3c5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "analytics_events",
        sa.Column("event_type", sa.String(length=48), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("entity_id", sa.String(length=64), nullable=True),
        sa.Column("context", sa.JSON(), nullable=True),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
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
    )
    op.create_index(
        op.f("ix_analytics_events_event_type"), "analytics_events", ["event_type"], unique=False
    )
    op.create_index(
        op.f("ix_analytics_events_user_id"), "analytics_events", ["user_id"], unique=False
    )
    op.create_index(
        op.f("ix_analytics_events_occurred_at"), "analytics_events", ["occurred_at"], unique=False
    )

    op.create_table(
        "analytics_daily_metrics",
        sa.Column("metric_date", sa.Date(), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("metric_key", sa.String(length=64), nullable=False),
        sa.Column("dimension", sa.String(length=32), nullable=True),
        sa.Column("dimension_value", sa.String(length=128), nullable=True),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("sample_count", sa.Integer(), nullable=False),
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
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "metric_date",
            "category",
            "metric_key",
            "dimension",
            "dimension_value",
            name="uq_analytics_daily_metric",
        ),
    )
    op.create_index(
        op.f("ix_analytics_daily_metrics_metric_date"),
        "analytics_daily_metrics",
        ["metric_date"],
        unique=False,
    )
    op.create_index(
        op.f("ix_analytics_daily_metrics_category"),
        "analytics_daily_metrics",
        ["category"],
        unique=False,
    )
    op.create_index(
        op.f("ix_analytics_daily_metrics_metric_key"),
        "analytics_daily_metrics",
        ["metric_key"],
        unique=False,
    )
    op.create_index(
        op.f("ix_analytics_daily_metrics_dimension"),
        "analytics_daily_metrics",
        ["dimension"],
        unique=False,
    )

    op.create_table(
        "optimization_recommendations",
        sa.Column("area", sa.String(length=64), nullable=False),
        sa.Column("priority", sa.String(length=16), nullable=False),
        sa.Column("finding", sa.Text(), nullable=False),
        sa.Column("recommended_action", sa.Text(), nullable=False),
        sa.Column("evidence", sa.JSON(), nullable=False),
        sa.Column("confidence", sa.String(length=16), nullable=False),
        sa.Column("inference_type", sa.String(length=16), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decision_note", sa.Text(), nullable=True),
        sa.Column("metric_snapshot_id", sa.String(length=64), nullable=True),
        sa.Column("provider", sa.String(length=50), nullable=True),
        sa.Column("model", sa.String(length=100), nullable=True),
        sa.Column("prompt_version", sa.String(length=64), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_optimization_recommendations_status"),
        "optimization_recommendations",
        ["status"],
        unique=False,
    )

    op.create_table(
        "experiments",
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=1000), nullable=True),
        sa.Column("target", sa.String(length=64), nullable=False),
        sa.Column("control", sa.JSON(), nullable=False),
        sa.Column("variant", sa.JSON(), nullable=False),
        sa.Column("allocation", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("metrics", sa.JSON(), nullable=False),
        sa.Column("created_by", sa.String(length=64), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_experiments_status"), "experiments", ["status"], unique=False)

    op.create_table(
        "experiment_assignments",
        sa.Column("experiment_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("arm", sa.String(length=16), nullable=False),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
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
        sa.ForeignKeyConstraint(["experiment_id"], ["experiments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("experiment_id", "user_id", name="uq_experiment_assignment"),
    )
    op.create_index(
        op.f("ix_experiment_assignments_experiment_id"),
        "experiment_assignments",
        ["experiment_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_experiment_assignments_user_id"),
        "experiment_assignments",
        ["user_id"],
        unique=False,
    )

    op.add_column(
        "ai_quality_events", sa.Column("prompt_version", sa.String(length=64), nullable=True)
    )
    op.add_column("ai_quality_events", sa.Column("event_key", sa.String(length=64), nullable=True))
    op.create_index(
        op.f("ix_ai_quality_events_event_key"), "ai_quality_events", ["event_key"], unique=True
    )

    op.add_column(
        "user_vocabulary", sa.Column("first_used_at", sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("user_vocabulary", "first_used_at")
    op.drop_index(op.f("ix_ai_quality_events_event_key"), table_name="ai_quality_events")
    op.drop_column("ai_quality_events", "event_key")
    op.drop_column("ai_quality_events", "prompt_version")

    op.drop_index(op.f("ix_experiment_assignments_user_id"), table_name="experiment_assignments")
    op.drop_index(
        op.f("ix_experiment_assignments_experiment_id"), table_name="experiment_assignments"
    )
    op.drop_table("experiment_assignments")
    op.drop_index(op.f("ix_experiments_status"), table_name="experiments")
    op.drop_table("experiments")
    op.drop_index(
        op.f("ix_optimization_recommendations_status"),
        table_name="optimization_recommendations",
    )
    op.drop_table("optimization_recommendations")
    op.drop_index(
        op.f("ix_analytics_daily_metrics_dimension"), table_name="analytics_daily_metrics"
    )
    op.drop_index(
        op.f("ix_analytics_daily_metrics_metric_key"), table_name="analytics_daily_metrics"
    )
    op.drop_index(op.f("ix_analytics_daily_metrics_category"), table_name="analytics_daily_metrics")
    op.drop_index(
        op.f("ix_analytics_daily_metrics_metric_date"), table_name="analytics_daily_metrics"
    )
    op.drop_table("analytics_daily_metrics")
    op.drop_index(op.f("ix_analytics_events_occurred_at"), table_name="analytics_events")
    op.drop_index(op.f("ix_analytics_events_user_id"), table_name="analytics_events")
    op.drop_index(op.f("ix_analytics_events_event_type"), table_name="analytics_events")
    op.drop_table("analytics_events")
