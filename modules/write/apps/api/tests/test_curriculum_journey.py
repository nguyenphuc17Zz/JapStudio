"""Curriculum journey lifecycle tests (Phase 13).

Service-level tests use a ScriptedAIProvider so each test controls exactly
what the AI returns; API tests run on the app default (fake) provider.
"""

from typing import Any

from app.core.config import Settings
from app.providers.ai.router import AIRouter
from app.repositories import (
    CurriculumPlanRepository,
    CurriculumReplanningEventRepository,
    LearningJourneyRepository,
)
from app.schemas.learning_ai import (
    CurriculumPlanningResult,
    CurriculumReplanningResult,
    GoalInterpretationResult,
)
from app.services.ai_service import AIService
from app.services.curriculum_service import CurriculumService
from sqlalchemy.ext.asyncio import AsyncSession

from scripted_provider import ScriptedAIProvider


def _ai_service(provider: ScriptedAIProvider, settings: Settings | None = None) -> AIService:
    router = AIRouter(
        providers={"fake": lambda: provider},
        default_provider="fake",
        fallback_providers=[],
    )
    return AIService(ai_router=router, settings=settings)


def _service(
    session: AsyncSession,
    provider: ScriptedAIProvider,
    settings: Settings | None = None,
) -> CurriculumService:
    return CurriculumService(session, settings, ai_service=_ai_service(provider, settings))


def _two_milestone_plan() -> CurriculumPlanningResult:
    """4 objectives covering ALL 8 business focus competencies (2 each)."""
    return CurriculumPlanningResult(
        title="Lộ trình tiếng Nhật công việc",
        overview_vi="Hai giai đoạn: nền tảng rồi vận dụng.",
        milestones=[
            {"title": "Giai đoạn 1: Nền tảng", "description": "Xây dựng nền tảng."},
            {"title": "Giai đoạn 2: Vận dụng", "description": "Vận dụng thực tế."},
        ],
        objectives=[
            {
                "title": "Viết email công việc",
                "description": "Rèn email.",
                "target_competencies": ["business_register", "polite_register"],
                "exercise_modes": ["email_writing", "sentence_translation"],
                "target_level": "N4",
                "priority": 3,
                "success_criteria": {},
            },
            {
                "title": "Đặt câu hỏi lịch sự",
                "description": "Rèn requesting.",
                "target_competencies": ["email_writing", "requesting"],
                "exercise_modes": ["sentence_translation", "register_challenge"],
                "target_level": "N4",
                "priority": 3,
                "success_criteria": {},
            },
            {
                "title": "Xin lỗi và làm rõ",
                "description": "Rèn clarification.",
                "target_competencies": ["clarification", "apologizing"],
                "exercise_modes": ["report_writing", "sentence_translation"],
                "target_level": "N3",
                "priority": 2,
                "success_criteria": {},
            },
            {
                "title": "Báo cáo và đàm phán",
                "description": "Rèn reporting.",
                "target_competencies": ["reporting", "negotiating"],
                "exercise_modes": ["chat_writing", "register_challenge"],
                "target_level": "N3",
                "priority": 2,
                "success_criteria": {},
            },
        ],
    )


async def test_create_journey_falls_back_to_deterministic_plan(
    session: AsyncSession,
) -> None:
    provider = ScriptedAIProvider(fail_at=1)
    service = _service(session, provider)
    journey = await service.create_journey(None, goal_type="business")
    assert journey.status == "active"
    assert journey.goal_type == "business"
    assert journey.source == "fallback"

    milestones = await service._curriculum.milestones.list_for_journey(journey.id)
    objectives = await service._curriculum.objectives.list_for_journey(journey.id)
    progress_rows = await service._curriculum.progress.list_for_journey(journey.id)
    assert 2 <= len(milestones) <= 8
    assert 4 <= len(objectives) <= 48
    assert len(progress_rows) == len(objectives)

    active = [o for o in objectives if o.status == "active"]
    assert len(active) == 1
    assert active[0].position == 1
    assert objectives[0].entry_criteria == {}
    assert objectives[1].entry_criteria == {"previous_objective_completed": True}


