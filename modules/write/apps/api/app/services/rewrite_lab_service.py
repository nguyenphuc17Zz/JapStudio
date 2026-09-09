"""Rewrite Lab & Self-Correction Engine (Phase 19).

Orchestrates the 6-step review pipeline, multi-mode rewrite transformations,
transfer check generator & evaluator, linguistic diff analysis, and Socratic coaching.
"""

from __future__ import annotations

from datetime import datetime
import logging
from typing import Any

from sqlalchemy import select

from app.core.config import Settings, get_settings
from app.models import (
    Exercise,
    ExerciseAttempt,
    SimulationTurn,
    WritingFeedback,
    WritingRevision,
    WritingSubmission,
    WritingWeakness,
)
from app.models.rewrite_lab import RewriteLabSession
from app.prompts.diff_explanation import (
    build_diff_explanation_prompt,
)
from app.prompts.rewrite_modes_generation import (
    build_rewrite_variants_prompt,
    build_single_mode_prompt,
)
from app.prompts.self_correction_detection import (
    build_self_correction_detection_prompt,
)
from app.prompts.self_correction_evaluation import (
    build_self_correction_evaluation_prompt,
)
from app.prompts.socratic_coach import (
    build_socratic_coach_prompt,
)
from app.prompts.transfer_evaluation import (
    build_transfer_evaluation_prompt,
)
from app.prompts.transfer_task_generation import (
    build_transfer_task_prompt,
)
from app.repositories.rewrite_lab import RewriteLabRepository
from app.schemas.rewrite_lab_ai import (
    DiffExplanationResult,
    IssueDetectionResult,
    RewriteModeResult,
    RewriteVariantsResult,
    SelfCorrectionAttemptResult,
    SocraticCoachResult,
    TransferEvaluationResult,
    TransferTaskResult,
)
from app.services.ai_service import AIService

logger = logging.getLogger("app.rewrite_lab")


