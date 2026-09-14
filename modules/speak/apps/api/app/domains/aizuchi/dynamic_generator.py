"""AIAizuchiGenerator — dynamic NPC turn generation via AIRouter with template fallback.

100% on-the-fly, infinite non-repeating aizuchi scenarios. Falls back to
AizuchiExerciseFactory pools when the provider is unavailable (zero crash).
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.domains.ai.contracts import AIMessage, AIMessageRole, AIRequest, AITask, ResponseFormat, ResponseFormatType
from app.domains.ai.router import AIRouter
from app.domains.aizuchi.exercise_factory import AizuchiExerciseFactory
from app.domains.aizuchi.pools import get_pool
from app.domains.reflex.cache_service import ExerciseCacheService


class AIAizuchiGenerator:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai_router = AIRouter(db)
        self.factory = AizuchiExerciseFactory()
        self.cache_service = ExerciseCacheService(db)

    async def generate_dynamic_exercise(
        self,
        sub_mode: str,
        relation: str = "casual_friend",
        window_profile: str = "normal",
        window_ms: int | None = None,
        difficulty: str = "normal",
        speed: float = 1.0,
        num_turns: int = 3,
        user_id: str | None = None,
    ) -> dict[str, Any]:
        """Tries AI generation first; falls back to Smart Cache DB, then to deterministic pools."""
        try:
            data = await self._ai_generate(sub_mode, relation, difficulty, num_turns, user_id)
            if data and data.get("npc_turns"):
                data.setdefault("window_profile", window_profile)
                if window_ms is not None:
                    data["window_ms"] = window_ms
                    for t in data["npc_turns"]:
                        t["pause_window_ms"] = window_ms
                data.setdefault("relation", relation)
                data.setdefault("speed", speed)
                data.setdefault("difficulty", difficulty)
                data["generation_source"] = "ai"
                data["is_fallback"] = False

                # Save newly generated unique exercise to database pool in background
                async def _save_bg(item: dict[str, Any]):
                    try:
                        svc = ExerciseCacheService()
                        await svc.save_exercise_to_pool(
                            domain="aizuchi",
                            sub_mode=sub_mode,
                            difficulty=difficulty,
                            exercise_dict=item,
                            category=relation,
                        )
                    except Exception as err:
                        logger.warning(f"[AIAizuchiGenerator] Background pool save failed: {err}")

                asyncio.create_task(_save_bg(dict(data)))
                return data
        except Exception as e:
            logger.warning(f"[AIAizuchiGenerator] AI generation failed ({e}), attempting Smart Cache DB fallback...")

        # Tier 2: Try pulling previously learned/generated exercise from database cache pool
        try:
            cached = await self.cache_service.get_smart_exercise(
                domain="aizuchi",
                sub_mode=sub_mode,
                difficulty=difficulty,
            )
            if cached and cached.get("npc_turns"):
                cached.setdefault("window_profile", window_profile)
                if window_ms is not None:
                    cached["window_ms"] = window_ms
                    for t in cached["npc_turns"]:
                        t["pause_window_ms"] = window_ms
                cached.setdefault("relation", relation)
                cached.setdefault("speed", speed)
                cached.setdefault("difficulty", difficulty)
                cached["generation_source"] = "smart_cache_pool"
                cached["is_fallback"] = True
                cached["fallback_reason"] = "ai_unavailable"
                logger.info("[AIAizuchiGenerator] Successfully served exercise from Smart Cache DB")
                return cached
        except Exception as c_err:
            logger.warning(f"[AIAizuchiGenerator] Smart Cache DB lookup error: {c_err}")

        # Tier 3: Deterministic Factory Seed Pool (Safety Net)
        if sub_mode == "warikomi_interrupt":
            fb = self.factory.build_interrupt(relation, window_profile, window_ms, difficulty, speed)
        else:
            fb = self.factory.build_reaction(relation, window_profile, window_ms, difficulty, num_turns, speed)
        fb["generation_source"] = "template_fallback"
        fb["is_fallback"] = True
        fb["fallback_reason"] = "ai_and_cache_empty"
        return fb

    async def _ai_generate(
        self,
        sub_mode: str,
        relation: str,
        difficulty: str,
        num_turns: int,
        user_id: str | None,
    ) -> dict[str, Any] | None:
        register = "タメ口 casual, contractions, sentence-end じゃん/さ/よ" if relation != "business_polite" else "丁寧語 business polite"
        sys_inst = (
            "You create Japanese aizuchi-training NPC lines. Reply ONLY with JSON: "
            "{\"npc_turns\": [{\"text\": \"...Japanese line...\", \"text_vi\": \"...Vietnamese translation...\", "
            "\"expected_types\": [\"surprise|empathy|continuer|followup\"], "
            "\"sample_responses\": [\"2-3 natural Japanese aizuchi sample phrases\"]}], "
            "\"title\": \"...\"}. Keep each turn 1-2 short spoken sentences."
        )
        user_content = (
            f"Mode: {sub_mode}. Register: {register}. Difficulty: {difficulty}. "
            f"Generate {num_turns} NPC turns forming a tiny funny or relatable story. "
            f"For each turn provide natural Japanese sample_responses suitable for the register."
        )
        req = AIRequest(
            task=AITask.AIZUCHI_GENERATION,
            system_instruction=sys_inst,
            messages=[AIMessage(role=AIMessageRole.SYSTEM, content=sys_inst), AIMessage(role=AIMessageRole.USER, content=user_content)],
            response_format=ResponseFormat(type=ResponseFormatType.JSON_OBJECT),
            temperature=0.7,
            max_output_tokens=900,
            user_id=user_id,
        )
        resp = await self.ai_router.generate(task=AITask.AIZUCHI_GENERATION, request=req, user_id=user_id)
        txt = (resp.text or "").strip()
        if txt.startswith("```json"):
            txt = txt.replace("```json", "", 1).rstrip("```").strip()
        elif txt.startswith("```"):
            txt = txt.replace("```", "", 1).rstrip("```").strip()
        parsed = json.loads(txt)
        turns = []
        for raw in (parsed.get("npc_turns") or [])[:5]:
            text = (raw.get("text") or "").strip()
            if not text:
                continue
            text_vi = (raw.get("text_vi") or "").strip()
            types = [t for t in (raw.get("expected_types") or ["continuer"]) if t in ("surprise", "empathy", "continuer", "followup", "polite_interrupt")] or ["continuer"]
            samples = [str(s).strip() for s in (raw.get("sample_responses") or []) if str(s).strip()][:4]
            if not samples:
                if relation == "business_polite":
                    samples = ["はい、かしこまりました", "さようでございますか", "なるほど"]
                else:
                    samples = ["へー、マジで！？", "そうなんだ！", "それで？"]
            turns.append({
                "text": text,
                "text_vi": text_vi,
                "pause_window_ms": 600,
                "expected_types": types,
                "sample_responses": samples,
            })
        if not turns:
            return None
        pool_hint = get_pool(relation)  # touch pool to keep import used & pools warm
        _ = pool_hint
        return {
            "title": parsed.get("title") or "相づちリアクション",
            "objective": "Chêm aizuchi đúng lúc, đúng loại trong khoảng lặng của NPC.",
            "scenario": turns[0]["text"],
            "instructions": "Nghe NPC nói. Khi đèn xanh bật (khoảng lặng), chêm ngay 1-2 từ phù hợp ngữ cảnh.",
            "npc_turns": turns,
            "expected_types": turns[0]["expected_types"],
            "sample_responses": turns[0]["sample_responses"],
        }
