"""BuilderEvaluator — deterministic-first + AI fallback.

Deterministic path handles coverage/connection/register checks.
AI fallback only when connection evidence is thin (no markers detected)
with a non-empty transcript and decent STT confidence.
"""

from __future__ import annotations

import json
import re
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.domains.ai.contracts import AIMessage, AIMessageRole, AIRequest, AITask, ResponseFormat, ResponseFormatType
from app.domains.ai.router import AIRouter
from app.domains.builder.pools import coverage_of
from app.domains.builder.scoring import BuilderScoringPolicy


def _norm(text: str) -> str:
    return re.sub(r"[。！？、\s\!\?\,\.\u3000]+", "", (text or "").strip())


class BuilderEvaluator:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai_router = AIRouter(db)

    async def evaluate(
        self,
        exercise_type: str,
        exercise: Any,
        user_transcript: str,
        *,
        timer_limit_ms: int | None = None,
        reaction_latency_ms: float | None = None,
        speech_confidence: float | None = None,
        timed_out: bool = False,
        late_response: bool = False,
        independence: str = "independent",
        focus_skill: str | None = None,
        keywords: list[str] | None = None,
        scaffold_level: str | None = None,
        blind: bool = False,
    ) -> dict[str, Any]:
        raw = (user_transcript or "").strip()

        cfg: dict[str, Any] = {}
        try:
            cfg = (exercise.extra_metadata or {}).get("builder_config", {}) or {}
        except Exception:
            cfg = {}
        eff_skill = focus_skill or cfg.get("focus_skill", "te_chain")
        eff_keywords = keywords if keywords is not None else list(cfg.get("keywords", []))
        eff_relation = cfg.get("relation", "casual_friend")
        eff_expected = list(cfg.get("connectors", []))
        eff_blind = bool(blind or cfg.get("blind", False))
        eff_timer = timer_limit_ms or cfg.get("timer_limit_ms")
        eff_timed_out = bool(timed_out or (not raw))

        used, missing = coverage_of(raw, eff_keywords)

        # AI fallback: no chaining markers found but sentence is long enough to judge
        ai_note = ""
        if raw and (speech_confidence or 0) >= 0.5:
            from app.domains.builder.scoring import _CONNECTOR_RE, _RELATIVE_RE

            if not _CONNECTOR_RE.search(raw) and not _RELATIVE_RE.search(raw) and len(raw) >= 12:
                try:
                    ai_res = await self._ai_judge(exercise, raw, eff_skill, eff_keywords)
                    ai_note = str(ai_res.get("note", ""))
                    if ai_res.get("has_connection"):
                        eff_expected = list(set(eff_expected + [str(ai_res.get("marker", "") or "")]))
                except Exception as e:
                    logger.warning(f"[BuilderEvaluator] AI fallback failed: {e}")

        assessment = BuilderScoringPolicy.build(
            exercise_type if exercise_type in ("sentence_assemble", "sentence_expand", "sentence_repair") else "sentence_assemble",
            transcript=raw,
            keywords=eff_keywords,
            focus_skill=eff_skill,
            expected_connectors=eff_expected,
            relation=eff_relation,
            reaction_latency_ms=reaction_latency_ms,
            timer_limit_ms=eff_timer,
            speech_confidence=speech_confidence,
            timed_out=eff_timed_out,
            independence_level=independence,
            blind=eff_blind,
        )

        score = assessment.overall.score
        success = bool(raw) and not eff_timed_out and score >= 55.0
        is_perfect = success and assessment.coverage.score >= 80 and assessment.connection.score >= 80 and independence == "independent"

        if eff_timed_out or not raw:
            feedback = "Hết giờ mà chưa xây xong câu. Hãy thử scaffold có starter, hoặc rút keywords xuống 3 từ."
        elif missing:
            feedback = f"Thiếu từ khóa {missing}. Giữ lại ý đó và nối thêm: て/ので/relative clause. {ai_note}".strip()
        elif assessment.connection.score < 60:
            feedback = f"Câu còn cụt — hãy nối bằng {self._skill_hint(eff_skill)}. {ai_note}".strip()
        elif assessment.naturalness.score < 65:
            feedback = f"Nối tốt rồi! Giờ bản xứ hóa: {self._register_hint(eff_relation)}"
        else:
            feedback = "Câu dài, nối mượt, nghe tự nhiên — đúng chất bản xứ."

        return {
            "success": success,
            "score": score,
            "assessment": assessment.to_dict(),
            "feedback": feedback,
            "evidence": [f"User: {raw}", f"Keywords used: {used}", f"Focus: {eff_skill}"],
            "keywords_used": used,
            "keywords_missing": missing,
            "clauses": [c.to_dict() for c in assessment.clauses],
            "is_perfect": is_perfect,
        }

    def _skill_hint(self, skill: str | None) -> str:
        return {
            "te_chain": "Vて + V (見て、食べて), くて/で nối tính từ",
            "relative_clause": "mệnh đề quan hệ: 昨日買った本、駅前にできた店",
            "conditional": "たら/ば/なら cho điều kiện",
            "nominalization": "ので/わけ/んです cho lý do-kết quả",
            "contraction": "てる/ちゃう/じゃん + sentence-end よ/な",
        }.get(skill or "", "て/ので/relative clause")

    def _register_hint(self, relation: str | None) -> str:
        if relation == "business_polite":
            return "giữ です/ます nhất quán + ので thay vì て cụt."
        return "dùng てる・ちゃう・じゃん・よ/な thay vì ています・です."

    async def _ai_judge(self, exercise: Any, transcript: str, focus_skill: str | None, keywords: list[str]) -> dict[str, Any]:
        sys_inst = (
            "You judge a Japanese learner sentence for clause-chaining. Reply ONLY with JSON: "
            "{\"has_connection\": true|false, \"marker\": \"the chaining word or ''\", \"note\": \"short Vietnamese hint\"}."
        )
        user_content = f"Focus skill: {focus_skill}. Keywords: {keywords}. Sentence: 「{transcript}」"
        req = AIRequest(
            task=AITask.BUILDER_EVALUATION,
            system_instruction=sys_inst,
            messages=[AIMessage(role=AIMessageRole.SYSTEM, content=sys_inst), AIMessage(role=AIMessageRole.USER, content=user_content)],
            response_format=ResponseFormat(type=ResponseFormatType.JSON_OBJECT),
            temperature=0.2,
            max_output_tokens=250,
            user_id=getattr(exercise, "user_id", None),
        )
        resp = await self.ai_router.generate(task=AITask.BUILDER_EVALUATION, request=req, user_id=getattr(exercise, "user_id", None))
        txt = (resp.text or "").strip()
        if txt.startswith("```json"):
            txt = txt.replace("```json", "", 1).rstrip("```").strip()
        elif txt.startswith("```"):
            txt = txt.replace("```", "", 1).rstrip("```").strip()
        return json.loads(txt)
