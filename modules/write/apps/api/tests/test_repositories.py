import pytest
from app.models import (
    AttemptStatus,
    Exercise,
    ExerciseAttempt,
    ExerciseStatus,
    ExerciseType,
    JlptLevel,
    LearnerProfile,
    Register,
    TargetLength,
    User,
    UserVocabulary,
    VocabularyConfidence,
    VocabularyDiscovery,
    VocabularyEntry,
    VocabularySourceType,
    VocabularyType,
)
from app.repositories import (
    ExerciseAttemptRepository,
    ExerciseRepository,
    LearnerProfileRepository,
    UserRepository,
    UserVocabularyRepository,
    VocabularyDiscoveryRepository,
    VocabularyEntryRepository,
)
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError


async def test_user_repository_crud(session) -> None:
    repository = UserRepository(session)
    created = await repository.add(User(email="tester@example.com", display_name="Tester"))
    assert created.id
    assert created.is_active is True

    fetched = await repository.get(created.id)
    assert fetched is not None
    assert fetched.email == "tester@example.com"

    fetched.email = "updated@example.com"
    await repository.update(fetched)
    refreshed = await repository.get(created.id)
    assert refreshed is not None
    assert refreshed.email == "updated@example.com"

    assert await repository.count() == 1
    await repository.delete(refreshed)
    assert await repository.get(created.id) is None
    assert await repository.count() == 0


async def test_user_email_is_unique(session) -> None:
    repository = UserRepository(session)
    await repository.add(User(email="duplicate@example.com", display_name="First"))
    session.add(User(email="duplicate@example.com", display_name="Second"))
    with pytest.raises(IntegrityError):
        await session.commit()


async def test_exercise_repository_with_attempt(session) -> None:
    user = await UserRepository(session).add(
        User(email="exercise@example.com", display_name="Exerciser")
    )
    exercise_repository = ExerciseRepository(session)
    exercise = await exercise_repository.add(
        Exercise(
            user_id=user.id,
            exercise_type=ExerciseType.SENTENCE_TRANSLATION,
            topic="Work",
            subtopic="Overtime",
            context="Một ngày làm việc khá bận rộn.",
            prompt_vi="Hôm nay nhiều việc quá nên chắc tui sẽ về muộn.",
            prompt_vi_hash="a" * 64,
            target_length=TargetLength.SENTENCE,
            register=Register.CASUAL,
            jlpt_level=JlptLevel.N3,
            difficulty=5,
            grammar_complexity=4,
            vocabulary_complexity=5,
            context_complexity=6,
            naturalness_target=7,
        )
    )
    assert exercise.status == ExerciseStatus.PENDING

    attempt_repository = ExerciseAttemptRepository(session)
    attempt = await attempt_repository.add(
        ExerciseAttempt(
            exercise_id=exercise.id,
            user_id=user.id,
            attempt_number=1,
            answer_text="こんにちは、私はナムです。",
        )
    )
    assert attempt.status == AttemptStatus.SUBMITTED

    fetched = await exercise_repository.get(exercise.id)
    assert fetched is not None
    assert fetched.prompt_vi == "Hôm nay nhiều việc quá nên chắc tui sẽ về muộn."
    attempt_ids = (await session.scalars(select(ExerciseAttempt.id))).all()
    assert attempt.id in attempt_ids


async def test_vocabulary_entry_repository(session) -> None:
    entry = await VocabularyEntryRepository(session).add(
        VocabularyEntry(
            expression="立て込む",
            normalized_expression="立て込む",
            reading="たてこむ",
            type=VocabularyType.WORD,
            meaning_vi="quá bận rộn, kín lịch",
            part_of_speech="Động từ",
            estimated_jlpt_level="N2",
            difficulty=3,
            register="casual",
            usage_context="nói về lịch trình, công việc",
            example_sentence="今週は仕事が立て込んでいます。",
            natural_alternatives=["とても忙しい"],
            notes="",
            importance=7,
            confidence=VocabularyConfidence.HIGH,
            provenance={"provider": "fake", "model": "test", "prompt_version": "v1"},
        )
    )
    assert entry.id

    repository = VocabularyEntryRepository(session)
    by_normalized = await repository.get_by_normalized("立て込む")
    assert by_normalized is not None
    assert by_normalized.id == entry.id
    expressions = await repository.list_expressions(limit=10)
    assert "立て込む" in expressions
    rows, total = await repository.list_bank(search="立て込む", skip=0, limit=10)
    assert total == 1
    assert rows[0][0].id == entry.id


