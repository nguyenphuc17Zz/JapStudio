"""Long-form writing orchestration (Phase 8/9): discourse pipeline, revisions,
hints, reveal, comparison, the AI writing coach and the scenario-aware
evaluation stage.

Pipeline (per revision):
  1. deterministic segmentation (AI stage optional, behind a flag)
  2. per-sentence Phase 4 evaluation (reuses EvaluationService without
     persisting) -> sentence_quality
  3. discourse_analysis call (coherence/cohesion/organization/flow/
     redundancy/topic consistency combined)
  4. style_consistency call (register-aware)
  5. optional structure_suggestion call (long_writing only)
  6. scenario_evaluation call (scenario exercises only; isolated failure)
  7. discourse_synthesis call (strengths, summary, improved_structure,
     three meaning-preserving rewrites + professional rewrite when the
     scenario register warrants it)
  8. deterministic score math + DiscourseConsistencyValidator
  9. persistence: attempt row (aggregate feedback) + submission + revision
     + discourse evaluation + issues

Failure isolation: sentence-level failure degrades to discourse-only
feedback; discourse failure degrades to sentence-only feedback; scenario
evaluation failure degrades to scenario-unavailable but the normal
evaluation remains; a total failure raises EvaluationError. Reads never
re-trigger the AI.
"""

import asyncio
import difflib
import logging
from datetime import datetime, timezone
from typing import Any

from app.core.config import Settings, get_settings
from app.core.errors import EvaluationError
from app.domain.scenario_formats import (
    PROFESSIONAL_REWRITE_GENRES,
    PROFESSIONAL_REWRITE_REGISTERS,
)
from app.models import (
    DiscourseEvaluation,
    DiscourseIssue,
    Exercise,
    ExerciseAttempt,
    WritingFeedback,
    WritingRevision,
    WritingScenario,
    WritingSubmission,
)
from app.prompts.coherence_evaluation import build_coherence_section
from app.prompts.cohesion_evaluation import build_cohesion_section
from app.prompts.common import format_exercise_input
from app.prompts.discourse_coach import (
    build_discourse_coach_prompt,
)
from app.prompts.discourse_segmentation import (
    build_discourse_segmentation_prompt,
)
from app.prompts.discourse_synthesis import (
    build_discourse_synthesis_prompt,
    discourse_synthesis_prompt_version,
)
from app.prompts.organization_evaluation import build_organization_section
from app.prompts.revision_guidance import (
    build_revision_guidance_prompt,
    revision_guidance_prompt_version,
)
from app.prompts.scenario_coach import build_scenario_coach_prompt
from app.prompts.scenario_common import format_scenario_context
from app.prompts.scenario_evaluation import (
    build_scenario_evaluation_prompt,
    scenario_evaluation_prompt_version,
)
from app.prompts.structure_suggestion import (
    build_structure_suggestion_prompt,
    structure_suggestion_prompt_version,
)
from app.prompts.coherence_evaluation import coherence_evaluation_prompt_version
from app.prompts.style_consistency_evaluation import (
    build_style_consistency_prompt,
    style_consistency_evaluation_prompt_version,
)
from app.quality.service import create_quality_service
from app.repositories import (
    DiscourseEvaluationRepository,
    DiscourseIssueRepository,
    ExerciseAttemptRepository,
    WritingFeedbackRepository,
    WritingRevisionRepository,
    WritingScenarioRepository,
    WritingSubmissionRepository,
)
from app.schemas.discourse_ai import (
    DiscourseAnalysisResult,
    DiscourseCoachResult,
    DiscourseSegmentationResult,
    DiscourseSynthesisResult,
    RevisionGuidanceResult,
    StructureSuggestionResult,
    StyleConsistencyResult,
)
from app.schemas.evaluation_ai import (
    Corrections,
    EvaluationIssue,
    EvaluationScores,
    WritingEvaluation,
)
from app.schemas.writing import (
    DiscourseIssueOut,
    Provenance,
    SentenceScore,
    WritingEvaluationResponse,
    WritingScores,
)
from app.schemas.writing_scenario import ScenarioEvaluationResult
from app.services.ai_service import AIService
from app.services.discourse_consistency import DiscourseConsistencyError
from app.services.discourse_segmentation import split_sentences
from app.services.evaluation_service import EvaluationService

logger = logging.getLogger("app.writing")

DISCOURSE_VERSION = "discourse:v1"

_HINT_TEMPLATES: dict[str, str] = {
    "coherence": (
        "Các câu trong đoạn chưa cùng hướng về một chủ đề chính. Hãy kiểm tra "
        "xem mỗi câu có đang phục vụ ý chính của bài không."
    ),
    "cohesion": (
        "Các câu chưa kết nối mượt với nhau. Thử dùng các từ nối tự nhiên "
        "như しかし, そして, また, そのため khi ý có quan hệ rõ ràng."
    ),
    "organization": (
        "Cấu trúc đoạn chưa rõ ràng. Thử mở đầu bằng ý chính, triển khai chi "
        "tiết, và kết thúc bằng một nhận xét/câu chốt."
    ),
    "flow": (
        "Nhịp đọc còn chập chờn. Thử cân bằng độ dài các câu và sắp xếp ý "
        "theo trình tự hợp lý để người đọc dễ theo dõi."
    ),
    "redundancy": (
        "Một số thông tin bị lặp lại không cần thiết. Giữ lại các câu nhấn "
        "mạnh có chủ đích, nhưng bỏ những câu nói lại cùng một ý."
    ),
    "style": (
        "Phong cách câu chữ chưa nhất quán. Hãy chọn một kiểu (です・ます hoặc "
        "だ・である) và giữ xuyên suốt bài viết."
    ),
    "register": (
        "Ngữ điệu chưa khớp với yêu cầu của bài. Kiểm tra lại mức độ lịch sự "
        "(casual / polite / business) của từng câu."
    ),
    "topic_consistency": (
        "Có câu đang lạc khỏi chủ đề chính. Hãy đọc lại và loại bỏ hoặc diễn "
        "đạt lại câu khiến người đọc bị lạc hướng."
    ),
}

_GENERIC_HINT = (
    "Đoạn văn của bạn đã truyền đạt được ý chính. Đọc lại một lượt để xem "
    "có thể nối các câu tự nhiên hơn không."
)


class DiscourseSubmissionResult:
    """Internal result of one evaluated revision (response + hook payload)."""

    def __init__(
        self,
        response: WritingEvaluationResponse,
        attempt_id: str,
        exercise: Exercise,
        scores: dict[str, int],
        is_first_attempt: bool,
        issues: list[dict],
    ) -> None:
        self.response = response
        self.attempt_id = attempt_id
        self.exercise = exercise
        self.scores = scores
        self.is_first_attempt = is_first_attempt
        self.issues = issues


