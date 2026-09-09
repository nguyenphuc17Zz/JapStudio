"""Persistent Error & Mastery Engine (Phase 17).

Core domain service implementing evidence-based mastery aggregation,
7-state lifecycle state machine with regression, delayed retest scheduling,
context generalization scoring, register diversity tracking, and AI narrative synthesis.
"""

from __future__ import annotations

import logging
import math
from datetime import datetime, timedelta, timezone

from app.core.config import Settings, get_settings
from app.models.writing_intelligence import WritingWeakness
from app.prompts.weakness_narrative import (
    build_weakness_narrative_prompt,
)
from app.schemas.writing_intelligence import (
    DueRetestOut,
    EvidenceSummaryOut,
    MasteryEvidenceOut,
    MasteryNarrativeOut,
    WeaknessDetailOut,
)
from app.schemas.writing_intelligence_ai import MasteryNarrativeResult
from app.services.ai_service import AIService

logger = logging.getLogger("app.mastery_engine")

ALL_CONTEXT_TYPES = [
    "sentence_translation",
    "rewrite",
    "scenario_writing",
    "simulation",
    "free_writing",
    "unseen_context",
]

LIFECYCLE_STATES = [
    "new",
    "observed",
    "recurring",
    "targeted",
    "improving",
    "stable",
    "mastered",
    "recurrent",
]

STATUS_MAPPING = {
    "new": "new",
    "observed": "new",
    "recurring": "recurring",
    "targeted": "persistent",
    "improving": "improving",
    "stable": "improving",
    "mastered": "mastered",
    "recurrent": "regressed",
}


