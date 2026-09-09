"""Japanese writing evaluation pipeline.

Semantic -> Grammar/Vocabulary -> Naturalness/Register -> Corrections -> Hints,
plus an optional verification critique pass, followed by deterministic score
synthesis and consistency validation.

Stage order and design follow the Phase 4 spec:
- each stage is an AI call with its own versioned prompt and optional model
- the whole cycle is retried up to AI_EXERCISE_EVALUATION_MAX_RETRIES when a
  stage is malformed, contradictory, or fails (transient retries/fallbacks
  already happen inside AIService)
- only consistent, validated results are persisted
- attempts are immutable; only learning-mode state (hints/reveal) changes
"""

import logging
from datetime import datetime, timezone
from typing import Any

from app.core.config import Settings, get_settings
from app.core.errors import EvaluationError
from app.models import Exercise, ExerciseAttempt, WritingFeedback
from app.prompts.common import EVALUATION_VERSION
from app.prompts.correction_generation import (
    build_correction_prompt,
    correction_prompt_version,
)
from app.prompts.evaluation_verification import (
    build_verification_prompt,
    verification_prompt_version,
)
from app.prompts.grammar_vocabulary_evaluation import (
    build_grammar_vocabulary_prompt,
    grammar_vocabulary_prompt_version,
)
from app.prompts.hint_generation import build_hint_prompt, hint_prompt_version
from app.prompts.naturalness_register_evaluation import (
    build_naturalness_register_prompt,
    naturalness_register_prompt_version,
)
from app.prompts.semantic_evaluation import build_semantic_prompt, semantic_prompt_version
from app.providers.ai.base import AIGenerationResult
from app.providers.ai.errors import AIError
from app.quality.service import create_quality_service
from app.repositories import ExerciseAttemptRepository, WritingFeedbackRepository
from app.schemas.evaluation_ai import (
    CorrectionResult,
    Corrections,
    EvaluationIssue,
    EvaluationMetadata,
    EvaluationStageMetadata,
    EvaluationVerificationResult,
    GrammarVocabularyEvaluation,
    HintResult,
    NaturalnessRegisterEvaluation,
    SemanticEvaluation,
    WritingEvaluation,
)
from app.services.ai_service import AIService
from app.services.evaluation_consistency import (
    NATURALNESS_SCORE_BANDS,
    REGISTER_EXERCISE_VALUES,
    REGISTER_LOW_FIT,
    EvaluationConsistencyError,
)
from app.services.evaluation_synthesis import EvaluationSynthesisService

logger = logging.getLogger("app.evaluations")


