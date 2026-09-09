from app.repositories import ExerciseAttemptRepository, WritingFeedbackRepository


class WritingService:
    """Owns free-writing submission, evaluation and feedback flows (Phase 2+)."""

    def __init__(
        self,
        attempt_repository: ExerciseAttemptRepository,
        feedback_repository: WritingFeedbackRepository,
    ) -> None:
        self._attempts = attempt_repository
        self._feedback = feedback_repository
