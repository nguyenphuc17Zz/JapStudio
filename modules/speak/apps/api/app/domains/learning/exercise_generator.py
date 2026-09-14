import json
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.domains.ai.contracts import AIMessage, AIMessageRole, AIRequest, AITask, ResponseFormat, ResponseFormatType
from app.domains.ai.router import AIRouter
from app.domains.learning.contracts import (
    DifficultyLevel,
    ExerciseType,
    LearnerLearningState,
    PriorityScore,
    ScaffoldingLevel,
)
from app.domains.learning.exercise_validator import ExerciseValidator
from app.domains.learning.exercise_variety_policy import ExerciseVarietyPolicy
from app.domains.learning.models import Exercise
from app.domains.learning.prompts import LearningPrompts
from app.domains.learning.templates.exercise_templates import get_template_for_type


class ExerciseGenerator:
    """Orchestrates AI-assisted and template-fallback generation of Japanese speaking exercises."""

    GENERATOR_VERSION = "1.0.0"

    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai_router = AIRouter(db)

    async def generate_exercise(
        self,
        user_id: str,
        priority: PriorityScore,
        state: LearnerLearningState,
        recent_signatures: list[str] | None = None,
        recent_topics: list[str] | None = None,
    ) -> Exercise:
        """
        Generates a validated, personalized exercise targeting a specific priority weakness.
        Uses Templates + AI Personalization + Safety Validation + Fallback guarantee.
        """
        ex_type_str = priority.recommended_exercise_type.value
        item_type_str = priority.item_type.value
        template_info = get_template_for_type(ex_type_str, item_type_str)

        # Mode 7 Aizuchi: dedicated multi-turn NPC generation (AI dynamic + pool fallback, cached in DB)
        if ex_type_str.startswith(("aizuchi", "warikomi")):
            return await self._generate_aizuchi_exercise(user_id, priority, state, template_info, recent_signatures)

        # Mode 8 Builder: clause-chaining assembly/expansion/repair (AI dynamic + pool fallback, cached in DB)
        if ex_type_str.startswith("sentence_"):
            return await self._generate_builder_exercise(user_id, priority, state, template_info, recent_signatures)

        # Mode 9 Interpret: VI-JA drills (AI dynamic + pool fallback, cached in DB)
        if ex_type_str.startswith("interpret_"):
            return await self._generate_interpret_exercise(user_id, priority, state, template_info, recent_signatures)

        # 1. Attempt AI Personalization (pass reflex/keigo/pitch/situational overrides via extra_metadata if present)
        reflex_overrides = None
        keigo_overrides = None
        pitch_overrides = None
        situational_overrides = None
        if priority.recommended_exercise_type.value.startswith("reflex"):
            reflex_overrides = getattr(priority, "metadata", None) or {}
        if priority.recommended_exercise_type.value.startswith("keigo"):
            keigo_overrides = getattr(priority, "metadata", None) or {}
        if priority.recommended_exercise_type.value.startswith("pitch") or priority.recommended_exercise_type.value in ("mora_length", "vowel_devoicing", "pitch_contour", "pitch_recognition"):
            pitch_overrides = getattr(priority, "metadata", None) or {}
        if priority.recommended_exercise_type.value.startswith("situational"):
            situational_overrides = getattr(priority, "metadata", None) or {}
        ai_data = await self._generate_with_ai(user_id, priority, state, template_info, recent_topics, reflex_overrides, keigo_overrides, pitch_overrides, situational_overrides)

        # 2. Validate AI result
        is_valid = False
        if ai_data:
            is_valid, issues = ExerciseValidator.validate_exercise_data(ai_data)
            if not is_valid:
                logger.warning(f"[ExerciseGenerator] AI generated exercise failed validation: {issues}. Using fallback.")

        # 3. If AI failed or invalid, synthesize from Template fallback
        if not is_valid or not ai_data:
            ai_data = self._build_template_fallback(priority, template_info)

        # 4. Compute signature for anti-repetition
        sig = ExerciseVarietyPolicy.compute_exercise_signature(
            exercise_type=ex_type_str,
            target_patterns=ai_data.get("target_patterns", [priority.key]),
            difficulty=priority.difficulty.value,
            scenario_topic=ai_data.get("scenario"),
        )

        # 5. Determine scaffolding level
        scaffold_level_str = ScaffoldingLevel.NONE.value
        scaffold_hint = ai_data.get("scaffold_hint")
        if scaffold_hint and priority.difficulty == DifficultyLevel.EASY:
            scaffold_level_str = ScaffoldingLevel.KEYWORD_HINT.value

        # Preserve reflex/keigo/pitch/situational config if provided by template or AI
        extra_meta: dict[str, Any] = {"priority_score": priority.priority_score, "item_type": item_type_str}
        if ex_type_str.startswith("reflex"):
            _rc = {}
            if ai_data.get("reflex_config"):
                _rc.update(ai_data["reflex_config"])
            if reflex_overrides:
                _rc.update({k: v for k, v in reflex_overrides.items() if k in ("verb", "conjugation_target", "timer_limit_ms", "pressure_level", "prompt_mode", "subtitle_mode")})
            if ex_type_str == ExerciseType.REFLEX_CONJUGATION.value and not _rc.get("verb"):
                _rc.setdefault("verb", ai_data.get("verb") or priority.title.split()[0] if priority.title else "")
            if _rc:
                extra_meta["reflex_config"] = _rc
        if ex_type_str.startswith("keigo"):
            _kc = {}
            if ai_data.get("keigo_config"):
                _kc.update(ai_data["keigo_config"])
            if keigo_overrides:
                _kc.update({k: v for k, v in keigo_overrides.items() if k in ("timer_limit_ms", "pressure_level", "social_context", "target_register", "source_register")})
            if ai_data.get("timer_limit_ms"):
                _kc.setdefault("timer_limit_ms", ai_data["timer_limit_ms"])
            if _kc:
                extra_meta["keigo_config"] = _kc
        if ex_type_str.startswith("pitch") or ex_type_str in ("mora_length", "vowel_devoicing", "pitch_contour", "pitch_recognition"):
            _pc = {}
            if ai_data.get("pitch_config"):
                _pc.update(ai_data["pitch_config"])
            if pitch_overrides:
                _pc.update({k: v for k, v in pitch_overrides.items() if k in ("timer_limit_ms", "pressure_level", "pitch_pattern", "reading", "mora_count")})
            if ai_data.get("timer_limit_ms"):
                _pc.setdefault("timer_limit_ms", ai_data["timer_limit_ms"])
            if _pc:
                extra_meta["pitch_config"] = _pc
        if ex_type_str.startswith("situational"):
            _sc = {}
            if ai_data.get("situational_config"):
                _sc.update(ai_data["situational_config"])
            if situational_overrides:
                _sc.update({k: v for k, v in situational_overrides.items() if k in ("timer_limit_ms", "pressure_level", "location", "goals", "constraints", "seed", "mode", "duration_minutes")})
            if ai_data.get("timer_limit_ms"):
                _sc.setdefault("timer_limit_ms", ai_data["timer_limit_ms"])
            if _sc:
                extra_meta["situational_config"] = _sc
        if ex_type_str.startswith(("aizuchi", "warikomi")):
            _ac = {}
            if ai_data.get("aizuchi_config"):
                _ac.update(ai_data["aizuchi_config"])
            if ai_data.get("npc_turns"):
                _ac.setdefault("npc_turns", ai_data["npc_turns"])
            for k in ("window_ms", "window_profile", "relation", "speed", "expected_types"):
                if ai_data.get(k) is not None:
                    _ac.setdefault(k, ai_data[k])
            if _ac:
                extra_meta["aizuchi_config"] = _ac
        if ex_type_str.startswith("sentence_"):
            _bc = {}
            if ai_data.get("builder_config"):
                _bc.update(ai_data["builder_config"])
            for k in ("focus_skill", "relation", "scaffold", "blind", "timer_limit_ms", "keywords", "starter", "source_sentence", "situation_vi", "expand_requirement", "connectors"):
                if ai_data.get(k) is not None:
                    _bc.setdefault(k, ai_data[k])
            if _bc:
                extra_meta["builder_config"] = _bc
        if ex_type_str.startswith("interpret_"):
            _ic = {}
            if ai_data.get("interpret_config"):
                _ic.update(ai_data["interpret_config"])
            for k in ("prompt_vi", "expected_ja_keywords", "reference_ja", "situation_vi", "starter_ja", "topic", "relation", "scaffold", "blind", "timer_limit_ms"):
                if ai_data.get(k) is not None:
                    _ic.setdefault(k, ai_data[k])
            if _ic:
                extra_meta["interpret_config"] = _ic

        exercise = Exercise(
            user_id=user_id,
            exercise_type=ex_type_str,
            status="not_started",
            title=ai_data["title"],
            objective=ai_data["objective"],
            scenario=ai_data.get("scenario"),
            instructions=ai_data["instructions"],
            constraints=ai_data.get("constraints", []),
            target_patterns=ai_data.get("target_patterns", [priority.key]),
            learning_item_keys=[priority.key],
            success_criteria=ai_data.get("success_criteria", ["Sử dụng đúng cấu trúc mục tiêu ít nhất 1 lần trong câu nói tự nhiên."]),
            acceptable_variants=ai_data.get("acceptable_variants", []),
            difficulty=priority.difficulty.value,
            scaffold_level=scaffold_level_str,
            scaffold_hint=scaffold_hint,
            estimated_minutes=ai_data.get("estimated_minutes", template_info["default_estimated_minutes"]),
            template_version=template_info.get("template_version", "v1"),
            generator_version=self.GENERATOR_VERSION,
            prompt_version=LearningPrompts.INTERPRET_GEN_PROMPT_VERSION if ex_type_str.startswith("interpret_") else LearningPrompts.BUILDER_GEN_PROMPT_VERSION if ex_type_str.startswith("sentence_") else LearningPrompts.AIZUCHI_GEN_PROMPT_VERSION if ex_type_str.startswith(("aizuchi", "warikomi")) else LearningPrompts.SITUATIONAL_GEN_PROMPT_VERSION if ex_type_str.startswith("situational") else LearningPrompts.PITCH_GEN_PROMPT_VERSION if ex_type_str.startswith("pitch") or ex_type_str in ("mora_length", "vowel_devoicing", "pitch_contour", "pitch_recognition") else LearningPrompts.KEIGO_GEN_PROMPT_VERSION if ex_type_str.startswith("keigo") else LearningPrompts.REFLEX_GEN_PROMPT_VERSION if ex_type_str.startswith("reflex") else LearningPrompts.GEN_PROMPT_VERSION,
            provider=ai_data.get("_provider"),
            model=ai_data.get("_model"),
            exercise_signature=sig,
            extra_metadata=extra_meta,
        )

        self.db.add(exercise)
        await self.db.flush()
        logger.info(f"[ExerciseGenerator] Created exercise '{exercise.title}' (ID: {exercise.id}) for user '{user_id}'")
        return exercise

    async def _generate_aizuchi_exercise(
        self,
        user_id: str,
        priority: PriorityScore,
        state: LearnerLearningState,
        template_info: dict[str, Any],
        recent_signatures: list[str] | None,
    ) -> Exercise:
        """Mode 7 path: multi-turn NPC content via AIAizuchiGenerator (AI dynamic + pool fallback).

        The full NPC script is persisted in extra_metadata.aizuchi_config, so replays
        and reviews cost zero LLM tokens (DB cache hit).
        """
        from app.domains.aizuchi.dynamic_generator import AIAizuchiGenerator

        ex_type_str = priority.recommended_exercise_type.value
        meta = getattr(priority, "metadata", None) or {}
        relation = meta.get("relation", "casual_friend")
        window_profile = meta.get("window_profile", meta.get("pressure_level", "normal"))
        window_ms = meta.get("window_ms", meta.get("timer_limit_ms"))
        difficulty = priority.difficulty.value if hasattr(priority.difficulty, "value") else str(priority.difficulty)
        speed = float(meta.get("speed", 1.0))

        ai_gen = AIAizuchiGenerator(self.db)
        data = await ai_gen.generate_dynamic_exercise(
            sub_mode=ex_type_str,
            relation=relation,
            window_profile=window_profile,
            window_ms=window_ms,
            difficulty=difficulty,
            speed=speed,
            num_turns=3,
            user_id=user_id,
        )

        sig = ExerciseVarietyPolicy.compute_exercise_signature(
            exercise_type=ex_type_str,
            target_patterns=[data.get("title", ex_type_str)],
            difficulty=difficulty,
            scenario_topic=data.get("scenario"),
        )
        extra_meta: dict[str, Any] = {
            "priority_score": priority.priority_score,
            "item_type": priority.item_type.value,
            "generation_source": data.get("generation_source", "ai"),
            "is_fallback": data.get("is_fallback", False),
            "fallback_reason": data.get("fallback_reason"),
            "aizuchi_config": {
                "npc_turns": data.get("npc_turns", []),
                "expected_types": data.get("expected_types", ["continuer"]),
                "sample_responses": data.get("sample_responses", []),
                "window_ms": data.get("window_ms", 600),
                "window_profile": data.get("window_profile", window_profile),
                "relation": data.get("relation", relation),
                "speed": data.get("speed", speed),
                "generation_source": data.get("generation_source", "ai"),
                "is_fallback": data.get("is_fallback", False),
                "fallback_reason": data.get("fallback_reason"),
            },
        }
        exercise = Exercise(
            user_id=user_id,
            exercise_type=ex_type_str,
            status="not_started",
            title=data.get("title", "相づちリアクション"),
            objective=data.get("objective", "Chêm aizuchi đúng lúc, đúng loại."),
            scenario=data.get("scenario"),
            instructions=data.get("instructions", "Nghe NPC nói. Khi đèn xanh bật, chêm ngay 1-2 từ."),
            constraints=["Chêm trong cửa sổ pause, không đè lên lời NPC."],
            target_patterns=[priority.key],
            learning_item_keys=[priority.key],
            success_criteria=["Chêm đúng timing và đúng loại aizuchi."],
            acceptable_variants=[],
            difficulty=difficulty,
            scaffold_level=ScaffoldingLevel.NONE.value,
            scaffold_hint=None,
            estimated_minutes=5,
            template_version=template_info.get("template_version", "v1"),
            generator_version=self.GENERATOR_VERSION,
            prompt_version=LearningPrompts.AIZUCHI_GEN_PROMPT_VERSION,
            provider="template_fallback",
            model="deterministic_v1",
            exercise_signature=sig,
            extra_metadata=extra_meta,
        )
        self.db.add(exercise)
        await self.db.flush()
        logger.info(f"[ExerciseGenerator] Created aizuchi exercise '{exercise.title}' (ID: {exercise.id}) for user '{user_id}'")
        return exercise

    async def _generate_builder_exercise(
        self,
        user_id: str,
        priority: PriorityScore,
        state: LearnerLearningState,
        template_info: dict[str, Any],
        recent_signatures: list[str] | None,
    ) -> Exercise:
        """Mode 8 path: clause-chaining drills via AIBuilderGenerator (AI dynamic + pool fallback).

        Full drill content is persisted in extra_metadata.builder_config, so replays
        and reviews cost zero LLM tokens (DB cache hit).
        """
        from app.domains.builder.dynamic_generator import AIBuilderGenerator

        ex_type_str = priority.recommended_exercise_type.value
        meta = getattr(priority, "metadata", None) or {}
        focus_skill = meta.get("focus_skill", "te_chain")
        relation = meta.get("relation", "casual_friend")
        scaffold = meta.get("scaffold", "keyword_hint")
        timer_ms = meta.get("timer_limit_ms")
        difficulty = priority.difficulty.value if hasattr(priority.difficulty, "value") else str(priority.difficulty)

        ai_gen = AIBuilderGenerator(self.db)
        data = await ai_gen.generate_dynamic_exercise(
            sub_mode=ex_type_str,
            focus_skill=focus_skill,
            relation=relation,
            scaffold=scaffold,
            timer_limit_ms=timer_ms,
            difficulty=difficulty,
            user_id=user_id,
        )

        sig = ExerciseVarietyPolicy.compute_exercise_signature(
            exercise_type=ex_type_str,
            target_patterns=[data.get("title", ex_type_str)],
            difficulty=difficulty,
            scenario_topic=data.get("scenario"),
        )
        blind = bool(data.get("blind", scaffold == "none"))
        scaffold_level = ScaffoldingLevel.NONE.value if blind else (
            ScaffoldingLevel.KEYWORD_HINT.value if scaffold == "keyword_hint"
            else ScaffoldingLevel.SENTENCE_STARTER.value if scaffold == "sentence_starter"
            else ScaffoldingLevel.STRUCTURED_OPTIONS.value
        )
        extra_meta: dict[str, Any] = {
            "priority_score": priority.priority_score,
            "item_type": priority.item_type.value,
            "generation_source": data.get("generation_source", "ai"),
            "is_fallback": data.get("is_fallback", False),
            "fallback_reason": data.get("fallback_reason"),
            "builder_config": {
                "sub_mode": ex_type_str,
                "focus_skill": data.get("focus_skill", focus_skill),
                "relation": data.get("relation", relation),
                "scaffold": scaffold,
                "blind": blind,
                "timer_limit_ms": data.get("timer_limit_ms", 20000),
                "keywords": data.get("keywords", []),
                "starter": data.get("starter"),
                "source_sentence": data.get("source_sentence"),
                "situation_vi": data.get("situation_vi"),
                "expand_requirement": data.get("expand_requirement"),
                "connectors": data.get("connectors", []),
                "canonical": data.get("canonical"),
                "canonical_vi": data.get("canonical_vi"),
                "generation_source": data.get("generation_source", "ai"),
                "is_fallback": data.get("is_fallback", False),
                "fallback_reason": data.get("fallback_reason"),
            },
        }
        exercise = Exercise(
            user_id=user_id,
            exercise_type=ex_type_str,
            status="not_started",
            title=data.get("title", "文立てビルダー"),
            objective=data.get("objective", "Xây 1 câu dài tự nhiên."),
            scenario=data.get("scenario"),
            instructions=data.get("instructions", "Nói 1 câu dài tự nhiên bằng tiếng Nhật."),
            constraints=["Dùng hết từ khóa, nối mệnh đề mượt, đúng register."],
            target_patterns=[priority.key],
            learning_item_keys=[priority.key],
            success_criteria=["Câu dài, nối đúng focus skill, tự nhiên."],
            acceptable_variants=[],
            difficulty=difficulty,
            scaffold_level=scaffold_level,
            scaffold_hint=data.get("starter"),
            estimated_minutes=4,
            template_version=template_info.get("template_version", "v1"),
            generator_version=self.GENERATOR_VERSION,
            prompt_version=LearningPrompts.BUILDER_GEN_PROMPT_VERSION,
            provider="template_fallback",
            model="deterministic_v1",
            exercise_signature=sig,
            extra_metadata=extra_meta,
        )
        self.db.add(exercise)
        await self.db.flush()
        logger.info(f"[ExerciseGenerator] Created builder exercise '{exercise.title}' (ID: {exercise.id}) for user '{user_id}'")
        return exercise

    async def _generate_interpret_exercise(
        self,
        user_id: str,
        priority: PriorityScore,
        state: LearnerLearningState,
        template_info: dict[str, Any],
        recent_signatures: list[str] | None,
    ) -> Exercise:
        """Mode 9 path: VI-JA drills via AIInterpretGenerator (AI dynamic + pool fallback).

        Prompt + expected keywords + reference are persisted in
        extra_metadata.interpret_config, so replays and reviews cost zero tokens.
        """
        from app.domains.interpret.dynamic_generator import AIInterpretGenerator

        ex_type_str = priority.recommended_exercise_type.value
        meta = getattr(priority, "metadata", None) or {}
        relation = meta.get("relation", "casual_friend")
        scaffold = meta.get("scaffold", "keyword_hint")
        timer_ms = meta.get("timer_limit_ms")
        topic = meta.get("topic")
        difficulty = priority.difficulty.value if hasattr(priority.difficulty, "value") else str(priority.difficulty)

        ai_gen = AIInterpretGenerator(self.db)
        data = await ai_gen.generate_dynamic_exercise(
            sub_mode=ex_type_str, relation=relation, scaffold=scaffold,
            timer_limit_ms=timer_ms, difficulty=difficulty, topic=topic, user_id=user_id,
        )

        sig = ExerciseVarietyPolicy.compute_exercise_signature(
            exercise_type=ex_type_str,
            target_patterns=[data.get("title", ex_type_str)],
            difficulty=difficulty,
            scenario_topic=data.get("scenario"),
        )
        blind = bool(data.get("blind", scaffold == "none"))
        extra_meta: dict[str, Any] = {
            "priority_score": priority.priority_score,
            "item_type": priority.item_type.value,
            "generation_source": data.get("generation_source", "ai"),
            "is_fallback": data.get("is_fallback", False),
            "fallback_reason": data.get("fallback_reason"),
            "interpret_config": {
                "sub_mode": ex_type_str,
                "prompt_vi": data.get("prompt_vi"),
                "expected_ja_keywords": data.get("expected_ja_keywords", []),
                "reference_ja": data.get("reference_ja"),
                "situation_vi": data.get("situation_vi"),
                "starter_ja": data.get("starter_ja"),
                "topic": data.get("topic", topic),
                "relation": data.get("relation", relation),
                "scaffold": scaffold,
                "blind": blind,
                "timer_limit_ms": data.get("timer_limit_ms", 20000),
                "generation_source": data.get("generation_source", "ai"),
                "is_fallback": data.get("is_fallback", False),
                "fallback_reason": data.get("fallback_reason"),
            },
        }
        exercise = Exercise(
            user_id=user_id,
            exercise_type=ex_type_str,
            status="not_started",
            title=data.get("title", "越日通訳"),
            objective=data.get("objective", "Dịch Việt→Nhật giữ đủ ý, tự nhiên."),
            scenario=data.get("scenario"),
            instructions=data.get("instructions", "Hãy dịch sang tiếng Nhật."),
            constraints=["Giữ đủ ý chính, đúng SOV, đúng register."],
            target_patterns=[priority.key],
            learning_item_keys=[priority.key],
            success_criteria=["Đủ ý, đúng trật tự, tự nhiên."],
            acceptable_variants=[],
            difficulty=difficulty,
            scaffold_level=ScaffoldingLevel.NONE.value if blind else ScaffoldingLevel.KEYWORD_HINT.value,
            scaffold_hint=", ".join(data.get("expected_ja_keywords", [])) or None,
            estimated_minutes=4,
            template_version=template_info.get("template_version", "v1"),
            generator_version=self.GENERATOR_VERSION,
            prompt_version=LearningPrompts.INTERPRET_GEN_PROMPT_VERSION,
            provider="template_fallback",
            model="deterministic_v1",
            exercise_signature=sig,
            extra_metadata=extra_meta,
        )
        self.db.add(exercise)
        await self.db.flush()
        logger.info(f"[ExerciseGenerator] Created interpret exercise '{exercise.title}' (ID: {exercise.id}) for user '{user_id}'")
        return exercise

    async def _generate_with_ai(
        self,
        user_id: str,
        priority: PriorityScore,
        state: LearnerLearningState,
        template_info: dict[str, Any],
        recent_topics: list[str] | None,
        reflex_overrides: dict[str, Any] | None = None,
        keigo_overrides: dict[str, Any] | None = None,
        pitch_overrides: dict[str, Any] | None = None,
        situational_overrides: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        """Calls AIRouter to personalize template into structured exercise JSON."""
        # Check if reflex/keigo/pitch/situational exercise (needs specialized prompt)
        is_reflex = priority.recommended_exercise_type.value.startswith("reflex")
        is_keigo = priority.recommended_exercise_type.value.startswith("keigo")
        is_pitch = priority.recommended_exercise_type.value.startswith("pitch") or priority.recommended_exercise_type.value in ("mora_length", "vowel_devoicing", "pitch_contour", "pitch_recognition")
        is_situational = priority.recommended_exercise_type.value.startswith("situational")
        if is_reflex:
            pressure = (reflex_overrides or {}).get("pressure_level", "normal")
            timer_ms = (reflex_overrides or {}).get("timer_limit_ms", 4000)
            verb = (reflex_overrides or {}).get("verb")
            target = (reflex_overrides or {}).get("conjugation_target")
            sys_inst, user_content = LearningPrompts.build_reflex_generation_prompt(
                sub_mode=priority.recommended_exercise_type.value,
                priority=priority,
                state=state,
                template_info=template_info,
                pressure_level=pressure,
                timer_ms=timer_ms,
                verb=verb,
                conjugation_target=target,
            )
            task = AITask.REFLEX_GENERATION
            max_tokens = 700
        elif is_keigo:
            pressure = (keigo_overrides or {}).get("pressure_level", "normal")
            timer_ms = (keigo_overrides or {}).get("timer_limit_ms", 5000)
            ctx = (keigo_overrides or {}).get("social_context")
            sys_inst, user_content = LearningPrompts.build_keigo_generation_prompt(
                sub_mode=priority.recommended_exercise_type.value,
                priority=priority,
                state=state,
                template_info=template_info,
                pressure_level=pressure,
                timer_ms=timer_ms,
                social_context=ctx,
            )
            task = AITask.KEIGO_GENERATION
            max_tokens = 700
        elif is_pitch:
            pressure = (pitch_overrides or {}).get("pressure_level", "normal")
            timer_ms = (pitch_overrides or {}).get("timer_limit_ms", 5000)
            pattern = (pitch_overrides or {}).get("pitch_pattern")
            sys_inst, user_content = LearningPrompts.build_pitch_generation_prompt(
                sub_mode=priority.recommended_exercise_type.value,
                priority=priority,
                state=state,
                template_info=template_info,
                pressure_level=pressure,
                timer_ms=timer_ms,
                pitch_pattern=pattern,
            )
            task = AITask.PITCH_GENERATION if hasattr(AITask, "PITCH_GENERATION") else AITask.EXERCISE_GENERATION
            max_tokens = 700
        elif is_situational:
            pressure = (situational_overrides or {}).get("pressure_level", "normal")
            timer_ms = (situational_overrides or {}).get("timer_limit_ms", 6000)
            ctx = (situational_overrides or {}).get("situational_context") or situational_overrides
            sys_inst, user_content = LearningPrompts.build_situational_generation_prompt(
                sub_mode=priority.recommended_exercise_type.value,
                priority=priority,
                state=state,
                template_info=template_info,
                pressure_level=pressure,
                timer_ms=timer_ms,
                situational_context=ctx,
            )
            task = AITask.SITUATIONAL_GENERATION if hasattr(AITask, "SITUATIONAL_GENERATION") else AITask.EXERCISE_GENERATION
            max_tokens = 700
        else:
            sys_inst, user_content = LearningPrompts.build_exercise_generation_prompt(
                priority=priority,
                state=state,
                template_info=template_info,
                recent_topics=recent_topics,
            )
            task = AITask.EXERCISE_GENERATION
            max_tokens = 600

        req = AIRequest(
            task=task,
            system_instruction=sys_inst,
            messages=[
                AIMessage(role=AIMessageRole.SYSTEM, content=sys_inst),
                AIMessage(role=AIMessageRole.USER, content=user_content),
            ],
            response_format=ResponseFormat(type=ResponseFormatType.JSON_OBJECT),
            temperature=0.5,
            max_output_tokens=max_tokens,
            user_id=user_id,
        )

        try:
            resp = await self.ai_router.generate(task=task, request=req, user_id=user_id)
            clean_text = resp.text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text.replace("```json", "", 1).rstrip("```").strip()
            elif clean_text.startswith("```"):
                clean_text = clean_text.replace("```", "", 1).rstrip("```").strip()

            parsed = json.loads(clean_text)
            parsed["_provider"] = resp.provider
            parsed["_model"] = resp.model
            return parsed
        except Exception as e:
            logger.warning(f"[ExerciseGenerator] AI generation error: {e}")
            return None

    def _build_template_fallback(
        self,
        priority: PriorityScore,
        template_info: dict[str, Any],
    ) -> dict[str, Any]:
        """Creates robust deterministic fallback exercise when AI is unavailable."""
        target_name = priority.title
        key_raw = priority.key.split(".")[-1]

        title = template_info["title_template"].format(target_title=target_name)
        obj = template_info["objective_template"].format(target_title=target_name)
        scenario = template_info.get("scenario_template", "Giao tiếp công sở và đời sống hàng ngày.")
        inst = template_info["instruction_template"].format(target_title=target_name)

        return {
            "title": title,
            "objective": obj,
            "scenario": scenario,
            "instructions": inst,
            "constraints": ["Trả lời tự nhiên bằng tiếng Nhật, giữ nhịp nói đều đặn."],
            "target_patterns": [key_raw, target_name],
            "acceptable_variants": [target_name],
            "scaffold_hint": f"Hãy nghĩ đến ngữ cảnh dùng: {target_name}",
            "estimated_minutes": template_info.get("default_estimated_minutes", 5),
            "_provider": "template_fallback",
            "_model": "deterministic_v1",
        }
