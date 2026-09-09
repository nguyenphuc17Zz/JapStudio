"""Phase 14 instrumentation tests.

- GET /exercises/{id} records an ``exercise_opened`` analytics event
- exercise generation persists ``memory_context_used`` in metadata
- vocabulary user state sets ``first_used_at`` on first user-answer usage
"""

from app.models import (
    AttemptStatus,
    ExerciseAttempt,
    VocabularyConfidence,
    VocabularyEntry,
    VocabularyType,
)
from app.models.analytics import AnalyticsEvent
from app.repositories import (
    ExerciseAttemptRepository,
    ExerciseRepository,
    UserVocabularyRepository,
    VocabularyDiscoveryRepository,
    VocabularyEntryRepository,
    WritingFeedbackRepository,
)
from app.schemas.exercise import ExerciseGenerationRequest
from app.schemas.vocabulary_ai import VocabularyCandidate
from app.services.ai_service import AIService
from app.services.exercise_generation_service import ExerciseGenerationService
from app.services.vocabulary_normalization import normalize_expression
from app.services.vocabulary_service import VocabularyService
from sqlalchemy import select
from tests.analytics_helpers import make_exercise
from tests.scripted_provider import ScriptedAIProvider


async def test_get_exercise_records_opened_event(client, session) -> None:
    exercise = await make_exercise(session)
    await session.commit()

    response = await client.get(f"/api/v1/exercises/{exercise.id}")
    assert response.status_code == 200

    events = (await session.execute(select(AnalyticsEvent))).scalars().all()
    assert len(events) == 1
    assert events[0].event_type == "exercise_opened"
    assert events[0].entity_id == exercise.id
    assert events[0].occurred_at is not None


async def test_generation_metadata_memory_context_used(session) -> None:
    from app.providers.ai.router import AIRouter

    router = AIRouter(default_provider="fake", max_retries=0, retry_backoff=0)
    router.register("fake", lambda: ScriptedAIProvider())
    service = ExerciseGenerationService(
        ai_service=AIService(ai_router=router),
        repository=ExerciseRepository(session),
    )

    with_memory = await service.generate(
        ExerciseGenerationRequest(topic="Work", jlpt_level="N3", difficulty=5),
        memory_block="Người học còn nhầm trợ từ は/が.",
    )
    assert with_memory.generation_metadata["memory_context_used"] is True

    await session.delete(with_memory)
    await session.commit()
    without_memory = await service.generate(
        ExerciseGenerationRequest(topic="Work", jlpt_level="N3", difficulty=5),
        memory_block="   ",
    )
    assert without_memory.generation_metadata["memory_context_used"] is False


async def test_first_used_at_set_on_first_user_answer_usage(session) -> None:
    exercise = await make_exercise(session)
    await session.flush()
    attempt = ExerciseAttempt(
        exercise_id=exercise.id,
        user_id=None,
        attempt_number=1,
        answer_text="ãƒ†ã‚¹ãƒˆã§ã™ã€‚",
        status=AttemptStatus.SUBMITTED,
    )
    session.add(attempt)
    await session.flush()
    entry = VocabularyEntry(
        expression="ç«‹ã¦è¾¼ã‚€",
        normalized_expression=normalize_expression("ç«‹ã¦è¾¼ã‚€"),
        reading="ãŸã¦ã“ã‚€",
        type=VocabularyType.WORD,
        meaning_vi="cÃ´ng viá»‡c bá»‹ dá»“n, ráº¥t báº­n",
        part_of_speech="å‹•è©ž",
        estimated_jlpt_level="N2",
        difficulty=7,
        register="business",
        usage_context="work",
        example_sentence="ä»Šæ—¥ã¯ä»•äº‹ãŒã‹ãªã‚Šç«‹ã¦è¾¼ã‚“ã§ã„ã¾ã™ã€‚",
        natural_alternatives=[],
        importance=7,
        confidence=VocabularyConfidence.HIGH,
        provenance={"provider": "fake", "model": "fake", "prompt_version": "v1"},
    )
    session.add(entry)
    await session.flush()

    service = VocabularyService(
        ai_service=AIService(),
        entry_repository=VocabularyEntryRepository(session),
        user_repository=UserVocabularyRepository(session),
        discovery_repository=VocabularyDiscoveryRepository(session),
        attempt_repository=ExerciseAttemptRepository(session),
        feedback_repository=WritingFeedbackRepository(session),
        exercise_repository=ExerciseRepository(session),
    )
    candidate = VocabularyCandidate(
        expression="ç«‹ã¦è¾¼ã‚€",
        reading="ãŸã¦ã“ã‚€",
        type="word",
        meaning_vi="cÃ´ng viá»‡c bá»‹ dá»“n, ráº¥t báº­n",
        part_of_speech="å‹•è©ž",
        estimated_jlpt_level="N2",
        difficulty=7,
        register="business",
        usage_context="work",
        example_sentence="ä»Šæ—¥ã¯ä»•äº‹ãŒã‹ãªã‚Šç«‹ã¦è¾¼ã‚“ã§ã„ã¾ã™ã€‚",
        natural_alternatives=[],
        learning_reason="CÃ¡ch diá»…n Ä‘áº¡t tá»± nhiÃªn trong cÃ´ng viá»‡c.",
        importance=7,
        confidence="high",
        source_type="user_answer",
        user_expression="ã¨ã¦ã‚‚å¿™ã—ã„",
    )
    await service._add_user_state(exercise, attempt, entry, candidate, is_new=True)
    await session.commit()

    state = await UserVocabularyRepository(session).get_by_entry(entry.id)
    assert state is not None
    assert state.first_used_at is not None
    assert state.used_count == 1

    await service._add_user_state(exercise, attempt, entry, candidate, is_new=False)
    await session.commit()
    state = await UserVocabularyRepository(session).get_by_entry(entry.id)
    assert state.used_count == 2
    assert state.first_used_at is not None
