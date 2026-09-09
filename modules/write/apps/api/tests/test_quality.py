"""Quality layer unit tests (Phase 11): registry, policy, service, telemetry."""

from types import SimpleNamespace

import pytest
from app.core.config import get_settings
from app.quality.cost import estimate_cost
from app.quality.enums import (
    ConfidenceLevel,
    CostProfile,
    Criticality,
    QualityDecision,
    QualityState,
    criticality_at_least,
    parse_confidence,
)
from app.quality.registry import AIQualityRegistry, create_default_quality_registry
from app.quality.service import AIQualityService, create_quality_service
from app.quality.telemetry import AITelemetry, telemetry


class TestEnums:
    def test_parse_confidence(self) -> None:
        assert parse_confidence("high") is ConfidenceLevel.HIGH
        assert parse_confidence("medium") is ConfidenceLevel.MEDIUM
        assert parse_confidence("low") is ConfidenceLevel.LOW
        assert parse_confidence(None) is ConfidenceLevel.MEDIUM
        assert parse_confidence("HIGH") is ConfidenceLevel.HIGH
        assert parse_confidence("nonsense") is ConfidenceLevel.MEDIUM

    def test_criticality_at_least(self) -> None:
        assert criticality_at_least(Criticality.CRITICAL, Criticality.LOW)
        assert criticality_at_least(Criticality.HIGH, Criticality.HIGH)
        assert not criticality_at_least(Criticality.MEDIUM, Criticality.HIGH)

    def test_cost_profile_values(self) -> None:
        values = {profile.value for profile in CostProfile}
        assert {"cheap", "balanced", "quality", "critical"} <= values


class TestRegistry:
    def test_register_and_require(self) -> None:
        registry = AIQualityRegistry()

        def fake_validator(result, **context) -> list[str]:
            return ["broken"] if result.bad else []

        registry.register(
            "fake_task",
            criticality=Criticality.MEDIUM,
            validator=fake_validator,
            cost_profile=CostProfile.CHEAP,
        )
        assert "fake_task" in registry.tasks()
        assert registry.criticality("fake_task") is Criticality.MEDIUM
        assert registry.validate("fake_task", SimpleNamespace(bad=True)) == ["broken"]
        assert registry.validate("fake_task", SimpleNamespace(bad=False)) == []
        with pytest.raises(KeyError):
            registry.require("missing_task")

    def test_unregister(self) -> None:
        registry = AIQualityRegistry()
        registry.register("x", criticality=Criticality.LOW)
        registry.unregister("x")
        assert "x" not in registry.tasks()

    def test_validator_exceptions_become_violations(self) -> None:
        registry = AIQualityRegistry()

        def exploding(result, **context) -> list[str]:
            raise RuntimeError("boom")

        registry.register("explode", criticality=Criticality.LOW, validator=exploding)
        violations = registry.validate("explode", SimpleNamespace())
        assert violations and "RuntimeError" in violations[0]

    def test_task_without_validator_is_valid(self) -> None:
        registry = AIQualityRegistry()
        registry.register("no_checks", criticality=Criticality.LOW)
        assert registry.validate("no_checks", SimpleNamespace()) == []

    def test_default_registry_has_all_engine_tasks(self) -> None:
        registry = create_default_quality_registry()
        expected = {
            "semantic_evaluation",
            "grammar_vocabulary_evaluation",
            "naturalness_register_evaluation",
            "writing_evaluation",
            "exercise_generation",
            "vocabulary_extraction",
            "learner_profile_synthesis",
            "learning_planner",
            "scenario_generation",
            "scenario_evaluation",
            "discourse_evaluation",
            "simulation_turn_evaluation",
            "simulation_state_update",
            "simulation_plan",
            "encouragement",
            "daily_mission",
            "challenge_generation",
            "progress_summary",
        }
        assert expected <= set(registry.tasks())

    def test_writing_evaluation_registers_verifier(self) -> None:
        registry = create_default_quality_registry()
        assert registry.get("writing_evaluation").verifier is not None


