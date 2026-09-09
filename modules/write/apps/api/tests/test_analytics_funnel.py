"""Product funnel (Phase 14)."""

from app.core.config import Settings
from app.services.analytics.funnel import FunnelService
from tests.analytics_helpers import days_ago, make_attempt, make_exercise, make_opened_event

WINDOW = "30d"


async def test_funnel_stages(session) -> None:
    exercise = await make_exercise(session)
    await make_opened_event(session, exercise.id, when=days_ago(3))
    await make_opened_event(session, exercise.id, when=days_ago(2))
    await make_attempt(session, exercise, score=70, when=days_ago(1))
    await session.commit()

    data = await FunnelService(session, Settings()).compute(WINDOW)
    stages = {stage["stage"]: stage for stage in data["stages"]}
    assert stages["opened"]["value"] == 2
    assert stages["attempted"]["value"] == 1
    assert stages["evaluated"]["value"] == 1
    assert stages["opened"]["conversion"] == 1.0
    assert stages["attempted"]["conversion"] == 0.5
    assert data["window"] == WINDOW


async def test_funnel_empty(session) -> None:
    await session.commit()
    data = await FunnelService(session, Settings()).compute(WINDOW)
    assert all(stage["value"] == 0 for stage in data["stages"])
    assert all(stage["conversion"] is None for stage in data["stages"])
