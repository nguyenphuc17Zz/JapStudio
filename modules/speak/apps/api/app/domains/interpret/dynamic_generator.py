from __future__ import annotations

import asyncio
import json
import random
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.shared.errors.exceptions import ValidationException
from app.domains.ai.contracts import AIMessage, AIMessageRole, AIRequest, AITask, ResponseFormat, ResponseFormatType
from app.domains.ai.router import AIRouter
from app.domains.interpret.exercise_factory import InterpretExerciseFactory
from app.domains.reflex.cache_service import ExerciseCacheService

# 30+ bối cảnh phiên dịch Việt - Nhật thực tế, đời thường và công sở
INTERPRET_SCENARIO_SEEDS = [
    # Công sở & Doanh nghiệp
    ("Họp trực tuyến với đối tác Nhật", "thông báo đường truyền mạng chập chờn, xin chia sẻ màn hình báo cáo, nhờ nhắc lại câu hỏi"),
    ("Xin nghỉ ốm đột xuất", "mô tả bị sốt cao từ đêm qua, xin nghỉ phép 1 ngày và nhờ đồng nghiệp hỗ trợ khách"),
    ("Tiến độ dự án bị chậm", "thông báo tiến độ chậm 2 ngày do phát sinh lỗi kỹ thuật, xin lỗi và đề xuất phương án OT"),
    ("Chào đón khách hàng Nhật", "đón đoàn khách tại sân bay, mời về khách sạn nghỉ ngơi, hẹn giờ đón đi ăn tối"),
    ("Bàn giao công việc", "hướng dẫn quy trình gửi email cho đối tác, chỉ chỗ lưu trữ tài liệu mật trên server"),
    ("Thương lượng giá cả", "xin giảm giá 5% cho đơn hàng số lượng lớn, hỏi về điều kiện thanh toán và thời hạn giao hàng"),
    # Ẩm thực & Nhà hàng
    ("Giới thiệu món ăn Việt cho người Nhật", "giới thiệu phở bò tái nạm, hướng dẫn cách vắt chanh và ăn kèm rau thơm"),
    ("Kể về văn hóa cà phê vỉa hè", "mời bạn Nhật đi uống cà phê sữa đá ven đường, kể về nhịp sống thư thả buổi sáng"),
    ("Đi ăn nhà hàng tại Tokyo", "hỏi phục vụ quán có menu tiếng Anh không, hỏi món nào đặc sản được ưa chuộng nhất"),
    ("Hỏi về dị ứng thực phẩm", "báo với đầu bếp là bản thân bị dị ứng hải sản có vỏ, nhờ đổi sang thịt gà"),
    # Đời sống thường nhật & Gia đình
    ("Không khí Tết cổ truyền", "kể về phong tục dọn dẹp nhà cửa đón Tết, gói bánh chưng cùng gia đình, chúc Tết ông bà"),
    ("Mừng tuổi & Lì xì", "giải thích ý nghĩa phong bao lì xì đỏ chúc may mắn đầu năm cho trẻ con"),
    ("Giao thông & Kẹt xe", "than phiền về cảnh kẹt xe vào giờ tan tầm trời mưa, khuyên bạn nên đi tàu điện ngầm"),
    ("Hỏi thăm sức khỏe", "hỏi thăm đồng nghiệp vừa khỏi ốm đi làm lại, dặn dò chú ý giữ ấm vào mùa đông"),
    ("Nuôi thú cưng", "kể chuyện chú cún cưng ở nhà hay mừng rỡ quấn quýt mỗi khi chủ đi làm về"),
    # Du lịch & Trải nghiệm
    ("Hỏi đường tại nhà ga phức tạp", "hỏi nhân viên ga tàu cách đổi tuyến sang line Yamanote, tìm cửa ra phía Tây"),
    ("Đặt phòng khách sạn Ryokan", "hỏi về dịch vụ đưa đón từ ga, hỏi xem phòng có kèm bữa tối Kaiseki không"),
    ("Mua sắm đồ điện tử & Quà lưu niệm", "hỏi xem mặt hàng này có được miễn thuế Duty-Free không, xin bọc quà tặng riêng"),
    ("Check-in khách sạn", "báo có đặt phòng trước qua mạng, xin mượn thêm bàn ủi và hỏi giờ phục vụ bữa sáng"),
    # Sự cố & Khẩn cấp
    ("Quên đồ trên xe taxi", "mô tả chiếc túi xách màu đen để quên ở ghế sau taxi lúc 2 giờ chiều"),
    ("Khám bệnh tại phòng khám", "kể triệu chứng đau bụng âm ỉ từ tối qua sau khi ăn đồ lạnh, hỏi thuốc uống mấy lần"),
]


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
        force_ai: bool = False,
        recent_prompts: list[str] | None = None,
    ) -> dict[str, Any]:
        """Generates 100% fresh AI exercise and saves to SQLite pool. Raises explicit error on failure."""
        try:
            data = await self._ai_generate(
                sub_mode=sub_mode,
                relation=relation,
                difficulty=difficulty,
                topic=topic,
                user_id=user_id,
                force_ai=force_ai,
                recent_prompts=recent_prompts,
            )
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
            raise ValidationException("AI không thể tạo câu luyện dịch. Vui lòng thử lại.")
        except ValidationException:
            raise
        except Exception as e:
            logger.error(f"[AIInterpretGenerator] AI generation failed: {e}")
            raise ValidationException(f"Lỗi tạo bài luyện dịch từ AI: {e}. Vui lòng thử lại.")


    async def _ai_generate(
        self,
        sub_mode: str,
        relation: str,
        difficulty: str,
        topic: str | None,
        user_id: str | None,
        force_ai: bool = False,
        recent_prompts: list[str] | None = None,
    ) -> dict[str, Any] | None:
        register = "タメ口 casual (thân mật bạn bè/người thân)" if relation != "business_polite" else "丁寧語・敬語 business (lịch sự công sở/đối tác)"
        
        # Bốc ngẫu nhiên một ngữ cảnh độc đáo
        chosen_scenario, scenario_desc = random.choice(INTERPRET_SCENARIO_SEEDS)
        topic_label = topic or chosen_scenario

        if sub_mode == "interpret_word":
            task_desc = f"One practical Vietnamese word/phrase in context of '{chosen_scenario}' ({scenario_desc}) a learner must say in Japanese."
            fmt = "{\"prompt_vi\": \"...\", \"expected_ja_keywords\": [\"...\"], \"reference_ja\": \"...\"}"
        elif sub_mode == "interpret_situation":
            task_desc = f"One realistic workplace/daily Vietnamese situation in '{chosen_scenario}' ({scenario_desc}) requiring a natural Japanese spoken explanation."
            fmt = "{\"prompt_vi\": \"...\", \"expected_ja_keywords\": [\"...\", \"...\", \"...\"], \"reference_ja\": \"...\"}"
        else:
            task_desc = f"One natural, complete Vietnamese sentence about '{chosen_scenario}' ({scenario_desc}) to be interpreted into Japanese."
            fmt = "{\"prompt_vi\": \"...\", \"expected_ja_keywords\": [\"...\", \"...\", \"...\"], \"reference_ja\": \"...\"}"
            
        sys_inst = (
            "You create authentic Vietnamese-to-Japanese interpretation drills for language learners. "
            "Every prompt must be high-frequency, practical, vivid, and culturally accurate. "
            "expected_ja_keywords are the core Japanese ideas the learner MUST keep (2-4 items). "
            "reference_ja is a natural native model answer. "
            f"Reply ONLY with JSON: {fmt}."
        )

        nonce_key = str(uuid.uuid4())[:8]
        anti_repeat_clause = ""
        if recent_prompts and len(recent_prompts) > 0:
            cleaned_recent = [p for p in recent_prompts if p and len(p) > 2][-5:]
            if cleaned_recent:
                anti_repeat_clause = (
                    f"\n[CHỐNG TRÙNG LẶP] Người học vừa luyện các câu sau:\n"
                    + "\n".join(f"- {p}" for p in cleaned_recent)
                    + "\nTUYỆT ĐỐI KHÔNG sinh câu hoặc ý tứ tương tự các câu trên!\n"
                )

        user_content = (
            f"Mode: {sub_mode}. Register: {register}. Difficulty: {difficulty}. Topic/Theme: {topic_label}.\n"
            f"Tình huống cụ thể: {chosen_scenario} — {scenario_desc}. [Nonce: {nonce_key}]\n"
            f"{anti_repeat_clause}"
            f"Task: {task_desc}"
        )

        req = AIRequest(
            task=AITask.INTERPRET_GENERATION,
            system_instruction=sys_inst,
            messages=[AIMessage(role=AIMessageRole.SYSTEM, content=sys_inst), AIMessage(role=AIMessageRole.USER, content=user_content)],
            response_format=ResponseFormat(type=ResponseFormatType.JSON_OBJECT),
            temperature=0.92,
            max_output_tokens=550,
            user_id=user_id,
            metadata={"idempotency_key": str(uuid.uuid4())},
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
            "topic": topic or chosen_scenario,
            "relation": relation,
            "timer_limit_ms": {"interpret_word": 8000, "interpret_sentence": 20000, "interpret_situation": 30000}.get(sub_mode, 20000),
            "difficulty": difficulty,
        }
