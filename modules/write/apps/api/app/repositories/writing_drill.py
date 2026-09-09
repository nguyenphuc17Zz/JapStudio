"""Repository for Writing Drill Sessions (Phase 18)."""

from __future__ import annotations

from sqlalchemy import desc, func, select

from app.models.writing_drill import WritingDrillSession
from app.repositories.base import BaseRepository


class WritingDrillSessionRepository(BaseRepository[WritingDrillSession]):
    model = WritingDrillSession

    async def get_active_by_user(
        self, user_id: str | None, weakness_id: str | None = None
    ) -> WritingDrillSession | None:
        """Find an active drill session for the user."""
        conditions = [WritingDrillSession.status == "active"]
        if user_id is None:
            conditions.append(WritingDrillSession.user_id.is_(None))
        else:
            conditions.append(WritingDrillSession.user_id == user_id)
        if weakness_id:
            conditions.append(WritingDrillSession.weakness_id == weakness_id)

        query = (
            select(WritingDrillSession)
            .where(*conditions)
            .order_by(desc(WritingDrillSession.created_at))
            .limit(1)
        )
        result = await self.session.execute(query)
        return result.scalars().first()

    async def list_by_user(
        self,
        user_id: str | None,
        status: str | None = None,
        weakness_id: str | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[WritingDrillSession], int]:
        """List drill sessions for a user with optional filters and pagination."""
        conditions = []
        if user_id is None:
            conditions.append(WritingDrillSession.user_id.is_(None))
        else:
            conditions.append(WritingDrillSession.user_id == user_id)
        if status:
            conditions.append(WritingDrillSession.status == status)
        if weakness_id:
            conditions.append(WritingDrillSession.weakness_id == weakness_id)

        count_query = select(func.count()).select_from(WritingDrillSession).where(*conditions)
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        query = (
            select(WritingDrillSession)
            .where(*conditions)
            .order_by(desc(WritingDrillSession.created_at))
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(query)
        items = list(result.scalars().all())
        return items, total
