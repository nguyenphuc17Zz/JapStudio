"""Unit and integration tests for Real-World Writing Mission Service (Phase 20)."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.domain.real_world_missions import (
    EVALUATION_DIMENSIONS,
    MISSION_ACTIONS,
    MISSION_CATEGORIES,
    PROMPT_MODES,
    recommend_prompt_mode_for_jlpt,
)
from app.models import LearnerProfile, WritingWeakness
from app.providers.ai.router import AIRouter
from app.repositories import (
    LearnerMemoryRepository,
    LearnerProfileRepository,
    SimulationSessionRepository,
    SimulationTurnRepository,
    WritingScenarioRepository,
)
from app.repositories.writing_intelligence import WritingWeaknessRepository
from app.schemas.real_world_mission import (
    MissionEvaluationRequest,
    RealWorldMissionGenerateRequest,
    TransitionToSimulationRequest,
)
from app.services.ai_service import AIService
from app.services.real_world_mission_service import RealWorldMissionService
from tests.scripted_provider import ScriptedAIProvider


def _ai(provider: ScriptedAIProvider | None = None, settings: Settings | None = None) -> AIService:
    router = AIRouter(
        providers={"fake": lambda: provider or ScriptedAIProvider()},
        default_provider="fake",
        fallback_providers=[],
    )
    return AIService(ai_router=router, settings=settings)


@pytest.mark.asyncio
async def test_mission_taxonomy_structure(session: AsyncSession):
    """Test that mission taxonomy exposes all 4 categories, 23 actions, 3 modes, and 10 dimensions."""
    app_settings = get_settings()
    ai_service = _ai(ScriptedAIProvider(), app_settings)
    scenario_repo = WritingScenarioRepository(session)
    service = RealWorldMissionService(
        ai_service=ai_service,
        scenario_repository=scenario_repo,
        settings=app_settings,
    )

    taxonomy = service.get_taxonomy()
    assert len(taxonomy.categories) == 4
    assert {c.id for c in taxonomy.categories} == set(MISSION_CATEGORIES)
    assert len(taxonomy.actions) == 23
    assert {a.action_type for a in taxonomy.actions} == set(MISSION_ACTIONS.keys())
    assert len(taxonomy.prompt_modes) == 3
    assert {m.mode for m in taxonomy.prompt_modes} == set(PROMPT_MODES)
    assert len(taxonomy.evaluation_dimensions) == 10
    assert {d.key for d in taxonomy.evaluation_dimensions} == set(EVALUATION_DIMENSIONS)


def test_recommend_prompt_mode_for_jlpt():
    """Test adaptive immersion progression from Mode A (N5/N4) to Mode B (N3) and Mode C (N2/N1)."""
    assert recommend_prompt_mode_for_jlpt("N5") == "vietnamese_scenario"
    assert recommend_prompt_mode_for_jlpt("N4") == "vietnamese_scenario"
    assert recommend_prompt_mode_for_jlpt("N3") == "japanese_scenario"
    assert recommend_prompt_mode_for_jlpt("N2") == "contextual_simulation"
    assert recommend_prompt_mode_for_jlpt("N1") == "contextual_simulation"
    assert recommend_prompt_mode_for_jlpt(None) == "vietnamese_scenario"


@pytest.mark.asyncio
async def test_generate_real_world_mission_with_weakness_integration(session: AsyncSession):
    """Test mission generation organically embeds active learner weaknesses into the task."""
    app_settings = get_settings()
    ai_service = _ai(ScriptedAIProvider(), app_settings)
    scenario_repo = WritingScenarioRepository(session)
    weakness_repo = WritingWeaknessRepository(session)
    profile_repo = LearnerProfileRepository(session)

    # Seed an active weakness
    weakness = WritingWeakness(
        user_id=None,
        category="register",
        subtype="keigo_confusion",
        description="Nhầm lẫn giữa tôn kính ngữ và khiêm nhường ngữ khi xin phép",
        related_expressions=["〜させていただきます", "〜していただく"],
        status="persistent",
        mastery_score=0.3,
    )
    await weakness_repo.add(weakness)

    service = RealWorldMissionService(
        ai_service=ai_service,
        scenario_repository=scenario_repo,
        weakness_repository=weakness_repo,
        profile_repository=profile_repo,
        settings=app_settings,
    )

    mission = await service.generate_mission(
        None,
        RealWorldMissionGenerateRequest(
            category="work",
            action_type="deadline_delay",
            jlpt_level="N3",
        ),
    )

    assert mission.id is not None
    assert mission.category == "work"
    assert mission.action_type == "deadline_delay"
    assert mission.role == "Kỹ sư phần mềm BrSE"
    assert mission.recipient == "Trưởng phòng Sato (佐藤部長)"
    assert len(mission.required_points) == 3
    assert len(mission.optional_vocabulary) >= 3
    assert mission.target_register == "business"

    # Verify persisted scenario
    persisted = await scenario_repo.get_for_user(None, mission.id)
    assert persisted is not None
    assert persisted.generation_metadata.get("mission_category") == "work"
    assert persisted.generation_metadata.get("target_weakness_id") == weakness.id


@pytest.mark.asyncio
async def test_evaluate_mission_10_dimensions_and_mastery_update(session: AsyncSession):
    """Test 10-dimensional evaluation returns comprehensive breakdown and updates mastery."""
    app_settings = get_settings()
    ai_service = _ai(ScriptedAIProvider(), app_settings)
    scenario_repo = WritingScenarioRepository(session)
    weakness_repo = WritingWeaknessRepository(session)

    # Seed weakness
    weakness = WritingWeakness(
        user_id=None,
        category="register",
        subtype="keigo_confusion",
        description="Nhầm lẫn khiêm nhường ngữ",
        mastery_score=0.4,
        exposure_count=1,
        corrected_count=0,
    )
    saved_weakness = await weakness_repo.add(weakness)

    service = RealWorldMissionService(
        ai_service=ai_service,
        scenario_repository=scenario_repo,
        weakness_repository=weakness_repo,
        settings=app_settings,
    )

    # Generate mission
    mission = await service.generate_mission(
        None,
        RealWorldMissionGenerateRequest(
            category="work",
            action_type="progress_update",
            target_weakness_id=saved_weakness.id,
        ),
    )

    # Evaluate learner response
    learner_text = "佐藤部長、お疲れ様です。進捗のご報告です。開発は90%完了しておりますが、明日17時まで延長をお願いできますでしょうか。"
    eval_res = await service.evaluate_mission(
        None,
        MissionEvaluationRequest(
            scenario_id=mission.id,
            text=learner_text,
        ),
    )

    assert eval_res.overall_score == 88
    assert eval_res.passed is True
    assert eval_res.dimensions.task_completion.score == 90
    assert eval_res.dimensions.factual_completeness.score == 90
    assert eval_res.dimensions.naturalness.score == 85
    assert eval_res.dimensions.grammar.score == 90
    assert eval_res.dimensions.vocabulary.score == 85
    assert eval_res.dimensions.register.score == 90
    assert eval_res.dimensions.politeness.score == 90
    assert eval_res.dimensions.tone.score == 85
    assert eval_res.dimensions.clarity.score == 88
    assert eval_res.dimensions.discourse.score == 87
    assert len(eval_res.required_points) == 3
    assert eval_res.constraints_respected is True
    assert len(eval_res.native_model_rewrite) > 10
    assert eval_res.weakness_mastery_updated is True

    # Check that weakness mastery score was incremented
    updated_weakness = await weakness_repo.get(saved_weakness.id)
    assert updated_weakness.exposure_count == 2
    assert updated_weakness.corrected_count == 1
    assert updated_weakness.mastery_score >= 0.5


@pytest.mark.asyncio
async def test_transition_to_simulation(session: AsyncSession):
    """Test transitioning a mission directly into an interactive multi-turn simulation session."""
    app_settings = get_settings()
    ai_service = _ai(ScriptedAIProvider(), app_settings)
    scenario_repo = WritingScenarioRepository(session)
    session_repo = SimulationSessionRepository(session)
    turn_repo = SimulationTurnRepository(session)

    service = RealWorldMissionService(
        ai_service=ai_service,
        scenario_repository=scenario_repo,
        session_repository=session_repo,
        turn_repository=turn_repo,
        settings=app_settings,
    )

    # Generate mission
    mission = await service.generate_mission(
        None,
        RealWorldMissionGenerateRequest(category="daily_life", action_type="cancelling_plans"),
    )

    # Transition to simulation
    learner_msg = "田中さん、急な体調不良のため、本日の約束を延期させていただけないでしょうか。"
    trans_res = await service.transition_to_simulation(
        None,
        TransitionToSimulationRequest(
            scenario_id=mission.id,
            initial_user_text=learner_msg,
        ),
    )

    assert trans_res.session_id is not None
    assert trans_res.scenario_id == mission.id
    assert trans_res.status == "active"
    assert trans_res.current_turn == 2
    assert len(trans_res.turns) == 2
    assert trans_res.turns[0]["actor"] == "user"
    assert trans_res.turns[0]["text"] == learner_msg
    assert trans_res.turns[1]["actor"] == "ai"
    assert len(trans_res.turns[1]["text"]) > 0


@pytest.mark.asyncio
async def test_generate_random_and_curated_mission(session: AsyncSession):
    """Test generating mission with category='random', action_type='random', prompt_mode='random'."""
    app_settings = get_settings()
    ai_service = _ai(ScriptedAIProvider(), app_settings)
    scenario_repo = WritingScenarioRepository(session)

    service = RealWorldMissionService(
        ai_service=ai_service,
        scenario_repository=scenario_repo,
        settings=app_settings,
    )

    # 1. Random category & action
    mission_rand = await service.generate_mission(
        None,
        RealWorldMissionGenerateRequest(
            category="random",
            action_type="random",
            prompt_mode="random",
            jlpt_level="N2",
        ),
    )
    assert mission_rand.category in MISSION_CATEGORIES
    assert mission_rand.action_type in MISSION_ACTIONS
    assert mission_rand.prompt_mode == "contextual_simulation"  # N2 recommends contextual_simulation

    # 2. None / auto defaults
    mission_auto = await service.generate_mission(
        None,
        RealWorldMissionGenerateRequest(
            jlpt_level="N5",
        ),
    )
    assert mission_auto.category in MISSION_CATEGORIES
    assert mission_auto.action_type in MISSION_ACTIONS
    assert mission_auto.prompt_mode == "vietnamese_scenario"  # N5 recommends vietnamese_scenario
