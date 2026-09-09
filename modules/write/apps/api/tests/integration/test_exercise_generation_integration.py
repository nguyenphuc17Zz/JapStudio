"""Optional integration test: exercise generation through the real Ollama provider.

Skipped unless RUN_OLLAMA_INTEGRATION=true:
    RUN_OLLAMA_INTEGRATION=true pytest tests/integration -k exercise

Runs the full Phase 3 pipeline (planner -> generator -> validator ->
deduplication -> persistence) against a local Ollama server and verifies the
generated Vietnamese content is coherent.
"""

import os

import pytest
from app.core.config import Settings
from app.models import JlptLevel
from app.providers.ai.router import create_default_router
from app.repositories import ExerciseRepository
from app.services.ai_service import AIService
from app.services.exercise_generation_service import ExerciseGenerationService

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_OLLAMA_INTEGRATION") != "true",
    reason="set RUN_OLLAMA_INTEGRATION=true to run",
)


async def test_generate_exercise_with_ollama(session) -> None:
    settings = Settings(
        ai_exercise_generation_provider="ollama",
        ai_exercise_generation_model="aya-expanse:8b",
        ai_exercise_max_regeneration_attempts=1,
    )
    service = ExerciseGenerationService(
        ai_service=AIService(ai_router=create_default_router(settings)),
        repository=ExerciseRepository(session),
        settings=settings,
    )

    exercise = await service.generate()
    assert exercise.id
    assert exercise.prompt_vi
    assert exercise.context
    assert exercise.topic
    assert exercise.jlpt_level in JlptLevel
    assert 1 <= exercise.difficulty <= 10
    assert 1 <= exercise.grammar_complexity <= 10
    assert exercise.generation_metadata["provider"] == "ollama"
    assert exercise.generation_metadata["model"] == "aya-expanse:8b"
    assert exercise.generation_metadata["generation_version"] == "exercise_generation:v1"

    fetched = await ExerciseRepository(session).get(exercise.id)
    assert fetched is not None
    assert fetched.prompt_vi == exercise.prompt_vi
