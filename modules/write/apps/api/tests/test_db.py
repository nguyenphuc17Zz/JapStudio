from app.db.base import Base
from sqlalchemy import text


def test_base_metadata_contains_all_models() -> None:
    table_names = set(Base.metadata.tables)
    assert {
        "users",
        "exercises",
        "exercise_attempts",
        "writing_feedback",
        "vocabulary_entries",
        "user_vocabulary",
        "vocabulary_discoveries",
        "learner_profiles",
        "ai_provider_configs",
        "ai_model_configs",
    } <= table_names


async def test_session_connects_to_mysql(session) -> None:
    result = await session.execute(text("SELECT 1"))
    assert result.scalar() == 1


async def test_database_init_created_tables(session) -> None:
    async with session.bind.connect() as connection:
        result = await connection.execute(text("SHOW TABLES LIKE 'users'"))
        assert result.first() is not None
