"""AIInterpretGenerator — dynamic VI prompts via AIRouter with template fallback.

Falls back to InterpretExerciseFactory pools when the provider is unavailable.
Every AI item ships expected_ja_keywords so fidelity checks cost zero tokens.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.domains.ai.contracts import AIMessage, AIMessageRole, AIRequest, AITask, ResponseFormat, ResponseFormatType
from app.domains.ai.router import AIRouter
from app.domains.interpret.exercise_factory import InterpretExerciseFactory
from app.domains.reflex.cache_service import ExerciseCacheService


class AIInterpretGenerator:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai_router = AIRouter(db)
        self.factory = InterpretExerciseFactory()
        self.cache_service = ExerciseCacheService(db)

    async def generate_dynamic_exercise(
        self,
        sub_mode: str,
        relation: str = "casual_friend",
        scaffold: str = "keyword_hint",
        timer_limit_ms: int | None = None,
        difficulty: str = "normal",
        topic: str | None = None,
        user_id: str | None = None,
    ) -> dict[str, Any]:
        """Tries AI generation first; falls back to Smart Cache DB, then to deterministic pools."""
        try:
            data = await self._ai_generate(sub_mode, relation, difficulty, topic, user_id)
            if data and data.get("prompt_vi"):
                data.setdefault("relation", relation)
                data.setdefault("scaffold", scaffold)
                data.setdefault("blind", scaffold == "none")
                data.setdefault("difficulty", difficulty)
                if timer_limit_ms is not None:
                    data["timer_limit_ms"] = timer_limit_ms
                data["generation_source"] = "ai"
                data["is_fallback"] = False

                # Save newly generated unique exercise to database pool in background
                async def _save_bg(item: dict[str, Any]):
                    try:
                        svc = ExerciseCacheService()
                        await svc.save_exercise_to_pool(
                            domain="interpret",
                            sub_mode=sub_mode,
                            difficulty=difficulty,
                            exercise_dict=item,
                            category=topic or relation,
                        )
                    except Exception as err:
                        logger.warning(f"[AIInterpretGenerator] Background pool save failed: {err}")

                asyncio.create_task(_save_bg(dict(data)))
                return data
        except Exception as e:
            logger.warning(f"[AIInterpretGenerator] AI generation failed ({e}), attempting Smart Cache DB fallback...")

        # Tier 2: Try pulling previously learned/generated exercise from database cache pool
        try:
            cached = await self.cache_service.get_smart_exercise(
                domain="interpret",
                sub_mode=sub_mode,
                difficulty=difficulty,
            )
            if cached and cached.get("prompt_vi"):
                cached.setdefault("relation", relation)
                cached.setdefault("scaffold", scaffold)
                cached.setdefault("blind", scaffold == "none")
                cached.setdefault("difficulty", difficulty)
                if timer_limit_ms is not None:
                    cached["timer_limit_ms"] = timer_limit_ms
                cached["generation_source"] = "smart_cache_pool"
                cached["is_fallback"] = True
                cached["fallback_reason"] = "ai_unavailable"
                logger.info("[AIInterpretGenerator] Successfully served exercise from Smart Cache DB")
                return cached
        except Exception as c_err:
            logger.warning(f"[AIInterpretGenerator] Smart Cache DB lookup error: {c_err}")

        # Tier 3: Deterministic Factory Seed Pool (Safety Net)
        fb = self.factory.build(sub_mode, relation, scaffold, timer_limit_ms, difficulty, topic)
        fb["generation_source"] = "template_fallback"
        fb["is_fallback"] = True
        fb["fallback_reason"] = "ai_and_cache_empty"
        return fb

    async def _ai_generate(
        self,
        sub_mode: str,
        relation: str,
        difficulty: str,
        topic: str | None,
        user_id: str | None,
    ) -> dict[str, Any] | None:
        register = "タメ口 casual" if relation != "business_polite" else "丁寧語 business"
        if sub_mode == "interpret_word":
            task_desc = "One short Vietnamese word/phrase a learner must say in Japanese."
            fmt = "{\"prompt_vi\": \"...\", \"expected_ja_keywords\": [\"...\"], \"reference_ja\": \"...\"}"
        elif sub_mode == "interpret_situation":
            task_desc = "One workplace/daily Vietnamese situation requiring a Japanese explanation."
            fmt = "{\"prompt_vi\": \"...\", \"expected_ja_keywords\": [\"...\", \"...\", \"...\"], \"reference_ja\": \"...\"}"
        else:
            task_desc = "One natural Vietnamese sentence (daily life or office, Tet topics welcome)."
            fmt = "{\"prompt_vi\": \"...\", \"expected_ja_keywords\": [\"...\", \"...\", \"...\"], \"reference_ja\": \"...\"}"
        sys_inst = (
            "You create Vietnamese-to-Japanese interpretation drills. "
            "expected_ja_keywords are the core Japanese ideas the learner MUST keep (2-4 items). "
            "reference_ja is a natural model answer. "
            f"Reply ONLY with JSON: {fmt}."
        )
        user_content = f"Mode: {sub_mode}. Register: {register}. Difficulty: {difficulty}. Topic: {topic or 'mixed Tet/office/daily'}. Task: {task_desc}"
        req = AIRequest(
            task=AITask.INTERPRET_GENERATION,
            system_instruction=sys_inst,
            messages=[AIMessage(role=AIMessageRole.SYSTEM, content=sys_inst), AIMessage(role=AIMessageRole.USER, content=user_content)],
            response_format=ResponseFormat(type=ResponseFormatType.JSON_OBJECT),
            temperature=0.7,
            max_output_tokens=500,
            user_id=user_id,
        )
        resp = await self.ai_router.generate(task=AITask.INTERPRET_GENERATION, request=req, user_id=user_id)
        txt = (resp.text or "").strip()
        if txt.startswith("```json"):
            txt = txt.replace("```json", "", 1).rstrip("```").strip()
        elif txt.startswith("```"):
            txt = txt.replace("```", "", 1).rstrip("```").strip()
        parsed = json.loads(txt)
        prompt_vi = str(parsed.get("prompt_vi") or "").strip()
        keywords = [str(k) for k in (parsed.get("expected_ja_keywords") or [])][:4]
        if not prompt_vi or not keywords:
            return None
        titles = {"interpret_word": "越日単語 — dịch từ/cụm", "interpret_sentence": "越日文 — dịch câu", "interpret_situation": "越日通訳 — phiên dịch tình huống"}
        return {
            "title": titles.get(sub_mode, "越日通訳"),
            "objective": "Dịch Việt→Nhật giữ đủ ý, đúng SOV, tự nhiên như bản xứ.",
            "scenario": prompt_vi,
            "instructions": f"Hãy dịch sang tiếng Nhật: 「{prompt_vi}」",
            "prompt_vi": prompt_vi,
            "expected_ja_keywords": keywords,
            "reference_ja": str(parsed.get("reference_ja") or ""),
            "situation_vi": prompt_vi if sub_mode == "interpret_situation" else None,
            "starter_ja": None,
            "topic": topic,
            "relation": relation,
            "timer_limit_ms": {"interpret_word": 8000, "interpret_sentence": 20000, "interpret_situation": 30000}.get(sub_mode, 20000),
            "difficulty": difficulty,
        }
