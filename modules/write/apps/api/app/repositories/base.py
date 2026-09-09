from collections.abc import Sequence
from typing import Generic, TypeVar

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    """Generic database access. Holds no business logic."""

    model: type[ModelT]

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    @property
    def session(self) -> AsyncSession:
        """The bound session (used by services for rollback in races)."""
        return self._session

    async def get(self, entity_id: str) -> ModelT | None:
        return await self._session.get(self.model, entity_id)

    async def list(self, *, skip: int = 0, limit: int = 100) -> Sequence[ModelT]:
        result = await self._session.scalars(select(self.model).offset(skip).limit(limit))
        return result.all()

    async def add(self, entity: ModelT) -> ModelT:
        """Stage a new row; callers commit once per request/flow boundary."""
        self._session.add(entity)
        await self._session.flush()
        await self._session.refresh(entity)
        return entity

    async def update(self, entity: ModelT) -> ModelT:
        """Persist attribute changes; callers commit once per request/flow."""
        await self._session.flush()
        await self._session.refresh(entity)
        return entity

    async def delete(self, entity: ModelT) -> None:
        """Remove a row; callers commit once per request/flow."""
        await self._session.delete(entity)
        await self._session.flush()

    async def count(self) -> int:
        return await self._session.scalar(select(func.count()).select_from(self.model)) or 0
