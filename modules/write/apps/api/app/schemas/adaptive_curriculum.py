"""Adaptive Writing Curriculum 2.0 — Pydantic schemas (Phase 22).

All scoring and planning is deterministic; AI enrichment is optional and
represented by the ``enriched`` flag on DailyPlan.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Priority Engine
# ---------------------------------------------------------------------------


class RankedWeakness(BaseModel):
    """A WritingWeakness ranked by the 8-signal WritingPriorityEngine."""

    weakness_id: str
    category: str
    subtype: str
    description: str
    priority_score: float = Field(ge=0.0, le=100.0)
    """Deterministic composite score 0–100."""
    priority_reason: str
    """Human-readable explanation (template or AI-enriched)."""
    lifecycle_state: str
    next_context_type: str
    """Next rotation context for this weakness."""
    severity: str = "minor"
    recurrence_count: int = 1
    mastery_score: float = 0.0


# ---------------------------------------------------------------------------
# Daily Plan
# ---------------------------------------------------------------------------

TASK_TYPES = (
    "targeted_drill",
    "self_correction",
    "real_world_writing",
    "transfer_retest",
    "exploration",
)

CONTEXT_TYPES = (
    "sentence",
    "rewrite",
    "casual",
    "polite",
    "business",
    "paragraph",
    "free_writing",
    "real_world_mission",
)

BUCKET_TYPES = ("persistent", "reinforcement", "exploration")


class PlanTask(BaseModel):
    """A single writing task in today's daily plan."""

    task_id: str
    """Deterministic ID derived from weakness_id + context_type."""
    task_type: str
    """One of: targeted_drill | self_correction | real_world_writing | transfer_retest | exploration."""
    weakness_id: str | None = None
    category: str | None = None
    subtype: str | None = None
    context_type: str
    """Writing context for this task (sentence / rewrite / casual / ...)."""
    task_description: str
    """Concrete writing prompt (AI-enriched or template fallback)."""
    reason: str
    """Why this task was chosen (AI-enriched or template fallback)."""
    register: str | None = None
    jlpt_level: str | None = None
    bucket: str
    """Allocation bucket: persistent | reinforcement | exploration."""


class DailyPlan(BaseModel):
    """Full daily writing plan for a learner."""

    plan_date: str
    """ISO date string (YYYY-MM-DD)."""
    tasks: list[PlanTask] = Field(default_factory=list)
    total_tasks: int = 0
    bucket_breakdown: dict[str, int] = Field(default_factory=dict)
    """E.g. {"persistent": 2, "reinforcement": 1, "exploration": 1}."""
    generated_at: str
    enriched: bool = False
    """True when AI successfully enriched task descriptions and reasons."""


# ---------------------------------------------------------------------------
# API response wrappers
# ---------------------------------------------------------------------------


class WeaknessPriorityResponse(BaseModel):
    """Response for GET /curriculum/priorities."""

    items: list[RankedWeakness] = Field(default_factory=list)
    total: int = 0
    enriched: bool = False


class SessionDoneRequest(BaseModel):
    """Request body for POST /curriculum/session-done."""

    completed_task_ids: list[str] = Field(default_factory=list)


class SessionDoneResult(BaseModel):
    """Response for POST /curriculum/session-done."""

    completed_count: int = 0
    contexts_advanced: list[str] = Field(default_factory=list)
    """weakness_ids whose context rotation was advanced."""
    session_debrief: str | None = None
    """AI-generated session summary, or None if AI unavailable."""
