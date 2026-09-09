"""Experiments: assignment, idempotency and metrics (Phase 14)."""

from app.core.config import Settings
from app.services.analytics.experiments import ExperimentService
from tests.analytics_helpers import (
    days_ago,
    make_assignment,
    make_attempt,
    make_exercise,
    make_experiment,
    make_user,
)


async def test_assign_deterministic_and_idempotent(session) -> None:
    experiment = await make_experiment(session)
    service = ExperimentService(session, Settings())

    first = await service.assign(experiment, None)
    second = await service.assign(experiment, None)
    assert first.id == second.id
    assert first.arm in ("control", "variant")


async def test_allocation_100_percent_variant(session) -> None:
    experiment = await make_experiment(session, allocation=100)
    service = ExperimentService(session, Settings())
    assignment = await service.assign(experiment, None)
    assert assignment.arm == "variant"


async def test_metrics_compare_arms(session) -> None:
    experiment = await make_experiment(session, created_at=days_ago(10))
    await make_user(session, user_id="u1")
    await make_user(session, user_id="u2")
    await make_assignment(session, experiment, "u1", "control")
    await make_assignment(session, experiment, "u2", "variant")

    control_exercise = await make_exercise(session, topic="Control", prompt_vi_hash="1" * 64)
    variant_exercise = await make_exercise(session, topic="Variant", prompt_vi_hash="2" * 64)
    await make_attempt(session, control_exercise, score=60, user_id="u1", when=days_ago(2))
    await make_attempt(
        session, control_exercise, score=65, attempt_number=2, user_id="u1", when=days_ago(1)
    )
    await make_attempt(session, variant_exercise, score=90, user_id="u2", when=days_ago(2))
    await make_attempt(
        session, variant_exercise, score=95, attempt_number=2, user_id="u2", when=days_ago(1)
    )
    await session.commit()

    comparisons = await ExperimentService(session, Settings()).metrics(experiment)
    by_metric = {item["metric"]: item for item in comparisons}
    assert by_metric["avg_score"]["control_value"] == 62.5
    assert by_metric["avg_score"]["variant_value"] == 92.5
    assert by_metric["avg_score"]["delta"] == 30.0
    assert by_metric["avg_score"]["insufficient_evidence"] is False


async def test_metrics_insufficient_evidence(session) -> None:
    experiment = await make_experiment(session)
    await make_assignment(session, experiment, None, "control")
    await session.commit()

    comparisons = await ExperimentService(session, Settings()).metrics(experiment)
    assert all(item["insufficient_evidence"] for item in comparisons)
