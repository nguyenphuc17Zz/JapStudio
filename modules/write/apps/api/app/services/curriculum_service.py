"""Curriculum & learning journey orchestration (Phase 13).

Pipeline:
  goal interpretation (AI, taxonomy-validated)
  -> curriculum planning (AI + deterministic fallback, quality-gated)
  -> persistence (milestones / objectives / progress rows)
  -> journey explanation (AI, optional enrichment)
  -> deterministic progress recomputation on every evidence record
  -> deterministic replanning triggers (AI replanning only when requested)

Mastery state, objective completion and entry criteria are ALWAYS computed
in code; AI output never overrides them.
"""

import logging
from datetime import datetime, timezone
from typing import Any

from app.core.config import Settings, get_settings
from app.domain.curriculum_taxonomy import (
    COMPETENCY_LABELS_VI,
    COMPETENCY_TO_MODES,
    GOAL_LABELS_VI,
    GOAL_TYPES,
    competencies_for_goal,
    skills_for_competencies,
)
from app.models import (
    CurriculumPlan,
    CurriculumReplanningEvent,
    LearningJourney,
    LearningMilestone,
    LearningObjective,
    ObjectiveProgress,
)
from app.prompts.curriculum import (
    build_curriculum_explanation_prompt,
    build_curriculum_planning_prompt,
    build_curriculum_replanning_prompt,
    build_goal_interpretation_prompt,
    build_objective_progress_analysis_prompt,
    curriculum_planning_prompt_version,
    curriculum_replanning_prompt_version,
)
from app.providers.ai.base import AIGenerationResult
from app.providers.ai.errors import AIError
from app.quality.service import create_quality_service
from app.repositories.curriculum import CurriculumRepository
from app.schemas.learning_ai import (
    CurriculumPlanningResult,
    CurriculumReplanningResult,
    GoalInterpretationResult,
    ObjectiveProgressAnalysisResult,
    RecommendationExplanationResult,
)
from app.services.ai_service import AIService
from app.services.objective_mastery import (
    compute_mastery_state,
    is_objective_completed,
    update_modes_used,
    update_skill_evidence,
)

logger = logging.getLogger("app.curriculum")

_REPLAN_ALLOWED_FIELDS = {
    "title",
    "description",
    "target_competencies",
    "exercise_modes",
    "target_level",
    "priority",
    "success_criteria",
}

TRIGGER_STAGNATION = "stagnation"
TRIGGER_PLATEAU = "plateau"
TRIGGER_GOAL_CHANGE = "goal_change"
TRIGGER_OBJECTIVE_REQUEST = "objective_change_request"
TRIGGER_MANUAL = "manual"
TRIGGER_NONE = "none"