class EvaluationService:
    """Owns the evaluation pipeline and the attempt learning-mode state."""

    def __init__(
        self,
        ai_service: AIService,
        attempt_repository: ExerciseAttemptRepository,
        feedback_repository: WritingFeedbackRepository,
        settings: Settings | None = None,
    ) -> None:
        self._ai = ai_service
        self._attempts = attempt_repository
        self._feedback = feedback_repository
        self._settings = settings or get_settings()
        self._quality = create_quality_service(settings=self._settings)
        self._synthesis = EvaluationSynthesisService(self._settings)

    def _quality_check(
        self,
        task: str,
        result: Any,
        *,
        context: dict | None = None,
        prompt_version: str | None = None,
    ) -> None:
        """Route one stage result through the shared quality layer.

        The registered deterministic checkers wrap the same consistency rules
        as before; violations raise ``EvaluationConsistencyError`` so the
        existing retry cycle keeps working.
        """
        outcome = self._quality.validate(
            task, result, context=context or {}, prompt_version=prompt_version
        )
        if outcome.violations:
            raise EvaluationConsistencyError("; ".join(outcome.violations))

    # -- provider/model resolution -----------------------------------------

    def _evaluation_task(
        self, provider_override: str | None = None, model_override: str | None = None
    ) -> tuple[str | None, str | None]:
        provider = (
            provider_override
            or self._settings.ai_exercise_evaluation_provider
            or self._settings.ai_exercise_generation_provider
            or None
        )
        model = (
            model_override
            or self._settings.ai_exercise_evaluation_model
            or self._settings.ai_exercise_generation_model
            or None
        )
        return provider, model

    def _stage_task(
        self,
        override: str,
        provider_override: str | None = None,
        model_override: str | None = None,
    ) -> tuple[str | None, str | None]:
        provider, model = self._evaluation_task(provider_override, model_override)
        if override and not model_override:
            model = override
        return provider, model

    # -- submit ------------------------------------------------------------

    async def evaluate(
        self,
        exercise: Exercise,
        answer_text: str,
        provider: str | None = None,
        model: str | None = None,
    ) -> tuple[WritingEvaluation, EvaluationMetadata]:
        """Run the full Phase 4 pipeline WITHOUT persisting anything.

        Used by the long-form discourse pipeline for per-sentence
        evaluation. Returns the synthesized evaluation and provenance.
        """
        max_cycles = 1 + self._settings.ai_exercise_evaluation_max_retries
        last_error = "evaluation failed"
        for cycle in range(max_cycles):
            try:
                return await self._run_cycle(exercise, answer_text, provider=provider, model=model)
            except (AIError, EvaluationConsistencyError) as exc:
                last_error = str(exc)
                logger.warning("evaluation rejected cycle=%d error=%s", cycle + 1, last_error)
                continue
        raise EvaluationError(
            f"Could not produce a valid evaluation after {max_cycles} cycle(s): {last_error}"
        )

    async def submit(
        self,
        exercise: Exercise,
        answer_text: str,
        provider: str | None = None,
        model: str | None = None,
    ) -> tuple[ExerciseAttempt, WritingFeedback, WritingEvaluation]:
        """Evaluate one submission and persist the immutable attempt."""
        attempt_number = await self._attempts.next_attempt_number(exercise.id)

        max_cycles = 1 + self._settings.ai_exercise_evaluation_max_retries
        last_error = "evaluation failed"
        for cycle in range(max_cycles):
            try:
                evaluation, metadata = await self._run_cycle(
                    exercise, answer_text, provider=provider, model=model
                )
                return await self._persist(
                    exercise, answer_text, attempt_number, evaluation, metadata
                )
            except (AIError, EvaluationConsistencyError) as exc:
                last_error = str(exc)
                logger.warning("evaluation rejected cycle=%d error=%s", cycle + 1, last_error)
                continue

        raise EvaluationError(
            f"Could not produce a valid evaluation after {max_cycles} cycle(s): {last_error}"
        )

    async def _run_cycle(
        self,
        exercise: Exercise,
        answer_text: str,
        provider: str | None = None,
        model: str | None = None,
    ) -> tuple[WritingEvaluation, EvaluationMetadata]:
        """Run every AI stage once and synthesize the final evaluation."""
        stages: list[EvaluationStageMetadata] = []
        cycle_started = datetime.now(timezone.utc)

        import asyncio

        # Parallelize independent first 3 stages to cut latency ~3x
        (semantic, semantic_result), (grammar_vocab, gv_result), (naturalness_register, nr_result) = await asyncio.gather(
            self._stage_semantic(exercise, answer_text, provider=provider, model=model),
            self._stage_grammar_vocabulary(exercise, answer_text, provider=provider, model=model),
            self._stage_naturalness_register(exercise, answer_text, provider=provider, model=model),
        )
        self._quality_check("semantic_evaluation", semantic, prompt_version=semantic_prompt_version())
        stages.append(self._stage_meta("semantic", semantic_result, semantic_prompt_version(), cycle_started))
        self._quality_check(
            "grammar_vocabulary_evaluation", grammar_vocab, prompt_version=grammar_vocabulary_prompt_version()
        )
        stages.append(self._stage_meta("grammar_vocabulary", gv_result, grammar_vocabulary_prompt_version(), cycle_started))
        self._quality_check(
            "naturalness_register_evaluation",
            naturalness_register,
            context={"exercise_register": exercise.register.value},
            prompt_version=naturalness_register_prompt_version(),
        )
        stages.append(self._stage_meta("naturalness_register", nr_result, naturalness_register_prompt_version(), cycle_started))

        corrections, correction_result = await self._stage_corrections(
            exercise, answer_text, provider=provider, model=model
        )
        stages.append(
            self._stage_meta(
                "corrections", correction_result, correction_prompt_version(), cycle_started
            )
        )

        hints, hint_result = await self._stage_hints(
            exercise,
            answer_text,
            issues=list(grammar_vocab.issues) + list(naturalness_register.issues),
            provider=provider,
            model=model,
        )
        stages.append(self._stage_meta("hints", hint_result, hint_prompt_version(), cycle_started))

        evaluation = self._synthesize(
            exercise,
            semantic,
            grammar_vocab,
            naturalness_register,
            corrections,
            hints,
        )

        if self._settings.ai_exercise_evaluation_verification_enabled:
            verification, verification_result = await self._stage_verify(
                exercise, answer_text, evaluation, provider=provider, model=model
            )
            stages.append(
                self._stage_meta(
                    "verification",
                    verification_result,
                    verification_prompt_version(),
                    cycle_started,
                )
            )
            if not verification.accepted:
                notes = verification.notes or "verifier rejected the evaluation"
                raise EvaluationConsistencyError(notes)

        self._quality_check(
            "writing_evaluation",
            evaluation,
            context={"exercise_register": exercise.register.value},
            prompt_version=EVALUATION_VERSION,
        )

        metadata = EvaluationMetadata(evaluation_version=EVALUATION_VERSION, stages=stages)
        return evaluation, metadata

    # -- stages ------------------------------------------------------------

    async def _stage_semantic(
        self,
        exercise: Exercise,
        answer_text: str,
        provider: str | None = None,
        model: str | None = None,
    ) -> tuple[SemanticEvaluation, AIGenerationResult]:
        stage_provider, stage_model = self._stage_task(
            self._settings.ai_exercise_evaluation_model_semantic,
            provider_override=provider,
            model_override=model,
        )
        system, user = build_semantic_prompt(exercise, answer_text)
        result, ai_result = await self._ai.generate_structured(
            user,
            SemanticEvaluation,
            system=system,
            provider=stage_provider,
            model=stage_model,
            max_tokens=self._settings.ai_exercise_evaluation_max_tokens,
        )
        assert isinstance(result, SemanticEvaluation)
        return result, ai_result

    async def _stage_grammar_vocabulary(
        self,
        exercise: Exercise,
        answer_text: str,
        provider: str | None = None,
        model: str | None = None,
    ) -> tuple[GrammarVocabularyEvaluation, AIGenerationResult]:
        stage_provider, stage_model = self._stage_task(
            self._settings.ai_exercise_evaluation_model_grammar,
            provider_override=provider,
            model_override=model,
        )
        system, user = build_grammar_vocabulary_prompt(exercise, answer_text)
        result, ai_result = await self._ai.generate_structured(
            user,
            GrammarVocabularyEvaluation,
            system=system,
            provider=stage_provider,
            model=stage_model,
            max_tokens=self._settings.ai_exercise_evaluation_max_tokens,
        )
        assert isinstance(result, GrammarVocabularyEvaluation)
        return result, ai_result

    async def _stage_naturalness_register(
        self,
        exercise: Exercise,
        answer_text: str,
        provider: str | None = None,
        model: str | None = None,
    ) -> tuple[NaturalnessRegisterEvaluation, AIGenerationResult]:
        stage_provider, stage_model = self._stage_task(
            self._settings.ai_exercise_evaluation_model_naturalness,
            provider_override=provider,
            model_override=model,
        )
        system, user = build_naturalness_register_prompt(exercise, answer_text)
        result, ai_result = await self._ai.generate_structured(
            user,
            NaturalnessRegisterEvaluation,
            system=system,
            provider=stage_provider,
            model=stage_model,
            max_tokens=self._settings.ai_exercise_evaluation_max_tokens,
        )
        assert isinstance(result, NaturalnessRegisterEvaluation)
        self._reconcile_naturalness_register(result, exercise, answer_text)
        return result, ai_result

    def _reconcile_naturalness_register(
        self,
        result: NaturalnessRegisterEvaluation,
        exercise: Exercise,
        answer_text: str,
    ) -> None:
        """Reconcile score bounds and ensure low register fit has an explicit register issue."""
        if result.naturalness_classification in NATURALNESS_SCORE_BANDS:
            low, high = NATURALNESS_SCORE_BANDS[result.naturalness_classification]
            if not (low <= result.naturalness_score <= high):
                result.naturalness_score = max(low, min(high, result.naturalness_score))

        exercise_reg = (
            exercise.register.value
            if hasattr(exercise.register, "value")
            else str(exercise.register)
        )
        has_register_issue = any(issue.category == "register" for issue in result.issues)
        if (
            exercise_reg in REGISTER_EXERCISE_VALUES
            and result.register_fit_score <= REGISTER_LOW_FIT
            and not has_register_issue
        ):
            relabelled = False
            register_keywords = (
                "register",
                "phong cách",
                "kính ngữ",
                "keigo",
                "casual",
                "polite",
                "business",
                "thân mật",
                "lịch sự",
                "trang trọng",
                "thể thường",
                "formality",
            )
            for issue in result.issues:
                text_to_check = (
                    f"{issue.explanation} {issue.suggested_fix} {issue.reason or ''}"
                ).lower()
                if any(kw in text_to_check for kw in register_keywords):
                    issue.category = "register"
                    relabelled = True
                    break
            if not relabelled:
                explanation = (
                    result.register_notes
                    or f"Phong cách diễn đạt ({result.register_fit_score}/100) chưa phù hợp với yêu cầu phong cách {exercise_reg} của bài tập."
                )
                result.issues.append(
                    EvaluationIssue(
                        category="register",
                        severity="major" if result.register_fit_score <= 25 else "minor",
                        original_text=answer_text[:200] if answer_text else "—",
                        explanation=explanation,
                        suggested_fix="Điều chỉnh cách xưng hô và thể câu (thể thông thường / kính ngữ) cho phù hợp với ngữ cảnh.",
                        reason=result.register_notes,
                    )
                )

    async def _stage_corrections(
        self,
        exercise: Exercise,
        answer_text: str,
        provider: str | None = None,
        model: str | None = None,
    ) -> tuple[CorrectionResult, AIGenerationResult]:
        stage_provider, stage_model = self._stage_task(
            self._settings.ai_exercise_evaluation_model_correction,
            provider_override=provider,
            model_override=model,
        )
        system, user = build_correction_prompt(exercise, answer_text)
        result, ai_result = await self._ai.generate_structured(
            user,
            CorrectionResult,
            system=system,
            provider=stage_provider,
            model=stage_model,
            max_tokens=self._settings.ai_exercise_evaluation_max_tokens,
        )
        assert isinstance(result, CorrectionResult)
        return result, ai_result

    async def _stage_hints(
        self,
        exercise: Exercise,
        answer_text: str,
        *,
        issues: list,
        provider: str | None = None,
        model: str | None = None,
    ) -> tuple[HintResult, AIGenerationResult]:
        stage_provider, stage_model = self._stage_task(
            self._settings.ai_exercise_evaluation_model_hint,
            provider_override=provider,
            model_override=model,
        )
        system, user = build_hint_prompt(exercise, answer_text, issues=issues)
        result, ai_result = await self._ai.generate_structured(
            user,
            HintResult,
            system=system,
            provider=stage_provider,
            model=stage_model,
            max_tokens=self._settings.ai_exercise_evaluation_max_tokens,
        )
        assert isinstance(result, HintResult)
        if not result.hints:
            result.hints = ["Hãy kiểm tra lại cách dùng từ và sự phù hợp phong cách của câu."]
        return result, ai_result

    async def _stage_verify(
        self,
        exercise: Exercise,
        answer_text: str,
        evaluation: WritingEvaluation,
        provider: str | None = None,
        model: str | None = None,
    ) -> tuple[EvaluationVerificationResult, AIGenerationResult]:
        stage_provider, stage_model = self._evaluation_task(
            provider_override=provider, model_override=model
        )
        system, user = build_verification_prompt(
            exercise, answer_text, evaluation.model_dump(mode="json")
        )
        result, ai_result = await self._ai.generate_structured(
            user,
            EvaluationVerificationResult,
            system=system,
            provider=stage_provider,
            model=stage_model,
            max_tokens=self._settings.ai_exercise_evaluation_max_tokens,
        )
        assert isinstance(result, EvaluationVerificationResult)
        return result, ai_result

    # -- synthesis & persistence -------------------------------------------

    def _synthesize(
        self,
        exercise: Exercise,
        semantic: SemanticEvaluation,
        grammar_vocab: GrammarVocabularyEvaluation,
        naturalness_register: NaturalnessRegisterEvaluation,
        corrections: CorrectionResult,
        hints: HintResult,
    ) -> WritingEvaluation:
        scores = self._synthesis.synthesize(
            semantic_score=semantic.score,
            grammar_score=grammar_vocab.grammar_score,
            vocabulary_score=grammar_vocab.vocabulary_score,
            naturalness_score=naturalness_register.naturalness_score,
            context_fit_score=naturalness_register.context_fit_score,
            register_fit_score=naturalness_register.register_fit_score,
        )
        issues = (list(grammar_vocab.issues) + list(naturalness_register.issues))[:15]
        return WritingEvaluation(
            scores=scores,
            semantic_classification=semantic.classification,
            semantic_omissions=semantic.omissions,
            semantic_additions=semantic.additions,
            semantic_meaning_changes=semantic.meaning_changes,
            semantic_confidence=semantic.confidence,
            grammar_confidence=grammar_vocab.confidence,
            vocabulary_confidence=grammar_vocab.confidence,
            naturalness_confidence=naturalness_register.confidence,
            naturalness_classification=naturalness_register.naturalness_classification,
            register_notes=naturalness_register.register_notes,
            issues=issues,
            corrections=Corrections(
                correct_version=corrections.correct_version,
                natural_version=corrections.natural_version,
                native_version=corrections.native_version,
                casual_version=corrections.casual_version,
                polite_version=corrections.polite_version,
                business_version=corrections.business_version,
            ),
            hints=list(hints.hints) or [
                "Hãy tiếp tục luyện tập để nâng cao sự trôi chảy và tự nhiên!"
            ],
            summary=self._summary(exercise, semantic, naturalness_register),
        )

    @staticmethod
    def _summary(
        exercise: Exercise,
        semantic: SemanticEvaluation,
        naturalness_register: NaturalnessRegisterEvaluation,
    ) -> str:
        if semantic.score >= 85 and naturalness_register.naturalness_score >= 85:
            return (
                "Câu trả lời của bạn truyền đạt đúng ý nghĩa và được diễn đạt "
                "tự nhiên. Tiếp tục duy trì phong cách này!"
            )
        if semantic.score >= 70:
            return (
                "Ý nghĩa được truyền đạt tốt. Tập trung vào các gợi ý để câu "
                "văn tự nhiên hơn theo ngữ cảnh của bài tập."
            )
        if semantic.score >= 40:
            return (
                "Phần lớn ý nghĩa đã được thể hiện, nhưng có vài điểm cần điều "
                "chỉnh về nội dung hoặc cách diễn đạt. Xem các gợi ý để cải thiện."
            )
        return (
            "Câu trả lời chưa truyền đạt đúng ý nghĩa của bài tập. Hãy đọc lại "
            "ngữ cảnh và thử diễn đạt lại ý chính."
        )

    def _stage_meta(
        self,
        stage: str,
        result: AIGenerationResult,
        prompt_version: str,
        cycle_started: datetime,
    ) -> EvaluationStageMetadata:
        return EvaluationStageMetadata(
            stage=stage,
            provider=result.provider,
            model=result.model,
            prompt_version=prompt_version,
            timestamp=cycle_started,
        )

    async def _persist(
        self,
        exercise: Exercise,
        answer_text: str,
        attempt_number: int,
        evaluation: WritingEvaluation,
        metadata: EvaluationMetadata,
    ) -> tuple[ExerciseAttempt, WritingFeedback, WritingEvaluation]:
        attempt = await self._attempts.add(
            ExerciseAttempt(
                exercise_id=exercise.id,
                attempt_number=attempt_number,
                answer_text=answer_text,
            )
        )
        payload = evaluation.model_dump(mode="json")
        feedback = await self._feedback.add(
            WritingFeedback(
                attempt_id=attempt.id,
                evaluation=payload,
                overall_score=evaluation.scores.overall_score,
                semantic_score=evaluation.scores.semantic_score,
                grammar_score=evaluation.scores.grammar_score,
                vocabulary_score=evaluation.scores.vocabulary_score,
                naturalness_score=evaluation.scores.naturalness_score,
                context_fit_score=evaluation.scores.context_fit_score,
                register_fit_score=evaluation.scores.register_fit_score,
                evaluation_metadata=metadata.model_dump(mode="json"),
            )
        )
        logger.info(
            "attempt_submitted exercise_id=%s attempt=%d overall=%d provider=%s model=%s",
            exercise.id,
            attempt_number,
            evaluation.scores.overall_score,
            metadata.stages[0].provider if metadata.stages else "unknown",
            metadata.stages[0].model if metadata.stages else "unknown",
        )
        return attempt, feedback, evaluation

    # -- learning-mode state -----------------------------------------------

    @staticmethod
    def _evaluation_from_feedback(feedback: WritingFeedback) -> WritingEvaluation:
        return WritingEvaluation.model_validate(feedback.evaluation)

    async def next_hint(self, attempt: ExerciseAttempt) -> tuple[str | None, int, int]:
        """Reveal the next hint (None when exhausted). Returns (hint, revealed, total)."""
        feedback = await self._feedback.get_by_attempt(attempt.id)
        if feedback is None:
            return None, 0, 0
        evaluation = self._evaluation_from_feedback(feedback)
        total = len(evaluation.hints)
        index = attempt.hints_revealed_count
        if index >= total:
            return None, total, total
        attempt.hints_revealed_count = index + 1
        await self._attempts.update(attempt)
        return evaluation.hints[index], index + 1, total

    async def reveal(self, attempt: ExerciseAttempt) -> Corrections:
        """Explicitly reveal the corrected versions (idempotent)."""
        feedback = await self._feedback.get_by_attempt(attempt.id)
        if feedback is None:
            raise EvaluationError("Attempt has no persisted evaluation")
        attempt.revealed = True
        await self._attempts.update(attempt)
        return self._evaluation_from_feedback(feedback).corrections