async def test_user_vocabulary_and_discovery_repositories(session) -> None:
    user = await UserRepository(session).add(
        User(email="vocab@example.com", display_name="Vocab Learner")
    )
    entry = await VocabularyEntryRepository(session).add(
        VocabularyEntry(
            expression="仕事が立て込んでいる",
            normalized_expression="仕事が立て込んでいる",
            reading="しごとがたてこんでいる",
            type=VocabularyType.EXPRESSION,
            meaning_vi="công việc quá tải, bận rộn",
            part_of_speech="Cụm từ",
            estimated_jlpt_level="N2",
            difficulty=4,
            register="polite",
            usage_context="công việc",
            example_sentence="今週は仕事が立て込んでいるので残業します。",
            natural_alternatives=["とても忙しい"],
            notes="",
            importance=6,
            confidence=VocabularyConfidence.MEDIUM,
            provenance={"provider": "fake", "model": "test", "prompt_version": "v1"},
        )
    )
    state = await UserVocabularyRepository(session).add(
        UserVocabulary(
            entry_id=entry.id,
            source_attempt_id=None,
            source_exercise_id=None,
            learning_reason="Người bản xứ hay dùng hơn 'rất bận'.",
        )
    )
    assert state.id
    fetched = await UserVocabularyRepository(session).get_by_entry(entry.id)
    assert fetched is not None
    assert fetched.learning_reason.startswith("Người bản xứ")

    exercise = await ExerciseRepository(session).add(
        Exercise(
            user_id=user.id,
            exercise_type=ExerciseType.SENTENCE_TRANSLATION,
            topic="Work",
            context="Một ngày làm việc khá bận rộn.",
            prompt_vi="Hôm nay nhiều việc quá nên chắc tui sẽ về muộn.",
            prompt_vi_hash="c" * 64,
            target_length=TargetLength.SENTENCE,
            register=Register.CASUAL,
            jlpt_level=JlptLevel.N3,
            difficulty=5,
            grammar_complexity=4,
            vocabulary_complexity=5,
            context_complexity=6,
            naturalness_target=7,
        )
    )
    attempt = await ExerciseAttemptRepository(session).add(
        ExerciseAttempt(
            exercise_id=exercise.id,
            user_id=user.id,
            attempt_number=1,
            answer_text="今週は仕事が立て込んでいる。",
        )
    )
    discovery = await VocabularyDiscoveryRepository(session).add(
        VocabularyDiscovery(
            entry_id=entry.id,
            attempt_id=attempt.id,
            exercise_id=exercise.id,
            source_type=VocabularySourceType.AI_NATIVE,
            learning_reason="Người bản xứ hay dùng hơn 'rất bận'.",
            provenance={"provider": "fake", "model": "test", "prompt_version": "v1"},
        )
    )
    assert discovery.id
    by_attempt = await VocabularyDiscoveryRepository(session).list_by_attempt(attempt.id)
    assert len(by_attempt) == 1
    assert by_attempt[0][0].id == discovery.id
    by_entry = await VocabularyDiscoveryRepository(session).list_by_entry(entry.id)
    assert len(by_entry) == 1
    assert by_entry[0][0].id == discovery.id

    profile = await LearnerProfileRepository(session).add(
        LearnerProfile(user_id=user.id, native_language="vi", target_level="jlpt_n5")
    )
    assert profile.native_language == "vi"

    loaded_profile = await LearnerProfileRepository(session).get(profile.id)
    assert loaded_profile is not None
    assert loaded_profile.user_id == user.id
