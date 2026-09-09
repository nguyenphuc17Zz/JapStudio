"""ai quality telemetry and benchmark

Revision ID: b1c3e5d7f9a2
Revises: fea5679e6ecd
Create Date: 2026-08-19 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b1c3e5d7f9a2"
down_revision: str | None = "fea5679e6ecd"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_quality_events",
        sa.Column("task", sa.String(length=64), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=True),
        sa.Column("model", sa.String(length=200), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=False),
        sa.Column("success", sa.Boolean(), nullable=False),
        sa.Column("failure_class", sa.String(length=64), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False),
        sa.Column("fallback_used", sa.Boolean(), nullable=False),
        sa.Column("token_usage", sa.JSON(), nullable=True),
        sa.Column("quality_status", sa.String(length=32), nullable=True),
        sa.Column("result_hash", sa.String(length=64), nullable=True),
        sa.Column("criticality", sa.String(length=16), nullable=True),
        sa.Column("estimated_cost", sa.Float(), nullable=True),
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
        comment="Privacy-safe AI quality telemetry",
    )
    op.create_index(
        op.f("ix_ai_quality_events_provider"), "ai_quality_events", ["provider"], unique=False
    )
    op.create_index(op.f("ix_ai_quality_events_task"), "ai_quality_events", ["task"], unique=False)
    op.create_table(
        "ai_benchmark_runs",
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("model", sa.String(length=200), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("aggregate", sa.JSON(), nullable=True),
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
    op.create_table(
        "ai_benchmark_results",
        sa.Column("run_id", sa.String(length=36), nullable=False),
        sa.Column("case_id", sa.String(length=64), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("model", sa.String(length=200), nullable=False),
        sa.Column("schema_pass", sa.Boolean(), nullable=False),
        sa.Column("consistency_pass", sa.Boolean(), nullable=False),
        sa.Column("expected_properties_pass", sa.Boolean(), nullable=False),
        sa.Column("semantic_accuracy", sa.Boolean(), nullable=True),
        sa.Column("false_positive_grammar", sa.Boolean(), nullable=True),
        sa.Column("naturalness_agreement", sa.Boolean(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=False),
        sa.Column("token_usage", sa.JSON(), nullable=True),
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
        sa.ForeignKeyConstraint(["run_id"], ["ai_benchmark_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_ai_benchmark_results_run_id"), "ai_benchmark_results", ["run_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_ai_benchmark_results_run_id"), table_name="ai_benchmark_results")
    op.drop_table("ai_benchmark_results")
    op.drop_table("ai_benchmark_runs")
    op.drop_index(op.f("ix_ai_quality_events_task"), table_name="ai_quality_events")
    op.drop_index(op.f("ix_ai_quality_events_provider"), table_name="ai_quality_events")
    op.drop_table("ai_quality_events")
