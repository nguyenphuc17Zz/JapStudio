"""Scenario-aware discourse tests (Phase 9): scenario stage integration,
professional rewrite gating, failure isolation and scenario hints."""

from app.core.config import Settings
from app.models import Exercise, WritingScenario
from app.providers.ai.fake import FakeAIProvider
from app.providers.ai.router import AIRouter
from app.repositories import (
    DiscourseEvaluationRepository,
    DiscourseIssueRepository,
    ExerciseAttemptRepository,
    ExerciseRepository,
    WritingFeedbackRepository,
    WritingRevisionRepository,
    WritingScenarioRepository,
    WritingSubmissionRepository,
)
from app.schemas.discourse_ai import DiscourseSynthesisResult
from app.services.ai_service import AIService
from app.services.discourse_service import DiscourseService
from app.services.evaluation_service import EvaluationService

from conftest import exercise_factory
from scripted_provider import ScriptedAIProvider

TWO_SENTENCES = "今日は仕事がとても忙しかったです。だから、帰りが遅くなりました。"


async def _seed_scenario(session, **overrides) -> WritingScenario:
    base = dict(
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
        topic="Báo cáo tiến độ dự án đang bị trễ",
        situation_vi=(
            "Bạn là nhân viên trong công ty Nhật Bản. Dự án đang bị trễ và sếp "
            "yêu cầu bạn gửi email báo cáo."
        ),
        context_vi=("Viết email báo cáo tiến độ dự án cho trưởng bộ phận bằng tiếng Nhật."),
        required_points=[
            {"id": "rp1", "description": "Chào hỏi và nêu mục đích báo cáo."},
            {"id": "rp2", "description": "Mô tả tiến độ hiện tại và lý do trễ."},
            {"id": "rp3", "description": "Đề xuất kế hoạch hoàn thành mới."},
        ],
        optional_points=["Xin lỗi vì sự chậm trễ"],
        forbidden_patterns=["Dùng ngôn ngữ suồng sã"],
        difficulty=5,
        status="generated",
    )
    base.update(overrides)
    return await WritingScenarioRepository(session).add(WritingScenario(**base))


async def _seed_scenario_exercise(session, scenario: WritingScenario, **overrides) -> Exercise:
    return await ExerciseRepository(session).add(
        Exercise(
            **exercise_factory(
                target_length="paragraph",
                register="business",
                scenario_id=scenario.id,
                **overrides,
            )
        )
    )


def _service(
    session,
    provider,
    settings: Settings | None = None,
    *,
    fallback_providers: list[str] | None = None,
) -> DiscourseService:
    router = AIRouter(
        providers={
            "fake": lambda: provider,
            "failing": lambda: FakeAIProvider(fail_mode="invalid_structured"),
        },
        default_provider="fake",
        fallback_providers=fallback_providers or ["fake"],
        max_retries=0,
        retry_backoff=0.01,
    )
    resolved = settings or Settings()
    ai_service = AIService(ai_router=router)
    evaluation_service = EvaluationService(
        ai_service=ai_service,
        attempt_repository=ExerciseAttemptRepository(session),
        feedback_repository=WritingFeedbackRepository(session),
        settings=resolved,
    )
    return DiscourseService(
        evaluation_service=evaluation_service,
        ai_service=ai_service,
        submission_repository=WritingSubmissionRepository(session),
        revision_repository=WritingRevisionRepository(session),
        evaluation_repository=DiscourseEvaluationRepository(session),
        issue_repository=DiscourseIssueRepository(session),
        attempt_repository=ExerciseAttemptRepository(session),
        feedback_repository=WritingFeedbackRepository(session),
        settings=resolved,
        scenario_repository=WritingScenarioRepository(session),
    )


