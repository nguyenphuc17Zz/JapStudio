"""Adds AI-enriched word-detail columns to user_vocabulary for existing databases.

`Base.metadata.create_all` (see `app.db.sync_schema.init_db`) only creates
missing *tables*, never missing *columns*, so databases created before this
feature need explicit ALTER TABLE statements. Safe to run repeatedly:
each column is added only when absent from the table.
"""

from sqlalchemy import text
from app.db.session import engine
from app.core.logging import get_logger

logger = get_logger("db.migrate_vocab_ai_detail")

_COLUMNS: list[tuple[str, str]] = [
    ("nuance", "TEXT"),
    ("jlpt_level", "VARCHAR(10)"),
    ("examples_json", "JSON"),
    ("alternatives_json", "JSON"),
]


async def ensure_vocab_ai_detail_columns() -> None:
    """Adds missing AI-detail columns to user_vocabulary (idempotent)."""
    async with engine.begin() as conn:
        existing = {
            row[1]
            for row in (
                await conn.execute(text("PRAGMA table_info(user_vocabulary)"))
            ).all()
        }
        for name, ddl in _COLUMNS:
            if name in existing:
                continue
            try:
                await conn.execute(
                    text(f"ALTER TABLE user_vocabulary ADD COLUMN {name} {ddl}")
                )
                logger.info(f"Added column user_vocabulary.{name}")
            except Exception as e:
                logger.warning(f"Could not add column user_vocabulary.{name}: {e}")
