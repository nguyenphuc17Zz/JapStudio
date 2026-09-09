from app.prompts.common import (
    EXERCISE_GENERATION_VERSION,
    MEANING_PRINCIPLE,
    NATURAL_VIETNAMESE_RULES,
    STYLE_EXAMPLES,
    format_recent_items,
)
from app.prompts.exercise_generator import (
    build_generator_prompt,
    generator_prompt_version,
)
from app.prompts.exercise_planner import (
    build_planner_prompt,
    planner_prompt_version,
)
from app.prompts.exercise_validator import (
    build_validator_prompt,
    validator_prompt_version,
)
from app.prompts.topics import TOPIC_CATEGORIES, TOPIC_VARIATION_EXAMPLES, format_topic_taxonomy
from app.schemas.exercise import ExerciseGenerationRequest
from tests.scripted_provider import default_draft, default_plan


def test_versions_are_explicit() -> None:
    assert planner_prompt_version() == "exercise_planner:v1"
    assert generator_prompt_version() == "exercise_generator:v1"
    assert validator_prompt_version() == "exercise_validation:v1"
    assert EXERCISE_GENERATION_VERSION == "exercise_generation:v1"


def test_common_rules_cover_quality_requirements() -> None:
    assert "natural" in NATURAL_VIETNAMESE_RULES.lower()
    assert "textbook" in NATURAL_VIETNAMESE_RULES
    assert "ONE clear target meaning" in NATURAL_VIETNAMESE_RULES
    assert "MEANING" in MEANING_PRINCIPLE
    assert "never an exact" in MEANING_PRINCIPLE
    assert "GOOD (natural)" in STYLE_EXAMPLES


def test_topic_taxonomy_contains_seed_categories() -> None:
    for category in ("Work", "Food", "Travel", "Japanese Culture", "BRSE"):
        assert category in TOPIC_CATEGORIES
    assert "overtime" in TOPIC_VARIATION_EXAMPLES["Work"]


def test_topic_taxonomy_formats() -> None:
    rendered = format_topic_taxonomy()
    assert "Known topic categories" in rendered
    assert "deadline" in rendered


def test_planner_prompt_without_preferences() -> None:
    system, user = build_planner_prompt(None, recent_topics=[])
    assert "planner" in system
    assert "no preferences" in user
    assert "Known topic categories" in user


def test_planner_prompt_includes_preferences_and_recent_topics() -> None:
    preferences = ExerciseGenerationRequest(
        exercise_type="free_writing",
        topic="Work",
        register="business",
        jlpt_level="N2",
        difficulty=8,
        target_length="paragraph",
    )
    system, user = build_planner_prompt(preferences, recent_topics=["Food", "Travel"])
    assert "exercise_type: free_writing" in user
    assert "topic: Work" in user
    assert "register: business" in user
    assert "jlpt_level: N2" in user
    assert "difficulty: 8" in user
    assert "target_length: paragraph" in user
    assert "- Food" in user
    assert "- Travel" in user


def test_generator_prompt_includes_plan() -> None:
    system, user = build_generator_prompt(default_plan())
    assert "context" in system
    assert "topic: Work" in user
    assert "register: casual" in user
    assert "jlpt_level: N3" in user
    assert "target_length: sentence" in user


def test_generator_prompt_includes_feedback() -> None:
    system, user = build_generator_prompt(
        default_plan(),
        issues=["prompt chưa tự nhiên"],
        similar_prompts=["Một câu gần giống đã tồn tại."],
    )
    assert "prompt chưa tự nhiên" in user
    assert "Một câu gần giống đã tồn tại." in user


def test_validator_prompt_includes_plan_and_draft() -> None:
    system, user = build_validator_prompt(default_plan(), default_draft())
    assert "quality gate" in system
    assert "context: Một ngày làm việc khá bận rộn." in user
    assert "prompt_vi: Hôm nay nhiều việc quá nên chắc tui sẽ về muộn." in user
    assert "grammar_complexity: 5" in user


def test_format_recent_items_bounds_and_renders() -> None:
    items = [f"topic-{index}" for index in range(15)]
    rendered = format_recent_items("Recent", items, max_items=3)
    assert "topic-0" in rendered
    assert "topic-2" in rendered
    assert "topic-3" not in rendered
    assert format_recent_items("Recent", []) == ""
