"""Deterministic memory taxonomy (Phase 12).

Every learner memory is constrained to the controlled sets below. The AI
proposes candidates; deterministic code rejects anything outside these sets,
so arbitrary learner "facts" cannot be invented by a model.
"""

import enum

# Memory categories (the controlled taxonomy from the Phase 12 spec).
MEMORY_CATEGORIES: frozenset[str] = frozenset(
    {
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
    }
)

# Memory types (semantic / episodic / pattern / preference).
MEMORY_TYPES: frozenset[str] = frozenset({"semantic", "episodic", "pattern", "preference"})

# Where a memory came from. Explicit user statements have the highest
# authority and always win over inferred memories.
MEMORY_SOURCES: frozenset[str] = frozenset(
    {"user_explicit", "evaluation", "vocabulary", "scenario", "simulation", "coach", "profile"}
)

# Memory lifecycle states. Historical data is never deleted on transition.
MEMORY_STATUSES: frozenset[str] = frozenset(
    {"candidate", "active", "superseded", "expired", "archived"}
)

# Memory classes drive deterministic retention.
# - stable:      long-term patterns/preferences (never auto-expire)
# - temporary:   goals, target-level, short-term weakness (may expire)
MEMORY_CLASSES: frozenset[str] = frozenset({"stable", "temporary"})

# Confidence/importance levels (mirrors the quality-layer vocabulary).
CONFIDENCE_LEVELS: frozenset[str] = frozenset({"low", "medium", "high"})

IMPORTANCE_MIN = 1
IMPORTANCE_MAX = 10

# Sources that are eligible for AI-inferred memory (explicit is handled
# separately and is never auto-generated).
INFERENCE_SOURCES: frozenset[str] = MEMORY_SOURCES - {"user_explicit"}


class MemorySource(str, enum.Enum):
    USER_EXPLICIT = "user_explicit"
    EVALUATION = "evaluation"
    VOCABULARY = "vocabulary"
    SCENARIO = "scenario"
    SIMULATION = "simulation"
    COACH = "coach"
    PROFILE = "profile"


class MemoryStatus(str, enum.Enum):
    CANDIDATE = "candidate"
    ACTIVE = "active"
    SUPERSEDED = "superseded"
    EXPIRED = "expired"
    ARCHIVED = "archived"


class MemoryClass(str, enum.Enum):
    STABLE = "stable"
    TEMPORARY = "temporary"


# Vietnamese labels used in AI prompt blocks and the memory UI.
CATEGORY_LABELS_VI: dict[str, str] = {
    "preference": "Sở thích",
    "learning_pattern": "Thói quen học",
    "mistake_pattern": "Lỗi thường gặp",
    "successful_pattern": "Điểm mạnh ổn định",
    "vocabulary_memory": "Ghi nhớ từ vựng",
    "expression_memory": "Ghi nhớ cách diễn đạt",
    "scenario_memory": "Ghi nhớ luyện tình huống",
    "simulation_memory": "Ghi nhớ mô phỏng hội thoại",
    "goal_memory": "Mục tiêu",
    "style_preference": "Phong cách viết",
    "milestone_memory": "Cột mốc",
}


def is_valid_category(value: str) -> bool:
    return value in MEMORY_CATEGORIES


def is_valid_type(value: str) -> bool:
    return value in MEMORY_TYPES


def is_valid_source(value: str) -> bool:
    return value in MEMORY_SOURCES


def is_valid_status(value: str) -> bool:
    return value in MEMORY_STATUSES


def is_valid_confidence(value: str) -> bool:
    return value in CONFIDENCE_LEVELS
