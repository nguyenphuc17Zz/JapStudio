"""Adds AI-enriched detail columns to user_expressions for existing databases.

`Base.metadata.create_all` (see `app.db.sync_schema.init_db`) only creates
missing *tables*, never missing *columns*, so databases created before this
feature need explicit ALTER TABLE statements. Safe to run repeatedly:
each column is added only when absent from the table.
"""

from sqlalchemy import text
from app.db.session import engine
from app.core.logging import get_logger

logger = get_logger("db.migrate_expression_ai_detail")

_COLUMNS: list[tuple[str, str]] = [
    ("usage_context", "TEXT"),
    ("composition", "TEXT"),
    ("examples_json", "JSON"),
    ("alternatives_json", "JSON"),
]


async def ensure_expression_ai_detail_columns() -> None:
    """Adds missing AI-detail columns to user_expressions (idempotent)."""
    async with engine.begin() as conn:
        existing = {
            row[1]
            for row in (
                await conn.execute(text("PRAGMA table_info(user_expressions)"))
            ).all()
        }
        for name, ddl in _COLUMNS:
            if name in existing:
                continue
            try:
                await conn.execute(
                    text(f"ALTER TABLE user_expressions ADD COLUMN {name} {ddl}")
                )
                logger.info(f"Added column user_expressions.{name}")
            except Exception as e:
                logger.warning(f"Could not add column user_expressions.{name}: {e}")
