"""Curriculum repository (Phase 13): journeys, milestones, objectives,
progress, plans and replanning events."""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    CurriculumPlan,
    CurriculumReplanningEvent,
    LearningJourney,
    LearningMilestone,
    LearningObjective,
    ObjectiveProgress,
)
from app.repositories.base import BaseRepository


class LearningJourneyRepository(BaseRepository[LearningJourney]):
    model = LearningJourney

    async def get_active(self, user_id: str | None) -> LearningJourney | None:
        return await self._session.scalar(
            select(LearningJourney)
            .where(
                LearningJourney.user_id == user_id,
                LearningJourney.status == "active",
            )
            .order_by(LearningJourney.created_at.desc())
            .limit(1)
        )

    async def list_for_user(
        self, user_id: str | None, limit: int = 20
    ) -> Sequence[LearningJourney]:
        result = await self._session.scalars(
            select(LearningJourney)
            .where(LearningJourney.user_id == user_id)
            .order_by(LearningJourney.created_at.desc())
            .limit(limit)
        )
        return result.all()


class LearningMilestoneRepository(BaseRepository[LearningMilestone]):
    model = LearningMilestone

    async def list_for_journey(self, journey_id: str) -> Sequence[LearningMilestone]:
        result = await self._session.scalars(
            select(LearningMilestone)
            .where(LearningMilestone.journey_id == journey_id)
            .order_by(LearningMilestone.position)
        )
        return result.all()


class LearningObjectiveRepository(BaseRepository[LearningObjective]):
    model = LearningObjective

    async def list_for_journey(self, journey_id: str) -> Sequence[LearningObjective]:
        result = await self._session.scalars(
            select(LearningObjective)
            .join(LearningMilestone, LearningMilestone.id == LearningObjective.milestone_id)
            .where(LearningMilestone.journey_id == journey_id)
            .order_by(LearningMilestone.position, LearningObjective.position)
        )
        return result.all()

    async def list_for_milestone(self, milestone_id: str) -> Sequence[LearningObjective]:
        result = await self._session.scalars(
            select(LearningObjective)
            .where(LearningObjective.milestone_id == milestone_id)
            .order_by(LearningObjective.position)
        )
        return result.all()

    async def get_active(self, journey_id: str) -> LearningObjective | None:
        """The single currently-practiceable objective of a journey."""
        return await self._session.scalar(
            select(LearningObjective)
            .join(LearningMilestone, LearningMilestone.id == LearningObjective.milestone_id)
            .where(
                LearningMilestone.journey_id == journey_id,
                LearningObjective.status == "active",
            )
            .order_by(LearningMilestone.position, LearningObjective.position)
            .limit(1)
        )

    async def get_by_id_and_journey(
        self, journey_id: str, objective_id: str
    ) -> LearningObjective | None:
        return await self._session.scalar(
            select(LearningObjective)
            .join(LearningMilestone, LearningMilestone.id == LearningObjective.milestone_id)
            .where(
                LearningMilestone.journey_id == journey_id,
                LearningObjective.id == objective_id,
            )
        )


class ObjectiveProgressRepository(BaseRepository[ObjectiveProgress]):
    model = ObjectiveProgress

    async def get_for_objective(self, objective_id: str) -> ObjectiveProgress | None:
        return await self._session.scalar(
            select(ObjectiveProgress).where(ObjectiveProgress.objective_id == objective_id)
        )

    async def list_for_journey(self, journey_id: str) -> dict[str, ObjectiveProgress]:
        result = await self._session.scalars(
            select(ObjectiveProgress)
            .join(
                LearningObjective,
                LearningObjective.id == ObjectiveProgress.objective_id,
            )
            .join(LearningMilestone, LearningMilestone.id == LearningObjective.milestone_id)
            .where(LearningMilestone.journey_id == journey_id)
        )
        return {progress.objective_id: progress for progress in result.all()}


class CurriculumPlanRepository(BaseRepository[CurriculumPlan]):
    model = CurriculumPlan


class CurriculumReplanningEventRepository(BaseRepository[CurriculumReplanningEvent]):
    model = CurriculumReplanningEvent

    async def list_for_journey(
        self, journey_id: str, limit: int = 20
    ) -> Sequence[CurriculumReplanningEvent]:
        result = await self._session.scalars(
            select(CurriculumReplanningEvent)
            .where(CurriculumReplanningEvent.journey_id == journey_id)
            .order_by(CurriculumReplanningEvent.created_at.desc())
            .limit(limit)
        )
        return result.all()


class CurriculumRepository:
    """Facade over the curriculum tables for one request session."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.journeys = LearningJourneyRepository(session)
        self.milestones = LearningMilestoneRepository(session)
        self.objectives = LearningObjectiveRepository(session)
        self.progress = ObjectiveProgressRepository(session)
        self.plans = CurriculumPlanRepository(session)
        self.replanning = CurriculumReplanningEventRepository(session)
