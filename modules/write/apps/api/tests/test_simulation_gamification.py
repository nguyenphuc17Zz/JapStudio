"""Gamification hook tests (Phase 10): XP awards, idempotency, mission/streak."""

from app.core.config import Settings
from app.repositories import WritingScenarioRepository, XPEventRepository

from simulation_helpers import scenario_factory


async def _session_row(session, **overrides: object) -> dict[str, object]:
    scenario = scenario_factory()
    await WritingScenarioRepository(session).add(scenario)
    snapshot = {
        "id": "session-snapshot-1",
        "user_id": None,
        "simulation_type": "business_internal",
        "mode": "guided",
        "resolution": "success",
    }
    snapshot.update(overrides)
    return snapshot


async def _build(session, settings: Settings | None = None):
    from app.api.v1.gamification import build_gamification_service

    return build_gamification_service(session, settings or Settings())


class TestRecordSimulationActivity:
    async def test_completion_awards_xp(self, session) -> None:
        service = await _build(session)
        row = await _session_row(session)

        result = await service.record_simulation_activity(
            None,
            session=row,
            average=75,
            objective_resolved=True,
            improved=False,
        )

        assert result["enabled"] is True
        kinds = [event["event_type"] for event in result["xp_events"]]
        assert "simulation_complete" in kinds
        assert "simulation_objective" in kinds
        assert "simulation_improvement" not in kinds

        events = (await XPEventRepository(session).list_by_user(None))[0]
        assert len(events) == 2

    async def test_improvement_award(self, session) -> None:
        service = await _build(session)
        row = await _session_row(session)

        result = await service.record_simulation_activity(
            None,
            session=row,
            average=85,
            objective_resolved=False,
            improved=True,
        )

        kinds = [event["event_type"] for event in result["xp_events"]]
        assert "simulation_improvement" in kinds

    async def test_idempotent_rewards(self, session) -> None:
        service = await _build(session)
        row = await _session_row(session)

        await service.record_simulation_activity(
            None, session=row, average=75, objective_resolved=True, improved=False
        )
        await service.record_simulation_activity(
            None, session=row, average=75, objective_resolved=True, improved=False
        )

        events = (await XPEventRepository(session).list_by_user(None))[0]
        assert len(events) == 2

    async def test_disabled_gamification_skips(self, session) -> None:
        settings = Settings(gamification_enabled=False)
        service = await _build(session, settings)
        row = await _session_row(session)

        result = await service.record_simulation_activity(
            None, session=row, average=75, objective_resolved=True, improved=False
        )
        assert result == {"enabled": False}
        events = (await XPEventRepository(session).list_by_user(None))[0]
        assert events == []

    async def test_never_raises(self, session) -> None:
        service = await _build(session)
        row = await _session_row(session)
        result = await service.record_simulation_activity(
            None, session=row, average=None, objective_resolved=False, improved=True
        )
        assert "error" not in result
        assert "xp_events" in result
