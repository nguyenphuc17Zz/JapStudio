"""Writing Drill Generator (Phase 18).

Maps learner writing weaknesses into tailored drill sequences,
designs a 4-stage guided -> free progression, enforces transfer of learning
through contextual variety, and provides 100% resilient deterministic fallback generation.
"""

from __future__ import annotations

import logging
from typing import Any

from app.core.config import Settings, get_settings
from app.models.writing_intelligence import WritingWeakness
from app.prompts.writing_drill_generator import (
    build_drill_debrief_prompt,
    build_drill_evaluation_prompt,
    build_writing_drill_prompt,
)
from app.schemas.writing_drill import (
    DrillGuidanceLevel,
    WritingDrillType,
)
from app.schemas.writing_drill_ai import (
    DrillDebriefResult,
    DrillEvaluationResult,
    WritingDrillDraft,
    WritingDrillItemDraft,
)
from app.services.ai_service import AIService

logger = logging.getLogger("app.writing_drill_generator")

# Adaptive Drill Selection Matrix (weakness category, subtype) -> sequence of 4 drill types
DRILL_TYPE_SELECTION_MATRIX: dict[tuple[str, str], list[WritingDrillType]] = {
    # Grammar
    ("grammar", "particles"): [
        WritingDrillType.RECOGNITION,
        WritingDrillType.PATTERN_SUBSTITUTION,
        WritingDrillType.CORRECTION,
        WritingDrillType.VIETNAMESE_TO_JAPANESE,
    ],
    ("grammar", "conjugation"): [
        WritingDrillType.RECOGNITION,
        WritingDrillType.PATTERN_SUBSTITUTION,
        WritingDrillType.CORRECTION,
        WritingDrillType.VIETNAMESE_TO_JAPANESE,
    ],
    ("grammar", "tense_aspect"): [
        WritingDrillType.RECOGNITION,
        WritingDrillType.PATTERN_SUBSTITUTION,
        WritingDrillType.CORRECTION,
        WritingDrillType.VIETNAMESE_TO_JAPANESE,
    ],
    ("grammar", "modifiers"): [
        WritingDrillType.RECOGNITION,
        WritingDrillType.PATTERN_SUBSTITUTION,
        WritingDrillType.REWRITE,
        WritingDrillType.FREE_RESPONSE,
    ],
    ("grammar", "clause_connection"): [
        WritingDrillType.RECOGNITION,
        WritingDrillType.PATTERN_SUBSTITUTION,
        WritingDrillType.REWRITE,
        WritingDrillType.FREE_RESPONSE,
    ],
    ("grammar", "sentence_structure"): [
        WritingDrillType.RECOGNITION,
        WritingDrillType.CORRECTION,
        WritingDrillType.REWRITE,
        WritingDrillType.VIETNAMESE_TO_JAPANESE,
    ],
    # Lexicon
    ("lexicon", "collocation"): [
        WritingDrillType.RECOGNITION,
        WritingDrillType.PATTERN_SUBSTITUTION,
        WritingDrillType.VIETNAMESE_TO_JAPANESE,
        WritingDrillType.FREE_RESPONSE,
    ],
    ("lexicon", "wrong_word_choice"): [
        WritingDrillType.RECOGNITION,
        WritingDrillType.CORRECTION,
        WritingDrillType.REWRITE,
        WritingDrillType.VIETNAMESE_TO_JAPANESE,
    ],
    ("lexicon", "synonym_confusion"): [
        WritingDrillType.RECOGNITION,
        WritingDrillType.PATTERN_SUBSTITUTION,
        WritingDrillType.REWRITE,
        WritingDrillType.FREE_RESPONSE,
    ],
    ("lexicon", "vocabulary_precision"): [
        WritingDrillType.RECOGNITION,
        WritingDrillType.CORRECTION,
        WritingDrillType.REWRITE,
        WritingDrillType.FREE_RESPONSE,
    ],
    ("lexicon", "overuse"): [
        WritingDrillType.RECOGNITION,
        WritingDrillType.PATTERN_SUBSTITUTION,
        WritingDrillType.REWRITE,
        WritingDrillType.FREE_RESPONSE,
    ],
    # Naturalness
    ("naturalness", "literal_translation"): [
        WritingDrillType.VIETNAMESE_TO_JAPANESE,
        WritingDrillType.JAPANESE_TO_NATURAL_REWRITE,
        WritingDrillType.REWRITE,
        WritingDrillType.FREE_RESPONSE,
    ],
    ("naturalness", "vietnamese_transfer"): [
        WritingDrillType.VIETNAMESE_TO_JAPANESE,
        WritingDrillType.JAPANESE_TO_NATURAL_REWRITE,
        WritingDrillType.REWRITE,
        WritingDrillType.FREE_RESPONSE,
    ],
    ("naturalness", "unnatural_phrase"): [
        WritingDrillType.CORRECTION,
        WritingDrillType.JAPANESE_TO_NATURAL_REWRITE,
        WritingDrillType.REWRITE,
        WritingDrillType.FREE_RESPONSE,
    ],
    ("naturalness", "redundant_expression"): [
        WritingDrillType.CORRECTION,
        WritingDrillType.JAPANESE_TO_NATURAL_REWRITE,
        WritingDrillType.REWRITE,
        WritingDrillType.FREE_RESPONSE,
    ],
    ("naturalness", "repetitive_expression"): [
        WritingDrillType.RECOGNITION,
        WritingDrillType.REWRITE,
        WritingDrillType.PATTERN_SUBSTITUTION,
        WritingDrillType.FREE_RESPONSE,
    ],
    ("naturalness", "Japanese_native_preference"): [
        WritingDrillType.CORRECTION,
        WritingDrillType.JAPANESE_TO_NATURAL_REWRITE,
        WritingDrillType.REWRITE,
        WritingDrillType.FREE_RESPONSE,
    ],
    # Register
    ("register", "casual_polite_mismatch"): [
        WritingDrillType.RECOGNITION,
        WritingDrillType.REWRITE,
        WritingDrillType.PATTERN_SUBSTITUTION,
        WritingDrillType.REAL_WORLD_MINI_TASK,
    ],
    ("register", "business_register"): [
        WritingDrillType.RECOGNITION,
        WritingDrillType.REWRITE,
        WritingDrillType.PATTERN_SUBSTITUTION,
        WritingDrillType.REAL_WORLD_MINI_TASK,
    ],
    ("register", "keigo"): [
        WritingDrillType.RECOGNITION,
        WritingDrillType.REWRITE,
        WritingDrillType.PATTERN_SUBSTITUTION,
        WritingDrillType.REAL_WORLD_MINI_TASK,
    ],
    ("register", "written_spoken_mismatch"): [
        WritingDrillType.RECOGNITION,
        WritingDrillType.REWRITE,
        WritingDrillType.PATTERN_SUBSTITUTION,
        WritingDrillType.FREE_RESPONSE,
    ],
    ("register", "excessive_politeness"): [
        WritingDrillType.RECOGNITION,
        WritingDrillType.CORRECTION,
        WritingDrillType.REWRITE,
        WritingDrillType.REAL_WORLD_MINI_TASK,
    ],
    ("register", "insufficient_politeness"): [
        WritingDrillType.RECOGNITION,
        WritingDrillType.CORRECTION,
        WritingDrillType.REWRITE,
        WritingDrillType.REAL_WORLD_MINI_TASK,
    ],
    # Discourse
    ("discourse", "coherence"): [
        WritingDrillType.RECOGNITION,
        WritingDrillType.REWRITE,
        WritingDrillType.PATTERN_SUBSTITUTION,
        WritingDrillType.FREE_RESPONSE,
    ],
    ("discourse", "cohesion"): [
        WritingDrillType.RECOGNITION,
        WritingDrillType.REWRITE,
        WritingDrillType.PATTERN_SUBSTITUTION,
        WritingDrillType.FREE_RESPONSE,
    ],
    ("discourse", "organization"): [
        WritingDrillType.RECOGNITION,
        WritingDrillType.REWRITE,
        WritingDrillType.PATTERN_SUBSTITUTION,
        WritingDrillType.FREE_RESPONSE,
    ],
    ("discourse", "topic_continuity"): [
        WritingDrillType.RECOGNITION,
        WritingDrillType.REWRITE,
        WritingDrillType.PATTERN_SUBSTITUTION,
        WritingDrillType.FREE_RESPONSE,
    ],
    ("discourse", "transition"): [
        WritingDrillType.RECOGNITION,
        WritingDrillType.PATTERN_SUBSTITUTION,
        WritingDrillType.REWRITE,
        WritingDrillType.FREE_RESPONSE,
    ],
    ("discourse", "insufficient_elaboration"): [
        WritingDrillType.PATTERN_SUBSTITUTION,
        WritingDrillType.REWRITE,
        WritingDrillType.FREE_RESPONSE,
        WritingDrillType.REAL_WORLD_MINI_TASK,
    ],
}

