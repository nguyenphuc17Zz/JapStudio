"""Learning outcome skills (Phase 14)."""

from app.core.config import Settings
from app.services.analytics.outcomes import LearningOutcomesService
from tests.analytics_helpers import (
    days_ago,
    make_attempt,
    make_discourse_evaluation,
    make_exercise,
    make_simulation,
)

WINDOW = "30d"


async def test_outcomes_baseline_vs_current(session) -> None:
    exercise = await make_exercise(session)
    await make_attempt(session, exercise, score=50, when=days_ago(20))
    await make_attempt(session, exercise, score=90, attempt_number=2, when=days_ago(2))
    await session.commit()

    outcomes = await LearningOutcomesService(session, Settings(analytics_min_evidence=1)).compute(
        WINDOW
    )
    by_skill = {item["skill"]: item for item in outcomes}
    naturalness = by_skill["naturalness"]
    assert naturalness["baseline"] == 50.0
    assert naturalness["current"] == 90.0
    assert naturalness["delta"] == 40.0
    assert naturalness["trend"] == "up"
    assert naturalness["evidence_count"] == 1
    assert naturalness["insufficient_evidence"] is False
    assert "outcome.naturalness.30d.delta" in naturalness["metric_ids"]


async def test_outcomes_insufficient_evidence(session) -> None:
    exercise = await make_exercise(session)
    await make_attempt(session, exercise, score=60, when=days_ago(2))
    await session.commit()

    outcomes = await LearningOutcomesService(session, Settings(analytics_min_evidence=2)).compute(
        WINDOW
    )
    by_skill = {item["skill"]: item for item in outcomes}
    assert by_skill["grammar"]["insufficient_evidence"] is True
    assert by_skill["grammar"]["baseline"] is None
    assert by_skill["grammar"]["delta"] is None


async def test_outcomes_discourse_and_simulation_skills(session) -> None:
    await make_discourse_evaluation(
        session,
        scores={
            "coherence": 70,
            "cohesion": 80,
            "organization": 90,
            "flow": 75,
            "scenario_fit": 85,
        },
        when=days_ago(2),
    )
    await make_simulation(session, scores={"communication_effectiveness": 88}, when=days_ago(3))
    await session.commit()

    outcomes = await LearningOutcomesService(session, Settings(analytics_min_evidence=1)).compute(
        WINDOW
    )
    by_skill = {item["skill"]: item for item in outcomes}
    assert by_skill["coherence"]["current"] == 70.0
    assert by_skill["organization"]["current"] == 90.0
    assert by_skill["scenario_fit"]["current"] == 85.0
    assert by_skill["communication_effectiveness"]["current"] == 88.0


async def test_outcomes_empty_window(session) -> None:
    await session.commit()
    outcomes = await LearningOutcomesService(session, Settings(analytics_min_evidence=1)).compute(
        WINDOW
    )
    assert len(outcomes) == 12
    assert all(item["current"] is None for item in outcomes)
