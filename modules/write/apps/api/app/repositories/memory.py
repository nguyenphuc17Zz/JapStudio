"""Persistence for learner memory (Phase 12)."""

from sqlalchemy import func, select

from app.models.memory import LearnerMemory
from app.repositories.base import BaseRepository


class LearnerMemoryRepository(BaseRepository[LearnerMemory]):
    model = LearnerMemory

    async def get_for_user(self, user_id: str | None, memory_id: str) -> LearnerMemory | None:
        return await self._session.scalar(
            select(LearnerMemory).where(
                LearnerMemory.user_id.is_(None)
                if user_id is None
                else LearnerMemory.user_id == user_id,
                LearnerMemory.id == memory_id,
            )
        )

    async def list_by_user(
        self,
        user_id: str | None,
        *,
        category: str | None = None,
        type: str | None = None,
        source: str | None = None,
        status: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[LearnerMemory], int]:
        """Memory rows for a learner, newest first, with optional filters."""
        conditions = [
            LearnerMemory.user_id.is_(None) if user_id is None else LearnerMemory.user_id == user_id
        ]
        if category is not None:
            conditions.append(LearnerMemory.category == category)
        if type is not None:
            conditions.append(LearnerMemory.type == type)
        if source is not None:
            conditions.append(LearnerMemory.source_type == source)
        if status is not None:
            conditions.append(LearnerMemory.status == status)

        total = (
            await self._session.scalar(
                select(func.count()).select_from(LearnerMemory).where(*conditions)
            )
        ) or 0
        rows = await self._session.scalars(
            select(LearnerMemory)
            .where(*conditions)
            .order_by(LearnerMemory.updated_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(rows.all()), total

    async def list_active_for_user(
        self, user_id: str | None, *, limit: int = 200
    ) -> list[LearnerMemory]:
        """The retrieval pool: active (non-archived/superseded/expired) memories."""
        rows = await self._session.scalars(
            select(LearnerMemory)
            .where(
                LearnerMemory.user_id.is_(None)
                if user_id is None
                else LearnerMemory.user_id == user_id,
                LearnerMemory.status.in_(("candidate", "active")),
            )
            .order_by(LearnerMemory.updated_at.desc())
            .limit(limit)
        )
        return list(rows.all())

    async def find_similar(
        self,
        user_id: str | None,
        category: str,
        type: str,
    ) -> list[LearnerMemory]:
        """Active memories in the same category/type (merge candidates)."""
        rows = await self._session.scalars(
            select(LearnerMemory).where(
                LearnerMemory.user_id.is_(None)
                if user_id is None
                else LearnerMemory.user_id == user_id,
                LearnerMemory.category == category,
                LearnerMemory.type == type,
                LearnerMemory.status.in_(("candidate", "active")),
            )
        )
        return list(rows.all())

    async def list_recent_by_source(
        self, user_id: str | None, source_type: str, *, limit: int = 50
    ) -> list[LearnerMemory]:
        rows = await self._session.scalars(
            select(LearnerMemory)
            .where(
                LearnerMemory.user_id.is_(None)
                if user_id is None
                else LearnerMemory.user_id == user_id,
                LearnerMemory.source_type == source_type,
            )
            .order_by(LearnerMemory.updated_at.desc())
            .limit(limit)
        )
        return list(rows.all())

    async def get_by_source(
        self, user_id: str | None, source_type: str, source_id: str | None
    ) -> LearnerMemory | None:
        """The active memory created for an event source (race-resolution read)."""
        return await self._session.scalar(
            select(LearnerMemory)
            .where(
                LearnerMemory.user_id.is_(None)
                if user_id is None
                else LearnerMemory.user_id == user_id,
                LearnerMemory.source_type == source_type,
                LearnerMemory.source_id.is_(None)
                if source_id is None
                else LearnerMemory.source_id == source_id,
            )
            .order_by(LearnerMemory.created_at.desc())
            .limit(1)
        )
