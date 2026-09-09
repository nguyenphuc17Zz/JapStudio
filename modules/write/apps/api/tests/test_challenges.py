"""Challenge tests (Phase 7): deterministic type selection, generation
(fallback templates + AI content), evaluation reuse, per-type success
criteria and one-time challenge XP."""

from app.core.config import Settings
from app.models import ExerciseType, Register
from app.repositories import (
    ChallengeAttemptRepository,
    ChallengeRepository,
    ExerciseAttemptRepository,
    ExerciseRepository,
    UserVocabularyRepository,
    WritingFeedbackRepository,
)
from app.schemas.evaluation_ai import NaturalnessRegisterEvaluation
from app.schemas.gamification_ai import ChallengeGenerationResult
from app.services.ai_service import AIService
from app.services.challenge_service import ChallengeService
from app.services.learner_profile_service import LearnerProfileService

from gamification_helpers import build_gamification_service, build_profile_service
from scripted_provider import ScriptedAIProvider


def _challenge_result(**overrides) -> ChallengeGenerationResult:
    base = {
        "type": "naturalness",
        "instruction_vi": "Hãy viết lại câu này tự nhiên hơn.",
        "source_text": "今日はとても忙しいです。",
        "target_skill": "naturalness",
        "difficulty": 5,
        "objective": "Câu viết lại tự nhiên, giữ nguyên ý nghĩa.",
        "required_expression": None,
    }
    base.update(overrides)
    return ChallengeGenerationResult(**base)


def _ai(provider: ScriptedAIProvider | None, settings: Settings | None) -> AIService:
    from app.providers.ai.router import AIRouter

    router = AIRouter(
        providers={"fake": lambda: provider or ScriptedAIProvider()},
        default_provider="fake",
        fallback_providers=[],
    )
    return AIService(ai_router=router, settings=settings)


def _build_service(session, provider=None, settings=None) -> ChallengeService:
    return ChallengeService(
        challenge_repository=ChallengeRepository(session),
        challenge_attempt_repository=ChallengeAttemptRepository(session),
        exercise_repository=ExerciseRepository(session),
        attempt_repository=ExerciseAttemptRepository(session),
        feedback_repository=WritingFeedbackRepository(session),
        vocabulary_repository=UserVocabularyRepository(session),
        profile_service=build_profile_service(session, provider, settings),
        gamification=build_gamification_service(session, provider, settings),
        ai_service=_ai(provider, settings),
        settings=settings,
    )


async def _set_weaknesses(session, weaknesses: list[str]) -> None:
    service: LearnerProfileService = build_profile_service(session)
    profile = await service.get_or_create(None)
    profile.adaptive_state = {"skills": {}, "weaknesses": weaknesses}
    await service._repository.update(profile)


async def test_select_type_prefers_weakness(session) -> None:
    service = _build_service(session)
    assert service._select_type({"weaknesses": ["độ tự nhiên chưa tốt"]}, []) == "naturalness"
    assert service._select_type({"weaknesses": ["từ vựng hạn chế"]}, []) == "vocabulary"
    assert service._select_type({"weaknesses": ["ngữ pháp yếu"]}, []) == "error_fix"
    assert service._select_type({"weaknesses": ["phong cách chưa phù hợp"]}, []) == "register"


async def test_select_type_rotates_away_from_recent(session) -> None:
    service = _build_service(session)
    assert service._select_type({"weaknesses": []}, []) == "naturalness"
    assert service._select_type({"weaknesses": []}, ["naturalness"]) == "register"


async def test_generate_uses_fallback_templates_without_ai(session) -> None:
    service = _build_service(session, provider=ScriptedAIProvider(fail_at=2))
    challenge = await service.generate(None)
    assert challenge.provider == "fallback"
    assert challenge.model == "deterministic"
    assert challenge.challenge_type == "naturalness"
    assert challenge.status == "active"
    assert challenge.source_text
    assert challenge.instruction_vi
    exercise = await ExerciseRepository(session).get(challenge.exercise_id)
    assert exercise is not None
    assert exercise.exercise_type == ExerciseType.FREE_WRITING
    assert exercise.generation_metadata["source"] == "challenge"


