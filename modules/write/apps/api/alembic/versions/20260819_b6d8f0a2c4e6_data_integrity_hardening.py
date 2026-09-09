"""harden data integrity: missing FKs + unique backstops

Phase 15 (A3): restores the foreign keys declared by the ORM models but
missing from the database, and adds database-level uniqueness backstops for
the check-then-insert deduplication the application performs in code.

MySQL has no partial indexes, so "one active X per learner" invariants are
enforced with STORED generated columns that are NULL unless the row is in
the tracked state (NULLs never collide in a unique index):

- ``daily_missions.active_mission_key``: one ACTIVE mission per (user, day).
- ``learning_recommendations.active_recommendation_key``: one RECOMMENDED
  recommendation per user.
- ``learner_memories.memory_key``: one memory per (user, source_type,
  source_id) â€” the evidence gate in code guarantees at most one memory per
  event source, this backstops the check-then-insert race.
- ``mistake_patterns.pattern_key``: one pattern per (user, canonical_label).
- ``vocabulary_discoveries.discovery_key``: one discovery per (entry_id,
  attempt_id, source_type).

Existing rows are deduplicated (keeping the earliest row per group) before
the constraints are added, and orphaned objective/milestone references are
set to NULL so the foreign keys can be created on populated databases.

Revision ID: b6d8f0a2c4e6
Revises: f1a3c5e7d9b1
Create Date: 2026-08-19
"""

import sqlalchemy as sa
from alembic import op

revision = "b6d8f0a2c4e6"
down_revision = "f1a3c5e7d9b1"
branch_labels = None
depends_on = None


def _clean_orphans() -> None:
    for table, column, ref in (
        ("exercises", "objective_id", "learning_objectives"),
        ("daily_missions", "objective_id", "learning_objectives"),
        ("learning_recommendations", "objective_id", "learning_objectives"),
        ("learning_recommendations", "milestone_id", "learning_milestones"),
        ("challenges", "objective_id", "learning_objectives"),
    ):
        op.execute(
            f"UPDATE {table} SET {column} = NULL WHERE {column} IS NOT NULL "
            f"AND {column} NOT IN (SELECT id FROM {ref})"
        )


def _dedupe_keep_first(table: str, keys: list[str]) -> None:
    """Delete duplicate rows, keeping the earliest row per key group."""
    pair = " AND ".join(f"k.{k} <=> t.{k}" for k in keys)
    op.execute(
        sa.text(
            f"DELETE t FROM {table} t JOIN ("
            f"SELECT {', '.join(keys)}, MIN(id) AS keep_id "
            f"FROM {table} GROUP BY {', '.join(keys)}"
            f") k ON {pair} AND k.keep_id <> t.id"
        )
    )


def _archive_older_active(
    table: str, keys: list[str], status: str, replacement: str, set_archived_at: bool
) -> None:
    """Move all active rows except the newest into the replacement status."""
    pair = " AND ".join(f"k.{k} <=> t.{k}" for k in keys)
    archived = ", t.archived_at = NOW()" if set_archived_at else ""
    op.execute(
        sa.text(
            f"UPDATE {table} t JOIN {table} k ON {pair} AND k.status = :status "
            f"SET t.status = :replacement{archived} "
            "WHERE t.status = :status AND t.id <> k.id "
            "AND (k.created_at > t.created_at OR "
            "(k.created_at = t.created_at AND k.id > t.id))"
        ).bindparams(status=status, replacement=replacement)
    )


