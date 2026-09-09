"""Challenge service (Phase 7).

Generation is AI + deterministic selection (weakness-driven, recent-type
rotation). Evaluation reuses the Phase 4 pipeline on a linked exercise;
success is a deterministic function of the evaluation output. Failed AI
generation degrades to content templates - normal practice is never touched.
"""

import logging
from typing import Any

from app.core.config import Settings, get_settings
from app.models import (
    Challenge,
    ChallengeAttempt,
    Exercise,
    ExerciseStatus,
    ExerciseType,
    JlptLevel,
    Register,
    TargetLength,
)
from app.prompts.challenge_generation import (
    build_challenge_generation_prompt,
    challenge_generation_prompt_version,
)
from app.quality.service import create_quality_service
from app.repositories import (
    ChallengeAttemptRepository,
    ChallengeRepository,
    ExerciseAttemptRepository,
    ExerciseRepository,
    UserVocabularyRepository,
    WritingFeedbackRepository,
)
from app.schemas.gamification_ai import ChallengeGenerationResult
from app.services.ai_service import AIService
from app.services.evaluation_service import EvaluationService
from app.services.exercise_dedup_service import ExerciseDedupService
from app.services.gamification_service import GamificationService, normalize_scores
from app.services.learner_profile_service import LearnerProfileService
from app.services.timezone_service import now_utc
from app.services.vocabulary_normalization import normalize_expression

logger = logging.getLogger("app.gamification")

VALID_CHALLENGE_TYPES = (
    "naturalness",
    "register",
    "vocabulary",
    "compression",
    "expansion",
    "nuance",
    "error_fix",
)

INSTRUCTIONS_VI: dict[str, str] = {
    "naturalness": (
        "Hãy viết lại câu sau theo cách người Nhật thường nói hơn, tự nhiên và giữ nguyên ý nghĩa."
    ),
    "register": "Hãy chuyển câu sau thành tiếng Nhật business lịch sự, phù hợp môi trường công sở.",
    "vocabulary": "Hãy viết một câu tiếng Nhật có sử dụng từ vựng bên dưới.",
    "compression": "Hãy diễn đạt lại ý của câu sau ngắn gọn hơn, vẫn trọn nghĩa.",
    "expansion": "Hãy viết lại câu sau thành một câu chi tiết hơn, thêm thông tin hợp lý.",
    "nuance": "Hãy viết một câu tiếng Nhật tự nhiên diễn đạt ý 'không hẳn là...' dựa trên câu gốc.",
    "error_fix": "Hãy sửa lỗi cụ thể đã được phát hiện trong câu trả lời trước của bạn.",
}

OBJECTIVES_VI: dict[str, str] = {
    "naturalness": "Câu viết lại tự nhiên như người Nhật nói, giữ nguyên ý nghĩa.",
    "register": "Câu chuyển sang phong cách business, lịch sự và chính xác.",
    "vocabulary": "Câu đúng ngữ pháp và dùng đúng từ vựng yêu cầu.",
    "compression": "Câu ngắn gọn hơn câu gốc nhưng vẫn trọn ý.",
    "expansion": "Câu chi tiết hơn câu gốc, có thêm thông tin hợp lý.",
    "nuance": "Diễn đạt đúng sắc thái 'không hẳn là...' một cách tự nhiên.",
    "error_fix": "Lỗi đã được sửa, câu đúng ngữ pháp và tự nhiên.",
}

SOURCE_EXAMPLES: dict[str, str] = {
    "naturalness": "今日はとても忙しいです。",
    "register": "今日は仕事がすごく忙しいんだ。",
    "compression": (
        "今日はたくさんの仕事をしなければならなかったので、家に帰るのが"
        "とても遅くなってしまいました。"
    ),
    "expansion": "今日は忙しいです。",
    "nuance": "全部の宿題をやらなければなりません。",
    "error_fix": "",
    "vocabulary": "",
}

TARGET_SKILLS: dict[str, str] = {
    "naturalness": "naturalness",
    "register": "register_fit",
    "vocabulary": "vocabulary",
    "compression": "semantic",
    "expansion": "semantic",
    "nuance": "semantic",
    "error_fix": "grammar",
}


