"""Interactive writing simulation orchestration (Phase 10).

Pipeline per learner turn:
  1. persist the learner's turn (immutable)
  2. Phase 4 sentence evaluation (reuses EvaluationService, not persisted)
  3. Phase 9 scenario stage (isolated: failure degrades to scenario_unavailable)
  4. simulation turn evaluation (goal_progress + communication_effectiveness
     + guided feedback) with a deterministic fallback
  5. deterministic score blending + persist SimulationEvaluation
  6. AI-proposed state update, validated and merged by the state machine
     (deterministic fallback: no change)
  7. difficulty adaptation (bounded, deterministic)
  8. vocabulary extraction from the learner's turn (isolated)
  9. deterministic next turn type + AI persona message (fallback template)
 10. on resolution: gamification hook + challenge suggestion

Failure isolation: every AI stage degrades independently; only a total
persistence failure raises. Reads never re-trigger the AI.
"""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any

from app.core.config import Settings, get_settings
from app.core.errors import NotFoundError, SimulationError
from app.domain.simulation_types import (
    PRESSURE_CONDITIONS,
    SIMULATION_DIFFICULTY_DIMENSIONS,
    SIMULATION_TURN_TYPES,
    fallback_message,
    initial_difficulty,
    simulation_type_for,
    stages_for_type,
)
from app.models import (
    Challenge,
    Exercise,
    ExerciseAttempt,
    ExerciseStatus,
    ExerciseType,
    JlptLevel,
    Register,
    SimulationEvaluation,
    SimulationSession,
    SimulationTurn,
    TargetLength,
    WritingScenario,
)
from app.prompts.common import SIMULATION_VERSION
from app.prompts.scenario_common import format_scenario_context
from app.prompts.scenario_evaluation import (
    build_scenario_evaluation_prompt,
)
from app.prompts.simulation_coach import (
    build_simulation_coach_prompt,
)
from app.prompts.simulation_context_summary import (
    build_simulation_context_summary_prompt,
    simulation_context_summary_prompt_version,
)
from app.prompts.simulation_planner import (
    build_simulation_planner_prompt,
    simulation_planner_prompt_version,
)
from app.prompts.simulation_state_update import (
    build_simulation_state_update_prompt,
)
from app.prompts.simulation_summary import (
    build_simulation_summary_prompt,
    simulation_summary_prompt_version,
)
from app.prompts.simulation_turn_evaluation import (
    build_simulation_turn_evaluation_prompt,
    simulation_turn_evaluation_prompt_version,
)
from app.prompts.simulation_turn_generation import (
    build_simulation_turn_generation_prompt,
    simulation_turn_generation_prompt_version,
)
from app.quality.service import create_quality_service
from app.repositories import (
    ExerciseAttemptRepository,
    ExerciseRepository,
    SimulationEvaluationRepository,
    SimulationSessionRepository,
    SimulationTurnRepository,
    WritingScenarioRepository,
)
from app.schemas.simulation import (
    SimulationCoachResponse,
    SimulationCompareItem,
    SimulationExplainResponse,
    SimulationHistoryItem,
    SimulationHistoryResponse,
    SimulationSessionResponse,
    SimulationStateOut,
    SimulationSummaryResponse,
    SimulationTurnEvaluationOut,
    SimulationTurnOut,
)
from app.schemas.simulation_ai import (
    SimulationCoachResult,
    SimulationContextSummaryResult,
    SimulationPlanResult,
    SimulationStateUpdateResult,
    SimulationSummaryResult,
    SimulationTurnEvaluationResult,
    SimulationTurnGenerationResult,
)
from app.schemas.writing_scenario import ScenarioEvaluationResult
from app.services.ai_service import AIService
from app.services.discourse_segmentation import split_sentences
from app.services.evaluation_service import EvaluationService
from app.services.simulation_state_machine import (
    SimulationConsistencyError,
    SimulationConsistencyValidator,
    adjust_difficulty,
    advance_stage,
    apply_state_update,
    decide_next_turn_type,
    difficulty_bounds,
    initial_state,
    resolution,
    should_summarize_context,
)

logger = logging.getLogger("app.simulation")

_MAX_TURN_TEXT = 2000


