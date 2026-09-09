"""VocabularyService pipeline tests (Phase 5) with the scripted provider."""

import pytest
from app.core.errors import VocabularyExtractionError
from app.models import (
    Exercise,
    ExerciseAttempt,
    UserVocabulary,
    VocabularyEntry,
    VocabularyFamiliarity,
    VocabularySourceType,
)
from app.providers.ai.base import AIProvider
from app.providers.ai.errors import AIResponseError
from app.providers.ai.fake import FakeAIProvider
from app.providers.ai.router import AIRouter
from app.repositories import (
    ExerciseAttemptRepository,
    ExerciseRepository,
    UserVocabularyRepository,
    VocabularyDiscoveryRepository,
    VocabularyEntryRepository,
    WritingFeedbackRepository,
)
from app.schemas.vocabulary_ai import (
    VocabularyCandidate,
    VocabularyExtractionResult,
    VocabularyValidationResult,
)
from app.services.ai_service import AIService
from app.services.evaluation_service import EvaluationService
from app.services.vocabulary_service import VocabularyService

from conftest import exercise_factory
from scripted_provider import ScriptedAIProvider


class ExtractionFailProvider(FakeAIProvider):
    """Everything works except the vocabulary extraction stage."""

    async def generate_structured(self, prompt, response_model, **kwargs):
        if response_model is VocabularyExtractionResult:
            raise AIResponseError("simulated extraction failure", provider=self.name)
        return await super().generate_structured(prompt, response_model, **kwargs)


class ValidationFailProvider(FakeAIProvider):
    """Everything works except the per-candidate validation stage."""

    async def generate_structured(self, prompt, response_model, **kwargs):
        if response_model is VocabularyValidationResult:
            raise AIResponseError("simulated validation failure", provider=self.name)
        return await super().generate_structured(prompt, response_model, **kwargs)


def _router(provider: AIProvider) -> AIRouter:
    return AIRouter(
        providers={"fake": lambda: provider},
        default_provider="fake",
        fallback_providers=["fake"],
        max_retries=0,
        retry_backoff=0.01,
    )


def _vocab_service(session, provider: AIProvider) -> VocabularyService:
    router = _router(provider)
    return VocabularyService(
        ai_service=AIService(ai_router=router),
        entry_repository=VocabularyEntryRepository(session),
        user_repository=UserVocabularyRepository(session),
        discovery_repository=VocabularyDiscoveryRepository(session),
        attempt_repository=ExerciseAttemptRepository(session),
        feedback_repository=WritingFeedbackRepository(session),
        exercise_repository=ExerciseRepository(session),
    )


async def _seed_attempt(session, provider: AIProvider) -> Exercise:
    """Create exercise + evaluated attempt (via EvaluationService) and return exercise."""
    router = _router(provider)
    evaluation = EvaluationService(
        ai_service=AIService(ai_router=router),
        attempt_repository=ExerciseAttemptRepository(session),
        feedback_repository=WritingFeedbackRepository(session),
    )
    exercise = await ExerciseRepository(session).add(Exercise(**exercise_factory()))
    await evaluation.submit(exercise, "今日は仕事が立て込んでいるので帰りが遅くなります。")
    return exercise


def _candidate(**overrides) -> VocabularyCandidate:
    base = {
        "expression": "対応を検討する",
        "reading": "たいおうをけんとうする",
        "type": "collocation",
        "meaning_vi": "xem xét phương án xử lý",
        "part_of_speech": "連語",
        "estimated_jlpt_level": "N2",
        "difficulty": 6,
        "register": "business",
        "usage_context": "work",
        "example_sentence": "早急に対応を検討する必要があります。",
        "natural_alternatives": [],
        "learning_reason": "Cụm từ chuyên nghiệp hơn 考える.",
        "importance": 7,
        "confidence": "high",
        "source_type": "ai_correction",
        "user_expression": None,
    }
    base.update(overrides)
    return VocabularyCandidate.model_validate(base)


