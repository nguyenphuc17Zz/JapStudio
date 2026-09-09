"""AI provider/cost analytics + prompt regression (Phase 14)."""

from app.core.config import Settings
from app.services.analytics.provider_cost import ProviderCostService
from tests.analytics_helpers import days_ago, make_quality_event

WINDOW = "30d"


async def test_by_task_and_provider_aggregates(session) -> None:
    await make_quality_event(
        session,
        task="writing_evaluation",
        provider="gemini",
        quality_status="accepted",
        duration_ms=200,
        estimated_cost=0.02,
        created_at=days_ago(2),
    )
    await make_quality_event(
        session,
        task="writing_evaluation",
        provider="gemini",
        quality_status="rejected",
        success=False,
        fallback_used=True,
        duration_ms=400,
        estimated_cost=0.01,
        created_at=days_ago(1),
    )
    await session.commit()

    data = await ProviderCostService(session, Settings()).compute(WINDOW)
    assert data["by_task"][0]["task"] == "writing_evaluation"
    assert data["by_task"][0]["calls"] == 2
    assert data["by_task"][0]["success_rate"] == 0.5
    assert data["by_task"][0]["quality_pass_rate"] == 0.5
    assert data["by_task"][0]["fallback_rate"] == 0.5
    assert data["by_task"][0]["avg_latency_ms"] == 300.0
    assert data["by_task"][0]["estimated_cost_usd"] == 0.03
    assert data["overview"][0]["metric_key"] == f"cost.total.{WINDOW}.estimated_usd"
    assert data["overview"][0]["value"] == 0.03
    assert data["cost_by_provider"][0]["dimension_value"] == "gemini"
    assert data["cost_by_provider"][0]["value"] == 0.03


async def test_prompt_regression_detected(session) -> None:
    for i in range(5):
        await make_quality_event(
            session,
            task="writing_evaluation",
            provider="fake",
            quality_status="accepted",
            prompt_version="evaluation:v1",
            created_at=days_ago(10 - i),
        )
    for i in range(5):
        await make_quality_event(
            session,
            task="writing_evaluation",
            provider="fake",
            quality_status="rejected",
            prompt_version="evaluation:v2",
            created_at=days_ago(5 - i),
        )
    await session.commit()

    data = await ProviderCostService(session, Settings()).compute(WINDOW)
    assert len(data["prompt_regressions"]) == 1
    regression = data["prompt_regressions"][0]
    assert regression["task"] == "writing_evaluation"
    assert regression["baseline_version"] == "evaluation:v1"
    assert regression["candidate_version"] == "evaluation:v2"
    assert regression["candidate_quality_pass_rate"] == 0.0
    assert regression["severity"] == "regression"


async def test_prompt_regression_requires_min_samples(session) -> None:
    await make_quality_event(
        session, task="writing_evaluation", prompt_version="evaluation:v1", created_at=days_ago(10)
    )
    await make_quality_event(
        session, task="writing_evaluation", prompt_version="evaluation:v2", created_at=days_ago(1)
    )
    await session.commit()

    data = await ProviderCostService(session, Settings()).compute(WINDOW)
    assert data["prompt_regressions"] == []


async def test_cost_empty(session) -> None:
    await session.commit()
    data = await ProviderCostService(session, Settings()).compute(WINDOW)
    assert data["by_task"] == []
    assert data["overview"][0]["value"] == 0.0