def upgrade() -> None:
    _clean_orphans()
    # Only evidence-sourced memories (non-NULL source_id) are deduplicated;
    # NULL-source rows (e.g. user_explicit preferences) are guarded in code.
    op.execute(
        "DELETE t FROM learner_memories t JOIN ("
        "SELECT user_id, source_type, source_id, MIN(id) AS keep_id "
        "FROM learner_memories WHERE source_id IS NOT NULL "
        "GROUP BY user_id, source_type, source_id"
        ") k ON k.user_id <=> t.user_id AND k.source_type = t.source_type "
        "AND k.source_id <=> t.source_id AND k.keep_id <> t.id"
    )
    _dedupe_keep_first("mistake_patterns", ["user_id", "canonical_label"])
    _dedupe_keep_first("vocabulary_discoveries", ["entry_id", "attempt_id", "source_type"])
    _archive_older_active("daily_missions", ["user_id", "mission_date"], "active", "archived", True)
    _archive_older_active("learning_recommendations", ["user_id"], "recommended", "replaced", False)

    op.add_column(
        "learner_memories",
        sa.Column(
            "memory_key",
            sa.String(110),
            sa.Computed(
                "CASE WHEN source_id IS NOT NULL THEN CONCAT(COALESCE(user_id,''),'#',"
                "source_type,'#',source_id) ELSE NULL END",
                persisted=False,
            ),
            nullable=True,
        ),
    )
    op.create_index("uq_learner_memory_source", "learner_memories", ["memory_key"], unique=True)

    op.add_column(
        "mistake_patterns",
        sa.Column(
            "pattern_key",
            sa.String(300),
            sa.Computed("CONCAT(COALESCE(user_id,''),'#',canonical_label)", persisted=False),
            nullable=False,
        ),
    )
    op.create_index("uq_mistake_pattern_label", "mistake_patterns", ["pattern_key"], unique=True)

    op.add_column(
        "vocabulary_discoveries",
        sa.Column(
            "discovery_key",
            sa.String(110),
            sa.Computed(
                "CONCAT(entry_id,'#',attempt_id,'#',CAST(source_type AS CHAR))",
                persisted=False,
            ),
            nullable=False,
        ),
    )
    op.create_index(
        "uq_vocab_discovery_attempt_entry",
        "vocabulary_discoveries",
        ["discovery_key"],
        unique=True,
    )

    op.add_column(
        "daily_missions",
        sa.Column(
            "active_mission_key",
            sa.String(60),
            sa.Computed(
                "CASE WHEN status = 'active' THEN CONCAT(COALESCE(user_id,''),'#',"
                "CAST(mission_date AS CHAR)) ELSE NULL END",
                persisted=False,
            ),
            nullable=True,
        ),
    )
    op.create_index(
        "uq_daily_mission_active", "daily_missions", ["active_mission_key"], unique=True
    )

    op.add_column(
        "learning_recommendations",
        sa.Column(
            "active_recommendation_key",
            sa.String(36),
            sa.Computed(
                "CASE WHEN status = 'recommended' THEN COALESCE(user_id,'') ELSE NULL END",
                persisted=False,
            ),
            nullable=True,
        ),
    )
    op.create_index(
        "uq_recommendation_active",
        "learning_recommendations",
        ["active_recommendation_key"],
        unique=True,
    )

    for table, column, ref in (
        ("exercises", "objective_id", "learning_objectives"),
        ("daily_missions", "objective_id", "learning_objectives"),
        ("learning_recommendations", "objective_id", "learning_objectives"),
        ("learning_recommendations", "milestone_id", "learning_milestones"),
        ("challenges", "objective_id", "learning_objectives"),
    ):
        op.create_foreign_key(
            f"fk_{table}_{column}",
            table,
            ref,
            [column],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    for table, column, _ref in (
        ("exercises", "objective_id", "learning_objectives"),
        ("daily_missions", "objective_id", "learning_objectives"),
        ("learning_recommendations", "objective_id", "learning_objectives"),
        ("learning_recommendations", "milestone_id", "learning_milestones"),
        ("challenges", "objective_id", "learning_objectives"),
    ):
        op.drop_constraint(f"fk_{table}_{column}", table, type_="foreignkey")

    op.drop_index("uq_recommendation_active", table_name="learning_recommendations")
    op.drop_column("learning_recommendations", "active_recommendation_key")
    op.drop_index("uq_daily_mission_active", table_name="daily_missions")
    op.drop_column("daily_missions", "active_mission_key")
    op.drop_index("uq_vocab_discovery_attempt_entry", table_name="vocabulary_discoveries")
    op.drop_column("vocabulary_discoveries", "discovery_key")
    op.drop_index("uq_mistake_pattern_label", table_name="mistake_patterns")
    op.drop_column("mistake_patterns", "pattern_key")
    op.drop_index("uq_learner_memory_source", table_name="learner_memories")
    op.drop_column("learner_memories", "memory_key")
