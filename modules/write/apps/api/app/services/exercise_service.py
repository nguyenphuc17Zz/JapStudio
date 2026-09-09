from app.models import Exercise
from app.repositories import ExerciseRepository


class ExerciseService:
    """Owns exercise creation and attempt workflows (Phase 2+)."""

    def __init__(self, repository: ExerciseRepository) -> None:
        self._repository = repository

    async def get(self, exercise_id: str) -> Exercise | None:
        return await self._repository.get(exercise_id)