async def test_generate_register_challenge_uses_business_register(session) -> None:
    await _set_weaknesses(session, ["phong cách chưa phù hợp"])
    service = _build_service(
        session,
        provider=ScriptedAIProvider(challenge_generations=[_challenge_result(type="register")]),
    )
    challenge = await service.generate(None)
    assert challenge.challenge_type == "register"
    assert challenge.target_skill == "register_fit"
    exercise = await ExerciseRepository(session).get(challenge.exercise_id)
    assert exercise.register == Register.BUSINESS


async def test_generate_uses_and_validates_ai_content(session) -> None:
    provider = ScriptedAIProvider(
        challenge_generations=[
            _challenge_result(
                source_text="今週は忙しくて疲れました。",
                instruction_vi="Hãy viết lại tự nhiên hơn.",
                difficulty=10,
            )
        ]
    )
    service = _build_service(session, provider=provider)
    challenge = await service.generate(None)
    assert challenge.source_text == "今週は忙しくて疲れました。"
    assert challenge.difficulty == 10
    assert challenge.provider != "fallback"


async def test_submit_attempt_success_awards_xp_once(session) -> None:
    service = _build_service(session)
    challenge = await service.generate(None)
    result = await service.submit_attempt(
        None, challenge, "今日はとても忙しいので、夜ご飯を食べる時間がありません。"
    )
    assert result["success"] is True
    assert result["score"] > 0
    assert result["xp_awarded"] == 15
    challenge = await ChallengeRepository(session).get(challenge.id)
    assert challenge.status == "completed"

    result2 = await service.submit_attempt(None, challenge, "今日はとても忙しいです。")
    assert result2["success"] is True
    assert result2["xp_awarded"] == 0
    rows = await ChallengeAttemptRepository(session).list_by_challenge(challenge.id)
    assert len(rows) == 2


async def test_submit_attempt_failure_on_low_naturalness(session) -> None:
    provider = ScriptedAIProvider(
        naturalness_registers=[
            NaturalnessRegisterEvaluation(
                naturalness_classification="slightly_unnatural",
                naturalness_score=70,
                context_fit_score=70,
                register_fit_score=80,
                issues=[],
                register_notes=None,
                confidence="medium",
            )
        ]
    )
    service = _build_service(session, provider=provider)
    challenge = await service.generate(None)
    result = await service.submit_attempt(None, challenge, "今日はとても忙しいです。")
    assert result["success"] is False
    assert result["xp_awarded"] == 0
    challenge = await ChallengeRepository(session).get(challenge.id)
    assert challenge.status == "active"


async def test_vocabulary_challenge_requires_expression(session) -> None:
    await _set_weaknesses(session, ["từ vựng hạn chế"])
    provider = ScriptedAIProvider(
        challenge_generations=[
            _challenge_result(
                type="vocabulary",
                required_expression="立て込む",
                source_text="立て込む",
            )
        ]
    )
    service = _build_service(session, provider=provider)
    challenge = await service.generate(None)
    assert challenge.required_expression == "立て込む"
    passed = await service.submit_attempt(
        None, challenge, "今日は仕事が立て込んでいるので、帰りが遅くなります。"
    )
    assert passed["success"] is True
    failed = await service.submit_attempt(None, challenge, "今日は仕事が多くて忙しいです。")
    assert failed["success"] is False


def test_success_criteria_are_deterministic(session) -> None:
    service = _build_service(session)
    scores = {
        "naturalness": 90,
        "register_fit": 90,
        "vocabulary": 90,
        "semantic": 90,
        "grammar": 90,
    }
    assert service._success("naturalness", {"naturalness": 80}, "x", None, "s") is True
    assert service._success("naturalness", {"naturalness": 79}, "x", None, "s") is False
    assert service._success("register", scores, "x", None, "s") is True
    assert service._success("vocabulary", scores, "x", None, "s") is True
    assert service._success("vocabulary", scores, "x", "立て込む", "s") is False
    assert service._success("vocabulary", scores, "立て込むを使う", "立て込む", "s") is True
    assert service._success("compression", scores, "短い", None, "とても長い元の文です。") is True
    assert (
        service._success("compression", scores, "とても長い回答で元の文より長い", None, "短い")
        is False
    )
    assert service._success("expansion", scores, "長い回答", None, "短い") is True
    assert service._success("nuance", scores, "x", None, "s") is True
    assert service._success("error_fix", scores, "x", None, "s") is True
    assert service._success("unknown", {"overall": 90}, "x", None, "s") is True
