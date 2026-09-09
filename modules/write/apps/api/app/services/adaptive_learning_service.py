"""Adaptive learning orchestration (Phase 6).

- update_after_attempt: hook called after every evaluation (sessions,
  profile counters + auto-synthesis, mistake clustering, recommendation
  effectiveness). Never raises - learner intelligence must not break the
  writing flow.
- recommend_next: strategy (deterministic) -> plan (AI, validated) ->
  exercise generation (reusing the Phase 3 pipeline) -> explanation (AI,
  optional) -> persistence.
- get_recommendation / history / get_today: read APIs for the UI.
"""

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.exc import IntegrityError

from app.core.config import Settings, get_settings
from app.models import LearningRecommendation, LearningSession
from app.prompts.recommendation_explanation import (
    build_recommendation_explanation_prompt,
)
from app.repositories import (
    ExerciseRepository,
    LearningRecommendationRepository,
    LearningSessionRepository,
)
from app.schemas.exercise import ExerciseGenerationRequest
from app.schemas.learning_ai import RecommendationExplanationResult
from app.services.ai_service import AIService
from app.services.exercise_generation_service import ExerciseGenerationService
from app.services.learner_evidence import LearnerEvidenceService
from app.services.learner_profile_service import LearnerProfileService
from app.services.learning_planner_service import LearningPlannerService
from app.services.mistake_clustering_service import MistakeClusteringService

logger = logging.getLogger("app.learning")


