"""Daily aggregation, telemetry persistence and retention (Phase 14)."""

from datetime import datetime, timezone

from app.core.config import Settings
from app.quality.telemetry import TelemetryEvent, telemetry
from app.services.analytics.aggregation import AnalyticsAggregationService
from sqlalchemy import text
from tests.analytics_helpers import days_ago, make_attempt, make_exercise, make_quality_event


def _settings() -> Settings:
    return Settings(analytics_aggregation_days=7, analytics_retention_days=30)


async def test_telemetry_persisted_idempotently(session) -> None:
    telemetry.reset()
    event = TelemetryEvent(
        task="writing_evaluation",
        provider="fake",
        model="fake-model",
        duration_ms=120,
        success=True,
        quality_status="accepted",
        result_hash="abc123",
        prompt_version="evaluation:v1",
        created_at=datetime.now(timezone.utc),
    )
    telemetry.record(event)
    telemetry.record(event)

    result = await AnalyticsAggregationService(session, _settings()).run(days=1)
    assert result["persisted_telemetry"] == 1
    await session.commit()

    rows = await session.execute(
        text("SELECT COUNT(*) FROM ai_quality_events WHERE event_key IS NOT NULL")
    )
    assert rows.scalar() == 1
    telemetry.reset()


async def test_daily_aggregation_upserts(session) -> None:
    exercise = await make_exercise(session)
    await make_attempt(session, exercise, score=80, when=days_ago(1))
    await session.commit()

    result = await AnalyticsAggregationService(session, _settings()).run(days=7)
    assert result["aggregated"] > 0
    await session.commit()

    rows = (
        await session.execute(
            text(
                "SELECT metric_key, value FROM analytics_daily_metrics WHERE category = 'activity'"
            )
        )
    ).all()
    keys = {row[0] for row in rows}
    assert "attempts.count" in keys
    assert "evaluated.count" in keys
    assert "score.overall.average" in keys
    assert any(row[1] == 80.0 for row in rows if row[0] == "score.overall.average")


async def test_retention_sweeps_old_events(session) -> None:
    await make_quality_event(session, created_at=days_ago(60))
    await make_quality_event(session, created_at=days_ago(1))
    await session.commit()

    result = await AnalyticsAggregationService(session, _settings()).run(days=1)
    assert result["swept_metrics"] == 0
    remaining = (await session.execute(text("SELECT COUNT(*) FROM ai_quality_events"))).scalar()
    assert remaining == 2


async def test_aggregation_result_shape(session) -> None:
    result = await AnalyticsAggregationService(session, _settings()).run(days=1)
    assert set(result) == {
        "aggregated",
        "retained_days",
        "swept_events",
        "swept_metrics",
        "persisted_telemetry",
        "generated_at",
    }
