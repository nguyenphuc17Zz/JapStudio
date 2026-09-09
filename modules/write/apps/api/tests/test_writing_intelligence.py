"""Unit & Integration tests for Writing Intelligence Foundation (Phase 16)."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.writing_intelligence import WritingWeakness
from app.repositories.writing_intelligence import WritingWeaknessRepository
from app.services.writing_intelligence_service import WritingIntelligenceService


@pytest.mark.asyncio
async def test_normalization_taxonomy(session: AsyncSession) -> None:
    repo = WritingWeaknessRepository(session)
    service = WritingIntelligenceService(weakness_repository=repo)

    # 1. Grammar - particles
    cat, sub, _ = service.normalize_issue({
        "category": "grammar",
        "explanation": "Sai trợ từ は thay vì が trong câu vị ngữ tính từ",
        "suggested_fix": "Thay bằng が",
        "original_text": "猫は好きです",
    })
    assert cat == "grammar"
    assert sub == "particles"

    # 2. Grammar - conjugation
    cat, sub, _ = service.normalize_issue({
        "category": "grammar",
        "explanation": "Chia sai thể bị động (passive) của động từ nhóm 1",
        "suggested_fix": "書かれる",
        "original_text": "書かせる",
    })
    assert cat == "grammar"
    assert sub == "conjugation"

    # 3. Lexicon - synonym confusion
    cat, sub, _ = service.normalize_issue({
        "category": "vocabulary",
        "explanation": "Nhầm lẫn giữa các từ đồng nghĩa 知る và 分かる",
        "suggested_fix": "分かりました",
        "original_text": "知りました",
    })
    assert cat == "lexicon"
    assert sub == "synonym_confusion"

    # 4. Lexicon - collocation
    cat, sub, _ = service.normalize_issue({
        "category": "vocabulary",
        "explanation": "Kết hợp từ collocation không tự nhiên khi đi với 薬",
        "suggested_fix": "薬を飲む",
        "original_text": "薬を食べる",
    })
    assert cat == "lexicon"
    assert sub == "collocation"

    # 5. Naturalness - literal translation
    cat, sub, _ = service.normalize_issue({
        "category": "naturalness",
        "explanation": "Câu dịch thô từng chữ từ tiếng Việt sang tiếng Nhật",
        "suggested_fix": "頭が痛い",
        "original_text": "私の頭は痛い",
    })
    assert cat == "naturalness"
    assert sub == "literal_translation"

    # 6. Register - keigo
    cat, sub, _ = service.normalize_issue({
        "category": "register",
        "explanation": "Sử dụng kính ngữ khiêm nhường ngữ chưa đúng đối tượng",
        "suggested_fix": "参ります",
        "original_text": "いらっしゃいます",
    })
    assert cat == "register"
    assert sub == "keigo"

    # 7. Discourse - cohesion
    cat, sub, _ = service.normalize_issue({
        "category": "discourse",
        "explanation": "Thiếu từ nối liên kết giữa câu trước và câu sau",
        "suggested_fix": "そのため、",
        "original_text": "",
    })
    assert cat == "discourse"
    assert sub == "cohesion"


@pytest.mark.asyncio
async def test_first_occurrence_and_recurrence_lifecycle(session: AsyncSession) -> None:
    repo = WritingWeaknessRepository(session)
    service = WritingIntelligenceService(weakness_repository=repo)

    issues_1 = [{
        "category": "grammar",
        "explanation": "Nhầm trợ từ に và で",
        "original_text": "図書館で本を借ります",
        "severity": "minor",
    }]

    # 1. First occurrence
    res_1 = await service.aggregate_from_evaluation(
        user_id=None,
        issues=issues_1,
        evaluation_id="eval-1",
        context={"register": "polite", "topic": "Study", "jlpt_level": "N4"},
    )
    assert len(res_1) == 1
    w = res_1[0]
    assert w.category == "grammar"
    assert w.subtype == "particles"
    assert w.frequency == 1
    assert w.recurrence_count == 1
    assert w.corrected_count == 0
    assert w.status == "new"
    assert w.mastery_score == 0.0
    assert w.confidence == "low"
    assert "polite" in w.affected_registers
    assert "Study" in w.affected_contexts
    assert "N4" in w.affected_jlpt_levels

    # 2. Second occurrence (recurrence)
    res_2 = await service.aggregate_from_evaluation(
        user_id=None,
        issues=issues_1,
        evaluation_id="eval-2",
        context={"register": "polite", "topic": "Study"},
    )
    assert len(res_2) == 1
    w2 = res_2[0]
    assert w2.id == w.id
    assert w2.frequency == 2
    assert w2.recurrence_count == 2
    assert w2.status == "recurring"
    assert w2.confidence == "medium"

    # 3. Third and fourth occurrence without correction -> persistent
    await service.aggregate_from_evaluation(user_id=None, issues=issues_1, evaluation_id="eval-3")
    res_4 = await service.aggregate_from_evaluation(user_id=None, issues=issues_1, evaluation_id="eval-4")
    w4 = res_4[0]
    assert w4.recurrence_count == 4
    assert w4.status == "persistent"
    assert w4.confidence == "medium"


@pytest.mark.asyncio
async def test_mastery_lifecycle_and_regression(session: AsyncSession) -> None:
    repo = WritingWeaknessRepository(session)
    service = WritingIntelligenceService(weakness_repository=repo)

    issue = [{
        "category": "lexicon",
        "explanation": "Nhầm lẫn từ đồng nghĩa",
        "original_text": "知る",
        "severity": "major",
    }]

    # Create weakness
    await service.aggregate_from_evaluation(user_id=None, issues=issue, evaluation_id="eval-1")

    # 1st correction -> improving (not mastered yet!)
    w_cor1 = await service.record_correction(user_id=None, category="lexicon", subtype="synonym_confusion", evaluation_id="eval-c1")
    assert w_cor1 is not None
    assert w_cor1.corrected_count == 1
    assert w_cor1.mastery_score > 0
    assert w_cor1.status == "improving"

    # 2nd correction across contexts
    w_cor2 = await service.record_correction(user_id=None, category="lexicon", subtype="synonym_confusion", evaluation_id="eval-c2", context={"writing_context_type": "rewrite"})
    assert w_cor2 is not None
    assert w_cor2.corrected_count == 2
    assert w_cor2.status == "improving"

    # Further corrections and mark mastered
    w_cor3 = await service.record_correction(user_id=None, category="lexicon", subtype="synonym_confusion", evaluation_id="eval-c3", context={"writing_context_type": "free_writing"})
    assert w_cor3 is not None
    w_cor3.lifecycle_state = "mastered"
    w_cor3.status = "mastered"
    await session.flush()

    # Now, recurrence happens after mastery -> should transition to regressed / recurrent!
    res_regress = await service.aggregate_from_evaluation(user_id=None, issues=issue, evaluation_id="eval-regress")
    w_regressed = res_regress[0]
    assert w_regressed.status == "regressed"
    assert w_regressed.lifecycle_state == "recurrent"
    assert w_regressed.recurrence_count == 2
    assert w_regressed.corrected_count == 3


@pytest.mark.asyncio
async def test_writing_fingerprint_and_profile(session: AsyncSession) -> None:
    repo = WritingWeaknessRepository(session)
    service = WritingIntelligenceService(weakness_repository=repo)

    # Seed multiple categories
    await service.aggregate_from_evaluation(
        user_id=None,
        issues=[
            {"category": "grammar", "explanation": "Sai trợ từ は/が", "severity": "minor"},
            {"category": "register", "explanation": "Kính ngữ keigo dùng sai", "severity": "critical"},
        ],
        evaluation_id="eval-fp1",
    )
    # Recur register weakness 3 times
    await service.aggregate_from_evaluation(
        user_id=None,
        issues=[{"category": "register", "explanation": "Kính ngữ keigo dùng sai", "severity": "critical"}],
        evaluation_id="eval-fp2",
    )
    await service.aggregate_from_evaluation(
        user_id=None,
        issues=[{"category": "register", "explanation": "Kính ngữ keigo dùng sai", "severity": "critical"}],
        evaluation_id="eval-fp3",
    )

    fingerprint = await service.build_fingerprint(user_id=None)
    assert fingerprint["total_tracked_weaknesses"] == 2
    assert len(fingerprint["top_recurring"]) >= 1
    assert fingerprint["top_recurring"][0].category == "register"
    assert fingerprint["top_recurring"][0].subtype == "keigo"
    assert "register" in fingerprint["weakest_dimensions"]

    profile = await service.get_profile(user_id=None)
    assert len(profile["recommended_focus"]) > 0
    assert profile["total_evaluations_analyzed"] >= 4

    summary = await service.get_summary(user_id=None)
    assert len(summary["top_recurring"]) >= 1
    assert summary["active_weaknesses_count"] == 2


@pytest.mark.asyncio
async def test_writing_intelligence_api_endpoints(client: AsyncClient, session: AsyncSession) -> None:
    repo = WritingWeaknessRepository(session)
    service = WritingIntelligenceService(weakness_repository=repo)

    # Seed a weakness
    await service.aggregate_from_evaluation(
        user_id=None,
        issues=[{
            "category": "naturalness",
            "explanation": "Dịch từng chữ translationese",
            "original_text": "私の名前は",
            "severity": "minor",
        }],
        evaluation_id="eval-api-1",
        context={"register": "casual", "topic": "Self-introduction"},
    )

    # 1. GET /api/v1/writing/intelligence/profile
    resp_prof = await client.get("/api/v1/writing/intelligence/profile")
    assert resp_prof.status_code == 200
    prof_data = resp_prof.json()
    assert "fingerprint" in prof_data
    assert len(prof_data["top_recurring_weaknesses"]) == 1

    # 2. GET /api/v1/writing/intelligence/summary
    resp_sum = await client.get("/api/v1/writing/intelligence/summary")
    assert resp_sum.status_code == 200
    sum_data = resp_sum.json()
    assert len(sum_data["top_recurring"]) == 1
    assert sum_data["active_weaknesses_count"] == 1

    # 3. GET /api/v1/writing/intelligence/weaknesses
    resp_list = await client.get("/api/v1/writing/intelligence/weaknesses")
    assert resp_list.status_code == 200
    list_data = resp_list.json()
    assert list_data["total"] == 1
    weakness_id = list_data["items"][0]["id"]

    # 4. GET /api/v1/writing/intelligence/weaknesses/{id}
    resp_item = await client.get(f"/api/v1/writing/intelligence/weaknesses/{weakness_id}")
    assert resp_item.status_code == 200
    item_data = resp_item.json()
    assert item_data["category"] == "naturalness"
    assert item_data["subtype"] == "literal_translation"

    # 5. GET /api/v1/writing/intelligence/weaknesses/{invalid_id}
    resp_404 = await client.get("/api/v1/writing/intelligence/weaknesses/00000000-0000-0000-0000-000000000000")
    assert resp_404.status_code == 404

    # 6. POST /api/v1/writing/intelligence/diagnose
    resp_diag = await client.post("/api/v1/writing/intelligence/diagnose")
    assert resp_diag.status_code == 200
    diag_data = resp_diag.json()
    assert "overall_assessment_vi" in diag_data
    assert "action_plan_vi" in diag_data
    assert len(diag_data["root_causes"]) >= 1
    assert diag_data["root_causes"][0]["category"] in ("grammar", "naturalness", "register", "lexicon", "discourse")


@pytest.mark.asyncio
async def test_writing_diagnosis_empty_and_fallback(session: AsyncSession) -> None:
    repo = WritingWeaknessRepository(session)
    service = WritingIntelligenceService(weakness_repository=repo)

    # 1. Empty diagnosis with AI call
    diag_empty = await service.diagnose_writing(user_id=None)
    assert diag_empty.overall_assessment_vi is not None
    assert len(diag_empty.action_plan_vi) > 0

    # 2. Seed and diagnose with fallback
    await service.aggregate_from_evaluation(
        user_id=None,
        issues=[{
            "category": "grammar",
            "explanation": "Sai trợ từ は/が",
            "original_text": "猫は好きです",
            "severity": "minor",
        }],
        evaluation_id="eval-diag-1",
    )
    diag_seeded = await service.diagnose_writing(user_id=None)
    assert len(diag_seeded.root_causes) >= 1
    assert diag_seeded.root_causes[0].category == "grammar"
    assert "❌" in str(diag_seeded.root_causes[0].example_bad_vs_good)


# =========================================================================
# Phase 17: Persistent Error & Mastery Engine Tests
# =========================================================================

@pytest.mark.asyncio
async def test_full_lifecycle_new_to_mastered(session: AsyncSession) -> None:
    repo = WritingWeaknessRepository(session)
    service = WritingIntelligenceService(weakness_repository=repo)

    issue = [{
        "category": "grammar",
        "explanation": "Sai trợ từ は/が",
        "original_text": "猫は好きです",
        "severity": "minor",
    }]

    # 1. First occurrence -> NEW
    res1 = await service.aggregate_from_evaluation(
        user_id=None,
        issues=issue,
        evaluation_id="eval-1",
        context={"exercise_type": "sentence_translation", "register": "polite"},
    )
    w = res1[0]
    assert w.lifecycle_state == "new"
    assert w.status == "new"
    assert w.exposure_count == 1
    assert w.recurrence_count == 1
    assert w.corrected_count == 0

    # 2. Second occurrence -> RECURRING
    res2 = await service.aggregate_from_evaluation(
        user_id=None,
        issues=issue,
        evaluation_id="eval-2",
        context={"exercise_type": "sentence_translation", "register": "polite"},
    )
    assert res2[0].lifecycle_state == "recurring"
    assert res2[0].recurrence_count == 2

    # 3. Repeated failure without correction (4 times) -> TARGETED
    await service.aggregate_from_evaluation(user_id=None, issues=issue, evaluation_id="eval-3")
    res4 = await service.aggregate_from_evaluation(user_id=None, issues=issue, evaluation_id="eval-4")
    assert res4[0].lifecycle_state == "targeted"
    assert res4[0].status == "persistent"

    # 4. First successful correction in sentence translation -> IMPROVING
    w_cor1 = await service.record_correction(
        user_id=None,
        category="grammar",
        subtype="particles",
        evaluation_id="eval-c1",
        context={"exercise_type": "sentence_translation", "register": "polite"},
    )
    assert w_cor1 is not None
    assert w_cor1.lifecycle_state == "improving"
    assert w_cor1.status == "improving"
    assert w_cor1.retest_due_at is not None
    assert w_cor1.retest_interval_days == 1

    # 5. Corrections across multiple diverse contexts -> STABLE
    await service.record_correction(
        user_id=None,
        category="grammar",
        subtype="particles",
        evaluation_id="eval-c2",
        context={"exercise_type": "rewrite", "writing_context_type": "rewrite", "register": "casual"},
    )
    w_cor3 = await service.record_correction(
        user_id=None,
        category="grammar",
        subtype="particles",
        evaluation_id="eval-c3",
        context={"exercise_type": "scenario", "writing_context_type": "scenario_writing", "register": "business"},
    )
    assert w_cor3.lifecycle_state == "stable"
    assert w_cor3.status == "improving"
    assert w_cor3.retest_interval_days == 7

    # 6. Demonstrated correct usage in free_writing & simulation with delayed retests -> MASTERED
    # Pass delayed retests
    w_cor3.retest_passed_count = 2
    await session.flush()

    w_cor4 = await service.record_correction(
        user_id=None,
        category="grammar",
        subtype="particles",
        evaluation_id="eval-c4",
        context={"writing_context_type": "free_writing", "register": "formal"},
    )
    w_mastered = await service.record_correction(
        user_id=None,
        category="grammar",
        subtype="particles",
        evaluation_id="eval-c5",
        context={"writing_context_type": "simulation", "register": "business"},
    )
    assert w_mastered.lifecycle_state == "mastered"
    assert w_mastered.status == "mastered"
    assert w_mastered.context_generalization_score >= 0.65


@pytest.mark.asyncio
async def test_repeated_failure_stays_targeted(session: AsyncSession) -> None:
    repo = WritingWeaknessRepository(session)
    service = WritingIntelligenceService(weakness_repository=repo)

    issue = [{
        "category": "grammar",
        "explanation": "Chia sai thể bị động",
        "original_text": "書かせる",
        "severity": "major",
    }]

    # 6 occurrences with 0 corrections
    for i in range(6):
        await service.aggregate_from_evaluation(
            user_id=None,
            issues=issue,
            evaluation_id=f"eval-fail-{i}",
            context={"exercise_type": "sentence_translation"},
        )

    w = await repo.get_by_key(None, "grammar", "conjugation")
    assert w is not None
    assert w.recurrence_count == 6
    assert w.corrected_count == 0
    assert w.lifecycle_state == "targeted"
    assert w.status == "persistent"


@pytest.mark.asyncio
async def test_correction_no_mastery_without_context_diversity(session: AsyncSession) -> None:
    repo = WritingWeaknessRepository(session)
    service = WritingIntelligenceService(weakness_repository=repo)

    issue = [{
        "category": "lexicon",
        "explanation": "Nhầm từ đồng nghĩa",
        "original_text": "知る",
        "severity": "minor",
    }]

    # 1 occurrence
    await service.aggregate_from_evaluation(
        user_id=None,
        issues=issue,
        evaluation_id="eval-1",
        context={"exercise_type": "sentence_translation"},
    )

    # 5 corrections, but ALL in sentence_translation only
    for i in range(5):
        await service.record_correction(
            user_id=None,
            category="lexicon",
            subtype="synonym_confusion",
            evaluation_id=f"eval-c-{i}",
            context={"exercise_type": "sentence_translation", "writing_context_type": "sentence_translation"},
        )

    w = await repo.get_by_key(None, "lexicon", "synonym_confusion")
    assert w is not None
    assert w.corrected_count == 5
    # Context diversity is 1/6 (~0.17), so it CANNOT reach mastered!
    assert w.lifecycle_state != "mastered"
    assert w.context_generalization_score <= 0.25


@pytest.mark.asyncio
async def test_mastery_requires_free_writing(session: AsyncSession) -> None:
    repo = WritingWeaknessRepository(session)
    service = WritingIntelligenceService(weakness_repository=repo)

    issue = [{
        "category": "naturalness",
        "explanation": "Dịch từng chữ translationese",
        "original_text": "私の頭は痛い",
        "severity": "minor",
    }]

    await service.aggregate_from_evaluation(
        user_id=None,
        issues=issue,
        evaluation_id="eval-1",
        context={"exercise_type": "sentence_translation"},
    )

    # Corrections in sentence_translation, rewrite, scenario_writing, simulation (4 contexts), but NOT free_writing
    for ctx in ["sentence_translation", "rewrite", "scenario_writing", "simulation"]:
        await service.record_correction(
            user_id=None,
            category="naturalness",
            subtype="literal_translation",
            evaluation_id=f"eval-{ctx}",
            context={"writing_context_type": ctx},
        )

    w = await repo.get_by_key(None, "naturalness", "literal_translation")
    assert w is not None
    # No free writing correct uses -> cannot reach mastered!
    assert w.lifecycle_state != "mastered"


@pytest.mark.asyncio
async def test_regression_mastered_to_recurrent(session: AsyncSession) -> None:
    repo = WritingWeaknessRepository(session)
    service = WritingIntelligenceService(weakness_repository=repo)

    issue = [{
        "category": "register",
        "explanation": "Dùng sai kính ngữ keigo",
        "original_text": "いらっしゃいます",
        "severity": "major",
    }]

    # Seed and master
    await service.aggregate_from_evaluation(
        user_id=None,
        issues=issue,
        evaluation_id="eval-1",
        context={"exercise_type": "sentence_translation"},
    )
    for ctx in ["sentence_translation", "rewrite", "scenario_writing", "free_writing", "simulation"]:
        await service.record_correction(
            user_id=None,
            category="register",
            subtype="keigo",
            evaluation_id=f"eval-c-{ctx}",
            context={"writing_context_type": ctx, "register": "business"},
        )
    w_master = await repo.get_by_key(None, "register", "keigo")
    assert w_master is not None
    w_master.retest_passed_count = 2
    w_master.lifecycle_state = "mastered"
    w_master.status = "mastered"
    await session.flush()

    # Now, recurrence happens in a new attempt -> Regression!
    res = await service.aggregate_from_evaluation(
        user_id=None,
        issues=issue,
        evaluation_id="eval-regression",
        context={"exercise_type": "free_writing"},
    )
    w_regressed = res[0]
    assert w_regressed.lifecycle_state == "recurrent"
    assert w_regressed.status == "regressed"
    assert w_regressed.retest_due_at is not None


@pytest.mark.asyncio
async def test_new_context_failure_reduces_diversity(session: AsyncSession) -> None:
    repo = WritingWeaknessRepository(session)
    service = WritingIntelligenceService(weakness_repository=repo)

    issue = [{
        "category": "discourse",
        "explanation": "Thiếu từ nối liên kết câu",
        "original_text": "...",
        "severity": "minor",
    }]

    # Correct in sentence_translation
    await service.aggregate_from_evaluation(
        user_id=None, issues=issue, evaluation_id="eval-1", context={"writing_context_type": "sentence_translation"}
    )
    await service.record_correction(
        user_id=None, category="discourse", subtype="cohesion", evaluation_id="eval-c1", context={"writing_context_type": "sentence_translation"}
    )

    # Failed in free_writing & simulation
    await service.aggregate_from_evaluation(
        user_id=None, issues=issue, evaluation_id="eval-2", context={"writing_context_type": "free_writing"}
    )
    await service.aggregate_from_evaluation(
        user_id=None, issues=issue, evaluation_id="eval-3", context={"writing_context_type": "simulation"}
    )

    w = await repo.get_by_key(None, "discourse", "cohesion")
    assert w is not None
    evidence = service._mastery_engine.compute_evidence(w)
    assert "sentence_translation" in evidence.contexts_passed
    assert "free_writing" in evidence.contexts_failed or "simulation" in evidence.contexts_failed


@pytest.mark.asyncio
async def test_due_retests_and_evidence_summary_apis(client: AsyncClient, session: AsyncSession) -> None:
    repo = WritingWeaknessRepository(session)
    service = WritingIntelligenceService(weakness_repository=repo)

    # Seed a weakness that is improving with scheduled retest
    await service.aggregate_from_evaluation(
        user_id=None,
        issues=[{"category": "grammar", "explanation": "Sai trợ từ", "severity": "minor"}],
        evaluation_id="eval-due-1",
        context={"writing_context_type": "sentence_translation"},
    )
    await service.record_correction(
        user_id=None,
        category="grammar",
        subtype="particles",
        evaluation_id="eval-due-c1",
        context={"writing_context_type": "sentence_translation"},
    )

    # 1. GET /api/v1/writing/intelligence/retests/due
    resp_due = await client.get("/api/v1/writing/intelligence/retests/due")
    assert resp_due.status_code == 200
    due_data = resp_due.json()
    assert "items" in due_data
    assert "total" in due_data
    assert due_data["total"] >= 1
    assert due_data["items"][0]["category"] == "grammar"
    assert due_data["items"][0]["target_context_type"] in ("sentence_translation", "scenario_writing", "free_writing")

    # 2. GET /api/v1/writing/intelligence/evidence/summary
    resp_ev = await client.get("/api/v1/writing/intelligence/evidence/summary")
    assert resp_ev.status_code == 200
    ev_data = resp_ev.json()
    assert ev_data["total_weaknesses"] >= 1
    assert "by_lifecycle_state" in ev_data
    assert "contexts_tracked" in ev_data
    assert len(ev_data["contexts_tracked"]) == 6


@pytest.mark.asyncio
async def test_weakness_detail_mastery_and_history_apis(client: AsyncClient, session: AsyncSession) -> None:
    repo = WritingWeaknessRepository(session)
    service = WritingIntelligenceService(weakness_repository=repo)

    # Seed a weakness
    res = await service.aggregate_from_evaluation(
        user_id=None,
        issues=[{"category": "lexicon", "explanation": "Collocation lỗi", "severity": "minor"}],
        evaluation_id="eval-det-1",
    )
    weakness_id = res[0].id

    # 1. GET /api/v1/writing/intelligence/weaknesses/{id}/detail
    resp_det = await client.get(f"/api/v1/writing/intelligence/weaknesses/{weakness_id}/detail")
    assert resp_det.status_code == 200
    det_data = resp_det.json()
    assert det_data["id"] == weakness_id
    assert "evidence_summary" in det_data
    assert "narrative" in det_data

    # 2. GET /api/v1/writing/intelligence/weaknesses/{id}/mastery
    resp_mast = await client.get(f"/api/v1/writing/intelligence/weaknesses/{weakness_id}/mastery")
    assert resp_mast.status_code == 200
    mast_data = resp_mast.json()
    assert mast_data["weakness_id"] == weakness_id
    assert "lifecycle_state" in mast_data
    assert "mastery_score" in mast_data

    # 3. GET /api/v1/writing/intelligence/weaknesses/{id}/history
    resp_hist = await client.get(f"/api/v1/writing/intelligence/weaknesses/{weakness_id}/history")
    assert resp_hist.status_code == 200
    hist_data = resp_hist.json()
    assert isinstance(hist_data, list)
    assert len(hist_data) >= 1
    assert hist_data[0]["to_state"] in ("new", "observed", "recurring", "targeted", "improving")


@pytest.mark.asyncio
async def test_narrative_generation_and_fallback(session: AsyncSession) -> None:
    repo = WritingWeaknessRepository(session)
    service = WritingIntelligenceService(weakness_repository=repo)

    res = await service.aggregate_from_evaluation(
        user_id=None,
        issues=[{"category": "grammar", "explanation": "Sai trợ từ は/が", "severity": "minor"}],
        evaluation_id="eval-narrative-1",
    )
    weakness = res[0]

    # Test narrative synthesis (fallback or AI)
    narrative = await service.generate_narrative_for_weakness(weakness.id)
    assert narrative is not None
    assert len(narrative.why_it_matters) > 0
    assert len(narrative.current_mastery) > 0
    assert len(narrative.evidence_text) > 0
    assert len(narrative.next_step) > 0


@pytest.mark.asyncio
async def test_curriculum_endpoints(client: AsyncClient, session: AsyncSession) -> None:
    # 1. Populate a couple weaknesses
    repo = WritingWeaknessRepository(session)
    service = WritingIntelligenceService(weakness_repository=repo)
    await service.aggregate_from_evaluation(
        user_id=None,
        issues=[
            {"category": "register", "explanation": "Kính ngữ keigo nhầm", "severity": "major"},
            {"category": "grammar", "explanation": "Trợ từ は/が", "severity": "minor"},
        ],
        evaluation_id="eval-curr-1",
    )

    # 2. GET /curriculum/priorities
    resp_pri = await client.get("/api/v1/writing/intelligence/curriculum/priorities?limit=5&enrich=false")
    assert resp_pri.status_code == 200
    data_pri = resp_pri.json()
    assert "items" in data_pri
    assert data_pri["total"] >= 2
    assert data_pri["items"][0]["priority_score"] >= 0

    # 3. GET /curriculum/daily-plan
    resp_plan = await client.get("/api/v1/writing/intelligence/curriculum/daily-plan?total_tasks=4&enrich=false")
    assert resp_plan.status_code == 200
    data_plan = resp_plan.json()
    assert data_plan["total_tasks"] == 4
    assert len(data_plan["tasks"]) == 4
    assert "bucket_breakdown" in data_plan

    # 4. POST /curriculum/session-done
    task_id = data_plan["tasks"][0]["task_id"]
    resp_done = await client.post(
        "/api/v1/writing/intelligence/curriculum/session-done",
        json={"completed_task_ids": [task_id]},
    )
    assert resp_done.status_code == 200
    data_done = resp_done.json()
    assert data_done["completed_count"] == 1


