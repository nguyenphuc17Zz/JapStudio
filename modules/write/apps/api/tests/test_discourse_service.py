"""Discourse service tests: score math, pipeline, failure isolation,
compare, hints/reveal, coach and the consistency validator."""

import pytest
from app.core.config import Settings
from app.core.errors import EvaluationError
from app.models import Exercise
from app.providers.ai.fake import FakeAIProvider
from app.providers.ai.router import AIRouter
from app.repositories import (
    DiscourseEvaluationRepository,
    DiscourseIssueRepository,
    ExerciseAttemptRepository,
    ExerciseRepository,
    WritingFeedbackRepository,
    WritingRevisionRepository,
    WritingSubmissionRepository,
)
from app.schemas.discourse_ai import DiscourseAnalysisResult
from app.schemas.evaluation_ai import (
    GrammarVocabularyEvaluation,
    NaturalnessRegisterEvaluation,
    SemanticEvaluation,
)
from app.services.ai_service import AIService
from app.services.discourse_consistency import (
    COHERENCE_SCORE_BANDS,
    DiscourseConsistencyError,
    DiscourseConsistencyValidator,
)
from app.services.discourse_service import DiscourseService
from app.services.evaluation_service import EvaluationService

from conftest import exercise_factory
from scripted_provider import ScriptedAIProvider

TWO_SENTENCES = "今日は仕事がとても忙しかったです。だから、帰りが遅くなりました。"


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


def _analysis(**overrides) -> DiscourseAnalysisResult:
    base = dict(
        coherence_score=90,
        coherence_classification="excellent",
        topic_consistency_classification="consistent",
        cohesion_score=85,
        flow_score=85,
        organization_score=85,
        redundancy_score=88,
        structure_reorder_advice=None,
        issues=[],
    )
    base.update(overrides)
    return DiscourseAnalysisResult(**base)


def _service(
    session,
    provider,
    settings: Settings | None = None,
) -> DiscourseService:
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
    ai_service = AIService(ai_router=router)
    evaluation_service = EvaluationService(
        ai_service=ai_service,
        attempt_repository=ExerciseAttemptRepository(session),
        feedback_repository=WritingFeedbackRepository(session),
        settings=resolved,
    )
    return DiscourseService(
        evaluation_service=evaluation_service,
        ai_service=ai_service,
        submission_repository=WritingSubmissionRepository(session),
        revision_repository=WritingRevisionRepository(session),
        evaluation_repository=DiscourseEvaluationRepository(session),
        issue_repository=DiscourseIssueRepository(session),
        attempt_repository=ExerciseAttemptRepository(session),
        feedback_repository=WritingFeedbackRepository(session),
        settings=resolved,
    )


async def _seed_exercise(session, **overrides) -> Exercise:
    return await ExerciseRepository(session).add(Exercise(**exercise_factory(**overrides)))


def _full_settings(**overrides) -> Settings:
    base = dict(
        ai_long_form_overall_sentence_weight=50,
        ai_discourse_weight_coherence=25,
        ai_discourse_weight_cohesion=20,
        ai_discourse_weight_organization=15,
        ai_discourse_weight_flow=20,
        ai_discourse_weight_style=10,
        ai_discourse_weight_redundancy=10,
    )
    base.update(overrides)
    return Settings(**base)


