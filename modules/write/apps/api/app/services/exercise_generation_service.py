"""Exercise generation pipeline.

Planner -> Generator -> Validator -> Deduplication -> Persistence.

Depends only on AIService (the Phase 2 AI gateway) and ExerciseRepository,
never on concrete AI providers. Retries/fallbacks are handled by the gateway;
this service adds regeneration attempts driven by validator feedback and
duplicate detection.
"""

import logging
from datetime import datetime, timezone
from typing import Any

from app.core.config import Settings, get_settings
from app.core.errors import ExerciseDuplicateError, ExerciseGenerationError
from app.models import (
    Exercise,
    ExerciseStatus,
    ExerciseType,
    JlptLevel,
    Register,
    TargetLength,
)
from app.prompts.common import EXERCISE_GENERATION_VERSION
from app.prompts.exercise_generator import build_generator_prompt, generator_prompt_version
from app.prompts.exercise_planner import build_planner_prompt
from app.prompts.exercise_validator import build_validator_prompt
from app.providers.ai.base import AIGenerationResult
from app.providers.ai.errors import AIError
from app.quality.service import create_quality_service
from app.repositories import ExerciseRepository
from app.schemas.exercise import ExerciseGenerationRequest
from app.schemas.exercise_ai import (
    ExerciseDraft,
    ExercisePlan,
    ExerciseValidationResult,
    GenerationMetadata,
)
from app.services.ai_service import AIService
from app.services.exercise_dedup_service import ExerciseDedupService

logger = logging.getLogger("app.exercises")

_CROSS_CONSISTENCY_TOLERANCE = 3.0


