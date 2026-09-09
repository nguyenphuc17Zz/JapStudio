"""Scenario service tests (Phase 9): generation pipeline, taxonomy gate,
validation/regeneration loop, repeat-avoidance and failure mapping."""

import pytest
from app.core.config import Settings
from app.core.errors import ScenarioGenerationError
from app.models import WritingScenario
from app.providers.ai.router import AIRouter
from app.repositories import WritingScenarioRepository
from app.schemas.writing_scenario import (
    ScenarioGenerateRequest,
)
from app.services.ai_service import AIService
from app.services.scenario_service import ScenarioService

from scripted_provider import (
    ScriptedAIProvider,
    default_scenario_draft,
    default_scenario_plan,
    default_scenario_validation,
)


def _service(session, provider, settings: Settings | None = None) -> ScenarioService:
    router = AIRouter(
        providers={"fake": lambda: provider},
        default_provider="fake",
        fallback_providers=["fake"],
        max_retries=0,
        retry_backoff=0.01,
    )
    return ScenarioService(
        ai_service=AIService(ai_router=router),
        scenario_repository=WritingScenarioRepository(session),
        settings=settings or Settings(),
    )


class TestScenarioGeneration:
    async def test_generate_persists_valid_scenario(self, session) -> None:
        service = _service(session, ScriptedAIProvider())
        scenario = await service.generate(None, None)

        assert isinstance(scenario, WritingScenario)
        assert scenario.genre == "business_email"
        assert scenario.medium == "email"
        assert scenario.audience == "manager"
        assert scenario.purpose == "report"
        assert scenario.register == "business"
        assert scenario.difficulty == 5
        assert len(scenario.required_points) == 3
        assert scenario.situation_vi
        assert scenario.context_vi
        assert scenario.status == "generated"
        metadata = scenario.generation_metadata or {}
        assert metadata["generation_version"] == "scenario:v1"
        assert metadata["regeneration_attempts"] == 0

        persisted = await WritingScenarioRepository(session).get_for_user(None, scenario.id)
        assert persisted is not None

    async def test_preferences_are_passed_to_planner(self, session) -> None:
        service = _service(session, ScriptedAIProvider())
        scenario = await service.generate(
            None,
            ScenarioGenerateRequest(genre="opinion", jlpt_level="N4", difficulty=6),
        )
        assert scenario.genre == "business_email"

    async def test_invalid_taxonomy_plan_raises_generation_error(self, session) -> None:
        plan = default_scenario_plan().model_copy(update={"genre": "not_a_genre"})
        provider = ScriptedAIProvider(scenario_plans=[plan])
        service = _service(session, provider)
        with pytest.raises(ScenarioGenerationError, match="Unsupported genre"):
            await service.generate(None, None)

    async def test_invalid_target_length_raises_generation_error(self, session) -> None:
        plan = default_scenario_plan().model_copy(update={"target_length": "sentence"})
        provider = ScriptedAIProvider(scenario_plans=[plan])
        service = _service(session, provider)
        with pytest.raises(ScenarioGenerationError, match="target_length"):
            await service.generate(None, None)

    async def test_validation_rejection_regenerates(self, session) -> None:
        provider = ScriptedAIProvider(
            scenario_validations=[default_scenario_validation(valid=False)],
        )
        service = _service(session, provider)
        scenario = await service.generate(None, None)
        assert scenario.id
        assert provider.structured_calls >= 4  # plan + 2 drafts + 2 validations

    async def test_cross_consistency_regenerates(self, session) -> None:
        draft = default_scenario_draft().model_copy(
            update={
                "grammar_complexity": 10,
                "vocabulary_complexity": 10,
                "context_complexity": 10,
                "naturalness_target": 10,
            }
        )
        provider = ScriptedAIProvider(
            scenario_drafts=[draft, default_scenario_draft()],
        )
        service = _service(session, provider)
        scenario = await service.generate(None, None)
        assert scenario.difficulty == 5

    async def test_repeat_combination_rejected_and_fails(self, session) -> None:
        existing = WritingScenario(
            user_id=None,
            genre="business_email",
            medium="email",
            audience="manager",
            relationship="professional",
            purpose="report",
            register="business",
            tone="professional",
            target_length="paragraph",
            jlpt_level="N3",
            topic="Báo cáo tiến độ",
            situation_vi="Tình huống đã tồn tại trong quá khứ.",
            context_vi="Viết email báo cáo tiến độ dự án cho trưởng bộ phận.",
            required_points=[{"id": "rp1", "description": "Yêu cầu 1"}],
            difficulty=5,
            status="generated",
        )
        await WritingScenarioRepository(session).add(existing)
        service = _service(
            session,
            ScriptedAIProvider(),
            Settings(ai_scenario_max_regeneration_attempts=0),
        )
        with pytest.raises(ScenarioGenerationError, match="repeats a recent combination"):
            await service.generate(None, None)

    async def test_provider_failure_maps_to_generation_error(self, session) -> None:
        from app.providers.ai.fake import FakeAIProvider

        provider = FakeAIProvider(fail_mode="invalid_structured")
        service = _service(session, provider)
        with pytest.raises(ScenarioGenerationError):
            await service.generate(None, None)

    async def test_overall_difficulty_is_weighted(self, session) -> None:
        service = _service(session, ScriptedAIProvider())
        metadata = {
            "language": 6,
            "context": 6,
            "audience": 6,
            "purpose": 6,
            "constraint": 6,
            "register": 6,
        }
        assert service._overall_difficulty(metadata) == 6
        metadata = {
            "language": 10,
            "context": 10,
            "audience": 1,
            "purpose": 1,
            "constraint": 1,
            "register": 1,
        }
        weighted = service._overall_difficulty(metadata)
        assert 4 <= weighted <= 8
