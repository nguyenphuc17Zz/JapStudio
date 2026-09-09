"""Scenario generation pipeline (Phase 9).

Scenario Planner -> Scenario Generator -> Scenario Validator -> Persistence.

Mirrors the Phase 3 exercise pipeline: regeneration attempts driven by
validator feedback, deterministic cross-consistency guards, repetition
avoidance against the learner's recent scenarios, and persisted provenance
(cost control - reading a scenario never regenerates AI content).
"""

import logging
from datetime import datetime, timezone

from app.core.config import Settings, get_settings
from app.core.errors import ScenarioGenerationError
from app.domain.scenario_formats import (
    AUDIENCE_VALUES,
    GENRE_VALUES,
    LONG_FORM_TARGET_LENGTHS,
    MEDIUM_VALUES,
    PURPOSE_VALUES,
    REGISTER_VALUES,
    RELATIONSHIP_VALUES,
    TONE_VALUES,
)
from app.models import WritingScenario
from app.prompts.common import SCENARIO_VERSION
from app.prompts.scenario_generator import (
    build_scenario_generator_prompt,
    scenario_generator_prompt_version,
)
from app.prompts.scenario_planner import build_scenario_planner_prompt
from app.prompts.scenario_validation import build_scenario_validation_prompt
from app.providers.ai.base import AIGenerationResult
from app.providers.ai.errors import AIError
from app.quality.service import create_quality_service
from app.repositories import WritingScenarioRepository
from app.schemas.exercise_ai import GenerationMetadata
from app.schemas.writing_scenario import (
    ScenarioGenerateRequest,
    WritingScenarioDraft,
    WritingScenarioPlan,
    WritingScenarioValidationResult,
)
from app.services.ai_service import AIService

logger = logging.getLogger("app.scenarios")

_CROSS_CONSISTENCY_TOLERANCE = 3.0
_DIFFICULTY_DIMENSIONS = ("language", "context", "audience", "purpose", "constraint", "register")


