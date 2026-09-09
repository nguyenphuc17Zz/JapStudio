"""Evaluation pipeline tests: quality cases, retries, consistency, state."""

import pytest
from app.core.config import Settings
from app.core.errors import EvaluationError
from app.models import Exercise
from app.providers.ai.fake import FakeAIProvider
from app.providers.ai.router import AIRouter
from app.repositories import (
    ExerciseAttemptRepository,
    ExerciseRepository,
    WritingFeedbackRepository,
)
from app.schemas.evaluation_ai import (
    GrammarVocabularyEvaluation,
    NaturalnessRegisterEvaluation,
    SemanticEvaluation,
)
from app.services.ai_service import AIService
from app.services.evaluation_service import EvaluationService

from conftest import exercise_factory
from scripted_provider import ScriptedAIProvider


def _semantic(**overrides) -> SemanticEvaluation:
    base = dict(
        classification="fully_equivalent",
        score=90,
        omissions=[],
        additions=[],
        meaning_changes=[],
        confidence="high",
    )
    base.update(overrides)
    return SemanticEvaluation(**base)


def _grammar_vocab(**overrides) -> GrammarVocabularyEvaluation:
    base = dict(grammar_score=90, vocabulary_score=90, issues=[], confidence="high")
    base.update(overrides)
    return GrammarVocabularyEvaluation(**base)


def _naturalness_register(**overrides) -> NaturalnessRegisterEvaluation:
    base = dict(
        naturalness_classification="natural",
        naturalness_score=90,
        context_fit_score=90,
        register_fit_score=90,
        issues=[],
        register_notes=None,
        confidence="high",
    )
    base.update(overrides)
    return NaturalnessRegisterEvaluation(**base)


def _issue(category: str, severity: str) -> dict:
    return {
        "category": category,
        "severity": severity,
        "original_text": "x",
        "explanation": "y",
        "suggested_fix": "z",
    }


def _service(
    session,
    provider,
    settings: Settings | None = None,
) -> EvaluationService:
    router = AIRouter(
        providers={
            "fake": lambda: provider,
            "failing": lambda: FakeAIProvider(fail_mode="invalid_structured"),
        },
        default_provider="fake",
        fallback_providers=["fake"],
        max_retries=0,
        retry_backoff=0.01,
    )
    resolved = settings or Settings()
    return EvaluationService(
        ai_service=AIService(ai_router=router),
        attempt_repository=ExerciseAttemptRepository(session),
        feedback_repository=WritingFeedbackRepository(session),
        settings=resolved,
    )


async def _seed_exercise(session, **overrides) -> Exercise:
    return await ExerciseRepository(session).add(Exercise(**exercise_factory(**overrides)))


async def _submit(service, exercise: Exercise, answer: str):
    attempt, feedback, evaluation = await service.submit(exercise, answer)
    return attempt, feedback, evaluation


