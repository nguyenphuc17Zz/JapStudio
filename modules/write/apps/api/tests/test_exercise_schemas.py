import pytest
from app.models import ExerciseType, JlptLevel, Register, TargetLength
from app.schemas.exercise import ExerciseGenerationRequest
from app.schemas.exercise_ai import (
    ExerciseDraft,
    ExercisePlan,
    ExerciseValidationResult,
    GenerationMetadata,
)
from pydantic import ValidationError


def test_empty_generation_request_is_valid() -> None:
    request = ExerciseGenerationRequest()
    assert request.exercise_type is None
    assert request.topic is None
    assert request.register is None
    assert request.jlpt_level is None
    assert request.difficulty is None
    assert request.target_length is None


def test_generation_request_accepts_full_preferences() -> None:
    request = ExerciseGenerationRequest(
        exercise_type="paragraph_translation",
        topic="Du lịch",
        register="polite",
        jlpt_level="N3",
        difficulty=6,
        target_length="paragraph",
    )
    assert request.exercise_type == ExerciseType.PARAGRAPH_TRANSLATION
    assert request.register == Register.POLITE
    assert request.jlpt_level == JlptLevel.N3
    assert request.target_length == TargetLength.PARAGRAPH


@pytest.mark.parametrize(
    "payload",
    [
        {"exercise_type": "bogus"},
        {"register": "formal"},
        {"jlpt_level": "N6"},
        {"target_length": "novel"},
        {"difficulty": 0},
        {"difficulty": 11},
        {"topic": ""},
        {"topic": "x" * 101},
    ],
)
def test_generation_request_rejects_invalid_values(payload: dict) -> None:
    with pytest.raises(ValidationError):
        ExerciseGenerationRequest(**payload)


def test_plan_validates_fields() -> None:
    plan = ExercisePlan(
        exercise_type=ExerciseType.SENTENCE_TRANSLATION,
        topic="Work",
        register=Register.CASUAL,
        jlpt_level=JlptLevel.N3,
        difficulty=6,
        target_length=TargetLength.SENTENCE,
    )
    assert plan.subtopic is None
    assert plan.difficulty == 6


@pytest.mark.parametrize(
    "overrides",
    [
        {"difficulty": 0},
        {"difficulty": 11},
        {"topic": ""},
        {"topic": "x" * 101},
        {"subtopic": "x" * 101},
    ],
)
def test_plan_rejects_invalid_values(overrides: dict) -> None:
    base = dict(
        exercise_type=ExerciseType.SENTENCE_TRANSLATION,
        topic="Work",
        register=Register.CASUAL,
        jlpt_level=JlptLevel.N3,
        difficulty=6,
        target_length=TargetLength.SENTENCE,
    )
    base.update(overrides)
    with pytest.raises(ValidationError):
        ExercisePlan(**base)


def test_draft_validates_fields() -> None:
    draft = ExerciseDraft(
        context="Một ngày làm việc khá bận rộn.",
        prompt_vi="Hôm nay nhiều việc quá nên chắc tui sẽ về muộn.",
        grammar_complexity=5,
        vocabulary_complexity=5,
        context_complexity=6,
        naturalness_target=7,
    )
    assert draft.grammar_complexity == 5


@pytest.mark.parametrize(
    "overrides",
    [
        {"context": ""},
        {"prompt_vi": ""},
        {"prompt_vi": "x" * 2001},
        {"grammar_complexity": 0},
        {"grammar_complexity": 11},
        {"vocabulary_complexity": 0},
        {"context_complexity": 11},
        {"naturalness_target": 0},
    ],
)
def test_draft_rejects_invalid_values(overrides: dict) -> None:
    base = dict(
        context="Bối cảnh ngắn gọn.",
        prompt_vi="Một câu tiếng Việt tự nhiên.",
        grammar_complexity=5,
        vocabulary_complexity=5,
        context_complexity=5,
        naturalness_target=5,
    )
    base.update(overrides)
    with pytest.raises(ValidationError):
        ExerciseDraft(**base)


def test_validation_result_accepts_issues() -> None:
    result = ExerciseValidationResult(valid=False, issues=["prompt chưa tự nhiên", "quá dễ"])
    assert result.valid is False
    assert len(result.issues) == 2


def test_validation_result_limits_issues() -> None:
    with pytest.raises(ValidationError):
        ExerciseValidationResult(valid=False, issues=["a"] * 11)


def test_generation_metadata_builds_and_serializes() -> None:
    from datetime import datetime, timezone

    metadata = GenerationMetadata(
        provider="ollama",
        model="aya-expanse:8b",
        generation_version="exercise_generation:v1",
        prompt_version="exercise_generator:v1",
        generation_timestamp=datetime.now(timezone.utc),
        regeneration_attempts=1,
    )
    dumped = metadata.model_dump(mode="json")
    assert dumped["provider"] == "ollama"
    assert dumped["regeneration_attempts"] == 1
    assert "generation_timestamp" in dumped
