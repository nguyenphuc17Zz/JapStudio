"""Memory service (Phase 12): AI extraction -> validation -> merge/resolve.

Pipeline per learning event (never raises; memory must not break the flow):

1. extraction   (memory_extraction:v1, quality MEDIUM) -> candidate memories
2. threshold    (deterministic: importance >= min, confidence >= min)
3. validation   (memory_validation:v1, quality HIGH) -> accept/reject/merge/update
4. conflict     (memory_conflict_detection:v1, quality HIGH) -> verdict
5. resolution   (deterministic: explicit user memory always wins)

Retrieval is deterministic (``DeterministicMemoryRetriever``); the AI never
writes to the table directly and never sees raw learner text in fingerprints.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Protocol

from sqlalchemy import update
from sqlalchemy.exc import IntegrityError

from app.core.config import Settings, get_settings
from app.domain.memory_taxonomy import (
    CATEGORY_LABELS_VI,
    MEMORY_CATEGORIES,
    MEMORY_SOURCES,
    MEMORY_TYPES,
    MemoryClass,
    MemorySource,
    MemoryStatus,
)
from app.models import LearnerMemory
from app.prompts.memory_conflict_detection import (
    build_memory_conflict_prompt,
)
from app.prompts.memory_extraction import (
    build_memory_extraction_prompt,
)
from app.prompts.memory_validation import (
    build_memory_validation_prompt,
)
from app.quality.enums import ConfidenceLevel, parse_confidence
from app.quality.service import create_quality_service
from app.repositories import LearnerMemoryRepository, LearnerProfileRepository
from app.schemas.memory_ai import (
    MemoryConflictResult,
    MemoryExtractionResult,
    MemoryValidationResult,
)
from app.services.ai_service import AIService

logger = logging.getLogger("app.memory")

CONFIDENCE_WEIGHT: dict[ConfidenceLevel, float] = {
    ConfidenceLevel.HIGH: 1.0,
    ConfidenceLevel.MEDIUM: 0.7,
    ConfidenceLevel.LOW: 0.4,
}

TASK_CATEGORY_BOOST: dict[str, dict[str, float]] = {
    "evaluation": {
        "mistake_pattern": 2.0,
        "successful_pattern": 2.0,
        "vocabulary_memory": 1.5,
        "expression_memory": 1.5,
    },
    "coach": {
        "mistake_pattern": 2.0,
        "successful_pattern": 1.5,
        "style_preference": 1.5,
        "expression_memory": 1.5,
        "vocabulary_memory": 1.5,
    },
    "scenario": {"scenario_memory": 2.0, "style_preference": 1.5, "preference": 1.5},
    "simulation": {"simulation_memory": 2.0, "preference": 1.5, "expression_memory": 1.5},
    "exercise_generation": {
        "learning_pattern": 2.0,
        "mistake_pattern": 1.5,
        "vocabulary_memory": 1.5,
    },
    "planner": {
        "goal_memory": 2.0,
        "milestone_memory": 2.0,
        "preference": 1.5,
        "style_preference": 1.5,
    },
}


class MemoryRetriever(Protocol):
    """Retrieves the most relevant active memories for a task."""

    async def retrieve(
        self,
        user_id: str | None,
        task_type: str,
        context: dict[str, Any] | None = None,
        *,
        max_items: int | None = None,
        max_tokens: int | None = None,
    ) -> list[LearnerMemory]: ...


class DeterministicMemoryRetriever:
    """Relevance ranking: importance + confidence + recency + frequency + task boost."""

    def __init__(
        self, repository: LearnerMemoryRepository, settings: Settings | None = None
    ) -> None:
        self._repository = repository
        self._settings = settings or get_settings()

    async def retrieve(
        self,
        user_id: str | None,
        task_type: str,
        context: dict[str, Any] | None = None,
        *,
        max_items: int | None = None,
        max_tokens: int | None = None,
    ) -> list[LearnerMemory]:
        if not self._settings.ai_memory_enabled:
            return []
        memories = await self._repository.list_active_for_user(user_id)
        if not memories:
            return []
        from app.services.spreading_activation_engine import spreading_activation_engine

        boost = TASK_CATEGORY_BOOST.get(task_type, {})
        now = datetime.now(timezone.utc)
        scored: list[tuple[float, LearnerMemory]] = []

        # Extract contextual cues if provided
        context_str = ""
        if context:
            context_str = " ".join(str(v) for v in context.values() if isinstance(v, str))

        for memory in memories:
            importance_weight = (memory.importance or 5) / 10.0
            confidence_score = CONFIDENCE_WEIGHT.get(parse_confidence(memory.confidence), 0.5)
            category_boost = boost.get(memory.category, 0.0)

            # ACT-R Cognitive Architecture Spreading Activation (Algorithm 15)
            act_r_activation = spreading_activation_engine.compute_activation(
                occurrence_count=memory.occurrence_count or 1,
                last_seen_at=memory.last_seen_at,
                context_text=context_str,
                memory_content=memory.content,
                importance_weight=importance_weight,
                now=now,
            )
            retrieval_prob = spreading_activation_engine.retrieval_probability(act_r_activation)

            score = (
                retrieval_prob * 0.55
                + importance_weight * 0.20
                + confidence_score * 0.15
                + category_boost * 0.20
            )
            scored.append((score, memory))
        scored.sort(key=lambda pair: pair[0], reverse=True)
        items = [memory for _, memory in scored]
        limit = max_items or self._settings.ai_memory_max_items
        budget = max_tokens or self._settings.ai_memory_context_max_tokens
        selected: list[LearnerMemory] = []
        used = 0
        for memory in items:
            if len(selected) >= limit:
                break
            tokens = max(4, len(memory.content) // 4)
            if used + tokens > budget:
                continue
            selected.append(memory)
            used += tokens
        return selected


class TutorContextBuilder:
    """Builds the memory block injected into AI prompts."""

    def __init__(self, retriever: MemoryRetriever) -> None:
        self._retriever = retriever

    async def memory_block(
        self,
        user_id: str | None,
        task_type: str,
        context: dict[str, Any] | None = None,
    ) -> str:
        memories = await self._retriever.retrieve(user_id, task_type, context=context)
        if not memories:
            return ""
        lines = ["--- Ghi nhớ của người học (từ hệ thống memory) ---"]
        for memory in memories:
            label = CATEGORY_LABELS_VI.get(memory.category, memory.category)
            lines.append(f"- [{label}, độ tin cậy {memory.confidence}] {memory.content}")
        return "\n".join(lines)


class MemoryService:
    """Owns the ingest pipeline and the user-facing memory operations."""

    def __init__(
        self,
        repository: LearnerMemoryRepository,
        profile_repository: LearnerProfileRepository,
        ai_service: AIService,
        settings: Settings | None = None,
        attempt_repository: Any | None = None,
        simulation_repository: Any | None = None,
    ) -> None:
        self._repository = repository
        self._profiles = profile_repository
        self._ai = ai_service
        self._settings = settings or get_settings()
        self._quality = create_quality_service(settings=self._settings)
        self._attempts = attempt_repository
        self._simulations = simulation_repository

    def context_builder(self) -> TutorContextBuilder:
        """A memory-block builder wired to this service's repository."""
        return TutorContextBuilder(
            DeterministicMemoryRetriever(self._repository, settings=self._settings)
        )

    def _task(self) -> tuple[str | None, str | None]:
        provider = (
            self._settings.ai_memory_provider
            or self._settings.ai_learning_provider
            or self._settings.ai_exercise_evaluation_provider
            or self._settings.ai_default_provider
            or None
        )
        model = self._settings.ai_memory_model or self._settings.ai_learning_model or None
        return provider, model

    # -- ingest pipeline -----------------------------------------------------

    async def ingest_event(
        self,
        user_id: str | None,
        source_type: str,
        source_id: str | None,
        context: dict[str, Any],
    ) -> dict[str, int]:
        """Run the full extraction pipeline for one learning event.

        Never raises. Returns counts: {"created": n, "updated": n, "rejected": n}.
        """
        counts = {"created": 0, "updated": 0, "rejected": 0}
        if source_type not in MEMORY_SOURCES:
            return counts
        try:
            if not await self._enabled(user_id):
                return counts
            extraction = await self._extract(source_type, source_id, context)
            # Batch load active memories once to avoid N reloads per candidate
            try:
                active_memories = await self._repository.list_active_for_user(user_id)
            except Exception:
                active_memories = []
            for candidate in extraction.candidate_memories:
                outcome = await self._handle_candidate(user_id, source_type, source_id, candidate, active_memories)
                counts[outcome] += 1
            return counts
        except Exception:
            logger.exception(
                "memory ingest failed source_type=%s source_id=%s (ignored)",
                source_type,
                source_id,
            )
            return counts

    async def _enabled(self, user_id: str | None) -> bool:
        if not self._settings.ai_memory_enabled:
            return False
        profile = await self._profiles.get_for_user(user_id)
        preferences = (profile.preferences or {}) if profile is not None else {}
        return bool(preferences.get("memory_enabled", True))

    async def _extract(
        self, source_type: str, source_id: str | None, context: dict[str, Any]
    ) -> MemoryExtractionResult:
        provider, model = self._task()
        extraction: MemoryExtractionResult | None = None
        try:
            extraction, _ = await self._ai.generate_structured(
                build_memory_extraction_prompt(source_type, source_id, context),
                MemoryExtractionResult,
                provider=provider,
                model=model,
                max_tokens=self._settings.ai_memory_max_tokens,
            )
        except Exception as exc:
            logger.warning("memory extraction failed error=%s", exc)
        if extraction is None:
            return MemoryExtractionResult(candidate_memories=[])
        self._quality.validate(
            "memory_extraction",
            extraction,
            context={"source_type": source_type, "source_id": source_id},
            provider=provider,
            model=model,
            fingerprint_payload={"source_type": source_type, "source_id": source_id},
        )
        return extraction

    async def _handle_candidate(
        self,
        user_id: str | None,
        source_type: str | None,
        source_id: str | None,
        candidate: Any,
        active_memories: list[LearnerMemory] | None = None,
    ) -> str:
        """Validate + resolve one candidate; returns created|updated|rejected."""
        category, memory_type = candidate.category, candidate.type
        if category not in MEMORY_CATEGORIES or memory_type not in MEMORY_TYPES:
            return "rejected"
        confidence = parse_confidence(candidate.confidence)
        if not self._passes_threshold(candidate.importance, confidence):
            return "rejected"
        if await self._has_evidence(user_id, source_type, source_id, memories=active_memories):
            return "rejected"

        existing = await self._find_similar(user_id, category, memory_type, candidate.content, candidates=active_memories)
        if existing is None:
            validation = await self._validate(user_id, candidate)
            if validation.action == "reject":
                return "rejected"
            if validation.action == "merge" and validation.matched_memory_id:
                target = await self._repository.get_for_user(user_id, validation.matched_memory_id)
                if target is not None:
                    await self._merge(user_id, target, candidate, source_type, source_id)
                    return "updated"
            await self._create(
                user_id,
                category=category,
                memory_type=memory_type,
                content=candidate.content,
                confidence=confidence,
                importance=candidate.importance,
                source_type=source_type,
                source_id=source_id,
            )
            return "created"

        if self._overlap(existing.content, candidate.content) >= 0.8:
            # nearly identical content in the same category/type is the SAME
            # memory: reinforce deterministically, no AI conflict call.
            await self._bump(existing, candidate, source_type, source_id)
            return "updated"

        return await self._resolve(user_id, existing, candidate, source_type, source_id)

    def _passes_threshold(self, importance: int, confidence: ConfidenceLevel) -> bool:
        if importance < self._settings.ai_memory_min_importance:
            return False
        minimum = parse_confidence(self._settings.ai_memory_min_confidence)
        return confidence.value >= minimum.value

    async def _validate(self, user_id: str | None, candidate: Any) -> MemoryValidationResult:
        provider, model = self._task()
        similar = await self._repository.find_similar(user_id, candidate.category, candidate.type)
        payload = {
            "category": candidate.category,
            "type": candidate.type,
            "content": candidate.content,
            "confidence": candidate.confidence,
            "importance": candidate.importance,
        }
        try:
            validation, _ = await self._ai.generate_structured(
                build_memory_validation_prompt(payload, similar),
                MemoryValidationResult,
                provider=provider,
                model=model,
                max_tokens=self._settings.ai_memory_max_tokens,
            )
        except Exception as exc:
            logger.warning("memory validation failed error=%s", exc)
            validation = MemoryValidationResult(action="accept")
        if validation is not None:
            self._quality.validate(
                "memory_validation",
                validation,
                context={"candidate": payload},
                provider=provider,
                model=model,
                fingerprint_payload={"action_proposed": validation.action},
            )
        return validation

    async def _resolve(
        self,
        user_id: str | None,
        existing: LearnerMemory,
        candidate: Any,
        source_type: str,
        source_id: str | None,
    ) -> str:
        """Deterministic resolution; explicit user memory always wins."""
        if existing.source_type == MemorySource.USER_EXPLICIT.value:
            await self._bump(existing, candidate, source_type, source_id)
            return "updated"

        verdict = await self._classify(existing, candidate)
        new_confidence = parse_confidence(candidate.confidence)
        existing_confidence = parse_confidence(existing.confidence)
        new_importance = candidate.importance or 5

        if verdict == "contradiction":
            if new_confidence.value > existing_confidence.value:
                await self._supersede(user_id, existing)
                await self._create(
                    user_id,
                    category=candidate.category,
                    memory_type=candidate.type,
                    content=candidate.content,
                    confidence=new_confidence,
                    importance=new_importance,
                    source_type=source_type,
                    source_id=source_id,
                )
                return "created"
            await self._bump(existing, candidate, source_type, source_id)
            return "updated"
        if verdict == "refinement":
            existing.content = candidate.content
            existing.importance = max(existing.importance or 5, new_importance)
            existing.confidence = max(existing_confidence, new_confidence).value
            existing.memory_class = MemoryClass.STABLE.value
            await self._bump(existing, candidate, source_type, source_id)
            return "updated"
        if verdict == "preference_change":
            await self._supersede(user_id, existing)
            await self._create(
                user_id,
                category=candidate.category,
                memory_type=candidate.type,
                content=candidate.content,
                confidence=new_confidence,
                importance=new_importance,
                source_type=source_type,
                source_id=source_id,
            )
            return "created"
        # contextual (default): both are true in different contexts -> keep both
        await self._create(
            user_id,
            category=candidate.category,
            memory_type=candidate.type,
            content=candidate.content,
            confidence=new_confidence,
            importance=new_importance,
            source_type=source_type,
            source_id=source_id,
        )
        return "created"

    async def _classify(self, existing: LearnerMemory, candidate: Any) -> str:
        provider, model = self._task()
        new_payload = {
            "category": candidate.category,
            "type": candidate.type,
            "content": candidate.content,
            "confidence": candidate.confidence,
            "importance": candidate.importance,
        }
        existing_payload = {
            "category": existing.category,
            "type": existing.type,
            "content": existing.content,
            "confidence": existing.confidence,
            "importance": existing.importance,
        }
        try:
            conflict, _ = await self._ai.generate_structured(
                build_memory_conflict_prompt(new_payload, existing_payload),
                MemoryConflictResult,
                provider=provider,
                model=model,
                max_tokens=self._settings.ai_memory_max_tokens,
            )
        except Exception as exc:
            logger.warning("memory conflict detection failed error=%s", exc)
            conflict = MemoryConflictResult(verdict="contextual")
        if conflict is not None:
            self._quality.validate(
                "memory_conflict_detection",
                conflict,
                context={"existing": existing_payload},
                provider=provider,
                model=model,
                fingerprint_payload={"verdict_proposed": conflict.verdict},
            )
        return conflict.verdict

    # -- persistence ---------------------------------------------------------

    async def _create(
        self,
        user_id: str | None,
        *,
        category: str,
        memory_type: str,
        content: str,
        confidence: ConfidenceLevel,
        importance: int,
        source_type: str,
        source_id: str | None,
    ) -> LearnerMemory | None:
        """Persist a new memory; resolves concurrent duplicate creates."""
        now = datetime.now(timezone.utc)
        memory = LearnerMemory(
            user_id=user_id,
            category=category,
            type=memory_type,
            content=content.strip(),
            confidence=confidence.value,
            importance=importance,
            source_type=source_type,
            source_id=source_id,
            evidence=[{"source_type": source_type, "source_id": source_id}],
            first_seen_at=now,
            last_seen_at=now,
            occurrence_count=1,
            status=MemoryStatus.ACTIVE.value,
            memory_class=MemoryClass.TEMPORARY.value
            if category in ("goal_memory", "milestone_memory")
            else MemoryClass.STABLE.value,
            retention_policy=(
                "temporary" if category in ("goal_memory", "milestone_memory") else "stable"
            ),
        )
        try:
            return await self._repository.add(memory)
        except IntegrityError:
            await self._repository.session.rollback()
            existing = await self._repository.get_by_source(user_id, source_type, source_id)
            if existing is not None:
                logger.info(
                    "memory race resolved id=%s source=%s/%s",
                    existing.id,
                    source_type,
                    source_id,
                )
                return existing
            raise

    async def _bump(
        self,
        memory: LearnerMemory,
        candidate: Any,
        source_type: str,
        source_id: str | None,
    ) -> None:
        now = datetime.now(timezone.utc)
        evidence = list(memory.evidence or [])
        evidence.append({"source_type": source_type, "source_id": source_id})
        await self._repository.session.execute(
            update(LearnerMemory)
            .where(LearnerMemory.id == memory.id)
            .values(
                last_seen_at=now,
                occurrence_count=LearnerMemory.occurrence_count + 1,
                importance=max(memory.importance or 5, candidate.importance or 5),
                confidence=max(
                    parse_confidence(memory.confidence), parse_confidence(candidate.confidence)
                ).value,
                evidence=evidence[-20:],
            )
        )
        await self._repository.session.refresh(memory)

    async def _merge(
        self,
        user_id: str | None,
        target: LearnerMemory,
        candidate: Any,
        source_type: str,
        source_id: str | None,
    ) -> None:
        if target.user_id != user_id:
            return
        now = datetime.now(timezone.utc)
        evidence = list(target.evidence or [])
        evidence.append({"source_type": source_type, "source_id": source_id})
        await self._repository.session.execute(
            update(LearnerMemory)
            .where(LearnerMemory.id == target.id)
            .values(
                last_seen_at=now,
                occurrence_count=LearnerMemory.occurrence_count + 1,
                importance=max(target.importance or 5, candidate.importance or 5),
                confidence=max(
                    parse_confidence(target.confidence), parse_confidence(candidate.confidence)
                ).value,
                evidence=evidence[-20:],
            )
        )
        await self._repository.session.refresh(target)

    async def _supersede(self, user_id: str | None, memory: LearnerMemory) -> None:
        memory.status = MemoryStatus.SUPERSEDED.value
        await self._repository.update(memory)

    async def _find_similar(
        self, user_id: str | None, category: str, memory_type: str, content: str, candidates: list[LearnerMemory] | None = None
    ) -> LearnerMemory | None:
        if candidates is None:
            candidates = await self._repository.list_active_for_user(user_id)
        same_category = [
            memory
            for memory in candidates
            if memory.category == category and memory.type == memory_type
        ]
        best: LearnerMemory | None = None
        best_overlap = 0.0
        for memory in same_category:
            overlap = self._overlap(memory.content, content)
            if overlap > best_overlap:
                best_overlap = overlap
                best = memory
        return best if best_overlap >= 0.5 else None

    @staticmethod
    def _overlap(left: str, right: str) -> float:
        left_words = set(left.split())
        right_words = set(right.split())
        if not left_words or not right_words:
            return 0.0
        return len(left_words & right_words) / max(len(left_words), len(right_words))

    async def _has_evidence(
        self, user_id: str | None, source_type: str, source_id: str | None, memories: list[LearnerMemory] | None = None
    ) -> bool:
        if not source_id:
            return False
        if memories is None:
            memories = await self._repository.list_active_for_user(user_id)
        for memory in memories:
            for item in memory.evidence or []:
                if item.get("source_type") == source_type and item.get("source_id") == source_id:
                    return True
        return False

    # -- retention / expiry --------------------------------------------------

    async def expire_temporary(self, user_id: str | None) -> int:
        """Mark goal/milestone memories older than the expiry window as expired."""
        memories = await self._repository.list_active_for_user(user_id)
        now = datetime.now(timezone.utc)
        window = timedelta(days=self._settings.ai_memory_temporary_expiry_days)
        expired = 0
        for memory in memories:
            if memory.memory_class != MemoryClass.TEMPORARY.value:
                continue
            last_seen = memory.last_seen_at
            if last_seen.tzinfo is None:
                last_seen = last_seen.replace(tzinfo=timezone.utc)
            if now - last_seen > window:
                memory.status = MemoryStatus.EXPIRED.value
                await self._repository.update(memory)
                expired += 1
        return expired

    # -- user-facing operations ----------------------------------------------

    async def list_for_user(
        self,
        user_id: str | None,
        *,
        category: str | None = None,
        memory_type: str | None = None,
        source: str | None = None,
        status: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[LearnerMemory], int]:
        return await self._repository.list_by_user(
            user_id,
            category=category,
            type=memory_type,
            source=source,
            status=status,
            skip=skip,
            limit=limit,
        )

    async def get_for_user(self, user_id: str | None, memory_id: str) -> LearnerMemory | None:
        return await self._repository.get_for_user(user_id, memory_id)

    async def create_explicit(
        self,
        user_id: str | None,
        category: str,
        memory_type: str,
        content: str,
        importance: int,
    ) -> LearnerMemory:
        if category not in MEMORY_CATEGORIES:
            category = "preference"
        if memory_type not in MEMORY_TYPES:
            memory_type = "preference"
        return await self._create(
            user_id,
            category=category,
            memory_type=memory_type,
            content=content,
            confidence=ConfidenceLevel.HIGH,
            importance=max(1, min(10, importance)),
            source_type=MemorySource.USER_EXPLICIT.value,
            source_id=None,
        )

    async def forget(self, user_id: str | None, memory_id: str) -> bool:
        memory = await self._repository.get_for_user(user_id, memory_id)
        if memory is None:
            return False
        await self._repository.delete(memory)
        return True

    async def archive(self, user_id: str | None, memory_id: str) -> bool:
        memory = await self._repository.get_for_user(user_id, memory_id)
        if memory is None:
            return False
        memory.status = MemoryStatus.ARCHIVED.value
        await self._repository.update(memory)
        return True

    async def refresh(self, user_id: str | None) -> dict[str, int]:
        """Idempotently re-run extraction over recent evidence events.

        Each candidate is skipped when its evidence already exists in a
        memory, so repeated refreshes are safe.
        """
        counts = {"processed_events": 0, "created": 0, "updated": 0, "rejected": 0}
        if self._attempts is not None:
            recent_attempts = await self._attempts.list_recent_with_feedback_and_exercise(
                user_id, limit=5
            )
            for attempt, feedback, exercise in recent_attempts:
                outcome = await self.ingest_event(
                    user_id,
                    MemorySource.EVALUATION.value,
                    attempt.id,
                    self._attempt_context(attempt, feedback, exercise),
                )
                counts["processed_events"] += 1
                counts["created"] += outcome["created"]
                counts["updated"] += outcome["updated"]
                counts["rejected"] += outcome["rejected"]
        if self._simulations is not None:
            recent_sessions = await self._simulations.list_recent_for_user(user_id, limit=3)
            for session in recent_sessions:
                outcome = await self.ingest_event(
                    user_id,
                    MemorySource.SIMULATION.value,
                    session.id,
                    {
                        "scenario_id": session.scenario_id,
                        "status": session.status,
                        "difficulty": getattr(session, "difficulty", None),
                        "summary_vi": getattr(session, "summary_vi", None),
                    },
                )
                counts["processed_events"] += 1
                counts["created"] += outcome["created"]
                counts["updated"] += outcome["updated"]
                counts["rejected"] += outcome["rejected"]
        counts["expired"] = await self.expire_temporary(user_id)
        return counts

    @staticmethod
    def _attempt_context(attempt: Any, feedback: Any, exercise: Any) -> dict[str, Any]:
        """Evidence identifiers only — never raw learner writing."""
        context: dict[str, Any] = {
            "exercise_id": exercise.id,
            "topic": exercise.topic,
            "register": exercise.register,
            "jlpt_level": exercise.jlpt_level,
            "difficulty": exercise.difficulty,
            "status": attempt.status,
            "attempt_number": attempt.attempt_number,
        }
        if feedback is not None:
            context.update(
                {
                    "overall_score": feedback.overall_score,
                    "semantic_score": feedback.semantic_score,
                    "grammar_score": feedback.grammar_score,
                    "vocabulary_score": feedback.vocabulary_score,
                    "naturalness_score": feedback.naturalness_score,
                    "register_fit_score": feedback.register_fit_score,
                    "top_issues": [
                        {
                            "kind": issue.get("kind"),
                            "severity": issue.get("severity"),
                            "example": issue.get("example"),
                        }
                        for issue in (feedback.issues or [])[:3]
                    ],
                }
            )
        return context
