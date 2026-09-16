"""AIBuilderGenerator — dynamic builder content via AIRouter with template fallback.

Falls back to BuilderExerciseFactory pools when the provider is unavailable.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.shared.errors.exceptions import ValidationException
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
        force_ai: bool = False,
    ) -> dict[str, Any]:
        """Generates 100% fresh AI exercise and saves to SQLite pool. Raises explicit error on failure."""
        try:
            data = await self._ai_generate(sub_mode, focus_skill, relation, difficulty, user_id, force_ai=force_ai)
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
            raise ValidationException("AI không thể tạo bài tập ghép câu. Vui lòng thử lại.")
        except ValidationException:
            raise
        except Exception as e:
            logger.error(f"[AIBuilderGenerator] AI generation failed: {e}")
            raise ValidationException(f"Lỗi tạo bài tập ghép câu từ AI: {e}. Vui lòng thử lại.")


    async def _ai_generate(
        self,
        sub_mode: str,
        focus_skill: str | None,
        relation: str,
        difficulty: str,
        user_id: str | None,
        force_ai: bool = False,
    ) -> dict[str, Any] | None:
        register = "タメ口 casual (thân mật với bạn bè/đồng nghiệp thân)" if relation != "business_polite" else "丁寧語・敬語 business (lịch sự trang trọng)"
        skill = focus_skill or "te_chain"
        
        sys_inst = (
            "You are an expert Japanese speaking coach creating practical, conversational sentence-builder drills for learners (JLPT N4-N2 levels).\n"
            "Create natural everyday spoken Japanese scenarios (dining, travel, work, commute, shopping, hobbies, daily stories).\n"
            "NEVER make overly rigid, bookish, or convoluted sentences. Focus on high-frequency conversational flow.\n"
            "Return STRICT JSON only, matching the exact format specified."
        )

        fmt = """{
  "prompt_vi": "Tình huống giao tiếp tiếng Việt tự nhiên và sinh động",
  "situation_vi": "Mô tả ngắn gọn ngữ cảnh nói chuyện",
  "canonical": "Câu mẫu tiếng Nhật tự nhiên, hoàn chỉnh của người bản xứ",
  "canonical_vi": "Dịch nghĩa tiếng Việt tự nhiên của câu mẫu",
  "template": "Khung cấu trúc mẫu có chỗ trống ______ để người học ghép",
  "keywords": ["từ khóa 1", "từ khóa 2", "từ khóa 3", "từ khóa 4"],
  "starter": "Cụm mở đầu gợi ý hoặc null",
  "suggested_vocabulary": [
    {"term": "từ tiếng Nhật", "reading": "cách đọc hiragana", "meaning_vi": "nghĩa tiếng Việt"}
  ],
  "connectors": [
    {"term": "liên từ tiếng Nhật", "meaning_vi": "nghĩa tiếng Việt", "kind": "connector|ending|nominalizer"}
  ],
  "hints": [
    {"tier": 1, "title": "Gợi ý tư duy ngữ pháp", "content": "Hướng dẫn ngắn gọn cách dùng cấu trúc..."},
    {"tier": 2, "title": "Gợi ý từ nối / mở đầu", "content": "Các từ nối nên dùng trong câu này..."},
    {"tier": 3, "title": "Khung sườn cấu trúc", "content": "Khung mẫu với chỗ trống..."},
    {"tier": 4, "title": "Câu mẫu hoàn chỉnh", "content": "Toàn bộ câu tiếng Nhật mẫu..."}
  ],
  "focus_skill": "te_chain|relative_clause|conditional|nominalization|contraction"
}"""

        nonce_str = f" Nonce: {asyncio.get_event_loop().time()}." if force_ai else ""
        user_content = (
            f"Mode: {sub_mode}. Register: {register}. Difficulty: {difficulty}. Focus Skill: {skill}.\n"
            f"Generate 1 high-quality conversational sentence-building exercise.\n"
            f"Return JSON strictly following this schema:\n{fmt}{nonce_str}"
        )

        req = AIRequest(
            task=AITask.BUILDER_GENERATION,
            system_instruction=sys_inst,
            messages=[AIMessage(role=AIMessageRole.SYSTEM, content=sys_inst), AIMessage(role=AIMessageRole.USER, content=user_content)],
            response_format=ResponseFormat(type=ResponseFormatType.JSON_OBJECT),
            temperature=0.85 if force_ai else 0.7,
            max_output_tokens=900,
            user_id=user_id,
        )
        resp = await self.ai_router.generate(task=AITask.BUILDER_GENERATION, request=req, user_id=user_id)
        txt = (resp.text or "").strip()
        if txt.startswith("```json"):
            txt = txt.replace("```json", "", 1).rstrip("```").strip()
        elif txt.startswith("```"):
            txt = txt.replace("```", "", 1).rstrip("```").strip()
        parsed = json.loads(txt)
        res_skill = str(parsed.get("focus_skill") or skill)
        if res_skill not in ("te_chain", "relative_clause", "conditional", "nominalization", "contraction"):
            res_skill = skill
        keywords = [str(k) for k in (parsed.get("keywords") or [])][:5]
        canonical = str(parsed.get("canonical") or "").strip()
        canonical_vi = str(parsed.get("canonical_vi") or "").strip()
        prompt_vi = str(parsed.get("prompt_vi") or parsed.get("situation_vi") or "Hãy xây một câu hoàn chỉnh").strip()
        situation_vi = str(parsed.get("situation_vi") or prompt_vi).strip()
        template = str(parsed.get("template") or "").strip()

        # Extract suggested vocabulary
        raw_vocab = parsed.get("suggested_vocabulary") or []
        suggested_vocab = []
        if isinstance(raw_vocab, list):
            for v in raw_vocab:
                if isinstance(v, dict) and "term" in v:
                    suggested_vocab.append({
                        "term": str(v.get("term", "")),
                        "reading": str(v.get("reading", "")),
                        "meaning_vi": str(v.get("meaning_vi", "")),
                    })

        # Extract connectors
        raw_connectors = parsed.get("connectors") or []
        connector_items = []
        if isinstance(raw_connectors, list):
            for c in raw_connectors:
                if isinstance(c, dict) and "term" in c:
                    connector_items.append({
                        "term": str(c.get("term", "")),
                        "meaning_vi": str(c.get("meaning_vi", "")),
                        "kind": str(c.get("kind", "connector")),
                    })
                elif isinstance(c, str):
                    connector_items.append({"term": c, "meaning_vi": "", "kind": "connector"})

        # Extract hints
        raw_hints = parsed.get("hints") or []
        hints = []
        if isinstance(raw_hints, list) and len(raw_hints) > 0:
            for h in raw_hints:
                if isinstance(h, dict):
                    hints.append({
                        "tier": int(h.get("tier", 1)),
                        "title": str(h.get("title", f"Gợi ý T{h.get('tier', 1)}")),
                        "content": str(h.get("content", "")),
                    })
        else:
            # Fallback 4-tier hints if AI didn't provide
            hints = [
                {"tier": 1, "title": "Hướng tư duy ngữ pháp", "content": f"Trọng tâm: {res_skill}. Hãy chia đúng thể để kết nối các vế."},
                {"tier": 2, "title": "Gợi ý từ nối", "content": ", ".join([c.get("term", "") for c in connector_items]) or "て, から, ので"},
                {"tier": 3, "title": "Khung sườn cấu trúc", "content": template or f"{keywords[0] if keywords else ''}…"},
                {"tier": 4, "title": "Câu mẫu hoàn chỉnh", "content": canonical},
            ]

        source = str(parsed.get("source_sentence") or template or (keywords[0] if keywords else "")).strip()

        base: dict[str, Any] = {
            "focus_skill": res_skill,
            "keywords": keywords,
            "starter": parsed.get("starter"),
            "source_sentence": source or None,
            "expand_requirement": parsed.get("expand_requirement"),
            "fix_hint": parsed.get("fix_hint"),
            "prompt_vi": prompt_vi,
            "situation_vi": situation_vi,
            "template": template,
            "suggested_vocabulary": suggested_vocab,
            "connector_items": connector_items,
            "hints": hints,
            "canonical": canonical,
            "canonical_vi": canonical_vi,
            "connectors": [c.get("term", "") for c in connector_items] if connector_items else (parsed.get("connectors") or []),
            "timer_limit_ms": 60000,
        }

        if sub_mode == "sentence_expand":
            base.update({
                "title": "文拡大 — Mở Rộng Câu",
                "objective": "Mở rộng câu ngắn thành câu dài tự nhiên, truyền đạt trọn vẹn thông tin.",
                "scenario": source,
                "instructions": f"Câu gốc: 「{source}」. Hãy nói lại thành câu dài hơn ({parsed.get('expand_requirement', 'thêm bối cảnh/lý do')}).",
            })
        elif sub_mode == "sentence_repair":
            base.update({
                "title": "文修理 — Sửa Câu Tự Nhiên",
                "objective": "Chuyển câu lủng củng / cứng nhắc thành cách diễn đạt tự nhiên như người bản xứ.",
                "scenario": source,
                "instructions": f"Câu chưa tự nhiên: 「{source}」. Hãy diễn đạt lại mượt mà hơn ({parsed.get('fix_hint', '')}).",
            })
        else:
            base.update({
                "title": "文立て — Lắp Ghép Xây Câu",
                "objective": "Lắp ghép các khối từ khóa và liên từ thành câu nói hoàn chỉnh.",
                "scenario": " / ".join(keywords),
                "instructions": f"Đề bài: {prompt_vi}. Hãy lắp ghép các từ vựng và liên từ để hoàn thành câu.",
            })
        return base
