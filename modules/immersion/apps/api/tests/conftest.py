import os
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Configure test environment
os.environ["ENVIRONMENT"] = "testing"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["ENCRYPTION_KEY"] = "dGhpc2lzYTMyeGJ5dGVrZXlmb3JjcnlwdG9ncmFwaHk="

import app.db.session as session_module
from app.db.base import Base
from app.db.session import get_db
import app.models  # noqa: F401 - ensure all tables are registered on Base.metadata
from app.connectors import register_default_connectors
from app.main import app


@pytest_asyncio.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture(scope="function")
async def test_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provides a fresh isolated in-memory database for each test function,
    patching the global app.db.session so background tasks and services share the test DB.
    """
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        future=True,
    )
    async_session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    old_engine = session_module.engine
    old_sessionmaker = session_module.AsyncSessionLocal

    session_module.engine = engine
    session_module.AsyncSessionLocal = async_session

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async with async_session() as session:
            yield session

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
    finally:
        session_module.engine = old_engine
        session_module.AsyncSessionLocal = old_sessionmaker
        await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(test_db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Provides a test HTTP client with overridden db session dependency."""
    register_default_connectors()

    async def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