class TestScenarioStage:
    async def test_submit_runs_scenario_stage(self, session) -> None:
        scenario = await _seed_scenario(session)
        exercise = await _seed_scenario_exercise(session, scenario)
        service = _service(session, ScriptedAIProvider())
        result = await service.submit(exercise, TWO_SENTENCES)

        response = result.response
        assert response.status == "evaluated"
        assert response.scenario_unavailable is False
        assert response.scores.scenario_fit == 89
        assert response.scores.scenario_semantic_fit == 90
        assert response.scores.audience_fit == 90
        assert response.scores.purpose_fit == 88
        assert response.scores.tone_fit == 90
        assert response.scores.constraint_compliance == 85
        assert len(response.scenario_required_points) == 3
        assert [p["status"] for p in response.scenario_required_points] == [
            "satisfied",
            "partially_satisfied",
            "satisfied",
        ]
        assert len(response.scenario_format_sections) == 3
        combined = service._scenario_combined(response.scores.discourse_quality, 89)
        assert response.scores.overall_writing == service._blend(
            response.scores.sentence_quality, combined
        )

        submission = await WritingSubmissionRepository(session).get(result.response.submission_id)
        assert submission.mode == "scenario"
        revision = (await WritingRevisionRepository(session).list_by_submission(submission.id))[0]
        evaluation = await DiscourseEvaluationRepository(session).get_by_revision(revision.id)
        assert evaluation is not None
        persisted = evaluation.scores or {}
        assert persisted["scenario_fit"] == 89
        assert persisted["scenario_required_points"][0]["status"] == "satisfied"
        stages = (evaluation.provenance or {}).get("stages", [])
        assert "scenario_evaluation" in [stage["stage"] for stage in stages]

    async def test_professional_rewrite_for_business_register(self, session) -> None:
        scenario = await _seed_scenario(session)
        exercise = await _seed_scenario_exercise(session, scenario)
        synthesis = DiscourseSynthesisResult(
            strengths=["Câu văn truyền đạt đúng ý chính."],
            summary="Bài viết mạch lạc và đúng trọng tâm.",
            improved_structure=None,
            rewrites={
                "minimal_fix": "今日は仕事が忙しかったです。だから、帰りが遅くなりました。",
                "natural_rewrite": "今日は仕事が立て込んでいて、帰りが遅くなりました。",
                "native_rewrite": "今日は仕事が立て込んでいて、帰りが遅くなってしまいました。",
                "professional_rewrite": ("本日は業務が立て込んでおり、帰社が遅くなる見込みです。"),
            },
        )
        service = _service(
            session,
            ScriptedAIProvider(discourse_syntheses=[synthesis]),
            Settings(ai_exercise_learning_mode_enabled=False),
        )
        result = await service.submit(exercise, TWO_SENTENCES)
        assert result.response.rewrites is not None
        assert result.response.rewrites.professional_rewrite is not None
        assert "見込み" in result.response.rewrites.professional_rewrite

    async def test_no_professional_rewrite_for_casual_genre(self, session) -> None:
        scenario = await _seed_scenario(session, genre="casual_message", register="casual")
        exercise = await _seed_scenario_exercise(session, scenario)
        service = _service(
            session,
            ScriptedAIProvider(),
            Settings(ai_exercise_learning_mode_enabled=False),
        )
        result = await service.submit(exercise, TWO_SENTENCES)
        assert result.response.rewrites is not None
        assert result.response.rewrites.professional_rewrite is None

    async def test_scenario_stage_failure_is_isolated(self, session) -> None:
        scenario = await _seed_scenario(session)
        exercise = await _seed_scenario_exercise(session, scenario)
        settings = Settings(
            ai_scenario_evaluation_provider="failing",
            ai_scenario_evaluation_model="x",
        )
        service = _service(session, ScriptedAIProvider(), settings, fallback_providers=["failing"])
        result = await service.submit(exercise, TWO_SENTENCES)

        response = result.response
        assert response.status == "evaluated"
        assert response.scenario_unavailable is True
        assert response.scores.scenario_fit is None
        assert response.scenario_required_points is None
        assert response.scores.overall_writing == service._blend(
            response.scores.sentence_quality, response.scores.discourse_quality
        )

    async def test_evaluation_read_reconstructs_scenario_fields(self, session) -> None:
        scenario = await _seed_scenario(session)
        exercise = await _seed_scenario_exercise(session, scenario)
        service = _service(session, ScriptedAIProvider())
        result = await service.submit(exercise, TWO_SENTENCES)
        submission = await WritingSubmissionRepository(session).get(result.response.submission_id)
        revision = (await WritingRevisionRepository(session).list_by_submission(submission.id))[0]
        reread = await service.evaluation_response(submission, exercise, revision)
        assert reread.scenario_unavailable is False
        assert reread.scores.scenario_fit == 89
        assert reread.scenario_required_points is not None
        assert reread.scenario_format_sections is not None


class TestScenarioHints:
    async def test_hints_prepend_required_point_hints(self, session) -> None:
        scenario = await _seed_scenario(session)
        exercise = await _seed_scenario_exercise(session, scenario)
        service = _service(session, ScriptedAIProvider())
        result = await service.submit(exercise, TWO_SENTENCES)
        submission = await WritingSubmissionRepository(session).get(result.response.submission_id)
        revision = (await WritingRevisionRepository(session).list_by_submission(submission.id))[0]
        hint, count, total = await service.next_hint(submission, exercise, revision)
        assert hint is not None
        assert ("Yêu cầu chưa được đề cập đến" in hint) or (
            "Yêu cầu mới chỉ được đề cập một phần" in hint
        )
        assert count == 1
        assert total >= 1