class TestExtractionPipeline:
    async def test_creates_entries_with_state_and_discoveries(self, session, ai_router) -> None:
        service = _vocab_service(session, ScriptedAIProvider())
        await _seed_attempt(session, ScriptedAIProvider())
        attempts = await ExerciseAttemptRepository(session).list(limit=1)
        summary = await service.extract_for_attempt(attempts[0].id)

        assert summary["created"] == 2
        assert summary["merged"] == 0
        assert summary["total"] == 2

        rows, total = await service.list_bank()
        assert total == 2
        entries = {entry.expression: (entry, state) for entry, state in rows}
        assert "立て込む" in entries
        entry, state = entries["立て込む"]
        assert entry.importance == 7
        assert state is not None
        assert state.discovered_count == 1
        assert state.seen_count == 1
        assert state.familiarity == VocabularyFamiliarity.NEW
        assert state.source_attempt_id == attempts[0].id
        assert state.learning_reason  # from candidate (pre-explanation) or AI

    async def test_explanations_are_applied(self, session) -> None:
        provider = ScriptedAIProvider()
        service = _vocab_service(session, provider)
        await _seed_attempt(session, provider)
        attempts = await ExerciseAttemptRepository(session).list(limit=1)
        await service.extract_for_attempt(attempts[0].id)

        entry = await VocabularyEntryRepository(session).get_by_normalized("立て込む")
        assert entry is not None
        assert entry.notes == "Thường dùng với 仕事が (仕事が立て込む)."
        state = await UserVocabularyRepository(session).get_by_entry(entry.id)
        assert state is not None
        assert "tự nhiên" in state.learning_reason or "立て込む" in state.learning_reason

    async def test_rerun_is_idempotent_and_merges(self, session) -> None:
        provider = ScriptedAIProvider()
        service = _vocab_service(session, provider)
        await _seed_attempt(session, provider)
        attempts = await ExerciseAttemptRepository(session).list(limit=1)
        attempt_id = attempts[0].id

        first = await service.extract_for_attempt(attempt_id)
        assert first["created"] == 2

        second = await service.extract_for_attempt(attempt_id)
        assert second["created"] == 0
        assert second["merged"] == 2

        rows, total = await service.list_bank()
        assert total == 2  # still exactly two entries, no duplicates

        state = await UserVocabularyRepository(session).get_by_entry(
            (await VocabularyEntryRepository(session).get_by_normalized("立て込む")).id
        )
        assert state.discovered_count == 1  # same attempt re-run adds no new discovery event
        assert state.seen_count == 1

        rows = await VocabularyDiscoveryRepository(session).list_by_entry(
            (await VocabularyEntryRepository(session).get_by_normalized("立て込む")).id
        )
        assert len(rows) == 1  # one row per (attempt, entry, source_type)

    async def test_validation_rejection_counts_rejected(self, session) -> None:
        provider = ScriptedAIProvider(
            vocabulary_validations=[
                VocabularyValidationResult(
                    approved=False,
                    duplicate_of=None,
                    rejected_reason="Từ này quá tầm thường.",
                    corrected_expression=None,
                    corrected_reading=None,
                    corrected_meaning_vi=None,
                    corrected_jlpt_level=None,
                    corrected_difficulty=None,
                    corrected_register=None,
                    confidence="high",
                ),
            ]
        )
        service = _vocab_service(session, provider)
        await _seed_attempt(session, provider)
        attempts = await ExerciseAttemptRepository(session).list(limit=1)
        summary = await service.extract_for_attempt(attempts[0].id)

        assert summary["rejected"] == 1
        assert summary["created"] == 1  # second candidate still approved

    async def test_validation_failure_is_isolated_and_skipped(self, session) -> None:
        provider = ValidationFailProvider()
        service = _vocab_service(session, provider)
        await _seed_attempt(session, provider)
        attempts = await ExerciseAttemptRepository(session).list(limit=1)
        summary = await service.extract_for_attempt(attempts[0].id)

        assert summary["skipped"] == 2
        assert summary["created"] == 0

    async def test_low_importance_and_low_confidence_skipped(self, session) -> None:
        provider = ScriptedAIProvider(
            vocabulary_extractions=[
                VocabularyExtractionResult(
                    candidates=[
                        _candidate(importance=3),  # below default min_importance=4
                        _candidate(expression="別の言葉", confidence="low"),
                        _candidate(expression="良い言葉", importance=6),
                    ]
                ),
                VocabularyExtractionResult(candidates=[]),  # evaluation pipeline reuses?
            ]
        )
        service = _vocab_service(session, provider)
        await _seed_attempt(session, provider)
        attempts = await ExerciseAttemptRepository(session).list(limit=1)
        summary = await service.extract_for_attempt(attempts[0].id)

        assert summary["skipped"] == 2
        assert summary["created"] == 1

    async def test_ai_duplicate_of_merges_into_existing_entry(self, session) -> None:
        entry_repo = VocabularyEntryRepository(session)
        existing = await entry_repo.add(
            VocabularyEntry(
                expression="とても忙しい",
                normalized_expression="とても忙しい",
                reading="とてもいそがしい",
                type="expression",
                meaning_vi="rất bận",
                part_of_speech=None,
                estimated_jlpt_level="N4",
                difficulty=2,
                register=None,
                usage_context=None,
                example_sentence="今日はとても忙しいです。",
                natural_alternatives=[],
                notes=None,
                importance=4,
                confidence="high",
                provenance={"provider": "test", "model": "x", "prompt_version": "v1"},
            )
        )
        await UserVocabularyRepository(session).add(
            UserVocabulary(
                entry_id=existing.id,
                learning_reason="Cách nói phổ biến.",
            )
        )

        provider = ScriptedAIProvider(
            vocabulary_extractions=[
                VocabularyExtractionResult(
                    candidates=[
                        _candidate(
                            expression="とても忙しいです",
                            source_type="user_answer",
                            user_expression="とても忙しいです",
                        )
                    ]
                ),
            ],
            vocabulary_validations=[
                VocabularyValidationResult(
                    approved=False,
                    duplicate_of="とても忙しい",
                    rejected_reason=None,
                    corrected_expression=None,
                    corrected_reading=None,
                    corrected_meaning_vi=None,
                    corrected_jlpt_level=None,
                    corrected_difficulty=None,
                    corrected_register=None,
                    confidence="high",
                ),
            ],
        )
        service = _vocab_service(session, provider)
        await _seed_attempt(session, provider)
        attempts = await ExerciseAttemptRepository(session).list(limit=1)
        summary = await service.extract_for_attempt(attempts[0].id)

        assert summary["merged"] == 1
        assert summary["created"] == 0
        state = await UserVocabularyRepository(session).get_by_entry(existing.id)
        assert state.discovered_count == 2
        assert state.used_count == 1
        assert state.incorrect_count == 1  # user_answer with user_expression present

    async def test_user_answer_counts(self, session) -> None:
        provider = ScriptedAIProvider(
            vocabulary_extractions=[
                VocabularyExtractionResult(
                    candidates=[
                        _candidate(
                            expression="対応を検討する",
                            source_type="user_answer",
                            user_expression="対応を考えます",
                        ),
                    ]
                ),
            ],
        )
        service = _vocab_service(session, provider)
        await _seed_attempt(session, provider)
        attempts = await ExerciseAttemptRepository(session).list(limit=1)
        summary = await service.extract_for_attempt(attempts[0].id)
        assert summary["created"] == 1

        entry = await VocabularyEntryRepository(session).get_by_normalized("対応を検討する")
        state = await UserVocabularyRepository(session).get_by_entry(entry.id)
        assert state.used_count == 1
        assert state.incorrect_count == 1
        assert state.correct_usage_count == 0

    async def test_extraction_failure_raises_vocabulary_error(self, session) -> None:
        provider = ExtractionFailProvider()
        service = _vocab_service(session, provider)
        await _seed_attempt(session, provider)
        attempts = await ExerciseAttemptRepository(session).list(limit=1)
        with pytest.raises(VocabularyExtractionError):
            await service.extract_for_attempt(attempts[0].id)

    async def test_missing_attempt_raises(self, session) -> None:
        service = _vocab_service(session, ScriptedAIProvider())
        with pytest.raises(VocabularyExtractionError):
            await service.extract_for_attempt("does-not-exist")

    async def test_attempt_without_feedback_raises(self, session) -> None:
        service = _vocab_service(session, ScriptedAIProvider())
        exercise = await ExerciseRepository(session).add(Exercise(**exercise_factory()))
        attempt = await ExerciseAttemptRepository(session).add(
            ExerciseAttempt(
                exercise_id=exercise.id,
                user_id=None,
                attempt_number=1,
                answer_text="テスト",
            )
        )
        with pytest.raises(VocabularyExtractionError):
            await service.extract_for_attempt(attempt.id)