class TestDiscourseMath:
    async def test_weighted_discourse_quality(self, session) -> None:
        service = _service(session, ScriptedAIProvider())
        dims = {
            "coherence": 90,
            "cohesion": 85,
            "organization": 85,
            "flow": 85,
            "style_consistency": 90,
            "redundancy": 88,
        }
        assert service._weighted_discourse_quality(dims) == 87

    async def test_blend_sentence_and_discourse(self, session) -> None:
        service = _service(session, ScriptedAIProvider(), _full_settings())
        assert service._blend(90, 87) == 88
        assert service._blend(None, 87) == 87
        assert service._blend(90, None) == 90

    async def test_blend_sentence_share_is_respected(self, session) -> None:
        service = _service(
            session, ScriptedAIProvider(), _full_settings(ai_long_form_overall_sentence_weight=0)
        )
        assert service._blend(90, 87) == 87
        service = _service(
            session, ScriptedAIProvider(), _full_settings(ai_long_form_overall_sentence_weight=100)
        )
        assert service._blend(90, 87) == 90

    async def test_zero_weights_fall_back_to_average(self, session) -> None:
        settings = _full_settings(
            ai_discourse_weight_coherence=0,
            ai_discourse_weight_cohesion=0,
            ai_discourse_weight_organization=0,
            ai_discourse_weight_flow=0,
            ai_discourse_weight_style=0,
            ai_discourse_weight_redundancy=0,
        )
        service = _service(session, ScriptedAIProvider(), settings)
        assert service._weighted_discourse_quality({"coherence": 90, "cohesion": 70}) == 80


class TestPipeline:
    async def test_submit_evaluates_draft_and_persists_rows(self, session) -> None:
        exercise = await _seed_exercise(session, target_length="paragraph")
        service = _service(session, ScriptedAIProvider())
        result = await service.submit(exercise, TWO_SENTENCES)

        response = result.response
        assert response.status == "evaluated"
        assert response.discourse_available is True
        assert response.revision_number == 1
        assert response.sentence_count == 2
        assert response.scores.discourse_quality == 87
        assert response.scores.overall_writing == service._blend(
            response.scores.sentence_quality, 87
        )
        assert len(response.sentence_scores) == 2
        assert response.learning_mode["hints_total"] >= 1
        assert result.is_first_attempt is True

        revisions = await WritingRevisionRepository(session).list_by_submission(
            result.response.submission_id
        )
        assert len(revisions) == 1
        evaluation = await DiscourseEvaluationRepository(session).get_by_revision(revisions[0].id)
        assert evaluation is not None
        assert evaluation.discourse_quality == 87
        assert evaluation.evaluation_version == "discourse:v1"
        issues = await DiscourseIssueRepository(session).list_by_evaluation(evaluation.id)
        assert issues == []

        attempt = await ExerciseAttemptRepository(session).get(result.attempt_id)
        assert attempt is not None
        feedback = await WritingFeedbackRepository(session).get_by_attempt(attempt.id)
        assert feedback is not None
        assert feedback.evaluation_metadata["evaluation_version"] == "discourse:v1"

    async def test_long_writing_runs_structure_stage(self, session) -> None:
        exercise = await _seed_exercise(session, target_length="long_writing")
        service = _service(session, ScriptedAIProvider())
        result = await service.submit(exercise, TWO_SENTENCES)

        assert result.response.status == "evaluated"
        assert result.response.discourse_available is True
        assert result.response.scores.discourse_quality == 87
        assert result.response.structure_suggestion is not None
        assert result.response.provenance is not None
        stages = [stage["stage"] for stage in result.response.provenance.stages]
        assert "structure_suggestion" in stages

    async def test_revision_numbers_are_immutable(self, session) -> None:
        exercise = await _seed_exercise(session, target_length="paragraph")
        service = _service(session, ScriptedAIProvider())
        first = await service.submit(exercise, TWO_SENTENCES)
        second = await service.add_revision(
            await WritingSubmissionRepository(session).get(first.response.submission_id),
            exercise,
            "今日は仕事がとても忙しかったです。それで、帰りが遅くなりました。残業もしました。",
        )
        assert second.response.revision_number == 2
        assert second.response.sentence_count == 3
        assert second.is_first_attempt is False

        submissions = await WritingSubmissionRepository(session).get(first.response.submission_id)
        assert submissions.status == "evaluated"

    async def test_learning_mode_hides_rewrites_until_reveal(self, session) -> None:
        exercise = await _seed_exercise(session, target_length="paragraph")
        service = _service(session, ScriptedAIProvider())
        result = await service.submit(exercise, TWO_SENTENCES)
        assert result.response.rewrites is None
        assert result.response.learning_mode["enabled"] is True
        assert result.response.learning_mode["reveal_available"] is False

        submission = await WritingSubmissionRepository(session).get(result.response.submission_id)
        revision = (await WritingRevisionRepository(session).list_by_submission(submission.id))[0]
        revealed = await service.reveal(submission, exercise, revision)
        assert revealed["revealed"] is True
        assert revealed["rewrites"]["minimal_fix"]
        again = await service.reveal(submission, exercise, revision)
        assert again["revealed"] is True

    async def test_learning_mode_disabled_returns_rewrites_immediately(self, session) -> None:
        exercise = await _seed_exercise(session, target_length="paragraph")
        service = _service(
            session, ScriptedAIProvider(), _full_settings(ai_exercise_learning_mode_enabled=False)
        )
        result = await service.submit(exercise, TWO_SENTENCES)
        assert result.response.rewrites is not None
        assert result.response.rewrites.natural_rewrite


