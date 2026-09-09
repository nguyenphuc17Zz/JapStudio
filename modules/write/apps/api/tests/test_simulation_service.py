"""Simulation service tests (Phase 10): session lifecycle, failure isolation,
challenge suggestion and summary persistence."""

import pytest
from app.core.errors import NotFoundError, SimulationError
from app.providers.ai.fake import FakeAIProvider
from app.repositories import (
    SimulationSessionRepository,
    SimulationTurnRepository,
    WritingScenarioRepository,
)
from app.schemas.evaluation_ai import NaturalnessRegisterEvaluation
from app.schemas.simulation_ai import SimulationStateUpdateResult

from scripted_provider import ScriptedAIProvider
from simulation_helpers import build_simulation_service, scenario_factory


async def _create_session(session, provider, scenario=None, settings=None):
    service = build_simulation_service(session, provider, settings)
    scenario = scenario or scenario_factory()
    await WritingScenarioRepository(session).add(scenario)
    created = await service.create(None, scenario.id, "guided")
    return service, created


def _clear_state_updates(count: int) -> list[SimulationStateUpdateResult]:
    return [
        SimulationStateUpdateResult(
            unresolved_items=[],
            completed_items=["chào hỏi", "nêu mục đích", "đàm phán"],
            facts=[],
            decisions=["Thống nhất thời hạn mới"],
            participant_positions={},
            emotional_context="thân thiện",
            next_goal="Chốt thỏa thuận.",
        )
        for _ in range(count)
    ]


async def _run_to_completion(session, service, session_id: str) -> None:
    for _ in range(3):
        await service.submit_turn(
            None, session_id, "はい、それでお願いします。ありがとうございます。"
        )


class TestCreate:
    async def test_create_persists_session_with_opening_turn(self, session) -> None:
        service, created = await _create_session(session, ScriptedAIProvider())

        assert created.id
        assert created.simulation_type == "business_internal"
        assert created.status == "active"
        assert created.current_turn == 1
        assert created.mode == "guided"
        assert created.objective_vi
        assert created.persona["name"]
        assert created.state.current_stage
        assert len(created.turns) == 1
        opening = created.turns[0]
        assert opening.actor == "ai"
        assert opening.turn_type == "opening"
        assert opening.text

        persisted = await SimulationSessionRepository(session).get_for_user(None, created.id)
        assert persisted is not None
        assert (persisted.meta or {})["simulation_type"] == "business_internal"

    async def test_create_uses_deterministic_type_mapping(self, session) -> None:
        scenario = scenario_factory(genre="business", audience="internal", purpose="meeting")
        service, created = await _create_session(session, ScriptedAIProvider(), scenario)
        assert created.simulation_type in (
            "business_internal",
            "meeting",
            "business_client",
        )

    async def test_create_missing_scenario_raises_not_found(self, session) -> None:
        service = build_simulation_service(session, ScriptedAIProvider())
        with pytest.raises(NotFoundError):
            await service.create(None, "does-not-exist", "guided")

    async def test_create_planner_failure_falls_back(self, session) -> None:
        provider = FakeAIProvider(fail_mode="unavailable")
        service, created = await _create_session(session, provider)
        assert created.id
        meta = created.meta
        assert meta["planner"]["stage"] == "planner_fallback"
        assert created.objective_vi


class TestSubmitTurn:
    async def test_submit_turn_evaluates_and_replies(self, session) -> None:
        service, created = await _create_session(session, ScriptedAIProvider())
        result = await service.submit_turn(
            None, created.id, "今日は仕事が多くて、帰りが遅くなりました。"
        )

        assert result.current_turn == 3
        assert len(result.turns) == 3
        user_turn = result.turns[1]
        assert user_turn.actor == "user"
        assert user_turn.status == "evaluated"
        assert user_turn.evaluation is not None
        assert user_turn.evaluation.overall_score > 0
        ai_turn = result.turns[2]
        assert ai_turn.actor == "ai"
        assert ai_turn.text

        persisted = await SimulationSessionRepository(session).get_for_user(None, created.id)
        assert persisted.state["stage_index"] >= 0

    async def test_submit_turn_validation_errors(self, session) -> None:
        service, created = await _create_session(session, ScriptedAIProvider())
        with pytest.raises(SimulationError, match="between 1 and 2000"):
            await service.submit_turn(None, created.id, "   ")
        with pytest.raises(SimulationError, match="between 1 and 2000"):
            await service.submit_turn(None, created.id, "x" * 2001)

    async def test_submit_turn_inactive_session(self, session) -> None:
        service, created = await _create_session(session, ScriptedAIProvider())
        repository = SimulationSessionRepository(session)
        persisted = await repository.get_for_user(None, created.id)
        persisted.status = "completed"
        await repository.update(persisted)
        with pytest.raises(SimulationError) as excinfo:
            await service.submit_turn(None, created.id, "text")
        assert excinfo.value.status_code == 409

    async def test_submit_turn_wrong_user_raises_not_found(self, session) -> None:
        service, created = await _create_session(session, ScriptedAIProvider())
        with pytest.raises(NotFoundError):
            await service.submit_turn("someone-else", created.id, "text")

    async def test_end_early_ends_session(self, session) -> None:
        service, created = await _create_session(session, ScriptedAIProvider())
        result = await service.submit_turn(None, created.id, "Kết thúc sớm.", end_early=True)
        assert result.status == "ended"
        assert result.resolution == "user_ended"

    async def test_turn_evaluation_persists_evaluation_rows(self, session) -> None:
        service, created = await _create_session(session, ScriptedAIProvider())
        await service.submit_turn(None, created.id, "今日は仕事が多くて、帰りが遅くなりました。")
        rows = await SimulationTurnRepository(session).list_by_session(created.id)
        assert len(rows) == 3
        evaluated = [r for r in rows if r.actor == "user"]
        assert len(evaluated) == 1