class ExerciseGenerationService:
    def __init__(
        self,
        ai_service: AIService,
        repository: ExerciseRepository,
        settings: Settings | None = None,
    ) -> None:
        self._ai = ai_service
        self._repository = repository
        self._settings = settings or get_settings()
        self._dedup = ExerciseDedupService(repository, self._settings)
        self._quality = create_quality_service(settings=self._settings)

    def _quality_accepts(
        self,
        task: str,
        result: Any,
        *,
        context: dict | None = None,
        prompt_version: str | None = None,
    ) -> bool:
        """Shared deterministic quality gate (telemetry + policy, no raise)."""
        outcome = self._quality.validate(
            task, result, context=context or {}, prompt_version=prompt_version
        )
        return not outcome.violations

    def _generation_task(self) -> tuple[str | None, str | None]:
        provider = self._settings.ai_exercise_generation_provider or None
        model = self._settings.ai_exercise_generation_model or None
        return provider, model

    def _validation_task(self) -> tuple[str | None, str | None]:
        provider = (
            self._settings.ai_exercise_validation_provider
            or self._settings.ai_exercise_generation_provider
            or None
        )
        model = (
            self._settings.ai_exercise_validation_model
            or self._settings.ai_exercise_generation_model
            or None
        )
        return provider, model

    async def generate(
        self, preferences: ExerciseGenerationRequest | None = None, memory_block: str = ""
    ) -> Exercise:
        try:
            return await self._generate_inner(preferences, memory_block)
        except AIError as exc:
            logger.warning("exercise_generation provider_failed error=%s", type(exc).__name__)
            raise ExerciseGenerationError(f"Exercise generation failed: {exc.message}") from exc

    async def generate_for_scenario(self, scenario: object) -> Exercise:
        """Build the exercise tied to a persisted scenario (Phase 9).

        Content comes from the scenario; no new AI call is made - the
        scenario was already AI-generated and persisted. The exercise links
        back via ``scenario_id`` so the writing pipeline can run the
        scenario-aware evaluation.
        """
        from app.domain.scenario_formats import GENRE_EXERCISE_TYPES

        genre = scenario.genre
        exercise_type = GENRE_EXERCISE_TYPES.get(genre)
        if exercise_type is None:
            raise ExerciseGenerationError(f"Unsupported scenario genre: {genre}")
        metadata = scenario.difficulty_metadata or {}
        difficulty = int(scenario.difficulty or 5)
        prompt_vi = self._scenario_prompt_vi(scenario)
        normalized = self._dedup.normalize_prompt(prompt_vi)
        generation_metadata = {
            "generation_version": "scenario_exercise:v1",
            "scenario_id": scenario.id,
            "scenario_genre": genre,
        }
        objective_id = (scenario.generation_metadata or {}).get("objective_id")
        if objective_id is not None:
            generation_metadata["objective_id"] = objective_id
        exercise = Exercise(
            exercise_type=ExerciseType(exercise_type),
            topic=scenario.topic,
            subtopic=None,
            context=scenario.situation_vi,
            prompt_vi=prompt_vi,
            prompt_vi_hash=self._dedup.prompt_hash(normalized),
            target_length=TargetLength(scenario.target_length),
            register=Register(scenario.register),
            jlpt_level=JlptLevel(scenario.jlpt_level),
            difficulty=difficulty,
            grammar_complexity=int(metadata.get("sub_grammar", difficulty)),
            vocabulary_complexity=int(metadata.get("sub_vocabulary", difficulty)),
            context_complexity=int(metadata.get("sub_context", difficulty)),
            naturalness_target=int(metadata.get("sub_naturalness", difficulty)),
            generation_metadata=generation_metadata,
            scenario_id=scenario.id,
            objective_id=objective_id,
            status=ExerciseStatus.PENDING,
        )
        persisted = await self._repository.add(exercise)
        logger.info(
            "scenario_exercise_generated id=%s scenario=%s type=%s genre=%s difficulty=%d",
            persisted.id,
            scenario.id,
            exercise_type,
            genre,
            difficulty,
        )
        return persisted

    @staticmethod
    def _scenario_prompt_vi(scenario: object) -> str:
        """Learner-facing instructions composed from the scenario content."""
        lines = [scenario.context_vi]
        required = scenario.required_points or []
        if required:
            lines.append("")
            lines.append("Yêu cầu bắt buộc:")
            for point in required:
                if isinstance(point, dict):
                    description = point.get("description")
                else:
                    description = point.description
                lines.append(f"- {description}")
        forbidden = scenario.forbidden_patterns or []
        if forbidden:
            lines.append("")
            lines.append("Tránh:")
            for item in forbidden:
                lines.append(f"- {item}")
        return "\n".join(lines).strip()

    async def _generate_inner(
        self, preferences: ExerciseGenerationRequest | None, memory_block: str = ""
    ) -> Exercise:
        generation_provider, generation_model = self._generation_task()
        if preferences and preferences.provider:
            generation_provider = preferences.provider
        if preferences and preferences.model:
            generation_model = preferences.model

        recent = await self._repository.find_recent(self._settings.ai_exercise_recent_prompt_window)
        recent_topics = [exercise.topic for exercise in recent]
        plan = await self._plan(
            preferences, recent_topics, generation_provider, generation_model, memory_block
        )

        max_attempts = 1 + self._settings.ai_exercise_max_regeneration_attempts
        issues: list[str] = []
        similar_prompts: list[str] = []
        last_reason = "unknown validation failure"
        last_duplicate = False
        result: AIGenerationResult | None = None

        for attempt in range(max_attempts):
            last_duplicate = False
            draft, result = await self._generate_draft(
                plan, issues, similar_prompts, generation_provider, generation_model
            )
            validation = await self._validate(plan, draft)
            if not validation.valid:
                issues = validation.issues or ["content failed quality validation"]
                last_reason = "; ".join(issues)
                logger.info(
                    "exercise_generation rejected attempt=%d issues=%s",
                    attempt + 1,
                    issues,
                )
                continue
            if not self._cross_consistent(plan, draft):
                issues = [
                    "difficulty sub-metrics must be within +/-3 of the planned "
                    f"difficulty ({plan.difficulty})"
                ]
                last_reason = issues[0]
                continue
            if (
                (
                    plan.target_length == TargetLength.PARAGRAPH
                    or plan.exercise_type == ExerciseType.PARAGRAPH_TRANSLATION
                )
                and (
                    len(draft.prompt_vi.strip()) < 80
                    or sum(draft.prompt_vi.count(sep) for sep in [".", "!", "?", "\n"]) < 2
                )
            ):
                issues = [
                    "prompt_vi is too short for 'paragraph' target length (expected 3 to 5 coherent sentences, approx 120-220 words). You MUST generate a full multi-sentence paragraph."
                ]
                last_reason = issues[0]
                logger.info(
                    "exercise_generation length_rejected attempt=%d prompt_len=%d",
                    attempt + 1,
                    len(draft.prompt_vi),
                )
                continue
            if not self._quality_accepts(
                "exercise_generation",
                draft,
                context={"plan": plan},
                prompt_version=generator_prompt_version(),
            ):
                issues = ["generated draft failed deterministic quality checks"]
                last_reason = issues[0]
                logger.info("exercise_generation quality_rejected attempt=%d", attempt + 1)
                continue
            duplicate = await self._dedup.find_duplicate(draft.prompt_vi)
            if duplicate.is_duplicate:
                last_duplicate = True
                last_reason = "generated content is a duplicate of an existing exercise"
                if duplicate.matched_prompt and duplicate.matched_prompt not in similar_prompts:
                    similar_prompts.append(duplicate.matched_prompt)
                logger.info(
                    "exercise_generation duplicate attempt=%d kind=%s",
                    attempt + 1,
                    duplicate.kind,
                )
                continue
            return await self._persist(plan, draft, result, attempt, memory_block)

        if last_duplicate:
            raise ExerciseDuplicateError(
                f"Could not generate a unique exercise after {max_attempts} attempt(s): "
                f"{last_reason}"
            )
        raise ExerciseGenerationError(
            f"Could not generate a valid exercise after {max_attempts} attempt(s): {last_reason}"
        )

    async def _plan(
        self,
        preferences: ExerciseGenerationRequest | None,
        recent_topics: list[str],
        provider: str | None,
        model: str | None,
        memory_block: str = "",
    ) -> ExercisePlan:
        system, user = build_planner_prompt(
            preferences, recent_topics=recent_topics, memory_block=memory_block
        )
        plan, _ = await self._ai.generate_structured(
            user,
            ExercisePlan,
            system=system,
            provider=provider,
            model=model,
            max_tokens=self._settings.ai_exercise_generation_max_tokens,
        )
        assert isinstance(plan, ExercisePlan)

        # Strictly enforce user explicit preferences over LLM planner deviations
        if preferences:
            if preferences.exercise_type:
                plan.exercise_type = preferences.exercise_type
            if preferences.topic:
                plan.topic = preferences.topic
            if preferences.register:
                plan.register = preferences.register
            if preferences.jlpt_level:
                plan.jlpt_level = preferences.jlpt_level
            if preferences.difficulty is not None:
                plan.difficulty = preferences.difficulty
            if preferences.target_length:
                plan.target_length = preferences.target_length

        if (
            plan.target_length == TargetLength.PARAGRAPH
            and plan.exercise_type == ExerciseType.SENTENCE_TRANSLATION
        ):
            plan.exercise_type = ExerciseType.PARAGRAPH_TRANSLATION
        elif (
            plan.target_length == TargetLength.MULTI_SENTENCE
            and plan.exercise_type == ExerciseType.SENTENCE_TRANSLATION
        ):
            plan.exercise_type = ExerciseType.MULTI_SENTENCE_TRANSLATION
        elif (
            plan.target_length == TargetLength.LONG_WRITING
            and plan.exercise_type == ExerciseType.SENTENCE_TRANSLATION
        ):
            plan.exercise_type = ExerciseType.FREE_WRITING

        return plan

    async def _generate_draft(
        self,
        plan: ExercisePlan,
        issues: list[str],
        similar_prompts: list[str],
        provider: str | None,
        model: str | None,
    ) -> tuple[ExerciseDraft, AIGenerationResult]:
        system, user = build_generator_prompt(plan, issues=issues, similar_prompts=similar_prompts)
        draft, result = await self._ai.generate_structured(
            user,
            ExerciseDraft,
            system=system,
            provider=provider,
            model=model,
            max_tokens=self._settings.ai_exercise_generation_max_tokens,
        )
        assert isinstance(draft, ExerciseDraft)
        return draft, result

    async def _validate(self, plan: ExercisePlan, draft: ExerciseDraft) -> ExerciseValidationResult:
        provider, model = self._validation_task()
        system, user = build_validator_prompt(plan, draft)
        validation, _ = await self._ai.generate_structured(
            user,
            ExerciseValidationResult,
            system=system,
            provider=provider,
            model=model,
            max_tokens=self._settings.ai_exercise_validation_max_tokens,
        )
        assert isinstance(validation, ExerciseValidationResult)
        return validation

    @staticmethod
    def _cross_consistent(plan: ExercisePlan, draft: ExerciseDraft) -> bool:
        """Deterministic guard: sub-metrics must agree with the planned difficulty."""
        mean = (
            draft.grammar_complexity
            + draft.vocabulary_complexity
            + draft.context_complexity
            + draft.naturalness_target
        ) / 4
        return abs(mean - plan.difficulty) <= _CROSS_CONSISTENCY_TOLERANCE

    async def _persist(
        self,
        plan: ExercisePlan,
        draft: ExerciseDraft,
        result: AIGenerationResult,
        attempt: int,
        memory_block: str = "",
    ) -> Exercise:
        normalized = self._dedup.normalize_prompt(draft.prompt_vi)
        metadata = GenerationMetadata(
            provider=result.provider,
            model=result.model,
            generation_version=EXERCISE_GENERATION_VERSION,
            prompt_version=generator_prompt_version(),
            generation_timestamp=datetime.now(timezone.utc),
            regeneration_attempts=attempt,
        )
        metadata_dict = metadata.model_dump(mode="json")
        metadata_dict["memory_context_used"] = bool(memory_block.strip())
        metadata_dict["key_vocabulary"] = [
            v.model_dump(mode="json") for v in (getattr(draft, "key_vocabulary", None) or [])
        ]
        exercise = Exercise(
            exercise_type=plan.exercise_type,
            topic=plan.topic,
            subtopic=plan.subtopic,
            context=draft.context,
            prompt_vi=draft.prompt_vi,
            prompt_vi_hash=self._dedup.prompt_hash(normalized),
            target_length=plan.target_length,
            register=plan.register,
            jlpt_level=plan.jlpt_level,
            difficulty=plan.difficulty,
            grammar_complexity=draft.grammar_complexity,
            vocabulary_complexity=draft.vocabulary_complexity,
            context_complexity=draft.context_complexity,
            naturalness_target=draft.naturalness_target,
            generation_metadata=metadata_dict,
            status=ExerciseStatus.PENDING,
        )
        persisted = await self._repository.add(exercise)
        logger.info(
            "exercise_generated id=%s type=%s topic=%s register=%s jlpt=%s difficulty=%d "
            "provider=%s model=%s attempts=%d",
            persisted.id,
            plan.exercise_type.value,
            plan.topic,
            plan.register.value,
            plan.jlpt_level.value,
            plan.difficulty,
            result.provider,
            result.model,
            attempt + 1,
        )
        return persisted
