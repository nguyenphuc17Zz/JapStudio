"""Tests for Writing Mastery & Boss Assessment System (Phase 23)."""

from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    BossWritingSubmission,
    BossWritingTask,
    WritingWeakness,
)
from app.repositories.writing_intelligence import WritingWeaknessRepository
from app.repositories.writing_mastery import (
    BossWritingSubmissionRepository,
    BossWritingTaskRepository,
)
from app.services.writing_mastery_service import (
    MASTERY_DIMENSION_CONFIG,
    WritingMasteryService,
)
from app.services.writing_priority_engine import WritingPriorityEngine


@pytest.mark.asyncio
async def test_8_dimension_mastery_profile(session: AsyncSession) -> None:
    """Test that writing mastery profile computes all 8 distinct dimensions."""
    weakness_repo = WritingWeaknessRepository(session)
    task_repo = BossWritingTaskRepository(session)
    sub_repo = BossWritingSubmissionRepository(session)
    service = WritingMasteryService(
        weakness_repository=weakness_repo,
        task_repository=task_repo,
        submission_repository=sub_repo,
    )

    # Seed weaknesses across grammar, register, naturalness, lexicon
    now = datetime.now(timezone.utc)
    w_gram = WritingWeakness(
        category="grammar",
        subtype="particles",
        description="Nhầm lẫn trợ từ は và が",
        mastery_score=0.85,
        status="mastered",
        lifecycle_state="mastered",
        corrected_count=5,
        recurrence_count=1,
        exposure_count=6,
        correct_count_by_context={"sentence_translation": 2, "rewrite": 1, "free_writing": 2},
        incorrect_count_by_context={"sentence_translation": 1},
        context_generalization_score=0.75,
        register_diversity_score=0.66,
        days_since_last_error=10.0,
        retest_passed_count=2,
    )
    w_reg = WritingWeakness(
        category="register",
        subtype="keigo",
        description="Dùng sai khiêm nhường ngữ 申す",
        mastery_score=0.45,
        status="improving",
        lifecycle_state="improving",
        corrected_count=2,
        recurrence_count=3,
        exposure_count=5,
        correct_count_by_context={"scenario_writing": 2},
        incorrect_count_by_context={"simulation": 3},
        context_generalization_score=0.33,
        register_diversity_score=0.33,
        days_since_last_error=1.0,
        retest_passed_count=0,
    )
    await weakness_repo.add(w_gram)
    await weakness_repo.add(w_reg)
    await session.commit()

    profile = await service.get_mastery_profile(None)
    assert len(profile.dimensions) == 8
    dim_keys = [d.key for d in profile.dimensions]
    for expected_key in MASTERY_DIMENSION_CONFIG.keys():
        assert expected_key in dim_keys

    gram_dim = next(d for d in profile.dimensions if d.key == "grammar")
    assert gram_dim.score >= 0.80
    assert gram_dim.status in ("mastered", "competent")

    reg_dim = next(d for d in profile.dimensions if d.key == "register")
    assert reg_dim.score == 0.45
    assert reg_dim.status == "developing"

    assert profile.mastered_count == 1
    assert len(profile.current_strengths) >= 1
    assert len(profile.current_priorities) >= 1


