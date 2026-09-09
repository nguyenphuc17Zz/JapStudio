"""Difficulty calibration (Phase 14)."""

from app.core.config import Settings
from app.services.analytics.calibration import (
    VERDICT_APPROPRIATE,
    VERDICT_MIXED,
    VERDICT_TOO_EASY,
    VERDICT_TOO_HARD,
    DifficultyCalibrationService,
)
from tests.analytics_helpers import days_ago, make_attempt, make_exercise


def test_verdict_rules():
    assert DifficultyCalibrationService.verdict(95, 0.95) == VERDICT_TOO_EASY
    assert DifficultyCalibrationService.verdict(45, 0.9) == VERDICT_TOO_HARD
    assert DifficultyCalibrationService.verdict(80, 0.4) == VERDICT_TOO_HARD
    assert DifficultyCalibrationService.verdict(75, 0.8) == VERDICT_APPROPRIATE
    assert DifficultyCalibrationService.verdict(None, 0.8) == VERDICT_MIXED


async def test_calibration_groups_by_level_difficulty(session) -> None:
    exercise = await make_exercise(session, jlpt_level="N3", difficulty=9)
    await make_attempt(session, exercise, score=95, when=days_ago(2))
    await make_attempt(session, exercise, score=92, attempt_number=2, when=days_ago(1))
    await session.commit()

    items = await DifficultyCalibrationService(session, Settings(analytics_min_evidence=1)).compute(
        "30d"
    )
    assert len(items) == 1
    item = items[0]
    assert item["level"] == "N3"
    assert item["difficulty"] == 9
    assert item["avg_score"] == 93.5
    assert item["completion_rate"] == 1.0
    assert item["attempt_count"] == 2
    assert item["verdict"] == VERDICT_TOO_EASY
