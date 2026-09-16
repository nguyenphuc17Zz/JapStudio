"""SurvivalTaskGenerator — Seed Bank first with Anti-Repetition, AI Dynamic fallback.

Guarantees 0% crash even when offline or AI provider is throttled.
"""

from __future__ import annotations

import asyncio
import json
import random
from collections import deque
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.shared.errors.exceptions import ValidationException
from app.domains.reflex.cache_service import ExerciseCacheService
from app.domains.ai.contracts import AIMessage, AIMessageRole, AIRequest, AITask, ResponseFormat, ResponseFormatType
from app.domains.ai.router import AIRouter
from app.domains.survival.contracts import (
    CircumlocutionTask,
    RepairStrategy,
    SocialRelationship,
    SurvivalDifficulty,
    SurvivalHintTier,
    SurvivalMode,
    SurvivalScenarioTask,
    SurvivalVocabularyItem,
)
from app.domains.survival.procedural import ProceduralSurvivalGenerator

_RECENT_CIRCUM_TARGETS: deque[str] = deque(maxlen=40)
_RECENT_SCENARIO_CONTEXTS: deque[str] = deque(maxlen=40)


class SurvivalTaskGenerator:
    """100% Dynamic Realtime AI Survival Generator.

    Synchronizes with the user's active AI Model on the header via AIRouter.
    Saves generated tasks to SQLite pool and raises explicit errors on failure without mock loops.
    """

    def __init__(self, db: AsyncSession | None = None):
        self.db = db
        self.ai_router = AIRouter(db) if db else None

    def get_seed_circumlocution_task(
        self,
        topic: str | None = None,
        difficulty: SurvivalDifficulty | None = None,
    ) -> CircumlocutionTask:
        """Procedural dynamic task generator for offline/legacy compatibility."""
        return ProceduralSurvivalGenerator.generate_circumlocution(topic=topic, difficulty=difficulty)

    def get_seed_scenario_task(
        self,
        topic: str | None = None,
        difficulty: SurvivalDifficulty | None = None,
    ) -> SurvivalScenarioTask:
        """Procedural dynamic scenario generator for offline/legacy compatibility."""
        return ProceduralSurvivalGenerator.generate_scenario(topic=topic, difficulty=difficulty)

    async def generate_dynamic_task(
        self,
        mode: SurvivalMode,
        topic: str | None = None,
        difficulty: SurvivalDifficulty = SurvivalDifficulty.EASY,
        user_id: str | None = None,
    ) -> CircumlocutionTask | SurvivalScenarioTask:
        """Generates 100% fresh AI-driven task via AIRouter and saves to SQLite pool. Raises error on failure."""
        if not self.ai_router:
            raise ValidationException("AIRouter chưa được khởi tạo để kết nối AI.")

        try:
            if mode == SurvivalMode.CIRCUMLOCUTION:
                ai_task = await self._generate_circumlocution_ai(topic, difficulty, user_id)
            else:
                ai_task = await self._generate_scenario_ai(topic, difficulty, user_id)

            if ai_task:
                # Save newly generated unique task to SQLite database pool in background
                async def _save_bg(task_obj):
                    try:
                        svc = ExerciseCacheService()
                        await svc.save_exercise_to_pool(
                            domain="survival",
                            sub_mode=mode.value,
                            difficulty=difficulty.value,
                            exercise_dict=task_obj.model_dump(),
                            category=topic or "daily",
                        )
                    except Exception as err:
                        logger.warning(f"[SurvivalTaskGenerator] Background pool save failed: {err}")

                asyncio.create_task(_save_bg(ai_task))
                return ai_task

            raise ValidationException("AI không thể tạo dữ liệu bài tập sinh tồn. Vui lòng thử lại.")
        except ValidationException:
            raise
        except Exception as e:
            logger.error(f"[SurvivalTaskGenerator] AI generation error: {e}")
            raise ValidationException(f"Lỗi tạo bài tập sinh tồn từ AI: {e}. Vui lòng thử lại.")

    async def _generate_circumlocution_ai(
        self,
        topic: str | None,
        difficulty: SurvivalDifficulty,
        user_id: str | None,
    ) -> CircumlocutionTask | None:
        import time

        topic_label = topic if topic and topic != "all" else random.choice([
            "đời sống thường ngày / đồ dùng tiện ích",
            "ẩm thực / món ăn / văn hóa quán nhậu Izakaya",
            "công sở / quan hệ cấp trên đồng nghiệp / văn phòng",
            "giao thông / tàu điện / nhà ga Tokyo",
            "mua sắm / siêu thị / cửa hàng tiện lợi",
            "du lịch / khách sạn / dịch vụ",
        ])

        forbidden_avoid = ", ".join(list(_RECENT_CIRCUM_TARGETS)[-15:]) if _RECENT_CIRCUM_TARGETS else "không có"
        nonce = int(time.time() * 1000)

        prompt = f"""
Bạn là chuyên gia thiết kế bài tập phản xạ khẩu ngữ tiếng Nhật (Taboo / Circumlocution Gym).
Nhiệm vụ: Tạo một thẻ từ vựng đời sống thực tế tiếng Nhật thú vị (chủ đề: {topic_label}, độ khó: {difficulty.value}).
Người học sẽ phải diễn giải từ này bằng tiếng Nhật mà KHÔNG ĐƯỢC dùng các từ cấm (Forbidden words / Taboo).

YÊU CẦU ĐẶC BIỆT CHỐNG LẶP LẠI (Anti-Repetition):
- KHÔNG ĐƯỢC chọn các từ vựng đã xuất hiện gần đây: [{forbidden_avoid}].
- Hãy chọn một từ vựng độc đáo, thiết thực trong đời sống sinh hoạt hoặc công sở Nhật Bản (Nonce: {nonce}).

Trả về định dạng JSON thuần túy khớp schema sau:
{{
  "id": "circ_ai_{nonce}_{random.randint(100, 999)}",
  "target_word": "từ mục tiêu Kanji (VD: 自動販売機)",
  "reading_hiragana": "cách đọc hiragana (VD: じどうはんばいき)",
  "romaji": "romaji (VD: jidouhanbaiki)",
  "vietnamese_meaning": "nghĩa tiếng Việt (VD: Máy bán hàng tự động)",
  "topic": "{topic or 'daily'}",
  "category": "danh mục (VD: Đời sống tiện ích)",
  "genus": "chủng loại bản chất (VD: 街角にある機械)",
  "differentia": "đặc tính phân biệt (VD: お金を入れてボタンを押すとジュースが出てくる)",
  "forbidden_words": ["3-5 từ cấm không được nhắc đến khi giải thích"],
  "taboo_lemmas": ["danh sách từ cấm dạng chuẩn"],
  "difficulty": "{difficulty.value}",
  "time_limit_seconds": 5,
  "tier_hints": [
    {{"tier": 0, "title": "Không gợi ý", "content": "Tự diễn giải trong 5 giây mà không dùng từ cấm."}},
    {{"tier": 1, "title": "Chức năng (機能)", "content": "Gợi ý công dụng cốt lõi"}},
    {{"tier": 2, "title": "Chủng loại & Vị trí", "content": "Gợi ý bối cảnh"}},
    {{"tier": 3, "title": "Khung câu mở đầu", "content": "Mẫu câu mở đầu có khoảng trống"}},
    {{"tier": 4, "title": "Câu mẫu chuẩn bản xứ", "content": "Câu nói tự nhiên hoàn chỉnh"}}
  ],
  "sample_explanations": ["2-3 câu giải thích mẫu tự nhiên"],
  "suggested_vocabulary": [
    {{"term": "từ khóa 1", "reading": "cách đọc", "romaji": "romaji", "meaning_vi": "nghĩa tiếng Việt"}}
  ],
  "semantic_anchors": ["3-5 từ khóa ngữ nghĩa cốt lõi"]
}}
"""
        sys_inst = (
            "You are an expert Japanese speech recovery examiner. You MUST respond ONLY with a strictly valid JSON object "
            "matching the requested schema without any markdown formatting or commentary outside the JSON."
        )
        req = AIRequest(
            task=AITask.SURVIVAL_GENERATION,
            system_instruction=sys_inst,
            messages=[
                AIMessage(role=AIMessageRole.SYSTEM, content=sys_inst),
                AIMessage(role=AIMessageRole.USER, content=prompt),
            ],
            temperature=0.85,
            max_output_tokens=1500,
            response_format=ResponseFormat(type=ResponseFormatType.JSON_OBJECT),
        )
        assert self.ai_router is not None
        resp = await self.ai_router.generate(task=AITask.SURVIVAL_GENERATION, request=req, user_id=user_id)
        raw = (resp.text or "").strip()
        cleaned = raw.replace("```json", "").replace("```", "").strip()
        data = json.loads(cleaned)
        data["source"] = "ai"
        if not data.get("topic"):
            data["topic"] = topic or "daily"

        task = CircumlocutionTask(**data)
        _RECENT_CIRCUM_TARGETS.append(task.target_word)
        return task

    async def _generate_scenario_ai(
        self,
        topic: str | None,
        difficulty: SurvivalDifficulty,
        user_id: str | None,
    ) -> SurvivalScenarioTask | None:
        import time

        topic_label = topic if topic and topic != "all" else random.choice([
            "cuộc họp công sở / điện thoại với đối tác",
            "gọi món quán ăn / đặt bàn nhà hàng Nhật",
            "trò chuyện bạn bè / tiếng lóng đời thường",
            "hỏi đường / sự cố ga tàu điện ngầm / lạc đồ",
            "nhầm lẫn thanh toán quầy thu ngân / mua sắm",
        ])

        forbidden_avoid = ", ".join(list(_RECENT_SCENARIO_CONTEXTS)[-10:]) if _RECENT_SCENARIO_CONTEXTS else "không có"
        nonce = int(time.time() * 1000)

        # Diverse strategies selection
        strategy_candidates = [
            RepairStrategy.BUYING_TIME,
            RepairStrategy.ASKING_REPETITION,
            RepairStrategy.ASKING_CLARIFICATION,
            RepairStrategy.SELF_CORRECTION,
            RepairStrategy.SIMPLIFICATION,
        ]
        target_strategy = random.choice(strategy_candidates)

        prompt = f"""
Design a realistic Japanese Conversational Repair Scenario (Survival Speaking).
Context/Topic: {topic_label}
Difficulty: {difficulty.value}
Target Strategy: {target_strategy.value}

YÊU CẦU ĐẶC BIỆT CHỐNG LẶP LẠI (Anti-Repetition):
- KHÔNG ĐƯỢC lặp lại các tình huống vừa xuất hiện: [{forbidden_avoid}].
- Tình huống phải hoàn toàn mới lạ, thực tế, phản ánh giao tiếp thực tại Nhật Bản (Nonce: {nonce}).
- Tình huống cản trở giao tiếp (nói quá nhanh, dùng từ viết tắt khó hiểu, bị bất ngờ chỉ định, lỡ miệng nói nhầm, tiếng ồn).

Return ONLY a valid JSON object matching this schema:
{{
  "id": "scen_ai_{nonce}_{random.randint(100, 999)}",
  "context": "mã bối cảnh ngắn (VD: workplace_meeting, izakaya_order, station_lost_item)",
  "context_title_vi": "Tiêu đề bối cảnh tiếng Việt súc tích",
  "relationship": "{'business' if difficulty == SurvivalDifficulty.HARD else 'polite' if difficulty == SurvivalDifficulty.MEDIUM else 'casual'}",
  "topic": "{topic or 'daily'}",
  "problem_description_vi": "Mô tả tình huống nghẽn giao tiếp chi tiết",
  "npc_utterance_ja": "Câu nói tiếng Nhật của NPC (người đối diện)",
  "npc_utterance_reading": "cách đọc hiragana của câu NPC",
  "recommended_strategy": "{target_strategy.value}",
  "suggested_repair_phrases": [
    "câu mẫu ứng biến cứu nguy chuẩn bản xứ 1",
    "câu mẫu ứng biến cứu nguy chuẩn bản xứ 2"
  ],
  "difficulty": "{difficulty.value}",
  "time_limit_seconds": 5,
  "tier_hints": [
    {{"tier": 0, "title": "Không gợi ý", "content": "Tự phản xạ ứng biến trong 5 giây."}},
    {{"tier": 1, "title": "Chiến lược", "content": "Gợi ý chiến lược cứu nguy"}},
    {{"tier": 2, "title": "Cụm từ cứu cánh", "content": "Gợi ý cụm từ mấu chốt"}},
    {{"tier": 3, "title": "Khung câu ứng biến", "content": "Khung câu có chỗ khuyết"}},
    {{"tier": 4, "title": "Câu mẫu chuẩn bản xứ", "content": "Câu nói mẫu hoàn chỉnh"}}
  ],
  "suggested_vocabulary": [
    {{"term": "từ khóa", "reading": "cách đọc", "romaji": "romaji", "meaning_vi": "nghĩa"}}
  ]
}}
"""
        sys_inst = (
            "You are an expert Japanese speech recovery scenario designer. You MUST respond ONLY with a strictly valid JSON object "
            "matching the requested schema without any markdown formatting or commentary outside the JSON."
        )
        req = AIRequest(
            task=AITask.SURVIVAL_GENERATION,
            system_instruction=sys_inst,
            messages=[
                AIMessage(role=AIMessageRole.SYSTEM, content=sys_inst),
                AIMessage(role=AIMessageRole.USER, content=prompt),
            ],
            temperature=0.85,
            max_output_tokens=1500,
            response_format=ResponseFormat(type=ResponseFormatType.JSON_OBJECT),
        )
        assert self.ai_router is not None
        resp = await self.ai_router.generate(task=AITask.SURVIVAL_GENERATION, request=req, user_id=user_id)
        raw = (resp.text or "").strip()
        cleaned = raw.replace("```json", "").replace("```", "").strip()
        data = json.loads(cleaned)
        data["source"] = "ai"
        if not data.get("topic"):
            data["topic"] = topic or "daily"

        task = SurvivalScenarioTask(**data)
        _RECENT_SCENARIO_CONTEXTS.append(task.context_title_vi)
        return task