@pytest.mark.asyncio
async def test_deterministic_5_criterion_mastery_verification(session: AsyncSession) -> None:
    """Test the strict 5-criterion verification engine."""
    weakness_repo = WritingWeaknessRepository(session)
    task_repo = BossWritingTaskRepository(session)
    sub_repo = BossWritingSubmissionRepository(session)
    service = WritingMasteryService(
        weakness_repository=weakness_repo,
        task_repository=task_repo,
        submission_repository=sub_repo,
    )

    now = datetime.now(timezone.utc)

    # 1. Weakness fulfilling ALL 5 criteria
    w_master = WritingWeakness(
        category="grammar",
        subtype="particles",
        description="Trợ từ は và が",
        corrected_count=4,  # >= 3
        recurrence_count=1,
        exposure_count=5,
        correct_count_by_context={
            "sentence_translation": 1,
            "rewrite": 1,
            "free_writing": 1,
            "scenario_writing": 1,
        },  # 4 distinct contexts (>= 3)
        incorrect_count_by_context={"sentence_translation": 1},
        last_incorrect_at=now - timedelta(days=6),  # 6 days retention
        retest_passed_count=1,
    )

    proof_master = service.verify_mastery_criteria(w_master, now)
    assert proof_master.repeated_correct_usage is True
    assert proof_master.delayed_retention is True
    assert proof_master.new_context_transfer is True
    assert proof_master.free_writing_evidence is True
    assert proof_master.real_world_evidence is True
    assert proof_master.is_fully_mastered is True
    assert len(proof_master.missing_criteria) == 0

    # 2. Weakness lacking free-writing & real-world evidence
    w_incomplete = WritingWeakness(
        category="lexicon",
        subtype="synonym_confusion",
        description="Nhầm từ đồng nghĩa",
        corrected_count=3,
        recurrence_count=1,
        exposure_count=4,
        correct_count_by_context={"sentence_translation": 2, "rewrite": 1},
        incorrect_count_by_context={"sentence_translation": 1},
        last_incorrect_at=now - timedelta(days=4),
        retest_passed_count=1,
    )

    proof_incomplete = service.verify_mastery_criteria(w_incomplete, now)
    assert proof_incomplete.repeated_correct_usage is True
    assert proof_incomplete.delayed_retention is True
    assert proof_incomplete.new_context_transfer is False  # only 2 contexts
    assert proof_incomplete.free_writing_evidence is False  # 0 free writing
    assert proof_incomplete.real_world_evidence is False
    assert proof_incomplete.is_fully_mastered is False
    assert len(proof_incomplete.missing_criteria) >= 2


@pytest.mark.asyncio
async def test_regression_detection_and_adaptive_reactivation(session: AsyncSession) -> None:
    """Test that a previously mastered pattern that recurs is flagged as regressed and reactivated."""
    weakness_repo = WritingWeaknessRepository(session)
    task_repo = BossWritingTaskRepository(session)
    sub_repo = BossWritingSubmissionRepository(session)
    service = WritingMasteryService(
        weakness_repository=weakness_repo,
        task_repository=task_repo,
        submission_repository=sub_repo,
    )

    now = datetime.now(timezone.utc)
    w = WritingWeakness(
        category="register",
        subtype="keigo",
        description="Sử dụng Sonkeigo お〜になる",
        mastery_score=0.90,
        status="mastered",
        lifecycle_state="mastered",
        corrected_count=5,
        recurrence_count=1,
        exposure_count=6,
    )
    await weakness_repo.add(w)
    await session.commit()

    # Trigger regression
    diagnosis = await service.handle_detected_regression(w, trigger_context="boss_assessment", now=now)
    assert w.lifecycle_state == "recurrent"
    assert w.status == "regressed"
    assert w.retest_interval_days == 1
    assert w.retest_due_at is not None
    assert diagnosis.weakness_subtype == "keigo"
    assert "từng làm chủ đã tái phát" in diagnosis.diagnosis_vi

    # Check that priority engine scores this regressed skill with boosted non-mastery signal
    engine = WritingPriorityEngine()
    ranked = engine.score(w)
    assert ranked.priority_score >= 50.0


