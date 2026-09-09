"""Repository for Rewrite Lab and Self-Correction sessions (Phase 19)."""

from __future__ import annotations

from sqlalchemy import desc, func, select

from app.models.rewrite_lab import RewriteLabSession
from app.repositories.base import BaseRepository


class RewriteLabRepository(BaseRepository[RewriteLabSession]):
    model = RewriteLabSession

    async def get_active_by_user(
        self, user_id: str | None, source_id: str | None = None
    ) -> RewriteLabSession | None:
        """Find the most recent active session for the user."""
        conditions = [RewriteLabSession.status == "active"]
        if user_id is None:
            conditions.append(RewriteLabSession.user_id.is_(None))
        else:
            conditions.append(RewriteLabSession.user_id == user_id)
        if source_id:
            conditions.append(RewriteLabSession.source_id == source_id)

        query = (
            select(RewriteLabSession)
            .where(*conditions)
            .order_by(desc(RewriteLabSession.created_at))
            .limit(1)
        )
        result = await self.session.execute(query)
        return result.scalars().first()

    async def list_by_user(
        self,
        user_id: str | None,
        status: str | None = None,
        source_type: str | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[RewriteLabSession], int]:
        """List sessions for a user with optional filters and pagination."""
        conditions = []
        if user_id is None:
            conditions.append(RewriteLabSession.user_id.is_(None))
        else:
            conditions.append(RewriteLabSession.user_id == user_id)
        if status:
            conditions.append(RewriteLabSession.status == status)
        if source_type:
            conditions.append(RewriteLabSession.source_type == source_type)

        count_query = select(func.count()).select_from(RewriteLabSession).where(*conditions)
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        query = (
            select(RewriteLabSession)
            .where(*conditions)
            .order_by(desc(RewriteLabSession.created_at))
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(query)
        items = list(result.scalars().all())
        return items, total