class TestChallengeSuggestion:
    async def test_weak_naturalness_suggests_challenge(self, session) -> None:
        low_naturalness = NaturalnessRegisterEvaluation(
            naturalness_classification="unnatural",
            naturalness_score=30,
            context_fit_score=60,
            register_fit_score=60,
            issues=[],
            register_notes=None,
            confidence="medium",
        )
        provider = ScriptedAIProvider(
            naturalness_registers=[low_naturalness],
            simulation_state_updates=_clear_state_updates(3),
        )
        service, created = await _create_session(session, provider)

        await _run_to_completion(session, service, created.id)
        persisted = await SimulationSessionRepository(session).get_for_user(None, created.id)
        assert persisted.status == "completed"
        meta = persisted.meta or {}
        assert meta["challenge_suggested"] is True
        assert meta["challenge_id"]

        summary = await service.summary(None, created.id)
        assert summary.suggested_challenge is not None
        assert summary.suggested_challenge["id"] == meta["challenge_id"]

    async def test_strong_naturalness_skips_challenge(self, session) -> None:
        provider = ScriptedAIProvider(simulation_state_updates=_clear_state_updates(3))
        service, created = await _create_session(session, provider)
        await _run_to_completion(session, service, created.id)
        persisted = await SimulationSessionRepository(session).get_for_user(None, created.id)
        assert persisted.status == "completed"
        assert (persisted.meta or {}).get("challenge_suggested") is False


class TestSummary:
    async def test_summary_generated_once_and_persisted(self, session) -> None:
        service, created = await _create_session(session, ScriptedAIProvider())
        await service.submit_turn(None, created.id, "今日は仕事が多くて、帰りが遅くなりました。")

        first = await service.summary(None, created.id)
        assert first.summary_vi
        assert first.dimensions.get("overall") is not None
        assert first.ai_generated is True

        second = await service.summary(None, created.id)
        assert second.summary_vi == first.summary_vi

        persisted = await SimulationSessionRepository(session).get_for_user(None, created.id)
        assert persisted.summary is not None

    async def test_summary_missing_session(self, session) -> None:
        service = build_simulation_service(session, ScriptedAIProvider())
        with pytest.raises(NotFoundError):
            await service.summary(None, "does-not-exist")


class TestExplainAndCoach:
    async def test_explain_turn_returns_corrections(self, session) -> None:
        service, created = await _create_session(session, ScriptedAIProvider())
        result = await service.submit_turn(
            None, created.id, "今日は仕事が多くて、帰りが遅くなりました。"
        )
        user_turn = result.turns[1]
        explanation = await service.explain_turn(None, created.id, user_turn.id)
        assert explanation.turn_id == user_turn.id
        assert explanation.corrections is not None
        assert explanation.corrections.minimal_fix

    async def test_coach_answers_bounded(self, session) -> None:
        service, created = await _create_session(session, ScriptedAIProvider())
        coach = await service.coach(None, created.id, "Làm sao để nói tự nhiên hơn?")
        assert coach.answer
        assert len(coach.answer) <= 700


class TestList:
    async def test_list_returns_history(self, session) -> None:
        service, created = await _create_session(session, ScriptedAIProvider())
        history = await service.list(None, skip=0, limit=10)
        assert history.total == 1
        assert history.items[0].id == created.id
        assert history.items[0].turn_count == 1
