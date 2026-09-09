import pytest
from app.core.config import Settings
from app.core.errors import ExerciseDuplicateError, ExerciseGenerationError
from app.models import ExerciseStatus, ExerciseType
from app.providers.ai.errors import AITimeoutError
from app.providers.ai.fake import FakeAIProvider
from app.providers.ai.router import AIRouter
from app.repositories import ExerciseRepository
from app.schemas.exercise import ExerciseGenerationRequest
from app.services.ai_service import AIService
from app.services.exercise_generation_service import ExerciseGenerationService
from tests.scripted_provider import (
    ScriptedAIProvider,
    default_draft,
    default_validation,
)


def _router(provider, *, retries: int = 0, fallbacks: list[str] | None = None) -> AIRouter:
    router = AIRouter(
        default_provider="fake", max_retries=retries, retry_backoff=0, fallback_providers=fallbacks
    )
    router.register("fake", lambda: provider)
    return router


def _service(
    session, provider, router: AIRouter | None = None, settings: Settings | None = None
) -> ExerciseGenerationService:
    return ExerciseGenerationService(
        ai_service=AIService(ai_router=router or _router(provider)),
        repository=ExerciseRepository(session),
        settings=settings or Settings(ai_exercise_max_regeneration_attempts=1),
    )


async def test_generates_and_persists_exercise(session) -> None:
    provider = ScriptedAIProvider()
    service = _service(session, provider)
    exercise = await service.generate()

    assert exercise.id
    assert exercise.exercise_type == ExerciseType.SENTENCE_TRANSLATION
    assert exercise.topic == "Work"
    assert exercise.subtopic == "Overtime"
    assert exercise.register.value == "casual"
    assert exercise.jlpt_level.value == "N3"
    assert exercise.difficulty == 6
    assert exercise.target_length.value == "sentence"
    assert exercise.prompt_vi == default_draft().prompt_vi
    assert exercise.status == ExerciseStatus.PENDING
    assert 1 <= exercise.grammar_complexity <= 10

    metadata = exercise.generation_metadata
    assert metadata["provider"] == "fake"
    assert metadata["model"] == "fake-model"
    assert metadata["generation_version"] == "exercise_generation:v1"
    assert metadata["prompt_version"] == "exercise_generator:v1"
    assert metadata["regeneration_attempts"] == 0
    assert "generation_timestamp" in metadata

    fetched = await ExerciseRepository(session).get(exercise.id)
    assert fetched is not None
    assert fetched.prompt_vi == exercise.prompt_vi


async def test_generate_accepts_preferences(session) -> None:
    provider = ScriptedAIProvider()
    service = _service(session, provider)
    exercise = await service.generate(
        ExerciseGenerationRequest(
            exercise_type="free_writing",
            register="business",
            jlpt_level="N2",
            difficulty=6,
            target_length="sentence",
        )
    )
    assert exercise.id
    assert provider.structured_calls == 3


async def test_validator_rejection_triggers_regeneration(session) -> None:
    provider = ScriptedAIProvider(validations=[default_validation(False), default_validation(True)])
    service = _service(
        session, provider, settings=Settings(ai_exercise_max_regeneration_attempts=2)
    )
    exercise = await service.generate()

    assert provider.structured_calls == 5  # plan + draft + invalid + draft + valid
    assert exercise.generation_metadata["regeneration_attempts"] == 1


async def test_always_invalid_raises(session) -> None:
    provider = ScriptedAIProvider(
        validations=[default_validation(False)], fallback_validation=default_validation(False)
    )
    service = _service(session, provider)
    with pytest.raises(ExerciseGenerationError):
        await service.generate()


async def test_cross_consistency_rejects_and_regenerates(session) -> None:
    inconsistent = default_draft()
    inconsistent.grammar_complexity = 10
    inconsistent.vocabulary_complexity = 10
    inconsistent.context_complexity = 10
    inconsistent.naturalness_target = 10
    provider = ScriptedAIProvider(drafts=[inconsistent, default_draft()])
    service = _service(session, provider)
    exercise = await service.generate()

    assert exercise.difficulty == 6
    assert exercise.generation_metadata["regeneration_attempts"] == 1


async def test_malformed_ai_output_raises(session) -> None:
    provider = ScriptedAIProvider(fail_at=2)
    service = _service(session, provider)
    with pytest.raises(ExerciseGenerationError) as excinfo:
        await service.generate()
    assert "invalid structured" in str(excinfo.value)


async def test_invalid_structured_fail_mode_raises(session) -> None:
    service = _service(session, FakeAIProvider(fail_mode="invalid_structured"))
    with pytest.raises(ExerciseGenerationError):
        await service.generate()


async def test_provider_unavailable_raises(session) -> None:
    service = _service(session, FakeAIProvider(fail_mode="unavailable"))
    with pytest.raises(ExerciseGenerationError):
        await service.generate()


async def test_retry_after_transient_error(session) -> None:
    provider = ScriptedAIProvider(
        fail_at=1, fail_error=AITimeoutError("Simulated timeout", provider="fake")
    )
    service = _service(session, provider, router=_router(provider, retries=1))
    exercise = await service.generate()

    assert provider.structured_calls == 4  # failed plan + retried plan + draft + validation
    assert exercise.id


async def test_fallback_through_gateway(session) -> None:
    router = AIRouter(
        default_provider="failing",
        max_retries=0,
        retry_backoff=0,
        fallback_providers=["fake"],
    )
    router.register("failing", lambda: FakeAIProvider(fail_mode="unavailable"))
    scripted = ScriptedAIProvider()
    router.register("fake", lambda: scripted)
    service = _service(session, scripted, router=router)

    exercise = await service.generate()
    assert exercise.generation_metadata["provider"] == "fake"


async def test_duplicate_triggers_409_error(session) -> None:
    first = ScriptedAIProvider()
    await _service(session, first).generate()

    second = ScriptedAIProvider()
    service = _service(session, second)
    with pytest.raises(ExerciseDuplicateError):
        await service.generate()


async def test_duplicate_then_unique_succeeds(session) -> None:
    await _service(session, ScriptedAIProvider()).generate()

    unique = default_draft()
    unique.prompt_vi = "Cuối tuần tụi mình đi biển chơi nha, trời đang đẹp lắm."
    provider = ScriptedAIProvider(drafts=[default_draft(), unique])
    service = _service(session, provider)
    exercise = await service.generate()

    assert exercise.prompt_vi == unique.prompt_vi
    assert exercise.generation_metadata["regeneration_attempts"] == 1