class CurriculumService:
    """Long-term journey engine: planning, evidence, mastery and replanning."""

    def __init__(
        self,
        session: Any,
        settings: Settings | None = None,
        ai_service: AIService | None = None,
    ) -> None:
        self._session = session
        self._settings = settings or get_settings()
        self._ai = ai_service or AIService(settings=self._settings)
        self._curriculum = CurriculumRepository(session)
        self._quality = create_quality_service(settings=self._settings)

    # -- provider wiring ------------------------------------------------------

    def _curriculum_task(
        self, provider_override: str | None = None, model_override: str | None = None
    ) -> tuple[str | None, str | None]:
        provider = (
            provider_override
            or self._settings.ai_curriculum_provider
            or self._settings.ai_learning_provider
            or self._settings.ai_exercise_evaluation_provider
            or self._settings.ai_exercise_generation_provider
            or None
        )
        model = (
            model_override
            or self._settings.ai_curriculum_model
            or self._settings.ai_learning_model
            or self._settings.ai_exercise_evaluation_model
            or self._settings.ai_exercise_generation_model
            or None
        )
        return provider, model

    def _planning_task(
        self, provider_override: str | None = None, model_override: str | None = None
    ) -> tuple[str | None, str | None]:
        provider, model = self._curriculum_task(provider_override, model_override)
        model = model_override or self._settings.ai_curriculum_planning_model or model
        return provider, model

    def _replanning_task(
        self, provider_override: str | None = None, model_override: str | None = None
    ) -> tuple[str | None, str | None]:
        provider, model = self._curriculum_task(provider_override, model_override)
        model = model_override or self._settings.ai_curriculum_replanning_model or model
        return provider, model

    def _explanation_task(
        self, provider_override: str | None = None, model_override: str | None = None
    ) -> tuple[str | None, str | None]:
        provider, model = self._curriculum_task(provider_override, model_override)
        model = model_override or self._settings.ai_curriculum_explanation_model or model
        return provider, model

    # -- journey creation -----------------------------------------------------

    async def create_journey(
        self,
        user_id: str | None,
        goal_type: str | None = None,
        goal: str | None = None,
        force_regenerate: bool = False,
        provider: str | None = None,
        model: str | None = None,
    ) -> LearningJourney:
        """Create (or force-regenerate) the active journey for a learner."""
        if not force_regenerate:
            existing = await self._curriculum.journeys.get_active(user_id)
            if existing is not None:
                return existing

        previous = await self._curriculum.journeys.get_active(user_id)
        if previous is not None:
            previous.status = "archived"
            previous.archived_at = datetime.now(timezone.utc)
            await self._curriculum.journeys.update(previous)

        goal_type, focus_competencies, suggested_goal = await self._resolve_goal(
            user_id, goal_type, goal, provider=provider, model=model
        )
        memory_block = await self._memory_block(user_id)

        plan, plan_meta = await self._build_plan(
            user_id,
            goal_type,
            goal or suggested_goal,
            focus_competencies,
            memory_block,
            provider=provider,
            model=model,
        )
        journey = await self._persist_plan(
            user_id, goal_type, goal or suggested_goal, plan, plan_meta
        )
        await self._explain_journey(journey)
        return journey

    async def _resolve_goal(
        self,
        user_id: str | None,
        goal_type: str | None,
        goal: str | None,
        provider: str | None = None,
        model: str | None = None,
    ) -> tuple[str, list[str], str]:
        """Goal type is authoritative; interpretation only fills gaps."""
        if goal_type is not None:
            if goal_type not in GOAL_TYPES:
                goal_type = "general"
            return (
                goal_type,
                competencies_for_goal(goal_type),
                GOAL_LABELS_VI.get(goal_type, goal_type),
            )

        profile_goal_type = await self._profile_goal_type(user_id)
        if profile_goal_type is not None:
            return (
                profile_goal_type,
                competencies_for_goal(profile_goal_type),
                GOAL_LABELS_VI.get(profile_goal_type, profile_goal_type),
            )

        if not goal or not self._settings.ai_curriculum_enabled:
            return "general", competencies_for_goal("general"), "Chung"

        interpretation, meta = await self._interpret_goal(
            user_id, goal, provider=provider, model=model
        )
        if interpretation is None:
            return "general", competencies_for_goal("general"), "Chung"
        return (
            interpretation.goal_type,
            list(interpretation.focus_competencies),
            interpretation.suggested_goal,
        )

    async def _profile_goal_type(self, user_id: str | None) -> str | None:
        from sqlalchemy import select

        from app.models import LearnerProfile

        profile = await self._session.scalar(
            select(LearnerProfile).where(LearnerProfile.user_id == user_id)
        )
        if profile is None or not profile.goal_type:
            return None
        if profile.goal_type not in GOAL_TYPES:
            return None
        return profile.goal_type

    async def _interpret_goal(
        self,
        user_id: str | None,
        goal: str,
        provider: str | None = None,
        model: str | None = None,
    ) -> tuple[GoalInterpretationResult | None, AIGenerationResult | None]:
        stage_provider, stage_model = self._curriculum_task(provider, model)
        summary = await self._evidence_summary(user_id)
        prompt = build_goal_interpretation_prompt(goal, summary)
        try:
            result, meta = await self._ai.generate_structured(
                prompt,
                GoalInterpretationResult,
                system=prompt,
                provider=stage_provider,
                model=stage_model,
                max_tokens=self._settings.ai_curriculum_max_tokens,
            )
            assert isinstance(result, GoalInterpretationResult)
        except AIError as exc:
            logger.warning("goal_interpretation provider_failed error=%s", type(exc).__name__)
            return None, None
        outcome = self._quality.validate(
            "goal_interpretation",
            result,
            provider=stage_provider,
            model=stage_model,
        )
        if not outcome.passed:
            logger.info("goal_interpretation rejected: %s", outcome.violations)
            return None, None
        return result, meta

    async def _build_plan(
        self,
        user_id: str | None,
        goal_type: str,
        goal: str,
        focus_competencies: list[str],
        memory_block: str,
        provider: str | None = None,
        model: str | None = None,
    ) -> tuple[CurriculumPlanningResult, dict[str, Any]]:
        fallback = self._fallback_plan(goal_type, goal)
        if not self._settings.ai_curriculum_enabled:
            return fallback, {"source": "fallback", "reason": "ai_curriculum_enabled=false"}

        stage_provider, stage_model = self._planning_task(provider, model)
        summary = await self._evidence_summary(user_id)
        prompt = build_curriculum_planning_prompt(
            goal_type, goal, focus_competencies, summary, memory_block
        )
        try:
            result, meta = await self._ai.generate_structured(
                prompt,
                CurriculumPlanningResult,
                system=prompt,
                provider=stage_provider,
                model=stage_model,
                max_tokens=self._settings.ai_curriculum_max_tokens,
            )
            assert isinstance(result, CurriculumPlanningResult)
        except AIError as exc:
            logger.warning("curriculum_planning provider_failed error=%s", type(exc).__name__)
            return fallback, {"source": "fallback", "reason": "provider_failed"}

        outcome = self._quality.validate(
            "curriculum_planning",
            result,
            provider=stage_provider,
            model=stage_model,
            context={
                "goal_type": goal_type,
                "focus_competencies": focus_competencies,
                "settings": self._settings,
            },
        )
        if not outcome.passed:
            logger.info(
                "curriculum_planning rejected: %s (falling back to deterministic plan)",
                outcome.violations,
            )
            return fallback, {"source": "fallback", "reason": "quality_rejected"}
        return result, {"source": "ai", "meta": meta}

    def _fallback_plan(self, goal_type: str, goal: str) -> CurriculumPlanningResult:
        """Deterministic plan built from the taxonomy when AI is unavailable."""
        competencies = competencies_for_goal(goal_type)
        milestones: list[dict[str, Any]] = []
        objectives: list[dict[str, Any]] = []
        group_size = 3
        for index, start in enumerate(range(0, len(competencies), group_size), start=1):
            chunk = competencies[start : start + group_size]
            labels = " - ".join(COMPETENCY_LABELS_VI.get(c, c) for c in chunk)
            milestones.append(
                {
                    "title": f"Giai đoạn {index}: {labels}",
                    "description": ("Tập trung xây dựng các năng lực: " + labels + "."),
                }
            )
            for _position, competency in enumerate(chunk, start=1):
                objectives.append(
                    {
                        "title": f"Luyện {COMPETENCY_LABELS_VI.get(competency, competency)}",
                        "description": (
                            "Rèn luyện năng lực "
                            f"{COMPETENCY_LABELS_VI.get(competency, competency)} "
                            "qua các bài tập phù hợp."
                        ),
                        "target_competencies": [competency],
                        "exercise_modes": COMPETENCY_TO_MODES.get(
                            competency, ["sentence_translation"]
                        )[:2],
                        "target_level": "N4",
                        "priority": 3,
                        "success_criteria": {},
                    }
                )
        return CurriculumPlanningResult(
            title=f"Lộ trình học tiếng Nhật ({GOAL_LABELS_VI.get(goal_type, goal_type)})",
            overview_vi=(
                "Lộ trình được xây dựng từ các năng lực cần thiết cho mục tiêu của "
                "bạn, chia thành các giai đoạn từ nền tảng đến vận dụng."
            ),
            milestones=milestones,
            objectives=objectives,
        )

    async def _persist_plan(
        self,
        user_id: str | None,
        goal_type: str,
        goal: str,
        plan: CurriculumPlanningResult,
        plan_meta: dict[str, Any],
    ) -> LearningJourney:
        """Persist journey + milestones + objectives + progress rows."""
        provider = self._settings.ai_curriculum_provider or "deterministic"
        model = (
            self._settings.ai_curriculum_planning_model
            or self._settings.ai_curriculum_model
            or "deterministic"
        )
        source = plan_meta.get("source", "ai")

        journey = await self._curriculum.journeys.add(
            LearningJourney(
                user_id=user_id,
                goal_type=goal_type,
                goal=goal or None,
                status="active",
                progress=0,
                planning_prompt_version=curriculum_planning_prompt_version(),
                planning_provider=provider,
                planning_model=model,
                source=source,
                review_meta={"source": source, "ai_meta": _meta_payload(plan_meta.get("meta"))},
            )
        )

        await self._curriculum.plans.add(
            CurriculumPlan(
                user_id=user_id,
                journey_id=journey.id,
                plan_type="initial",
                goal_type=goal_type,
                payload=plan.model_dump(),
                provider=provider,
                model=model,
                prompt_version=curriculum_planning_prompt_version(),
                review_meta={"source": source},
            )
        )

        for milestone_index, milestone_plan in enumerate(plan.milestones, start=1):
            per_milestone = _objectives_per_milestone(milestone_index, plan)
            if per_milestone <= 0:
                logger.warning(
                    "journey_plan milestone without objectives skipped position=%d",
                    milestone_index,
                )
                continue
            milestone = await self._curriculum.milestones.add(
                LearningMilestone(
                    journey_id=journey.id,
                    position=milestone_index,
                    title=milestone_plan.title,
                    description=milestone_plan.description,
                    entry_criteria=self._milestone_entry_criteria(milestone_index),
                    status="locked",
                )
            )
            for position in range(1, per_milestone + 1):
                objective_plan = plan.objectives[
                    _objective_offset(milestone_index, plan) + position - 1
                ]
                objective = await self._curriculum.objectives.add(
                    LearningObjective(
                        milestone_id=milestone.id,
                        position=position,
                        title=objective_plan.title,
                        description=objective_plan.description,
                        target_competencies=list(objective_plan.target_competencies),
                        target_skills=skills_for_competencies(
                            list(objective_plan.target_competencies)
                        ),
                        exercise_modes=list(objective_plan.exercise_modes),
                        target_level=objective_plan.target_level,
                        priority=objective_plan.priority,
                        entry_criteria=self._objective_entry_criteria(milestone_index, position),
                        success_criteria=self._default_success_criteria(objective_plan),
                        status="locked",
                    )
                )
                await self._curriculum.progress.add(
                    ObjectiveProgress(
                        objective_id=objective.id,
                        mastery_state="not_started",
                        skill_evidence={},
                        modes_used={},
                    )
                )

        await self._recompute_progress(journey.id)
        await self._session.flush()
        logger.info(
            "journey_created user_id=%s goal_type=%s milestones=%d objectives=%d source=%s",
            user_id,
            goal_type,
            len(plan.milestones),
            len(plan.objectives),
            source,
        )
        return journey

    def _milestone_entry_criteria(self, milestone_index: int) -> dict[str, Any]:
        if milestone_index <= 1:
            return {}
        return {"previous_milestone_completed": True}

    def _objective_entry_criteria(
        self, milestone_index: int, objective_index: int
    ) -> dict[str, Any]:
        criteria: dict[str, Any] = {}
        if milestone_index > 1:
            criteria["previous_milestone_completed"] = True
        if objective_index > 1:
            criteria["previous_objective_completed"] = True
        return criteria

    @staticmethod
    def _default_success_criteria(objective_plan: Any) -> dict[str, Any]:
        criteria = dict(objective_plan.success_criteria or {})
        criteria.setdefault("threshold", 80)
        criteria.setdefault("modes_required", 2)
        criteria.setdefault("min_attempts", 5)
        return criteria

    # -- progress computation -------------------------------------------------

    async def _recompute_progress(self, journey_id: str) -> None:
        """Deterministic state machine over milestones/objectives/progress."""
        journey = await self._curriculum.journeys.get(journey_id)
        if journey is None:
            return
        milestones = await self._curriculum.milestones.list_for_journey(journey_id)
        objectives = await self._curriculum.objectives.list_for_journey(journey_id)
        progress_rows = await self._curriculum.progress.list_for_journey(journey_id)
        milestone_by_id = {milestone.id: milestone for milestone in milestones}
        objectives_by_milestone: dict[str, list[LearningObjective]] = {}
        for objective in objectives:
            objectives_by_milestone.setdefault(objective.milestone_id, []).append(objective)

        previous_milestone_completed = True
        for milestone in milestones:
            milestone_completed = milestone.status == "completed"
            if not milestone_completed and not previous_milestone_completed:
                milestone.status = "locked"
                milestone.completed_at = None
            elif not milestone_completed and previous_milestone_completed:
                milestone.status = "active"
                if milestone.unlocked_at is None:
                    milestone.unlocked_at = datetime.now(timezone.utc)

            for objective in objectives_by_milestone.get(milestone.id, []):
                if milestone.status == "locked":
                    if objective.status not in ("completed", "skipped"):
                        objective.status = "locked"
                        objective.unlocked_at = None
                    continue
                progress = progress_rows.get(objective.id)
                if progress is None:
                    continue
                if objective.status == "skipped":
                    continue
                if objective.status == "completed":
                    continue

                entry_ok = self._entry_satisfied(
                    objective, milestone, progress_rows, objectives_by_milestone
                )
                if not entry_ok:
                    objective.status = "locked"
                    objective.unlocked_at = None
                    continue

                objective.status = "active"
                if objective.unlocked_at is None:
                    objective.unlocked_at = datetime.now(timezone.utc)

                completed, _ = is_objective_completed(
                    _objective_dict(objective, progress), _progress_dict(progress), self._settings
                )
                if completed:
                    objective.status = "completed"
                    if objective.completed_at is None:
                        objective.completed_at = datetime.now(timezone.utc)
                    progress.completed_at = objective.completed_at

            if milestone.status != "completed" and all(
                objective.status in ("completed", "skipped")
                for objective in objectives_by_milestone.get(milestone.id, [])
            ):
                milestone.status = "completed"
                if milestone.completed_at is None:
                    milestone.completed_at = datetime.now(timezone.utc)

            previous_milestone_completed = milestone.status == "completed"

        total = len(objectives) or 1
        completed = sum(
            1 for objective in objectives if objective.status in ("completed", "skipped")
        )
        journey.progress = round(completed * 100 / total)

        active_objective = next(
            (objective for objective in objectives if objective.status == "active"), None
        )
        active_milestone = (
            milestone_by_id.get(active_objective.milestone_id) if active_objective else None
        )
        journey.current_objective_id = active_objective.id if active_objective else None
        journey.current_milestone_id = active_milestone.id if active_milestone else None

        if total and completed >= total:
            journey.status = "completed"
            if journey.completed_at is None:
                journey.completed_at = datetime.now(timezone.utc)

        await self._curriculum.journeys.update(journey)

    def _entry_satisfied(
        self,
        objective: LearningObjective,
        milestone: LearningMilestone,
        progress_rows: dict[str, ObjectiveProgress],
        objectives_by_milestone: dict[str, list[LearningObjective]],
    ) -> bool:
        criteria = dict(objective.entry_criteria or {})
        if criteria.get("previous_objective_completed"):
            siblings = objectives_by_milestone.get(milestone.id, [])
            previous = next((s for s in siblings if s.position == objective.position - 1), None)
            if previous is not None and previous.status not in ("completed", "skipped"):
                return False
        return True

    async def _explain_journey(self, journey: LearningJourney) -> None:
        """Optional learner-facing explanation (never blocks creation)."""
        try:
            snapshot = await self._journey_snapshot(journey.id)
            provider, model = self._explanation_task()
            prompt = build_curriculum_explanation_prompt(snapshot)
            result, _ = await self._ai.generate_structured(
                prompt,
                RecommendationExplanationResult,
                system=prompt,
                provider=provider,
                model=model,
                max_tokens=self._settings.ai_curriculum_max_tokens,
            )
            assert isinstance(result, RecommendationExplanationResult)
            journey.explanation = result.explanation
            await self._curriculum.journeys.update(journey)
        except Exception:
            logger.exception("journey explanation failed (journey is unaffected)")

    # -- reads ----------------------------------------------------------------

    async def get_status(self, user_id: str | None) -> LearningJourney | None:
        return await self._curriculum.journeys.get_active(user_id)

    async def get_active_objective(
        self, user_id: str | None
    ) -> tuple[LearningJourney, LearningMilestone, LearningObjective, ObjectiveProgress] | None:
        journey = await self._curriculum.journeys.get_active(user_id)
        if journey is None:
            return None
        objective = await self._curriculum.objectives.get_active(journey.id)
        if objective is None:
            return None
        milestone = await self._curriculum.milestones.get(objective.milestone_id)
        progress = await self._curriculum.progress.get_for_objective(objective.id)
        if milestone is None or progress is None:
            return None
        return journey, milestone, objective, progress

    async def get_objective_context(self, user_id: str | None) -> dict[str, Any] | None:
        active = await self.get_active_objective(user_id)
        if active is None:
            return None
        journey, milestone, objective, progress = active
        competencies = objective.target_competencies or []
        return {
            "objective_id": objective.id,
            "milestone_id": milestone.id,
            "objective_title": objective.title,
            "milestone_title": milestone.title,
            "competency_labels_vi": {
                competency: COMPETENCY_LABELS_VI.get(competency, competency)
                for competency in competencies
            },
            "target_skills": objective.target_skills or [],
            "suggested_modes": objective.exercise_modes or [],
            "context": journey.explanation or journey.goal or "",
            "progress": _progress_dict(progress),
        }

    async def _journey_snapshot(self, journey_id: str) -> dict[str, Any]:
        journey = await self._curriculum.journeys.get(journey_id)
        milestones = await self._curriculum.milestones.list_for_journey(journey_id)
        objectives = await self._curriculum.objectives.list_for_journey(journey_id)
        progress_rows = await self._curriculum.progress.list_for_journey(journey_id)
        return {
            "journey": {
                "goal_type": journey.goal_type,
                "goal": journey.goal,
                "status": journey.status,
                "progress": journey.progress,
                "source": journey.source,
            },
            "milestones": [
                {
                    "id": milestone.id,
                    "position": milestone.position,
                    "title": milestone.title,
                    "status": milestone.status,
                }
                for milestone in milestones
            ],
            "objectives": [
                {
                    "id": objective.id,
                    "title": objective.title,
                    "target_competencies": objective.target_competencies,
                    "status": objective.status,
                }
                for objective in objectives
            ],
            "progress": {
                objective_id: _progress_dict(progress_rows[objective_id])
                for objective_id in progress_rows
            },
        }

    async def _evidence_summary(self, user_id: str | None) -> dict[str, Any]:
        """Compact deterministic evidence summary for planning context."""
        from app.repositories import (
            DiscourseEvaluationRepository,
            ExerciseAttemptRepository,
        )
        from app.services.learner_evidence import LearnerEvidenceService

        try:
            service = LearnerEvidenceService(
                ExerciseAttemptRepository(self._session),
                self._settings,
                DiscourseEvaluationRepository(self._session),
            )
            return await service.compute_summary(user_id)
        except Exception:
            logger.exception("evidence summary failed (planning continues without it)")
            return {}

    async def _memory_block(self, user_id: str | None) -> str:
        from app.repositories import LearnerMemoryRepository, LearnerProfileRepository
        from app.services.memory_service import MemoryService

        try:
            memory = MemoryService(
                LearnerMemoryRepository(self._session),
                LearnerProfileRepository(self._session),
                self._ai,
                self._settings,
            )
            return await memory.context_builder().memory_block(user_id, "curriculum")
        except Exception:
            logger.exception("memory context failed user_id=%s", user_id)
            return ""

    # -- evidence hook --------------------------------------------------------

    async def record_evidence(
        self,
        user_id: str | None,
        *,
        exercise_id: str,
        attempt_id: str,
        score: int,
        skills: dict[str, int],
        mode: str,
    ) -> dict[str, Any]:
        """Fold one evaluated attempt into the active objective's evidence.

        Returns completion flags for the router to award XP:
        {"objective_completed": bool, "milestone_completed": bool,
         "journey_completed": bool, "objective_id": str | None}
        """
        result = {
            "objective_completed": False,
            "milestone_completed": False,
            "journey_completed": False,
            "objective_id": None,
            "milestone_id": None,
        }
        if not self._settings.ai_curriculum_enabled:
            return result
        active = await self.get_active_objective(user_id)
        if active is None:
            return result
        journey, milestone, objective, progress = active
        milestone_was_completed = milestone.status == "completed"

        target_skills = set(objective.target_skills or [])
        relevant = {
            skill: int(value)
            for skill, value in skills.items()
            if skill in target_skills and isinstance(value, (int, float))
        }

        progress.attempts_submitted += 1
        progress.exercises_completed += 1
        progress.best_score = max(progress.best_score, int(score))
        if progress.average_score == 0:
            progress.average_score = int(score)
        else:
            progress.average_score = round(
                (progress.average_score * (progress.exercises_completed - 1) + int(score))
                / progress.exercises_completed
            )
        progress.skill_evidence = update_skill_evidence(
            progress.skill_evidence, relevant, mode, self._settings
        )
        progress.modes_used = update_modes_used(progress.modes_used, mode)
        progress.last_attempt_at = datetime.now(timezone.utc)

        completed, _ = is_objective_completed(
            _objective_dict(objective, progress), _progress_dict(progress), self._settings
        )
        progress.mastery_state = compute_mastery_state(_progress_dict(progress), self._settings)
        if completed:
            progress.completed_at = datetime.now(timezone.utc)
            objective.status = "completed"
            objective.completed_at = progress.completed_at
            result["objective_completed"] = True
            result["objective_id"] = objective.id
        await self._curriculum.progress.update(progress)
        await self._curriculum.objectives.update(objective)

        await self._recompute_progress(journey.id)
        journey = await self._curriculum.journeys.get(journey.id)
        if journey is not None and journey.status == "completed":
            result["journey_completed"] = True
        milestone = await self._curriculum.milestones.get(milestone.id)
        if milestone is not None:
            if not milestone_was_completed and milestone.status == "completed":
                result["milestone_completed"] = True
                result["milestone_id"] = milestone.id
        await self._record_replanning_evaluation(journey, user_id)
        return result

    # -- replanning -----------------------------------------------------------

    async def _record_replanning_evaluation(
        self, journey: LearningJourney | None, user_id: str | None
    ) -> None:
        """Deterministic trigger evaluation after evidence accumulates."""
        if journey is None or journey.status != "active":
            return
        attempts = journey.progress
        if attempts <= 0 or attempts % self._settings.ai_curriculum_replan_interval != 0:
            return
        try:
            trigger, reason, requested = await self._evaluate_replanning_triggers(journey)
        except Exception:
            logger.exception("replanning evaluation failed (skipped)")
            return
        if trigger == TRIGGER_NONE:
            return
        await self._curriculum.replanning.add(
            CurriculumReplanningEvent(
                journey_id=journey.id,
                trigger=trigger,
                replan_requested=requested,
                current_progress={"progress": journey.progress},
                reason=reason,
                applied=False,
            )
        )
        logger.info(
            "replanning trigger journey=%s trigger=%s requested=%s",
            journey.id,
            trigger,
            requested,
        )

    async def _evaluate_replanning_triggers(
        self, journey: LearningJourney
    ) -> tuple[str, str, bool]:
        """Deterministic trigger scan; AI replanning runs only when requested."""
        objectives = await self._curriculum.objectives.list_for_journey(journey.id)
        progress_rows = await self._curriculum.progress.list_for_journey(journey.id)
        active = next((o for o in objectives if o.status == "active"), None)
        if active is None:
            return TRIGGER_NONE, "", False
        progress = progress_rows.get(active.id)
        if (
            progress is None
            or progress.attempts_submitted < self._settings.ai_curriculum_min_evidence_confident
        ):
            return TRIGGER_NONE, "", False

        attempts = progress.attempts_submitted
        best = progress.best_score
        average = progress.average_score
        threshold = self._settings.ai_curriculum_default_threshold
        if best >= threshold:
            return TRIGGER_NONE, "", False
        if average < 50 and attempts >= self._settings.ai_curriculum_replan_interval:
            return (
                TRIGGER_STAGNATION,
                f"average {average} stays below 50 after {attempts} attempts",
                True,
            )
        if attempts >= self._settings.ai_curriculum_replan_interval:
            return (
                TRIGGER_PLATEAU,
                f"score plateau at {average} after {attempts} attempts",
                True,
            )
        return TRIGGER_NONE, "", False

    async def replan(
        self,
        user_id: str | None,
        requested_changes: list[dict[str, Any]] | None = None,
        force: bool = False,
    ) -> dict[str, Any]:
        """Evaluate triggers; optionally run AI replanning and apply changes."""
        journey = await self._curriculum.journeys.get_active(user_id)
        if journey is None:
            return {
                "journey_id": None,
                "replan_requested": False,
                "trigger": TRIGGER_NONE,
                "reason": "no active journey",
                "applied": False,
                "event_id": None,
            }

        if force:
            trigger, reason, requested = TRIGGER_MANUAL, "manual replanning request", True
        elif requested_changes:
            trigger, reason, requested = (
                TRIGGER_OBJECTIVE_REQUEST,
                "objective change requested by learner",
                True,
            )
        else:
            trigger, reason, requested = await self._evaluate_replanning_triggers(journey)

        event = await self._curriculum.replanning.add(
            CurriculumReplanningEvent(
                journey_id=journey.id,
                trigger=trigger,
                replan_requested=requested,
                current_progress={"progress": journey.progress},
                reason=reason,
                applied=False,
            )
        )
        if not requested:
            return {
                "journey_id": journey.id,
                "replan_requested": False,
                "trigger": trigger,
                "reason": reason,
                "applied": False,
                "event_id": event.id,
            }

        applied = False
        if self._settings.ai_curriculum_enabled and (requested_changes or force):
            applied = await self._apply_ai_replanning(journey, requested_changes or [])
        event.applied = applied
        await self._curriculum.replanning.update(event)
        return {
            "journey_id": journey.id,
            "replan_requested": True,
            "trigger": trigger,
            "reason": reason,
            "applied": applied,
            "event_id": event.id,
        }

    async def _apply_ai_replanning(
        self, journey: LearningJourney, requested_changes: list[dict[str, Any]]
    ) -> bool:
        try:
            snapshot = await self._journey_snapshot(journey.id)
            evidence = await self._evidence_summary(journey.user_id)
            provider, model = self._replanning_task()
            prompt = build_curriculum_replanning_prompt(snapshot, evidence, requested_changes)
            result, meta = await self._ai.generate_structured(
                prompt,
                CurriculumReplanningResult,
                system=prompt,
                provider=provider,
                model=model,
                max_tokens=self._settings.ai_curriculum_max_tokens,
            )
            assert isinstance(result, CurriculumReplanningResult)
            outcome = self._quality.validate(
                "curriculum_replanning",
                result,
                provider=provider,
                model=model,
            )
            if not outcome.passed:
                logger.info("curriculum_replanning rejected: %s", outcome.violations)
                return False
            await self._curriculum.plans.add(
                CurriculumPlan(
                    user_id=journey.user_id,
                    journey_id=journey.id,
                    plan_type="replan",
                    goal_type=journey.goal_type,
                    payload={
                        "objective_changes": result.objective_changes,
                        "rationale_vi": result.rationale_vi,
                    },
                    provider=provider or "deterministic",
                    model=model or "deterministic",
                    prompt_version=curriculum_replanning_prompt_version(),
                    review_meta={"source": "ai"},
                )
            )
            return await self._apply_objective_changes(journey.id, result.objective_changes)
        except AIError as exc:
            logger.warning("curriculum_replanning provider_failed error=%s", type(exc).__name__)
            return False

    async def _apply_objective_changes(
        self, journey_id: str, changes: list[dict[str, Any]]
    ) -> bool:
        """Apply validated objective field updates (never completion states)."""
        applied_any = False
        for change in changes:
            action = change.get("action")
            objective_id = change.get("objective_id")
            if action == "add":
                continue  # adding objectives is not supported in this version
            objective = await self._curriculum.objectives.get(objective_id)
            if objective is None:
                continue
            if action == "skip":
                if objective.status in ("completed", "skipped"):
                    continue
                objective.status = "skipped"
                await self._curriculum.objectives.update(objective)
                applied_any = True
                continue
            field_updates = change.get("field_updates") or {}
            for field, value in field_updates.items():
                if field not in _REPLAN_ALLOWED_FIELDS:
                    continue
                setattr(objective, field, value)
            await self._curriculum.objectives.update(objective)
            applied_any = True
        if applied_any:
            await self._recompute_progress(journey_id)
        return applied_any

    # -- objective explanation ------------------------------------------------

    async def objective_explanation(
        self, user_id: str | None, objective_id: str
    ) -> dict[str, Any] | None:
        journey = await self._curriculum.journeys.get_active(user_id)
        if journey is None:
            return None
        objective = await self._curriculum.objectives.get_by_id_and_journey(
            journey.id, objective_id
        )
        if objective is None:
            return None
        progress = await self._curriculum.progress.get_for_objective(objective.id)
        if not self._settings.ai_curriculum_enabled:
            return {
                "objective_id": objective.id,
                "summary_vi": "Hoàn thành các bài tập của mục tiêu để mở khóa mục tiêu tiếp theo.",
                "recommended_focus_vi": "",
                "source": "fallback",
            }
        try:
            snapshot = {
                "objective_id": objective.id,
                "title": objective.title,
                "target_competencies": objective.target_competencies,
                "success_criteria": objective.success_criteria,
                "progress": _progress_dict(progress) if progress else {},
            }
            provider, model = self._curriculum_task()
            prompt = build_objective_progress_analysis_prompt(snapshot, snapshot["progress"])
            result, _ = await self._ai.generate_structured(
                prompt,
                ObjectiveProgressAnalysisResult,
                system=prompt,
                provider=provider,
                model=model,
                max_tokens=self._settings.ai_curriculum_max_tokens,
            )
            assert isinstance(result, ObjectiveProgressAnalysisResult)
            outcome = self._quality.validate(
                "objective_progress_analysis",
                result,
                provider=provider,
                model=model,
            )
            if not outcome.passed:
                logger.info("objective_progress_analysis rejected: %s", outcome.violations)
                raise AIError("quality rejected")
            return {
                "objective_id": objective.id,
                "summary_vi": result.summary_vi,
                "recommended_focus_vi": result.recommended_focus_vi,
                "source": "ai",
            }
        except Exception:
            logger.exception("objective explanation failed (falling back to deterministic)")
            progress_dict = _progress_dict(progress) if progress else {}
            remaining = max(0, 5 - progress_dict.get("exercises_completed", 0))
            return {
                "objective_id": objective.id,
                "summary_vi": (
                    f"Bạn đã hoàn thành {progress_dict.get('exercises_completed', 0)} bài tập; "
                    f"điểm trung bình {progress_dict.get('average_score', 0)}. "
                    "Tiếp tục luyện để đạt ngưỡng thành thạo."
                ),
                "recommended_focus_vi": (
                    f"Hãy luyện thêm {remaining} bài tập theo các chế độ của mục tiêu này."
                ),
                "source": "fallback",
            }