class TestFailureIsolation:
    async def test_discourse_failure_falls_back_to_sentence_only(self, session) -> None:
        exercise = await _seed_exercise(session, target_length="paragraph")
        invalid = _analysis(coherence_score=50, coherence_classification="excellent")
        provider = ScriptedAIProvider(
            discourse_analyses=[invalid, invalid, invalid],
        )
        service = _service(session, provider)
        result = await service.submit(exercise, TWO_SENTENCES)

        assert result.response.status == "sentence_only"
        assert result.response.discourse_available is False
        assert result.response.scores.discourse_quality == 0
        assert result.response.scores.sentence_quality > 0
        assert result.response.scores.overall_writing == result.response.scores.sentence_quality
        assert result.response.rewrites is None

        revisions = await WritingRevisionRepository(session).list_by_submission(
            result.response.submission_id
        )
        evaluation = await DiscourseEvaluationRepository(session).get_by_revision(revisions[0].id)
        assert evaluation is None

    async def test_sentence_evaluation_absent_uses_discourse_only(self, session) -> None:
        exercise = await _seed_exercise(session, target_length="paragraph")
        settings = _full_settings(ai_long_form_sentence_evaluation_enabled=False)
        service = _service(session, ScriptedAIProvider(), settings)
        result = await service.submit(exercise, TWO_SENTENCES)

        assert result.response.status == "evaluated"
        assert result.response.discourse_available is True
        assert result.response.scores.sentence_quality == 0
        assert result.response.scores.discourse_quality == 87
        assert result.response.scores.overall_writing == 87
        assert result.response.sentence_scores == []

    async def test_sentence_evaluation_failure_keeps_discourse_path(self, session) -> None:
        class _FailingSentencesProvider(ScriptedAIProvider):
            async def generate_structured(self, prompt, response_model, **kwargs):
                if response_model in (
                    SemanticEvaluation,
                    GrammarVocabularyEvaluation,
                    NaturalnessRegisterEvaluation,
                ):
                    from app.providers.ai.errors import AIResponseError

                    raise AIResponseError("simulated sentence failure", provider=self.name)
                return await super().generate_structured(prompt, response_model, **kwargs)

        exercise = await _seed_exercise(session, target_length="paragraph")
        service = _service(session, _FailingSentencesProvider())
        result = await service.submit(exercise, TWO_SENTENCES)

        assert result.response.status == "evaluated"
        assert result.response.discourse_available is True
        assert result.response.scores.discourse_quality == 87
        assert result.response.sentence_scores == []
        assert result.response.scores.sentence_quality == 0
        assert result.response.scores.overall_writing == 87

    async def test_total_failure_raises_evaluation_error(self, session) -> None:
        exercise = await _seed_exercise(session, target_length="paragraph")
        settings = _full_settings(ai_long_form_sentence_evaluation_enabled=False)
        service = _service(session, FakeAIProvider(fail_mode="invalid_structured"), settings)
        with pytest.raises(EvaluationError):
            await service.submit(exercise, TWO_SENTENCES)