async def test_create_journey_persists_ai_plan(session: AsyncSession) -> None:
    provider = ScriptedAIProvider(
        goal_interpretations=[
            GoalInterpretationResult(
                goal_type="business",
                suggested_goal="Tiếng Nhật công việc",
                focus_competencies=["business_register", "requesting"],
                rationale_vi="Mục tiêu công việc rõ ràng.",
            )
        ],
        curriculum_plans=[_two_milestone_plan()],
    )
    service = _service(session, provider)
    journey = await service.create_journey(None, goal="Tôi cần tiếng Nhật để đi làm")
    assert journey.source == "ai"
    assert journey.goal == "Tôi cần tiếng Nhật để đi làm"

    milestones = await service._curriculum.milestones.list_for_journey(journey.id)
    objectives = await service._curriculum.objectives.list_for_journey(journey.id)
    assert [m.title for m in milestones] == ["Giai đoạn 1: Nền tảng", "Giai đoạn 2: Vận dụng"]
    assert [o.title for o in objectives] == [
        "Viết email công việc",
        "Đặt câu hỏi lịch sự",
        "Xin lỗi và làm rõ",
        "Báo cáo và đàm phán",
    ]
    assert objectives[0].status == "active"
    assert objectives[1].status == "locked"

    plan = await CurriculumPlanRepository(session).list(limit=100)
    journey_plans = [p for p in plan if p.journey_id == journey.id]
    assert len(journey_plans) == 1
    assert journey_plans[0].plan_type == "initial"


async def test_evidence_drives_objective_then_journey_completion(
    session: AsyncSession,
) -> None:
    provider = ScriptedAIProvider(curriculum_plans=[_two_milestone_plan()])
    service = _service(session, provider)
    journey = await service.create_journey(None, goal_type="business")

    completed_objectives = 0
    attempt_index = 0
    journey_done = False
    while not journey_done:
        context = await service.get_objective_context(None)
        assert context is not None
        skills = {skill: 90 for skill in context["target_skills"]}
        for _ in range(5):
            mode = "sentence_translation" if attempt_index % 2 == 0 else "register_challenge"
            result = await service.record_evidence(
                None,
                exercise_id=f"exercise-{attempt_index}",
                attempt_id=f"attempt-{attempt_index}",
                score=90,
                skills=skills,
                mode=mode,
            )
            if result["objective_completed"]:
                completed_objectives += 1
            attempt_index += 1
        journey_done = result["journey_completed"]

    assert completed_objectives == 4
    journey = await LearningJourneyRepository(session).get(journey.id)
    assert journey is not None
    assert journey.status == "completed"
    assert journey.progress == 100


async def test_replanning_stagnation_trigger_records_event(
    session: AsyncSession,
) -> None:
    settings = Settings(
        ai_curriculum_replan_interval=2,
        ai_curriculum_min_evidence_confident=1,
    )
    # Fallback "general" plan has 7 objectives -> progress 14% after the first
    # completion (even), so the trigger scan runs while the next objective is
    # still active with accumulating low-score evidence.
    provider = ScriptedAIProvider(fail_at=1)
    service = _service(session, provider, settings)
    journey = await service.create_journey(None, goal_type="general")

    context = await service.get_objective_context(None)
    assert context is not None
    skills = {skill: 90 for skill in context["target_skills"]}
    for index in range(5):
        await service.record_evidence(
            None,
            exercise_id=f"e1-{index}",
            attempt_id=f"a1-{index}",
            score=90,
            skills=skills,
            mode="sentence_translation" if index % 2 == 0 else "register_challenge",
        )

    context = await service.get_objective_context(None)
    assert context is not None
    skills = {skill: 40 for skill in context["target_skills"]}
    for index in range(2):
        await service.record_evidence(
            None,
            exercise_id=f"e2-{index}",
            attempt_id=f"a2-{index}",
            score=40,
            skills=skills,
            mode="sentence_translation",
        )

    events = await CurriculumReplanningEventRepository(session).list_for_journey(
        journey.id, limit=10
    )
    stagnation = [e for e in events if e.trigger == "stagnation"]
    assert len(stagnation) == 1
    assert stagnation[0].replan_requested is True
    assert stagnation[0].applied is False