DEFAULT_DRILL_TYPES = [
    WritingDrillType.RECOGNITION,
    WritingDrillType.CORRECTION,
    WritingDrillType.REWRITE,
    WritingDrillType.VIETNAMESE_TO_JAPANESE,
]

STAGE_GUIDANCE_MAP = {
    1: DrillGuidanceLevel.HEAVY_GUIDANCE,
    2: DrillGuidanceLevel.LIGHT_GUIDANCE,
    3: DrillGuidanceLevel.MINIMAL_GUIDANCE,
    4: DrillGuidanceLevel.NO_GUIDANCE,
}


class WritingDrillGenerator:
    """Generates targeted remedial writing drill sequences with 4-stage progression."""

    def __init__(
        self,
        ai_service: AIService | None = None,
        settings: Settings | None = None,
    ) -> None:
        self._settings = settings or get_settings()
        self._ai = ai_service or AIService(settings=self._settings)

    @staticmethod
    def select_drill_types(category: str, subtype: str) -> list[WritingDrillType]:
        """Deterministically selects appropriate drill types based on weakness taxonomy."""
        key = (category.lower().strip(), subtype.lower().strip())
        if key in DRILL_TYPE_SELECTION_MATRIX:
            return list(DRILL_TYPE_SELECTION_MATRIX[key])

        # Category fallback
        for (cat, _), types in DRILL_TYPE_SELECTION_MATRIX.items():
            if cat == category.lower().strip():
                return list(types)

        return list(DEFAULT_DRILL_TYPES)

    async def generate_drill_draft(
        self,
        weakness: WritingWeakness | dict[str, Any],
        mastery_score: float = 0.0,
        user_level: str = "N3",
        prior_evidence: list[str] | None = None,
        register: str = "polite",
        context_domain: str | None = None,
        recent_mistakes: list[str] | None = None,
        vocabulary_profile: list[str] | None = None,
        provider: str | None = None,
        model: str | None = None,
    ) -> WritingDrillDraft:
        """Generates a complete multi-stage drill sequence via AI with deterministic fallback."""
        category = getattr(weakness, "category", None) or (
            weakness.get("category") if isinstance(weakness, dict) else "grammar"
        )
        subtype = getattr(weakness, "subtype", None) or (
            weakness.get("subtype") if isinstance(weakness, dict) else "particles"
        )
        description = getattr(weakness, "description", None) or (
            weakness.get("description") if isinstance(weakness, dict) else ""
        )

        selected_types = self.select_drill_types(category, subtype)
        selected_types_str = [t.value for t in selected_types]

        system, user = build_writing_drill_prompt(
            weakness=weakness,
            mastery_score=mastery_score,
            user_level=user_level,
            prior_evidence=prior_evidence,
            register=register,
            context_domain=context_domain,
            recent_mistakes=recent_mistakes,
            vocabulary_profile=vocabulary_profile,
            selected_drill_types=selected_types_str,
        )

        try:
            result, _ = await self._ai.generate_structured(
                user,
                WritingDrillDraft,
                system=system,
                provider=provider,
                model=model,
            )
            assert isinstance(result, WritingDrillDraft)
            # Normalize and enforce 4-stage progression
            self._normalize_stages(result, selected_types)
            return result
        except Exception as exc:
            logger.warning(
                "AI writing drill generation failed, falling back to deterministic generator: %s",
                exc,
            )
            return self.generate_fallback_drills(
                category=category,
                subtype=subtype,
                description=description,
                user_level=user_level,
                selected_types=selected_types,
            )

    def _normalize_stages(
        self, draft: WritingDrillDraft, selected_types: list[WritingDrillType]
    ) -> None:
        """Ensures the generated sequence strictly adheres to stage 1 -> stage 4 progression."""
        for idx, item in enumerate(draft.items):
            stage = min(4, max(1, idx + 1))
            item.stage = stage
            item.guidance_level = STAGE_GUIDANCE_MAP[stage].value
            if idx < len(selected_types):
                # Ensure drill_type is one of the supported types
                try:
                    WritingDrillType(item.drill_type)
                except ValueError:
                    item.drill_type = selected_types[idx].value

    def generate_fallback_drills(
        self,
        category: str,
        subtype: str,
        description: str,
        user_level: str = "N3",
        selected_types: list[WritingDrillType] | None = None,
    ) -> WritingDrillDraft:
        """Deterministic 100% offline fallback drill generator."""
        types = selected_types or self.select_drill_types(category, subtype)
        title = f"Luyện tập trọng điểm: {description or subtype}"
        target_focus = f"Làm chủ quy tắc {subtype} trong câu tiếng Nhật"

        items: list[WritingDrillItemDraft] = []

        # Stage 1: Recognition / Heavy Guidance
        items.append(
            WritingDrillItemDraft(
                drill_type=types[0].value,
                stage=1,
                guidance_level=DrillGuidanceLevel.HEAVY_GUIDANCE.value,
                title_vi="Bước 1: Nhận diện và phân biệt quy tắc chuẩn",
                instructions_vi="Chọn đáp án chính xác nhất để hoàn thành câu.",
                context_description="Giao tiếp tình huống công việc và đời sống.",
                source_text="会議___資料を準備します。(chuẩn bị tài liệu ở phòng họp)",
                scaffold="Cấu trúc mẫu: [Địa điểm diễn ra hành động] + で + [Hành động]",
                hints=[
                    "Phân biệt rõ giữa trợ từ chỉ nơi chốn hành động (で) và đích đến/sự tồn tại (に).",
                    "Hành động 'chuẩn bị tài liệu' diễn ra tại phòng họp.",
                ],
                options=[
                    {
                        "id": "a",
                        "text": "で",
                        "is_correct": True,
                        "explanation": "Chính xác, で biểu thị địa điểm diễn ra hành động.",
                    },
                    {
                        "id": "b",
                        "text": "に",
                        "is_correct": False,
                        "explanation": "Sai, に dùng cho sự tồn tại hoặc hướng đến.",
                    },
                    {
                        "id": "c",
                        "text": "を",
                        "is_correct": False,
                        "explanation": "Sai, を đi kèm trực tiếp với tân ngữ.",
                    },
                ],
                target_answer="会議室で資料を準備します。",
                accepted_alternatives=["会議室で資料を用意します。"],
                explanation="Khi một hành động diễn ra tại một địa điểm, danh từ địa điểm đi với trợ từ で.",
                target_focus=f"Quy tắc chuẩn {subtype} (Giai đoạn 1)",
            )
        )

        # Stage 2: Correction / Light Guidance
        items.append(
            WritingDrillItemDraft(
                drill_type=types[1].value,
                stage=2,
                guidance_level=DrillGuidanceLevel.LIGHT_GUIDANCE.value,
                title_vi="Bước 2: Phát hiện và sửa lỗi trong câu",
                instructions_vi="Sửa phần chưa tự nhiên hoặc sai sót trong câu sau.",
                context_description="Tin nhắn báo cáo tiến độ công việc.",
                source_text="カフェにパソコンを使って仕事をしています。",
                scaffold="Khung sửa: カフェ[___]パソコンを使って仕事をしています。",
                hints=[
                    "Hành động 'dùng máy tính làm việc' đang diễn ra tại quán cà phê.",
                ],
                options=None,
                target_answer="カフェでパソコンを使って仕事をしています。",
                accepted_alternatives=["カフェでパソコンを使って作業しています。"],
                explanation="Sửa に thành で vì 'làm việc' là hành động diễn ra tại quán cà phê.",
                target_focus=f"Sửa lỗi quy tắc {subtype} (Giai đoạn 2)",
            )
        )

        # Stage 3: Rewrite or Translation / Minimal Guidance
        items.append(
            WritingDrillItemDraft(
                drill_type=types[2].value,
                stage=3,
                guidance_level=DrillGuidanceLevel.MINIMAL_GUIDANCE.value,
                title_vi="Bước 3: Chuyển ngữ & Ứng dụng quy tắc",
                instructions_vi="Dịch hoặc viết lại câu sang tiếng Nhật tự nhiên chuẩn quy tắc.",
                context_description="Kể về trải nghiệm làm việc nhóm tại văn phòng mới.",
                source_text="Hôm qua nhóm chúng tôi đã cùng nhau thảo luận tại sảnh chính.",
                scaffold=None,
                hints=[
                    "Sảnh chính là メインロビー hoặc ロビー, thảo luận là 話し合いをしました / 議論しました.",
                ],
                options=None,
                target_answer="昨日、私たちはロビーで話し合いをしました。",
                accepted_alternatives=[
                    "昨日ロビーでチームメンバーと話し合いました。",
                    "昨日、ロビーで打ち合わせをしました。",
                ],
                explanation="Áp dụng trợ từ で sau ロビー và dùng động từ tự nhiên.",
                target_focus=f"Vận dụng quy tắc {subtype} (Giai đoạn 3)",
            )
        )

        # Stage 4: Free Response / No Guidance
        items.append(
            WritingDrillItemDraft(
                drill_type=types[3].value,
                stage=4,
                guidance_level=DrillGuidanceLevel.NO_GUIDANCE.value,
                title_vi="Bước 4: Ứng dụng độc lập trong ngữ cảnh mới",
                instructions_vi="Hãy viết 1 câu hoàn chỉnh áp dụng điểm ngữ pháp/kết hợp từ đã học.",
                context_description="Tự do miêu tả một thói quen hoặc hoạt động của bạn.",
                source_text="Hãy viết 1 câu miêu tả địa điểm bạn thường đọc sách hoặc học tập vào buổi tối.",
                scaffold=None,
                hints=[],
                options=None,
                target_answer="毎晩、自分の部屋で日本語を勉強しています。",
                accepted_alternatives=[
                    "夜はいつもリビングで本を読んでいます。",
                    "毎晩、図書館で集中して勉強します。",
                ],
                explanation="Câu đúng cấu trúc, ngữ pháp chuẩn và diễn đạt thuần Nhật.",
                target_focus=f"Sản sinh tự do {subtype} (Giai đoạn 4)",
            )
        )

        return WritingDrillDraft(
            title=title,
            target_focus=target_focus,
            difficulty=5,
            jlpt_level=user_level,
            items=items,
        )

    async def evaluate_attempt(
        self,
        item: dict[str, Any],
        user_answer: str,
        attempt_number: int = 1,
        provider: str | None = None,
        model: str | None = None,
    ) -> DrillEvaluationResult:
        """Evaluates a drill item attempt with semantic scoring, nuance contrast, and feedback."""
        drill_type = item.get("drill_type", "")
        clean_answer = user_answer.strip()

        # Fast-path for recognition drill
        if drill_type == WritingDrillType.RECOGNITION.value and item.get("options"):
            for opt in item.get("options", []):
                opt_id = str(opt.get("id", "")).lower()
                opt_text = str(opt.get("text", "")).strip()
                if clean_answer.lower() == opt_id or clean_answer == opt_text:
                    if opt.get("is_correct"):
                        return DrillEvaluationResult(
                            is_correct=True,
                            score=100,
                            feedback_vi=opt.get("explanation")
                            or "Chính xác! Bạn đã chọn đúng đáp án chuẩn.",
                            nuance_contrast=None,
                            corrected_text=None,
                            key_points_covered=[item.get("target_focus", "Nhận diện chính xác")],
                        )
                    else:
                        return DrillEvaluationResult(
                            is_correct=False,
                            score=30,
                            feedback_vi=opt.get("explanation") or "Lựa chọn này chưa chính xác.",
                            nuance_contrast=None,
                            corrected_text=item.get("target_answer"),
                            key_points_covered=[],
                        )

        # Fast-path exact target or accepted alternatives
        target_ans = str(item.get("target_answer", "")).strip()
        alts = [str(a).strip() for a in item.get("accepted_alternatives", [])]
        if clean_answer == target_ans or clean_answer in alts:
            return DrillEvaluationResult(
                is_correct=True,
                score=100,
                feedback_vi="Rất tốt! Câu trả lời của bạn hoàn toàn chính xác và tự nhiên.",
                nuance_contrast=None,
                corrected_text=None,
                key_points_covered=[item.get("target_focus", "Áp dụng chuẩn xác")],
            )

        system, user = build_drill_evaluation_prompt(item, clean_answer, attempt_number)
        try:
            result, _ = await self._ai.generate_structured(
                user,
                DrillEvaluationResult,
                system=system,
                provider=provider,
                model=model,
            )
            assert isinstance(result, DrillEvaluationResult)
            return result
        except Exception as exc:
            logger.warning("AI drill evaluation failed, using deterministic evaluation: %s", exc)
            # Deterministic fallback evaluation
            is_close = any(token in clean_answer for token in target_ans.split() if len(token) > 1)
            score = 75 if is_close else 50
            return DrillEvaluationResult(
                is_correct=score >= 75,
                score=score,
                feedback_vi=(
                    "Câu trả lời đã thể hiện được ý chính. Hãy đối chiếu với câu mẫu để hoàn thiện hơn."
                    if is_close
                    else "Câu trả lời cần chú ý hơn về cấu trúc và từ vựng mục tiêu."
                ),
                nuance_contrast=None,
                corrected_text=target_ans,
                key_points_covered=[item.get("target_focus", "")] if is_close else [],
            )

    async def generate_debrief(
        self,
        weakness_info: dict[str, Any],
        items_summary: list[dict[str, Any]],
        attempts_summary: list[dict[str, Any]],
        average_score: float,
        provider: str | None = None,
        model: str | None = None,
    ) -> DrillDebriefResult:
        """Generates a pedagogical wrap-up summary upon completing a drill session."""
        system, user = build_drill_debrief_prompt(
            weakness_info, items_summary, attempts_summary, average_score
        )
        try:
            result, _ = await self._ai.generate_structured(
                user,
                DrillDebriefResult,
                system=system,
                provider=provider,
                model=model,
            )
            assert isinstance(result, DrillDebriefResult)
            return result
        except Exception as exc:
            logger.warning("AI drill debrief failed, using deterministic fallback: %s", exc)
            if average_score >= 80:
                return DrillDebriefResult(
                    debrief_vi="Bạn đã hoàn thành xuất sắc chuỗi bài tập và nắm vững quy tắc mục tiêu qua các giai đoạn.",
                    mastery_assessment="substantial_improvement",
                    next_step_vi="Tiếp tục vận dụng kiến thức này trong các bài viết tự do tiếp theo.",
                )
            elif average_score >= 60:
                return DrillDebriefResult(
                    debrief_vi="Bạn đã có sự tiến bộ rõ rệt qua 4 giai đoạn, cần chú ý thêm một số sắc thái tự nhiên.",
                    mastery_assessment="moderate_progress",
                    next_step_vi="Ôn lại các câu mẫu và thực hiện bài viết ngắn để củng cố.",
                )
            else:
                return DrillDebriefResult(
                    debrief_vi="Bạn đã hoàn thành phiên luyện tập nhưng cần thêm thời gian để làm quen với cấu trúc này.",
                    mastery_assessment="needs_more_practice",
                    next_step_vi="Hãy xem lại phần giải thích và thử làm lại phiên luyện tập sau ít ngày.",
                )
