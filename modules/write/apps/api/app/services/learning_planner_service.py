"""Learning planner service (Phase 6, stage 3).

The strategy is chosen deterministically (70% targeted / 20% reinforcement /
10% exploration via shortfall counting + rotation); the AI proposes the
exercise parameters; deterministic validation adjusts them (difficulty and
JLPT stepping limits, enum safety, topic variety). A deterministic fallback
plan is used when the AI is unavailable, so recommendations never block.
"""

import logging
from typing import Any

from app.core.config import Settings, get_settings
from app.domain.scenario_formats import (
    FORMAT_BY_GENRE,
    GENRE_EXERCISE_TYPES,
    GENRE_MEDIA,
    MEDIUM_TARGET_LENGTHS,
)
from app.models import ExerciseType, Register, TargetLength
from app.prompts.learning_planner import (
    build_learning_planner_prompt,
    learning_planner_prompt_version,
)
from app.schemas.learning_ai import (
    JLPT_ORDER,
    LearningRecommendationResult,
    PlannedExercise,
)
from app.services.ai_service import AIService

logger = logging.getLogger("app.learning")

_TARGETED_BUCKET = 7
_REINFORCEMENT_BUCKET = 9
_DIFFICULTY_FLOOR = 1
_DIFFICULTY_CEIL = 10
_WEAK_SKILL_THRESHOLD = 50
_WEAK_SCENARIO_GENRE_THRESHOLD = 65
_WEAK_SCENARIO_GENRE_MIN_EVIDENCE = 3

_GENRE_LABELS_VI = {
    "business_email": "email công việc",
    "casual_message": "tin nhắn thân mật",
    "business_chat": "chat công việc",
    "meeting_followup": "email tiếp nối sau họp",
    "status_report": "báo cáo tiến độ",
    "incident_report": "báo cáo sự cố",
    "bug_report": "báo cáo lỗi",
    "requirement_clarification": "làm rõ yêu cầu",
    "customer_response": "phản hồi khách hàng",
    "request": "thư đề nghị",
    "apology": "thư xin lỗi",
    "proposal": "đề xuất",
    "opinion": "nêu quan điểm",
    "sns_post": "bài đăng mạng xã hội",
    "review": "đánh giá",
    "personal_note": "ghi chú cá nhân",
    "experience_story": "câu chuyện trải nghiệm",
}

_DEFAULT_TOPICS = [
    "Kể về một ngày làm việc của bạn",
    "Giới thiệu về thành phố nơi bạn sống",
    "Mô tả một kỷ niệm đáng nhớ",
    "Nói về kế hoạch cuối tuần",
    "Kể về một bữa ăn gia đình",
    "Giới thiệu sở thích của bản thân",
]

_EXERCISE_TYPES = {t.value for t in ExerciseType}
_REGISTERS = {r.value for r in Register}
_JLPT_LEVELS = set(JLPT_ORDER)
_TARGET_LENGTHS = {t.value for t in TargetLength}
_SKILLS = {
    "grammar",
    "vocabulary",
    "naturalness",
    "semantic",
    "context_fit",
    "register_fit",
    "coherence",
    "cohesion",
    "organization",
    "flow",
    "style_consistency",
    "scenario_semantic_fit",
    "audience_fit",
    "purpose_fit",
    "tone_fit",
    "constraint_compliance",
}
_DISCOURSE_SKILLS = {"coherence", "cohesion", "organization", "flow", "style_consistency"}


