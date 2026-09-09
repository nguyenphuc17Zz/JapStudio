"""Shared builders for Phase 10 simulation tests."""

from app.api.v1.gamification import build_gamification_service, build_profile_service
from app.core.config import Settings
from app.models import WritingScenario
from app.providers.ai.router import AIRouter
from app.repositories import (
    ChallengeAttemptRepository,
    ChallengeRepository,
    ExerciseAttemptRepository,
    ExerciseRepository,
    SimulationEvaluationRepository,
    SimulationSessionRepository,
    SimulationTurnRepository,
    UserVocabularyRepository,
    VocabularyDiscoveryRepository,
    VocabularyEntryRepository,
    WritingFeedbackRepository,
    WritingScenarioRepository,
)
from app.services.ai_service import AIService
from app.services.challenge_service import ChallengeService
from app.services.evaluation_service import EvaluationService
from app.services.simulation_service import SimulationService
from app.services.vocabulary_service import VocabularyService


def scenario_factory(**overrides: object) -> WritingScenario:
    base = WritingScenario(
        user_id=None,
        genre="business_email",
        medium="email",
        audience="manager",
        relationship="professional",
        purpose="report",
        register="business",
        tone="professional",
        target_length="paragraph",
        jlpt_level="N3",
        topic="Báo cáo tiến độ dự án đang bị trễ",
        situation_vi=(
            "Bạn là nhân viên trong công ty Nhật Bản. Dự án bạn phụ trách đang "
            "bị trễ tiến độ và sếp yêu cầu bạn trao đổi để thống nhất thời hạn mới."
        ),
        context_vi=(
            "Trò chuyện với đối tác để thống nhất thời hạn bàn giao mới. "
            "Nêu rõ lý do trễ và đề xuất phương án."
        ),
        required_points=[
            {"id": "rp1", "description": "Nêu lý do dự án bị trễ."},
            {"id": "rp2", "description": "Đề xuất thời hạn bàn giao mới."},
            {"id": "rp3", "description": "Chốt thỏa thuận với đối tác."},
        ],
        optional_points=["Xin lỗi vì sự chậm trễ"],
        forbidden_patterns=["Dùng ngôn ngữ suồng sã, thiếu kính ngữ"],
        difficulty=5,
        difficulty_metadata={"grammar": 5, "vocabulary": 5, "context": 5, "naturalness": 5},
        status="generated",
    )
    for key, value in overrides.items():
        setattr(base, key, value)
    return base


def build_simulation_service(
    session,
    provider,
    settings: Settings | None = None,
    *,
    with_vocabulary: bool = True,
    with_gamification: bool = True,
    with_challenges: bool = True,
) -> SimulationService:
    settings = settings or Settings()
    router = AIRouter(
        providers={"fake": lambda: provider},
        default_provider="fake",
        fallback_providers=["fake"],
        max_retries=0,
        retry_backoff=0.01,
    )
    ai_service = AIService(ai_router=router)
    profile_service = build_profile_service(session, settings)
    challenge_service = None
    if with_challenges:
        challenge_service = ChallengeService(
            challenge_repository=ChallengeRepository(session),
            challenge_attempt_repository=ChallengeAttemptRepository(session),
            exercise_repository=ExerciseRepository(session),
            attempt_repository=ExerciseAttemptRepository(session),
            feedback_repository=WritingFeedbackRepository(session),
            vocabulary_repository=UserVocabularyRepository(session),
            profile_service=profile_service,
            gamification=(
                build_gamification_service(session, settings) if with_gamification else None
            ),
            ai_service=ai_service,
            settings=settings,
        )
    return SimulationService(
        evaluation_service=EvaluationService(
            ai_service=ai_service,
            attempt_repository=ExerciseAttemptRepository(session),
            feedback_repository=WritingFeedbackRepository(session),
            settings=settings,
        ),
        ai_service=ai_service,
        scenario_repository=WritingScenarioRepository(session),
        session_repository=SimulationSessionRepository(session),
        turn_repository=SimulationTurnRepository(session),
        evaluation_repository=SimulationEvaluationRepository(session),
        exercise_repository=ExerciseRepository(session),
        attempt_repository=ExerciseAttemptRepository(session),
        vocabulary_service=(
            VocabularyService(
                ai_service=ai_service,
                entry_repository=VocabularyEntryRepository(session),
                user_repository=UserVocabularyRepository(session),
                discovery_repository=VocabularyDiscoveryRepository(session),
                attempt_repository=ExerciseAttemptRepository(session),
                feedback_repository=WritingFeedbackRepository(session),
                exercise_repository=ExerciseRepository(session),
                settings=settings,
            )
            if with_vocabulary
            else None
        ),
        gamification_service=(
            build_gamification_service(session, settings) if with_gamification else None
        ),
        challenge_service=challenge_service,
        settings=settings,
    )