class ScenarioService:
    def __init__(
        self,
        ai_service: AIService,
        scenario_repository: WritingScenarioRepository,
        settings: Settings | None = None,
    ) -> None:
        self._ai = ai_service
        self._scenario_repository = scenario_repository
        self._settings = settings or get_settings()
        self._quality = create_quality_service(settings=self._settings)

    def _scenario_task(self) -> tuple[str | None, str | None]:
        """Provider chain per requirement 31: scenario -> learning ->
        evaluation -> generation -> default."""
        provider = (
            self._settings.ai_scenario_provider
            or self._settings.ai_learning_provider
            or self._settings.ai_exercise_evaluation_provider
            or self._settings.ai_exercise_generation_provider
            or None
        )
        model = (
            self._settings.ai_scenario_model
            or self._settings.ai_learning_model
            or self._settings.ai_exercise_evaluation_model
            or self._settings.ai_exercise_generation_model
            or None
        )
        return provider, model

    def _validation_task(self) -> tuple[str | None, str | None]:
        provider = (
            self._settings.ai_scenario_provider
            or self._settings.ai_learning_provider
            or self._settings.ai_exercise_evaluation_provider
            or self._settings.ai_exercise_generation_provider
            or None
        )
        model = (
            self._settings.ai_scenario_validation_model
            or self._settings.ai_scenario_model
            or self._settings.ai_learning_model
            or self._settings.ai_exercise_evaluation_model
            or self._settings.ai_exercise_generation_model
            or None
        )
        return provider, model

    async def generate(
        self,
        user_id: str | None,
        preferences: ScenarioGenerateRequest | None = None,
        memory_block: str = "",
        objective_id: str | None = None,
        objective_context: str = "",
    ) -> WritingScenario:
        try:
            return await self._generate_inner(
                user_id, preferences, memory_block, objective_id, objective_context
            )
        except AIError as exc:
            logger.warning("scenario_generation provider_failed error=%s", type(exc).__name__)
            raise ScenarioGenerationError(f"Scenario generation failed: {exc.message}") from exc

    async def _generate_inner(
        self,
        user_id: str | None,
        preferences: ScenarioGenerateRequest | None,
        memory_block: str = "",
        objective_id: str | None = None,
        objective_context: str = "",
    ) -> WritingScenario:
        provider, model = self._scenario_task()
        if preferences and preferences.provider:
            provider = preferences.provider
        if preferences and preferences.model:
            model = preferences.model
        recent = await self._scenario_repository.list_recent_for_user(
            user_id, self._settings.ai_scenario_history_window
        )
        recent_combinations = self._combination_of(recent)
        max_attempts = 1 + self._settings.ai_scenario_max_regeneration_attempts
        issues: list[str] = []
        similar_scenarios: list[str] = []
        rejected_combinations = list(recent_combinations)
        last_reason = "unknown validation failure"
        result: AIGenerationResult | None = None
        has_explicit_preferences = bool(
            preferences
            and any(
                [
                    preferences.genre,
                    preferences.medium,
                    preferences.audience,
                    preferences.purpose,
                    preferences.register,
                ]
            )
        )

        for attempt in range(max_attempts):
            plan = await self._plan(
                preferences,
                rejected_combinations,
                provider,
                model,
                memory_block,
                objective_context,
            )
            combo = self._combination(plan)
            is_final_attempt_of_multi = attempt == max_attempts - 1 and max_attempts > 1
            if (
                not has_explicit_preferences
                and combo in recent_combinations
                and not is_final_attempt_of_multi
            ):
                last_reason = (
                    f"scenario repeats a recent combination ({combo}) - regenerate a "
                    "meaningfully different scenario"
                )
                similar_scenarios.append(combo)
                rejected_combinations.append(combo)
                continue

            draft, result = await self._generate_draft(
                plan, issues, similar_scenarios, provider, model
            )
            validation = await self._validate(plan, draft)
            if not validation.valid:
                issues = validation.issues or ["scenario failed quality validation"]
                last_reason = "; ".join(issues)
                logger.info(
                    "scenario_generation rejected attempt=%d issues=%s", attempt + 1, issues
                )
                continue
            if not self._cross_consistent(plan, draft):
                issues = [
                    "difficulty sub-metrics must be within +/-3 of the planned "
                    f"difficulty ({plan.difficulty})"
                ]
                last_reason = issues[0]
                continue
            self._quality.validate(
                "scenario_generation",
                draft,
                provider=provider,
                model=model,
            )
            return await self._persist(
                user_id, plan, draft, result, attempt, objective_id, memory_block
            )

        raise ScenarioGenerationError(
            f"Could not generate a valid scenario after {max_attempts} attempt(s): {last_reason}"
        )

    async def _plan(
        self,
        preferences: ScenarioGenerateRequest | None,
        recent_combinations: list[str],
        provider: str | None,
        model: str | None,
        memory_block: str = "",
        objective_context: str = "",
    ) -> WritingScenarioPlan:
        prefs = preferences.model_dump(exclude_none=True) if preferences else {}
        system, user = build_scenario_planner_prompt(
            prefs,
            profile_block=objective_context,
            recent_combinations=recent_combinations,
            memory_block=memory_block,
        )
        plan, _ = await self._ai.generate_structured(
            user,
            WritingScenarioPlan,
            system=system,
            provider=provider,
            model=model,
            max_tokens=self._settings.ai_scenario_max_tokens,
        )
        assert isinstance(plan, WritingScenarioPlan)
        self._check_plan(plan)
        return plan

    def _check_plan(self, plan: WritingScenarioPlan) -> None:
        """Deterministic taxonomy gate for the planned dimensions."""
        if plan.genre not in GENRE_VALUES:
            raise ScenarioGenerationError(f"Unsupported genre: {plan.genre}")
        if plan.medium not in MEDIUM_VALUES:
            raise ScenarioGenerationError(f"Unsupported medium: {plan.medium}")
        if plan.audience not in AUDIENCE_VALUES:
            raise ScenarioGenerationError(f"Unsupported audience: {plan.audience}")
        if plan.relationship not in RELATIONSHIP_VALUES:
            raise ScenarioGenerationError(f"Unsupported relationship: {plan.relationship}")
        if plan.purpose not in PURPOSE_VALUES:
            raise ScenarioGenerationError(f"Unsupported purpose: {plan.purpose}")
        if plan.register not in REGISTER_VALUES:
            raise ScenarioGenerationError(f"Unsupported register: {plan.register}")
        if plan.tone not in TONE_VALUES:
            raise ScenarioGenerationError(f"Unsupported tone: {plan.tone}")
        if plan.target_length not in LONG_FORM_TARGET_LENGTHS:
            raise ScenarioGenerationError(
                f"target_length must be one of {LONG_FORM_TARGET_LENGTHS}: {plan.target_length}"
            )

    async def _generate_draft(
        self,
        plan: WritingScenarioPlan,
        issues: list[str],
        similar_scenarios: list[str],
        provider: str | None,
        model: str | None,
    ) -> tuple[WritingScenarioDraft, AIGenerationResult]:
        system, user = build_scenario_generator_prompt(
            plan, issues=issues, similar_scenarios=similar_scenarios
        )
        draft, result = await self._ai.generate_structured(
            user,
            WritingScenarioDraft,
            system=system,
            provider=provider,
            model=model,
            max_tokens=self._settings.ai_scenario_max_tokens,
        )
        assert isinstance(draft, WritingScenarioDraft)
        return draft, result

    async def _validate(
        self, plan: WritingScenarioPlan, draft: WritingScenarioDraft
    ) -> WritingScenarioValidationResult:
        provider, model = self._validation_task()
        system, user = build_scenario_validation_prompt(plan, draft, similar_scenarios=[])
        validation, _ = await self._ai.generate_structured(
            user,
            WritingScenarioValidationResult,
            system=system,
            provider=provider,
            model=model,
            max_tokens=self._settings.ai_scenario_max_tokens,
        )
        assert isinstance(validation, WritingScenarioValidationResult)
        return validation

    @staticmethod
    def _cross_consistent(plan: WritingScenarioPlan, draft: WritingScenarioDraft) -> bool:
        mean = (
            draft.grammar_complexity
            + draft.vocabulary_complexity
            + draft.context_complexity
            + draft.naturalness_target
        ) / 4
        return abs(mean - plan.difficulty) <= _CROSS_CONSISTENCY_TOLERANCE

    def _overall_difficulty(self, metadata: dict) -> int:
        """Deterministic overall difficulty = weighted mean of the 6 dims."""
        weights = {
            "language": self._settings.ai_scenario_difficulty_weight_language,
            "context": self._settings.ai_scenario_difficulty_weight_context,
            "audience": self._settings.ai_scenario_difficulty_weight_audience,
            "purpose": self._settings.ai_scenario_difficulty_weight_purpose,
            "constraint": self._settings.ai_scenario_difficulty_weight_constraint,
            "register": self._settings.ai_scenario_difficulty_weight_register,
        }
        total_weight = sum(weights.values())
        if total_weight <= 0:
            values = [metadata.get(d, 5) for d in _DIFFICULTY_DIMENSIONS]
            return round(sum(values) / len(values))
        weighted = sum(metadata.get(dim, 5) * weights[dim] for dim in _DIFFICULTY_DIMENSIONS)
        return round(weighted / total_weight)

    async def _persist(
        self,
        user_id: str | None,
        plan: WritingScenarioPlan,
        draft: WritingScenarioDraft,
        result: AIGenerationResult,
        attempt: int,
        objective_id: str | None = None,
        memory_block: str = "",
    ) -> WritingScenario:
        metadata = GenerationMetadata(
            provider=result.provider,
            model=result.model,
            generation_version=SCENARIO_VERSION,
            prompt_version=scenario_generator_prompt_version(),
            generation_timestamp=datetime.now(timezone.utc),
            regeneration_attempts=attempt,
        )
        generation_metadata = metadata.model_dump(mode="json")
        generation_metadata["memory_context_used"] = bool(memory_block.strip())
        if objective_id is not None:
            generation_metadata["objective_id"] = objective_id
        scenario = WritingScenario(
            user_id=user_id,
            genre=plan.genre,
            medium=plan.medium,
            audience=plan.audience,
            relationship=plan.relationship,
            purpose=plan.purpose,
            register=plan.register,
            tone=plan.tone,
            target_length=plan.target_length,
            jlpt_level=plan.jlpt_level,
            topic=plan.topic,
            situation_vi=draft.situation_vi,
            context_vi=draft.context_vi,
            required_points=[p.model_dump(mode="json") for p in draft.required_points],
            optional_points=draft.optional_points,
            forbidden_patterns=draft.forbidden_patterns,
            difficulty_metadata={
                **draft.difficulty_metadata,
                "sub_grammar": draft.grammar_complexity,
                "sub_vocabulary": draft.vocabulary_complexity,
                "sub_context": draft.context_complexity,
                "sub_naturalness": draft.naturalness_target,
            },
            difficulty=self._overall_difficulty(draft.difficulty_metadata),
            generation_metadata=generation_metadata,
            status="generated",
        )
        persisted = await self._scenario_repository.add(scenario)
        logger.info(
            "scenario_generated id=%s genre=%s medium=%s audience=%s purpose=%s register=%s "
            "jlpt=%s difficulty=%d provider=%s model=%s attempts=%d",
            persisted.id,
            plan.genre,
            plan.medium,
            plan.audience,
            plan.purpose,
            plan.register,
            plan.jlpt_level,
            persisted.difficulty,
            result.provider,
            result.model,
            attempt + 1,
        )
        return persisted

    @staticmethod
    def _combination(plan: WritingScenarioPlan) -> str:
        return f"{plan.genre}+{plan.medium}+{plan.audience}+{plan.purpose}+{plan.register}"

    @staticmethod
    def _combination_of(scenarios: list[WritingScenario]) -> list[str]:
        return [f"{s.genre}+{s.medium}+{s.audience}+{s.purpose}+{s.register}" for s in scenarios]