@pytest.mark.asyncio
async def test_boss_task_generation_and_fallback(session: AsyncSession) -> None:
    """Test Boss Writing task generation with adversarial traps and deterministic fallback."""
    weakness_repo = WritingWeaknessRepository(session)
    task_repo = BossWritingTaskRepository(session)
    sub_repo = BossWritingSubmissionRepository(session)
    service = WritingMasteryService(
        weakness_repository=weakness_repo,
        task_repository=task_repo,
        submission_repository=sub_repo,
    )

    task = await service.generate_boss_task(
        user_id=None,
        task_type="business_email",
        jlpt_level="N2",
        target_register="formal_business",
    )

    assert task.id is not None
    assert task.task_type == "business_email"
    assert task.target_register == "formal_business"
    assert len(task.required_constraints) >= 3
    assert task.time_limit_minutes > 0
    assert task.status == "pending"


@pytest.mark.asyncio
async def test_boss_writing_evaluation_pipeline(session: AsyncSession) -> None:
    """Test boss evaluation across 8 dimensions, 3-tier rewrites, and historical deltas."""
    weakness_repo = WritingWeaknessRepository(session)
    task_repo = BossWritingTaskRepository(session)
    sub_repo = BossWritingSubmissionRepository(session)
    service = WritingMasteryService(
        weakness_repository=weakness_repo,
        task_repository=task_repo,
        submission_repository=sub_repo,
    )

    # 1. Create a task
    task = await service.generate_boss_task(
        user_id=None,
        task_type="absence_message",
        jlpt_level="N3",
    )

    # 2. Submit writing
    learner_text = (
        "佐藤リーダー、お疲れ様です。今朝から39度の熱があり、病院に行きたいため、本日はお休みをいただけますでしょうか。"
        "本日の14時の会議の資料は共有フォルダに保存してあります。田中さんにご説明をお願いできますでしょうか。"
        "ご迷惑をおかけして大変申し訳ございません。午後に体調をご報告いたします。"
    )

    eval_result = await service.evaluate_boss_submission(
        task_id=task.id,
        user_id=None,
        learner_text=learner_text,
        duration_seconds=360,
    )

    assert eval_result.overall_score >= 60.0
    assert eval_result.verdict in ("PASS", "PASS_WITH_DISTINCTION", "NEEDS_RETRY")
    assert "grammar" in eval_result.scores
    assert "task_fulfillment" in eval_result.scores
    assert "naturalness" in eval_result.scores
    assert "register" in eval_result.scores
    assert len(eval_result.strengths) >= 1
    assert eval_result.rewrites.minimal_fix is not None
    assert eval_result.rewrites.natural_polish is not None
    assert eval_result.rewrites.business_mastery is not None

    # Check task completed
    updated_task = await task_repo.get(task.id)
    assert updated_task.status == "completed"


@pytest.mark.asyncio
async def test_writing_evolution_timeline(session: AsyncSession) -> None:
    """Test longitudinal evolution aggregation with eliminated, reduced, and persistent buckets."""
    weakness_repo = WritingWeaknessRepository(session)
    task_repo = BossWritingTaskRepository(session)
    sub_repo = BossWritingSubmissionRepository(session)
    service = WritingMasteryService(
        weakness_repository=weakness_repo,
        task_repository=task_repo,
        submission_repository=sub_repo,
    )

    now = datetime.now(timezone.utc)
    # Mastered weakness (eliminated)
    w_elim = WritingWeakness(
        category="grammar",
        subtype="particles",
        description="Trợ từ に và で",
        status="mastered",
        lifecycle_state="mastered",
        days_since_last_error=14.0,
        first_seen_at=now - timedelta(days=30),
        last_seen_at=now - timedelta(days=14),
    )
    # Improving weakness (reduced)
    w_red = WritingWeakness(
        category="register",
        subtype="polite",
        description="Trộn lẫn Desu/Masu",
        status="improving",
        lifecycle_state="improving",
        corrected_count=3,
        recurrence_count=1,
        first_seen_at=now - timedelta(days=20),
        last_seen_at=now - timedelta(days=2),
    )
    # Persistent weakness
    w_per = WritingWeakness(
        category="naturalness",
        subtype="vietnamese_transfer",
        description="Dịch thô cấu trúc vì nên",
        status="persistent",
        lifecycle_state="targeted",
        recurrence_count=5,
        corrected_count=0,
        first_seen_at=now - timedelta(days=25),
        last_seen_at=now - timedelta(days=1),
    )
    await weakness_repo.add(w_elim)
    await weakness_repo.add(w_red)
    await weakness_repo.add(w_per)
    await session.commit()

    timeline = await service.get_evolution_timeline(None)
    assert len(timeline.weaknesses_eliminated) == 1
    assert timeline.weaknesses_eliminated[0].subtype == "particles"
    assert len(timeline.weaknesses_reduced) == 1
    assert len(timeline.persistent_weaknesses) == 1
    assert len(timeline.register_progress) >= 1
    assert len(timeline.naturalness_progress) >= 1
    assert timeline.ai_narrative_story is not None


