"""AI contracts for the memory layer (Phase 12).

Four AI stages, each schema-validated and routed through the Phase 11
quality layer. Deterministic code remains authoritative: the AI proposes
candidates, code validates taxonomy, merges, resolves conflicts and updates
confidence — never trusting the model to do arithmetic or invent facts.

1. memory_extraction          - propose candidate memories from an event
2. memory_validation          - accept / reject / merge / update a candidate
3. memory_conflict_detection  - classify a conflict between two memories
4. memory_resolution          - pick the winning memory (deterministic
                                fallback: explicit user memory always wins)
5. memory_context_selection   - optional AI refinement of deterministic
                                retrieval (off by default)
"""

from typing import Literal

from pydantic import BaseModel, Field

MEMORY_CATEGORY = Literal[
    "preference",
    "learning_pattern",
    "mistake_pattern",
    "successful_pattern",
    "vocabulary_memory",
    "expression_memory",
    "scenario_memory",
    "simulation_memory",
    "goal_memory",
    "style_preference",
    "milestone_memory",
]

MEMORY_TYPE = Literal["semantic", "episodic", "pattern", "preference"]

CONFIDENCE = Literal["high", "medium", "low"]


class MemoryEvidenceItem(BaseModel):
    """One evidence pointer (identifiers only, never raw learner text)."""

    source_type: str = Field(min_length=1, max_length=32)
    source_id: str | None = None


class MemoryCandidate(BaseModel):
    """One proposed memory from the extraction stage."""

    category: MEMORY_CATEGORY
    type: MEMORY_TYPE
    content: str = Field(min_length=1, max_length=500)
    confidence: CONFIDENCE = "medium"
    importance: int = Field(default=5, ge=1, le=10)
    evidence: list[MemoryEvidenceItem] = Field(default_factory=list, max_length=20)


class MemoryExtractionResult(BaseModel):
    """Extraction stage output: candidate memories for one learning event."""

    candidate_memories: list[MemoryCandidate] = Field(default_factory=list, max_length=10)


class MemoryValidationResult(BaseModel):
    """Validation stage output for one candidate vs existing memories.

    ``action``: accept (new memory), reject (unsupported / weak / unsound),
    merge (fold into ``matched_memory_id``), update (refresh an existing
    memory). Code enforces the action; the AI only proposes it.
    """

    action: Literal["accept", "reject", "merge", "update"] = "accept"
    matched_memory_id: str | None = None
    reason: str = Field(default="", max_length=500)
    adjusted_confidence: CONFIDENCE | None = None
    adjusted_importance: int | None = Field(default=None, ge=1, le=10)


class MemoryConflictResult(BaseModel):
    """Conflict stage output: classification of a new vs existing memory.

    ``verdict``: contradiction (one is wrong), refinement (new is a more
    precise version), contextual (both are true in different contexts),
    preference_change (the learner genuinely changed preference).
    """

    verdict: Literal["contradiction", "refinement", "contextual", "preference_change"] = (
        "contextual"
    )
    winning_memory_id: str | None = None
    resolution_note: str = Field(default="", max_length=500)


class MemoryResolutionResult(BaseModel):
    """Resolution stage output: the final decision between two memories."""

    final_decision: Literal["keep_existing", "replace", "keep_both"] = "keep_existing"
    winning_memory_id: str | None = None
    reason: str = Field(default="", max_length=500)


class MemoryContextSelectionResult(BaseModel):
    """Context selection output: which retrieved memories matter for a task."""

    selected_memory_ids: list[str] = Field(default_factory=list, max_length=20)
    rationale: str = Field(default="", max_length=500)