class TestQualityCases:
    """Deterministic quality cases from the Phase 4 spec (section 34)."""

    async def test_case_a_correct_and_natural(self, session) -> None:
        exercise = await _seed_exercise(session)
        service = _service(session, ScriptedAIProvider())
        _, _, evaluation = await _submit(
            service, exercise, "今日は仕事が多くて、帰りが遅くなりそうです。"
        )
        assert evaluation.scores.semantic_score >= 85
        assert evaluation.scores.grammar_score >= 85
        assert evaluation.scores.naturalness_score >= 85

    async def test_case_b_correct_but_unnatural(self, session) -> None:
        exercise = await _seed_exercise(session)
        provider = ScriptedAIProvider(
            naturalness_registers=[
                _naturalness_register(
                    naturalness_classification="unnatural",
                    naturalness_score=40,
                    issues=[
                        _issue("naturalness", "minor"),
                    ],
                )
            ]
        )
        service = _service(session, provider)
        _, _, evaluation = await _submit(
            service, exercise, "今日は仕事が多すぎるので、私は多分遅く帰ります。"
        )
        assert evaluation.scores.grammar_score >= 85
        assert evaluation.scores.naturalness_score <= 60
        assert evaluation.naturalness_classification == "unnatural"

    async def test_case_c_natural_but_wrong_meaning(self, session) -> None:
        exercise = await _seed_exercise(session)
        provider = ScriptedAIProvider(
            semantics=[
                _semantic(
                    classification="meaning_changed",
                    score=20,
                    meaning_changes=["nói về việc về sớm thay vì về muộn"],
                )
            ]
        )
        service = _service(session, provider)
        _, _, evaluation = await _submit(
            service, exercise, "今日は仕事が少ないので、早く帰れます。"
        )
        assert evaluation.scores.semantic_score <= 50
        assert evaluation.scores.naturalness_score >= 85

    async def test_case_d_good_meaning_with_grammar_errors(self, session) -> None:
        exercise = await _seed_exercise(session)
        provider = ScriptedAIProvider(
            semantics=[_semantic(score=95)],
            grammar_vocabs=[
                _grammar_vocab(
                    grammar_score=55,
                    vocabulary_score=80,
                    issues=[_issue("grammar", "major")],
                )
            ],
        )
        service = _service(session, provider)
        _, _, evaluation = await _submit(
            service, exercise, "今日は仕事多いから、帰る遅くなる思う。"
        )
        assert evaluation.scores.semantic_score >= 85
        assert evaluation.scores.grammar_score <= 60
        assert any(issue.category == "grammar" for issue in evaluation.issues)

    async def test_case_e_correct_but_wrong_business_register(self, session) -> None:
        exercise = await _seed_exercise(session, register="business", topic="Meetings")
        provider = ScriptedAIProvider(
            naturalness_registers=[
                _naturalness_register(
                    naturalness_score=90,
                    register_fit_score=30,
                    issues=[
                        _issue("register", "major"),
                    ],
                    register_notes=(
                        "Câu trả lời đúng nghĩa nhưng quá suồng sã cho bối cảnh kinh doanh."
                    ),
                )
            ]
        )
        service = _service(session, provider)
        _, _, evaluation = await _submit(service, exercise, "ちょっと無理です。")
        assert evaluation.scores.semantic_score >= 85
        assert evaluation.scores.grammar_score >= 85
        assert evaluation.scores.register_fit_score <= 40
        assert any(issue.category == "register" for issue in evaluation.issues)

    async def test_case_f_alternative_valid_wording_not_penalized(self, session) -> None:
        exercise = await _seed_exercise(session)
        service = _service(session, ScriptedAIProvider())
        _, _, evaluation = await _submit(
            service,
            exercise,
            "今日は忙しいので、たぶん帰るのが遅くなります。",
        )
        assert evaluation.scores.semantic_score >= 85
        assert evaluation.scores.grammar_score >= 85
        assert evaluation.scores.naturalness_score >= 85
        assert evaluation.issues == []

    async def test_case_low_register_fit_without_explicit_issue_reconciled_successfully(
        self, session
    ) -> None:
        exercise = await _seed_exercise(session, register="business", topic="Challenge")
        provider = ScriptedAIProvider(
            naturalness_registers=[
                _naturalness_register(
                    naturalness_score=85,
                    register_fit_score=30,
                    issues=[],
                    register_notes="Câu trả lời dùng thể thông thường, cần dùng kính ngữ thương mại.",
                )
            ]
        )
        service = _service(session, provider)
        _, _, evaluation = await _submit(service, exercise, "今日は行けない。")
        assert evaluation.scores.register_fit_score == 30
        assert any(issue.category == "register" for issue in evaluation.issues)


