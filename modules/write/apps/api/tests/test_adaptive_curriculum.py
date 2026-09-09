"""Tests for Phase 22 Adaptive Writing Curriculum 2.0.

Covers:
  1. Priority ranking (8 signals)
  2. Priority is NOT simply lowest score
  3. 70/20/10 task selection
  4. Context rotation (8-context cycle)
  5. Repetition control (FatigueGuard)
  6. Mastery-based removal (mastered excluded from 70% bucket)
  7. Regression reactivation (recurrent included back in 70% bucket)
  8. Curriculum explainability (reasons & descriptions populated)
  9. AI enrichment fallback safety
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import pytest

from app.models.writing_intelligence import WritingWeakness
from app.schemas.adaptive_curriculum import DailyPlan, PlanTask, RankedWeakness
from app.services.context_rotation_engine import (
    CONTEXT_CYCLE,
    ContextRotationEngine,
)
from app.services.curriculum_enrichment_service import CurriculumEnrichmentService
from app.services.daily_writing_plan_service import DailyWritingPlanService
from app.services.fatigue_guard import FatigueGuard
from app.services.writing_priority_engine import WritingPriorityEngine


def _make_weakness(
    id: str,
    category: str = "grammar",
    subtype: str = "particles",
    description: str = "Trợ từ は/が",
    severity: str = "minor",
    recurrence_count: int = 1,
    mastery_score: float = 0.0,
    lifecycle_state: str = "new",
    context_generalization_score: float = 0.0,
    register_diversity_score: float = 0.0,
    evidence_refs: list[dict[str, Any]] | None = None,
    mastery_evidence: dict[str, Any] | None = None,
) -> WritingWeakness:
    w = WritingWeakness(
        id=id,
        category=category,
        subtype=subtype,
        description=description,
        severity=severity,
        recurrence_count=recurrence_count,
        mastery_score=mastery_score,
        lifecycle_state=lifecycle_state,
        context_generalization_score=context_generalization_score,
        register_diversity_score=register_diversity_score,
        evidence_refs=evidence_refs or [],
        mastery_evidence=mastery_evidence or {},
        first_seen_at=datetime.now(timezone.utc),
        last_seen_at=datetime.now(timezone.utc),
    )
    return w


# ---------------------------------------------------------------------------
# 1. Priority Ranking
# ---------------------------------------------------------------------------


def test_priority_ranking():
    """Verify that critical severity + high recurrence yields a higher priority score."""
    engine = WritingPriorityEngine(goal_type="general")

    w_high = _make_weakness(
        id="w1",
        category="register",
        subtype="keigo",
        severity="critical",
        recurrence_count=10,
        mastery_score=0.1,
    )
    w_low = _make_weakness(
        id="w2",
        category="discourse",
        subtype="flow",
        severity="info",
        recurrence_count=1,
        mastery_score=0.8,
    )

    ranked = engine.rank([w_low, w_high])
    assert len(ranked) == 2
    assert ranked[0].weakness_id == "w1"
    assert ranked[0].priority_score > ranked[1].priority_score


# ---------------------------------------------------------------------------
# 2. Priority is NOT simply lowest score
# ---------------------------------------------------------------------------


def test_priority_not_simply_lowest_score():
    """A weakness with slightly higher mastery but massive recurrence and critical severity
    should outrank one that has mastery=0.0 but only 1 minor info occurrence.
    """
    engine = WritingPriorityEngine(goal_type="business")

    # w_recurring: mastery=0.4 (not 0.0), but critical severity + 15 recurrences in business register
    w_recurring = _make_weakness(
        id="w_rec",
        category="register",
        subtype="business_register",
        severity="critical",
        recurrence_count=15,
        mastery_score=0.4,
    )

    # w_single: mastery=0.0 (lowest score possible), but info severity + 1 occurrence
    w_single = _make_weakness(
        id="w_sin",
        category="discourse",
        subtype="flow",
        severity="info",
        recurrence_count=1,
        mastery_score=0.0,
    )

    ranked = engine.rank([w_single, w_recurring])
    assert ranked[0].weakness_id == "w_rec"
    assert ranked[0].priority_score > ranked[1].priority_score


# ---------------------------------------------------------------------------
# 3. 70 / 20 / 10 Task Selection
# ---------------------------------------------------------------------------


def test_task_selection_70_20_10():
    """Verify that a 4-task plan allocates 70% persistent, 20% reinforcement, 10% exploration."""
    w1 = _make_weakness("w1", category="grammar", subtype="particles", lifecycle_state="recurring")
    w2 = _make_weakness("w2", category="register", subtype="keigo", lifecycle_state="targeted")
    w3 = _make_weakness("w3", category="lexicon", subtype="collocation", lifecycle_state="improving")
    w4 = _make_weakness("w4", category="naturalness", subtype="literal_translation", lifecycle_state="stable")

    all_w = [w1, w2, w3, w4]
    engine = WritingPriorityEngine()
    ranked = engine.rank(all_w)

    planner = DailyWritingPlanService(total_tasks=4)
    plan = planner.build(ranked, all_w)

    assert plan.total_tasks == 4
    assert plan.bucket_breakdown["persistent"] >= 2
    assert plan.bucket_breakdown["reinforcement"] >= 1
    assert plan.bucket_breakdown["exploration"] >= 1


# ---------------------------------------------------------------------------
# 4. Context Rotation (8-context cycle)
# ---------------------------------------------------------------------------


def test_context_rotation():
    """Test that ContextRotationEngine cycles through all 8 contexts in order."""
    w = _make_weakness("w1")

    # Initial context is the first in cycle
    assert ContextRotationEngine.current_context(w) == CONTEXT_CYCLE[0]  # "sentence"

    expected = [
        "rewrite",
        "casual",
        "polite",
        "business",
        "paragraph",
        "free_writing",
        "real_world_mission",
        "sentence",  # wraps around
    ]

    for exp_ctx in expected:
        next_ctx = ContextRotationEngine.advance(w)
        assert next_ctx == exp_ctx
        assert ContextRotationEngine.current_context(w) == exp_ctx


# ---------------------------------------------------------------------------
# 5. Repetition Control (FatigueGuard)
# ---------------------------------------------------------------------------


def test_repetition_control():
    """Verify that FatigueGuard prevents adding the same weakness in the same context."""
    guard = FatigueGuard(window=3)

    assert not guard.is_fatigued("w1", "sentence")
    guard.record("w1", "sentence", register="polite", structure="sentence")

    # Now it should be fatigued
    assert guard.is_fatigued("w1", "sentence")
    # Different context for same weakness should NOT be fatigued
    assert not guard.is_fatigued("w1", "paragraph")

    # After 3 different records, w1+sentence falls out of the window
    guard.record("w2", "paragraph", register="polite", structure="paragraph")
    guard.record("w3", "business", register="business", structure="paragraph")
    guard.record("w4", "casual", register="casual", structure="sentence")

    assert not guard.is_fatigued("w1", "sentence")


# ---------------------------------------------------------------------------
# 6. Mastery-Based Removal
# ---------------------------------------------------------------------------


def test_mastery_based_removal():
    """Weaknesses in 'mastered' lifecycle state must be excluded from the 70% persistent bucket."""
    w_mastered = _make_weakness(
        "w_m", category="grammar", subtype="particles", lifecycle_state="mastered", mastery_score=1.0
    )
    w_persistent = _make_weakness(
        "w_p", category="register", subtype="keigo", lifecycle_state="recurring", mastery_score=0.2
    )

    all_w = [w_mastered, w_persistent]
    engine = WritingPriorityEngine()
    ranked = engine.rank(all_w)

    planner = DailyWritingPlanService(total_tasks=3)
    plan = planner.build(ranked, all_w)

    # Check that w_mastered is not in the persistent tasks
    persistent_tasks = [t for t in plan.tasks if t.bucket == "persistent"]
    assert all(t.weakness_id != "w_m" for t in persistent_tasks)


# ---------------------------------------------------------------------------
# 7. Regression Reactivation
# ---------------------------------------------------------------------------


def test_regression_reactivation():
    """Weaknesses in 'recurrent' lifecycle state (regressed) must be re-included in persistent bucket."""
    w_regressed = _make_weakness(
        "w_reg", category="grammar", subtype="conjugation", lifecycle_state="recurrent", recurrence_count=5
    )

    all_w = [w_regressed]
    engine = WritingPriorityEngine()
    ranked = engine.rank(all_w)

    planner = DailyWritingPlanService(total_tasks=2)
    plan = planner.build(ranked, all_w)

    persistent_tasks = [t for t in plan.tasks if t.bucket == "persistent"]
    assert any(t.weakness_id == "w_reg" for t in persistent_tasks)


# ---------------------------------------------------------------------------
# 8. Curriculum Explainability
# ---------------------------------------------------------------------------


def test_task_reason_and_description_populated():
    """Every plan task and ranked weakness must have non-empty reason and description fields."""
    w1 = _make_weakness("w1", category="register", subtype="keigo", recurrence_count=4)
    w2 = _make_weakness("w2", category="grammar", subtype="particles", recurrence_count=2)

    all_w = [w1, w2]
    engine = WritingPriorityEngine()
    ranked = engine.rank(all_w)

    for r in ranked:
        assert r.priority_reason, "RankedWeakness must have a non-empty priority_reason"
        assert len(r.priority_reason) > 5

    planner = DailyWritingPlanService(total_tasks=4)
    plan = planner.build(ranked, all_w)

    for task in plan.tasks:
        assert task.task_description, "PlanTask must have a non-empty task_description"
        assert task.reason, "PlanTask must have a non-empty reason"
        assert task.context_type in CONTEXT_CYCLE


# ---------------------------------------------------------------------------
# 9. AI Enrichment Fallback Safety
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_ai_enrichment_fallback_safety():
    """When AI fails, CurriculumEnrichmentService returns original objects unchanged."""
    service = CurriculumEnrichmentService()

    plan = DailyPlan(
        plan_date="2026-08-24",
        tasks=[
            PlanTask(
                task_id="t1",
                task_type="targeted_drill",
                context_type="sentence",
                task_description="Original template description",
                reason="Original template reason",
                bucket="persistent",
            )
        ],
        total_tasks=1,
        generated_at="2026-08-24T00:00:00Z",
        enriched=False,
    )

    # Calling with empty or failing provider should not raise and return plan
    result = await service.enrich_task_descriptions(plan, {})
    assert result.total_tasks == 1
    assert result.tasks[0].task_description == "Original template description"


# ---------------------------------------------------------------------------
# 10. Cardinality-Constrained Knapsack DP (Algorithm 10)
# ---------------------------------------------------------------------------


def test_cardinality_knapsack_optimization():
    """Verify that Exact-k Cardinality Knapsack DP finds the globally optimal subset within budget."""
    from app.services.daily_writing_plan_service import (
        compute_cognitive_cost,
        solve_cardinality_knapsack,
    )

    # 4 candidates with (weight, value):
    # c1: (20, 100)
    # c2: (30, 150)
    # c3: (35, 160)
    # c4: (50, 200)
    # Budget = 55, k = 2
    # Combinations of 2:
    # c1 + c2: weight 50, value 250 (<= 55, VALID)
    # c1 + c3: weight 55, value 260 (<= 55, VALID - BEST!)
    # c1 + c4: weight 70 (exceeds 55)
    # c2 + c3: weight 65 (exceeds 55)
    # c2 + c4: weight 80 (exceeds 55)
    # c3 + c4: weight 85 (exceeds 55)
    # Greedy by value would try c4 + c3 = 85 (over budget).
    # Greedy by ratio: c1 (5.0), c2 (5.0), c3 (4.57), c4 (4.0) -> c1 + c2 = value 250.
    # But optimal DP chooses c1 + c3 with value 260!

    candidates = [
        {"id": "c1", "w": 20, "v": 100.0},
        {"id": "c2", "w": 30, "v": 150.0},
        {"id": "c3", "w": 35, "v": 160.0},
        {"id": "c4", "w": 50, "v": 200.0},
    ]

    chosen = solve_cardinality_knapsack(
        items=candidates,
        k=2,
        max_weight=55,
        weight_fn=lambda c: c["w"],
        value_fn=lambda c: c["v"],
    )

    assert len(chosen) == 2
    chosen_ids = {c["id"] for c in chosen}
    assert chosen_ids == {"c1", "c3"}
    assert sum(c["w"] for c in chosen) <= 55
    assert sum(c["v"] for c in chosen) == 260.0


def test_cardinality_knapsack_fallback_and_edge_cases():
    """Verify knapsack behavior when k >= N, or when all k exceed max weight."""
    from app.services.daily_writing_plan_service import solve_cardinality_knapsack

    items = [{"id": "a", "w": 100, "v": 50.0}, {"id": "b", "w": 100, "v": 90.0}]

    # When k >= len(items), returns all items
    assert len(solve_cardinality_knapsack(items, k=3, max_weight=50, weight_fn=lambda x: x["w"], value_fn=lambda x: x["v"])) == 2

    # When budget is strictly smaller than any combination (e.g. max_weight=50, each item weight 100),
    # fallback selects top k by efficiency
    fallback_chosen = solve_cardinality_knapsack(
        items=items,
        k=1,
        max_weight=50,
        weight_fn=lambda x: x["w"],
        value_fn=lambda x: x["v"],
    )
    assert len(fallback_chosen) == 1
    assert fallback_chosen[0]["id"] == "b"