def _objective_dict(objective: LearningObjective, progress: ObjectiveProgress) -> dict[str, Any]:
    return {
        "id": objective.id,
        "title": objective.title,
        "success_criteria": objective.success_criteria,
        "target_competencies": objective.target_competencies,
        "target_skills": objective.target_skills,
        "exercise_modes": objective.exercise_modes,
    }


def _progress_dict(progress: ObjectiveProgress) -> dict[str, Any]:
    return {
        "exercises_completed": progress.exercises_completed,
        "attempts_submitted": progress.attempts_submitted,
        "average_score": progress.average_score,
        "best_score": progress.best_score,
        "mastery_state": progress.mastery_state,
        "skill_evidence": progress.skill_evidence or {},
        "modes_used": progress.modes_used or {},
        "completed_at": progress.completed_at,
    }


def _meta_payload(meta: AIGenerationResult | None) -> dict[str, Any] | None:
    if meta is None:
        return None
    return {
        "provider": meta.provider,
        "model": meta.model,
        "prompt_version": curriculum_planning_prompt_version(),
    }


def _objectives_per_milestone(milestone_index: int, plan: CurriculumPlanningResult) -> int:
    """Number of objectives assigned to milestone index (1-based)."""
    total = len(plan.objectives)
    milestone_count = len(plan.milestones)
    base = total // milestone_count
    extra = total % milestone_count
    return base + (1 if milestone_index <= extra else 0)


def _objective_offset(milestone_index: int, plan: CurriculumPlanningResult) -> int:
    return sum(_objectives_per_milestone(index, plan) for index in range(1, milestone_index))
