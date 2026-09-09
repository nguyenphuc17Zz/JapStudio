"""Daily Writing Plan Service (Phase 22).

Builds a small, meaningful daily plan from the learner's ranked writing
weaknesses using 70 / 20 / 10 bucket allocation:

  70 % — persistent weaknesses  (lifecycle: new, observed, recurring,
                                  targeted, recurrent)
  20 % — reinforcement          (lifecycle: improving, stable)
  10 % — exploration            (always writing-related: free writing or
                                  a new genre / register challenge)

Default plan size: 4 tasks (avoids excessive workload).  Adjust via
``total_tasks`` parameter.  Minimum: 2, Maximum: 8.

Context rotation and fatigue guarding are applied to prevent any pattern
from repeating inside the same session.
"""

from __future__ import annotations

import hashlib
import logging
from datetime import date, datetime, timezone
from typing import Any

from app.models.writing_intelligence import WritingWeakness
from app.schemas.adaptive_curriculum import DailyPlan, PlanTask, RankedWeakness
from app.services.bandit_curriculum_service import BanditCurriculumService
from app.services.context_rotation_engine import ContextRotationEngine
from app.services.fatigue_guard import FatigueGuard

logger = logging.getLogger("app.adaptive_curriculum")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_DEFAULT_TASKS = 4
_MIN_TASKS = 2
_MAX_TASKS = 8

# Lifecycle states that count as "persistent weakness" (70 % bucket)
_PERSISTENT_STATES = {"new", "observed", "recurring", "targeted", "recurrent"}
# Lifecycle states that count as "reinforcement" (20 % bucket)
_REINFORCEMENT_STATES = {"improving", "stable"}

_JLPT_DEFAULT = "N4"

# Task type descriptions (template fallback, overwritten by AI enrichment)
_TASK_TEMPLATES: dict[str, dict[str, str]] = {
    "targeted_drill": {
        "description": "Luyện viết tập trung vào điểm yếu được xác định.",
        "reason_tpl": "Điểm yếu {category}/{subtype} được ưu tiên luyện trực tiếp.",
    },
    "self_correction": {
        "description": "Tự sửa lại ví dụ lỗi đã ghi nhận từ bài viết trước.",
        "reason_tpl": "Tự sửa lỗi giúp củng cố nhận thức về {category}/{subtype}.",
    },
    "real_world_writing": {
        "description": "Viết theo tình huống thực tế áp dụng điểm yếu vừa luyện.",
        "reason_tpl": "Thực hành {category}/{subtype} trong bối cảnh thực tế.",
    },
    "transfer_retest": {
        "description": "Kiểm tra lại điểm yếu trong ngữ cảnh mới chưa từng vượt qua.",
        "reason_tpl": "{category}/{subtype} chưa được kiểm tra trong ngữ cảnh {context}.",
    },
    "exploration": {
        "description": "Khám phá thể loại viết hoặc văn phong chưa luyện nhiều.",
        "reason_tpl": "Mở rộng trải nghiệm viết sang hướng mới.",
    },
}

# Register derived from context type
_CONTEXT_REGISTER: dict[str, str] = {
    "sentence": "polite",
    "rewrite": "polite",
    "casual": "casual",
    "polite": "polite",
    "business": "business",
    "paragraph": "polite",
    "free_writing": "casual",
    "real_world_mission": "polite",
}


# ---------------------------------------------------------------------------
# Cognitive Load & Knapsack DP Engine (Algorithm 10)
# ---------------------------------------------------------------------------

_CONTEXT_COGNITIVE_COST: dict[str, int] = {
    "sentence": 15,
    "casual": 15,
    "polite": 20,
    "rewrite": 20,
    "free_writing": 25,
    "paragraph": 30,
    "business": 35,
    "real_world_mission": 35,
}

_TASK_TYPE_COGNITIVE_COST: dict[str, int] = {
    "targeted_drill": 5,
    "self_correction": 10,
    "transfer_retest": 15,
    "real_world_writing": 20,
    "exploration": 10,
}

_REGISTER_COGNITIVE_COST: dict[str, int] = {
    "casual": 0,
    "polite": 5,
    "business": 10,
}


