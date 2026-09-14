"""InterpretEvaluator — deterministic-first + AI fallback.

Deterministic path handles fidelity keywords, word order, Vietglish flags.
AI fallback only when fidelity is thin (paraphrased ideas missed by substring)
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
from app.domains.interpret.scoring import InterpretScoringPolicy


class InterpretEvaluator:
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
        expected_keywords: list[str] | None = None,
        blind: bool = False,
    ) -> dict[str, Any]:
        raw = (user_transcript or "").strip()

        cfg: dict[str, Any] = {}
        try:
            cfg = (exercise.extra_metadata or {}).get("interpret_config", {}) or {}
        except Exception:
            cfg = {}
        eff_keywords = expected_keywords if expected_keywords is not None else list(cfg.get("expected_ja_keywords", []))
        eff_relation = cfg.get("relation", "casual_friend")
        eff_timer = timer_limit_ms or cfg.get("timer_limit_ms")
        eff_blind = bool(blind or cfg.get("blind", False))
        eff_timed_out = bool(timed_out or (not raw))
        prompt_vi = cfg.get("prompt_vi", "")

        # AI fallback: ideas likely paraphrased (missed by substring) with usable audio
        ai_note = ""
        if raw and (speech_confidence or 0) >= 0.5 and eff_keywords:
            from app.domains.interpret.pools import fidelity_of

            _, missing, _ = fidelity_of(raw, eff_keywords)
            if missing and len(raw) >= 8:
                try:
                    ai_res = await self._ai_judge(exercise, prompt_vi, raw, missing)
                    recovered = [k for k in (ai_res.get("recovered_ideas") or []) if k in missing]
                    if recovered:
                        eff_keywords = [k for k in eff_keywords if k not in recovered]
                        ai_note = f"AI công nhận diễn đạt khác mà đúng ý: {recovered}."
                except Exception as e:
                    logger.warning(f"[InterpretEvaluator] AI fallback failed: {e}")

        assessment = InterpretScoringPolicy.build(
            exercise_type if exercise_type in ("interpret_word", "interpret_sentence", "interpret_situation") else "interpret_sentence",
            transcript=raw,
            expected_keywords=eff_keywords,
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
        is_perfect = success and assessment.fidelity.score >= 80 and not assessment.vietglish_flags and independence == "independent"

        if eff_timed_out or not raw:
            feedback = "Hết giờ mà chưa dịch xong. Hãy thử scaffold có keywords JA gợi ý trước."
        elif assessment.keywords_hit == [] and eff_keywords:
            feedback = f"Sót hết ý chính {eff_keywords}. Hãy giữ ý trước, chau chuốt sau. {ai_note}".strip()
        elif assessment.vietglish_flags:
            flag_hints = {
                "watashi_overuse": "bỏ bớt 私は",
                "svo_carryover": "đảo về SOV: を/に trước động từ",
                "missing_particle": "thêm trợ từ は/が/を/に/で",
                "desu_overuse_casual": "bạn bè thì dùng thể thường + よ/ね",
                "literal_roi_ma_thi": "đừng dịch逐字 rồi/mà/thì — dùng て/ので",
            }
            tips = ", ".join(flag_hints.get(f, f) for f in assessment.vietglish_flags)
            feedback = f"Đủ ý nhưng Vietglish: {tips}. {ai_note}".strip()
        elif assessment.naturalness.score < 70:
            feedback = "Đủ ý, đúng trật tự! Giờ bản xứ hóa: contraction + sentence-end đúng register."
        else:
            feedback = "Giữ đủ ý, đúng SOV, nghe tự nhiên — phiên dịch chuẩn."

        return {
            "success": success,
            "score": score,
            "assessment": assessment.to_dict(),
            "feedback": feedback,
            "evidence": [f"User: {raw}", f"Hit: {assessment.keywords_hit}", f"Flags: {assessment.vietglish_flags}"],
            "keywords_hit": assessment.keywords_hit,
            "vietglish_flags": assessment.vietglish_flags,
            "fidelity": [f.to_dict() for f in assessment.fidelity_map],
            "is_perfect": is_perfect,
            "reference_ja": cfg.get("reference_ja", ""),
        }

    async def _ai_judge(self, exercise: Any, prompt_vi: str, transcript: str, missing: list[str]) -> dict[str, Any]:
        sys_inst = (
            "You judge Vietnamese-to-Japanese interpretation. The learner may paraphrase ideas. "
            "Reply ONLY with JSON: {\"recovered_ideas\": [\"idea among the missing list that IS expressed\"], \"note\": \"short Vietnamese hint\"}."
        )
        user_content = f"Vietnamese source: 「{prompt_vi}」\nMissing ideas: {missing}\nLearner Japanese: 「{transcript}」"
        req = AIRequest(
            task=AITask.INTERPRET_EVALUATION,
            system_instruction=sys_inst,
            messages=[AIMessage(role=AIMessageRole.SYSTEM, content=sys_inst), AIMessage(role=AIMessageRole.USER, content=user_content)],
            response_format=ResponseFormat(type=ResponseFormatType.JSON_OBJECT),
            temperature=0.2,
            max_output_tokens=250,
            user_id=getattr(exercise, "user_id", None),
        )
        resp = await self.ai_router.generate(task=AITask.INTERPRET_EVALUATION, request=req, user_id=getattr(exercise, "user_id", None))
        txt = (resp.text or "").strip()
        if txt.startswith("```json"):
            txt = txt.replace("```json", "", 1).rstrip("```").strip()
        elif txt.startswith("```"):
            txt = txt.replace("```", "", 1).rstrip("```").strip()
        parsed = json.loads(txt)
        recovered = [str(x) for x in (parsed.get("recovered_ideas") or [])]
        return {"recovered_ideas": recovered, "note": str(parsed.get("note", ""))}