async def test_forced_replan_applies_ai_updates(session: AsyncSession) -> None:
    provider = ScriptedAIProvider(curriculum_plans=[_two_milestone_plan()])
    service = _service(session, provider)
    journey = await service.create_journey(None, goal_type="business")
    context = await service.get_objective_context(None)
    assert context is not None
    objective_id = context["objective_id"]

    provider._curriculum_replans.append(
        CurriculumReplanningResult(
            objective_changes=[
                {
                    "action": "update",
                    "objective_id": objective_id,
                    "field_updates": {"title": "Email công việc nâng cao"},
                }
            ],
            rationale_vi="Nâng cấp nội dung sau khi đã nắm nền tảng.",
        )
    )
    changes = [
        {
            "action": "update",
            "objective_id": objective_id,
            "field_updates": {"title": "Email công việc nâng cao"},
        }
    ]
    payload = await service.replan(None, requested_changes=changes)
    assert payload["replan_requested"] is True
    assert payload["applied"] is True
    assert payload["trigger"] == "objective_change_request"

    objectives = await service._curriculum.objectives.list_for_journey(journey.id)
    updated = next(o for o in objectives if o.id == objective_id)
    assert updated.title == "Email công việc nâng cao"

    plans = await CurriculumPlanRepository(session).list(limit=100)
    assert any(plan.plan_type == "replan" and plan.journey_id == journey.id for plan in plans)


async def test_replan_without_request_does_not_call_ai(session: AsyncSession) -> None:
    provider = ScriptedAIProvider()
    service = _service(session, provider)
    journey = await service.create_journey(None, goal_type="business")
    calls_before = provider.structured_calls
    payload = await service.replan(None)
    assert payload["journey_id"] == journey.id
    assert payload["replan_requested"] is False
    assert payload["applied"] is False
    assert provider.structured_calls == calls_before  # no AI replanning call


async def test_get_objective_context_shape(session: AsyncSession) -> None:
    provider = ScriptedAIProvider(curriculum_plans=[_two_milestone_plan()])
    service = _service(session, provider)
    await service.create_journey(None, goal_type="business")
    context = await service.get_objective_context(None)
    assert context is not None
    assert set(
        {
            "objective_id",
            "milestone_id",
            "objective_title",
            "milestone_title",
            "competency_labels_vi",
            "target_skills",
            "suggested_modes",
            "context",
            "progress",
        }
    ) <= set(context)
    assert context["objective_title"] == "Viết email công việc"
    assert "business_register" in context["competency_labels_vi"]


# --------------------------------------------------------------------------- API


async def test_journey_api_create_status_context_evidence(
    session: AsyncSession, client: Any
) -> None:
    response = await client.post("/api/v1/learning/journey", json={"goal_type": "business"})
    assert response.status_code == 201
    body = response.json()
    assert body["goal_type"] == "business"
    assert body["status"] == "active"
    assert len(body["milestones"]) >= 2
    assert len(body["objectives"]) >= 4

    response = await client.get("/api/v1/learning/journey")
    assert response.status_code == 200
    assert response.json()["journey_id"] == body["journey_id"]

    response = await client.get("/api/v1/learning/journey/objective/context")
    assert response.status_code == 200
    context = response.json()
    assert context["objective_id"] is not None
    assert "competency_labels_vi" in context

    response = await client.get("/api/v1/learning/journey/objective/evidence")
    assert response.status_code == 200
    assert response.json()["total"] == 0


async def test_journey_api_force_regenerate_archives_previous(
    session: AsyncSession, client: Any
) -> None:
    first = await client.post("/api/v1/learning/journey", json={"goal_type": "general"})
    assert first.status_code == 201
    first_id = first.json()["journey_id"]
    second = await client.post(
        "/api/v1/learning/journey",
        json={"goal_type": "business", "force_regenerate": True},
    )
    assert second.status_code == 201
    assert second.json()["journey_id"] != first_id

    repository = LearningJourneyRepository(session)
    archived = await repository.get(first_id)
    assert archived is not None
    assert archived.status == "archived"
    assert archived.archived_at is not None
    active = await repository.get_active(None)
    assert active is not None
    assert active.id == second.json()["journey_id"]


async def test_journey_api_replan_returns_none_when_no_journey(
    session: AsyncSession, client: Any
) -> None:
    response = await client.post("/api/v1/learning/journey/replan")
    assert response.status_code == 200
    body = response.json()
    assert body["journey_id"] is None
    assert body["replan_requested"] is False