class TestCompare:
    BEFORE = "今日は仕事がとても忙しかったです。だから、帰りが遅くなりました。"
    AFTER_CHANGED = "今日は仕事がとても忙しかったです。それで、帰りが遅くなりました。"
    AFTER_ADDED = "今日は仕事がとても忙しかったです。だから、帰りが遅くなりました。残業もしました。"

    async def _service_and_submission(self, session, exercise, texts):
        service = _service(session, ScriptedAIProvider())
        submission = None
        for index, text in enumerate(texts):
            if index == 0:
                submission = (await service.submit(exercise, text)).response.submission_id
            else:
                await service.add_revision(
                    await WritingSubmissionRepository(session).get(submission), exercise, text
                )
        return service, await WritingSubmissionRepository(session).get(submission)

    async def test_compare_reports_changed_sentence(self, session) -> None:
        exercise = await _seed_exercise(session, target_length="paragraph")
        service, submission = await self._service_and_submission(
            session, exercise, [self.BEFORE, self.AFTER_CHANGED]
        )
        result = await service.compare(submission, 1, 2)
        assert result["deltas"]["overall_writing"] == 0
        assert result["guidance"]
        assert result["guidance_version"]
        assert result["sentence_diff"]["changed"] == [
            "だから、帰りが遅くなりました。 -> それで、帰りが遅くなりました。"
        ]
        assert result["sentence_diff"]["added"] == []
        assert result["sentence_diff"]["removed"] == []

    async def test_compare_reports_added_sentence(self, session) -> None:
        exercise = await _seed_exercise(session, target_length="paragraph")
        service, submission = await self._service_and_submission(
            session, exercise, [self.BEFORE, self.AFTER_ADDED]
        )
        result = await service.compare(submission, 1, 2)
        assert result["sentence_diff"]["added"] == ["残業もしました。"]
        assert result["sentence_diff"]["changed"] == []
        assert result["sentence_diff"]["removed"] == []

    async def test_compare_requires_valid_order(self, session) -> None:
        exercise = await _seed_exercise(session, target_length="paragraph")
        service, submission = await self._service_and_submission(
            session, exercise, [self.BEFORE, self.AFTER_CHANGED]
        )
        with pytest.raises(EvaluationError):
            await service.compare(submission, 2, 1)

    async def test_compare_deterministic_guidance_when_ai_disabled(self, session) -> None:
        exercise = await _seed_exercise(session, target_length="paragraph")
        service, submission = await self._service_and_submission(
            session, exercise, [self.BEFORE, self.AFTER_CHANGED]
        )
        service._settings.ai_long_form_revision_guidance_enabled = False
        result = await service.compare(submission, 1, 2)
        assert result["guidance"]
        assert result["guidance_version"] is None


class TestHints:
    async def test_next_hint_increments_count_and_exhausts(self, session) -> None:
        exercise = await _seed_exercise(session, target_length="paragraph")
        service = _service(session, ScriptedAIProvider())
        result = await service.submit(exercise, TWO_SENTENCES)
        revision = (
            await WritingRevisionRepository(session).list_by_submission(
                result.response.submission_id
            )
        )[0]
        submission = await WritingSubmissionRepository(session).get(result.response.submission_id)

        total = result.response.learning_mode["hints_total"]
        seen: list[str] = []
        for _ in range(total):
            hint, count, total_now = await service.next_hint(submission, exercise, revision)
            seen.append(hint)
            assert count == len(seen)
            assert total_now == total
        hint, count, total_now = await service.next_hint(submission, exercise, revision)
        assert hint == ""
        assert count == total
        assert total_now == total
        assert len(set(seen)) == total

    async def test_hints_are_deterministic_across_requests(self, session) -> None:
        exercise = await _seed_exercise(session, target_length="paragraph")
        service = _service(session, ScriptedAIProvider())
        result = await service.submit(exercise, TWO_SENTENCES)
        revision = (
            await WritingRevisionRepository(session).list_by_submission(
                result.response.submission_id
            )
        )[0]
        submission = await WritingSubmissionRepository(session).get(result.response.submission_id)
        response = await service.evaluation_response(submission, exercise, revision)
        rebuilt = await service.evaluation_response(submission, exercise, revision)
        assert response.learning_mode["hints_total"] == rebuilt.learning_mode["hints_total"]
        assert response.issues == rebuilt.issues


