"""Test fixtures. Requires a local MySQL with an 'ai_japanese_writing_test' database.

The test database URL and APP_ENV are injected via environment variables here,
before any application module is imported.
"""

import os

os.environ["APP_ENV"] = "test"
os.environ["RATE_LIMIT_ENABLED"] = "false"

from app.core.config import get_settings  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402

_test_url = make_url(get_settings().database_url)
_test_url = _test_url.set(database=f"{_test_url.database}_test")
os.environ["DATABASE_URL"] = _test_url.render_as_string(hide_password=False)
get_settings.cache_clear()

import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import close_engine, get_session, get_session_factory  # noqa: E402
from app.main import app  # noqa: E402
from app.providers.ai.router import AIRouter, create_default_router  # noqa: E402
from app.services.ai_service import AIService  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine  # noqa: E402

TEST_DATABASE_URL = os.environ["DATABASE_URL"]


@pytest_asyncio.fixture(scope="session", autouse=True)
async def database() -> None:
    """Rebuild the test schema once per test session."""
    await close_engine()
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as connection:
        await connection.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)
        await connection.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
    await engine.dispose()
    yield
    await close_engine()


@pytest_asyncio.fixture(autouse=True)
async def _clean_tables() -> None:
    """Remove all rows after each test so tests stay isolated."""
    yield
    async with get_session_factory()() as session:
        await session.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        for table in reversed(Base.metadata.sorted_tables):
            await session.execute(table.delete())
        await session.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        await session.commit()


@pytest_asyncio.fixture
async def session() -> AsyncSession:
    factory = get_session_factory()
    async with factory() as db_session:
        yield db_session


@pytest_asyncio.fixture
async def client(session: AsyncSession) -> AsyncClient:
    """API client sharing the fixture session with the app.

    Repositories only flush; this override commits once per request on
    success (matching production `get_session`), so fixture-seeded rows
    and request writes are visible to both sides of the test.
    """

    async def _override_get_session():
        try:
            yield session
            await session.commit()
        except Exception:
            raise

    app.dependency_overrides[get_session] = _override_get_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as http_client:
        yield http_client
    app.dependency_overrides.pop(get_session, None)


@pytest.fixture
def ai_router() -> AIRouter:
    return create_default_router()


@pytest.fixture
def ai_service(ai_router: AIRouter) -> AIService:
    return AIService(ai_router=ai_router)


def exercise_factory(**overrides: object) -> dict:
    """Keyword arguments for building a valid Exercise row (Phase 3 shape)."""
    base: dict[str, object] = {
        "exercise_type": "sentence_translation",
        "topic": "Work",
        "subtopic": "Overtime",
        "context": "Một ngày làm việc khá bận rộn.",
        "prompt_vi": "Hôm nay nhiều việc quá nên chắc tui sẽ về muộn.",
        "prompt_vi_hash": "0" * 64,
        "target_length": "sentence",
        "register": "casual",
        "jlpt_level": "N3",
        "difficulty": 5,
        "grammar_complexity": 4,
        "vocabulary_complexity": 5,
        "context_complexity": 6,
        "naturalness_target": 7,
    }
    base.update(overrides)
    return base
