"""AizuchiEvaluator — deterministic-first + AI fallback.

Deterministic path handles timing/variety/type/register checks.
AI fallback only when the backchannel type is unrecognized ('other')
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
from app.domains.aizuchi.pools import classify_bc_type
from app.domains.aizuchi.scoring import AizuchiScoringPolicy


def _norm(text: str) -> str:
    return re.sub(r"[。！？、\s\!\?\,\.\u3000]+", "", (text or "").strip())


class AizuchiEvaluator:
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
        window_ms: int | None = None,
        overlap_rude: bool = False,
        bc_type: str | None = None,
        session_turns: int = 1,
        distinct_types: int = 1,
        repeat_run: int = 1,
    ) -> dict[str, Any]:
        raw = (user_transcript or "").strip()
        norm = _norm(raw)

        aiz_cfg: dict[str, Any] = {}
        try:
            aiz_cfg = (exercise.extra_metadata or {}).get("aizuchi_config", {}) or {}
        except Exception:
            aiz_cfg = {}
        relation = aiz_cfg.get("relation", "casual_friend")
        expected_types: list[str] = list(aiz_cfg.get("expected_types") or [])
        eff_window = window_ms or aiz_cfg.get("window_ms") or timer_limit_ms
        eff_latency = reaction_latency_ms
        eff_timed_out = bool(timed_out or (not raw))

        det_type = bc_type or classify_bc_type(norm)

        # AI fallback: unrecognized backchannel with usable audio
        ai_type = None
        ai_conf = 0.0
        if det_type == "other" and raw and (speech_confidence or 0) >= 0.5:
            try:
                ai_res = await self._ai_classify(exercise, raw)
                ai_type = (ai_res.get("bc_type") or "").strip() or None
                ai_conf = float(ai_res.get("confidence", 0.5))
                if ai_type and ai_type in ("surprise", "empathy", "continuer", "followup", "polite_interrupt"):
                    det_type = ai_type
            except Exception as e:
                logger.warning(f"[AizuchiEvaluator] AI fallback failed: {e}")

        assessment = AizuchiScoringPolicy.build(
            exercise_type if exercise_type in ("aizuchi_reaction", "warikomi_interrupt") else "aizuchi_reaction",
            reaction_latency_ms=eff_latency,
            window_ms=eff_window,
            speech_confidence=speech_confidence,
            bc_type=det_type,
            expected_types=expected_types,
            relation=relation,
            transcript=raw,
            distinct_types=distinct_types,
            repeat_run=repeat_run,
            session_turns=session_turns,
            timed_out=eff_timed_out,
            overlap_rude=overlap_rude,
            independence_level=independence,
        )

        score = assessment.overall.score
        success = bool(raw) and not eff_timed_out and not overlap_rude and score >= 55.0
        is_perfect = (
            success and assessment.timing.score >= 80
            and assessment.appropriateness.score >= 80
            and independence == "independent"
        )

        if eff_timed_out or not raw:
            feedback = "Missed the window — hãy chêm ngay khi NPC ngừng lấy hơi (đèn xanh). Thử Slow Mode 900ms trước."
        elif overlap_rude:
            feedback = "Bạn chen ngang giữa chữ của NPC — hãy đợi khoảng lặng (pause) rồi hãy nói."
        elif assessment.appropriateness.score < 60:
            feedback = self._suggest(expected_types, relation, det_type)
        elif assessment.variety.score < 60:
            feedback = "Timing tốt! Giờ hãy đa dạng hơn: xoay vòng へー / 確かに / それで？ thay vì một kiểu."
        else:
            feedback = "Tuyệt vời — timing, loại aizuchi và thái độ đều tự nhiên như bản xứ."

        # Extract turn sample responses if available
        npc_turns = aiz_cfg.get("npc_turns") or []
        turn_idx = max(0, min(len(npc_turns) - 1, session_turns - 1)) if npc_turns else 0
        turn_data = npc_turns[turn_idx] if npc_turns else {}
        sample_responses = list(turn_data.get("sample_responses") or aiz_cfg.get("sample_responses") or [])

        return {
            "success": success,
            "score": score,
            "assessment": assessment.to_dict(),
            "feedback": feedback,
            "evidence": [f"User: {raw}", f"Type: {det_type}", f"Latency: {eff_latency}ms / window {eff_window}ms"],
            "bc_type": det_type,
            "is_perfect": is_perfect,
            "ai_confidence": ai_conf,
            "sample_responses": sample_responses,
        }

    def _suggest(self, expected: list[str], relation: str, got: str | None) -> str:
        hints = {
            "surprise": "ngạc nhiên → へー、マジで？、そうなんだ",
            "empathy": "đồng cảm → 確かに、だよね、大変だね",
            "continuer": "giữ mạch → うんうん、なるほど",
            "followup": "đẩy chuyện → それで？、で、どうしたの？",
            "polite_interrupt": "chen lịch sự → すみません、ちょっとよろしいでしょうか",
        }
        want = ", ".join(hints.get(t, t) for t in (expected or ["continuer"]))
        base = f"Chưa hợp lúc này (bạn dùng kiểu {got}). Gợi ý: {want}."
        if relation == "business_polite":
            base += " Chú ý: business dùng はい/なるほど/確かに, tránh うん・マジで."
        return base

    async def _ai_classify(self, exercise: Any, transcript: str) -> dict[str, Any]:
        sys_inst = (
            "You classify a Japanese backchannel (aizuchi) into exactly one type. "
            "Reply ONLY with JSON: {\"bc_type\": \"surprise|empathy|continuer|followup|polite_interrupt|other\", \"confidence\": 0.0-1.0}."
        )
        user_content = f"Backchannel: 「{transcript}」"
        req = AIRequest(
            task=AITask.AIZUCHI_EVALUATION,
            system_instruction=sys_inst,
            messages=[AIMessage(role=AIMessageRole.SYSTEM, content=sys_inst), AIMessage(role=AIMessageRole.USER, content=user_content)],
            response_format=ResponseFormat(type=ResponseFormatType.JSON_OBJECT),
            temperature=0.2,
            max_output_tokens=200,
            user_id=getattr(exercise, "user_id", None),
        )
        resp = await self.ai_router.generate(task=AITask.AIZUCHI_EVALUATION, request=req, user_id=getattr(exercise, "user_id", None))
        txt = (resp.text or "").strip()
        if txt.startswith("```json"):
            txt = txt.replace("```json", "", 1).rstrip("```").strip()
        elif txt.startswith("```"):
            txt = txt.replace("```", "", 1).rstrip("```").strip()
        parsed = json.loads(txt)
        return {"bc_type": parsed.get("bc_type", "other"), "confidence": max(0.0, min(1.0, float(parsed.get("confidence", 0.5))))}
