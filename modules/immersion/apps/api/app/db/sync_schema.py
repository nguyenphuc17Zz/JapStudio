from app.db.base import Base
from app.db.session import engine
from app.core.logging import get_logger
import app.models  # noqa: F401 - ensure all models are registered on Base.metadata

logger = get_logger("db.sync_schema")

async def init_db() -> None:
    """Creates database tables if they do not already exist."""
    logger.info("Initializing database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables initialized successfully.")
