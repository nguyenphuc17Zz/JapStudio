"""Feature effectiveness (Phase 14)."""

from app.core.config import Settings
from app.services.analytics.effectiveness import FeatureEffectivenessService
from tests.analytics_helpers import days_ago, make_attempt, make_exercise

WINDOW = "30d"


async def test_scenario_effectiveness_groups(session) -> None:
    from app.models.writing import WritingScenario

    scenario = WritingScenario(
        user_id=None,
        genre="business_email",
        medium="email",
        audience="colleague",
        relationship="colleague",
        purpose="request",
        register="polite",
        tone="formal",
        target_length="long_writing",
        jlpt_level="N3",
        topic="Work",
        situation_vi="TÃ¬nh huá»‘ng.",
        context_vi="Bá»‘i cáº£nh.",
        required_points=[],
        optional_points=[],
        forbidden_patterns=[],
        difficulty_metadata={},
        difficulty=5,
        status="generated",
    )
    session.add(scenario)
    await session.flush()
    exercise = await make_exercise(session, scenario_id=scenario.id)
    await make_attempt(session, exercise, score=85, when=days_ago(2))
    await session.commit()

    data = await FeatureEffectivenessService(session, Settings(analytics_min_evidence=1)).compute(
        WINDOW
    )
    assert data["scenario_effectiveness"]
    entry = data["scenario_effectiveness"][0]
    assert entry["metric_key"] == "feature.scenario.business_email.usefulness"
    assert entry["value"] is not None
    assert 0 <= entry["value"] <= 100
    assert entry["sample_count"] == 1


async def test_difficulty_effectiveness(session) -> None:
    exercise = await make_exercise(session, jlpt_level="N3", difficulty=7)
    await make_attempt(session, exercise, score=40, when=days_ago(2))
    await session.commit()

    data = await FeatureEffectivenessService(session, Settings(analytics_min_evidence=1)).compute(
        WINDOW
    )
    difficulty = data["difficulty_effectiveness"]
    assert any(entry["metric_key"] == "feature.difficulty.N3.7.avg_score" for entry in difficulty)
    score_entry = next(
        entry for entry in difficulty if entry["metric_key"] == "feature.difficulty.N3.7.avg_score"
    )
    assert score_entry["value"] == 40.0


async def test_vocabulary_effectiveness(session) -> None:
    from datetime import datetime, timezone

    from app.models.vocabulary import UserVocabulary, VocabularyEntry

    entry = VocabularyEntry(
        expression="ãŒã‚“ã°ã‚‹",
        normalized_expression="ãŒã‚“ã°ã‚‹",
        reading="ãŒã‚“ã°ã‚‹",
        type="word",
        meaning_vi="Cá»‘ gáº¯ng",
        part_of_speech="verb",
        estimated_jlpt_level="N4",
        difficulty=4,
        register="casual",
        usage_context="everyday",
        example_sentence="æ˜Žæ—¥ã‚‚ãŒã‚“ã°ã‚‹ã€‚",
        natural_alternatives=[],
        notes=None,
        importance=6,
        confidence="high",
        provenance={"source": "test"},
    )
    session.add(entry)
    await session.flush()
    used = UserVocabulary(
        user_id=None,
        entry_id=entry.id,
        discovered_count=1,
        seen_count=1,
        used_count=3,
        incorrect_count=0,
        correct_usage_count=3,
        familiarity="familiar",
        last_seen=datetime.now(timezone.utc),
        first_used_at=datetime.now(timezone.utc),
        learning_reason="test",
    )
    session.add(used)
    await session.commit()

    data = await FeatureEffectivenessService(session, Settings(analytics_min_evidence=1)).compute(
        WINDOW
    )
    vocabulary = {entry["metric_key"]: entry for entry in data["vocabulary_effectiveness"]}
    assert "feature.vocabulary.overall.used_rate" in vocabulary
    assert vocabulary["feature.vocabulary.overall.used_rate"]["value"] == 1.0


async def test_memory_effectiveness(session) -> None:
    from app.models.memory import LearnerMemory

    await make_exercise(
        session,
        generation_metadata={"provider": "fake", "memory_context_used": True},
    )
    await make_exercise(
        session,
        generation_metadata={"provider": "fake", "memory_context_used": False},
    )
    memory = LearnerMemory(
        user_id=None,
        category="vocabulary",
        type="word",
        content="ãŒã‚“ã°ã‚‹",
        confidence="high",
        importance=5,
        source_type="vocabulary",
        occurrence_count=3,
        status="stable",
        memory_class="stable",
    )
    session.add(memory)
    await session.commit()

    data = await FeatureEffectivenessService(session, Settings(analytics_min_evidence=1)).compute(
        WINDOW
    )
    memory_entries = {entry["metric_key"]: entry for entry in data["memory_effectiveness"]}
    assert memory_entries["feature.memory.context.usage_rate"]["value"] == 0.5
    assert memory_entries["feature.memory.bank.activation_rate"]["value"] == 1.0