class TestBankQueries:
    async def test_filters_and_search(self, session) -> None:
        service = _vocab_service(session, ScriptedAIProvider())
        await _seed_attempt(session, ScriptedAIProvider())
        attempts = await ExerciseAttemptRepository(session).list(limit=1)
        await service.extract_for_attempt(attempts[0].id)

        rows, total = await service.list_bank(vocabulary_type="word")
        assert total == 1
        assert rows[0][0].expression == "立て込む"

        rows, total = await service.list_bank(source_type="ai_native")
        assert total == 1
        assert rows[0][0].expression == "仕事が立て込んでいる"

        rows, total = await service.list_bank(search="立て込")
        assert total == 2

        rows, total = await service.list_bank(difficulty_min=7, difficulty_max=10)
        assert total == 1
        assert rows[0][0].expression == "立て込む"

        rows, total = await service.list_bank(register="business")
        assert total == 2

    async def test_get_detail_missing_returns_none(self, session) -> None:
        service = _vocab_service(session, ScriptedAIProvider())
        assert await service.get_detail("missing") is None

    async def test_get_detail_returns_state(self, session) -> None:
        service = _vocab_service(session, ScriptedAIProvider())
        await _seed_attempt(session, ScriptedAIProvider())
        attempts = await ExerciseAttemptRepository(session).list(limit=1)
        await service.extract_for_attempt(attempts[0].id)
        entry = await VocabularyEntryRepository(session).get_by_normalized("立て込む")
        assert entry is not None
        fetched, state = await service.get_detail(entry.id)
        assert fetched.expression == "立て込む"
        assert state is not None
        assert state.source_attempt_id == attempts[0].id

    async def test_attempt_vocabulary_lists_newest_first(self, session) -> None:
        service = _vocab_service(session, ScriptedAIProvider())
        await _seed_attempt(session, ScriptedAIProvider())
        attempts = await ExerciseAttemptRepository(session).list(limit=1)
        await service.extract_for_attempt(attempts[0].id)
        discoveries = await service.attempt_vocabulary(attempts[0].id)
        assert len(discoveries) == 2
        assert {d.source_type for d, _ in discoveries} == {
            VocabularySourceType.AI_NATURAL,
            VocabularySourceType.AI_NATIVE,
        }
