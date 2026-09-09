"""Real-World Writing Mission Service (Phase 20).

Orchestrates:
- Dynamic mission generation across 4 real-world categories and 3 prompt modes.
- Implicit learner weakness integration from Writing Intelligence.
- Unified persistence in WritingScenarioRepository (zero duplicated infrastructure).
- 10-dimensional evaluation pipeline, checklist verification & native model rewrite.
- Seamless transition to interactive multi-turn simulation sessions.
- Feedback loop to update WritingWeakness mastery evidence.
"""

from __future__ import annotations

from datetime import datetime, timezone
import logging
import random
from typing import Any

from app.core.config import Settings, get_settings
from app.core.errors import NotFoundError, ScenarioGenerationError
from app.domain.real_world_missions import (
    CATEGORY_LABELS,
    EVALUATION_DIMENSION_META,
    EVALUATION_DIMENSIONS,
    MISSION_ACTIONS,
    MISSION_CATEGORIES,
    PROMPT_MODE_INFO,
    PROMPT_MODES,
    recommend_prompt_mode_for_jlpt,
)
from app.models import (
    LearnerProfile,
    SimulationSession,
    SimulationTurn,
    WritingScenario,
)
from app.prompts.common import REAL_WORLD_MISSION_VERSION
from app.prompts.real_world_mission_evaluation import (
    build_mission_evaluation_prompt,
)
from app.prompts.real_world_mission_generation import (
    build_mission_generator_prompt,
    real_world_mission_generator_prompt_version,
)
from app.repositories import (
    LearnerMemoryRepository,
    LearnerProfileRepository,
    SimulationSessionRepository,
    SimulationTurnRepository,
    WritingScenarioRepository,
)
from app.repositories.writing_intelligence import WritingWeaknessRepository
from app.schemas.real_world_mission import (
    MissionEvaluationRequest,
    MissionEvaluationResponse,
    MissionTaxonomyAction,
    MissionTaxonomyCategory,
    MissionTaxonomyDimension,
    MissionTaxonomyPromptMode,
    MissionTaxonomyResponse,
    RealWorldMissionGenerateRequest,
    RealWorldMissionResponse,
    TransitionToSimulationRequest,
    TransitionToSimulationResponse,
)
from app.schemas.real_world_mission_ai import (
    MissionEvaluationAIResult,
    RealWorldMissionAIDraft,
)
from app.services.ai_service import AIService

logger = logging.getLogger("app.missions")