def compute_cognitive_cost(context: str, task_type: str, register: str) -> int:
    """Computes the cognitive load score (weight) of a task based on Cognitive Load Theory.

    Factors:
    - Context difficulty (e.g., business mission vs isolated sentence)
    - Task type demand (e.g., real-world writing vs targeted drill)
    - Register friction (e.g., keigo vs casual)
    """
    return (
        _CONTEXT_COGNITIVE_COST.get(context, 20)
        + _TASK_TYPE_COGNITIVE_COST.get(task_type, 10)
        + _REGISTER_COGNITIVE_COST.get(register, 5)
    )


def solve_cardinality_knapsack(
    items: list[Any],
    k: int,
    max_weight: int,
    weight_fn: Any,
    value_fn: Any,
) -> list[Any]:
    """Solve the Exact-k Cardinality Knapsack Problem via 3D Dynamic Programming.

    Finds a subset S of items such that:
      - |S| = min(k, len(items))
      - sum_{i in S} weight(i) <= max_weight
      - sum_{i in S} value(i) is maximized.

    Time complexity: O(N * k * max_weight)
    Backtracking: Guarantees optimal global pedagogical utility under cognitive budget.
    """
    n = len(items)
    if n <= k:
        return list(items)
    if k <= 0:
        return []

    weights = [max(1, int(weight_fn(item))) for item in items]
    values = [max(0.0, float(value_fn(item))) for item in items]

    # dp[c][w] stores max value with exactly c items and total weight w
    dp: list[list[float]] = [[-1.0] * (max_weight + 1) for _ in range(k + 1)]
    dp[0][0] = 0.0

    # parent[i][c][w] tracks if item i-1 was included
    parent: list[list[list[bool]]] = [
        [[False] * (max_weight + 1) for _ in range(k + 1)] for _ in range(n + 1)
    ]

    for i in range(1, n + 1):
        wi = weights[i - 1]
        vi = values[i - 1]
        for c in range(k, 0, -1):
            for w in range(max_weight, wi - 1, -1):
                prev_val = dp[c - 1][w - wi]
                if prev_val >= 0.0 and (prev_val + vi > dp[c][w]):
                    dp[c][w] = prev_val + vi
                    parent[i][c][w] = True

    # Find the best w in [0, max_weight] for exactly k items
    best_w = -1
    best_val = -1.0
    for w in range(max_weight + 1):
        if dp[k][w] > best_val:
            best_val = dp[k][w]
            best_w = w

    # Backtrack if valid solution exists within budget
    if best_w >= 0 and best_val >= 0:
        selected: list[Any] = []
        curr_c = k
        curr_w = best_w
        for i in range(n, 0, -1):
            if parent[i][curr_c][curr_w]:
                selected.append(items[i - 1])
                curr_c -= 1
                curr_w -= weights[i - 1]
        selected.reverse()
        return selected

    # Graceful fallback: Sort by value-to-weight efficiency if all k exceed budget
    indexed = sorted(
        items,
        key=lambda item: (value_fn(item) / max(1, weight_fn(item)), value_fn(item)),
        reverse=True,
    )
    return indexed[:k]


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class DailyWritingPlanService:
    """Builds today's writing plan from ranked weaknesses.

    The service is stateless — it receives pre-ranked weaknesses and the
    learner's profile summary, and returns a ``DailyPlan``.  All mutation
    (context rotation advance) is handled by ``AdaptiveCurriculumService``
    after the plan is returned.
    """

    def __init__(self, total_tasks: int = _DEFAULT_TASKS) -> None:
        self._total_tasks = max(_MIN_TASKS, min(total_tasks, _MAX_TASKS))

    # -- public ---------------------------------------------------------------

    def build(
        self,
        ranked: list[RankedWeakness],
        all_weaknesses: list[WritingWeakness],
        profile_summary: dict[str, Any] | None = None,
    ) -> DailyPlan:
        """Build a DailyPlan from ranked weaknesses.

        Args:
            ranked:           Pre-ranked list from WritingPriorityEngine.
            all_weaknesses:   Raw weakness models (needed for lifecycle lookup).
            profile_summary:  Optional learner profile (for JLPT level etc.).
        """
        profile_summary = profile_summary or {}
        today = date.today().isoformat()
        now_iso = datetime.now(timezone.utc).isoformat()

        # Split into buckets
        weakness_map = {w.id: w for w in all_weaknesses}
        persistent_ranked = [
            r
            for r in ranked
            if weakness_map.get(r.weakness_id) is not None
            and (weakness_map[r.weakness_id].lifecycle_state or "new")
            in _PERSISTENT_STATES
            and (weakness_map[r.weakness_id].lifecycle_state or "new") != "mastered"
        ]
        reinforcement_ranked = [
            r
            for r in ranked
            if weakness_map.get(r.weakness_id) is not None
            and (weakness_map[r.weakness_id].lifecycle_state or "new")
            in _REINFORCEMENT_STATES
        ]

        # Allocate slot counts (70 / 20 / 10)
        n_explore = max(1, int(round(self._total_tasks * 0.10)))
        n_reinforce = 1 if reinforcement_ranked and self._total_tasks >= 3 else 0
        if self._total_tasks >= 5 and len(reinforcement_ranked) >= 2:
            n_reinforce = max(n_reinforce, int(round(self._total_tasks * 0.20)))
        n_persistent = max(1, self._total_tasks - n_reinforce - n_explore)

        # Normalize total allocations
        while n_persistent + n_reinforce + n_explore > self._total_tasks:
            if n_persistent > 1:
                n_persistent -= 1
            elif n_reinforce > 1:
                n_reinforce -= 1
            elif n_explore > 1:
                n_explore -= 1
            else:
                break

        guard = FatigueGuard(window=3)
        tasks: list[PlanTask] = []

        jlpt = (
            profile_summary.get("estimated_jlpt", {}).get("max_level")
            or profile_summary.get("target_jlpt")
            or _JLPT_DEFAULT
        )

        # -- 70 % persistent bucket ------------------------------------------
        tasks.extend(
            self._fill_bucket(
                ranked=persistent_ranked,
                weakness_map=weakness_map,
                count=n_persistent,
                guard=guard,
                bucket="persistent",
                task_types=["targeted_drill", "self_correction", "real_world_writing", "transfer_retest"],
                jlpt=jlpt,
            )
        )

        # -- 20 % reinforcement bucket ----------------------------------------
        tasks.extend(
            self._fill_bucket(
                ranked=reinforcement_ranked,
                weakness_map=weakness_map,
                count=n_reinforce,
                guard=guard,
                bucket="reinforcement",
                task_types=["self_correction", "transfer_retest"],
                jlpt=jlpt,
            )
        )

        # -- 10 % exploration bucket ------------------------------------------
        tasks.extend(
            self._build_exploration_tasks(n_explore, guard, jlpt, profile_summary)
        )

        # Backfill if total tasks is still below requested count
        deficit = self._total_tasks - len(tasks)
        if deficit > 0:
            tasks.extend(
                self._build_exploration_tasks(deficit, guard, jlpt, profile_summary)
            )

        breakdown = {
            "persistent": sum(1 for t in tasks if t.bucket == "persistent"),
            "reinforcement": sum(1 for t in tasks if t.bucket == "reinforcement"),
            "exploration": sum(1 for t in tasks if t.bucket == "exploration"),
        }

        return DailyPlan(
            plan_date=today,
            tasks=tasks,
            total_tasks=len(tasks),
            bucket_breakdown=breakdown,
            generated_at=now_iso,
            enriched=False,
        )

    # -- private helpers -------------------------------------------------------

    def _fill_bucket(
        self,
        ranked: list[RankedWeakness],
        weakness_map: dict[str, WritingWeakness],
        count: int,
        guard: FatigueGuard,
        bucket: str,
        task_types: list[str],
        jlpt: str,
    ) -> list[PlanTask]:
        if count <= 0 or not ranked:
            return []

        type_cycle = task_types.copy()
        candidates: list[dict[str, Any]] = []

        # 1. Gather all non-fatigued viable candidates
        for idx, ranked_w in enumerate(ranked):
            weakness = weakness_map.get(ranked_w.weakness_id)
            if weakness is None:
                continue

            ctx = ContextRotationEngine.current_context(weakness)
            if guard.is_fatigued(ranked_w.weakness_id, ctx):
                ctx = ContextRotationEngine.peek_next(weakness)
                if guard.is_fatigued(ranked_w.weakness_id, ctx):
                    continue

            task_type = type_cycle[idx % len(type_cycle)]
            register = _CONTEXT_REGISTER.get(ctx, "polite")
            cost = compute_cognitive_cost(ctx, task_type, register)
            value = max(1.0, ranked_w.priority_score * 100.0)

            task = self._make_task(
                ranked_w=ranked_w,
                ctx=ctx,
                task_type=task_type,
                bucket=bucket,
                jlpt=jlpt,
                register=register,
            )

            candidates.append({
                "task": task,
                "cost": cost,
                "value": value,
                "weakness_id": ranked_w.weakness_id,
                "ctx": ctx,
                "register": register,
            })

        if not candidates:
            return []

        # 2. Optimal task subset selection via Exact-k Cardinality Knapsack DP
        if len(candidates) <= count:
            selected_candidates = candidates
        else:
            # Daily cognitive load target: 45 units per task average
            max_bucket_budget = count * 45
            selected_candidates = solve_cardinality_knapsack(
                items=candidates,
                k=count,
                max_weight=max_bucket_budget,
                weight_fn=lambda c: c["cost"],
                value_fn=lambda c: c["value"],
            )

        # 3. Sort selected tasks in gentle warm-up -> cognitive peak sequence
        selected_candidates.sort(key=lambda c: c["cost"])

        # 4. Record into FatigueGuard and build final list
        selected_tasks: list[PlanTask] = []
        for cand in selected_candidates:
            selected_tasks.append(cand["task"])
            guard.record(
                cand["weakness_id"],
                cand["ctx"],
                register=cand["register"],
                structure=cand["ctx"],
            )

        return selected_tasks

    def _make_task(
        self,
        ranked_w: RankedWeakness,
        ctx: str,
        task_type: str,
        bucket: str,
        jlpt: str,
        register: str,
    ) -> PlanTask:
        tpl = _TASK_TEMPLATES.get(task_type, _TASK_TEMPLATES["targeted_drill"])
        reason = tpl["reason_tpl"].format(
            category=ranked_w.category,
            subtype=ranked_w.subtype,
            context=ctx,
        )
        # Prepend the priority reason (will be overwritten by AI enrichment)
        full_reason = f"{ranked_w.priority_reason} {reason}".strip()

        return PlanTask(
            task_id=_stable_task_id(ranked_w.weakness_id, ctx, task_type),
            task_type=task_type,
            weakness_id=ranked_w.weakness_id,
            category=ranked_w.category,
            subtype=ranked_w.subtype,
            context_type=ctx,
            task_description=tpl["description"],
            reason=full_reason,
            register=register,
            jlpt_level=jlpt,
            bucket=bucket,
        )

    def _build_exploration_tasks(
        self,
        count: int,
        guard: FatigueGuard,
        jlpt: str,
        profile_summary: dict[str, Any],
    ) -> list[PlanTask]:
        if count <= 0:
            return []

        tasks: list[PlanTask] = []
        arm_state = profile_summary.get("bandit_state")
        bandit = BanditCurriculumService(arm_state=arm_state)

        saturated_registers = set()
        for reg in ("casual", "polite", "business"):
            if guard.is_register_saturated(reg):
                saturated_registers.add(reg)

        sampled_contexts = bandit.sample_multiple_distinct(
            count=count, excluded_registers=saturated_registers
        )

        for ctx in sampled_contexts:
            register = _CONTEXT_REGISTER.get(ctx, "casual")
            tpl = _TASK_TEMPLATES["exploration"]
            task = PlanTask(
                task_id=_stable_task_id(None, ctx, "exploration"),
                task_type="exploration",
                weakness_id=None,
                category=None,
                subtype=None,
                context_type=ctx,
                task_description=tpl["description"],
                reason=tpl["reason_tpl"].format(
                    category="", subtype="", context=ctx
                ),
                register=register,
                jlpt_level=jlpt,
                bucket="exploration",
            )
            tasks.append(task)
            guard.record(None, ctx, register=register, structure=ctx)
        return tasks


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _stable_task_id(
    weakness_id: str | None, context_type: str, task_type: str
) -> str:
    """Generate a deterministic task ID from its key ingredients."""
    raw = f"{weakness_id or 'explore'}|{context_type}|{task_type}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]
