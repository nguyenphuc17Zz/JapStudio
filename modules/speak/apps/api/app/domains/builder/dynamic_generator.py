"""AIBuilderGenerator — dynamic builder content via AIRouter with template fallback.

Falls back to BuilderExerciseFactory pools when the provider is unavailable.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.domains.ai.contracts import AIMessage, AIMessageRole, AIRequest, AITask, ResponseFormat, ResponseFormatType
from app.domains.ai.router import AIRouter
from app.domains.builder.exercise_factory import BuilderExerciseFactory
from app.domains.reflex.cache_service import ExerciseCacheService


class AIBuilderGenerator:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai_router = AIRouter(db)
        self.factory = BuilderExerciseFactory()
        self.cache_service = ExerciseCacheService(db)

    async def generate_dynamic_exercise(
        self,
        sub_mode: str,
        focus_skill: str | None = None,
        relation: str = "casual_friend",
        scaffold: str = "keyword_hint",
        timer_limit_ms: int | None = None,
        difficulty: str = "normal",
        user_id: str | None = None,
    ) -> dict[str, Any]:
        """Tries AI generation first; falls back to Smart Cache DB, then to deterministic pools."""
        try:
            data = await self._ai_generate(sub_mode, focus_skill, relation, difficulty, user_id)
            if data:
                data.setdefault("scaffold", scaffold)
                data.setdefault("blind", scaffold == "none")
                data.setdefault("relation", relation)
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
                            domain="builder",
                            sub_mode=sub_mode,
                            difficulty=difficulty,
                            exercise_dict=item,
                            category=focus_skill or relation,
                        )
                    except Exception as err:
                        logger.warning(f"[AIBuilderGenerator] Background pool save failed: {err}")

                asyncio.create_task(_save_bg(dict(data)))
                return data
        except Exception as e:
            logger.warning(f"[AIBuilderGenerator] AI generation failed ({e}), attempting Smart Cache DB fallback...")

        # Tier 2: Try pulling previously learned/generated exercise from database cache pool
        try:
            cached = await self.cache_service.get_smart_exercise(
                domain="builder",
                sub_mode=sub_mode,
                difficulty=difficulty,
            )
            if cached:
                cached.setdefault("scaffold", scaffold)
                cached.setdefault("blind", scaffold == "none")
                cached.setdefault("relation", relation)
                cached.setdefault("difficulty", difficulty)
                if timer_limit_ms is not None:
                    cached["timer_limit_ms"] = timer_limit_ms
                cached["generation_source"] = "smart_cache_pool"
                cached["is_fallback"] = True
                cached["fallback_reason"] = "ai_unavailable"
                logger.info("[AIBuilderGenerator] Successfully served exercise from Smart Cache DB")
                return cached
        except Exception as c_err:
            logger.warning(f"[AIBuilderGenerator] Smart Cache DB lookup error: {c_err}")

        # Tier 3: Deterministic Factory Seed Pool (Safety Net)
        fb = self.factory.build(sub_mode, focus_skill, relation, scaffold, timer_limit_ms, difficulty)
        fb["generation_source"] = "template_fallback"
        fb["is_fallback"] = True
        fb["fallback_reason"] = "ai_and_cache_empty"
        return fb

    async def _ai_generate(
        self,
        sub_mode: str,
        focus_skill: str | None,
        relation: str,
        difficulty: str,
        user_id: str | None,
    ) -> dict[str, Any] | None:
        register = "タメ口 casual" if relation != "business_polite" else "丁寧語 business"
        if sub_mode == "sentence_expand":
            task_desc = "One short Japanese seed sentence + expand_requirement + canonical (expanded natural model sentence) + canonical_vi."
            fmt = "{\"source_sentence\": \"...\", \"expand_requirement\": \"...\", \"situation_vi\": \"...\", \"focus_skill\": \"...\", \"canonical\": \"...\", \"canonical_vi\": \"...\"}"
        elif sub_mode == "sentence_repair":
            task_desc = "One awkward Japanese sentence + fix_hint + canonical (natural repaired model sentence) + canonical_vi."
            fmt = "{\"source_sentence\": \"...\", \"fix_hint\": \"...\", \"situation_vi\": \"...\", \"focus_skill\": \"...\", \"canonical\": \"...\", \"canonical_vi\": \"...\"}"
        else:
            task_desc = "4 Japanese keywords + optional starter + Vietnamese situation + canonical (full natural assembled sentence using keywords) + canonical_vi."
            fmt = "{\"keywords\": [\"...\", \"...\", \"...\", \"...\"], \"starter\": \"... or null\", \"situation_vi\": \"...\", \"focus_skill\": \"...\", \"canonical\": \"...\", \"canonical_vi\": \"...\"}"
        sys_inst = (
            "You create Japanese sentence-builder drills for N1 learners. Focus ONE clause skill "
            "(te_chain|relative_clause|conditional|nominalization|contraction). "
            "canonical MUST be a natural, full Japanese model sentence for this drill. "
            f"Reply ONLY with JSON: {fmt}."
        )
        user_content = f"Mode: {sub_mode}. Register: {register}. Difficulty: {difficulty}. Task: {task_desc}"
        req = AIRequest(
            task=AITask.BUILDER_GENERATION,
            system_instruction=sys_inst,
            messages=[AIMessage(role=AIMessageRole.SYSTEM, content=sys_inst), AIMessage(role=AIMessageRole.USER, content=user_content)],
            response_format=ResponseFormat(type=ResponseFormatType.JSON_OBJECT),
            temperature=0.7,
            max_output_tokens=700,
            user_id=user_id,
        )
        resp = await self.ai_router.generate(task=AITask.BUILDER_GENERATION, request=req, user_id=user_id)
        txt = (resp.text or "").strip()
        if txt.startswith("```json"):
            txt = txt.replace("```json", "", 1).rstrip("```").strip()
        elif txt.startswith("```"):
            txt = txt.replace("```", "", 1).rstrip("```").strip()
        parsed = json.loads(txt)
        skill = str(parsed.get("focus_skill") or focus_skill or "te_chain")
        if skill not in ("te_chain", "relative_clause", "conditional", "nominalization", "contraction"):
            skill = "te_chain"
        keywords = [str(k) for k in (parsed.get("keywords") or [])][:5]
        source = str(parsed.get("source_sentence") or "").strip()
        if sub_mode == "sentence_assemble" and len(keywords) < 3:
            return None
        if sub_mode in ("sentence_expand", "sentence_repair") and not source:
            return None
        base: dict[str, Any] = {
            "focus_skill": skill,
            "keywords": keywords,
            "starter": parsed.get("starter"),
            "source_sentence": source or None,
            "expand_requirement": parsed.get("expand_requirement"),
            "fix_hint": parsed.get("fix_hint"),
            "situation_vi": parsed.get("situation_vi"),
            "canonical": str(parsed.get("canonical") or "").strip(),
            "canonical_vi": str(parsed.get("canonical_vi") or "").strip(),
            "connectors": [],
            "timer_limit_ms": 20000,
        }
        if sub_mode == "sentence_expand":
            base.update({
                "title": "文拡大 — mở rộng câu", "objective": "Mở rộng câu cụt thành câu dài tự nhiên.",
                "scenario": source, "instructions": f"Câu gốc: 「{source}」. Hãy nói lại thành câu dài hơn ({parsed.get('expand_requirement', 'thêm mệnh đề mới')}).",
            })
        elif sub_mode == "sentence_repair":
            base.update({
                "title": "文修理 — sửa câu lủng củng", "objective": "Nói lại câu lủng củng thành bản tự nhiên.",
                "scenario": source, "instructions": f"Câu lủng củng: 「{source}」. Hãy nói lại tự nhiên. Gợi ý: {parsed.get('fix_hint', '')}",
            })
        else:
            base.update({
                "title": "文立て — nối từ thành câu", "objective": "Nối từ khóa rời thành 1 câu dài tự nhiên.",
                "scenario": " / ".join(keywords),
                "instructions": f"Từ khóa: {', '.join(keywords)}. Hãy nói 1 câu dài tự nhiên dùng hết từ khóa." + (f" Gợi ý: 「{parsed.get('starter')}」" if parsed.get("starter") else ""),
            })
        return base
