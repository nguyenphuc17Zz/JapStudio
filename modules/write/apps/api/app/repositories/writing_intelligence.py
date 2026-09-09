
from sqlalchemy import func, select

from app.models.writing_intelligence import WritingWeakness
from app.repositories.base import BaseRepository


def _user_condition(model: object, user_id: str | None):
    """NULL user_id selects the anonymous learner's rows."""
    column = getattr(model, "user_id")
    return column.is_(None) if user_id is None else column == user_id


class WritingWeaknessRepository(BaseRepository[WritingWeakness]):
    model = WritingWeakness

    async def get_by_key(
        self, user_id: str | None, category: str, subtype: str
    ) -> WritingWeakness | None:
        return await self._session.scalar(
            select(WritingWeakness).where(
                _user_condition(WritingWeakness, user_id),
                WritingWeakness.category == category,
                WritingWeakness.subtype == subtype,
            )
        )

    async def list_by_user(
        self, user_id: str | None, limit: int = 100
    ) -> list[WritingWeakness]:
        result = await self._session.scalars(
            select(WritingWeakness)
            .where(_user_condition(WritingWeakness, user_id))
            .order_by(WritingWeakness.recurrence_count.desc(), WritingWeakness.last_seen_at.desc())
            .limit(limit)
        )
        return list(result.all())

    async def list_by_status(
        self, user_id: str | None, status: str, limit: int = 50
    ) -> list[WritingWeakness]:
        result = await self._session.scalars(
            select(WritingWeakness)
            .where(
                _user_condition(WritingWeakness, user_id),
                WritingWeakness.status == status,
            )
            .order_by(WritingWeakness.last_seen_at.desc())
            .limit(limit)
        )
        return list(result.all())

    async def list_by_category(
        self, user_id: str | None, category: str, limit: int = 50
    ) -> list[WritingWeakness]:
        result = await self._session.scalars(
            select(WritingWeakness)
            .where(
                _user_condition(WritingWeakness, user_id),
                WritingWeakness.category == category,
            )
            .order_by(WritingWeakness.recurrence_count.desc())
            .limit(limit)
        )
        return list(result.all())

    async def list_top_recurring(
        self, user_id: str | None, limit: int = 5
    ) -> list[WritingWeakness]:
        result = await self._session.scalars(
            select(WritingWeakness)
            .where(_user_condition(WritingWeakness, user_id))
            .order_by(WritingWeakness.recurrence_count.desc(), WritingWeakness.frequency.desc())
            .limit(limit)
        )
        return list(result.all())

    async def list_by_lifecycle(
        self, user_id: str | None, lifecycle_state: str, limit: int = 50
    ) -> list[WritingWeakness]:
        result = await self._session.scalars(
            select(WritingWeakness)
            .where(
                _user_condition(WritingWeakness, user_id),
                WritingWeakness.lifecycle_state == lifecycle_state,
            )
            .order_by(WritingWeakness.last_seen_at.desc())
            .limit(limit)
        )
        return list(result.all())

    async def list_due_retests(
        self, user_id: str | None, now: object | None = None, limit: int = 50
    ) -> list[WritingWeakness]:
        conditions = [
            _user_condition(WritingWeakness, user_id),
            WritingWeakness.retest_due_at.is_not(None),
        ]
        if now is not None:
            conditions.append(WritingWeakness.retest_due_at <= now)
        result = await self._session.scalars(
            select(WritingWeakness)
            .where(*conditions)
            .order_by(WritingWeakness.retest_due_at.asc())
            .limit(limit)
        )
        return list(result.all())

    async def list_improving(
        self, user_id: str | None, limit: int = 50
    ) -> list[WritingWeakness]:
        result = await self._session.scalars(
            select(WritingWeakness)
            .where(
                _user_condition(WritingWeakness, user_id),
                WritingWeakness.lifecycle_state.in_(["improving", "stable"]),
            )
            .order_by(WritingWeakness.mastery_score.desc(), WritingWeakness.last_seen_at.desc())
            .limit(limit)
        )
        return list(result.all())

    async def list_with_filters(
        self,
        user_id: str | None,
        *,
        category: str | None = None,
        status: str | None = None,
        lifecycle_state: str | None = None,
        severity: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[WritingWeakness], int]:
        conditions = [_user_condition(WritingWeakness, user_id)]
        if category is not None:
            conditions.append(WritingWeakness.category == category)
        if status is not None:
            conditions.append(WritingWeakness.status == status)
        if lifecycle_state is not None:
            conditions.append(WritingWeakness.lifecycle_state == lifecycle_state)
        if severity is not None:
            conditions.append(WritingWeakness.severity == severity)

        total = (
            await self._session.scalar(
                select(func.count()).select_from(WritingWeakness).where(*conditions)
            )
        ) or 0

        result = await self._session.scalars(
            select(WritingWeakness)
            .where(*conditions)
            .order_by(WritingWeakness.recurrence_count.desc(), WritingWeakness.last_seen_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.all()), total