class ChallengeService:
    """Owns challenge generation, evaluation and completion."""

    def __init__(
        self,
        challenge_repository: ChallengeRepository,
        challenge_attempt_repository: ChallengeAttemptRepository,
        exercise_repository: ExerciseRepository,
        attempt_repository: ExerciseAttemptRepository,
        feedback_repository: WritingFeedbackRepository,
        vocabulary_repository: UserVocabularyRepository,
        profile_service: LearnerProfileService,
        gamification: GamificationService,
        ai_service: AIService,
        settings: Settings | None = None,
    ) -> None:
        self._challenges = challenge_repository
        self._challenge_attempts = challenge_attempt_repository
        self._exercises = exercise_repository
        self._attempts = attempt_repository
        self._feedback = feedback_repository
        self._vocabulary = vocabulary_repository
        self._profiles = profile_service
        self._gamification = gamification
        self._ai = ai_service
        self._settings = settings or get_settings()
        self._dedup = ExerciseDedupService(exercise_repository, settings)
        self._quality = create_quality_service(settings=self._settings)
        self._evaluation = EvaluationService(
            ai_service=ai_service,
            attempt_repository=attempt_repository,
            feedback_repository=feedback_repository,
            settings=settings,
        )

    def _task(self) -> tuple[str | None, str | None]:
        settings = self._settings
        provider = (
            settings.ai_gamification_provider
            or settings.ai_learning_provider
            or settings.ai_exercise_evaluation_provider
            or settings.ai_default_provider
            or None
        )
        model = settings.ai_challenge_model or settings.ai_gamification_model or None
        return provider, model

    # ------------------------------------------------------------- generation

    async def generate(
        self,
        user_id: str | None,
        objective_id: str | None = None,
        provider: str | None = None,
        model: str | None = None,
    ) -> Challenge:
        """Create one challenge (AI + deterministic selection + fallback)."""
        summary = await self._profiles.profile_summary(user_id)
        recent_attempts = await self._attempts.list_recent_with_feedback_and_exercise(user_id, 5)
        recent_errors = [
            issue.get("original_text", "") or issue.get("explanation", "")
            for _, feedback, _ in recent_attempts
            for issue in (feedback.evaluation.get("issues") or [])
        ][:5]
        recent_vocabulary = [
            entry.expression
            for entry in await self._vocabulary.list_recent_for_user(user_id, limit=10)
        ]
        recent_challenges = await self._challenges.list_recent_by_user(user_id, limit=10)
        recent_types = [c.challenge_type for c in recent_challenges]

        challenge_type = self._select_type(summary, recent_types)
        default_provider, default_model = self._task()
        target_provider = provider or default_provider
        target_model = model or default_model
        result: ChallengeGenerationResult | None = None
        if self._settings.ai_challenge_enabled:
            try:
                result, _ = await self._ai.generate_structured(
                    build_challenge_generation_prompt(
                        challenge_type=challenge_type,
                        weaknesses=[w for w in summary.get("weaknesses", []) if isinstance(w, str)],
                        recent_errors=recent_errors,
                        recent_vocabulary=recent_vocabulary,
                        recent_challenges=recent_types,
                        profile_summary=summary,
                    ),
                    ChallengeGenerationResult,
                    provider=target_provider,
                    model=target_model,
                    max_tokens=self._settings.ai_gamification_max_tokens,
                )
            except Exception as exc:
                logger.warning("challenge generation failed error=%s (fallback)", exc)
        if result is not None and result.type != challenge_type:
            logger.warning(
                "challenge type mismatch ai=%s expected=%s (using deterministic content)",
                result.type,
                challenge_type,
            )
            result = None
        if result is not None:
            self._quality.validate(
                "challenge_generation", result, provider=target_provider, model=target_model
            )

        content = self._validate_content(challenge_type, result, recent_vocabulary, recent_attempts)
        exercise = await self._persist_exercise(challenge_type, content, summary, objective_id)
        challenge = await self._challenges.add(
            Challenge(
                user_id=user_id,
                challenge_type=challenge_type,
                instruction_vi=content["instruction_vi"],
                source_text=content["source_text"],
                target_skill=TARGET_SKILLS[challenge_type],
                difficulty=content["difficulty"],
                objective=OBJECTIVES_VI[challenge_type],
                required_expression=content.get("required_expression"),
                exercise_id=exercise.id,
                objective_id=objective_id,
                status="active",
                provider=target_provider or "unknown",
                model=target_model or "unknown",
                prompt_version=challenge_generation_prompt_version(),
            )
        )
        if result is None:
            challenge.provider = "fallback"
            challenge.model = "deterministic"
            await self._challenges.update(challenge)
        logger.info(
            "challenge_generated id=%s type=%s provider=%s",
            challenge.id,
            challenge_type,
            challenge.provider,
        )
        return challenge

    def _select_type(self, summary: dict[str, Any], recent_types: list[str]) -> str:
        """Deterministic selection: weakness-driven, avoid recent repeats."""
        weaknesses = [w for w in summary.get("weaknesses", []) if isinstance(w, str)]
        weakness_text = " ".join(weaknesses).lower()
        preferred: str | None = None
        if "tự nhiên" in weakness_text or "natural" in weakness_text:
            preferred = "naturalness"
        elif "phong cách" in weakness_text or "register" in weakness_text:
            preferred = "register"
        elif "từ vựng" in weakness_text or "vocabulary" in weakness_text:
            preferred = "vocabulary"
        elif "ngữ pháp" in weakness_text or "grammar" in weakness_text:
            preferred = "error_fix"
        if preferred is not None and preferred not in recent_types[:3]:
            return preferred
        last_type = recent_types[0] if recent_types else None
        for candidate in (
            "naturalness",
            "register",
            "vocabulary",
            "compression",
            "nuance",
            "expansion",
            "error_fix",
        ):
            if candidate != last_type:
                return candidate
        return "naturalness"

    def _validate_content(
        self,
        challenge_type: str,
        result: ChallengeGenerationResult | None,
        recent_vocabulary: list[str],
        recent_attempts: list,
    ) -> dict[str, Any]:
        """Deterministic content; AI values clamped, fallback templates used."""
        difficulty = 5
        source_text = SOURCE_EXAMPLES[challenge_type]
        instruction_vi = INSTRUCTIONS_VI[challenge_type]
        required_expression: str | None = None
        if result is not None:
            difficulty = max(1, min(result.difficulty, 10))
            source_text = result.source_text.strip() or source_text
            instruction_vi = result.instruction_vi.strip() or instruction_vi
            if challenge_type == "vocabulary":
                required_expression = result.required_expression
        if challenge_type == "error_fix" and not source_text:
            if recent_attempts:
                source_text = recent_attempts[0][0].answer_text
            else:
                source_text = "今日は仕事がたくさんあります。"
                instruction_vi = (
                    "Hãy viết lại câu sau tự nhiên và đúng ngữ pháp hơn theo phong cách lịch sự."
                )
        if challenge_type == "vocabulary":
            if required_expression is None and recent_vocabulary:
                required_expression = recent_vocabulary[0]
            if required_expression is None:
                required_expression = "立て込む"
                source_text = "立て込む"
            source_text = source_text or required_expression
        return {
            "difficulty": difficulty,
            "source_text": source_text,
            "instruction_vi": instruction_vi,
            "required_expression": required_expression,
        }

    async def _persist_exercise(
        self,
        challenge_type: str,
        content: dict[str, Any],
        summary: dict[str, Any],
        objective_id: str | None = None,
    ) -> Exercise:
        """The linked exercise reused by the Phase 4 evaluation pipeline."""
        prompt_vi = f"{content['instruction_vi']}\n\nNguồn: {content['source_text']}"
        normalized = ExerciseDedupService.normalize_prompt(prompt_vi)
        jlpt_value = (summary.get("estimated_jlpt") or {}).get("max_level") or "N4"
        jlpt = JlptLevel(jlpt_value) if jlpt_value in JlptLevel._value2member_map_ else JlptLevel.N4
        register = Register.BUSINESS if challenge_type == "register" else Register.MIXED
        return await self._exercises.add(
            Exercise(
                exercise_type=ExerciseType.FREE_WRITING,
                topic="Challenge",
                subtopic=challenge_type,
                context=content["source_text"],
                prompt_vi=prompt_vi,
                prompt_vi_hash=self._dedup.prompt_hash(normalized),
                target_length=TargetLength.SENTENCE,
                register=register,
                jlpt_level=jlpt,
                difficulty=content["difficulty"],
                grammar_complexity=content["difficulty"],
                vocabulary_complexity=content["difficulty"],
                context_complexity=content["difficulty"],
                naturalness_target=content["difficulty"],
                generation_metadata={
                    "source": "challenge",
                    "challenge_type": challenge_type,
                },
                objective_id=objective_id,
                status=ExerciseStatus.PENDING,
            )
        )

    # --------------------------------------------------------------- attempts

    async def submit_attempt(
        self,
        user_id: str | None,
        challenge: Challenge,
        answer_text: str,
        provider: str | None = None,
        model: str | None = None,
    ) -> dict[str, Any]:
        """Evaluate via Phase 4, apply deterministic success criteria."""
        exercise = await self._exercises.get(challenge.exercise_id)
        if exercise is None:
            raise ValueError("Challenge exercise is missing")
        attempt, feedback, _ = await self._evaluation.submit(
            exercise, answer_text, provider=provider, model=model
        )
        evaluation = feedback.evaluation
        scores = normalize_scores(evaluation.get("scores", {}))
        success = self._success(
            challenge.challenge_type,
            scores,
            answer_text,
            challenge.required_expression,
            challenge.source_text,
        )
        score = int(scores.get("overall", 0))
        saved = await self._challenge_attempts.get_by_challenge_attempt(challenge.id, attempt.id)
        if saved is None:
            saved = await self._challenge_attempts.add(
                ChallengeAttempt(
                    challenge_id=challenge.id,
                    attempt_id=attempt.id,
                    success=success,
                    score=score,
                )
            )
        gamification = await self._gamification.record_challenge_activity(
            user_id,
            challenge=challenge,
            exercise=exercise,
            score=score,
            success=success,
        )
        xp_awarded = 0
        for event in gamification.get("xp_events", []):
            if event.get("event_type") == "challenge_complete":
                xp_awarded += event.get("amount", 0)
        if success and challenge.completed_at is None:
            challenge.status = "completed"
            challenge.completed_at = now_utc()
            await self._challenges.update(challenge)
        return {
            "challenge": challenge,
            "attempt": attempt,
            "evaluation": evaluation,
            "success": success,
            "score": score,
            "xp_awarded": xp_awarded,
            "gamification": gamification,
        }

    def _success(
        self,
        challenge_type: str,
        scores: dict[str, Any],
        answer_text: str,
        required_expression: str | None,
        source_text: str,
    ) -> bool:
        """Deterministic success criteria on the Phase 4 evaluation output."""
        threshold = self._settings.ai_challenge_success_threshold
        if challenge_type == "naturalness":
            return int(scores.get("naturalness", 0)) >= threshold
        if challenge_type == "register":
            return int(scores.get("register_fit", 0)) >= threshold
        if challenge_type == "vocabulary":
            if required_expression:
                normalized_answer = normalize_expression(answer_text)
                return self._uses_expression(normalized_answer, required_expression)
            return int(scores.get("vocabulary", 0)) >= threshold
        if challenge_type == "compression":
            return int(scores.get("semantic", 0)) >= threshold and len(answer_text.strip()) < len(
                source_text.strip()
            )
        if challenge_type == "expansion":
            return int(scores.get("semantic", 0)) >= threshold and len(answer_text.strip()) > len(
                source_text.strip()
            )
        if challenge_type == "nuance":
            return int(scores.get("semantic", 0)) >= threshold
        if challenge_type == "error_fix":
            return int(scores.get("grammar", 0)) >= threshold
        return int(scores.get("overall", 0)) >= threshold

    def _uses_expression(self, normalized_answer: str, required: str) -> bool:
        """Deterministic check that the answer contains the required expression.

        Accepts the exact expression or any inflected continuation of its stem
        (e.g. 立て込む also matches 立て込んでいる/立て込みます). The stem rule is
        only applied to expressions of at least two kana to avoid trivial hits.
        """
        required = normalize_expression(required)
        if not required:
            return False
        if required in normalized_answer:
            return True
        if len(required) < 2:
            return False
        stem = required[:-1]
        final = required[-1]
        for index in range(len(normalized_answer) - len(stem)):
            if normalized_answer[index : index + len(stem)] != stem:
                continue
            following = normalized_answer[index + len(stem)]
            if following == final or not ("ぁ" <= following <= "ゖ" or "ァ" <= following <= "ヶ"):
                continue
            return True
        return False

    async def get(self, user_id: str | None, challenge_id: str) -> Challenge | None:
        return await self._challenges.get_for_user(user_id, challenge_id)

    async def attempt_history(self, challenge: Challenge) -> list[tuple[object, object, object]]:
        """ChallengeAttempt rows with their linked evaluation attempts — batched IN to avoid N queries."""
        rows = await self._challenge_attempts.list_by_challenge(challenge.id)
        if not rows:
            return []
        attempt_ids = [r.attempt_id for r in rows if getattr(r, "attempt_id", None)]
        if not attempt_ids:
            return [(r, None, None) for r in rows]
        # Batch fetch attempts + feedback
        from sqlalchemy import select

        from app.models import ExerciseAttempt

        attempts_map = {}
        feedback_map = {}
        # Use repositories batch where available, fallback to direct select
        try:
            atts = (await self._attempts._session.execute(select(ExerciseAttempt).where(ExerciseAttempt.id.in_(attempt_ids)))).scalars().all()
            attempts_map = {a.id: a for a in atts}
        except Exception:
            for aid in attempt_ids:
                try:
                    attempts_map[aid] = await self._attempts.get(aid)
                except Exception:
                    attempts_map[aid] = None
        try:
            from app.models import WritingFeedback

            fbs = (await self._feedback._session.execute(select(WritingFeedback).where(WritingFeedback.attempt_id.in_(attempt_ids)))).scalars().all()
            feedback_map = {f.attempt_id: f for f in fbs}
        except Exception:
            for aid in attempt_ids:
                try:
                    feedback_map[aid] = await self._feedback.get_by_attempt(aid)
                except Exception:
                    feedback_map[aid] = None
        return [(r, attempts_map.get(r.attempt_id), feedback_map.get(r.attempt_id)) for r in rows]