class SimulationService:
    """Owns the interactive simulation pipeline and its read APIs."""

    def __init__(
        self,
        evaluation_service: EvaluationService,
        ai_service: AIService,
        scenario_repository: WritingScenarioRepository,
        session_repository: SimulationSessionRepository,
        turn_repository: SimulationTurnRepository,
        evaluation_repository: SimulationEvaluationRepository,
        exercise_repository: ExerciseRepository,
        attempt_repository: ExerciseAttemptRepository,
        vocabulary_service: Any | None = None,
        gamification_service: Any | None = None,
        challenge_service: Any | None = None,
        memory_service: Any | None = None,
        settings: Settings | None = None,
    ) -> None:
        self._evaluations = evaluation_service
        self._ai = ai_service
        self._scenarios = scenario_repository
        self._sessions = session_repository
        self._turns = turn_repository
        self._evals = evaluation_repository
        self._exercises = exercise_repository
        self._attempts = attempt_repository
        self._vocabulary = vocabulary_service
        self._gamification = gamification_service
        self._challenges = challenge_service
        self._memory = memory_service
        self._settings = settings or get_settings()
        self._quality = create_quality_service(settings=self._settings)
        self._state_machine = SimulationConsistencyValidator()

    def _quality_check(
        self,
        task: str,
        result: Any,
        *,
        context: dict | None = None,
        prompt_version: str | None = None,
    ) -> None:
        """Route one AI result through the shared quality layer.

        Violations surface as ``SimulationConsistencyError`` so the existing
        fallback/degradation paths keep working.
        """
        outcome = self._quality.validate(
            task, result, context=context or {}, prompt_version=prompt_version
        )
        if outcome.violations:
            raise SimulationConsistencyError("; ".join(outcome.violations))

    # -- provider/model resolution -----------------------------------------

    def _task(
        self, provider_override: str | None = None, model_override: str | None = None
    ) -> tuple[str | None, str | None]:
        settings = self._settings
        provider = (
            provider_override
            or settings.ai_simulation_provider
            or settings.ai_scenario_provider
            or settings.ai_learning_provider
            or settings.ai_exercise_evaluation_provider
            or settings.ai_exercise_generation_provider
            or None
        )
        model = (
            model_override
            or settings.ai_simulation_model
            or settings.ai_scenario_model
            or settings.ai_learning_model
            or settings.ai_exercise_evaluation_model
            or None
        )
        return provider, model

    def _planner_task(
        self, provider_override: str | None = None, model_override: str | None = None
    ) -> tuple[str | None, str | None]:
        provider, model = self._task(provider_override, model_override)
        return provider, model_override or self._settings.ai_simulation_planner_model or model

    def _turn_task(
        self, provider_override: str | None = None, model_override: str | None = None
    ) -> tuple[str | None, str | None]:
        provider, model = self._task(provider_override, model_override)
        return provider, model_override or self._settings.ai_simulation_turn_model or model

    def _eval_task(
        self, provider_override: str | None = None, model_override: str | None = None
    ) -> tuple[str | None, str | None]:
        provider, model = self._task(provider_override, model_override)
        return provider, model_override or self._settings.ai_simulation_evaluation_model or model

    def _summary_task(
        self, provider_override: str | None = None, model_override: str | None = None
    ) -> tuple[str | None, str | None]:
        provider, model = self._task(provider_override, model_override)
        return provider, model_override or self._settings.ai_simulation_summary_model or model

    def _coach_task(
        self, provider_override: str | None = None, model_override: str | None = None
    ) -> tuple[str | None, str | None]:
        provider, model = self._task(provider_override, model_override)
        return provider, model_override or self._settings.ai_simulation_coach_model or model

    # -- create --------------------------------------------------------------

    async def create(
        self,
        user_id: str | None,
        scenario_id: str,
        mode: str,
        *,
        profile_block: str = "",
        objective_id: str | None = None,
        objective_context: str = "",
        provider: str | None = None,
        model: str | None = None,
    ) -> SimulationSessionResponse:
        if not self._settings.ai_simulation_enabled:
            raise SimulationError("interactive simulation is disabled in the server configuration")
        scenario = await self._scenarios.get_for_user(user_id, scenario_id)
        if scenario is None:
            raise NotFoundError(f"Scenario '{scenario_id}' not found")

        if objective_context:
            profile_block = (
                f"{objective_context}\n\n{profile_block}" if profile_block else objective_context
            )
        simulation_type = simulation_type_for(scenario)
        plan, plan_meta = await self._plan(
            scenario, simulation_type, profile_block, provider=provider, model=model
        )
        stages = self._stages_from_plan(plan, simulation_type)
        pressure = (
            plan.get("pressure_condition")
            if plan.get("pressure_condition") in PRESSURE_CONDITIONS
            else "normal"
        )
        difficulty = self._plan_difficulty(plan, scenario, pressure)
        bounds = difficulty_bounds(difficulty, self._settings.ai_simulation_difficulty_bounds)
        persona = plan.get("persona") or {
            "name": "相手",
            "role": _attr(scenario, "audience", "counterpart"),
            "personality_vi": "Lịch sự, đúng mực.",
        }

        exercise = await self._create_hidden_exercise(scenario, simulation_type, objective_id)
        state = initial_state(scenario, plan["objective_vi"], stages, persona)
        meta: dict[str, Any] = {
            "simulation_version": SIMULATION_VERSION,
            "simulation_type": simulation_type,
            "stages": stages,
            "persona": persona,
            "planner": plan_meta,
            "difficulty_initial": difficulty,
            "difficulty_current": dict(difficulty),
            "difficulty_bounds": {k: list(v) for k, v in bounds.items()},
            "exercise_id": exercise.id,
            "objective_id": objective_id,
            "context_summarized": False,
            "context_summary": None,
            "challenge_suggested": False,
            "challenge_id": None,
        }
        session = await self._sessions.add(
            SimulationSession(
                user_id=user_id,
                scenario_id=scenario.id,
                simulation_type=simulation_type,
                mode=mode,
                register=scenario.register,
                jlpt_level=scenario.jlpt_level,
                difficulty=_attr(scenario, "difficulty", 3),
                pressure_condition=pressure,
                status="active",
                max_turns=self._settings.ai_simulation_max_turns,
                current_turn=0,
                objective_vi=plan["objective_vi"],
                persona=persona,
                state=state,
                meta=meta,
            )
        )

        await self._append_ai_turn(
            session,
            scenario,
            state,
            "opening",
            [],
            difficulty,
            provider=provider,
            model=model,
        )
        session.current_turn = 1
        await self._sessions.update(session)
        await self._ingest_memory(
            user_id,
            session,
            context={
                "scenario_id": scenario.id,
                "simulation_type": simulation_type,
                "pressure_condition": pressure,
                "difficulty_initial": difficulty,
                "persona_role": persona.get("role"),
                "profile_block": profile_block[:2000],
            },
        )
        return await self.session_response(session)

    async def _plan(
        self,
        scenario: WritingScenario,
        simulation_type: str,
        profile_block: str,
        provider: str | None = None,
        model: str | None = None,
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        """Run the planner; a deterministic fallback replaces it on failure."""
        stage_provider, stage_model = self._planner_task(provider, model)
        started = datetime.now(timezone.utc)
        recent = [
            s.simulation_type
            for s in await self._sessions.list_recent_for_user(scenario.user_id, 5)
        ]
        try:
            result, _ = await self._ai.generate_structured(
                build_simulation_planner_prompt(
                    format_scenario_context(scenario),
                    simulation_type,
                    profile_block,
                    recent,
                )[1],
                SimulationPlanResult,
                system=build_simulation_planner_prompt(
                    format_scenario_context(scenario),
                    simulation_type,
                    profile_block,
                    recent,
                )[0],
                provider=stage_provider,
                model=stage_model,
                max_tokens=self._settings.ai_simulation_max_tokens,
            )
            assert isinstance(result, SimulationPlanResult)
            if not result.objective_vi.strip() or not (3 <= len(result.stages) <= 5):
                raise SimulationError("planner returned an invalid plan")
            plan: dict[str, Any] = {
                "objective_vi": result.objective_vi.strip(),
                "stages": [s.model_dump(mode="json") for s in result.stages],
                "persona": result.persona.model_dump(mode="json"),
                "pressure_condition": result.pressure_condition,
                "difficulty": result.difficulty,
            }
            meta = self._stage_meta(
                "planner", provider, model, simulation_planner_prompt_version(), started
            )
            return plan, meta
        except Exception as exc:  # noqa: BLE001 - planner failure degrades
            logger.warning(
                "simulation planner failed type=%s error=%s (deterministic fallback)",
                simulation_type,
                exc,
            )
        fallback = self._fallback_plan(scenario, simulation_type, profile_block)
        return fallback, self._stage_meta(
            "planner_fallback", None, None, simulation_planner_prompt_version(), started
        )

    def _fallback_plan(
        self, scenario: WritingScenario, simulation_type: str, profile_block: str
    ) -> dict[str, Any]:
        stages = stages_for_type(simulation_type)
        return {
            "objective_vi": (
                f"{_attr(scenario, 'purpose', 'trao đổi')} với "
                f"{_attr(scenario, 'audience', 'đối tác')} theo đúng tình huống "
                "và đạt được thỏa thuận cuối cùng."
            ),
            "stages": stages,
            "persona": {
                "name": "相手",
                "role": _attr(scenario, "audience", "counterpart"),
                "personality_vi": "Lịch sự, đúng mực.",
            },
            "pressure_condition": "normal",
            "difficulty": {},
        }

    @staticmethod
    def _stages_from_plan(plan: dict[str, Any], simulation_type: str) -> list[dict[str, str]]:
        stages = plan.get("stages") or []
        if not stages:
            return stages_for_type(simulation_type)
        return [
            {
                "name": str(s.get("name", ""))[:40] or "stage",
                "goal": str(s.get("goal", ""))[:300],
            }
            for s in stages
        ]

    @staticmethod
    def _plan_difficulty(
        plan: dict[str, Any], scenario: WritingScenario, pressure: str
    ) -> dict[str, int]:
        base = initial_difficulty(scenario, pressure)
        proposed = plan.get("difficulty") or {}
        merged = dict(base)
        for dimension in SIMULATION_DIFFICULTY_DIMENSIONS:
            value = proposed.get(dimension)
            if isinstance(value, (int, float)):
                merged[dimension] = max(1, min(10, int(value)))
        return merged

    async def _create_hidden_exercise(
        self, scenario: WritingScenario, simulation_type: str, objective_id: str | None = None
    ) -> Exercise:
        metadata = scenario.difficulty_metadata or {}
        exercise = await self._exercises.add(
            Exercise(
                exercise_type=ExerciseType.SCENARIO_RESPONSE,
                topic=scenario.topic or scenario.genre,
                context=scenario.situation_vi,
                prompt_vi=(
                    f"Hội thoại mô phỏng {simulation_type}: {scenario.situation_vi} "
                    f"({scenario.context_vi})"
                ),
                prompt_vi_hash=hashlib.sha256(scenario.id.encode()).hexdigest(),
                target_length=TargetLength.MULTI_SENTENCE,
                register=Register(scenario.register),
                jlpt_level=JlptLevel(scenario.jlpt_level),
                difficulty=_attr(scenario, "difficulty", 3),
                grammar_complexity=int(metadata.get("grammar", 5)),
                vocabulary_complexity=int(metadata.get("vocabulary", 5)),
                context_complexity=int(metadata.get("context", 5)),
                naturalness_target=int(metadata.get("naturalness", 5)),
                generation_metadata={
                    "source": "simulation",
                    "simulation_type": simulation_type,
                    "scenario_id": scenario.id,
                    "generation_version": "simulation_exercise:v1",
                },
                scenario_id=scenario.id,
                objective_id=objective_id,
                status=ExerciseStatus.PENDING,
            )
        )
        return exercise

    # -- turns ---------------------------------------------------------------

    async def submit_turn(
        self,
        user_id: str | None,
        session_id: str,
        text: str,
        *,
        end_early: bool = False,
        provider: str | None = None,
        model: str | None = None,
    ) -> SimulationSessionResponse:
        session = await self._require_session(user_id, session_id)
        scenario = await self._scenarios.get_for_user(user_id, session.scenario_id)
        if scenario is None:
            raise NotFoundError(f"Scenario '{session.scenario_id}' not found")
        if session.status != "active":
            raise SimulationError(
                "session is not active",
                status_code=409,
                code="session_inactive",
            )
        if end_early:
            return await self._end_early(session, scenario)

        text = text.strip()
        if not text or len(text) > _MAX_TURN_TEXT:
            raise SimulationError(
                "the reply must be between 1 and 2000 characters",
                status_code=422,
                code="validation_error",
            )

        meta = dict(session.meta or {})
        stages: list[dict[str, str]] = meta.get("stages") or stages_for_type(
            session.simulation_type
        )
        state = dict(session.state)
        mode = session.mode

        user_turn = await self._turns.add(
            SimulationTurn(
                session_id=session.id,
                turn_number=session.current_turn + 1,
                actor="user",
                turn_type="user_reply",
                text=text,
                mode=mode,
                status="pending",
            )
        )

        evaluation_payload, evaluation = await self._evaluate_turn(
            session, scenario, user_turn, text, provider=provider, model=model
        )
        user_turn.status = "evaluated"
        await self._turns.update(user_turn)

        if self._vocabulary is not None:
            try:
                counts = await self._vocabulary.extract_for_turn(
                    evaluation_payload.get("attempt_id"), evaluation_payload
                )
                user_turn.turn_metadata = {"vocabulary": counts}
                await self._turns.update(user_turn)
            except Exception as exc:  # noqa: BLE001 - vocabulary is isolated
                logger.warning(
                    "simulation vocabulary extraction failed session=%s error=%s",
                    session.id,
                    exc,
                )

        proposed = await self._propose_state_update(
            session, scenario, text, user_turn, evaluation_payload, provider=provider, model=model
        )
        state = apply_state_update(state, proposed, self._state_machine)
        session.state = state

        meta["difficulty_current"] = adjust_difficulty(
            meta.get("difficulty_current") or meta.get("difficulty_initial") or {},
            {k: tuple(v) for k, v in (meta.get("difficulty_bounds") or {}).items()},
            evaluation_payload["scores"],
        )

        last_ai = await self._last_ai_turn_type(session.id)
        next_type = decide_next_turn_type(state, stages, last_ai, evaluation_payload["scores"])
        session.state = advance_stage(state, stages)

        resolved = resolution(session.state, stages, next_type)
        session.current_turn = user_turn.turn_number
        if resolved is not None:
            session.status = "completed"
            session.resolution = resolved
            session.ended_at = datetime.now(timezone.utc)
        else:
            await self._append_ai_turn(
                session,
                scenario,
                session.state,
                next_type,
                await self._recent_turns(session.id),
                meta.get("difficulty_current") or {},
                provider=provider,
                model=model,
            )
        session.meta = meta
        await self._sessions.update(session)

        if resolved is not None:
            await self._finish(user_id, session, scenario, evaluation_payload["scores"])
        return await self.session_response(session)

    async def _evaluate_turn(
        self,
        session: SimulationSession,
        scenario: WritingScenario,
        turn: SimulationTurn,
        text: str,
        provider: str | None = None,
        model: str | None = None,
    ) -> tuple[dict[str, Any], Any]:
        """Run the full evaluation of one learner turn and persist it."""
        exercise = await self._exercises.get((session.meta or {}).get("exercise_id") or "")
        if exercise is None:
            raise SimulationError("simulation exercise is missing")
        sentences = split_sentences(text)
        sentence_scores = await self._evaluate_sentences(
            exercise, sentences, provider=provider, model=model
        )
        sentence_quality = (
            round(sum(s["overall_score"] for s in sentence_scores) / len(sentence_scores))
            if sentence_scores
            else None
        )
        naturalness = (
            round(sum(s["naturalness_score"] for s in sentence_scores) / len(sentence_scores))
            if sentence_scores
            else None
        )

        scenario_out = await self._run_scenario_stage(
            scenario, sentences, provider=provider, model=model
        )
        scenario_fit = scenario_out.get("scenario_fit")
        scenario_dims = scenario_out.get("dims", {})

        stages: list[dict[str, str]] = (session.meta or {}).get("stages") or []
        state_block = self._state_block(session.state, stages)
        turn_eval, turn_meta = await self._run_turn_evaluation(
            scenario,
            text,
            sentence_scores,
            scenario_out,
            state_block,
            provider=provider,
            model=model,
        )
        goal_progress = int(turn_eval["goal_progress"])
        communication = int(turn_eval["communication_effectiveness"])
        strengths = turn_eval["strengths"]
        issues = turn_eval["issues"]

        scores = {
            "sentence_quality": sentence_quality if sentence_quality is not None else 0,
            "naturalness_score": naturalness if naturalness is not None else 0,
            "scenario_fit": scenario_fit if scenario_fit is not None else 0,
            "goal_progress": goal_progress,
            "communication_effectiveness": communication,
        }
        overall = self._overall_score(scores)
        scores["overall"] = overall

        corrections = None
        if sentence_scores:
            worst = min(sentence_scores, key=lambda s: s["overall_score"])
            corrections = worst.get("corrections")

        attempt = await self._create_attempt(exercise, text)
        evaluation = await self._evals.add(
            SimulationEvaluation(
                turn_id=turn.id,
                scores={**scores, **scenario_dims},
                overall_score=overall,
                strengths=strengths,
                issues=issues,
                corrections=corrections,
                feedback_vi=turn_eval["feedback_vi"],
                evaluation_version=SIMULATION_VERSION,
                provenance={
                    "provider": turn_meta["provider"],
                    "model": turn_meta["model"],
                    "prompt_version": turn_meta["prompt_version"],
                    "stages": stages,
                    "evaluation_version": SIMULATION_VERSION,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                },
                evaluated_at=datetime.now(timezone.utc),
            )
        )
        payload = {
            "attempt_id": attempt.id,
            "scores": scores,
            "issues": issues,
            "corrections": corrections,
            "feedback_vi": turn_eval["feedback_vi"],
            "strengths": strengths,
            "summary": turn_eval["feedback_vi"] or "",
        }
        return payload, evaluation

    async def _evaluate_sentences(
        self,
        exercise: Exercise,
        sentences: list[str],
        provider: str | None = None,
        model: str | None = None,
    ) -> list[dict[str, Any]]:
        if not sentences:
            return []
        import asyncio

        sem = asyncio.Semaphore(3)

        async def _one(idx: int, sent: str):
            async with sem:
                try:
                    evaluation, _ = await self._evaluations.evaluate(exercise, sent, provider=provider, model=model)
                    return {
                        "index": idx,
                        "text": sent,
                        "overall_score": evaluation.scores.overall_score,
                        "semantic_score": evaluation.scores.semantic_score,
                        "grammar_score": evaluation.scores.grammar_score,
                        "vocabulary_score": evaluation.scores.vocabulary_score,
                        "naturalness_score": evaluation.scores.naturalness_score,
                        "context_fit_score": evaluation.scores.context_fit_score,
                        "register_fit_score": evaluation.scores.register_fit_score,
                        "issues": [i.model_dump(mode="json") for i in evaluation.issues],
                        "corrections": evaluation.corrections.model_dump(mode="json"),
                        "summary": evaluation.summary,
                    }
                except Exception as exc:  # noqa: BLE001
                    logger.warning("simulation sentence evaluation failed index=%d error=%s", idx, exc)
                    return None

        results = await asyncio.gather(*[_one(i, s) for i, s in enumerate(sentences)])
        return [r for r in results if r is not None]

    async def _run_scenario_stage(
        self,
        scenario: WritingScenario,
        sentences: list[str],
        provider: str | None = None,
        model: str | None = None,
    ) -> dict[str, Any]:
        """Phase 9 scenario-fit stage (isolated: failure degrades to None)."""
        try:
            stage_provider, stage_model = self._eval_task(provider, model)
            system, user = build_scenario_evaluation_prompt(scenario, sentences)
            result, _ = await self._ai.generate_structured(
                user,
                ScenarioEvaluationResult,
                system=system,
                provider=stage_provider,
                model=stage_model,
                max_tokens=self._settings.ai_scenario_max_tokens,
            )
            assert isinstance(result, ScenarioEvaluationResult)
            dims = {
                "scenario_semantic_fit": result.scenario_semantic_fit,
                "audience_fit": result.audience_fit,
                "purpose_fit": result.purpose_fit,
                "tone_fit": result.tone_fit,
                "constraint_compliance": result.constraint_compliance,
            }
            weights = self._scenario_weights()
            total = sum(w for _, w in weights)
            fit = (
                round(sum(dims[k] * w for k, w in weights) / total)
                if total > 0
                else round(sum(dims.values()) / max(len(dims), 1))
            )
            return {"scenario_fit": fit, "dims": dims, "unavailable": False}
        except Exception as exc:  # noqa: BLE001 - scenario stage is isolated
            logger.warning(
                "simulation scenario stage unavailable genre=%s error=%s", scenario.genre, exc
            )
            return {"scenario_fit": None, "dims": {}, "unavailable": True}

    def _scenario_weights(self) -> list[tuple[str, int]]:
        return [
            ("scenario_semantic_fit", max(self._settings.ai_scenario_weight_semantic, 0)),
            ("audience_fit", max(self._settings.ai_scenario_weight_audience, 0)),
            ("purpose_fit", max(self._settings.ai_scenario_weight_purpose, 0)),
            ("tone_fit", max(self._settings.ai_scenario_weight_tone, 0)),
            ("constraint_compliance", max(self._settings.ai_scenario_weight_constraint, 0)),
        ]

    async def _run_turn_evaluation(
        self,
        scenario: WritingScenario,
        text: str,
        sentence_scores: list[dict[str, Any]],
        scenario_out: dict[str, Any],
        state_block: str,
        provider: str | None = None,
        model: str | None = None,
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        """Conversation-level evaluation with deterministic fallback."""
        stage_provider, stage_model = self._eval_task(provider, model)
        started = datetime.now(timezone.utc)
        sentence_block = self._sentence_block(sentence_scores)
        scenario_block = (
            (
                "scenario_fit="
                + str(scenario_out.get("scenario_fit"))
                + ", "
                + ", ".join(f"{k}={v}" for k, v in (scenario_out.get("dims") or {}).items())
            )
            if scenario_out.get("scenario_fit") is not None
            else ""
        )
        try:
            result, _ = await self._ai.generate_structured(
                build_simulation_turn_evaluation_prompt(
                    format_scenario_context(scenario),
                    text,
                    sentence_block,
                    scenario_block,
                    state_block,
                    "user_reply",
                )[1],
                SimulationTurnEvaluationResult,
                system=build_simulation_turn_evaluation_prompt(
                    format_scenario_context(scenario),
                    text,
                    sentence_block,
                    scenario_block,
                    state_block,
                    "user_reply",
                )[0],
                provider=stage_provider,
                model=stage_model,
                max_tokens=self._settings.ai_simulation_max_tokens,
            )
            assert isinstance(result, SimulationTurnEvaluationResult)
            payload = {
                "goal_progress": max(0, min(100, result.goal_progress)),
                "communication_effectiveness": max(0, min(100, result.communication_effectiveness)),
                "strengths": [s for s in result.strengths if s][:4],
                "issues": [i.model_dump(mode="json") for i in result.issues][:3],
                "feedback_vi": result.feedback_vi,
            }
            meta = self._stage_meta(
                "turn_evaluation",
                provider,
                model,
                simulation_turn_evaluation_prompt_version(),
                started,
            )
            return payload, meta
        except Exception as exc:  # noqa: BLE001 - turn evaluation degrades
            logger.warning(
                "simulation turn evaluation failed session error=%s (deterministic fallback)",
                exc,
            )
        fallback_score = (
            round(sum(s["overall_score"] for s in sentence_scores) / len(sentence_scores))
            if sentence_scores
            else 50
        )
        fallback = {
            "goal_progress": max(0, min(100, round(fallback_score * 0.7 + 15))),
            "communication_effectiveness": max(0, min(100, fallback_score)),
            "strengths": [
                "Bạn đã tiếp tục cuộc hội thoại bằng tiếng Nhật đúng vai.",
                "Nội dung trả lời bám sát mục tiêu của tình huống.",
            ],
            "issues": [],
            "feedback_vi": (
                "Câu trả lời đã giữ được mạch hội thoại. Hãy chú ý hơn đến "
                "việc xác nhận lại thông tin với đối phương."
            ),
        }
        return fallback, self._stage_meta(
            "turn_evaluation_fallback",
            None,
            None,
            simulation_turn_evaluation_prompt_version(),
            started,
        )

    def _overall_score(self, scores: dict[str, Any]) -> int:
        weights = [
            ("sentence_quality", max(self._settings.ai_simulation_weight_sentence, 0)),
            ("scenario_fit", max(self._settings.ai_simulation_weight_scenario, 0)),
            (
                "communication_effectiveness",
                max(self._settings.ai_simulation_weight_communication, 0),
            ),
            ("goal_progress", max(self._settings.ai_simulation_weight_goal, 0)),
        ]
        total = sum(w for _, w in weights)
        if total <= 0:
            return 0
        return round(sum(int(scores.get(name, 0)) * weight for name, weight in weights) / total)

    async def _propose_state_update(
        self,
        session: SimulationSession,
        scenario: WritingScenario,
        text: str,
        turn: SimulationTurn,
        evaluation_payload: dict[str, Any],
        provider: str | None = None,
        model: str | None = None,
    ) -> dict[str, Any]:
        """AI-proposed state update; deterministic fallback keeps the state."""
        stage_provider, stage_model = self._eval_task(provider, model)
        ai_reply = await self._last_ai_message(session.id) or ""
        state_block = self._state_block(session.state, (session.meta or {}).get("stages") or [])
        evaluation_block = ", ".join(
            f"{k}={v}" for k, v in sorted(evaluation_payload["scores"].items())
        )
        try:
            result, _ = await self._ai.generate_structured(
                build_simulation_state_update_prompt(state_block, text, ai_reply, evaluation_block)[
                    1
                ],
                SimulationStateUpdateResult,
                system=build_simulation_state_update_prompt(
                    state_block, text, ai_reply, evaluation_block
                )[0],
                provider=stage_provider,
                model=stage_model,
                max_tokens=self._settings.ai_simulation_max_tokens,
            )
            assert isinstance(result, SimulationStateUpdateResult)
            proposed = result.model_dump(mode="json")
            outcome = self._quality.validate(
                "simulation_state_update",
                proposed,
                context={"previous_state": session.state},
                prompt_version=simulation_turn_generation_prompt_version(),
            )
            if outcome.violations:
                # Requirement 35: never silently drop facts/decisions. The
                # deterministic repair re-merges previously established values
                # the proposal omitted; anything still inconsistent degrades.
                repaired = self._repair_state_update(proposed, session.state)
                if repaired is not None:
                    logger.info(
                        "simulation state update repaired session=%s violations=%s",
                        session.id,
                        outcome.violations[:3],
                    )
                    return repaired
                raise SimulationConsistencyError("; ".join(outcome.violations))
            return proposed
        except Exception as exc:  # noqa: BLE001 - state update degrades
            logger.warning(
                "simulation state update failed session=%s error=%s (deterministic fallback)",
                session.id,
                exc,
            )
        return {}

    @staticmethod
    def _repair_state_update(
        proposed: dict[str, Any], previous_state: dict[str, Any]
    ) -> dict[str, Any] | None:
        """Re-merge established facts/decisions the proposal omitted.

        Returns the repaired proposal when the omissions are the only issue,
        else None (caller degrades to the deterministic fallback).
        """
        repaired = {
            key: (list(value) if isinstance(value, list) else value)
            for key, value in proposed.items()
        }
        for key in ("facts", "decisions"):
            previous_values = (previous_state or {}).get(key) or []
            proposed_values = repaired.get(key)
            if not isinstance(proposed_values, list):
                return None
            merged = list(previous_values)
            for value in proposed_values:
                if value not in merged:
                    merged.append(value)
            repaired[key] = merged
        if not isinstance(repaired.get("participant_positions", {}), dict):
            return None
        return repaired

    async def _append_ai_turn(
        self,
        session: SimulationSession,
        scenario: WritingScenario,
        state: dict[str, Any],
        turn_type: str,
        recent_turns: list[str],
        difficulty: dict[str, int],
        provider: str | None = None,
        model: str | None = None,
    ) -> None:
        if turn_type not in SIMULATION_TURN_TYPES:
            turn_type = "question"
        text, meta = await self._generate_ai_message(
            session,
            scenario,
            state,
            turn_type,
            recent_turns,
            difficulty,
            provider=provider,
            model=model,
        )
        turn_number = session.current_turn + 1
        if turn_number < 1:
            turn_number = 1
        turn = await self._turns.add(
            SimulationTurn(
                session_id=session.id,
                turn_number=turn_number,
                actor="ai",
                turn_type=turn_type,
                text=text,
                mode=session.mode,
                status="delivered",
                turn_metadata=meta,
            )
        )
        session.current_turn = turn.turn_number

    async def _generate_ai_message(
        self,
        session: SimulationSession,
        scenario: WritingScenario,
        state: dict[str, Any],
        turn_type: str,
        recent_turns: list[str],
        difficulty: dict[str, int],
        provider: str | None = None,
        model: str | None = None,
    ) -> tuple[str, dict[str, Any]]:
        """Generate the persona's message with retries + template fallback."""
        stage_provider, stage_model = self._turn_task(provider, model)
        started = datetime.now(timezone.utc)
        meta = self._stage_meta(
            "turn_generation",
            stage_provider,
            stage_model,
            simulation_turn_generation_prompt_version(),
            started,
        )
        state_block = self._state_block(state, (session.meta or {}).get("stages") or [])
        recent, context_meta = await self._bounded_context(
            session, scenario, recent_turns, provider=provider, model=model
        )
        if context_meta:
            meta["context_summary"] = context_meta
        difficulty_block = ", ".join(f"{k}={v}" for k, v in sorted(difficulty.items()))
        max_cycles = 1 + self._settings.ai_simulation_max_regeneration_attempts
        last_error = "turn generation failed"
        for _ in range(max_cycles):
            try:
                result, _ = await self._ai.generate_structured(
                    build_simulation_turn_generation_prompt(
                        format_scenario_context(scenario),
                        state_block,
                        recent,
                        turn_type,
                        difficulty_block,
                    )[1],
                    SimulationTurnGenerationResult,
                    system=build_simulation_turn_generation_prompt(
                        format_scenario_context(scenario),
                        state_block,
                        recent,
                        turn_type,
                        difficulty_block,
                    )[0],
                    provider=stage_provider,
                    model=stage_model,
                    max_tokens=self._settings.ai_simulation_max_tokens,
                )
                assert isinstance(result, SimulationTurnGenerationResult)
                message = result.message_ja.strip()
                if not message or len(message) > 400:
                    raise SimulationError("turn message is invalid")
                return message, meta
            except Exception as exc:  # noqa: BLE001 - retry loop
                last_error = str(exc)
                logger.warning(
                    "simulation turn generation rejected turn_type=%s error=%s",
                    turn_type,
                    last_error,
                )
        return fallback_message(turn_type), meta

    async def _bounded_context(
        self,
        session: SimulationSession,
        scenario: WritingScenario,
        recent_turns: list[str],
        provider: str | None = None,
        model: str | None = None,
    ) -> tuple[list[str], dict[str, Any] | None]:
        """Cap the prompt context; summarize long conversations once."""
        window = self._settings.ai_simulation_context_window
        meta = dict(session.meta or {})
        if should_summarize_context(len(recent_turns), window) and not meta.get(
            "context_summarized"
        ):
            summary_payload = await self._summarize_context(
                session, scenario, recent_turns, provider=provider, model=model
            )
            if summary_payload:
                meta["context_summarized"] = True
                meta["context_summary"] = summary_payload["data"]
                session.meta = meta
                return summary_payload["turns"], summary_payload["meta"]
        return recent_turns[-window:], None

    async def _summarize_context(
        self,
        session: SimulationSession,
        scenario: WritingScenario,
        recent_turns: list[str],
        provider: str | None = None,
        model: str | None = None,
    ) -> dict[str, Any] | None:
        stage_provider, stage_model = self._summary_task(provider, model)
        started = datetime.now(timezone.utc)
        try:
            result, _ = await self._ai.generate_structured(
                build_simulation_context_summary_prompt(
                    format_scenario_context(scenario),
                    session.objective_vi,
                    recent_turns,
                )[1],
                SimulationContextSummaryResult,
                system=build_simulation_context_summary_prompt(
                    format_scenario_context(scenario),
                    session.objective_vi,
                    recent_turns,
                )[0],
                provider=stage_provider,
                model=stage_model,
                max_tokens=self._settings.ai_simulation_max_tokens,
            )
            assert isinstance(result, SimulationContextSummaryResult)
            return {
                "data": result.model_dump(mode="json"),
                "turns": [f"[summary] {result.summary_note}"],
                "meta": self._stage_meta(
                    "context_summary",
                    stage_provider,
                    stage_model,
                    simulation_context_summary_prompt_version(),
                    started,
                ),
            }
        except Exception as exc:  # noqa: BLE001 - summarization is isolated
            logger.warning("simulation context summary failed session=%s error=%s", session.id, exc)
            return None

    async def _end_early(
        self, session: SimulationSession, scenario: WritingScenario
    ) -> SimulationSessionResponse:
        session.status = "ended"
        session.resolution = "user_ended"
        session.ended_at = datetime.now(timezone.utc)
        await self._sessions.update(session)
        await self._finish(session.user_id, session, scenario, {})
        return await self.session_response(session)

    async def _finish(
        self,
        user_id: str | None,
        session: SimulationSession,
        scenario: WritingScenario,
        last_scores: dict[str, int],
    ) -> None:
        """End-of-session hooks: gamification + challenge suggestion (isolated)."""
        try:
            session_id = session.id
            snapshot = {
                "id": session_id,
                "user_id": session.user_id,
                "simulation_type": session.simulation_type,
                "mode": session.mode,
                "resolution": session.resolution,
            }
            evaluations = await self._evals.list_by_session(session_id)
            averages = self._average_dimensions(evaluations)
            previous = await self._previous_completed(user_id, session.scenario_id, session_id)
            previous_average = (
                self._average_dimensions(await self._evals.list_by_session(previous.id)).get(
                    "overall"
                )
                if previous is not None
                else None
            )
            overall = averages.get("overall")
            improved = (
                previous_average is not None
                and overall is not None
                and overall - previous_average >= self._settings.ai_simulation_improvement_delta
            )
            objective_resolved = snapshot["resolution"] == "success"
            if self._gamification is not None:
                try:
                    await self._gamification.record_simulation_activity(
                        user_id,
                        session=snapshot,
                        average=overall,
                        objective_resolved=objective_resolved,
                        improved=improved,
                        now=None,
                    )
                except Exception as exc:  # noqa: BLE001
                    logger.warning(
                        "simulation gamification hook failed session=%s error=%s",
                        session_id,
                        exc,
                    )
            await self._record_curriculum_evidence(user_id, session, evaluations)
            if self._challenges is not None:
                await self._maybe_suggest_challenge(user_id, session_id, evaluations)
        except Exception as exc:  # noqa: BLE001 - finish never breaks the session
            logger.warning("simulation finish failed session=%s error=%s", session.id, exc)

    async def _record_curriculum_evidence(
        self, user_id: str | None, session: SimulationSession, evaluations: list[Any]
    ) -> None:
        """Feed the finished session into the active journey objective (isolated)."""
        if not self._settings.ai_curriculum_enabled:
            return
        try:
            objective_id = (session.meta or {}).get("objective_id")
            if not objective_id:
                return
            averages = self._average_dimensions(evaluations)
            overall = averages.get("overall")
            if overall is None:
                return
            from app.services.curriculum_service import CurriculumService

            service = CurriculumService(self._session, self._settings)
            skills = {
                "communication_effectiveness": averages.get("communication_effectiveness", overall),
                "goal_progress": averages.get("goal_progress", overall),
                "scenario_semantic_fit": averages.get("scenario_fit", overall),
                "naturalness": averages.get("naturalness_score", overall),
            }
            exercise_id = (session.meta or {}).get("exercise_id")
            await service.record_evidence(
                user_id,
                exercise_id=exercise_id or session.id,
                attempt_id=session.id,
                score=int(overall),
                skills=skills,
                mode="simulation",
            )
        except Exception as exc:  # noqa: BLE001 - curriculum must not break the session
            logger.warning("simulation curriculum hook failed session=%s error=%s", session.id, exc)

    async def _maybe_suggest_challenge(
        self, user_id: str | None, session_id: str, evaluations: list[Any]
    ) -> None:
        fresh = await self._sessions.get_for_user(user_id, session_id)
        if fresh is None:
            return
        meta = dict(fresh.meta or {})
        if meta.get("challenge_suggested"):
            return
        threshold = self._settings.ai_challenge_success_threshold
        weak = any(
            int((e.scores or {}).get("naturalness_score", 0)) < threshold for e in evaluations
        )
        if not weak:
            return
        try:
            challenge = await self._challenges.generate(
                fresh.user_id, objective_id=meta.get("objective_id")
            )
            meta["challenge_suggested"] = True
            meta["challenge_id"] = challenge.id
            fresh.meta = meta
            await self._sessions.update(fresh)
        except Exception as exc:  # noqa: BLE001 - suggestion is isolated
            logger.warning(
                "simulation challenge suggestion failed session=%s error=%s", session_id, exc
            )

    async def _previous_completed(
        self, user_id: str | None, scenario_id: str, session_id: str
    ) -> SimulationSession | None:
        rows = await self._sessions.list_completed_for_scenario(user_id, scenario_id)
        for row in rows:
            if row.id != session_id:
                return row
        return None

    @staticmethod
    def _average_dimensions(evaluations: list[Any]) -> dict[str, int]:
        if not evaluations:
            return {}
        keys = [
            "overall",
            "sentence_quality",
            "scenario_fit",
            "goal_progress",
            "communication_effectiveness",
            "naturalness_score",
        ]
        averages: dict[str, int] = {}
        for key in keys:
            values = [int((e.scores or {}).get(key, 0)) for e in evaluations]
            averages[key] = round(sum(values) / len(values)) if values else 0
        return averages

    async def _create_attempt(self, exercise: Exercise, text: str) -> ExerciseAttempt:
        number = await self._attempts.next_attempt_number(exercise.id)
        return await self._attempts.add(
            ExerciseAttempt(
                exercise_id=exercise.id,
                attempt_number=number,
                answer_text=text,
            )
        )

    # -- read APIs -------------------------------------------------------------

    async def get(self, user_id: str | None, session_id: str) -> SimulationSessionResponse:
        session = await self._require_session(user_id, session_id)
        return await self.session_response(session)

    async def list(
        self, user_id: str | None, *, skip: int = 0, limit: int = 20
    ) -> SimulationHistoryResponse:
        sessions, total = await self._sessions.list_for_user(user_id, skip=skip, limit=limit)
        items = [await self._history_item(session) for session in sessions]
        return SimulationHistoryResponse(items=items, total=total)

    async def _history_item(self, session: SimulationSession) -> SimulationHistoryItem:
        evaluations = await self._evals.list_by_session(session.id)
        averages = self._average_dimensions(evaluations)
        return SimulationHistoryItem(
            id=session.id,
            simulation_type=session.simulation_type,
            mode=session.mode,
            register=session.register,
            status=session.status,
            resolution=session.resolution,
            turn_count=session.current_turn,
            average_overall=averages.get("overall"),
            scenario_id=session.scenario_id,
            created_at=session.created_at,
            updated_at=session.updated_at,
        )

    async def summary(self, user_id: str | None, session_id: str) -> SimulationSummaryResponse:
        session = await self._require_session(user_id, session_id)
        scenario = await self._scenarios.get_for_user(user_id, session.scenario_id)
        if scenario is None:
            raise NotFoundError(f"Scenario '{session.scenario_id}' not found")
        stored = session.summary
        if stored:
            return self._summary_response(session, stored)
        payload = await self._generate_summary(session, scenario)
        session.summary = payload
        await self._sessions.update(session)
        await self._ingest_memory(user_id, session)
        return self._summary_response(session, payload)

    async def _generate_summary(
        self, session: SimulationSession, scenario: WritingScenario
    ) -> dict[str, Any]:
        evaluations = await self._evals.list_by_session(session.id)
        averages = self._average_dimensions(evaluations)
        turns = await self._turns.list_by_session(session.id)
        user_turns = [t for t in turns if t.actor == "user"]
        user_evaluations = evaluations[: len(user_turns)]
        lines = []
        for turn, evaluation in zip(user_turns, user_evaluations, strict=False):
            lines.append(
                f"[{turn.actor} / {turn.turn_type}] {turn.text} (score={evaluation.overall_score})"
            )
        turns_block = "\n".join(lines)[:4000] or "(no evaluated turns)"
        provider, model = self._summary_task()
        started = datetime.now(timezone.utc)
        fallback = True
        summary_vi = self._deterministic_summary(session, averages, scenario)
        strengths: list[str] = []
        needs_work: list[str] = []
        try:
            result, _ = await self._ai.generate_structured(
                build_simulation_summary_prompt(
                    format_scenario_context(scenario),
                    session.objective_vi,
                    session.resolution or "ended",
                    averages,
                    turns_block,
                )[1],
                SimulationSummaryResult,
                system=build_simulation_summary_prompt(
                    format_scenario_context(scenario),
                    session.objective_vi,
                    session.resolution or "ended",
                    averages,
                    turns_block,
                )[0],
                provider=provider,
                model=model,
                max_tokens=self._settings.ai_simulation_max_tokens,
            )
            assert isinstance(result, SimulationSummaryResult)
            summary_vi = result.summary_vi
            strengths = list(result.strengths)
            needs_work = list(result.needs_work)
            fallback = False
        except Exception as exc:  # noqa: BLE001 - summary degrades
            logger.warning(
                "simulation summary failed session=%s error=%s (deterministic fallback)",
                session.id,
                exc,
            )

        compare = None
        previous = await self._previous_completed(session.user_id, session.scenario_id, session.id)
        if previous is not None:
            previous_averages = self._average_dimensions(
                await self._evals.list_by_session(previous.id)
            )
            deltas = {
                key: int(averages.get(key, 0) - previous_averages.get(key, 0))
                for key in (
                    "overall",
                    "goal_progress",
                    "communication_effectiveness",
                    "scenario_fit",
                )
            }
            compare = {
                "previous_session_id": previous.id,
                "deltas": deltas,
            }

        suggested_challenge = None
        meta = dict(session.meta or {})
        if meta.get("challenge_id"):
            challenge = await self._get_challenge(session.user_id, meta["challenge_id"])
            if challenge is not None:
                suggested_challenge = self._challenge_payload(
                    challenge, self._settings.xp_challenge_complete
                )

        return {
            "summary_vi": summary_vi,
            "dimensions": averages,
            "strengths": strengths,
            "needs_work": needs_work,
            "resolution": session.resolution or "ended",
            "turn_count": session.current_turn,
            "compare": compare,
            "suggested_challenge": suggested_challenge,
            "ai_generated": not fallback,
            "provider": provider or ("fallback" if fallback else "unknown"),
            "model": model or "deterministic",
            "prompt_version": simulation_summary_prompt_version(),
            "generated_at": started.isoformat(),
        }

    async def explain_turn(
        self, user_id: str | None, session_id: str, turn_id: str
    ) -> SimulationExplainResponse:
        session = await self._require_session(user_id, session_id)
        turn = await self._turns.get(turn_id)
        if turn is None or turn.session_id != session.id:
            raise NotFoundError(f"Turn '{turn_id}' not found in this session")
        evaluation = await self._evals.get_by_turn(turn.id)
        if evaluation is None:
            return SimulationExplainResponse(turn_id=turn.id)
        corrections = evaluation.corrections
        return SimulationExplainResponse(
            turn_id=turn.id,
            corrections=(
                {
                    "minimal_fix": corrections.get("correct_version"),
                    "natural_rewrite": corrections.get("natural_version"),
                    "native_rewrite": corrections.get("native_version"),
                }
                if corrections
                else None
            ),
            issues=[
                {
                    "category": i.get("category", ""),
                    "severity": i.get("severity", "minor"),
                    "explanation": i.get("explanation", ""),
                    "suggested_fix": i.get("suggested_fix", ""),
                }
                for i in (evaluation.issues or [])
            ],
            feedback_vi=evaluation.feedback_vi,
            summary=" ".join(evaluation.strengths or []),
        )

    async def coach(
        self,
        user_id: str | None,
        session_id: str,
        question: str,
        provider: str | None = None,
        model: str | None = None,
    ) -> SimulationCoachResponse:
        session = await self._require_session(user_id, session_id)
        scenario = await self._scenarios.get_for_user(user_id, session.scenario_id)
        if scenario is None:
            raise NotFoundError(f"Scenario '{session.scenario_id}' not found")
        evaluations = await self._evals.list_by_session(session.id)
        averages = self._average_dimensions(evaluations)
        stages: list[dict[str, str]] = (session.meta or {}).get("stages") or []
        state_block = self._state_block(session.state, stages)
        memory_block = await self._memory_block(user_id)
        stage_provider, stage_model = self._coach_task(provider, model)
        prompt_system, prompt_user = build_simulation_coach_prompt(
            format_scenario_context(scenario),
            session.objective_vi,
            state_block,
            averages,
            question,
            memory_block=memory_block,
        )
        try:
            result, _ = await self._ai.generate_structured(
                prompt_user,
                SimulationCoachResult,
                system=prompt_system,
                provider=stage_provider,
                model=stage_model,
                max_tokens=self._settings.ai_simulation_max_tokens,
            )
            assert isinstance(result, SimulationCoachResult)
            return SimulationCoachResponse(
                answer=result.answer, suggestions=list(result.suggestions)
            )
        except Exception as exc:  # noqa: BLE001 - coach degrades
            logger.warning(
                "simulation coach failed session=%s error=%s (deterministic fallback)",
                session.id,
                exc,
            )
        return SimulationCoachResponse(
            answer=(
                "Bạn đang trong tình huống mô phỏng này. Hãy đọc kỹ mục tiêu "
                "hiện tại và câu hỏi của đối phương, rồi trả lời bằng tiếng Nhật "
                f"đúng với mức độ lịch sự ({session.register}). Nếu chưa chắc nên "
                "nói gì, hãy đặt câu hỏi xác nhận lại với đối phương."
            ),
            suggestions=["Tôi nên nói gì ở lượt tiếp theo?", "Lỗi thường gặp của tôi là gì?"],
        )

    # -- memory (Phase 12) ------------------------------------------------------

    async def _memory_block(self, user_id: str | None) -> str:
        if self._memory is None:
            return ""
        try:
            return await self._memory.context_builder().memory_block(user_id, "simulation")
        except Exception:
            logger.exception("memory context failed user_id=%s (coach is unaffected)", user_id)
            return ""

    async def _ingest_memory(
        self,
        user_id: str | None,
        session: SimulationSession,
        *,
        context: dict[str, Any] | None = None,
    ) -> None:
        if self._memory is None or not self._settings.ai_memory_enabled:
            return
        payload = dict(context or {})
        payload.setdefault("scenario_id", session.scenario_id)
        payload.setdefault("simulation_type", session.simulation_type)
        payload.setdefault("status", session.status)
        payload.setdefault("resolution", session.resolution)
        payload.setdefault("register", session.register)
        if session.summary:
            payload.setdefault("summary_vi", (session.summary or {}).get("summary_vi"))
        try:
            await self._memory.ingest_event(user_id, "simulation", session.id, payload)
        except Exception:
            logger.exception(
                "memory ingest failed session=%s (simulation is unaffected)", session.id
            )

    # -- response building -----------------------------------------------------

    async def session_response(self, session: SimulationSession) -> SimulationSessionResponse:
        turns = await self._turns.list_by_session(session.id)
        evaluation_map: dict[str, Any] = {}
        if session.mode == "guided" or session.status != "active":
            evaluations = await self._evals.list_by_session(session.id)
            evaluation_map = {e.turn_id: e for e in evaluations}
        turn_out = [self._turn_out(turn, evaluation_map.get(turn.id)) for turn in turns]
        return SimulationSessionResponse(
            id=session.id,
            scenario_id=session.scenario_id,
            simulation_type=session.simulation_type,
            mode=session.mode,
            register=session.register,
            jlpt_level=session.jlpt_level,
            difficulty=session.difficulty,
            pressure_condition=session.pressure_condition,
            status=session.status,
            resolution=session.resolution,
            max_turns=session.max_turns,
            current_turn=session.current_turn,
            objective_vi=session.objective_vi,
            persona=session.persona,
            state=self._state_out(session.state),
            meta=session.meta or {},
            summary=session.summary,
            turns=turn_out,
            created_at=session.created_at,
            updated_at=session.updated_at,
        )

    @staticmethod
    def _turn_out(turn: SimulationTurn, evaluation: Any) -> SimulationTurnOut:
        eval_out = None
        if evaluation is not None:
            scores = evaluation.scores or {}
            eval_out = SimulationTurnEvaluationOut(
                overall_score=evaluation.overall_score,
                sentence_quality=scores.get("sentence_quality"),
                scenario_fit=scores.get("scenario_fit"),
                goal_progress=int(scores.get("goal_progress", 0)),
                communication_effectiveness=int(scores.get("communication_effectiveness", 0)),
                naturalness_score=scores.get("naturalness_score"),
                strengths=list(evaluation.strengths or []),
                issues=[
                    {
                        "category": i.get("category", ""),
                        "severity": i.get("severity", "minor"),
                        "explanation": i.get("explanation", ""),
                        "suggested_fix": i.get("suggested_fix", ""),
                    }
                    for i in (evaluation.issues or [])
                ],
                feedback_vi=evaluation.feedback_vi,
                corrections=(
                    {
                        "minimal_fix": (evaluation.corrections or {}).get("correct_version"),
                        "natural_rewrite": (evaluation.corrections or {}).get("natural_version"),
                        "native_rewrite": (evaluation.corrections or {}).get("native_version"),
                    }
                    if evaluation.corrections
                    else None
                ),
            )
        return SimulationTurnOut(
            id=turn.id,
            turn_number=turn.turn_number,
            actor=turn.actor,
            turn_type=turn.turn_type,
            text=turn.text,
            status=turn.status,
            created_at=turn.created_at,
            evaluation=eval_out,
        )

    def _state_out(self, state: dict[str, Any]) -> SimulationStateOut:
        return SimulationStateOut(
            objective=str(state.get("objective", "")),
            current_stage=str(state.get("current_stage", "")),
            unresolved_items=list(state.get("unresolved_items", [])),
            completed_items=list(state.get("completed_items", [])),
            participant_positions=dict(state.get("participant_positions", {})),
            facts=list(state.get("facts", [])),
            decisions=list(state.get("decisions", [])),
            constraints=list(state.get("constraints", [])),
            emotional_context=str(state.get("emotional_context", "")),
            next_goal=str(state.get("next_goal", "")),
        )

    @staticmethod
    def _summary_response(
        session: SimulationSession, payload: dict[str, Any]
    ) -> SimulationSummaryResponse:
        compare = payload.get("compare")
        return SimulationSummaryResponse(
            session_id=session.id,
            summary_vi=str(payload.get("summary_vi", "")),
            dimensions=payload.get("dimensions") or {},
            strengths=list(payload.get("strengths", [])),
            needs_work=list(payload.get("needs_work", [])),
            resolution=str(payload.get("resolution", "ended")),
            turn_count=int(payload.get("turn_count", session.current_turn)),
            compare=(
                SimulationCompareItem(
                    previous_session_id=str(compare["previous_session_id"]),
                    deltas=compare.get("deltas") or {},
                )
                if compare
                else None
            ),
            suggested_challenge=payload.get("suggested_challenge"),
            ai_generated=bool(payload.get("ai_generated")),
            provider=str(payload.get("provider", "unknown")),
            model=str(payload.get("model", "unknown")),
            prompt_version=str(payload.get("prompt_version", SIMULATION_VERSION)),
        )

    # -- helpers ----------------------------------------------------------------

    async def _require_session(self, user_id: str | None, session_id: str) -> SimulationSession:
        session = await self._sessions.get_for_user(user_id, session_id)
        if session is None:
            raise NotFoundError(f"Simulation session '{session_id}' not found")
        return session

    async def _recent_turns(self, session_id: str) -> list[str]:
        turns = await self._turns.list_by_session(session_id)
        return [
            f"[{'ai' if t.actor == 'ai' else 'user'}] {t.text}"
            for t in turns[-self._settings.ai_simulation_context_window :]
        ]

    async def _last_ai_turn_type(self, session_id: str) -> str:
        turns = await self._turns.list_by_session(session_id)
        for turn in reversed(turns):
            if turn.actor == "ai":
                return turn.turn_type
        return "opening"

    async def _last_ai_message(self, session_id: str) -> str | None:
        turns = await self._turns.list_by_session(session_id)
        for turn in reversed(turns):
            if turn.actor == "ai":
                return turn.text
        return None

    async def _get_challenge(self, user_id: str | None, challenge_id: str) -> Challenge | None:
        if self._challenges is None:
            return None
        try:
            return await self._challenges.get(user_id, challenge_id)
        except Exception:  # noqa: BLE001
            return None

    @staticmethod
    def _challenge_payload(challenge: Challenge, xp_reward: int) -> dict[str, Any]:
        return {
            "id": challenge.id,
            "challenge_type": challenge.challenge_type,
            "instruction_vi": challenge.instruction_vi,
            "source_text": challenge.source_text,
            "target_skill": challenge.target_skill,
            "difficulty": challenge.difficulty,
            "objective": challenge.objective,
            "required_expression": challenge.required_expression,
            "status": challenge.status,
            "xp_reward": xp_reward,
            "completed": challenge.completed_at is not None,
        }

    @staticmethod
    def _deterministic_summary(
        session: SimulationSession, averages: dict[str, int], scenario: WritingScenario
    ) -> str:
        overall = averages.get("overall")
        base = f"Phiên mô phỏng '{session.simulation_type}' đã kết thúc"
        if session.resolution == "success":
            base += " và mục tiêu đã đạt được"
        elif session.resolution == "natural_completion":
            base += " với cuộc trao đổi hoàn tất tự nhiên"
        elif session.resolution == "user_ended":
            base += " do bạn kết thúc sớm"
        else:
            base += " sau khi hết số lượt"
        if overall is not None:
            base += f" (điểm trung bình {overall}/100)."
        else:
            base += "."
        goal = averages.get("goal_progress")
        if goal is not None:
            base += f" Tiến độ đạt mục tiêu trung bình {goal}/100."
        return base

    @staticmethod
    def _state_block(state: dict[str, Any], stages: list[dict[str, str]]) -> str:
        lines = [
            f"- objective: {state.get('objective', '')}",
            f"- current_stage: {state.get('current_stage', '')}",
            f"- next_goal: {state.get('next_goal', '')}",
            f"- unresolved_items: {state.get('unresolved_items') or '[]'}",
            f"- completed_items: {state.get('completed_items') or '[]'}",
            f"- facts: {state.get('facts') or '[]'}",
            f"- decisions: {state.get('decisions') or '[]'}",
            f"- participant_positions: {state.get('participant_positions') or '{}'}",
            f"- emotional_context: {state.get('emotional_context', 'neutral')}",
            f"- constraints: {state.get('constraints') or '[]'}",
        ]
        return "\n".join(lines)

    @staticmethod
    def _sentence_block(sentence_scores: list[dict[str, Any]]) -> str:
        if not sentence_scores:
            return ""
        lines = []
        for s in sentence_scores:
            lines.append(
                f"- [{s['index']}] overall={s['overall_score']} "
                f"semantic={s['semantic_score']} grammar={s['grammar_score']} "
                f"vocabulary={s['vocabulary_score']} naturalness={s['naturalness_score']} "
                f"issues={s['issues']}"
            )
        return "\n".join(lines)

    @staticmethod
    def _stage_meta(
        stage: str,
        provider: str | None,
        model: str | None,
        prompt_version: str,
        started: datetime,
    ) -> dict[str, Any]:
        return {
            "stage": stage,
            "provider": provider or "fallback",
            "model": model or "deterministic",
            "prompt_version": prompt_version,
            "timestamp": started.isoformat(),
        }


def _attr(obj: Any, name: str, default: Any = None) -> Any:
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(name, default)
    return getattr(obj, name, default)