@pytest.mark.asyncio
async def test_api_mastery_endpoints(client: AsyncClient, session: AsyncSession) -> None:
    """Test full HTTP API contracts for /api/v1/writing/mastery routes."""
    # 1. GET profile
    resp = await client.get("/api/v1/writing/mastery/profile")
    assert resp.status_code == 200
    data = resp.json()
    assert "dimensions" in data
    assert len(data["dimensions"]) == 8

    # 2. GET evolution
    resp_evo = await client.get("/api/v1/writing/mastery/evolution")
    assert resp_evo.status_code == 200
    evo_data = resp_evo.json()
    assert "weaknesses_eliminated" in evo_data
    assert "register_progress" in evo_data

    # 3. POST generate boss task
    gen_resp = await client.post(
        "/api/v1/writing/mastery/boss/generate",
        json={"task_type": "business_email", "jlpt_level": "N3"},
    )
    assert gen_resp.status_code == 200
    task_data = gen_resp.json()
    task_id = task_data["id"]

    # 4. GET pending boss task
    pend_resp = await client.get("/api/v1/writing/mastery/boss/pending")
    assert pend_resp.status_code == 200
    assert pend_resp.json()["id"] == task_id

    # 5. POST submit boss task
    sub_resp = await client.post(
        f"/api/v1/writing/mastery/boss/{task_id}/submit",
        json={
            "text": "田中部長、お疲れ様です。プロジェクトの進捗をご報告いたします。現在予定通りに進んでおります。",
            "duration_seconds": 180,
        },
    )
    assert sub_resp.status_code == 200
    sub_data = sub_resp.json()
    assert sub_data["task_id"] == task_id
    assert "overall_score" in sub_data
    assert "scores" in sub_data

    # 6. GET history
    hist_resp = await client.get("/api/v1/writing/mastery/boss/history")
    assert hist_resp.status_code == 200
    assert len(hist_resp.json()) >= 1


def test_dsr_forgetting_curve_scheduling() -> None:
    from app.services.mastery_engine import WritingMasteryEngine

    # 1. Volatile / regression state returns 1 day
    assert WritingMasteryEngine.compute_dsr_retest_interval("recurrent", 1, 3, 0.2) == 1
    assert WritingMasteryEngine.compute_dsr_retest_interval("recurring", 0, 2, 0.0) == 1

    # 2. Improving with 1 correction returns 1 day
    assert WritingMasteryEngine.compute_dsr_retest_interval("improving", 1, 1, 0.1) == 1

    # 3. Stable with baseline context diversity (0.5) returns 7 days
    interval_stable = WritingMasteryEngine.compute_dsr_retest_interval("stable", 3, 1, 0.5)
    assert interval_stable == 7

    # 4. Stable with broad context diversity (0.83) scales interval upwards dynamically
    interval_broad = WritingMasteryEngine.compute_dsr_retest_interval("stable", 6, 1, 0.83)
    assert interval_broad >= 9

    # 5. Mastered state schedules long-term retention check (30 days)
    assert WritingMasteryEngine.compute_dsr_retest_interval("mastered", 8, 1, 0.9) == 30