class LearningPlannerService:
    """Chooses the strategy and produces a validated exercise plan."""

    def __init__(
        self,
        ai_service: AIService,
        settings: Settings | None = None,
    ) -> None:
        self._ai = ai_service
        self._settings = settings or get_settings()

    def _task(self) -> tuple[str | None, str | None]:
        provider = (
            self._settings.ai_learning_provider
            or self._settings.ai_exercise_generation_provider
            or self._settings.ai_default_provider
            or None
        )
        model = self._settings.ai_learning_model or None
        return provider, model

    # -- strategy selection (deterministic) ---------------------------------

    def select_strategy(self, profile_summary: dict[str, Any], rotation: int) -> str:
        """70/20/10 strategy selection with evidence-based overrides.

        - Too little evidence (< 3 attempts) -> exploration.
        - Any skill critically weak (< 50) -> targeted.
        - A weak scenario genre (avg fit < 65, >= 3 attempts) -> scenario_practice.
        - Otherwise rotate deterministically: 70% targeted, 20% reinforcement,
          10% exploration.
        """
        evidence_count = profile_summary.get("evidence_count", 0)
        if evidence_count < 3:
            return "exploration"
        skills = profile_summary.get("skills") or {}
        for skill in ("grammar", "vocabulary", "naturalness"):
            if skills.get(skill, {}).get("score", 100) < _WEAK_SKILL_THRESHOLD:
                return "targeted"
        for skill in _DISCOURSE_SKILLS:
            if skills.get(skill, {}).get("score", 100) < _WEAK_SKILL_THRESHOLD:
                return "targeted"
        if self.weak_scenario_genre(profile_summary) is not None:
            return "scenario_practice"
        bucket = rotation % 10
        if bucket < _TARGETED_BUCKET:
            return "targeted"
        if bucket < _REINFORCEMENT_BUCKET:
            return "reinforcement"
        return "exploration"

    @staticmethod
    def weak_scenario_genre(profile_summary: dict[str, Any]) -> str | None:
        """Weakest scenario genre with enough evidence, if any."""
        genres = profile_summary.get("scenario_genres") or {}
        weak = [
            genre
            for genre, info in genres.items()
            if info.get("count", 0) >= _WEAK_SCENARIO_GENRE_MIN_EVIDENCE
            and info.get("average_fit", 100) < _WEAK_SCENARIO_GENRE_THRESHOLD
        ]
        if not weak:
            return None
        return min(weak, key=lambda genre: genres[genre]["average_fit"])

    # -- planning -------------------------------------------------------------

    async def plan(
        self,
        profile_summary: dict[str, Any],
        strategy: str,
        rotation: int,
        memory_block: str = "",
    ) -> tuple[LearningRecommendationResult, str, bool]:
        """Produce a recommendation: (result, reason, used_ai_fallback)."""
        provider, model = self._task()
        recent_topics = profile_summary.get("recent_topics") or []
        genre = (
            self.weak_scenario_genre(profile_summary) if strategy == "scenario_practice" else None
        )
        if genre is not None:
            scenario_result = self._scenario_plan(profile_summary, genre)
            return scenario_result, scenario_result.reason, True
        try:
            result, _ = await self._ai.generate_structured(
                build_learning_planner_prompt(
                    strategy, profile_summary, recent_topics, memory_block=memory_block
                ),
                LearningRecommendationResult,
                provider=provider,
                model=model,
                max_tokens=self._settings.ai_learning_max_tokens,
            )
        except Exception as exc:
            logger.warning("learning planner failed error=%s (deterministic fallback)", exc)
            return self._fallback_plan(profile_summary, strategy, rotation), "", True

        reason = result.reason
        result = self._validate_adjust(result, profile_summary, rotation)
        return result, reason, False

    def _validate_adjust(
        self,
        result: LearningRecommendationResult,
        profile_summary: dict[str, Any],
        rotation: int,
    ) -> LearningRecommendationResult:
        """Enforce deterministic safety: enums, stepping limits, topic variety."""
        planned = result.planned_exercise
        difficulty = _clamp_int(planned.difficulty, _DIFFICULTY_FLOOR, _DIFFICULTY_CEIL)
        current = profile_summary.get("average_difficulty", 3) or 3
        max_step = max(self._settings.ai_learning_max_difficulty_step, 1)
        difficulty = _clamp_int(difficulty, current - max_step, current + max_step)
        difficulty = _clamp_int(difficulty, _DIFFICULTY_FLOOR, _DIFFICULTY_CEIL)

        jlpt = planned.jlpt_level if planned.jlpt_level in _JLPT_LEVELS else "N4"
        target_jlpt = profile_summary.get("target_jlpt")
        estimated = profile_summary.get("estimated_jlpt") or {}
        anchor = target_jlpt or estimated.get("max_level") or "N4"
        if anchor not in _JLPT_LEVELS:
            anchor = "N4"
        jlpt = self._clamp_jlpt(jlpt, anchor)

        exercise_type = (
            planned.exercise_type
            if planned.exercise_type in _EXERCISE_TYPES
            else (ExerciseType.SENTENCE_TRANSLATION.value)
        )
        register = planned.register if planned.register in _REGISTERS else Register.POLITE.value
        target_length = (
            planned.target_length
            if planned.target_length in _TARGET_LENGTHS
            else TargetLength.SENTENCE.value
        )
        focus_skills = [s for s in planned.focus_skills if s in _SKILLS][:3]
        if not focus_skills:
            focus_skills = ["grammar", "naturalness"]
        skills = profile_summary.get("skills") or {}
        weakest_discourse = min(
            _DISCOURSE_SKILLS,
            key=lambda s: skills.get(s, {}).get("score", 100),
        )
        if (
            skills.get(weakest_discourse, {}).get("score", 100) < _WEAK_SKILL_THRESHOLD
            and target_length == TargetLength.SENTENCE.value
        ):
            target_length = TargetLength.MULTI_SENTENCE.value
            if weakest_discourse not in focus_skills:
                focus_skills = (focus_skills + [weakest_discourse])[:3]

        topic = (planned.topic or "").strip()
        recent_topics = profile_summary.get("recent_topics") or []
        if not topic or topic in recent_topics:
            topic = _DEFAULT_TOPICS[rotation % len(_DEFAULT_TOPICS)]

        return LearningRecommendationResult(
            strategy=result.strategy,
            planned_exercise=PlannedExercise(
                exercise_type=exercise_type,
                topic=topic,
                register=register,
                jlpt_level=jlpt,
                difficulty=difficulty,
                target_length=target_length,
                focus_skills=focus_skills,
            ),
            reason=result.reason,
        )

    def _clamp_jlpt(self, value: str, anchor: str) -> str:
        max_step = max(self._settings.ai_learning_max_jlpt_step, 1)
        anchor_index = JLPT_ORDER.index(anchor)
        index = JLPT_ORDER.index(value)
        index = _clamp_int(index, anchor_index - max_step, anchor_index + max_step)
        return JLPT_ORDER[index]

    def _scenario_plan(
        self,
        profile_summary: dict[str, Any],
        genre: str,
    ) -> LearningRecommendationResult:
        """Deterministic scenario_practice plan for the weakest genre.

        The recommendation carries ``scenario_genre`` so the frontend can
        prefill the scenario generator; the exercise itself is generated via
        the normal pipeline with the genre's canonical exercise type.
        """
        formats = FORMAT_BY_GENRE.get(genre)
        exercise_type = GENRE_EXERCISE_TYPES.get(genre, "scenario_response")
        medium = GENRE_MEDIA.get(genre, "email")
        target_length = MEDIUM_TARGET_LENGTHS.get(medium, "paragraph")
        registers = (
            formats.register_preferences
            if formats is not None and formats.register_preferences
            else ("polite",)
        )
        register = registers[0] if registers[0] in _REGISTERS else "polite"
        current = profile_summary.get("average_difficulty", 3) or 3
        difficulty = _clamp_int(current, _DIFFICULTY_FLOOR, _DIFFICULTY_CEIL)
        estimated = profile_summary.get("estimated_jlpt") or {}
        jlpt = estimated.get("max_level") or profile_summary.get("target_jlpt") or "N4"
        if jlpt not in _JLPT_LEVELS:
            jlpt = "N4"
        genre_label = _GENRE_LABELS_VI.get(genre, genre)
        return LearningRecommendationResult(
            strategy="scenario_practice",
            planned_exercise=PlannedExercise(
                exercise_type=exercise_type,
                topic=f"Viết {genre_label} theo tình huống cụ thể",
                register=register,
                jlpt_level=jlpt,
                difficulty=difficulty,
                target_length=target_length,
                focus_skills=["audience_fit", "purpose_fit", "tone_fit"],
            ),
            reason=(
                f"Các bài {genre_label} gần đây của bạn chưa đạt yêu cầu về người "
                f"đọc và mục đích (điểm khớp tình huống trung bình dưới "
                f"{_WEAK_SCENARIO_GENRE_THRESHOLD}). Hãy thử luyện thêm một "
                "tình huống cùng thể loại để cải thiện."
            ),
        )

    # -- deterministic fallback -------------------------------------------------

    def _fallback_plan(
        self,
        profile_summary: dict[str, Any],
        strategy: str,
        rotation: int,
    ) -> LearningRecommendationResult:
        current = profile_summary.get("average_difficulty", 3) or 3
        difficulty = _clamp_int(current, _DIFFICULTY_FLOOR, _DIFFICULTY_CEIL)
        estimated = profile_summary.get("estimated_jlpt") or {}
        jlpt = estimated.get("max_level") or profile_summary.get("target_jlpt") or "N4"
        if jlpt not in _JLPT_LEVELS:
            jlpt = "N4"
        topic = _DEFAULT_TOPICS[rotation % len(_DEFAULT_TOPICS)]
        recent_topics = profile_summary.get("recent_topics") or []
        if topic in recent_topics:
            topic = "Kể về một trải nghiệm thú vị gần đây"

        weaknesses = profile_summary.get("weaknesses") or []
        focus_skills = weaknesses[:3] if weaknesses else ["grammar", "naturalness"]
        skill_label = {"grammar": "ngữ pháp", "vocabulary": "từ vựng"}.get(
            focus_skills[0], focus_skills[0]
        )
        target_length = TargetLength.SENTENCE.value
        exercise_type = ExerciseType.SENTENCE_TRANSLATION.value
        if any(skill in _DISCOURSE_SKILLS for skill in focus_skills):
            target_length = TargetLength.MULTI_SENTENCE.value
            exercise_type = ExerciseType.FREE_WRITING.value
        return LearningRecommendationResult(
            strategy=strategy,
            planned_exercise=PlannedExercise(
                exercise_type=exercise_type,
                topic=topic,
                register=Register.POLITE.value,
                jlpt_level=jlpt,
                difficulty=difficulty,
                target_length=target_length,
                focus_skills=focus_skills,
            ),
            reason=(
                f"Bài này giúp bạn rèn {skill_label} trong một tình huống gần gũi, "
                "phù hợp với trình độ hiện tại."
            ),
        )

    def prompt_version(self) -> str:
        return learning_planner_prompt_version()

    def resolved_provider_model(self) -> tuple[str, str]:
        provider, model = self._task()
        return provider or "unknown", model or "unknown"


def _clamp_int(value: int, low: int, high: int) -> int:
    return max(low, min(value, high))
