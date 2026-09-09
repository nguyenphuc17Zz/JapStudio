from app.models import Exercise, ExerciseType, JlptLevel, Register, TargetLength, User
from app.repositories import (
    ExerciseAttemptRepository,
    ExerciseRepository,
    LearnerProfileRepository,
    UserRepository,
    UserVocabularyRepository,
    VocabularyDiscoveryRepository,
    VocabularyEntryRepository,
    WritingFeedbackRepository,
)
from app.services.ai_service import AIService
from app.services.exercise_service import ExerciseService
from app.services.learner_evidence import LearnerEvidenceService
from app.services.learner_profile_service import LearnerProfileService
from app.services.vocabulary_service import VocabularyService
from app.services.writing_service import WritingService


async def test_exercise_service_get_missing(session) -> None:
    service = ExerciseService(ExerciseRepository(session))
    assert await service.get("does-not-exist") is None


async def test_exercise_service_get_existing(session) -> None:
    user = await UserRepository(session).add(User(email="svc@example.com", display_name="Svc"))
    exercise = await ExerciseRepository(session).add(
        Exercise(
            user_id=user.id,
            exercise_type=ExerciseType.FREE_WRITING,
            topic="Hobbies",
            context="Một buổi chiều rảnh rỗi.",
            prompt_vi="Hãy viết về sở thích của bạn.",
            prompt_vi_hash="b" * 64,
            target_length=TargetLength.PARAGRAPH,
            register=Register.POLITE,
            jlpt_level=JlptLevel.N4,
            difficulty=4,
            grammar_complexity=4,
            vocabulary_complexity=4,
            context_complexity=4,
            naturalness_target=5,
        )
    )
    service = ExerciseService(ExerciseRepository(session))
    fetched = await service.get(exercise.id)
    assert fetched is not None
    assert fetched.prompt_vi == "Hãy viết về sở thích của bạn."


async def test_vocabulary_service_constructs(session) -> None:
    service = VocabularyService(
        ai_service=AIService(),
        entry_repository=VocabularyEntryRepository(session),
        user_repository=UserVocabularyRepository(session),
        discovery_repository=VocabularyDiscoveryRepository(session),
        attempt_repository=ExerciseAttemptRepository(session),
        feedback_repository=WritingFeedbackRepository(session),
        exercise_repository=ExerciseRepository(session),
    )
    assert await service.get_detail("missing") is None


async def test_services_construct_with_repositories(session) -> None:
    assert WritingService(ExerciseAttemptRepository(session), WritingFeedbackRepository(session))
    assert LearnerProfileService(
        repository=LearnerProfileRepository(session),
        evidence_service=LearnerEvidenceService(ExerciseAttemptRepository(session)),
        ai_service=AIService(),
    )
