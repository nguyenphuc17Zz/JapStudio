"""Difficulty calibration verdicts (Phase 14).

Deterministic verdicts per (jlpt_level, difficulty, exercise_type) within a
window:

- too_easy   : avg_score >= 90 and completion_rate >= 0.9
- too_hard   : avg_score < 60 or completion_rate < 0.5
- appropriate: avg_score in [60, 89] and completion_rate >= 0.6
- mixed      : otherwise
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.models.exercise import Exercise, ExerciseAttempt, WritingFeedback
from app.services.analytics.common import enum_value, resolve_window, round2

VERDICT_TOO_EASY = "too_easy"
VERDICT_APPROPRIATE = "appropriate"
VERDICT_TOO_HARD = "too_hard"
VERDICT_MIXED = "mixed"


class DifficultyCalibrationService:
    """Computes difficulty calibration for a window."""

    def __init__(self, session: AsyncSession, settings: Settings | None = None) -> None:
        self._session = session
        self._settings = settings or get_settings()

    @staticmethod
    def verdict(avg_score: float | None, completion_rate: float | None) -> str:
        if avg_score is None or completion_rate is None:
            return VERDICT_MIXED
        if avg_score >= 90 and completion_rate >= 0.9:
            return VERDICT_TOO_EASY
        if avg_score < 60 or completion_rate < 0.5:
            return VERDICT_TOO_HARD
        if 60 <= avg_score <= 89 and completion_rate >= 0.6:
            return VERDICT_APPROPRIATE
        return VERDICT_MIXED

    async def compute(self, window: str) -> list[dict]:
        resolved = resolve_window(window)
        result = await self._session.execute(
            select(ExerciseAttempt, WritingFeedback, Exercise)
            .join(WritingFeedback, WritingFeedback.attempt_id == ExerciseAttempt.id)
            .join(Exercise, Exercise.id == ExerciseAttempt.exercise_id)
            .where(
                ExerciseAttempt.created_at >= resolved.start,
                ExerciseAttempt.created_at <= resolved.end,
            )
        )
        per_key: dict[tuple[str, str, int], dict] = {}
        for _attempt, feedback, exercise in result.all():
            key = (
                enum_value(exercise.jlpt_level),
                enum_value(exercise.exercise_type),
                exercise.difficulty,
            )
            bucket = per_key.setdefault(
                key,
                {
                    "level": enum_value(exercise.jlpt_level),
                    "exercise_type": enum_value(exercise.exercise_type),
                    "difficulty": exercise.difficulty,
                    "scores": [],
                    "attempts": 0,
                    "evaluated": 0,
                },
            )
            bucket["attempts"] += 1
            bucket["evaluated"] += 1
            bucket["scores"].append(feedback.overall_score)

        items = []
        for (level, exercise_type, difficulty), bucket in sorted(per_key.items()):
            scores = bucket["scores"]
            avg = sum(scores) / len(scores) if scores else None
            completion = bucket["evaluated"] / bucket["attempts"]
            verdict = self.verdict(avg, completion)
            items.append(
                {
                    "difficulty": difficulty,
                    "level": level,
                    "exercise_type": exercise_type,
                    "avg_score": round2(avg),
                    "completion_rate": round2(completion),
                    "attempt_count": bucket["attempts"],
                    "verdict": verdict,
                    "note": {
                        VERDICT_TOO_EASY: "Điểm trung bình cao và tỷ lệ hoàn thành cao.",
                        VERDICT_TOO_HARD: "Điểm thấp hoặc tỷ lệ hoàn thành thấp.",
                        VERDICT_APPROPRIATE: "Độ khó phù hợp.",
                        VERDICT_MIXED: "Dữ liệu chưa đủ rõ để kết luận.",
                    }[verdict],
                }
            )
        return items
