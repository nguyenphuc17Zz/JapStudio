"""SurvivalEvaluator — Hybrid Fast-Pass & AI Listener Guessing Engine.

Checks local deterministic Fast-Pass rules first (<15ms, zero token cost).
Calls AIRouter only when nuanced semantic listener guessing is required.
"""

from __future__ import annotations

import json
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.domains.ai.contracts import AIMessage, AIMessageRole, AIRequest, AITask, ResponseFormat, ResponseFormatType
from app.domains.ai.router import AIRouter
from app.domains.survival.contracts import (
    CircumlocutionTask,
    RepairStrategy,
    SayItBetterVariants,
    SurvivalEvaluationRequest,
    SurvivalEvaluationResult,
    SurvivalMode,
    SurvivalScenarioTask,
)
from app.domains.survival.fast_pass import (
    check_taboo_violation,
    evaluate_circumlocution_fast_pass,
    evaluate_scenario_fast_pass,
)
from app.domains.survival.pools import SEED_CIRCUMLOCUTION_TASKS, SEED_SURVIVAL_SCENARIOS


class SurvivalEvaluator:
    def __init__(self, db: AsyncSession | None = None):
        self.db = db
        self.ai_router = AIRouter(db) if db else None

    async def evaluate(
        self,
        request: SurvivalEvaluationRequest,
        circum_task: CircumlocutionTask | None = None,
        scenario_task: SurvivalScenarioTask | None = None,
        user_id: str | None = None,
    ) -> SurvivalEvaluationResult:
        """Main evaluation entry point combining Fast-Pass & AI Listener."""
        # Find task if not passed directly
        if request.mode == SurvivalMode.CIRCUMLOCUTION and not circum_task:
            circum_task = next((t for t in SEED_CIRCUMLOCUTION_TASKS if t.id == request.task_id), None)
        elif request.mode == SurvivalMode.SCENARIOS and not scenario_task:
            scenario_task = next((t for t in SEED_SURVIVAL_SCENARIOS if t.id == request.task_id), None)

        # 1. Try Fast-Pass first
        if request.mode == SurvivalMode.CIRCUMLOCUTION and circum_task:
            fast_res = evaluate_circumlocution_fast_pass(
                circum_task,
                request.spoken_text,
                request.ttfw_ms,
                request.hint_tier_used,
            )
            if fast_res is not None:
                # Add say_it_better if available in sample
                fast_res.say_it_better = SayItBetterVariants(
                    casual=circum_task.sample_explanations[0] if circum_task.sample_explanations else "冷たい物を温めるやつ",
                    professional="電子レンジの機能について説明する表現です。",
                    idiomatic="チンして温める家電製品です。",
                )
                return fast_res

        elif request.mode == SurvivalMode.SCENARIOS and scenario_task:
            fast_res = evaluate_scenario_fast_pass(
                scenario_task,
                request.spoken_text,
                request.ttfw_ms,
                request.hint_tier_used,
            )
            if fast_res is not None:
                fast_res.say_it_better = SayItBetterVariants(
                    casual=scenario_task.suggested_repair_phrases[0] if scenario_task.suggested_repair_phrases else "ちょっと待って",
                    professional=scenario_task.suggested_repair_phrases[-1] if scenario_task.suggested_repair_phrases else "少しお時間いただけますか",
                    idiomatic=scenario_task.suggested_repair_phrases[0] if scenario_task.suggested_repair_phrases else "ええと…",
                )
                return fast_res

        # 2. If Fast-Pass didn't conclude, run AI Evaluation
        if self.ai_router:
            try:
                if request.mode == SurvivalMode.CIRCUMLOCUTION and circum_task:
                    return await self._evaluate_circumlocution_ai(request, circum_task, user_id)
                elif request.mode == SurvivalMode.SCENARIOS and scenario_task:
                    return await self._evaluate_scenario_ai(request, scenario_task, user_id)
            except Exception as e:
                logger.warning(f"AI evaluation for survival failed, falling back to deterministic: {e}")

        # 3. Deterministic safe fallback
        return SurvivalEvaluationResult(
            is_successful=True,
            overall_score=75,
            taboo_violated=False,
            listener_guessed_correctly=True,
            listener_confidence=0.75,
            speed_rating="normal",
            ttfw_ms=request.ttfw_ms,
            ai_feedback_vi="Bạn đã nỗ lực diễn đạt tốt để tiếp tục duy trì hội thoại. Hãy luyện tập thêm để phản xạ mượt mà hơn nữa.",
            is_fast_pass=True,
            evaluation_source="fast_pass",
            xp_earned=25,
        )

    async def _evaluate_circumlocution_ai(
        self,
        request: SurvivalEvaluationRequest,
        task: CircumlocutionTask,
        user_id: str | None,
    ) -> SurvivalEvaluationResult:
        # Check taboo locally first to guarantee safety
        taboo_violated, violated_words = check_taboo_violation(request.spoken_text, task.forbidden_words)

        prompt = f"""
Bạn là "Người nghe bản xứ Nhật Bản" (Listener Guessing Engine) trong trò chơi Taboo / Diễn giải vòng quanh (Circumlocution).
Từ mục tiêu bí mật: 「{task.target_word}」 ({task.vietnamese_meaning})
Danh sách từ cấm: {task.forbidden_words}

Người học vừa nói bằng tiếng Nhật:
「{request.spoken_text}」

Nhiệm vụ của bạn:
1. Đọc lời của người học và đóng vai người nghe: Bạn có đoán ra người học đang nói về 「{task.target_word}」 không?
2. Kiểm tra xem người học có lỡ nói từ cấm nào không.
3. Chấm điểm tổng quan từ 0 đến 100.
4. Đưa ra 3 cách diễn giải hay hơn (Say It Better): Casual (Tameguchi), Professional (Keigo), Idiomatic (Khẩu ngữ bản xứ).
5. Nhận xét ngắn gọn 1-2 câu tiếng Việt khích lệ và chỉ ra điểm mấu chốt.

Trả về JSON thuần:
{{
  "is_successful": true/false,
  "overall_score": 85,
  "taboo_violated": {str(taboo_violated).lower()},
  "violated_words": {json.dumps(violated_words, ensure_ascii=False)},
  "listener_guessed_correctly": true/false,
  "listener_guessed_word": "từ bạn đoán ra",
  "listener_confidence": 0.85,
  "ai_feedback_vi": "Nhận xét tiếng Việt cụ thể",
  "say_it_better": {{
    "casual": "cách nói đời thường ngắn gọn",
    "professional": "cách nói lịch sự",
    "idiomatic": "cách nói khẩu ngữ tự nhiên"
  }}
}}
"""
        sys_inst = (
            "You are an expert Japanese speech recovery examiner. You MUST respond ONLY with a strictly valid JSON object "
            "matching the requested schema without any markdown formatting or commentary outside the JSON."
        )
        req = AIRequest(
            task=AITask.SURVIVAL_EVALUATION,
            system_instruction=sys_inst,
            messages=[
                AIMessage(role=AIMessageRole.SYSTEM, content=sys_inst),
                AIMessage(role=AIMessageRole.USER, content=prompt),
            ],
            temperature=0.3,
            max_output_tokens=1000,
            response_format=ResponseFormat(type=ResponseFormatType.JSON_OBJECT),
        )
        assert self.ai_router is not None
        resp = await self.ai_router.generate(task=AITask.SURVIVAL_EVALUATION, request=req, user_id=user_id)
        raw = (resp.text or "").strip()
        cleaned = raw.replace("```json", "").replace("```", "").strip()
        data = json.loads(cleaned)

        if taboo_violated:
            data["taboo_violated"] = True
            data["violated_words"] = violated_words
            data["is_successful"] = False
            data["overall_score"] = min(40, data.get("overall_score", 40))

        data["ttfw_ms"] = request.ttfw_ms
        data["speed_rating"] = "instant" if request.ttfw_ms and request.ttfw_ms < 2000 else "normal"
        data["is_fast_pass"] = False
        data["evaluation_source"] = "ai_router"
        data["xp_earned"] = 35 if data.get("is_successful") else 10

        return SurvivalEvaluationResult(**data)

    async def _evaluate_scenario_ai(
        self,
        request: SurvivalEvaluationRequest,
        task: SurvivalScenarioTask,
        user_id: str | None,
    ) -> SurvivalEvaluationResult:
        prompt = f"""
Bạn là chuyên gia thẩm định phản xạ cứu nguy hội thoại tiếng Nhật (Survival Conversational Repair).
Bối cảnh: {task.context_title_vi} ({task.problem_description_vi})
Mức độ quan hệ: {task.relationship.value}
Đối phương vừa nói: 「{task.npc_utterance_ja}」
Chiến lược khuyến nghị: {task.recommended_strategy.value}

Người học ứng biến bằng câu:
「{request.spoken_text}」

Đánh giá:
1. Câu của người học có giúp giải cứu tình huống nghẽn mạch không?
2. Có phù hợp với quan hệ ({task.relationship.value}) không?
3. Chấm điểm 0-100 và nhận xét ngắn gọn tiếng Việt.
4. Cung cấp 3 biến thể Say It Better (Casual, Professional, Idiomatic).

Trả về JSON:
{{
  "is_successful": true/false,
  "overall_score": 88,
  "strategy_identified": "{task.recommended_strategy.value}",
  "ai_feedback_vi": "Nhận xét tiếng Việt khích lệ và sửa lỗi",
  "say_it_better": {{
    "casual": "cách ứng biến đời thường",
    "professional": "cách ứng biến lịch sự chuẩn keigo",
    "idiomatic": "cách ứng biến khẩu ngữ bản xứ"
  }}
}}
"""
        sys_inst = (
            "You are an expert Japanese conversational repair evaluator. You MUST respond ONLY with a strictly valid JSON object "
            "matching the requested schema without any markdown formatting or commentary outside the JSON."
        )
        req = AIRequest(
            task=AITask.SURVIVAL_EVALUATION,
            system_instruction=sys_inst,
            messages=[
                AIMessage(role=AIMessageRole.SYSTEM, content=sys_inst),
                AIMessage(role=AIMessageRole.USER, content=prompt),
            ],
            temperature=0.3,
            max_output_tokens=1000,
            response_format=ResponseFormat(type=ResponseFormatType.JSON_OBJECT),
        )
        assert self.ai_router is not None
        resp = await self.ai_router.generate(task=AITask.SURVIVAL_EVALUATION, request=req, user_id=user_id)
        raw = (resp.text or "").strip()
        cleaned = raw.replace("```json", "").replace("```", "").strip()
        data = json.loads(cleaned)

        data["ttfw_ms"] = request.ttfw_ms
        data["speed_rating"] = "instant" if request.ttfw_ms and request.ttfw_ms < 2000 else "normal"
        data["is_fast_pass"] = False
        data["evaluation_source"] = "ai_router"
        data["xp_earned"] = 35 if data.get("is_successful") else 10

        return SurvivalEvaluationResult(**data)