class AdaptiveLearningService:
    """Coordinates sessions, profile, patterns and recommendations."""

    def __init__(
        self,
        profile_service: LearnerProfileService,
        planner: LearningPlannerService,
        mistake_service: MistakeClusteringService,
        evidence_service: LearnerEvidenceService,
        recommendation_repository: LearningRecommendationRepository,
        session_repository: LearningSessionRepository,
        exercise_repository: ExerciseRepository,
        ai_service: AIService,
        settings: Settings | None = None,
        memory_service: Any | None = None,
        writing_intelligence_service: Any | None = None,
    ) -> None:
        self._profiles = profile_service
        self._planner = planner
        self._mistakes = mistake_service
        self._evidence = evidence_service
        self._recommendations = recommendation_repository
        self._sessions = session_repository
        self._exercises = exercise_repository
        self._ai = ai_service
        self._settings = settings or get_settings()
        self._generation = ExerciseGenerationService(ai_service, exercise_repository, settings)
        self._memory = memory_service
        self._writing = writing_intelligence_service

    # -- post-evaluation hook -------------------------------------------------

    async def update_after_attempt(
        self,
        user_id: str | None,
        exercise_id: str,
        issues: list[dict],
        context: dict[str, Any] | None = None,
    ) -> None:
        """Enrich learner intelligence after an evaluation (never raises)."""
        try:
            session = await self._get_or_create_session(user_id)
            session.exercises_completed += 1
            await self._sessions.update(session)
        except Exception:
            logger.exception("learning session update failed (skipped)")

        try:
            await self._profiles.record_evaluation(user_id)
        except Exception:
            logger.exception("learner profile update failed (skipped)")

        try:
            await self._mistakes.update_after_attempt(user_id, issues)
        except Exception:
            logger.exception("mistake clustering failed (skipped)")

        try:
            if self._writing is not None:
                await self._writing.aggregate_from_evaluation(
                    user_id, issues, exercise_id, context=context
                )
        except Exception:
            logger.exception("writing intelligence aggregation failed (skipped)")

        try:
            await self._complete_open_recommendation(user_id, exercise_id)
        except Exception:
            logger.exception("recommendation completion failed (skipped)")

    async def _complete_open_recommendation(self, user_id: str | None, exercise_id: str) -> None:
        recommendation = await self._recommendations.get_active_by_user(user_id)
        if recommendation is None or recommendation.exercise_id != exercise_id:
            return
        evidence = await self._evidence.compute_summary(user_id)
        recommendation.skill_after = {"skills": evidence.get("skills", {})}
        recommendation.status = "completed"
        await self._recommendations.update(recommendation)

    async def _memory_block(self, user_id: str | None) -> str:
        if self._memory is None:
            return ""
        try:
            return await self._memory.context_builder().memory_block(user_id, "planner")
        except Exception:
            logger.exception("memory context failed user_id=%s (planner is unaffected)", user_id)
            return ""

    # -- sessions ---------------------------------------------------------------

    async def _get_or_create_session(self, user_id: str | None) -> LearningSession:
        today = datetime.now(timezone.utc).date()
        session = await self._sessions.get_active_by_user(user_id)
        if session is not None:
            created = session.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            if created.date() == today:
                return session
            session.is_active = False
            session.ended_at = datetime.now(timezone.utc)
            session.summary = {"exercises_completed": session.exercises_completed}
            await self._sessions.update(session)
        profile = await self._profiles.get_or_create(user_id)
        return await self._sessions.add(
            LearningSession(
                user_id=user_id,
                goal=profile.goal,
                recommended_focus=(profile.adaptive_state or {}).get("weaknesses", [])[:3] or None,
            )
        )

    async def get_today(self, user_id: str | None) -> dict[str, Any]:
        """Dashboard payload: today's session, open recommendation, focus."""
        profile = await self._profiles.get_or_create(user_id)
        state = profile.adaptive_state or {}
        if not state:
            try:
                state = await self._profiles.synthesize(user_id)
            except Exception:
                logger.exception("profile synthesis failed for dashboard (using empty state)")
        session = await self._sessions.get_active_by_user(user_id)
        recommendation = await self._recommendations.get_active_by_user(user_id)
        return {
            "session": self._session_payload(session),
            "focus": {
                "goal": profile.goal,
                "target_jlpt": profile.target_jlpt,
                "daily_target": profile.daily_target,
                "weaknesses": state.get("weaknesses", []),
                "strengths": state.get("strengths", []),
                "estimated_jlpt": state.get("estimated_jlpt", {}),
                "recent_trends": state.get("recent_trends", {}),
                "evidence_count": state.get("evidence_count", 0),
            },
            "recommendation": (
                await self._recommendation_payload(recommendation)
                if recommendation is not None
                else None
            ),
        }

    # -- recommendations ---------------------------------------------------------

    async def recommend_next(
        self, user_id: str | None, objective_context: dict | None = None
    ) -> LearningRecommendation:
        """Build + persist the next recommendation (with a generated exercise)."""
        summary = await self._profiles.profile_summary(user_id)
        if objective_context:
            summary["curriculum"] = objective_context

        due_retest_ids: list[str] = []
        if self._writing is not None:
            try:
                due_retests = await self._writing.get_due_retests(user_id)
                if due_retests:
                    due_retest_ids = [r.weakness_id for r in due_retests[:5]]
                    extra_w = [f"{r.category}: {r.subtype}" for r in due_retests[:3]]
                    existing_w = list(summary.get("weaknesses", []))
                    for ew in extra_w:
                        if ew not in existing_w:
                            existing_w.insert(0, ew)
                    summary["weaknesses"] = existing_w
            except Exception:
                logger.exception("due retest integration failed in recommend_next (skipped)")

        _, total = await self._recommendations.list_by_user(user_id, limit=1)
        rotation = total % 10
        strategy = self._planner.select_strategy(summary, rotation)
        memory_block = await self._memory_block(user_id)
        result, _, _ = await self._planner.plan(
            summary, strategy, rotation, memory_block=memory_block
        )

        objective_id = (objective_context or {}).get("objective_id")
        milestone_id = (objective_context or {}).get("milestone_id")
        exercise = await self._generate_exercise(
            result, memory_block=memory_block, objective_id=objective_id
        )
        explanation = await self._explain(result, summary)

        previous = await self._recommendations.get_active_by_user(user_id)
        if previous is not None:
            previous.status = "replaced"
            await self._recommendations.update(previous)

        provider, model = self._planner.resolved_provider_model()
        evidence_dict = {
            "evidence_count": summary.get("evidence_count", 0),
            "recent_topics": summary.get("recent_topics", [])[:10],
        }
        if due_retest_ids:
            evidence_dict["weakness_retest_ids"] = due_retest_ids

        top_weakness_label = None
        if summary.get("weaknesses"):
            raw_w = str(summary["weaknesses"][0])
            top_weakness_label = (
                raw_w.replace("grammar:", "Grammar:")
                .replace("lexicon:", "Natural Japanese ")
                .replace("naturalness:", "Naturalness: ")
                .replace("register:", "Register: ")
                .replace("discourse:", "Discourse: ")
            )

        reason_text = result.reason
        if top_weakness_label and strategy == "targeted":
            reason_text = f"Your current priority: {top_weakness_label}. {reason_text}"

        recommendation = LearningRecommendation(
            user_id=user_id,
            exercise_id=exercise.id if exercise is not None else None,
            status="recommended",
            strategy=strategy,
            scenario_genre=(
                self._planner.weak_scenario_genre(summary)
                if strategy == "scenario_practice"
                else None
            ),
            exercise_type=result.planned_exercise.exercise_type,
            topic=result.planned_exercise.topic,
            register=result.planned_exercise.register,
            jlpt_level=result.planned_exercise.jlpt_level,
            difficulty=result.planned_exercise.difficulty,
            target_length=result.planned_exercise.target_length,
            focus_skills=result.planned_exercise.focus_skills,
            reason=reason_text[:1000],
            explanation=explanation,
            objective_id=objective_id,
            milestone_id=milestone_id,
            evidence_ids=evidence_dict,
            skill_before={"skills": summary.get("skills", {})},
            provider=provider,
            model=model,
            prompt_version=self._planner.prompt_version(),
            recommendation_version="learning_planner:v1",
        )
        persisted = await self._persist_recommendation(user_id, recommendation)
        logger.info(
            "recommendation created id=%s strategy=%s type=%s topic=%s jlpt=%s difficulty=%d",
            persisted.id,
            strategy,
            result.planned_exercise.exercise_type,
            result.planned_exercise.topic,
            result.planned_exercise.jlpt_level,
            result.planned_exercise.difficulty,
        )
        return persisted

    async def _persist_recommendation(
        self, user_id: str | None, recommendation: LearningRecommendation
    ) -> LearningRecommendation:
        """Insert the recommendation, resolving the one-active-per-user race."""
        try:
            return await self._recommendations.add(recommendation)
        except IntegrityError:
            await self._recommendations.session.rollback()
            existing = await self._recommendations.get_active_by_user(user_id)
            if existing is not None:
                logger.info(
                    "recommendation race resolved id=%s (active recommendation already exists)",
                    existing.id,
                )
                return existing
            raise

    async def _generate_exercise(
        self, result: Any, memory_block: str = "", objective_id: str | None = None
    ):
        """Generate the exercise via the Phase 3 pipeline with safe fallback."""
        planned = result.planned_exercise
        prefs = ExerciseGenerationRequest(
            exercise_type=planned.exercise_type,
            topic=planned.topic,
            register=planned.register,
            jlpt_level=planned.jlpt_level,
            difficulty=planned.difficulty,
            target_length=planned.target_length,
        )
        try:
            exercise = await self._generation.generate(prefs, memory_block=memory_block)
        except Exception as exc:
            logger.warning(
                "recommendation exercise generation failed error=%s (retrying relaxed)", exc
            )
            exercise = None
        if exercise is not None and objective_id is not None:
            exercise.objective_id = objective_id
            await self._exercises.update(exercise)
        if exercise is not None:
            return exercise
        try:
            return await self._generation.generate(
                ExerciseGenerationRequest(
                    topic=planned.topic,
                    jlpt_level=planned.jlpt_level,
                    difficulty=planned.difficulty,
                ),
                memory_block=memory_block,
            )
        except Exception as exc:
            logger.warning(
                "recommendation exercise generation failed (relaxed) error=%s "
                "-> recommendation without exercise",
                exc,
            )
            return None

    async def _explain(self, result: Any, summary: dict[str, Any]) -> str | None:
        provider, model = self._task()
        try:
            explanation, _ = await self._ai.generate_structured(
                build_recommendation_explanation_prompt(result.model_dump(mode="json"), summary),
                RecommendationExplanationResult,
                provider=provider,
                model=self._settings.ai_learning_model or model,
                max_tokens=512,
            )
            return explanation.explanation[:2000]
        except Exception as exc:
            logger.warning("recommendation explanation failed error=%s", exc)
            return None

    def _task(self) -> tuple[str | None, str | None]:
        provider = (
            self._settings.ai_learning_provider
            or self._settings.ai_exercise_evaluation_provider
            or self._settings.ai_default_provider
            or None
        )
        model = self._settings.ai_learning_model or None
        return provider, model

    async def get_recommendation(self, user_id: str | None) -> LearningRecommendation | None:
        return await self._recommendations.get_active_by_user(user_id)

    async def history(
        self, user_id: str | None, *, skip: int = 0, limit: int = 50
    ) -> tuple[list[LearningRecommendation], int]:
        return await self._recommendations.list_by_user(user_id, skip=skip, limit=limit)

    # -- payload helpers ---------------------------------------------------------

    async def _recommendation_payload(
        self, recommendation: LearningRecommendation
    ) -> dict[str, Any]:
        exercise = (
            await self._exercises.get(recommendation.exercise_id)
            if recommendation.exercise_id
            else None
        )
        return {
            "id": recommendation.id,
            "strategy": recommendation.strategy,
            "exercise_type": recommendation.exercise_type,
            "topic": recommendation.topic,
            "register": recommendation.register,
            "jlpt_level": recommendation.jlpt_level,
            "difficulty": recommendation.difficulty,
            "target_length": recommendation.target_length,
            "focus_skills": recommendation.focus_skills,
            "reason": recommendation.reason,
            "explanation": recommendation.explanation,
            "status": recommendation.status,
            "exercise_id": recommendation.exercise_id,
            "scenario_genre": recommendation.scenario_genre,
            "objective_id": recommendation.objective_id,
            "milestone_id": recommendation.milestone_id,
            "exercise": (
                {
                    "id": exercise.id,
                    "exercise_type": exercise.exercise_type.value,
                    "topic": exercise.topic,
                    "prompt_vi": exercise.prompt_vi,
                    "context": exercise.context,
                    "target_length": exercise.target_length.value,
                    "register": exercise.register.value,
                    "jlpt_level": exercise.jlpt_level.value,
                    "difficulty": exercise.difficulty,
                }
                if exercise is not None
                else None
            ),
            "created_at": recommendation.created_at,
        }

    def _session_payload(self, session: LearningSession | None) -> dict[str, Any] | None:
        if session is None:
            return None
        return {
            "id": session.id,
            "goal": session.goal,
            "recommended_focus": session.recommended_focus,
            "exercises_completed": session.exercises_completed,
            "created_at": session.created_at,
        }
