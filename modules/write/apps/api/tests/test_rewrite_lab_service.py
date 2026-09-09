"""Unit and integration tests for Rewrite Lab & Self-Correction Service (Phase 19)."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.providers.ai.router import AIRouter
from app.repositories.rewrite_lab import RewriteLabRepository
from app.schemas.rewrite_lab_ai import (
    DiffExplanationResult,
    IssueDetectionResult,
    RewriteModeResult,
    RewriteVariantsResult,
    SelfCorrectionAttemptResult,
    SocraticCoachResult,
    TransferEvaluationResult,
    TransferTaskResult,
)
from app.services.ai_service import AIService
from app.services.rewrite_lab_service import RewriteLabService
from tests.scripted_provider import ScriptedAIProvider


def _ai(provider: ScriptedAIProvider | None = None, settings: Settings | None = None) -> AIService:
    router = AIRouter(
        providers={"fake": lambda: provider or ScriptedAIProvider()},
        default_provider="fake",
        fallback_providers=[],
    )
    return AIService(ai_router=router, settings=settings)


@pytest.mark.asyncio
async def test_self_correction_session_initiation_with_zero_leakage(session: AsyncSession):
    """Test starting a self-correction session produces Step 2 category explanation without answer leakage."""
    app_settings = get_settings()
    ai_service = _ai(ScriptedAIProvider(), app_settings)
    repo = RewriteLabRepository(session)
    service = RewriteLabService(repository=repo, ai_service=ai_service, settings=app_settings)

    lab_session = await service.start_session(
        text="私は日本語を勉強することが楽しいです。",
        context_vi="Tôi thấy học tiếng Nhật rất vui.",
    )

    assert lab_session.id is not None
    assert lab_session.has_issue is True
    assert lab_session.issue_category == "particle_choice"
    assert lab_session.current_step == 2
    assert lab_session.status == "active"
    assert "〜のが楽しい" in lab_session.target_concept
    assert "勉強することが" in lab_session.target_segment
    # Verify no direct answer is leaked in the explanation
    assert "勉強するのが楽しいです" not in lab_session.issue_explanation_vi


@pytest.mark.asyncio
async def test_self_correction_progressive_ladder_failure_and_success(session: AsyncSession):
    """Test progressive ladder advances through Clue (Step 4) and Pattern (Step 5) on failed attempts."""
    app_settings = get_settings()
    ai_service = _ai(ScriptedAIProvider(), app_settings)
    repo = RewriteLabRepository(session)
    service = RewriteLabService(repository=repo, ai_service=ai_service, settings=app_settings)

    lab_session = await service.start_session(text="私は日本語を勉強することが楽しいです。")

    # Step 3 -> Attempt 1 (Failed attempt -> should advance to Step 4 Clue)
    class CustomScriptedProvider(ScriptedAIProvider):
        async def generate_structured(self, prompt, response_model, **kwargs):
            if response_model is SelfCorrectionAttemptResult:
                return SelfCorrectionAttemptResult(
                    is_correct=False,
                    is_improved=True,
                    score=60,
                    improvement_status="partially_improved",
                    quality_delta=10,
                    feedback_vi="Chưa tự nhiên ở phần trợ từ.",
                    remaining_issues=["Trợ từ chưa chuẩn"],
                    next_step_action="advance_to_clue",
                    next_clue="Hãy xem lại trợ từ đi cùng tính từ cảm xúc.",
                ), self._result(prompt)
            return await super().generate_structured(prompt, response_model, **kwargs)

    custom_ai = _ai(CustomScriptedProvider(), app_settings)
    service = RewriteLabService(repository=repo, ai_service=custom_ai, settings=app_settings)

    eval_result, updated_session = await service.submit_attempt(
        session=lab_session,
        attempt_text="私は日本語を勉強することがうれしいです。",
    )

    assert eval_result.is_correct is False
    assert updated_session.current_step == 4
    assert updated_session.clue is not None
    assert len(updated_session.attempts) == 1

    # Attempt 2 -> Success
    class SuccessScriptedProvider(ScriptedAIProvider):
        async def generate_structured(self, prompt, response_model, **kwargs):
            if response_model is SelfCorrectionAttemptResult:
                return SelfCorrectionAttemptResult(
                    is_correct=True,
                    is_improved=True,
                    score=95,
                    improvement_status="significantly_improved",
                    quality_delta=35,
                    feedback_vi="Chính xác hoàn toàn!",
                    remaining_issues=[],
                    next_step_action="proceed_to_transfer",
                ), self._result(prompt)
            return await super().generate_structured(prompt, response_model, **kwargs)

    success_ai = _ai(SuccessScriptedProvider(), app_settings)
    service = RewriteLabService(repository=repo, ai_service=success_ai, settings=app_settings)

    eval_result_2, updated_session_2 = await service.submit_attempt(
        session=updated_session,
        attempt_text="日本語を勉強するのが楽しいです。",
    )

    assert eval_result_2.is_correct is True
    assert updated_session_2.status == "self_corrected"
    assert len(updated_session_2.attempts) == 2


@pytest.mark.asyncio
async def test_reveal_controlled_comparison_variants(session: AsyncSession):
    """Test reveal returns 4-way controlled comparison and sets step 6."""
    app_settings = get_settings()
    ai_service = _ai(ScriptedAIProvider(), app_settings)
    repo = RewriteLabRepository(session)
    service = RewriteLabService(repository=repo, ai_service=ai_service, settings=app_settings)

    lab_session = await service.start_session(text="私は日本語を勉強することが楽しいです。")
    variants, updated_session = await service.reveal_rewrites(lab_session)

    assert updated_session.current_step == 6
    assert variants.minimal_correction != ""
    assert variants.natural_japanese != ""
    assert variants.synthesis_prompt_vi != ""
    assert "minimal_correction" in variants.explanations


@pytest.mark.asyncio
async def test_transfer_task_generation_and_evaluation(session: AsyncSession):
    """Test transfer task generation in a novel context and subsequent evaluation."""
    app_settings = get_settings()
    ai_service = _ai(ScriptedAIProvider(), app_settings)
    repo = RewriteLabRepository(session)
    service = RewriteLabService(repository=repo, ai_service=ai_service, settings=app_settings)

    lab_session = await service.start_session(text="私は日本語を勉強することが楽しいです。")
    task, updated_session = await service.generate_transfer_task(lab_session)

    assert task.concept_tested == "〜のが楽しい"
    assert "nấu ăn" in task.scenario_prompt_vi or len(task.scenario_prompt_vi) > 0
    assert updated_session.transfer_task is not None

    eval_result, completed_session = await service.submit_transfer_attempt(
        session=updated_session,
        transfer_text="週末に料理を作るのが楽しいです。",
    )

    assert eval_result.transferred_successfully is True
    assert eval_result.score >= 90
    assert completed_session.status == "completed"
    assert len(completed_session.transfer_attempts) == 1


@pytest.mark.asyncio
async def test_multi_mode_rewrite_transformations(session: AsyncSession):
    """Test single-mode rewrite transformations."""
    app_settings = get_settings()
    ai_service = _ai(ScriptedAIProvider(), app_settings)
    repo = RewriteLabRepository(session)
    service = RewriteLabService(repository=repo, ai_service=ai_service, settings=app_settings)

    mode_result = await service.transform_mode(
        text="私は日本語を勉強することが楽しいです。",
        mode="natural",
    )

    assert mode_result.mode == "natural"
    assert mode_result.rewritten_text != ""
    assert mode_result.explanation_vi != ""


@pytest.mark.asyncio
async def test_linguistic_diff_explanation(session: AsyncSession):
    """Test linguistic diff analysis between two sentences."""
    app_settings = get_settings()
    ai_service = _ai(ScriptedAIProvider(), app_settings)
    repo = RewriteLabRepository(session)
    service = RewriteLabService(repository=repo, ai_service=ai_service, settings=app_settings)

    diff_result = await service.explain_diff(
        before="私は日本語を勉強することが楽しいです。",
        after="日本語を勉強するのが楽しいです。",
    )

    assert len(diff_result.chunks) >= 2
    assert diff_result.improvement_status == "significantly_improved"
    assert diff_result.quality_delta > 0


@pytest.mark.asyncio
async def test_socratic_ai_coach(session: AsyncSession):
    """Test asking Socratic coach with session context."""
    app_settings = get_settings()
    ai_service = _ai(ScriptedAIProvider(), app_settings)
    repo = RewriteLabRepository(session)
    service = RewriteLabService(repository=repo, ai_service=ai_service, settings=app_settings)

    lab_session = await service.start_session(text="私は日本語を勉強することが楽しいです。")
    coach_result = await service.ask_socratic_coach(
        question="Tại sao dùng こと lại không tự nhiên?",
        session=lab_session,
    )

    assert len(coach_result.answer) > 0
    assert coach_result.pattern_highlight is not None
    assert len(coach_result.suggestions) >= 1


@pytest.mark.asyncio
async def test_get_recent_snippets_includes_challenge_attempts(session: AsyncSession):
    """Test get_recent_snippets fetches attempts from challenge and practice exercises."""
    app_settings = get_settings()
    ai_service = _ai(ScriptedAIProvider(), app_settings)
    repo = RewriteLabRepository(session)
    service = RewriteLabService(repository=repo, ai_service=ai_service, settings=app_settings)

    from conftest import exercise_factory
    from app.models import Exercise, ExerciseAttempt, WritingFeedback

    ex = Exercise(**exercise_factory(
        topic="Challenge",
        context="Nói về sở thích",
        prompt_vi="Hãy viết về sở thích của bạn",
        generation_metadata={"source": "challenge", "challenge_type": "naturalness"},
    ))
    session.add(ex)
    await session.flush()

    att = ExerciseAttempt(
        exercise_id=ex.id,
        attempt_number=1,
        answer_text="私の趣味は本を読むことです。",
    )
    session.add(att)
    await session.flush()

    fb = WritingFeedback(
        attempt_id=att.id,
        overall_score=80,
        semantic_score=80,
        grammar_score=80,
        vocabulary_score=80,
        naturalness_score=80,
        context_fit_score=80,
        register_fit_score=80,
        evaluation={
            "scores": {"overall_score": 80},
            "issues": [{"explanation": "Có thể dùng 読書 thay vì 本を読むこと để câu ngắn gọn hơn."}],
        },
    )
    session.add(fb)
    await session.flush()

    snippets = await service.get_recent_snippets(limit=10)
    assert len(snippets) >= 1
    challenge_snippet = next((s for s in snippets if s["id"] == f"att_{att.id}"), None)
    assert challenge_snippet is not None
    assert challenge_snippet["text"] == "私の趣味は本を読むことです。"
    assert challenge_snippet["source_type"] == "challenge"
    assert "Thử thách" in challenge_snippet["source_title"]
    assert "Có thể dùng 読書" in challenge_snippet["issue_preview"]