class RealWorldMissionService:
    """Core domain service for Real-World Writing Missions."""

    def __init__(
        self,
        ai_service: AIService,
        scenario_repository: WritingScenarioRepository,
        weakness_repository: WritingWeaknessRepository | None = None,
        profile_repository: LearnerProfileRepository | None = None,
        memory_repository: LearnerMemoryRepository | None = None,
        session_repository: SimulationSessionRepository | None = None,
        turn_repository: SimulationTurnRepository | None = None,
        settings: Settings | None = None,
    ) -> None:
        self._ai = ai_service
        self._scenarios = scenario_repository
        self._weaknesses = weakness_repository
        self._profiles = profile_repository
        self._memories = memory_repository
        self._sessions = session_repository
        self._turns = turn_repository
        self._settings = settings or get_settings()

    def _mission_task(self) -> tuple[str | None, str | None]:
        provider = (
            self._settings.ai_scenario_provider
            or self._settings.ai_learning_provider
            or self._settings.ai_default_provider
            or None
        )
        model = (
            self._settings.ai_scenario_model
            or self._settings.ai_learning_model
            or None
        )
        return provider, model

    def _evaluation_task(self) -> tuple[str | None, str | None]:
        provider = (
            self._settings.ai_exercise_evaluation_provider
            or self._settings.ai_scenario_provider
            or self._settings.ai_default_provider
            or None
        )
        model = (
            self._settings.ai_exercise_evaluation_model
            or self._settings.ai_scenario_model
            or None
        )
        return provider, model

    # -- 1. Taxonomy ----------------------------------------------------------

    def get_taxonomy(self) -> MissionTaxonomyResponse:
        """Returns categories, actions, prompt modes and 10-dimension evaluation definitions."""
        categories = [
            MissionTaxonomyCategory(
                id=cat_id,
                label_vi=CATEGORY_LABELS[cat_id]["vi"],
                label_ja=CATEGORY_LABELS[cat_id]["ja"],
                icon=CATEGORY_LABELS[cat_id]["icon"],
                description=CATEGORY_LABELS[cat_id]["description"],
                action_count=len([a for a in MISSION_ACTIONS.values() if a.category == cat_id]),
            )
            for cat_id in MISSION_CATEGORIES
        ]

        actions = [
            MissionTaxonomyAction(
                action_type=act.action_type,
                category=act.category,
                label_vi=act.label_vi,
                label_ja=act.label_ja,
                default_register=act.default_register,
                recommended_jlpt=list(act.recommended_jlpt),
                default_medium=act.default_medium,
                typical_role_vi=act.typical_role_vi,
                typical_recipient_vi=act.typical_recipient_vi,
                communicative_purpose_vi=act.communicative_purpose_vi,
            )
            for act in MISSION_ACTIONS.values()
        ]

        prompt_modes = [
            MissionTaxonomyPromptMode(
                mode=mode,
                mode_code=PROMPT_MODE_INFO[mode]["mode_code"],
                label_vi=PROMPT_MODE_INFO[mode]["label_vi"],
                description_vi=PROMPT_MODE_INFO[mode]["description_vi"],
                recommended_level=PROMPT_MODE_INFO[mode]["recommended_level"],
            )
            for mode in PROMPT_MODES
        ]

        evaluation_dimensions = [
            MissionTaxonomyDimension(
                key=dim,
                label_vi=EVALUATION_DIMENSION_META[dim]["label_vi"],
                label_ja=EVALUATION_DIMENSION_META[dim]["label_ja"],
                description_vi=EVALUATION_DIMENSION_META[dim]["description_vi"],
                weight=float(EVALUATION_DIMENSION_META[dim]["weight"]),
            )
            for dim in EVALUATION_DIMENSIONS
        ]

        return MissionTaxonomyResponse(
            categories=categories,
            actions=actions,
            prompt_modes=prompt_modes,
            evaluation_dimensions=evaluation_dimensions,
        )

    # -- 2. Generate Real-World Mission ---------------------------------------

    async def generate_mission(
        self,
        user_id: str | None,
        request: RealWorldMissionGenerateRequest,
    ) -> RealWorldMissionResponse:
        """Generates a practical, goal-oriented writing mission grounded in learner context."""
        provider, model = self._mission_task()
        if request.provider:
            provider = request.provider
        if request.model:
            model = request.model

        # 1. Resolve learner profile, JLPT and weakness context
        profile: LearnerProfile | None = None
        if self._profiles:
            profile = await self._profiles.get_for_user(user_id)

        jlpt_level = request.jlpt_level or (profile.target_jlpt if profile and profile.target_jlpt else "N3")
        difficulty = request.difficulty or (profile.current_ability if profile and profile.current_ability else 5)
        difficulty = max(1, min(int(difficulty), 10))

        # Resolve category
        category = request.category
        if not category or category == "random" or category not in MISSION_CATEGORIES:
            category = random.choice(MISSION_CATEGORIES)

        # Resolve action
        available_actions = [k for k, a in MISSION_ACTIONS.items() if a.category == category]
        action_type = request.action_type
        if not action_type or action_type == "random" or action_type not in MISSION_ACTIONS:
            # Prefer actions matching jlpt_level
            matching_actions = [
                k for k in available_actions
                if jlpt_level in MISSION_ACTIONS[k].recommended_jlpt
            ]
            action_type = random.choice(matching_actions if matching_actions else available_actions)

        action_def = MISSION_ACTIONS.get(action_type)
        register = request.register or (action_def.default_register if action_def else "polite")

        # Resolve prompt mode
        prompt_mode = request.prompt_mode
        if not prompt_mode or prompt_mode == "random" or prompt_mode not in PROMPT_MODES:
            prompt_mode = recommend_prompt_mode_for_jlpt(jlpt_level)

        # Resolve active weakness to target
        target_weakness_dict: dict[str, Any] | None = None
        target_weakness_id: str | None = request.target_weakness_id
        if not target_weakness_id and self._weaknesses:
            active_weaknesses = await self._weaknesses.list_by_user(user_id, limit=5)
            # Pick a non-mastered weakness
            unmastered = [w for w in active_weaknesses if w.status not in ("mastered", "archived")]
            if unmastered:
                target = unmastered[0]
                target_weakness_id = target.id
                target_weakness_dict = {
                    "id": target.id,
                    "category": target.category,
                    "subtype": target.subtype,
                    "description": target.description,
                    "related_expressions": target.related_expressions or [],
                }
        elif target_weakness_id and self._weaknesses:
            target = await self._weaknesses.get(target_weakness_id)
            if target:
                target_weakness_dict = {
                    "id": target.id,
                    "category": target.category,
                    "subtype": target.subtype,
                    "description": target.description,
                    "related_expressions": target.related_expressions or [],
                }

        # Memory block
        memory_block = ""
        if self._memories and user_id:
            mems = await self._memories.list_for_user(user_id, limit=3)
            memory_block = "\n".join(f"- {m.memory_text}" for m in mems)

        profile_summary = f"Goal: {profile.goal if profile and profile.goal else 'General'}. Native: {profile.native_language if profile else 'vi'}."

        system_prompt, user_prompt = build_mission_generator_prompt(
            category=category,
            action_type=action_type,
            prompt_mode=prompt_mode,
            jlpt_level=jlpt_level,
            difficulty=difficulty,
            register=register,
            role=request.role,
            recipient=request.recipient,
            target_weakness=target_weakness_dict,
            learner_profile_summary=profile_summary,
            memory_block=memory_block,
        )

        draft, result = await self._ai.generate_structured(
            user_prompt,
            RealWorldMissionAIDraft,
            system=system_prompt,
            provider=provider,
            model=model,
            max_tokens=self._settings.ai_scenario_max_tokens or 2048,
        )
        assert isinstance(draft, RealWorldMissionAIDraft)

        # 2. Persist in WritingScenario table
        scenario_metadata = {
            "mission_category": category,
            "mission_action_type": action_type,
            "prompt_mode": prompt_mode,
            "role": draft.role,
            "recipient": draft.recipient,
            "situation_ja": draft.situation_ja,
            "context_ja": draft.context_ja,
            "incoming_message": draft.incoming_message,
            "optional_vocabulary": [v.model_dump(mode="json") for v in draft.optional_vocabulary],
            "success_conditions": draft.success_conditions,
            "pedagogical_target_summary": draft.pedagogical_target_summary,
            "target_weakness_id": target_weakness_id,
            "generation_version": REAL_WORLD_MISSION_VERSION,
            "prompt_version": real_world_mission_generator_prompt_version(),
            "provider": result.provider,
            "model": result.model,
        }

        genre_map = {
            "business_email": "business_email",
            "progress_update": "status_report",
            "reporting_a_problem": "incident_report",
            "internal_message": "business_chat",
        }
        mapped_genre = genre_map.get(action_type, "business_email" if category == "work" else "casual_message")
        medium_val = action_def.default_medium if action_def else "email"

        scenario = WritingScenario(
            user_id=user_id,
            genre=mapped_genre,
            medium=medium_val,
            audience="coworker" if category == "work" else "friend",
            relationship=draft.relationship[:24],
            purpose=draft.objective[:24] if draft.objective else "request",
            register=draft.target_register,
            tone="professional" if category == "work" else "friendly",
            target_length="paragraph",
            jlpt_level=jlpt_level,
            topic=f"{action_def.label_vi if action_def else action_type} ({category})",
            situation_vi=draft.situation_vi,
            context_vi=draft.context_vi,
            required_points=[p.model_dump(mode="json") for p in draft.required_points],
            optional_points=[v.word for v in draft.optional_vocabulary[:3]],
            forbidden_patterns=draft.constraints[:4],
            difficulty_metadata={"category": category, "difficulty": difficulty},
            difficulty=difficulty,
            generation_metadata=scenario_metadata,
            status="generated",
        )

        persisted = await self._scenarios.add(scenario)
        logger.info(
            "real_world_mission_generated id=%s category=%s action=%s mode=%s jlpt=%s",
            persisted.id,
            category,
            action_type,
            prompt_mode,
            jlpt_level,
        )

        return RealWorldMissionResponse(
            id=persisted.id,
            category=category,
            action_type=action_type,
            prompt_mode=prompt_mode,
            role=draft.role,
            recipient=draft.recipient,
            relationship=draft.relationship,
            objective=draft.objective,
            situation_vi=draft.situation_vi,
            context_vi=draft.context_vi,
            situation_ja=draft.situation_ja,
            context_ja=draft.context_ja,
            incoming_message=draft.incoming_message,
            constraints=draft.constraints,
            required_points=draft.required_points,
            target_register=draft.target_register,
            optional_vocabulary=draft.optional_vocabulary,
            success_conditions=draft.success_conditions,
            difficulty=difficulty,
            jlpt_level=jlpt_level,
            pedagogical_target_summary=draft.pedagogical_target_summary,
            created_at=persisted.created_at,
        )

    # -- 3. Evaluate Real-World Mission (10 Dimensions) ------------------------

    async def evaluate_mission(
        self,
        user_id: str | None,
        request: MissionEvaluationRequest,
    ) -> MissionEvaluationResponse:
        """Evaluates learner Japanese text across 10 communicative & linguistic dimensions."""
        provider, model = self._evaluation_task()
        if request.provider:
            provider = request.provider
        if request.model:
            model = request.model

        scenario: WritingScenario | None = None
        mission_dict: dict[str, Any] = request.mission_context or {}

        if request.scenario_id:
            scenario = await self._scenarios.get_for_user(user_id, request.scenario_id)
            if scenario is None:
                raise NotFoundError(f"Mission/Scenario '{request.scenario_id}' not found")
            gen_meta = scenario.generation_metadata or {}
            mission_dict = {
                "role": gen_meta.get("role", "Người gửi"),
                "recipient": gen_meta.get("recipient", "Người nhận"),
                "relationship": scenario.relationship,
                "objective": scenario.purpose or scenario.situation_vi,
                "target_register": scenario.register,
                "jlpt_level": scenario.jlpt_level,
                "situation_vi": scenario.situation_vi,
                "context_vi": scenario.context_vi,
                "situation_ja": gen_meta.get("situation_ja"),
                "context_ja": gen_meta.get("context_ja"),
                "incoming_message": gen_meta.get("incoming_message"),
                "required_points": scenario.required_points,
                "constraints": scenario.forbidden_patterns,
                "target_weakness_id": gen_meta.get("target_weakness_id"),
            }

        system_prompt, user_prompt = build_mission_evaluation_prompt(
            mission=mission_dict,
            learner_text=request.text,
        )

        ai_eval, _ = await self._ai.generate_structured(
            user_prompt,
            MissionEvaluationAIResult,
            system=system_prompt,
            provider=provider,
            model=model,
            max_tokens=self._settings.ai_exercise_evaluation_max_tokens or 2048,
        )
        assert isinstance(ai_eval, MissionEvaluationAIResult)

        # Update weakness mastery if linked
        weakness_updated = False
        weakness_summary = None
        target_weakness_id = mission_dict.get("target_weakness_id")
        if target_weakness_id and self._weaknesses:
            weakness = await self._weaknesses.get(target_weakness_id)
            if weakness:
                weakness.exposure_count = (weakness.exposure_count or 0) + 1
                if ai_eval.passed:
                    weakness.corrected_count = (weakness.corrected_count or 0) + 1
                    weakness.mastery_score = min(1.0, (weakness.mastery_score or 0.0) + 0.1)
                    if weakness.mastery_score >= 0.8:
                        weakness.status = "mastered"
                    elif weakness.mastery_score >= 0.5:
                        weakness.status = "improving"
                else:
                    weakness.recurrence_count = (weakness.recurrence_count or 0) + 1
                    weakness.mastery_score = max(0.0, (weakness.mastery_score or 0.0) - 0.05)
                weakness.last_seen_at = datetime.now(timezone.utc)
                await self._weaknesses.update(weakness)
                weakness_updated = True
                weakness_summary = f"Chỉ số thành thạo cho điểm yếu '{weakness.description}' đã được cập nhật ({round(weakness.mastery_score * 100)}%)."

        return MissionEvaluationResponse(
            overall_score=ai_eval.overall_score,
            passed=ai_eval.passed,
            dimensions=ai_eval.dimensions,
            required_points=ai_eval.required_points,
            constraints_respected=ai_eval.constraints_respected,
            constraints_feedback=ai_eval.constraints_feedback,
            strengths_vi=ai_eval.strengths_vi,
            improvements_vi=ai_eval.improvements_vi,
            native_model_rewrite=ai_eval.native_model_rewrite,
            rewrite_nuances_vi=ai_eval.rewrite_nuances_vi,
            cultural_discourse_tip_vi=ai_eval.cultural_discourse_tip_vi,
            weakness_mastery_updated=weakness_updated,
            weakness_feedback_summary=weakness_summary,
            scenario_id=scenario.id if scenario else None,
        )

    # -- 4. Transition to Interactive Simulation ------------------------------

    async def transition_to_simulation(
        self,
        user_id: str | None,
        request: TransitionToSimulationRequest,
    ) -> TransitionToSimulationResponse:
        """Seamlessly transitions a completed or drafted mission into an interactive multi-turn simulation."""
        if not self._sessions or not self._turns:
            raise ScenarioGenerationError("Simulation repositories not configured")

        scenario = await self._scenarios.get_for_user(user_id, request.scenario_id)
        if scenario is None:
            raise NotFoundError(f"Scenario '{request.scenario_id}' not found")

        gen_meta = scenario.generation_metadata or {}
        recipient_name = gen_meta.get("recipient", "Partner")
        role_name = gen_meta.get("role", "Learner")

        persona = {
            "name": recipient_name,
            "role": recipient_name,
            "relationship": scenario.relationship,
            "tone": scenario.tone,
            "language_style": scenario.register,
        }

        # Create session
        session = SimulationSession(
            user_id=user_id,
            scenario_id=scenario.id,
            simulation_type=scenario.genre,
            mode="guided",
            register=scenario.register,
            jlpt_level=scenario.jlpt_level,
            difficulty=scenario.difficulty,
            pressure_condition="normal",
            status="active",
            max_turns=6,
            current_turn=0,
            objective_vi=scenario.purpose or scenario.situation_vi,
            persona=persona,
            state={"goal_progress": 20, "stage": "in_progress"},
            meta={"transitioned_from_mission": True},
        )
        saved_session = await self._sessions.add(session)

        turns_out: list[dict[str, Any]] = []

        # Turn 1: If user provided text, seed as user turn
        user_text = (request.initial_user_text or "").strip()
        if user_text:
            turn1 = SimulationTurn(
                session_id=saved_session.id,
                turn_number=1,
                actor="user",
                turn_type="message",
                text=user_text,
                mode="guided",
                status="evaluated",
            )
            saved_turn1 = await self._turns.add(turn1)
            saved_session.current_turn = 1
            turns_out.append({
                "id": saved_turn1.id,
                "turn_number": 1,
                "actor": "user",
                "text": user_text,
            })

            # Turn 2: AI Persona response acknowledging the message
            provider, model = self._mission_task()
            if request.provider:
                provider = request.provider
            if request.model:
                model = request.model

            ai_reply_prompt = (
                f"You are roleplaying as {recipient_name} ({persona['relationship']}) in Japan.\n"
                f"Scenario: {scenario.situation_vi}\n"
                f"The learner ({role_name}) just sent you the following Japanese message:\n"
                f'"""\n{user_text}\n"""\n'
                f"Reply in natural Japanese as {recipient_name} appropriately in {scenario.register} register.\n"
                "Keep the reply concise (2-4 sentences), acknowledging what was said and asking a natural follow-up question or confirming agreement."
            )
            ai_reply_res = await self._ai.generate_text(
                ai_reply_prompt,
                provider=provider,
                model=model,
                max_tokens=300,
            )
            persona_text = ai_reply_res.text.strip() or "ご連絡ありがとうございます。承知いたしました。"

            turn2 = SimulationTurn(
                session_id=saved_session.id,
                turn_number=2,
                actor="ai",
                turn_type="response",
                text=persona_text,
                mode="guided",
                status="completed",
            )
            saved_turn2 = await self._turns.add(turn2)
            saved_session.current_turn = 2
            turns_out.append({
                "id": saved_turn2.id,
                "turn_number": 2,
                "actor": "ai",
                "text": persona_text,
            })

            await self._sessions.update(saved_session)

        return TransitionToSimulationResponse(
            session_id=saved_session.id,
            scenario_id=scenario.id,
            status=saved_session.status,
            current_turn=saved_session.current_turn,
            persona=persona,
            turns=turns_out,
        )
