"""AI contracts for the gamification experience layer (Phase 7).

Five AI stages, each schema-validated with deterministic code as the
authoritative layer:

1. daily_mission_generation  - today's AI mission over Phase 6 learner state
2. challenge_generation      - one challenge of a validated type
3. progress_summary          - short summary over actual evidence
4. milestone_celebration     - personalized celebration (real metrics only)
5. encouragement             - contextual, rate-limited encouragement

XP amounts, success criteria and milestone thresholds are NEVER decided by
these outputs; the AI only narrates/selects, code awards and validates.
"""

from typing import Literal

from pydantic import BaseModel, Field

ChallengeType = Literal[
    "naturalness",
    "register",
    "vocabulary",
    "compression",
    "expansion",
    "nuance",
    "error_fix",
]

MissionType = Literal[
    "practice",
    "weakness_focus",
    "register_focus",
    "challenge_mix",
]

SKILL_NAMES = Literal[
    "grammar",
    "vocabulary",
    "naturalness",
    "semantic",
    "context_fit",
    "register_fit",
]


class DailyMissionResult(BaseModel):
    """Stage 1 output: today's mission.

    ``target_count`` is validated and clamped to the learner's daily target;
    the code never lets the AI inflate the mission size.
    """

    mission_type: MissionType = "practice"
    title: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=1000)
    target_count: int = Field(ge=1, le=20)
    focus_skills: list[SKILL_NAMES] = Field(default_factory=list, max_length=3)
    topic: str = Field(min_length=1, max_length=100)
    register: str = Field(min_length=1, max_length=16)
    difficulty: int = Field(ge=1, le=10)
    reason: str = Field(min_length=1, max_length=1000)


class ChallengeGenerationResult(BaseModel):
    """Stage 2 output: one challenge (validated against the learner context).

    ``required_expression`` must be a real expression from the learner's
    recent vocabulary for ``vocabulary`` challenges; the code rejects the
    output otherwise and falls back deterministically.
    """

    type: ChallengeType = "naturalness"
    instruction_vi: str = Field(min_length=1, max_length=1000)
    source_text: str = Field(min_length=1, max_length=2000)
    target_skill: SKILL_NAMES = "naturalness"
    difficulty: int = Field(ge=1, le=10)
    objective: str = Field(min_length=1, max_length=500)
    required_expression: str | None = Field(default=None, min_length=1, max_length=100)


class ProgressSummaryResult(BaseModel):
    """Stage 3 output: short daily summary over real structured evidence."""

    summary: str = Field(min_length=1, max_length=2000)
    improved: list[str] = Field(default_factory=list, max_length=6)
    needs_work: list[str] = Field(default_factory=list, max_length=6)
    vocabulary_discovered: int = Field(default=0, ge=0)


class MilestoneCelebrationResult(BaseModel):
    """Stage 4 output: personalized milestone message.

    The message must reference the real milestone metric; the code refuses
    AI-invented progress by only showing what it passed in.
    """

    message: str = Field(min_length=1, max_length=1000)


class EncouragementResult(BaseModel):
    """Stage 5 output: contextual encouragement after a real improvement.

    Only generated after a verified improvement event (high score or retry
    improvement); the code passes the actual before/after numbers.
    """

    message: str = Field(min_length=1, max_length=1000)
