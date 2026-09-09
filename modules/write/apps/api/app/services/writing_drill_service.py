"""Writing Drill Service (Phase 18).

Orchestrates targeted writing drill generation, interactive attempt evaluations,
progressive hint reveals, session state machine transitions, and mastery engine updates.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from app.core.config import Settings, get_settings
from app.core.errors import NotFoundError, ValidationError
from app.models.writing_drill import WritingDrillSession
from app.models.writing_intelligence import WritingWeakness
from app.repositories.writing_drill import WritingDrillSessionRepository
from app.repositories.writing_intelligence import WritingWeaknessRepository
from app.schemas.writing_drill import (
    DrillAttemptResultOut,
    DrillHintOut,
    DrillOutcomeOut,
    DrillRevealOut,
    DueDrillWeaknessOut,
)
from app.services.ai_service import AIService
from app.services.mastery_engine import WritingMasteryEngine
from app.services.writing_drill_generator import WritingDrillGenerator
from app.services.writing_drill_state_machine import WritingDrillStateMachine

logger = logging.getLogger("app.writing_drill_service")


class WritingDrillService:
    """Domain service for targeted writing drill sessions."""

    def __init__(
        self,
        drill_repository: WritingDrillSessionRepository,
        weakness_repository: WritingWeaknessRepository,
        settings: Settings | None = None,
        ai_service: AIService | None = None,
    ) -> None:
        self._drills = drill_repository
        self._weaknesses = weakness_repository
        self._settings = settings or get_settings()
        self._ai = ai_service or AIService(settings=self._settings)
        self._generator = WritingDrillGenerator(ai_service=self._ai, settings=self._settings)
        self._state_machine = WritingDrillStateMachine()
        self._mastery_engine = WritingMasteryEngine(settings=self._settings, ai_service=self._ai)

    # -- Generation ----------------------------------------------------------

    async def generate_session(
        self,
        user_id: str | None,
        weakness_id: str | None = None,
        category: str | None = None,
        subtype: str | None = None,
        jlpt_level: str | None = "N3",
        difficulty: int = 5,
        context_domain: str | None = None,
        provider: str | None = None,
        model: str | None = None,
    ) -> WritingDrillSession:
        """Generates and persists a new targeted drill session."""
        target_weakness: WritingWeakness | None = None

        if weakness_id:
            target_weakness = await self._weaknesses.get(weakness_id)
            if target_weakness is None:
                raise NotFoundError(f"Weakness with id {weakness_id} not found")
        elif category and subtype:
            # Look up existing weakness or create virtual profile
            items = await self._weaknesses.list_by_user(user_id, limit=5)
            target_weakness = next(
                (w for w in items if w.category == category and w.subtype == subtype),
                None,
            )
        else:
            # Auto-pick highest priority weakness (due retest first, or lowest mastery)
            due_items = await self._weaknesses.list_due_retests(user_id, limit=1)
            if due_items:
                target_weakness = due_items[0]
            else:
                all_weaknesses = await self._weaknesses.list_by_user(user_id, limit=5)
                if all_weaknesses:
                    # Pick lowest mastery score with status new/recurring/improving
                    sorted_w = sorted(all_weaknesses, key=lambda w: w.mastery_score)
                    target_weakness = sorted_w[0]

        # Resolve category & subtype
        if target_weakness:
            target_cat = target_weakness.category
            target_sub = target_weakness.subtype
            weakness_desc = target_weakness.description
            mastery_score = target_weakness.mastery_score
            prior_ev = list(target_weakness.examples or [])
        else:
            target_cat = category or "grammar"
            target_sub = subtype or "particles"
            weakness_desc = f"Luyện tập trọng điểm cho {target_cat} - {target_sub}"
            mastery_score = 0.0
            prior_ev = []

        draft = await self._generator.generate_drill_draft(
            weakness=target_weakness
            or {"category": target_cat, "subtype": target_sub, "description": weakness_desc},
            mastery_score=mastery_score,
            user_level=jlpt_level or "N3",
            prior_evidence=prior_ev,
            context_domain=context_domain,
            provider=provider,
            model=model,
        )

        # Convert draft items to stored JSON with unique IDs
        items_payload = []
        for idx, it in enumerate(draft.items):
            item_dict = it.model_dump()
            item_dict["id"] = f"item-{idx + 1}-{uuid.uuid4().hex[:8]}"
            items_payload.append(item_dict)

        session = WritingDrillSession(
            user_id=user_id,
            weakness_id=target_weakness.id if target_weakness else None,
            weakness_category=target_cat,
            weakness_subtype=target_sub,
            title=draft.title,
            target_focus=draft.target_focus,
            jlpt_level=draft.jlpt_level or jlpt_level or "N3",
            difficulty=draft.difficulty or difficulty,
            status="active",
            current_item_index=0,
            items=items_payload,
            attempts=[],
            outcome=None,
            mastery_delta=0.0,
            generation_metadata={
                "provider": provider,
                "model": model,
                "generated_at": datetime.now(timezone.utc).isoformat(),
            },
        )

        return await self._drills.add(session)

    # -- Session Retrieval & Attempts ----------------------------------------

    async def get_session(self, session_id: str) -> WritingDrillSession:
        session = await self._drills.get(session_id)
        if session is None:
            raise NotFoundError(f"Drill session with id {session_id} not found")
        return session

    async def submit_attempt(
        self,
        session_id: str,
        user_answer: str,
        item_id: str | None = None,
        item_index: int | None = None,
        provider: str | None = None,
        model: str | None = None,
    ) -> DrillAttemptResultOut:
        """Submits an answer for the current or specified drill item."""
        session = await self.get_session(session_id)
        if session.status != "active":
            raise ValidationError(f"Session is already {session.status}")

        items = list(session.items or [])
        attempts = list(session.attempts or [])

        # Determine target item
        if item_index is not None and 0 <= item_index < len(items):
            target_idx = item_index
        elif item_id is not None:
            target_idx = next(
                (i for i, it in enumerate(items) if it.get("id") == item_id),
                session.current_item_index,
            )
        else:
            target_idx = session.current_item_index

        if target_idx >= len(items):
            raise ValidationError("All items in this session are already completed")

        curr_item = items[target_idx]
        curr_item_id = str(curr_item.get("id", target_idx))

        # Check existing hints revealed and reveal status
        hints_revealed = self._state_machine.get_hints_revealed_count(attempts, curr_item_id)
        is_revealed = self._state_machine.is_item_revealed(attempts, curr_item_id)

        # Count prior attempts for this specific item
        prior_item_attempts = [a for a in attempts if str(a.get("item_id")) == curr_item_id]
        attempt_num = len(prior_item_attempts) + 1

        # Evaluate via Generator
        eval_result = await self._generator.evaluate_attempt(
            item=curr_item,
            user_answer=user_answer,
            attempt_number=attempt_num,
            provider=provider,
            model=model,
        )

        # Record attempt
        attempt_record = self._state_machine.record_attempt(
            item=curr_item,
            item_index=target_idx,
            user_answer=user_answer,
            eval_result=eval_result,
            hints_revealed_count=hints_revealed,
            revealed=is_revealed,
        )
        attempts.append(attempt_record)
        session.attempts = attempts

        # Check stage progression
        should_advance = self._state_machine.should_advance(
            prior_item_attempts + [attempt_record], eval_result
        )

        next_idx = target_idx
        outcome_dict: dict[str, Any] | None = None
        mastery_delta = 0.0

        if should_advance:
            next_idx = target_idx + 1
            session.current_item_index = next_idx

        # Check if session is fully completed
        if next_idx >= len(items):
            session.status = "completed"
            session.completed_at = datetime.now(timezone.utc)

            # Get current weakness mastery if available
            current_mastery = 0.0
            weakness: WritingWeakness | None = None
            if session.weakness_id:
                weakness = await self._weaknesses.get(session.weakness_id)
                if weakness:
                    current_mastery = weakness.mastery_score

            # AI Debrief synthesis
            scores_summary = [a.get("score", 0) for a in attempts]
            avg_score = sum(scores_summary) / max(1, len(scores_summary))
            debrief_result = await self._generator.generate_debrief(
                weakness_info={
                    "category": session.weakness_category,
                    "subtype": session.weakness_subtype,
                    "description": session.title,
                },
                items_summary=[
                    {"drill_type": it.get("drill_type"), "stage": it.get("stage")} for it in items
                ],
                attempts_summary=[
                    {"score": a.get("score"), "is_correct": a.get("is_correct")} for a in attempts
                ],
                average_score=avg_score,
                provider=provider,
                model=model,
            )

            outcome_dict = self._state_machine.compute_outcome(
                items=items,
                attempts=attempts,
                current_mastery=current_mastery,
                debrief=debrief_result,
            )
            session.outcome = outcome_dict
            mastery_delta = outcome_dict.get("mastery_delta", 0.0)
            session.mastery_delta = mastery_delta

            # Forward mastery update to WritingWeakness if linked
            if weakness:
                await self._update_weakness_mastery(weakness, outcome_dict, session)

        await self._drills.update(session)

        return DrillAttemptResultOut(
            is_correct=eval_result.is_correct,
            score=eval_result.score,
            feedback_vi=eval_result.feedback_vi,
            nuance_contrast=eval_result.nuance_contrast,
            corrected_text=eval_result.corrected_text,
            item_index=target_idx,
            next_item_index=min(len(items) - 1, next_idx),
            session_status=session.status,
            outcome=DrillOutcomeOut(**outcome_dict) if outcome_dict else None,
            mastery_delta=mastery_delta,
        )

    async def _update_weakness_mastery(
        self,
        weakness: WritingWeakness,
        outcome: dict[str, Any],
        session: WritingDrillSession,
    ) -> None:
        """Applies drill session mastery delta and evidence into WritingWeakness."""
        try:
            delta = float(outcome.get("mastery_delta", 0.0))
            new_score = round(max(0.0, min(1.0, weakness.mastery_score + delta)), 4)
            weakness.mastery_score = new_score
            weakness.exposure_count = (weakness.exposure_count or 0) + 1

            now = datetime.now(timezone.utc)
            passed = int(outcome.get("passed_items", 0))
            total = int(outcome.get("total_items", 1))

            if passed >= total * 0.7:
                self._mastery_engine.on_correction(
                    weakness=weakness,
                    now=now,
                    context_type="rewrite",
                )
            else:
                self._mastery_engine.on_occurrence(
                    weakness=weakness,
                    now=now,
                    context_type="rewrite",
                )

            # Apply additional drill delta and history record
            weakness.mastery_score = round(max(0.0, min(1.0, weakness.mastery_score + delta)), 4)
            history = list(weakness.mastery_history or [])
            history.append(
                {
                    "event_type": "drill_completed",
                    "timestamp": now.isoformat(),
                    "score_before": round(new_score - delta, 4),
                    "score_after": weakness.mastery_score,
                    "delta": delta,
                    "lifecycle_state": weakness.lifecycle_state,
                    "drill_session_id": session.id,
                }
            )
            weakness.mastery_history = history[-30:]

            await self._weaknesses.update(weakness)
        except Exception:
            logger.exception("Failed to update weakness from drill outcome (skipped)")

    # -- Progressive Hints & Reveals -----------------------------------------

    async def request_hint(self, session_id: str, item_id: str | None = None) -> DrillHintOut:
        """Reveals the next progressive hint for the current drill item."""
        session = await self.get_session(session_id)
        items = list(session.items or [])
        target_idx = session.current_item_index

        if item_id:
            target_idx = next(
                (i for i, it in enumerate(items) if it.get("id") == item_id),
                target_idx,
            )

        if not (0 <= target_idx < len(items)):
            raise ValidationError("Invalid item index for hint")

        curr_item = items[target_idx]
        curr_item_id = str(curr_item.get("id", target_idx))
        attempts = list(session.attempts or [])

        hints_revealed = self._state_machine.get_hints_revealed_count(attempts, curr_item_id)
        hint_text, new_count, total = self._state_machine.next_hint(curr_item, hints_revealed)

        # Update or record placeholder hint state
        if hints_revealed != new_count:
            # We record a dummy attempt marker to track hint reveal count if no attempt exists yet
            hint_marker = {
                "item_id": curr_item_id,
                "item_index": target_idx,
                "user_answer": "[HINT_REQUESTED]",
                "is_correct": False,
                "score": 0,
                "feedback_vi": f"Đã mở gợi ý #{new_count}",
                "nuance_contrast": None,
                "corrected_text": None,
                "hints_revealed_count": new_count,
                "revealed": self._state_machine.is_item_revealed(attempts, curr_item_id),
                "evaluated_at": datetime.now(timezone.utc).isoformat(),
            }
            attempts.append(hint_marker)
            session.attempts = attempts
            await self._drills.update(session)

        return DrillHintOut(
            hint=hint_text,
            hints_revealed_count=new_count,
            hints_total=total,
        )

    async def reveal_answer(self, session_id: str, item_id: str | None = None) -> DrillRevealOut:
        """Reveals target answer and explanation for the current drill item."""
        session = await self.get_session(session_id)
        items = list(session.items or [])
        target_idx = session.current_item_index

        if item_id:
            target_idx = next(
                (i for i, it in enumerate(items) if it.get("id") == item_id),
                target_idx,
            )

        if not (0 <= target_idx < len(items)):
            raise ValidationError("Invalid item index for reveal")

        curr_item = items[target_idx]
        curr_item_id = str(curr_item.get("id", target_idx))
        attempts = list(session.attempts or [])

        # Mark revealed
        reveal_marker = {
            "item_id": curr_item_id,
            "item_index": target_idx,
            "user_answer": "[ANSWER_REVEALED]",
            "is_correct": False,
            "score": 0,
            "feedback_vi": "Đã xem đáp án mẫu",
            "nuance_contrast": None,
            "corrected_text": curr_item.get("target_answer"),
            "hints_revealed_count": self._state_machine.get_hints_revealed_count(
                attempts, curr_item_id
            ),
            "revealed": True,
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
        }
        attempts.append(reveal_marker)
        session.attempts = attempts
        await self._drills.update(session)

        return DrillRevealOut(
            target_answer=curr_item.get("target_answer", ""),
            explanation=curr_item.get("explanation", ""),
            accepted_alternatives=curr_item.get("accepted_alternatives", []),
        )

    # -- Due Drills & History ------------------------------------------------

    async def list_due_drills(self, user_id: str | None) -> list[DueDrillWeaknessOut]:
        """Lists high-priority weaknesses and due retests ready for targeted drill practice."""
        due_retests = await self._weaknesses.list_due_retests(user_id, limit=10)
        active_weaknesses = await self._weaknesses.list_by_user(user_id, limit=20)

        results: list[DueDrillWeaknessOut] = []
        seen_ids = set()

        for w in due_retests:
            seen_ids.add(w.id)
            rec_types = [
                t.value for t in WritingDrillGenerator.select_drill_types(w.category, w.subtype)
            ]
            results.append(
                DueDrillWeaknessOut(
                    weakness_id=w.id,
                    category=w.category,
                    subtype=w.subtype,
                    description=w.description,
                    mastery_score=w.mastery_score,
                    lifecycle_state=w.lifecycle_state,
                    severity=w.severity,
                    recommended_drill_types=rec_types,
                    priority_reason="Đã đến hạn kiểm tra định kỳ (Spaced Retest)",
                    retest_due=True,
                )
            )

        # Add other active weaknesses with lower mastery
        sorted_w = sorted(active_weaknesses, key=lambda w: w.mastery_score)
        for w in sorted_w:
            if w.id in seen_ids:
                continue
            if w.mastery_score < 0.85:
                rec_types = [
                    t.value for t in WritingDrillGenerator.select_drill_types(w.category, w.subtype)
                ]
                reason = (
                    "Điểm tinh thông còn thấp"
                    if w.mastery_score < 0.5
                    else "Đang tiến bộ, cần củng cố"
                )
                results.append(
                    DueDrillWeaknessOut(
                        weakness_id=w.id,
                        category=w.category,
                        subtype=w.subtype,
                        description=w.description,
                        mastery_score=w.mastery_score,
                        lifecycle_state=w.lifecycle_state,
                        severity=w.severity,
                        recommended_drill_types=rec_types,
                        priority_reason=reason,
                        retest_due=False,
                    )
                )

        return results

    async def list_sessions(
        self,
        user_id: str | None,
        status: str | None = None,
        weakness_id: str | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[WritingDrillSession], int]:
        return await self._drills.list_by_user(
            user_id, status=status, weakness_id=weakness_id, skip=skip, limit=limit
        )