class TestQualityService:
    def test_accepts_clean_result(self) -> None:
        service = create_quality_service()
        outcome = service.validate(
            "exercise_generation",
            SimpleNamespace(
                grammar_complexity=5,
                vocabulary_complexity=5,
                context_complexity=5,
                naturalness_target=5,
            ),
            context={"plan": SimpleNamespace(difficulty=5)},
        )
        assert outcome.passed
        assert outcome.state is QualityState.ACCEPTED
        assert outcome.decision is QualityDecision.ACCEPT

    def test_rejects_violation_and_regenerates_within_budget(self) -> None:
        service = create_quality_service()
        outcome = service.validate(
            "exercise_generation",
            SimpleNamespace(
                grammar_complexity=50,
                vocabulary_complexity=5,
                context_complexity=5,
                naturalness_target=5,
            ),
            context={"plan": SimpleNamespace(difficulty=5)},
        )
        assert not outcome.passed
        assert outcome.state is QualityState.REJECTED
        assert outcome.decision is QualityDecision.REGENERATE
        assert outcome.violations

    def test_rejected_after_retry_budget_degrades(self) -> None:
        service = create_quality_service()
        outcome = service.validate(
            "exercise_generation",
            SimpleNamespace(
                grammar_complexity=50,
                vocabulary_complexity=5,
                context_complexity=5,
                naturalness_target=5,
            ),
            context={"plan": SimpleNamespace(difficulty=5)},
            retry_count=99,
        )
        assert outcome.decision is QualityDecision.DEGRADE

    def test_low_confidence_critical_task_escalates(self) -> None:
        service = create_quality_service()
        outcome = service.validate(
            "encouragement",
            SimpleNamespace(),
            confidence="low",
        )
        assert outcome.state is QualityState.LOW_CONFIDENCE
        assert outcome.decision is QualityDecision.DEGRADE

    def test_low_confidence_escalates_for_critical_when_verification_off(self) -> None:
        settings = get_settings().model_copy(update={"ai_quality_verification_enabled": False})
        service = AIQualityService(settings=settings)
        outcome = service.validate(
            "semantic_evaluation",
            SimpleNamespace(
                classification="fully_equivalent",
                score=95,
                meaning_changes=[],
                confidence="low",
            ),
        )
        assert outcome.state is QualityState.LOW_CONFIDENCE
        assert outcome.decision is QualityDecision.ESCALATE

    def test_contradictions_drive_needs_verification(self) -> None:
        service = create_quality_service()
        outcome = service.validate(
            "encouragement",
            SimpleNamespace(),
            confidence="high",
            context={"contradictions": ["cross-engine score mismatch"]},
        )
        assert outcome.state is QualityState.NEEDS_VERIFICATION
        assert not outcome.passed
        assert outcome.contradictions == ["cross-engine score mismatch"]

    def test_unknown_task_degrades_gracefully(self) -> None:
        service = create_quality_service()
        outcome = service.validate("no_such_task", SimpleNamespace())
        assert outcome.passed
        assert outcome.state is QualityState.ACCEPTED

    def test_fingerprint_is_stable(self) -> None:
        service = create_quality_service()
        payload = {"a": 1, "b": "x"}
        first = service.validate("encouragement", SimpleNamespace(**payload))
        second = service.validate("encouragement", SimpleNamespace(**payload))
        assert first.fingerprint == second.fingerprint
        assert len(first.fingerprint) == 64

    def test_metadata_is_privacy_safe(self) -> None:
        service = create_quality_service()
        outcome = service.validate("encouragement", SimpleNamespace(), confidence="high")
        metadata = outcome.to_metadata()
        assert "quality_status" in metadata
        assert "quality_version" in metadata
        assert not any("text" in key for key in metadata)

    async def test_verify_requires_registered_verifier(self) -> None:
        service = create_quality_service()
        with pytest.raises(ValueError):
            await service.verify("semantic_evaluation", context={})

    def test_state_from(self) -> None:
        service = create_quality_service()
        assert service._state_from(None, ["v"], [], ConfidenceLevel.HIGH) is QualityState.REJECTED
        assert (
            service._state_from(None, [], ["c"], ConfidenceLevel.HIGH)
            is QualityState.NEEDS_VERIFICATION
        )
        assert service._state_from(None, [], [], ConfidenceLevel.LOW) is QualityState.LOW_CONFIDENCE
        assert service._state_from(None, [], [], ConfidenceLevel.HIGH) is QualityState.ACCEPTED