class WritingMasteryEngine:
    """Deterministic mastery & error lifecycle engine."""

    def __init__(
        self,
        settings: Settings | None = None,
        ai_service: AIService | None = None,
    ) -> None:
        self._settings = settings or get_settings()
        self._ai = ai_service or AIService(settings=self._settings)

    # -- Context Type Resolver -----------------------------------------------

    @staticmethod
    def resolve_context_type(
        source_type: str | None = None,
        exercise_type: str | None = None,
        explicit_context: str | None = None,
    ) -> str:
        """Deterministically map source & exercise metadata to a standard writing context type."""
        if explicit_context and explicit_context in ALL_CONTEXT_TYPES:
            return explicit_context

        if source_type in ("discourse_evaluation", "long_form", "free_writing"):
            return "free_writing"
        if source_type in ("simulation_evaluation", "simulation_turn"):
            return "simulation"
        if source_type in ("scenario_evaluation", "scenario_practice"):
            return "scenario_writing"
        if source_type in ("rewrite_evaluation", "correction_success"):
            return "rewrite"

        if exercise_type:
            ex_str = str(exercise_type).lower()
            if "free_writing" in ex_str or "discourse" in ex_str or "long_form" in ex_str:
                return "free_writing"
            if "scenario" in ex_str:
                return "scenario_writing"
            if "simulation" in ex_str:
                return "simulation"
            if "rewrite" in ex_str or "correction" in ex_str:
                return "rewrite"
            if "sentence_translation" in ex_str or "translation" in ex_str:
                return "sentence_translation"

        return "sentence_translation"

    # -- Deterministic Evidence Computation ----------------------------------

    def compute_evidence(
        self, weakness: WritingWeakness, now: datetime | None = None
    ) -> MasteryEvidenceOut:
        """Compute full deterministic evidence metrics for a weakness."""
        now = now or datetime.now(timezone.utc)
        correct_by_ctx: dict[str, int] = dict(weakness.correct_count_by_context or {})
        incorrect_by_ctx: dict[str, int] = dict(weakness.incorrect_count_by_context or {})

        context_scores: dict[str, float] = {}
        contexts_passed: list[str] = []
        contexts_failed: list[str] = []

        for ctx in ALL_CONTEXT_TYPES:
            cor = correct_by_ctx.get(ctx, 0)
            inc = incorrect_by_ctx.get(ctx, 0)
            tot = cor + inc
            if tot > 0:
                score = round(float(cor) / float(tot), 2)
                context_scores[ctx] = score
                if cor >= 1:
                    contexts_passed.append(ctx)
                elif inc >= 1 and cor == 0:
                    contexts_failed.append(ctx)

        # Context Generalization Score: ratio of passed contexts over total tracked types
        context_diversity = round(
            min(float(len(contexts_passed)) / float(len(ALL_CONTEXT_TYPES)), 1.0), 2
        )

        # Register Diversity: registers where learner had correct usage or exposures
        aff_registers = list(weakness.affected_registers or [])
        reg_diversity = round(min(float(len(aff_registers)) / 3.0, 1.0), 2) if aff_registers else 0.0

        # Free writing pass rate
        free_cor = correct_by_ctx.get("free_writing", 0)
        free_inc = incorrect_by_ctx.get("free_writing", 0)
        free_tot = free_cor + free_inc
        free_pass_rate = round(float(free_cor) / float(free_tot), 2) if free_tot > 0 else 0.0

        # Days since last error
        days_since_err = 0.0
        if weakness.last_incorrect_at is not None:
            last_err = weakness.last_incorrect_at
            if last_err.tzinfo is None:
                last_err = last_err.replace(tzinfo=timezone.utc)
            days_since_err = max((now - last_err).total_seconds() / 86400.0, 0.0)

        # If zero correct uses, mastery score is strictly 0.0
        if weakness.corrected_count == 0:
            mastery_score = 0.0
        else:
            total_uses = weakness.corrected_count + weakness.recurrence_count
            ratio_part = float(weakness.corrected_count) / float(max(total_uses, 1))
            staleness_part = min(days_since_err / 30.0, 1.0)

            mastery_score = (
                0.30 * ratio_part
                + 0.25 * context_diversity
                + 0.20 * free_pass_rate
                + 0.15 * reg_diversity
                + 0.10 * staleness_part
            )
            mastery_score = round(min(max(mastery_score, 0.0), 1.0), 2)

        return MasteryEvidenceOut(
            exposures=weakness.exposure_count,
            correct_uses=weakness.corrected_count,
            incorrect_uses=weakness.recurrence_count,
            recurrences=weakness.recurrence_count,
            days_since_last_error=round(days_since_err, 1),
            context_scores=context_scores,
            context_diversity=context_diversity,
            register_diversity=reg_diversity,
            free_writing_pass_rate=free_pass_rate,
            contexts_passed=contexts_passed,
            contexts_failed=contexts_failed,
            mastery_score=mastery_score,
        )

    # -- Lifecycle State Transitions -----------------------------------------

    def on_occurrence(
        self,
        weakness: WritingWeakness,
        now: datetime,
        context_type: str,
        register: str | None = None,
    ) -> None:
        """Handle error occurrence and advance lifecycle state machine deterministically."""
        old_state = weakness.lifecycle_state or "new"
        weakness.last_incorrect_at = now
        weakness.days_since_last_error = 0.0

        # Update per-context error counter
        inc_by_ctx = dict(weakness.incorrect_count_by_context or {})
        inc_by_ctx[context_type] = inc_by_ctx.get(context_type, 0) + 1
        weakness.incorrect_count_by_context = inc_by_ctx

        # Register tracking
        if register and register not in (weakness.affected_registers or []):
            weakness.affected_registers = list(weakness.affected_registers or []) + [register]

        evidence = self.compute_evidence(weakness, now)
        weakness.context_generalization_score = evidence.context_diversity
        weakness.register_diversity_score = evidence.register_diversity
        weakness.mastery_score = evidence.mastery_score
        weakness.mastery_evidence = evidence.model_dump()

        # State transition rules for errors
        if old_state == "mastered":
            # Regression after full mastery!
            new_state = "recurrent"
            self._schedule_retest(weakness, now, interval_days=1, target_context=context_type)
        elif old_state == "stable":
            # Demote from stable to recurring or improving
            new_state = "recurring" if weakness.recurrence_count >= 2 else "improving"
            self._schedule_retest(weakness, now, interval_days=1, target_context=context_type)
        elif old_state == "improving" and weakness.recurrence_count > weakness.corrected_count:
            new_state = "recurring"
            self._schedule_retest(weakness, now, interval_days=1, target_context=context_type)
        elif weakness.recurrence_count >= 4 and weakness.corrected_count == 0:
            new_state = "targeted"
        elif weakness.recurrence_count >= 2:
            new_state = "recurring"
        elif weakness.exposure_count >= 2:
            new_state = "observed"
        else:
            new_state = "new"

        self._apply_state_change(weakness, old_state, new_state, now, trigger="error_occurrence")

    def on_correction(
        self,
        weakness: WritingWeakness,
        now: datetime,
        context_type: str,
        register: str | None = None,
    ) -> None:
        """Handle correct usage demonstration and advance lifecycle state machine deterministically."""
        old_state = weakness.lifecycle_state or "new"
        weakness.last_correct_at = now

        # Update per-context correct counter
        cor_by_ctx = dict(weakness.correct_count_by_context or {})
        cor_by_ctx[context_type] = cor_by_ctx.get(context_type, 0) + 1
        weakness.correct_count_by_context = cor_by_ctx

        # Register tracking
        if register and register not in (weakness.affected_registers or []):
            weakness.affected_registers = list(weakness.affected_registers or []) + [register]

        # Retest evaluation: if this correction occurred on/after due retest date
        if weakness.retest_due_at:
            due_at = weakness.retest_due_at
            if due_at.tzinfo is None:
                due_at = due_at.replace(tzinfo=timezone.utc)
            if now >= due_at - timedelta(hours=12):
                weakness.retest_passed_count = (weakness.retest_passed_count or 0) + 1

        evidence = self.compute_evidence(weakness, now)
        weakness.context_generalization_score = evidence.context_diversity
        weakness.register_diversity_score = evidence.register_diversity
        weakness.mastery_score = evidence.mastery_score
        weakness.mastery_evidence = evidence.model_dump()

        # State transition rules for corrections
        # 1. Check for MASTERED
        # Must have: broad context diversity (>= 0.65), tested in free writing (pass rate >= 0.5),
        # multiple correct uses (>= 3), passed delayed retests (>= 2 or high score)
        can_master = (
            evidence.context_diversity >= 0.65
            and evidence.free_writing_pass_rate >= 0.5
            and weakness.corrected_count >= 3
            and (weakness.retest_passed_count >= 2 or evidence.mastery_score >= 0.60)
        )

        # 2. Check for STABLE
        # Must have: multiple contexts (>= 0.33), at least 2-3 corrections
        can_stable = (
            (evidence.context_diversity >= 0.40 and weakness.corrected_count >= 2)
            or (evidence.context_diversity >= 0.30 and weakness.corrected_count >= 3)
            or (weakness.corrected_count >= 2 and evidence.mastery_score >= 0.45)
        )

        if old_state == "recurrent":
            # Recovering from regression: requires demonstrated corrections
            if can_master:
                new_state = "mastered"
                weakness.retest_due_at = None
            elif can_stable:
                new_state = "stable"
                self._schedule_retest(weakness, now, interval_days=7, target_context="free_writing")
            elif weakness.corrected_count >= 1:
                new_state = "improving"
                self._schedule_retest(weakness, now, interval_days=2, target_context="scenario_writing")
            else:
                new_state = "recurrent"

        elif can_master:
            new_state = "mastered"
            weakness.retest_due_at = None
        elif can_stable:
            new_state = "stable"
            self._schedule_retest(weakness, now, interval_days=7, target_context="free_writing")
        elif weakness.corrected_count >= 1:
            new_state = "improving"
            self._schedule_retest(weakness, now, interval_days=1, target_context="sentence_translation")
        else:
            new_state = old_state

        self._apply_state_change(weakness, old_state, new_state, now, trigger="correction_demonstrated")

    def _apply_state_change(
        self,
        weakness: WritingWeakness,
        old_state: str,
        new_state: str,
        now: datetime,
        trigger: str,
    ) -> None:
        """Update lifecycle_state, backward-compatible status, and record history."""
        weakness.lifecycle_state = new_state
        weakness.status = STATUS_MAPPING.get(new_state, "new")

        if old_state != new_state or not weakness.mastery_history:
            history = list(weakness.mastery_history or [])
            history.append({
                "from_state": old_state,
                "to_state": new_state,
                "timestamp": now.isoformat(),
                "trigger": trigger,
                "mastery_score": weakness.mastery_score,
                "corrected_count": weakness.corrected_count,
                "recurrence_count": weakness.recurrence_count,
            })
            weakness.mastery_history = history[-30:]  # Keep recent 30 events

    @staticmethod
    def compute_dsr_retest_interval(
        state: str,
        corrected_count: int,
        recurrence_count: int,
        context_diversity: float,
        target_retention: float = 0.90,
    ) -> int:
        """Computes mathematically grounded spaced repetition interval based on DSR / FSRS forgetting curve.

        Formula:
          R(t) = exp(-t / S)
          Interval = -S * ln(R_target)

        Where S (Memory Stability in days) adapts to:
          - Lifecycle state (recurrent, improving, stable, mastered)
          - Correct vs incorrect usage history (retrieval strength)
          - Context generalization diversity (transfer learning strength)
        """
        if state in ("recurrent", "recurring", "new", "targeted"):
            # High error recurrence / regression: Minimal 1-day consolidation loop
            return 1

        if state == "improving":
            # Early learning consolidation: S is ~10-15 days, yielding 1-2 days at 90% retention
            if corrected_count <= 1:
                return 1
            stability = 10.0 * (1.0 + float(context_diversity or 0.0) * 0.5)
            raw_interval = -stability * math.log(target_retention)
            return int(max(1, min(round(raw_interval), 3)))

        if state == "stable":
            # Intermediate/Advanced consolidation: baseline stability of 66.5 days
            # yields exactly 7 days at 90% retention (-66.5 * ln(0.9) = 7.006 days)
            base_stability = 66.5
            diversity_boost = 1.0 + max(0.0, float(context_diversity or 0.0) - 0.5) * 1.5
            stability = base_stability * diversity_boost
            raw_interval = -stability * math.log(target_retention)
            return int(max(7, min(round(raw_interval), 30)))

        if state == "mastered":
            # Long-term retention
            return 30

        return 1

    def _schedule_retest(
        self,
        weakness: WritingWeakness,
        now: datetime,
        interval_days: int | None = None,
        target_context: str | None = None,
    ) -> None:
        """Schedule future retest using cognitive science DSR / FSRS forgetting curve model."""
        if interval_days is None:
            state = weakness.lifecycle_state or "new"
            context_div = float(weakness.context_generalization_score or 0.0)
            interval_days = self.compute_dsr_retest_interval(
                state=state,
                corrected_count=weakness.corrected_count,
                recurrence_count=weakness.recurrence_count,
                context_diversity=context_div,
            )

        weakness.retest_interval_days = interval_days
        weakness.retest_due_at = now + timedelta(days=interval_days)

    # -- AI Narrative Synthesis with Deterministic Fallback ------------------

    async def generate_narrative(
        self,
        weakness: WritingWeakness,
        provider: str | None = None,
        model: str | None = None,
    ) -> MasteryNarrativeOut:
        """Generate learner-friendly narrative from deterministic evidence via AI or fallback."""
        evidence = self.compute_evidence(weakness)
        fallback = self._build_fallback_narrative(weakness, evidence)

        # AI generation attempt
        try:
            prompt = build_weakness_narrative_prompt(
                category=weakness.category,
                subtype=weakness.subtype,
                description=weakness.description,
                lifecycle_state=weakness.lifecycle_state or "new",
                evidence_data=evidence.model_dump(),
            )
            effective_provider = provider
            if not effective_provider:
                if self._settings.gemini_api_key:
                    effective_provider = "gemini"
                elif self._settings.groq_api_key:
                    effective_provider = "groq"
                else:
                    effective_provider = (
                        self._settings.ai_learning_provider
                        or self._settings.ai_default_provider
                        or None
                    )
            effective_model = model or self._settings.ai_learning_model or None

            result, _ = await self._ai.generate_structured(
                prompt,
                MasteryNarrativeResult,
                provider=effective_provider,
                model=effective_model,
                max_tokens=384,
            )
            narrative = MasteryNarrativeOut(
                why_it_matters=result.why_it_matters,
                current_mastery=result.current_mastery,
                evidence_text=result.evidence_text,
                next_step=result.next_step,
            )
        except Exception as exc:
            logger.warning("mastery narrative AI synthesis failed error=%s (using fallback)", exc)
            narrative = fallback

        # Cache in weakness model
        weakness.mastery_narrative = narrative.model_dump()
        weakness.narrative_generated_at = datetime.now(timezone.utc)
        return narrative

    def _build_fallback_narrative(
        self, weakness: WritingWeakness, evidence: MasteryEvidenceOut
    ) -> MasteryNarrativeOut:
        """Deterministic, human-friendly template fallback for narrative."""
        cat = weakness.category
        state = weakness.lifecycle_state or "new"
        passed_count = len(evidence.contexts_passed)
        tot_contexts = len(ALL_CONTEXT_TYPES)

        # 1. Why it matters
        if cat == "grammar":
            why = f"Ngữ pháp và trợ từ chính xác giúp diễn đạt ý rõ ràng, tránh gây hiểu lầm trong tiếng Nhật."
        elif cat == "lexicon":
            why = f"Sử dụng đúng từ vựng và cụm từ tự nhiên giúp bài viết chuẩn xác và giàu sức biểu cảm."
        elif cat == "naturalness":
            why = f"Cách diễn đạt tự nhiên chuẩn Nhật giúp văn phong trôi chảy, thoát khỏi lối dịch thô từ tiếng Việt."
        elif cat == "register":
            why = f"Nhất quán văn phong và kính ngữ đúng mực là yếu tố quyết định sự chuyên nghiệp trong giao tiếp."
        else:
            why = f"Tính mạch lạc và liên kết logic giúp toàn bộ bài viết liền mạch, dễ theo dõi."

        # 2. Current mastery
        if state == "mastered":
            curr = "Đã làm chủ vững chắc qua nhiều bối cảnh thực tế và bài viết tự do."
        elif state == "stable":
            curr = "Đã ổn định trong bài tập có hướng dẫn và các bối cảnh ngắn, cần củng cố thêm trong viết tự do."
        elif state == "improving":
            curr = "Đang có tiến bộ rõ rệt qua các lần sửa đúng, đang mở rộng sang bối cảnh mới."
        elif state == "recurrent":
            curr = "Từng nắm vững nhưng gần đây có dấu hiệu tái diễn lỗi trong bối cảnh mới."
        elif state == "targeted":
            curr = "Lỗi tái diễn nhiều lần và cần được ưu tiên luyện tập chuyên sâu."
        elif state == "recurring":
            curr = "Đã xuất hiện lặp lại trong một số bài viết, cần chú ý khi viết câu phức."
        else:
            curr = "Mới được ghi nhận, hệ thống đang theo dõi sự tiến bộ qua các bài tiếp theo."

        # 3. Evidence text
        days_text = (
            f"{int(evidence.days_since_last_error)} ngày không mắc lại"
            if evidence.days_since_last_error > 0
            else "Gần đây có phát sinh"
        )
        evidence_text = f"Đã vượt qua {passed_count}/{tot_contexts} bối cảnh · {days_text}"

        # 4. Next step
        if weakness.retest_interval_days > 0:
            next_step = f"Ôn tập trong {weakness.retest_interval_days} ngày tới ({self._context_label(weakness.retest_interval_days)})."
        elif state == "mastered":
            next_step = "Tiếp tục duy trì phong độ trong các bài viết tự do và mô phỏng thực tế."
        else:
            next_step = "Thử sức với các bài tập viết lại hoặc viết tự do để kiểm tra độ vững chắc."

        return MasteryNarrativeOut(
            why_it_matters=why,
            current_mastery=curr,
            evidence_text=evidence_text,
            next_step=next_step,
        )

    @staticmethod
    def _context_label(interval_days: int) -> str:
        if interval_days <= 1:
            return "kiểm tra ngắn"
        if interval_days <= 2:
            return "bối cảnh tình huống"
        if interval_days <= 7:
            return "bài viết tự do"
        return "tình huống thực tế"

    # -- Payload Builders ----------------------------------------------------

    def build_weakness_detail(
        self, weakness: WritingWeakness, now: datetime | None = None
    ) -> WeaknessDetailOut:
        """Construct full WeaknessDetailOut payload with evidence and narrative."""
        now = now or datetime.now(timezone.utc)
        evidence = self.compute_evidence(weakness, now)
        narrative_dict = weakness.mastery_narrative
        if narrative_dict:
            narrative = MasteryNarrativeOut.model_validate(narrative_dict)
        else:
            narrative = self._build_fallback_narrative(weakness, evidence)

        is_due = False
        if weakness.retest_due_at:
            due = weakness.retest_due_at
            if due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
            is_due = now >= due

        target_ctx = "sentence_translation"
        if weakness.retest_interval_days >= 7:
            target_ctx = "free_writing"
        elif weakness.retest_interval_days >= 2:
            target_ctx = "scenario_writing"

        out_data = {
            "id": weakness.id,
            "user_id": weakness.user_id,
            "category": weakness.category,
            "subtype": weakness.subtype,
            "description": weakness.description,
            "examples": weakness.examples or [],
            "frequency": weakness.frequency,
            "first_seen_at": weakness.first_seen_at,
            "last_seen_at": weakness.last_seen_at,
            "severity": weakness.severity,
            "recurrence_count": weakness.recurrence_count,
            "corrected_count": weakness.corrected_count,
            "exposure_count": weakness.exposure_count,
            "mastery_score": weakness.mastery_score,
            "confidence": weakness.confidence,
            "status": weakness.status,
            "lifecycle_state": weakness.lifecycle_state or "new",
            "correct_count_by_context": weakness.correct_count_by_context or {},
            "incorrect_count_by_context": weakness.incorrect_count_by_context or {},
            "context_generalization_score": weakness.context_generalization_score or 0.0,
            "register_diversity_score": weakness.register_diversity_score or 0.0,
            "last_correct_at": weakness.last_correct_at,
            "last_incorrect_at": weakness.last_incorrect_at,
            "days_since_last_error": weakness.days_since_last_error or 0.0,
            "retest_due_at": weakness.retest_due_at,
            "retest_interval_days": weakness.retest_interval_days or 0,
            "retest_passed_count": weakness.retest_passed_count or 0,
            "mastery_evidence": weakness.mastery_evidence or {},
            "mastery_history": weakness.mastery_history or [],
            "mastery_narrative": weakness.mastery_narrative,
            "narrative_generated_at": weakness.narrative_generated_at,
            "affected_registers": weakness.affected_registers or [],
            "affected_contexts": weakness.affected_contexts or [],
            "affected_jlpt_levels": weakness.affected_jlpt_levels or [],
            "related_expressions": weakness.related_expressions or [],
            "related_grammar_patterns": weakness.related_grammar_patterns or [],
            "evidence_refs": weakness.evidence_refs or [],
            "created_at": weakness.created_at,
            "updated_at": weakness.updated_at,
            "evidence_summary": evidence,
            "narrative": narrative,
            "is_retest_due": is_due,
            "target_retest_context": target_ctx,
        }
        return WeaknessDetailOut.model_validate(out_data)

    def build_due_retest(
        self, weakness: WritingWeakness, now: datetime | None = None
    ) -> DueRetestOut:
        """Construct DueRetestOut payload for scheduled spaced testing."""
        now = now or datetime.now(timezone.utc)
        due_at = weakness.retest_due_at or now
        if due_at.tzinfo is None:
            due_at = due_at.replace(tzinfo=timezone.utc)

        is_overdue = now > due_at
        days_overdue = max((now - due_at).total_seconds() / 86400.0, 0.0)

        target_ctx = "sentence_translation"
        if weakness.retest_interval_days >= 7:
            target_ctx = "free_writing"
        elif weakness.retest_interval_days >= 2:
            target_ctx = "scenario_writing"

        evidence = self.compute_evidence(weakness, now)
        narrative_dict = weakness.mastery_narrative
        narrative = (
            MasteryNarrativeOut.model_validate(narrative_dict)
            if narrative_dict
            else self._build_fallback_narrative(weakness, evidence)
        )

        return DueRetestOut(
            weakness_id=weakness.id,
            category=weakness.category,
            subtype=weakness.subtype,
            description=weakness.description,
            lifecycle_state=weakness.lifecycle_state or "new",
            retest_due_at=due_at,
            retest_interval_days=weakness.retest_interval_days or 0,
            target_context_type=target_ctx,
            is_overdue=is_overdue,
            days_overdue=round(days_overdue, 1),
            narrative=narrative,
        )

    def build_evidence_summary(
        self, all_weaknesses: list[WritingWeakness], now: datetime | None = None
    ) -> EvidenceSummaryOut:
        """Construct cross-weakness summary for learning intelligence."""
        now = now or datetime.now(timezone.utc)
        by_lifecycle: dict[str, int] = {st: 0 for st in LIFECYCLE_STATES}
        total = len(all_weaknesses)

        due_count = 0
        mastered_count = 0
        recurrent_count = 0
        total_div = 0.0
        total_score = 0.0

        for w in all_weaknesses:
            state = w.lifecycle_state or "new"
            by_lifecycle[state] = by_lifecycle.get(state, 0) + 1

            if state == "mastered":
                mastered_count += 1
            elif state == "recurrent":
                recurrent_count += 1

            if w.retest_due_at:
                due = w.retest_due_at
                if due.tzinfo is None:
                    due = due.replace(tzinfo=timezone.utc)
                if now >= due:
                    due_count += 1

            total_div += w.context_generalization_score or 0.0
            total_score += w.mastery_score or 0.0

        avg_div = round(total_div / total, 2) if total > 0 else 0.0
        avg_score = round(total_score / total, 2) if total > 0 else 0.0

        improving = [
            w for w in all_weaknesses if (w.lifecycle_state or "new") in ("improving", "stable")
        ][:5]
        at_risk = [
            w for w in all_weaknesses if (w.lifecycle_state or "new") in ("targeted", "recurrent", "recurring")
        ][:5]

        from app.schemas.writing_intelligence import WritingWeaknessOut

        return EvidenceSummaryOut(
            total_weaknesses=total,
            by_lifecycle_state=by_lifecycle,
            contexts_tracked=ALL_CONTEXT_TYPES,
            average_context_diversity=avg_div,
            average_mastery_score=avg_score,
            due_retests_count=due_count,
            mastered_count=mastered_count,
            recurrent_count=recurrent_count,
            top_improving=[WritingWeaknessOut.model_validate(w, from_attributes=True) for w in improving],
            top_at_risk=[WritingWeaknessOut.model_validate(w, from_attributes=True) for w in at_risk],
        )
