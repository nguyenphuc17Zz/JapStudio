"""Writing Mastery & Boss Assessment Repositories (Phase 23)."""

from __future__ import annotations

from sqlalchemy import select

from app.models.writing_mastery import BossWritingSubmission, BossWritingTask
from app.repositories.base import BaseRepository


def _user_condition(model: object, user_id: str | None):
    """NULL user_id selects the anonymous learner's rows."""
    column = getattr(model, "user_id")
    return column.is_(None) if user_id is None else column == user_id


class BossWritingTaskRepository(BaseRepository[BossWritingTask]):
    model = BossWritingTask

    async def get_pending_task(self, user_id: str | None) -> BossWritingTask | None:
        """Get the most recent pending or in_progress Boss Writing task."""
        result = await self._session.scalars(
            select(BossWritingTask)
            .where(
                _user_condition(BossWritingTask, user_id),
                BossWritingTask.status.in_(["pending", "in_progress"]),
            )
            .order_by(BossWritingTask.created_at.desc())
            .limit(1)
        )
        return result.first()

    async def list_by_user(
        self, user_id: str | None, limit: int = 50
    ) -> list[BossWritingTask]:
        result = await self._session.scalars(
            select(BossWritingTask)
            .where(_user_condition(BossWritingTask, user_id))
            .order_by(BossWritingTask.created_at.desc())
            .limit(limit)
        )
        return list(result.all())


class BossWritingSubmissionRepository(BaseRepository[BossWritingSubmission]):
    model = BossWritingSubmission

    async def get_by_task_id(self, task_id: str) -> BossWritingSubmission | None:
        result = await self._session.scalars(
            select(BossWritingSubmission)
            .where(BossWritingSubmission.task_id == task_id)
            .order_by(BossWritingSubmission.created_at.desc())
            .limit(1)
        )
        return result.first()

    async def list_by_user(
        self, user_id: str | None, limit: int = 50
    ) -> list[BossWritingSubmission]:
        result = await self._session.scalars(
            select(BossWritingSubmission)
            .where(_user_condition(BossWritingSubmission, user_id))
            .order_by(BossWritingSubmission.evaluated_at.desc())
            .limit(limit)
        )
        return list(result.all())