class TestCoach:
    async def test_coach_answers_about_the_draft(self, session) -> None:
        exercise = await _seed_exercise(session, target_length="paragraph")
        service = _service(session, ScriptedAIProvider())
        result = await service.submit(exercise, TWO_SENTENCES)
        submission = await WritingSubmissionRepository(session).get(result.response.submission_id)
        answer = await service.coach(exercise, submission, "Làm sao cải thiện độ mạch lạc?")
        assert answer["answer"]
        assert len(answer["suggestions"]) == 2

    async def test_coach_requires_a_discourse_evaluation(self, session) -> None:
        exercise = await _seed_exercise(session, target_length="paragraph")
        invalid = _analysis(coherence_score=50, coherence_classification="excellent")
        service = _service(
            session, ScriptedAIProvider(discourse_analyses=[invalid, invalid, invalid])
        )
        result = await service.submit(exercise, TWO_SENTENCES)
        assert result.response.status == "sentence_only"
        submission = await WritingSubmissionRepository(session).get(result.response.submission_id)
        with pytest.raises(EvaluationError):
            await service.coach(exercise, submission, "Làm sao cải thiện độ mạch lạc?")


class TestConsistencyValidator:
    def test_analysis_accepts_consistent_bands(self) -> None:
        validator = DiscourseConsistencyValidator()
        validator.check_analysis(_analysis(), sentence_count=2)
        validator.check_analysis(
            _analysis(coherence_score=75, coherence_classification="good"), sentence_count=2
        )

    @pytest.mark.parametrize(
        "score,classification",
        [
            (84, "excellent"),
            (69, "good"),
            (25, "acceptable"),
            (50, "weak"),
        ],
    )
    def test_analysis_rejects_score_classification_mismatch(
        self, score: int, classification: str
    ) -> None:
        validator = DiscourseConsistencyValidator()
        with pytest.raises(DiscourseConsistencyError):
            validator.check_analysis(
                _analysis(coherence_score=score, coherence_classification=classification),
                sentence_count=2,
            )

    def test_analysis_rejects_out_of_range_issue_index(self) -> None:
        validator = DiscourseConsistencyValidator()
        with pytest.raises(DiscourseConsistencyError):
            validator.check_analysis(
                _analysis(
                    issues=[
                        {
                            "category": "coherence",
                            "severity": "minor",
                            "sentence_index": 5,
                            "sentence_range": None,
                            "explanation": "x",
                            "suggested_fix": "y",
                        }
                    ]
                ),
                sentence_count=2,
            )

    def test_analysis_rejects_invalid_span(self) -> None:
        validator = DiscourseConsistencyValidator()
        with pytest.raises(DiscourseConsistencyError):
            validator.check_analysis(
                _analysis(
                    issues=[
                        {
                            "category": "cohesion",
                            "severity": "info",
                            "sentence_index": None,
                            "sentence_range": [1, 3],
                            "explanation": "x",
                            "suggested_fix": "y",
                        }
                    ]
                ),
                sentence_count=2,
            )

    def test_synthesis_requires_strengths_summary_and_rewrites(self) -> None:
        from app.schemas.discourse_ai import DiscourseSynthesisResult, Rewrites

        validator = DiscourseConsistencyValidator()
        validator.check_synthesis(
            DiscourseSynthesisResult(
                strengths=["Good flow."],
                summary="Fine.",
                improved_structure=None,
                rewrites=Rewrites(minimal_fix="a", natural_rewrite="b", native_rewrite="c"),
            )
        )
        with pytest.raises(DiscourseConsistencyError):
            validator.check_synthesis(
                DiscourseSynthesisResult(
                    strengths=["Good flow."],
                    summary="   ",
                    improved_structure=None,
                    rewrites=Rewrites(minimal_fix="a", natural_rewrite="b", native_rewrite="c"),
                )
            )

    def test_band_constants_are_contiguous(self) -> None:
        bands = sorted(COHERENCE_SCORE_BANDS.values())
        for previous, current in zip(bands, bands[1:], strict=False):
            assert previous[1] + 1 >= current[0]
