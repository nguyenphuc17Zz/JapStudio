from datetime import datetime, timezone

from app.models import Exercise, ExerciseType, JlptLevel, Register
from app.repositories import ExerciseRepository

from conftest import exercise_factory


async def _seed(session, **overrides) -> Exercise:
    return await ExerciseRepository(session).add(Exercise(**exercise_factory(**overrides)))


async def test_list_with_filters(session) -> None:
    await _seed(
        session,
        topic="Work",
        register="business",
        jlpt_level="N2",
        difficulty=7,
        exercise_type="paragraph_translation",
    )
    await _seed(
        session,
        topic="Food",
        register="casual",
        jlpt_level="N4",
        difficulty=3,
        exercise_type="sentence_translation",
    )
    await _seed(
        session,
        topic="Work",
        register="polite",
        jlpt_level="N3",
        difficulty=5,
        exercise_type="multi_sentence_translation",
    )

    repository = ExerciseRepository(session)

    all_items, all_total = await repository.list_with_filters()
    assert all_total == 3
    assert len(all_items) == 3

    by_register, total = await repository.list_with_filters(register=Register.BUSINESS)
    assert total == 1
    assert by_register[0].topic == "Work"

    by_type, total = await repository.list_with_filters(
        exercise_type=ExerciseType.SENTENCE_TRANSLATION
    )
    assert total == 1
    assert by_type[0].register == Register.CASUAL

    by_level, total = await repository.list_with_filters(jlpt_level=JlptLevel.N3)
    assert total == 1

    by_difficulty, total = await repository.list_with_filters(difficulty=7)
    assert total == 1
    assert by_difficulty[0].topic == "Work"

    by_topic, total = await repository.list_with_filters(topic="work")
    assert total == 2
    assert {item.register for item in by_topic} == {Register.BUSINESS, Register.POLITE}

    paged, total = await repository.list_with_filters(limit=1, skip=1)
    assert len(paged) == 1
    assert total == 3


async def test_list_orders_newest_first(session) -> None:
    await _seed(
        session,
        topic="Food",
        created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )
    await _seed(
        session,
        topic="Work",
        created_at=datetime(2026, 1, 3, tzinfo=timezone.utc),
    )
    await _seed(
        session,
        topic="Travel",
        created_at=datetime(2026, 1, 2, tzinfo=timezone.utc),
    )

    items, _ = await ExerciseRepository(session).list_with_filters()
    assert [item.topic for item in items] == ["Work", "Travel", "Food"]


async def test_find_recent_limits_and_orders(session) -> None:
    await _seed(session, topic="Food")
    await _seed(session, topic="Work")
    await _seed(session, topic="Travel")

    recent = await ExerciseRepository(session).find_recent(2)
    assert len(recent) == 2
    assert recent[0].topic in {"Food", "Work", "Travel"}
    assert recent[0].prompt_vi


async def test_find_by_prompt_hash(session) -> None:
    await _seed(session, prompt_vi_hash="a" * 64)
    repository = ExerciseRepository(session)

    found = await repository.find_by_prompt_hash("a" * 64)
    assert found is not None
    assert found.prompt_vi

    missing = await repository.find_by_prompt_hash("b" * 64)
    assert missing is None