class TestTelemetry:
    def test_records_events_and_snapshot(self) -> None:
        settings = get_settings().model_copy(update={"ai_quality_telemetry_enabled": True})
        store = AITelemetry(max_buffer=100)
        service = AIQualityService(telemetry_store=store, settings=settings)
        for _ in range(5):
            service.validate(
                "semantic_evaluation",
                SimpleNamespace(
                    classification="fully_equivalent",
                    score=95,
                    meaning_changes=[],
                    confidence="high",
                ),
                provider="fake",
                model="fake-model",
            )
        snapshot = store.snapshot()
        assert snapshot["total_events"] == 5
        assert "semantic_evaluation" in snapshot["tasks"]
        assert snapshot["tasks"]["semantic_evaluation"]["calls"] == 5
        assert snapshot["tasks"]["semantic_evaluation"]["success_rate"] == 1.0
        assert snapshot["providers"]["fake"]["calls"] == 5

    def test_recent_failures_captured(self) -> None:
        settings = get_settings().model_copy(update={"ai_quality_telemetry_enabled": True})
        store = AITelemetry(max_buffer=100)
        service = AIQualityService(telemetry_store=store, settings=settings)
        outcome = service.validate(
            "exercise_generation",
            SimpleNamespace(
                grammar_complexity=99,
                vocabulary_complexity=5,
                context_complexity=5,
                naturalness_target=5,
            ),
            context={"plan": SimpleNamespace(difficulty=5)},
        )
        assert not outcome.passed
        failures = store.recent_failures()
        assert failures
        assert failures[0]["task"] == "exercise_generation"

    def test_telemetry_disabled_skips_recording(self) -> None:
        settings = get_settings().model_copy(update={"ai_quality_telemetry_enabled": False})
        store = AITelemetry(max_buffer=10)
        service = AIQualityService(telemetry_store=store, settings=settings)
        service.record_call(
            task="encouragement",
            provider="fake",
            model="m",
            duration_ms=5,
            success=True,
        )
        assert store.snapshot()["total_events"] == 0

    def test_record_call_captures_usage_and_cost(self) -> None:
        settings = get_settings().model_copy(update={"ai_quality_telemetry_enabled": True})
        store = AITelemetry(max_buffer=10)
        service = AIQualityService(telemetry_store=store, settings=settings)
        usage = SimpleNamespace(input_tokens=1000, output_tokens=500, total_tokens=1500)
        service.record_call(
            task="semantic_evaluation",
            provider="gemini",
            model="gemini-2.0-flash",
            duration_ms=10,
            success=True,
            usage=usage,
        )
        events = store.events()
        assert len(events) == 1
        assert events[0].token_usage["total_tokens"] == 1500
        assert events[0].estimated_cost and events[0].estimated_cost > 0

    def test_module_singleton_is_shared(self) -> None:
        assert telemetry is telemetry


class TestCostEstimate:
    def test_estimate_uses_provider_pricing(self) -> None:
        usage = SimpleNamespace(input_tokens=1000, output_tokens=500, total_tokens=1500)
        cost = estimate_cost(usage, provider="gemini")
        assert cost.estimated_cost_usd > 0
        assert cost.estimated

    def test_estimate_unknown_provider_is_none(self) -> None:
        usage = SimpleNamespace(input_tokens=1000, output_tokens=500, total_tokens=1500)
        cost = estimate_cost(usage, provider="mystery-provider")
        assert cost.estimated_cost_usd is None

    def test_estimate_no_usage_is_none(self) -> None:
        cost = estimate_cost(None, provider="gemini")
        assert cost.estimated_cost_usd is None