class DiscourseService:
    """Owns the long-form writing pipeline and its read APIs."""

    def __init__(
        self,
        evaluation_service: EvaluationService,
        ai_service: AIService,
        submission_repository: WritingSubmissionRepository,
        revision_repository: WritingRevisionRepository,
        evaluation_repository: DiscourseEvaluationRepository,
        issue_repository: DiscourseIssueRepository,
        attempt_repository: ExerciseAttemptRepository,
        feedback_repository: WritingFeedbackRepository,
        settings: Settings | None = None,
        scenario_repository: WritingScenarioRepository | None = None,
    ) -> None:
        self._evaluations = evaluation_service
        self._ai = ai_service
        self._submissions = submission_repository
        self._revisions = revision_repository
        self._discourse = evaluation_repository
        self._issues = issue_repository
        self._attempts = attempt_repository
        self._feedback = feedback_repository
        self._settings = settings or get_settings()
        self._scenarios = scenario_repository
        self._quality = create_quality_service(settings=self._settings)

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
        as before; violations raise ``DiscourseConsistencyError`` so the
        existing retry cycle keeps working.
        """
        outcome = self._quality.validate(
            task, result, context=context or {}, prompt_version=prompt_version
        )
        if outcome.violations:
            raise DiscourseConsistencyError("; ".join(outcome.violations))

    # -- provider/model resolution -----------------------------------------

    def _task(
        self, provider_override: str | None = None, model_override: str | None = None
    ) -> tuple[str | None, str | None]:
        provider = (
            provider_override
            or self._settings.ai_long_form_provider
            or self._settings.ai_exercise_evaluation_provider
            or self._settings.ai_exercise_generation_provider
            or None
        )
        model = (
            model_override
            or self._settings.ai_long_form_model
            or self._settings.ai_exercise_evaluation_model
            or None
        )
        return provider, model

    def _coach_task(
        self, provider_override: str | None = None, model_override: str | None = None
    ) -> tuple[str | None, str | None]:
        provider, _ = self._task(provider_override, model_override)
        model = (
            model_override
            or self._settings.ai_long_form_coach_model
            or self._settings.ai_long_form_model
            or None
        )
        return provider, model

    def _scenario_eval_task(
        self, provider_override: str | None = None, model_override: str | None = None
    ) -> tuple[str | None, str | None]:
        """Scenario evaluation provider chain (requirement 31)."""
        provider, model = self._task(provider_override, model_override)
        provider = (
            provider_override
            or self._settings.ai_scenario_evaluation_provider
            or self._settings.ai_scenario_provider
            or self._settings.ai_learning_provider
            or provider
        )
        model = (
            model_override
            or self._settings.ai_scenario_evaluation_model
            or self._settings.ai_scenario_model
            or self._settings.ai_learning_model
            or model
        )
        return provider, model

    # -- weights ------------------------------------------------------------

    def _discourse_weights(self) -> list[tuple[str, int]]:
        return [
            ("coherence", max(self._settings.ai_discourse_weight_coherence, 0)),
            ("cohesion", max(self._settings.ai_discourse_weight_cohesion, 0)),
            ("organization", max(self._settings.ai_discourse_weight_organization, 0)),
            ("flow", max(self._settings.ai_discourse_weight_flow, 0)),
            ("style_consistency", max(self._settings.ai_discourse_weight_style, 0)),
            ("redundancy", max(self._settings.ai_discourse_weight_redundancy, 0)),
        ]

    def _weighted_discourse_quality(self, dims: dict[str, int]) -> int:
        weights = self._discourse_weights()
        total = sum(weight for _, weight in weights)
        if total <= 0:
            return round(sum(dims.values()) / max(len(dims), 1))
        return round(sum(dims[name] * weight for name, weight in weights) / total)

    def _blend(self, sentence_quality: int | None, discourse_quality: int | None) -> int:
        if sentence_quality is None:
            return discourse_quality if discourse_quality is not None else 0
        if discourse_quality is None:
            return sentence_quality
        sentence_share = max(0, min(100, self._settings.ai_long_form_overall_sentence_weight))
        return round(
            (sentence_quality * sentence_share + discourse_quality * (100 - sentence_share)) / 100
        )

    def _scenario_weights(self) -> list[tuple[str, int]]:
        return [
            ("scenario_semantic_fit", max(self._settings.ai_scenario_weight_semantic, 0)),
            ("audience_fit", max(self._settings.ai_scenario_weight_audience, 0)),
            ("purpose_fit", max(self._settings.ai_scenario_weight_purpose, 0)),
            ("tone_fit", max(self._settings.ai_scenario_weight_tone, 0)),
            ("constraint_compliance", max(self._settings.ai_scenario_weight_constraint, 0)),
        ]

    def _scenario_fit(self, dims: dict[str, int]) -> int:
        weights = self._scenario_weights()
        total = sum(weight for _, weight in weights)
        if total <= 0:
            values = [dims.get(name, 0) for name, _ in weights]
            return round(sum(values) / max(len(values), 1))
        return round(sum(dims[name] * weight for name, weight in weights) / total)

    def _scenario_combined(self, discourse_quality: int, scenario_fit: int | None) -> int:
        """60/40 blend of discourse quality and scenario fit (scenario only)."""
        if scenario_fit is None:
            return discourse_quality
        return round((discourse_quality * 60 + scenario_fit * 40) / 100)

    # -- submission -----------------------------------------------------------

    async def submit(
        self,
        exercise: Exercise,
        text: str,
        user_id: str | None = None,
        provider: str | None = None,
        model: str | None = None,
    ) -> DiscourseSubmissionResult:
        """Evaluate the first draft of a long-form writing submission."""
        if not self._settings.ai_long_form_enabled:
            raise EvaluationError(
                "long-form writing evaluation is disabled in the server configuration"
            )
        mode = "scenario" if exercise.scenario_id else "long_form"
        submission = await self._submissions.add(
            WritingSubmission(user_id=user_id, exercise_id=exercise.id, mode=mode)
        )
        return await self._evaluate_draft(
            submission, exercise, text, user_id=user_id, provider=provider, model=model
        )

    async def add_revision(
        self,
        submission: WritingSubmission,
        exercise: Exercise,
        text: str,
        user_id: str | None = None,
        provider: str | None = None,
        model: str | None = None,
    ) -> DiscourseSubmissionResult:
        """Evaluate the next draft (immutable; numbering continues)."""
        return await self._evaluate_draft(
            submission, exercise, text, user_id=user_id, provider=provider, model=model
        )

    async def _load_scenario(self, exercise: Exercise) -> WritingScenario | None:
        """Resolve the scenario linked to the exercise (None for plain writing)."""
        if not exercise.scenario_id or self._scenarios is None:
            return None
        try:
            return await self._scenarios.get_for_user(None, exercise.scenario_id)
        except Exception as exc:  # noqa: BLE001 - scenario must never break writing
            logger.warning("scenario load failed exercise_id=%s error=%s", exercise.id, exc)
            return None

    async def _evaluate_draft(
        self,
        submission: WritingSubmission,
        exercise: Exercise,
        text: str,
        user_id: str | None,
        provider: str | None = None,
        model: str | None = None,
    ) -> DiscourseSubmissionResult:
        sentences = await self._segment(text, provider=provider, model=model)
        sentence_scores = await self._evaluate_sentences(
            exercise, sentences, provider=provider, model=model
        )
        sentence_quality = (
            round(sum(s["overall_score"] for s in sentence_scores) / len(sentence_scores))
            if sentence_scores
            else None
        )
        scenario = await self._load_scenario(exercise)

        discourse: dict[str, Any] | None = None
        try:
            discourse = await self._run_discourse(
                exercise,
                sentences,
                sentence_quality,
                scenario=scenario,
                provider=provider,
                model=model,
            )
        except Exception as exc:
            logger.warning(
                "discourse evaluation failed submission_id=%s error=%s", submission.id, exc
            )
            discourse = None

        if discourse is None and not sentence_scores:
            raise EvaluationError(
                "could not produce any writing evaluation (sentence-level and discourse-level "
                "both failed)"
            )

        status = "evaluated" if discourse is not None else "sentence_only"
        revision_number = await self._submissions.next_revision_number(submission.id)
        attempt, feedback_payload, hints, evaluation = await self._persist_attempt(
            exercise, text, sentence_scores, discourse, sentence_quality, revision_number
        )
        revision = await self._revisions.add(
            WritingRevision(
                submission_id=submission.id,
                revision_number=revision_number,
                attempt_id=attempt.id,
                text=text,
                sentence_count=len(sentences),
                status=status,
            )
        )

        evaluation_id: str | None = None
        if discourse is not None:
            evaluation_id = await self._persist_discourse(
                revision.id, discourse, sentence_scores, sentence_quality
            )
        submission.status = status
        await self._submissions.update(submission)

        response = self._build_response(
            submission,
            exercise,
            revision,
            text,
            sentence_scores,
            sentence_quality,
            discourse,
            evaluation_id,
            hints=hints,
            include_rewrites=(not self._settings.ai_exercise_learning_mode_enabled),
        )
        scores = evaluation.scores
        return DiscourseSubmissionResult(
            response=response,
            attempt_id=attempt.id,
            exercise=exercise,
            scores={
                "overall": scores.overall_score,
                "semantic": scores.semantic_score,
                "grammar": scores.grammar_score,
                "vocabulary": scores.vocabulary_score,
                "naturalness": scores.naturalness_score,
                "context_fit": scores.context_fit_score,
                "register_fit": scores.register_fit_score,
            },
            is_first_attempt=revision_number == 1,
            issues=[i for s in sentence_scores for i in s.get("issues", [])],
        )

    # -- pipeline stages -------------------------------------------------------

    async def _segment(
        self, text: str, provider: str | None = None, model: str | None = None
    ) -> list[str]:
        sentences = split_sentences(text, self._settings.ai_long_form_max_sentences)
        if not self._settings.ai_long_form_ai_segmentation_enabled or len(sentences) <= 1:
            return sentences
        try:
            stage_provider, stage_model = self._task(provider, model)
            result, _ = await self._ai.generate_structured(
                build_discourse_segmentation_prompt(text)[1],
                DiscourseSegmentationResult,
                system=build_discourse_segmentation_prompt(text)[0],
                provider=stage_provider,
                model=stage_model,
                max_tokens=self._settings.ai_long_form_max_tokens,
            )
            assert isinstance(result, DiscourseSegmentationResult)
            ai_sentences = [s.strip() for s in result.sentences if s.strip()]
            if len(ai_sentences) >= 2:
                return ai_sentences[: self._settings.ai_long_form_max_sentences]
        except Exception as exc:
            logger.warning("AI segmentation failed error=%s (deterministic fallback)", exc)
        return sentences

    async def _evaluate_sentences(
        self,
        exercise: Exercise,
        sentences: list[str],
        provider: str | None = None,
        model: str | None = None,
    ) -> list[dict[str, Any]]:
        if not self._settings.ai_long_form_sentence_evaluation_enabled:
            return []
        if not sentences:
            return []
        # Parallelize with bounded concurrency (3 at a time) to avoid provider burst
        sem = asyncio.Semaphore(3)

        async def _eval_one(idx: int, sent: str) -> dict[str, Any] | None:
            async with sem:
                try:
                    evaluation, _ = await self._evaluations.evaluate(exercise, sent, provider=provider, model=model)
                    return {
                        "index": idx,
                        "text": sent,
                        "overall_score": evaluation.scores.overall_score,
                        "semantic_score": evaluation.scores.semantic_score,
                        "grammar_score": evaluation.scores.grammar_score,
                        "vocabulary_score": evaluation.scores.vocabulary_score,
                        "naturalness_score": evaluation.scores.naturalness_score,
                        "context_fit_score": evaluation.scores.context_fit_score,
                        "register_fit_score": evaluation.scores.register_fit_score,
                        "issues": [i.model_dump(mode="json") for i in evaluation.issues],
                        "corrections": evaluation.corrections.model_dump(mode="json"),
                        "summary": evaluation.summary,
                        "semantic_classification": evaluation.semantic_classification,
                        "naturalness_classification": evaluation.naturalness_classification,
                    }
                except Exception as exc:
                    logger.warning("sentence evaluation failed index=%d error=%s", idx, exc)
                    return None

        results = await asyncio.gather(*[_eval_one(i, s) for i, s in enumerate(sentences)])
        return [r for r in results if r is not None]

    async def _run_discourse(
        self,
        exercise: Exercise,
        sentences: list[str],
        sentence_quality: int | None,
        *,
        scenario: WritingScenario | None = None,
        provider: str | None = None,
        model: str | None = None,
    ) -> dict[str, Any]:
        """Run the discourse AI stages with consistency retries."""
        max_cycles = 1 + self._settings.ai_exercise_evaluation_max_retries
        last_error = "discourse evaluation failed"
        for cycle in range(max_cycles):
            try:
                return await self._discourse_cycle(
                    exercise,
                    sentences,
                    sentence_quality,
                    scenario=scenario,
                    provider=provider,
                    model=model,
                )
            except Exception as exc:  # noqa: BLE001 - cycle retries any failure
                last_error = str(exc)
                logger.warning("discourse cycle rejected cycle=%d error=%s", cycle + 1, last_error)
        raise EvaluationError(
            f"Could not produce a valid discourse evaluation after {max_cycles} "
            f"cycle(s): {last_error}"
        )

    async def _discourse_cycle(
        self,
        exercise: Exercise,
        sentences: list[str],
        sentence_quality: int | None,
        *,
        scenario: WritingScenario | None = None,
        provider: str | None = None,
        model: str | None = None,
    ) -> dict[str, Any]:
        stage_provider, stage_model = self._task(provider, model)
        started = datetime.now(timezone.utc)
        stages: list[dict[str, Any]] = []

        # Parallelize independent discourse stages (analysis || style) to save ~2s
        style_system, style_user = build_style_consistency_prompt(exercise, sentences)
        (analysis, analysis_result), (style, style_result) = await asyncio.gather(
            self._ai.generate_structured(
                self._analysis_user_prompt(exercise, sentences, scenario=scenario),
                DiscourseAnalysisResult,
                system=self._analysis_system_prompt(),
                provider=stage_provider,
                model=stage_model,
                max_tokens=self._settings.ai_long_form_max_tokens,
            ),
            self._ai.generate_structured(
                style_user,
                StyleConsistencyResult,
                system=style_system,
                provider=stage_provider,
                model=stage_model,
                max_tokens=self._settings.ai_long_form_max_tokens,
            ),
        )
        assert isinstance(analysis, DiscourseAnalysisResult)
        assert isinstance(style, StyleConsistencyResult)
        self._quality_check("discourse_evaluation", analysis, context={"sentence_count": len(sentences)}, prompt_version=coherence_evaluation_prompt_version())
        stages.append({"stage": "discourse_analysis", "provider": analysis_result.provider, "model": analysis_result.model, "prompt_version": coherence_evaluation_prompt_version(), "timestamp": started.isoformat()})
        self._quality_check("discourse_evaluation", style, context={"sentence_count": len(sentences)}, prompt_version=style_consistency_evaluation_prompt_version())
        stages.append({"stage": "style_consistency", "provider": style_result.provider, "model": style_result.model, "prompt_version": style_consistency_evaluation_prompt_version(), "timestamp": started.isoformat()})

        structure: StructureSuggestionResult | None = None
        if exercise.target_length.value == "long_writing":
            structure_system, structure_user = build_structure_suggestion_prompt(
                sentences, analysis.structure_reorder_advice
            )
            structure_result, structure_meta = await self._ai.generate_structured(
                structure_user,
                StructureSuggestionResult,
                system=structure_system,
                provider=stage_provider,
                model=stage_model,
                max_tokens=self._settings.ai_long_form_max_tokens,
            )
            assert isinstance(structure_result, StructureSuggestionResult)
            structure = structure_result
            stages.append(
                {
                    "stage": "structure_suggestion",
                    "provider": structure_meta.provider,
                    "model": structure_meta.model,
                    "prompt_version": structure_suggestion_prompt_version(),
                    "timestamp": started.isoformat(),
                }
            )

        scenario_out: dict[str, Any] | None = None
        if scenario is not None:
            scenario_out = await self._run_scenario_stage(
                scenario, sentences, stages, started, provider=provider, model=model
            )

        dims = {
            "coherence": analysis.coherence_score,
            "cohesion": analysis.cohesion_score,
            "organization": analysis.organization_score,
            "flow": analysis.flow_score,
            "style_consistency": style.style_consistency_score,
            "redundancy": analysis.redundancy_score,
        }
        discourse_quality = self._weighted_discourse_quality(dims)
        scenario_dims = scenario_out.get("scores", {}) if scenario_out else {}
        scenario_fit = scenario_out.get("scenario_fit") if scenario_out else None

        issues = [i.model_dump(mode="json") for i in list(analysis.issues) + list(style.issues)]
        synthesis_system, synthesis_user = build_discourse_synthesis_prompt(
            exercise,
            sentences,
            sentence_quality if sentence_quality is not None else 0,
            dims,
            issues,
            analysis.structure_reorder_advice,
            scenario_context=(format_scenario_context(scenario) if scenario is not None else None),
            professional_rewrite=(
                scenario is not None
                and scenario.genre in PROFESSIONAL_REWRITE_GENRES
                and scenario.register in PROFESSIONAL_REWRITE_REGISTERS
            ),
        )
        synthesis, synthesis_result = await self._ai.generate_structured(
            synthesis_user,
            DiscourseSynthesisResult,
            system=synthesis_system,
            provider=stage_provider,
            model=stage_model,
            max_tokens=self._settings.ai_long_form_max_tokens,
        )
        assert isinstance(synthesis, DiscourseSynthesisResult)
        self._quality_check(
            "discourse_evaluation", synthesis, prompt_version=discourse_synthesis_prompt_version()
        )
        stages.append(
            {
                "stage": "discourse_synthesis",
                "provider": synthesis_result.provider,
                "model": synthesis_result.model,
                "prompt_version": discourse_synthesis_prompt_version(),
                "timestamp": started.isoformat(),
            }
        )

        if self._has_critical(issues) and discourse_quality >= 85:
            raise DiscourseConsistencyError(
                "discourse quality 85+ must not come with major+ discourse issues"
            )

        return {
            "scores": {
                **dims,
                "register_fit": style.register_fit_score,
                **scenario_dims,
            },
            "discourse_quality": discourse_quality,
            "scenario_fit": scenario_fit,
            "scenario_required_points": (
                scenario_out.get("required_points") if scenario_out else None
            ),
            "scenario_format_sections": (
                scenario_out.get("format_sections") if scenario_out else None
            ),
            "scenario_unavailable": (
                scenario_out is not None and scenario_out.get("unavailable", False)
            ),
            "coherence_classification": analysis.coherence_classification,
            "topic_consistency_classification": analysis.topic_consistency_classification,
            "register_notes": style.register_notes,
            "issues": issues,
            "strengths": synthesis.strengths,
            "summary": synthesis.summary,
            "improved_structure": synthesis.improved_structure,
            "rewrites": synthesis.rewrites.model_dump(mode="json"),
            "structure_suggestion": (
                structure.model_dump(mode="json") if structure is not None else None
            ),
            "stages": stages,
        }

    async def _run_scenario_stage(
        self,
        scenario: WritingScenario,
        sentences: list[str],
        stages: list[dict[str, Any]],
        started: datetime,
        provider: str | None = None,
        model: str | None = None,
    ) -> dict[str, Any]:
        """Scenario-aware evaluation stage (isolated: failure degrades to
        scenario_unavailable, never breaks the normal evaluation)."""
        try:
            stage_provider, stage_model = self._scenario_eval_task(provider, model)
            system, user = build_scenario_evaluation_prompt(scenario, sentences)
            result, meta = await self._ai.generate_structured(
                user,
                ScenarioEvaluationResult,
                system=system,
                provider=stage_provider,
                model=stage_model,
                max_tokens=self._settings.ai_scenario_max_tokens,
            )
            assert isinstance(result, ScenarioEvaluationResult)
            required = [r.model_dump(mode="json") for r in result.required_points]
            sections = [s.model_dump(mode="json") for s in result.format_sections]
            dims = {
                "scenario_semantic_fit": result.scenario_semantic_fit,
                "audience_fit": result.audience_fit,
                "purpose_fit": result.purpose_fit,
                "tone_fit": result.tone_fit,
                "constraint_compliance": result.constraint_compliance,
            }
            stages.append(
                {
                    "stage": "scenario_evaluation",
                    "provider": meta.provider,
                    "model": meta.model,
                    "prompt_version": scenario_evaluation_prompt_version(),
                    "timestamp": started.isoformat(),
                }
            )
            return {
                "scores": dims,
                "scenario_fit": self._scenario_fit(dims),
                "required_points": required,
                "format_sections": sections,
                "strengths": list(result.strengths),
                "summary": result.summary,
                "unavailable": False,
            }
        except Exception as exc:  # noqa: BLE001 - scenario failure is isolated
            logger.warning("scenario evaluation unavailable genre=%s error=%s", scenario.genre, exc)
            return {
                "scores": {},
                "scenario_fit": None,
                "required_points": None,
                "format_sections": None,
                "strengths": [],
                "summary": "",
                "unavailable": True,
            }

    def _analysis_system_prompt(self) -> str:
        return "\n".join(
            [
                "You are the discourse judge of a Japanese writing tutor for "
                "Vietnamese learners. Evaluate the WHOLE text as one connected "
                "unit - never as a list of independent sentences.",
                build_coherence_section(),
                build_cohesion_section(),
                build_organization_section(),
                "Output the JSON object with fields: coherence_score (0-100), "
                "coherence_classification (excellent/good/acceptable/weak/poor), "
                "topic_consistency_classification "
                "(consistent/minor_drift/major_drift), cohesion_score, "
                "flow_score, organization_score, redundancy_score (each 0-100), "
                "structure_reorder_advice (string|null), issues (list of "
                "{category, severity, sentence_index, sentence_range, "
                "explanation, suggested_fix}).",
                "Respond with the JSON object only.",
            ]
        )

    @staticmethod
    def _analysis_user_prompt(
        exercise: Exercise,
        sentences: list[str],
        *,
        scenario: WritingScenario | None = None,
    ) -> str:
        numbered = "\n".join(f"{i}. {s}" for i, s in enumerate(sentences))
        lines = [format_exercise_input(exercise)]
        if scenario is not None:
            lines.append(format_scenario_context(scenario))
        lines += [
            "The learner's Japanese text, one sentence per line (index: text):",
            numbered,
            "",
            "Output the JSON object with fields: coherence_score, "
            "coherence_classification, topic_consistency_classification, "
            "cohesion_score, flow_score, organization_score, redundancy_score, "
            "structure_reorder_advice, issues.",
        ]
        return "\n".join(lines)

    @staticmethod
    def _has_critical(issues: list[dict]) -> bool:
        return any(i.get("severity") in ("major", "critical") for i in issues)

    # -- deterministic hints ---------------------------------------------------

    @staticmethod
    def _derive_hints(
        issues: list[dict],
        scenario_required_points: list[dict] | None = None,
    ) -> list[str]:
        hints: list[str] = []
        if scenario_required_points:
            for point in scenario_required_points:
                status = point.get("status")
                description = point.get("description", "")
                if status == "missing":
                    hints.append(f"Yêu cầu chưa được đề cập đến: {description}")
                elif status == "partially_satisfied":
                    hints.append(f"Yêu cầu mới chỉ được đề cập một phần: {description}")
        ordered = sorted(
            issues,
            key=lambda i: (
                {"critical": 0, "major": 1, "minor": 2, "info": 3}.get(i.get("severity"), 3),
                i.get("category", ""),
            ),
        )
        seen: set[str] = set()
        for issue in ordered:
            category = issue.get("category")
            if category in _HINT_TEMPLATES and category not in seen:
                hints.append(_HINT_TEMPLATES[category])
                seen.add(category)
            if len(hints) >= 6:
                break
        if not hints:
            hints = [_GENERIC_HINT]
        return hints[:6]

    # -- persistence ---------------------------------------------------------

    async def _persist_attempt(
        self,
        exercise: Exercise,
        text: str,
        sentence_scores: list[dict[str, Any]],
        discourse: dict[str, Any] | None,
        sentence_quality: int | None,
        revision_number: int,
    ) -> tuple[Any, dict[str, Any], list[str], WritingEvaluation]:
        attempt_number = await self._attempts.next_attempt_number(exercise.id)
        attempt = await self._attempts.add(
            ExerciseAttempt(
                exercise_id=exercise.id,
                attempt_number=attempt_number,
                answer_text=text,
            )
        )
        hints = self._derive_hints(
            [i for s in sentence_scores for i in s.get("issues", [])]
            + (list(discourse.get("issues", [])) if discourse else []),
            scenario_required_points=(
                discourse.get("scenario_required_points") if discourse else None
            ),
        )
        evaluation = self._aggregate_evaluation(
            exercise, sentence_scores, sentence_quality, discourse, hints
        )
        payload = evaluation.model_dump(mode="json")
        await self._feedback.add(
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
                evaluation_metadata={
                    "evaluation_version": DISCOURSE_VERSION,
                    "revision_number": revision_number,
                },
            )
        )
        return attempt, payload, hints, evaluation

    def _aggregate_evaluation(
        self,
        exercise: Exercise,
        sentence_scores: list[dict[str, Any]],
        sentence_quality: int | None,
        discourse: dict[str, Any] | None,
        hints: list[str],
    ) -> WritingEvaluation:
        sentence_level = bool(sentence_scores)

        def _avg(key: str) -> int:
            if not sentence_scores:
                return 0
            return round(sum(s[key] for s in sentence_scores) / len(sentence_scores))

        worst = min(sentence_scores, key=lambda s: s["overall_score"]) if sentence_scores else None
        discourse_quality = discourse.get("discourse_quality") if discourse else None
        scenario_fit = discourse.get("scenario_fit") if discourse else None
        if scenario_fit is not None and discourse_quality is not None:
            overall = self._blend(
                sentence_quality, self._scenario_combined(discourse_quality, scenario_fit)
            )
        else:
            overall = self._blend(sentence_quality, discourse_quality)
        dims = discourse.get("scores", {}) if discourse else {}

        issues: list[EvaluationIssue] = []
        for s in sentence_scores:
            for raw in s.get("issues", [])[:5]:
                issues.append(EvaluationIssue(**raw))
        if discourse:
            for raw in discourse.get("issues", [])[:10]:
                issues.append(
                    EvaluationIssue(
                        category="naturalness",
                        severity=raw.get("severity", "minor"),
                        original_text="(đoạn văn)",
                        explanation=raw.get("explanation", ""),
                        suggested_fix=raw.get("suggested_fix", ""),
                    )
                )
        issues = issues[:15]

        if discourse:
            rewrites = discourse["rewrites"]
            corrections = Corrections(
                correct_version=rewrites["minimal_fix"],
                natural_version=rewrites["natural_rewrite"],
                native_version=rewrites["native_rewrite"],
            )
        elif worst is not None:
            corrections = Corrections(**worst["corrections"])
        else:
            corrections = Corrections(
                correct_version="（không có dữ liệu đánh giá）",
                natural_version="（không có dữ liệu đánh giá）",
                native_version="（không có dữ liệu đánh giá）",
            )

        return WritingEvaluation(
            scores=EvaluationScores(
                overall_score=overall,
                semantic_score=_avg("semantic_score"),
                grammar_score=_avg("grammar_score"),
                vocabulary_score=_avg("vocabulary_score"),
                naturalness_score=_avg("naturalness_score"),
                context_fit_score=_avg("context_fit_score"),
                register_fit_score=dims.get("register_fit", _avg("register_fit_score")),
            ),
            semantic_classification=(
                worst["semantic_classification"] if worst is not None else "mostly_equivalent"
            ),
            semantic_omissions=[],
            semantic_additions=[],
            semantic_meaning_changes=[],
            semantic_confidence="high" if sentence_level else "low",
            grammar_confidence="high" if sentence_level else "low",
            vocabulary_confidence="high" if sentence_level else "low",
            naturalness_confidence="high" if sentence_level else "low",
            naturalness_classification=(
                worst["naturalness_classification"] if worst is not None else "acceptable"
            ),
            register_notes=discourse.get("register_notes") if discourse else None,
            issues=issues,
            corrections=corrections,
            hints=hints,
            summary=(
                discourse.get("summary", "")
                if discourse
                else (worst["summary"] if worst is not None else "Không có đánh giá.")
            ),
        )

    async def _persist_discourse(
        self,
        revision_id: str,
        discourse: dict[str, Any],
        sentence_scores: list[dict[str, Any]],
        sentence_quality: int | None,
    ) -> str:
        dims = discourse["scores"]
        scenario_fit = discourse.get("scenario_fit")
        if scenario_fit is not None:
            combined = self._scenario_combined(discourse["discourse_quality"], scenario_fit)
            overall_writing = self._blend(sentence_quality, combined)
        else:
            overall_writing = self._blend(sentence_quality, discourse["discourse_quality"])
        evaluation = await self._discourse.add(
            DiscourseEvaluation(
                revision_id=revision_id,
                sentence_quality=sentence_quality if sentence_quality is not None else 0,
                discourse_quality=discourse["discourse_quality"],
                overall_writing=overall_writing,
                scores={
                    **dims,
                    "scenario_fit": scenario_fit,
                    "scenario_required_points": discourse.get("scenario_required_points"),
                    "scenario_format_sections": discourse.get("scenario_format_sections"),
                    "scenario_unavailable": discourse.get("scenario_unavailable", False),
                },
                sentence_scores=sentence_scores,
                strengths=discourse["strengths"],
                summary=discourse["summary"],
                improved_structure=discourse["improved_structure"],
                rewrites=discourse["rewrites"],
                structure_suggestion=discourse["structure_suggestion"],
                evaluation_version=DISCOURSE_VERSION,
                provenance={
                    "provider": discourse["stages"][0]["provider"]
                    if discourse["stages"]
                    else "unknown",
                    "model": discourse["stages"][0]["model"] if discourse["stages"] else "unknown",
                    "evaluation_version": DISCOURSE_VERSION,
                    "stages": discourse["stages"],
                    "created_at": datetime.now(timezone.utc).isoformat(),
                },
                evaluated_at=datetime.now(timezone.utc),
            )
        )
        for number, raw in enumerate(discourse.get("issues", [])):
            await self._issues.add(
                DiscourseIssue(
                    evaluation_id=evaluation.id,
                    issue_number=number,
                    category=raw.get("category", "coherence"),
                    severity=raw.get("severity", "minor"),
                    sentence_index=raw.get("sentence_index"),
                    sentence_range=(
                        list(raw["sentence_range"]) if raw.get("sentence_range") else None
                    ),
                    explanation=raw.get("explanation", ""),
                    suggested_fix=raw.get("suggested_fix", ""),
                )
            )
        return evaluation.id

    # -- response building -----------------------------------------------------

    def _build_response(
        self,
        submission: WritingSubmission,
        exercise: Exercise,
        revision: WritingRevision,
        text: str,
        sentence_scores: list[dict[str, Any]],
        sentence_quality: int | None,
        discourse: dict[str, Any] | None,
        evaluation_id: str | None,
        *,
        hints: list[str],
        include_rewrites: bool,
    ) -> WritingEvaluationResponse:
        dims = discourse.get("scores", {}) if discourse else {}
        discourse_quality = discourse.get("discourse_quality") if discourse else None
        scenario_fit = discourse.get("scenario_fit") if discourse else None
        if scenario_fit is not None and discourse_quality is not None:
            overall = self._blend(
                sentence_quality, self._scenario_combined(discourse_quality, scenario_fit)
            )
        else:
            overall = self._blend(sentence_quality, discourse_quality)
        hints_total = len(hints)
        learning_mode_enabled = self._settings.ai_exercise_learning_mode_enabled
        reveal_available = (
            revision.revealed
            or not learning_mode_enabled
            or (revision.hints_revealed_count >= hints_total)
        )
        return WritingEvaluationResponse(
            submission_id=submission.id,
            revision_number=revision.revision_number,
            revision_id=revision.id,
            attempt_id=revision.attempt_id or "",
            exercise_id=exercise.id,
            exercise_type=exercise.exercise_type.value,
            target_length=exercise.target_length.value,
            register=exercise.register.value,
            text=text,
            sentence_count=revision.sentence_count,
            scores=WritingScores(
                sentence_quality=sentence_quality if sentence_quality is not None else 0,
                discourse_quality=discourse_quality if discourse_quality is not None else 0,
                overall_writing=overall,
                coherence_score=dims.get("coherence", 0),
                cohesion_score=dims.get("cohesion", 0),
                organization_score=dims.get("organization", 0),
                flow_score=dims.get("flow", 0),
                style_consistency_score=dims.get("style_consistency", 0),
                redundancy_score=dims.get("redundancy", 0),
                scenario_fit=scenario_fit,
                scenario_semantic_fit=dims.get("scenario_semantic_fit"),
                audience_fit=dims.get("audience_fit"),
                purpose_fit=dims.get("purpose_fit"),
                tone_fit=dims.get("tone_fit"),
                constraint_compliance=dims.get("constraint_compliance"),
            ),
            strengths=discourse.get("strengths", []) if discourse else [],
            summary=(
                discourse.get("summary", "")
                if discourse
                else (
                    min(sentence_scores, key=lambda s: s["overall_score"])["summary"]
                    if sentence_scores
                    else "Không có đánh giá."
                )
            ),
            issues=[
                DiscourseIssueOut(**i) for i in (discourse.get("issues", []) if discourse else [])
            ],
            sentence_scores=[
                SentenceScore(
                    index=s["index"],
                    text=s["text"],
                    overall_score=s["overall_score"],
                    semantic_score=s["semantic_score"],
                    grammar_score=s["grammar_score"],
                    vocabulary_score=s["vocabulary_score"],
                    naturalness_score=s["naturalness_score"],
                    context_fit_score=s["context_fit_score"],
                    register_fit_score=s["register_fit_score"],
                    issues=s.get("issues", []),
                    summary=s.get("summary", ""),
                )
                for s in sentence_scores
            ],
            improved_structure=discourse.get("improved_structure") if discourse else None,
            rewrites=(
                self._rewrites_out(discourse["rewrites"])
                if discourse and (include_rewrites or revision.revealed)
                else None
            ),
            structure_suggestion=discourse.get("structure_suggestion") if discourse else None,
            scenario_required_points=(
                discourse.get("scenario_required_points") if discourse else None
            ),
            scenario_format_sections=(
                discourse.get("scenario_format_sections") if discourse else None
            ),
            scenario_unavailable=(
                bool(discourse.get("scenario_unavailable")) if discourse else None
            ),
            learning_mode={
                "enabled": learning_mode_enabled,
                "hints_revealed_count": revision.hints_revealed_count,
                "hints_total": hints_total,
                "reveal_available": reveal_available,
            },
            discourse_available=discourse is not None,
            status=revision.status,
            created_at=revision.created_at,
            provenance=(
                Provenance(
                    provider=discourse["stages"][0]["provider"],
                    model=discourse["stages"][0]["model"],
                    evaluation_version=DISCOURSE_VERSION,
                    stages=discourse["stages"],
                    created_at=datetime.now(timezone.utc),
                )
                if discourse and discourse.get("stages")
                else None
            ),
        )

    @staticmethod
    def _rewrites_out(rewrites: dict[str, Any]) -> Any:
        from app.schemas.discourse_ai import Rewrites

        return Rewrites(
            minimal_fix=rewrites["minimal_fix"],
            natural_rewrite=rewrites["natural_rewrite"],
            native_rewrite=rewrites["native_rewrite"],
            professional_rewrite=rewrites.get("professional_rewrite"),
        )

    # -- read APIs -------------------------------------------------------------

    async def evaluation_response(
        self, submission: WritingSubmission, exercise: Exercise, revision: WritingRevision
    ) -> WritingEvaluationResponse:
        """Rebuild the persisted evaluation (never re-triggers the AI)."""
        evaluation = await self._discourse.get_by_revision(revision.id)
        rows = await self._issues.list_by_evaluation(evaluation.id) if evaluation else []
        issues = [
            {
                "category": row.category,
                "severity": row.severity,
                "sentence_index": row.sentence_index,
                "sentence_range": list(row.sentence_range) if row.sentence_range else None,
                "explanation": row.explanation,
                "suggested_fix": row.suggested_fix,
            }
            for row in rows
        ]
        discourse = (
            {
                "scores": dict(evaluation.scores or {}),
                "discourse_quality": evaluation.discourse_quality,
                "scenario_fit": (evaluation.scores or {}).get("scenario_fit"),
                "scenario_required_points": (evaluation.scores or {}).get(
                    "scenario_required_points"
                ),
                "scenario_format_sections": (evaluation.scores or {}).get(
                    "scenario_format_sections"
                ),
                "scenario_unavailable": bool(
                    (evaluation.scores or {}).get("scenario_unavailable", False)
                ),
                "strengths": list(evaluation.strengths or []),
                "summary": evaluation.summary,
                "improved_structure": evaluation.improved_structure,
                "rewrites": dict(evaluation.rewrites or {}),
                "structure_suggestion": dict(evaluation.structure_suggestion or {}),
                "issues": issues,
                "stages": (evaluation.provenance or {}).get("stages", []),
                "register_notes": (evaluation.scores or {}).get("register_notes"),
            }
            if evaluation
            else None
        )
        sentence_scores = [
            dict(s) for s in (evaluation.sentence_scores if evaluation else []) or []
        ]
        sentence_quality = evaluation.sentence_quality if evaluation else None
        hints = self._derive_hints(
            [i for s in sentence_scores for i in s.get("issues", [])]
            + (issues if evaluation else []),
            scenario_required_points=(
                (evaluation.scores or {}).get("scenario_required_points") if evaluation else None
            ),
        )
        include_rewrites = not self._settings.ai_exercise_learning_mode_enabled
        return self._build_response(
            submission,
            exercise,
            revision,
            revision.text,
            sentence_scores,
            sentence_quality,
            discourse,
            evaluation.id if evaluation else None,
            hints=hints,
            include_rewrites=include_rewrites,
        )

    # -- learning-mode state ----------------------------------------------------

    async def next_hint(
        self, submission: WritingSubmission, exercise: Exercise, revision: WritingRevision
    ) -> tuple[str, int, int]:
        """Reveal the next deterministic discourse hint (never AI)."""
        response = await self.evaluation_response(submission, exercise, revision)
        hints = self._derive_hints(
            [i.model_dump(mode="json") for i in response.issues]
            + [i for s in response.sentence_scores for i in s.issues],
            scenario_required_points=response.scenario_required_points,
        )
        total = len(hints)
        index = revision.hints_revealed_count
        if index >= total:
            return "", total, total
        revision.hints_revealed_count = index + 1
        await self._revisions.update(revision)
        return hints[index], index + 1, total

    async def reveal(
        self, submission: WritingSubmission, exercise: Exercise, revision: WritingRevision
    ) -> dict[str, Any]:
        """Explicitly reveal the rewrites (idempotent, learning-mode gate)."""
        if not revision.revealed:
            revision.revealed = True
            await self._revisions.update(revision)
        evaluation = await self._discourse.get_by_revision(revision.id)
        rewrites: dict[str, Any] | None = None
        if evaluation is not None and evaluation.rewrites:
            rewrites = dict(evaluation.rewrites)
        return {
            "submission_id": submission.id,
            "revision_number": revision.revision_number,
            "rewrites": rewrites,
            "revealed": True,
        }

    # -- compare ---------------------------------------------------------------

    async def compare(
        self,
        submission: WritingSubmission,
        from_revision: int,
        to_revision: int,
    ) -> dict[str, Any]:
        if from_revision >= to_revision:
            raise EvaluationError("from_revision must be smaller than to_revision")
        before = await self._revisions.get_by_submission(submission.id, from_revision)
        after = await self._revisions.get_by_submission(submission.id, to_revision)
        if before is None or after is None:
            raise EvaluationError("requested revisions do not exist")
        before_eval = await self._discourse.get_by_revision(before.id)
        after_eval = await self._discourse.get_by_revision(after.id)
        if before_eval is None or after_eval is None:
            raise EvaluationError("one of the revisions has no discourse evaluation")

        deltas = {
            "overall_writing": after_eval.overall_writing - before_eval.overall_writing,
            "sentence_quality": after_eval.sentence_quality - before_eval.sentence_quality,
            "discourse_quality": after_eval.discourse_quality - before_eval.discourse_quality,
        }
        for key in (
            "coherence",
            "cohesion",
            "organization",
            "flow",
            "style_consistency",
            "redundancy",
        ):
            deltas[key] = int(after_eval.scores.get(key, 0)) - int(before_eval.scores.get(key, 0))

        diff = self._sentence_diff(before.text, after.text)
        guidance = None
        guidance_version = None
        if self._settings.ai_long_form_revision_guidance_enabled:
            try:
                provider, model = self._task()
                result, _ = await self._ai.generate_structured(
                    build_revision_guidance_prompt(before.text, after.text, deltas, diff)[1],
                    RevisionGuidanceResult,
                    system=build_revision_guidance_prompt(before.text, after.text, deltas, diff)[0],
                    provider=provider,
                    model=model,
                    max_tokens=self._settings.ai_long_form_max_tokens,
                )
                assert isinstance(result, RevisionGuidanceResult)
                guidance = result.summary
                guidance_version = revision_guidance_prompt_version()
            except Exception as exc:
                logger.warning("revision guidance failed error=%s (deterministic fallback)", exc)
        if guidance is None:
            guidance = self._deterministic_guidance(deltas, from_revision, to_revision)
        return {
            "submission_id": submission.id,
            "from_revision": from_revision,
            "to_revision": to_revision,
            "deltas": deltas,
            "sentence_diff": diff,
            "guidance": guidance,
            "guidance_version": guidance_version,
        }

    @staticmethod
    def _sentence_diff(before: str, after: str) -> dict[str, list[str]]:
        before_sentences = split_sentences(before)
        after_sentences = split_sentences(after)
        matcher = difflib.SequenceMatcher(None, before_sentences, after_sentences)
        added: list[str] = []
        removed: list[str] = []
        changed: list[str] = []
        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == "insert":
                added.extend(after_sentences[j1:j2])
            elif tag == "delete":
                removed.extend(before_sentences[i1:i2])
            elif tag == "replace":
                if i2 - i1 == 1 and j2 - j1 == 1:
                    changed.append(f"{before_sentences[i1]} -> {after_sentences[j1]}")
                else:
                    removed.extend(before_sentences[i1:i2])
                    added.extend(after_sentences[j1:j2])
        return {"added": added, "removed": removed, "changed": changed}

    @staticmethod
    def _deterministic_guidance(
        deltas: dict[str, int], from_revision: int, to_revision: int
    ) -> str:
        overall = deltas.get("overall_writing", 0)
        if overall >= 5:
            message = "Điểm tổng thể tăng đáng kể - bản sửa đã cải thiện rõ rệt."
        elif overall > 0:
            message = "Điểm tổng thể có tiến bộ nhẹ so với bản trước."
        elif overall == 0:
            message = "Điểm tổng thể giữ nguyên giữa hai bản."
        else:
            message = "Điểm tổng thể giảm so với bản trước - xem lại phần nhận xét."
        improved = [k for k, v in deltas.items() if v >= 5]
        if improved:
            message += " Cải thiện rõ ở: " + ", ".join(improved) + "."
        return message

    # -- coach -----------------------------------------------------------------

    async def coach(
        self,
        exercise: Exercise,
        submission: WritingSubmission,
        question: str,
        *,
        profile_block: str = "",
        vocabulary_block: str = "",
        memory_block: str = "",
        provider: str | None = None,
        model: str | None = None,
    ) -> dict[str, Any]:
        """Answer a bounded question about the draft (never a general chatbot)."""
        revision = await self._latest_revision(submission.id)
        evaluation = await self._discourse.get_by_revision(revision.id)
        if evaluation is None:
            raise EvaluationError("no discourse evaluation available for this submission")
        stage_provider, stage_model = self._coach_task(provider, model)
        dims = dict(evaluation.scores or {})
        issues = await self._issues.list_by_evaluation(evaluation.id)
        issue_summary = "; ".join(f"{i.category}: {i.explanation[:80]}" for i in issues[:5])
        scenario = await self._load_scenario(exercise)
        if scenario is not None:
            system, user = build_scenario_coach_prompt(
                scenario,
                revision.text,
                evaluation.summary,
                issue_summary,
                profile_block,
                question,
                memory_block=memory_block,
            )
        else:
            system, user = build_discourse_coach_prompt(
                exercise,
                revision.text,
                evaluation.summary,
                dims,
                issue_summary,
                profile_block,
                vocabulary_block,
                question,
                memory_block=memory_block,
            )
        result, _ = await self._ai.generate_structured(
            user,
            DiscourseCoachResult,
            system=system,
            provider=stage_provider,
            model=stage_model,
            max_tokens=self._settings.ai_long_form_max_tokens,
        )
        assert isinstance(result, DiscourseCoachResult)
        return {"answer": result.answer, "suggestions": list(result.suggestions)}

    async def _latest_revision(self, submission_id: str) -> WritingRevision:
        revisions = await self._revisions.list_by_submission(submission_id)
        if not revisions:
            raise EvaluationError("submission has no revisions")
        return revisions[-1]