class RewriteLabService:
    """Core domain service for Self-Correction & Rewrite Laboratory."""

    def __init__(
        self,
        repository: RewriteLabRepository,
        ai_service: AIService,
        settings: Settings | None = None,
    ) -> None:
        self._repo = repository
        self._ai = ai_service
        self._settings = settings or get_settings()

    # -- 1. Review Pipeline: Step 1 & 2 (Session Initiation) -----------------

    async def start_session(
        self,
        text: str,
        context_vi: str | None = None,
        source_type: str = "standalone",
        source_id: str | None = None,
        user_id: str | None = None,
        provider: str | None = None,
        model: str | None = None,
    ) -> RewriteLabSession:
        """Analyzes Japanese text, detects the primary issue, explains the category, and initializes session."""
        sys_prompt, user_prompt = build_self_correction_detection_prompt(
            text=text, context_vi=context_vi
        )
        detection, _ = await self._ai.generate_structured(
            prompt=user_prompt,
            response_model=IssueDetectionResult,
            system=sys_prompt,
            provider=provider or self._settings.ai_exercise_evaluation_provider or None,
            model=model or self._settings.ai_exercise_evaluation_model or None,
            temperature=0.2,
        )

        session = RewriteLabSession(
            user_id=user_id,
            source_type=source_type,
            source_id=source_id,
            original_text=text,
            context_vi=context_vi,
            has_issue=detection.has_issue,
            issue_category=detection.category if detection.has_issue else None,
            issue_category_name_vi=detection.category_name_vi if detection.has_issue else "Chính xác",
            issue_explanation_vi=detection.category_explanation_vi,
            target_concept=detection.target_concept,
            target_segment=detection.target_segment,
            current_step=2,  # Step 2: Category Explained, awaiting Step 3 Attempt #1
            status="active" if detection.has_issue else "self_corrected",
            attempts=[],
            transfer_attempts=[],
        )
        return await self._repo.add(session)

    # -- 2. Review Pipeline: Steps 3, 4, 5 (Submit Self-Correction Attempt) --

    async def submit_attempt(
        self,
        session: RewriteLabSession,
        attempt_text: str,
        provider: str | None = None,
        model: str | None = None,
    ) -> tuple[SelfCorrectionAttemptResult, RewriteLabSession]:
        """Evaluates a learner's self-correction attempt with semantic delta check."""
        previous_texts = [att.get("text", "") for att in session.attempts or []]
        attempt_count = len(previous_texts) + 1

        sys_prompt, user_prompt = build_self_correction_evaluation_prompt(
            original_text=session.original_text,
            attempt_text=attempt_text,
            target_concept=session.target_concept or "Japanese writing naturalness",
            current_step=session.current_step,
            attempt_count=attempt_count,
            context_vi=session.context_vi,
            previous_attempts=previous_texts,
        )

        eval_result, _ = await self._ai.generate_structured(
            prompt=user_prompt,
            response_model=SelfCorrectionAttemptResult,
            system=sys_prompt,
            provider=provider or self._settings.ai_exercise_evaluation_provider or None,
            model=model or self._settings.ai_exercise_evaluation_model or None,
            temperature=0.2,
        )

        # Update attempt record
        new_attempts = list(session.attempts or [])
        attempt_entry = {
            "attempt_number": attempt_count,
            "text": attempt_text,
            "is_correct": eval_result.is_correct,
            "is_improved": eval_result.is_improved,
            "score": eval_result.score,
            "improvement_status": eval_result.improvement_status,
            "quality_delta": eval_result.quality_delta,
            "feedback_vi": eval_result.feedback_vi,
            "remaining_issues": eval_result.remaining_issues,
            "step_evaluated_at": session.current_step,
        }
        new_attempts.append(attempt_entry)
        session.attempts = new_attempts

        # Advance progressive ladder
        if eval_result.is_correct:
            session.status = "self_corrected"
        else:
            if eval_result.next_step_action == "advance_to_clue":
                session.current_step = 4
                if eval_result.next_clue:
                    session.clue = eval_result.next_clue
            elif eval_result.next_step_action == "advance_to_pattern":
                session.current_step = 5
                if eval_result.next_pattern:
                    session.pattern = eval_result.next_pattern
            elif eval_result.next_step_action == "advance_to_reveal":
                session.current_step = 6

        updated_session = await self._repo.update(session)
        return eval_result, updated_session

    # -- 3. Review Pipeline: Step 6 (Reveal Controlled Comparison) ------------

    async def reveal_rewrites(
        self,
        session: RewriteLabSession,
        provider: str | None = None,
        model: str | None = None,
    ) -> tuple[RewriteVariantsResult, RewriteLabSession]:
        """Generates controlled 4-way comparison variants and requires synthesis."""
        sys_prompt, user_prompt = build_rewrite_variants_prompt(
            text=session.original_text,
            context_vi=session.context_vi,
            target_concept=session.target_concept,
        )
        variants, _ = await self._ai.generate_structured(
            prompt=user_prompt,
            response_model=RewriteVariantsResult,
            system=sys_prompt,
            provider=provider or self._settings.ai_exercise_evaluation_provider or None,
            model=model or self._settings.ai_exercise_evaluation_model or None,
            temperature=0.3,
        )

        session.current_step = 6
        if session.status == "active":
            session.status = "revealed"
        session.revealed_variants = variants.model_dump()

        updated_session = await self._repo.update(session)
        return variants, updated_session

    # -- 4. Step 7: Transfer Check (Task Generation & Evaluation) -------------

    async def generate_transfer_task(
        self,
        session: RewriteLabSession,
        profile_block: str = "",
        memory_block: str = "",
        provider: str | None = None,
        model: str | None = None,
    ) -> tuple[TransferTaskResult, RewriteLabSession]:
        """Generates a novel scenario testing the same underlying concept."""
        target = session.target_concept or "Japanese writing naturalness"
        sys_prompt, user_prompt = build_transfer_task_prompt(
            target_concept=target,
            original_text=session.original_text,
            profile_block=profile_block,
            memory_block=memory_block,
        )
        task, _ = await self._ai.generate_structured(
            prompt=user_prompt,
            response_model=TransferTaskResult,
            system=sys_prompt,
            provider=provider or self._settings.ai_exercise_generation_provider or None,
            model=model or self._settings.ai_exercise_generation_model or None,
            temperature=0.5,
        )

        session.transfer_task = task.model_dump()
        updated_session = await self._repo.update(session)
        return task, updated_session

    async def submit_transfer_attempt(
        self,
        session: RewriteLabSession,
        transfer_text: str,
        provider: str | None = None,
        model: str | None = None,
    ) -> tuple[TransferEvaluationResult, RewriteLabSession]:
        """Evaluates whether the transfer sentence correctly applies the target pattern."""
        task_data = session.transfer_task or {}
        scenario_prompt = task_data.get("scenario_prompt_vi", "Viết câu áp dụng mẫu đã học")
        required_pattern = task_data.get("required_pattern", session.target_concept or "")

        sys_prompt, user_prompt = build_transfer_evaluation_prompt(
            scenario_prompt_vi=scenario_prompt,
            required_pattern=required_pattern,
            transfer_text=transfer_text,
        )
        eval_result, _ = await self._ai.generate_structured(
            prompt=user_prompt,
            response_model=TransferEvaluationResult,
            system=sys_prompt,
            provider=provider or self._settings.ai_exercise_evaluation_provider or None,
            model=model or self._settings.ai_exercise_evaluation_model or None,
            temperature=0.2,
        )

        new_transfers = list(session.transfer_attempts or [])
        new_transfers.append({
            "text": transfer_text,
            "transferred_successfully": eval_result.transferred_successfully,
            "pattern_applied_correctly": eval_result.pattern_applied_correctly,
            "score": eval_result.score,
            "feedback_vi": eval_result.feedback_vi,
            "strengths": eval_result.strengths,
            "improvement_points": eval_result.improvement_points,
            "exemplar_sentence": eval_result.exemplar_sentence,
        })
        session.transfer_attempts = new_transfers

        if eval_result.transferred_successfully:
            session.status = "completed"

        updated_session = await self._repo.update(session)
        return eval_result, updated_session

    # -- 5. Multi-Mode Rewrite Transformations --------------------------------

    async def transform_mode(
        self,
        text: str,
        mode: str,
        target_register: str | None = None,
        context_vi: str | None = None,
        provider: str | None = None,
        model: str | None = None,
    ) -> RewriteModeResult:
        """Transforms a sentence according to 1 of 6 rewrite modes."""
        sys_prompt, user_prompt = build_single_mode_prompt(
            text=text,
            mode=mode,
            target_register=target_register,
            context_vi=context_vi,
        )
        result, _ = await self._ai.generate_structured(
            prompt=user_prompt,
            response_model=RewriteModeResult,
            system=sys_prompt,
            provider=provider or self._settings.ai_exercise_generation_provider or None,
            model=model or self._settings.ai_exercise_generation_model or None,
            temperature=0.3,
        )
        return result

    # -- 6. Linguistic Diff & Grammar Reasoning ------------------------------

    async def explain_diff(
        self,
        before: str,
        after: str,
        provider: str | None = None,
        model: str | None = None,
    ) -> DiffExplanationResult:
        """Analyzes differences between two sentences with grammatical rationales."""
        sys_prompt, user_prompt = build_diff_explanation_prompt(before=before, after=after)
        result, _ = await self._ai.generate_structured(
            prompt=user_prompt,
            response_model=DiffExplanationResult,
            system=sys_prompt,
            provider=provider or self._settings.ai_exercise_evaluation_provider or None,
            model=model or self._settings.ai_exercise_evaluation_model or None,
            temperature=0.2,
        )
        return result

    # -- 7. Context-Aware Socratic AI Coach -----------------------------------

    async def ask_socratic_coach(
        self,
        question: str,
        session: RewriteLabSession | None = None,
        current_weakness: str | None = None,
        mastery_level: str | None = None,
        profile_block: str = "",
        memory_block: str = "",
        provider: str | None = None,
        model: str | None = None,
    ) -> SocraticCoachResult:
        """Answers questions Socratically with full awareness of learner history & weaknesses."""
        original_text = session.original_text if session else None
        target_concept = session.target_concept if session else None
        failed_attempts = (
            [att.get("text", "") for att in session.attempts or [] if not att.get("is_correct")]
            if session
            else None
        )

        sys_prompt, user_prompt = build_socratic_coach_prompt(
            question=question,
            original_text=original_text,
            target_concept=target_concept,
            current_weakness=current_weakness or (session.issue_category if session else None),
            failed_attempts=failed_attempts,
            mastery_level=mastery_level,
            profile_block=profile_block,
            memory_block=memory_block,
        )
        result, _ = await self._ai.generate_structured(
            prompt=user_prompt,
            response_model=SocraticCoachResult,
            system=sys_prompt,
            provider=provider or self._settings.ai_exercise_evaluation_provider or None,
            model=model or self._settings.ai_exercise_evaluation_model or None,
            temperature=0.4,
        )
        return result

    async def get_recent_snippets(
        self,
        user_id: str | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """Fetch recent Japanese sentence snippets from practice, challenges, free writing, simulations, and weaknesses."""
        snippets: list[dict[str, Any]] = []

        try:
            # 1. Recent Exercise & Challenge Attempts
            stmt_attempts = (
                select(ExerciseAttempt, Exercise, WritingFeedback)
                .join(Exercise, ExerciseAttempt.exercise_id == Exercise.id)
                .outerjoin(WritingFeedback, WritingFeedback.attempt_id == ExerciseAttempt.id)
                .order_by(ExerciseAttempt.created_at.desc())
                .limit(limit)
            )
            if user_id:
                stmt_attempts = stmt_attempts.where(ExerciseAttempt.user_id == user_id)
            res_attempts = await self._repo.session.execute(stmt_attempts)
            for att, ex, fb in res_attempts.all():
                ans_text = getattr(att, "answer_text", None)
                if ans_text and len(ans_text.strip()) > 0:
                    issue_str = None
                    if fb and fb.evaluation and isinstance(fb.evaluation, dict):
                        issues = fb.evaluation.get("issues")
                        if issues and isinstance(issues, list) and len(issues) > 0:
                            first_issue = issues[0]
                            if isinstance(first_issue, dict):
                                issue_str = first_issue.get("explanation") or first_issue.get("reason")
                        if not issue_str:
                            corrections = fb.evaluation.get("corrections")
                            if corrections and isinstance(corrections, dict):
                                issue_str = corrections.get("explanation_vi")
                        if not issue_str and fb.evaluation.get("register_notes"):
                            issue_str = fb.evaluation.get("register_notes")

                    is_challenge = False
                    if ex.generation_metadata and isinstance(ex.generation_metadata, dict):
                        if ex.generation_metadata.get("source") == "challenge":
                            is_challenge = True

                    source_title = ex.topic or "Bài tập dịch"
                    if is_challenge:
                        ch_type = ex.generation_metadata.get("challenge_type", "Thử thách")
                        source_title = f"Thử thách ({ch_type})"

                    snippets.append({
                        "id": f"att_{att.id}",
                        "text": ans_text.strip(),
                        "source_type": "challenge" if is_challenge else "practice",
                        "source_title": source_title,
                        "context_vi": ex.prompt_vi,
                        "issue_preview": issue_str,
                        "created_at": att.created_at,
                    })
        except Exception as exc:
            logger.warning("Failed to fetch recent attempts for snippets: %s", exc)

        try:
            # 2. Recent Writing Submissions / Free writing
            stmt_subs = (
                select(WritingRevision, WritingSubmission, Exercise)
                .join(WritingSubmission, WritingRevision.submission_id == WritingSubmission.id)
                .join(Exercise, WritingSubmission.exercise_id == Exercise.id)
                .order_by(WritingRevision.created_at.desc())
                .limit(5)
            )
            if user_id:
                stmt_subs = stmt_subs.where(WritingSubmission.user_id == user_id)
            res_subs = await self._repo.session.execute(stmt_subs)
            for rev, sub, ex in res_subs.all():
                rev_text = getattr(rev, "text", None)
                if rev_text and len(rev_text.strip()) > 0:
                    snippet_text = rev_text.strip().split("\n")[0][:200]
                    snippets.append({
                        "id": f"sub_{rev.id}",
                        "text": snippet_text,
                        "source_type": "free_writing",
                        "source_title": ex.topic or "Bài viết tự do",
                        "context_vi": ex.prompt_vi,
                        "issue_preview": None,
                        "created_at": rev.created_at,
                    })
        except Exception as exc:
            logger.warning("Failed to fetch recent writing submissions for snippets: %s", exc)

        try:
            # 3. Recent Simulation Turns
            stmt_sims = (
                select(SimulationTurn)
                .where(SimulationTurn.actor.in_(("learner", "user")))
                .order_by(SimulationTurn.created_at.desc())
                .limit(5)
            )
            res_sims = await self._repo.session.execute(stmt_sims)
            for turn in res_sims.scalars().all():
                turn_text = getattr(turn, "text", None)
                if turn_text and len(turn_text.strip()) > 0:
                    snippets.append({
                        "id": f"turn_{turn.id}",
                        "text": turn_text.strip(),
                        "source_type": "simulation",
                        "source_title": "Hội thoại mô phỏng",
                        "context_vi": None,
                        "issue_preview": None,
                        "created_at": turn.created_at,
                    })
        except Exception as exc:
            logger.warning("Failed to fetch recent simulation turns for snippets: %s", exc)

        try:
            # 4. Diagnosed Weakness Snippets
            stmt_weaknesses = (
                select(WritingWeakness)
                .order_by(WritingWeakness.updated_at.desc())
                .limit(5)
            )
            if user_id:
                stmt_weaknesses = stmt_weaknesses.where(WritingWeakness.user_id == user_id)
            res_weaknesses = await self._repo.session.execute(stmt_weaknesses)
            for w in res_weaknesses.scalars().all():
                examples = getattr(w, "examples", None)
                if examples and isinstance(examples, list):
                    for idx_s, snip in enumerate(examples[:2]):
                        text_val = ""
                        if isinstance(snip, str):
                            text_val = snip.strip()
                        elif isinstance(snip, dict):
                            text_val = (snip.get("original") or snip.get("text") or "").strip()
                        if text_val:
                            snippets.append({
                                "id": f"weak_{w.id}_{idx_s}",
                                "text": text_val,
                                "source_type": "weakness",
                                "source_title": f"Điểm yếu: {w.subtype or w.category}",
                                "context_vi": w.description,
                                "issue_preview": w.description,
                                "created_at": w.updated_at,
                            })
        except Exception as exc:
            logger.warning("Failed to fetch weakness snippets: %s", exc)

        # Sort combined snippets by created_at desc
        snippets.sort(key=lambda s: s.get("created_at") or datetime.min, reverse=True)
        return snippets[:limit]
