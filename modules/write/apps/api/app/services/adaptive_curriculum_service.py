"""Adaptive Curriculum Service (Phase 22).

High-level orchestrator that coordinates:
  - WritingPriorityEngine (8-signal deterministic priority scoring)
  - DailyWritingPlanService (70/20/10 task composition)
  - ContextRotationEngine (8-context cycle progression)
  - CurriculumEnrichmentService (optional AI enrichment)
"""

from __future__ import annotations

import logging
from typing import Any

from app.core.config import Settings, get_settings
from app.repositories.writing_intelligence import WritingWeaknessRepository
from app.schemas.adaptive_curriculum import (
    DailyPlan,
    PlanTask,
    RankedWeakness,
    SessionDoneResult,
)
from app.services.ai_service import AIService
from app.services.context_rotation_engine import ContextRotationEngine
from app.services.curriculum_enrichment_service import CurriculumEnrichmentService
from app.services.daily_writing_plan_service import DailyWritingPlanService
from app.services.learner_profile_service import LearnerProfileService
from app.services.writing_priority_engine import WritingPriorityEngine

logger = logging.getLogger("app.adaptive_curriculum")


class AdaptiveCurriculumService:
    """Orchestrates writing priorities, daily plans, and session completions."""

    def __init__(
        self,
        weakness_repository: WritingWeaknessRepository,
        settings: Settings | None = None,
        ai_service: AIService | None = None,
        profile_service: LearnerProfileService | None = None,
        enrichment_service: CurriculumEnrichmentService | None = None,
    ) -> None:
        self._weakness_repo = weakness_repository
        self._settings = settings or get_settings()
        self._ai = ai_service or AIService(settings=self._settings)
        self._profiles = profile_service
        self._enrichment = enrichment_service or CurriculumEnrichmentService(
            ai_service=self._ai, settings=self._settings
        )

    # -------------------------------------------------------------------------
    # 1. Priorities
    # -------------------------------------------------------------------------

    async def get_priorities(
        self,
        user_id: str | None,
        *,
        limit: int = 10,
        enrich: bool = False,
    ) -> tuple[list[RankedWeakness], bool]:
        """Fetch and rank all active weaknesses for the learner.

        Returns (ranked_items, enriched_flag).
        """
        all_weaknesses = await self._weakness_repo.list_by_user(user_id, limit=200)
        profile_summary = await self._get_profile_summary(user_id)
        goal_type = profile_summary.get("goal") or "general"

        engine = WritingPriorityEngine(goal_type=goal_type)
        ranked = engine.rank(all_weaknesses)
        sliced = ranked[:limit]

        enriched_flag = False
        if enrich and sliced:
            try:
                sliced = await self._enrichment.enrich_priority_reasons(
                    sliced, profile_summary
                )
                enriched_flag = True
            except Exception as exc:
                logger.warning(
                    "priority reason enrichment failed in get_priorities (fallback) error=%s",
                    type(exc).__name__,
                )

        return sliced, enriched_flag

    # -------------------------------------------------------------------------
    # 2. Daily Plan
    # -------------------------------------------------------------------------

    async def build_daily_plan(
        self,
        user_id: str | None,
        *,
        total_tasks: int = 4,
        enrich: bool = True,
    ) -> DailyPlan:
        """Generate today's tailored 70/20/10 writing plan."""
        all_weaknesses = await self._weakness_repo.list_by_user(user_id, limit=200)
        profile_summary = await self._get_profile_summary(user_id)
        goal_type = profile_summary.get("goal") or "general"

        engine = WritingPriorityEngine(goal_type=goal_type)
        ranked = engine.rank(all_weaknesses)

        planner = DailyWritingPlanService(total_tasks=total_tasks)
        plan = planner.build(ranked, all_weaknesses, profile_summary)

        if enrich and plan.tasks:
            try:
                plan = await self._enrichment.enrich_task_descriptions(
                    plan, profile_summary
                )
            except Exception as exc:
                logger.warning(
                    "task description enrichment failed in build_daily_plan (fallback) error=%s",
                    type(exc).__name__,
                )

        return plan

    # -------------------------------------------------------------------------
    # 3. Session Done & Rotation Advance
    # -------------------------------------------------------------------------

    async def mark_session_done(
        self,
        user_id: str | None,
        completed_task_ids: list[str],
        completed_tasks: list[PlanTask] | None = None,
        *,
        enrich: bool = True,
    ) -> SessionDoneResult:
        """Advance rotation for completed tasks and generate optional debrief."""
        if not completed_task_ids:
            return SessionDoneResult(
                completed_count=0,
                contexts_advanced=[],
                session_debrief=None,
            )

        all_weaknesses = await self._weakness_repo.list_by_user(user_id, limit=200)
        weakness_map = {w.id: w for w in all_weaknesses}

        # Identify which weakness IDs were in the completed tasks
        target_weakness_ids: set[str] = set()
        if completed_tasks:
            for task in completed_tasks:
                if task.task_id in completed_task_ids and task.weakness_id:
                    target_weakness_ids.add(task.weakness_id)
        else:
            # If explicit tasks are not provided, we can look up by task_id matching weakness
            for weakness in all_weaknesses:
                for ctx in [ContextRotationEngine.current_context(weakness)]:
                    # check if any task ID matches
                    for tid in completed_task_ids:
                        if weakness.id in tid:
                            target_weakness_ids.add(weakness.id)

        advanced_ids: list[str] = []
        for wid in target_weakness_ids:
            weakness = weakness_map.get(wid)
            if weakness is not None:
                ContextRotationEngine.advance(weakness)
                advanced_ids.append(wid)

        if advanced_ids:
            await self._weakness_repo.session.flush()

        debrief: str | None = None
        if enrich and completed_tasks:
            profile_summary = await self._get_profile_summary(user_id)
            debrief = await self._enrichment.generate_session_debrief(
                completed_tasks, profile_summary
            )

        return SessionDoneResult(
            completed_count=len(completed_task_ids),
            contexts_advanced=advanced_ids,
            session_debrief=debrief,
        )

    # -------------------------------------------------------------------------
    # Private helpers
    # -------------------------------------------------------------------------

    async def _get_profile_summary(self, user_id: str | None) -> dict[str, Any]:
        if self._profiles is None:
            return {}
        try:
            return await self._profiles.profile_summary(user_id)
        except Exception:
            logger.warning(
                "failed to load learner profile summary for curriculum (using empty dict)",
            )
            return {}