class TestPersistence:
    async def test_submit_persists_attempt_and_feedback(self, session) -> None:
        exercise = await _seed_exercise(session)
        service = _service(session, ScriptedAIProvider())
        attempt, feedback, evaluation = await _submit(service, exercise, "今日は仕事が多いです。")
        assert attempt.attempt_number == 1
        assert attempt.answer_text == "今日は仕事が多いです。"
        assert attempt.status.value == "submitted"
        assert feedback.overall_score == evaluation.scores.overall_score
        assert feedback.semantic_score == evaluation.scores.semantic_score
        assert feedback.evaluation["scores"]["overall_score"] == evaluation.scores.overall_score
        metadata = feedback.evaluation_metadata
        assert metadata["evaluation_version"] == "writing_evaluation:v1"
        assert {stage["stage"] for stage in metadata["stages"]} == {
            "semantic",
            "grammar_vocabulary",
            "naturalness_register",
            "corrections",
            "hints",
        }
        assert metadata["stages"][0]["provider"] == "fake"

    async def test_attempts_are_immutable_and_numbered(self, session) -> None:
        exercise = await _seed_exercise(session)
        service = _service(session, ScriptedAIProvider())
        first, _, _ = await _submit(service, exercise, "第一回目の回答。")
        second, _, _ = await _submit(service, exercise, "第二回目の回答。")

        assert first.attempt_number == 1
        assert second.attempt_number == 2
        assert first.answer_text == "第一回目の回答。"
        assert first.id != second.id

        stored_first = await ExerciseAttemptRepository(session).get(first.id)
        assert stored_first is not None
        assert stored_first.answer_text == "第一回目の回答。"
        feedbacks = await WritingFeedbackRepository(session).list(limit=10)
        assert len(feedbacks) == 2

    async def test_malformed_structured_output_fails_after_retries(self, session) -> None:
        exercise = await _seed_exercise(session)
        service = _service(session, FakeAIProvider(fail_mode="invalid_structured"))
        with pytest.raises(EvaluationError) as excinfo:
            await _submit(service, exercise, "どんな答えでもいい。")
        assert "evaluation" in excinfo.value.message
        attempts = await ExerciseAttemptRepository(session).list()
        assert attempts == []

    async def test_contradictory_output_regenerated(self, session) -> None:
        exercise = await _seed_exercise(session)
        provider = ScriptedAIProvider(
            semantics=[
                _semantic(classification="meaning_changed", score=95),
            ]
        )
        service = _service(session, provider)
        attempt, feedback, evaluation = await _submit(
            service, exercise, "今日は仕事がたくさんあります。"
        )
        # First cycle contradicted itself; the fallback fake sample passed.
        assert attempt.attempt_number == 1
        assert feedback.evaluation["semantic_classification"] == "fully_equivalent"
        assert evaluation.scores.semantic_score == 90

    async def test_verifier_rejection_triggers_another_cycle(self, session) -> None:
        exercise = await _seed_exercise(session)
        settings = Settings(ai_exercise_evaluation_verification_enabled=True)
        from app.schemas.evaluation_ai import EvaluationVerificationResult

        provider = ScriptedAIProvider(
            verifications=[
                EvaluationVerificationResult(
                    accepted=False,
                    notes="semantic misclassified",
                )
            ]
        )
        service = _service(session, provider, settings=settings)
        _, _, evaluation = await _submit(service, exercise, "今日は仕事が多いです。")
        assert evaluation.scores.overall_score > 0

    async def test_provider_failure_retried_within_evaluation_policy(self, session) -> None:
        exercise = await _seed_exercise(session)
        provider = ScriptedAIProvider(fail_at=1)  # first structured call raises
        service = _service(session, provider)
        attempt, _, evaluation = await _submit(service, exercise, "今日は仕事が多いです。")
        assert attempt.attempt_number == 1
        assert evaluation.scores.overall_score > 0


class TestLearningModeState:
    async def test_hints_progress_and_exhaust(self, session) -> None:
        exercise = await _seed_exercise(session)
        service = _service(session, ScriptedAIProvider())
        attempt, _, _ = await _submit(service, exercise, "今日は仕事が多いです。")

        hint, revealed, total = await service.next_hint(attempt)
        assert hint == "Hãy kiểm tra trợ từ trong câu của bạn."
        assert revealed == 1
        assert total == 3

        hint2, revealed2, _ = await service.next_hint(attempt)
        assert hint2 != hint
        assert revealed2 == 2

        await service.next_hint(attempt)
        hint4, revealed4, _ = await service.next_hint(attempt)
        assert hint4 is None
        assert revealed4 == 3

    async def test_reveal_returns_corrections_and_is_idempotent(self, session) -> None:
        exercise = await _seed_exercise(session)
        service = _service(session, ScriptedAIProvider())
        attempt, _, _ = await _submit(service, exercise, "今日は仕事が多いです。")

        corrections = await service.reveal(attempt)
        assert corrections.correct_version
        assert corrections.natural_version
        assert corrections.native_version
        assert corrections.business_version
        assert attempt.revealed is True

        again = await service.reveal(attempt)
        assert again.correct_version == corrections.correct_version

    async def test_reveal_does_not_affect_hints(self, session) -> None:
        exercise = await _seed_exercise(session)
        service = _service(session, ScriptedAIProvider())
        attempt, _, _ = await _submit(service, exercise, "今日は仕事が多いです。")
        await service.reveal(attempt)
        hint, _, _ = await service.next_hint(attempt)
        assert hint is not None
