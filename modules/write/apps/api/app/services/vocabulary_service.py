"""Vocabulary intelligence service (Phase 5).

Pipeline per attempt (secondary to the writing evaluation - a failure here
never breaks evaluation):

    Candidate extraction (vocabulary_extraction:v1)
        -> filter (low confidence, importance below threshold)
        -> deterministic deduplication (normalized expression equality)
        -> per-candidate validation (vocabulary_validation:v1, incl. AI
           duplicate detection for inflected forms / variants)
        -> batch explanation (vocabulary_explanation:v1)
        -> persistence (entry + user state counters + discovery provenance)

Extraction is idempotent: re-running merges into existing entries instead of
creating duplicates.
"""

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.exc import IntegrityError

from app.core.config import Settings, get_settings
from app.core.errors import VocabularyExtractionError
from app.models import (
    Exercise,
    ExerciseAttempt,
    UserVocabulary,
    VocabularyConfidence,
    VocabularyDiscovery,
    VocabularyEntry,
    VocabularyFamiliarity,
    VocabularySourceType,
    VocabularyType,
)
from app.prompts.common import VOCABULARY_VERSION
from app.prompts.vocabulary_explanation import (
    build_vocabulary_explanation_prompt,
)
from app.prompts.vocabulary_extraction import (
    build_vocabulary_extraction_prompt,
    vocabulary_extraction_prompt_version,
)
from app.prompts.vocabulary_lookup import (
    build_vocabulary_lookup_prompt,
)
from app.prompts.vocabulary_validation import (
    build_vocabulary_validation_prompt,
)
from app.quality.service import create_quality_service
from app.repositories import (
    ExerciseAttemptRepository,
    ExerciseRepository,
    UserVocabularyRepository,
    VocabularyDiscoveryRepository,
    VocabularyEntryRepository,
    WritingFeedbackRepository,
)
from app.schemas.evaluation_ai import WritingEvaluation
from app.schemas.vocabulary import (
    VocabLookupRequest,
    VocabLookupResponse,
    VocabSaveLookupRequest,
)
from app.schemas.vocabulary_ai import (
    VocabLookupAiResult,
    VocabularyCandidate,
    VocabularyExplanationResult,
    VocabularyExtractionResult,
    VocabularyValidationResult,
)
from app.services.ai_service import AIService
from app.services.furigana_service import furigana_service
from app.services.vocabulary_familiarity import derive_familiarity
from app.services.vocabulary_normalization import normalize_expression


logger = logging.getLogger("app.vocabulary")


class VocabularyService:
    """Owns the vocabulary extraction pipeline and Vocabulary Bank queries."""

    def __init__(
        self,
        ai_service: AIService,
        entry_repository: VocabularyEntryRepository,
        user_repository: UserVocabularyRepository,
        discovery_repository: VocabularyDiscoveryRepository,
        attempt_repository: ExerciseAttemptRepository,
        feedback_repository: WritingFeedbackRepository,
        exercise_repository: ExerciseRepository,
        settings: Settings | None = None,
    ) -> None:
        self._ai = ai_service
        self._entries = entry_repository
        self._users = user_repository
        self._discoveries = discovery_repository
        self._attempts = attempt_repository
        self._feedback = feedback_repository
        self._exercises = exercise_repository
        self._settings = settings or get_settings()
        self._quality = create_quality_service(settings=self._settings)

    # -- provider/model resolution -----------------------------------------

    def _task(self, override: str | None = None) -> tuple[str | None, str | None]:
        provider = (
            self._settings.ai_vocabulary_provider
            or self._settings.ai_exercise_evaluation_provider
            or self._settings.ai_exercise_generation_provider
            or self._settings.ai_default_provider
            or None
        )
        model = self._settings.ai_vocabulary_model or None
        if override:
            model = override
        return provider, model

    # -- extraction ----------------------------------------------------------

    async def extract_for_attempt(self, attempt_id: str) -> dict[str, int]:
        """Run the full extraction pipeline for one attempt (idempotent)."""
        attempt = await self._attempts.get(attempt_id)
        if attempt is None:
            raise VocabularyExtractionError(f"Attempt '{attempt_id}' not found")
        feedback = await self._feedback.get_by_attempt(attempt_id)
        if feedback is None:
            raise VocabularyExtractionError(f"Attempt '{attempt_id}' has no evaluation")
        exercise = await self._exercises.get(attempt.exercise_id)
        if exercise is None:
            raise VocabularyExtractionError(
                f"Exercise '{attempt.exercise_id}' of attempt '{attempt_id}' not found"
            )
        evaluation = WritingEvaluation.model_validate(feedback.evaluation)
        return await self._run(exercise, attempt, evaluation.model_dump(mode="json"))

    async def extract_for_turn(self, attempt_id: str, evaluation: dict[str, Any]) -> dict[str, int]:
        """Run the extraction pipeline for a simulation turn (isolated).

        ``evaluation`` is the simulation turn evaluation payload (scores,
        issues, corrections); it is read-only and never persisted as
        WritingFeedback - the simulation owns its own evaluation rows.
        """
        attempt = await self._attempts.get(attempt_id)
        if attempt is None:
            raise VocabularyExtractionError(f"Attempt '{attempt_id}' not found")
        exercise = await self._exercises.get(attempt.exercise_id)
        if exercise is None:
            raise VocabularyExtractionError(
                f"Exercise '{attempt.exercise_id}' of attempt '{attempt_id}' not found"
            )
        return await self._run(exercise, attempt, evaluation)

    async def _run(
        self,
        exercise: Exercise,
        attempt: ExerciseAttempt,
        evaluation: dict[str, Any],
    ) -> dict[str, int]:
        provider, model = self._task()
        try:
            result, _ = await self._ai.generate_structured(
                build_vocabulary_extraction_prompt(exercise, attempt.answer_text, evaluation),
                VocabularyExtractionResult,
                provider=provider,
                model=model,
                max_tokens=self._settings.ai_vocabulary_max_tokens,
            )
        except Exception as exc:
            logger.warning("vocabulary extraction failed attempt=%s error=%s", attempt.id, exc)
            raise VocabularyExtractionError(f"Vocabulary extraction failed: {exc}") from exc

        extraction_meta = self._stage_meta(
            "extraction", provider, model, vocabulary_extraction_prompt_version()
        )
        self._quality.validate(
            "vocabulary_extraction",
            result,
            provider=provider,
            model=model,
        )
        existing = await self._entries.list_expressions(limit=200)
        existing_by_normalized = {normalize_expression(expr): expr for expr in existing}

        summary = {"created": 0, "merged": 0, "rejected": 0, "skipped": 0}
        candidates = self._filter_candidates(result.candidates, summary)

        # Pre-filter: only candidates needing AI validation run in parallel (bounded)
        import asyncio

        to_validate: list[tuple[int, VocabularyCandidate]] = []
        for idx, cand in enumerate(candidates):
            if normalize_expression(cand.expression) not in existing_by_normalized:
                to_validate.append((idx, cand))

        # Parallel validation with semaphore 3
        sem = asyncio.Semaphore(3)

        async def _validated(pair: tuple[int, VocabularyCandidate]):
            idx, cand = pair
            async with sem:
                return idx, await self._validate_candidate(cand, provider, model, existing)

        validated_map: dict[int, VocabularyValidationResult | None] = {}
        if to_validate:
            results = await asyncio.gather(*[_validated(p) for p in to_validate])
            validated_map = {idx: val for idx, val in results}

        approved: list[VocabularyCandidate] = []
        for idx, candidate in enumerate(candidates):
            own_norm = normalize_expression(candidate.expression)
            target = existing_by_normalized.get(own_norm)
            validation: VocabularyValidationResult | None = validated_map.get(idx) if target is None else None
            if target is None:
                if validation is None:
                    summary["skipped"] += 1
                    continue
                if validation.duplicate_of:
                    dup_norm = normalize_expression(validation.duplicate_of)
                    target = existing_by_normalized.get(dup_norm)
                if target is not None:
                    summary["merged"] += 1
                    await self._merge_into(exercise, attempt, candidate, target, extraction_meta)
                    continue
                if not validation.approved:
                    summary["rejected"] += 1
                    logger.info(
                        "vocabulary candidate rejected expression=%s reason=%s",
                        candidate.expression,
                        validation.rejected_reason or "unspecified",
                    )
                    continue
                candidate = self._apply_corrections(candidate, validation)
            else:
                summary["merged"] += 1
                await self._merge_into(exercise, attempt, candidate, target, extraction_meta)
                continue

            summary["created"] += 1
            await self._create_entry(exercise, attempt, candidate, extraction_meta)
            approved.append(candidate)

        if approved:
            try:
                explanations = await self._explain(approved, provider, model)
                await self._apply_explanations(explanations)
            except Exception as exc:
                logger.warning(
                    "vocabulary explanation failed attempt=%s error=%s "
                    "falling back to candidate fields",
                    attempt.id,
                    exc,
                )

        summary["total"] = (
            summary["created"] + summary["merged"] + summary["rejected"] + summary["skipped"]
        )
        logger.info(
            "vocabulary extraction attempt=%s created=%d merged=%d rejected=%d skipped=%d",
            attempt.id,
            summary["created"],
            summary["merged"],
            summary["rejected"],
            summary["skipped"],
        )
        return summary

    def _filter_candidates(
        self, candidates: list[VocabularyCandidate], summary: dict[str, int]
    ) -> list[VocabularyCandidate]:
        kept = []
        for candidate in candidates:
            if candidate.confidence == "low":
                summary["skipped"] += 1
                continue
            if candidate.importance < self._settings.ai_vocabulary_min_importance:
                summary["skipped"] += 1
                continue
            kept.append(candidate)
        return kept

    async def _validate_candidate(
        self,
        candidate: VocabularyCandidate,
        provider: str | None,
        model: str | None,
        existing_expressions: list[str],
    ) -> VocabularyValidationResult | None:
        try:
            result, _ = await self._ai.generate_structured(
                build_vocabulary_validation_prompt(
                    candidate.model_dump(mode="json"),
                    existing_expressions,
                ),
                VocabularyValidationResult,
                provider=provider,
                model=self._settings.ai_vocabulary_validation_model or model,
                max_tokens=512,
            )
        except Exception as exc:
            logger.warning(
                "vocabulary validation failed expression=%s error=%s", candidate.expression, exc
            )
            return None
        return result

    def _apply_corrections(
        self, candidate: VocabularyCandidate, validation: VocabularyValidationResult
    ) -> VocabularyCandidate:
        values: dict[str, Any] = {
            "confidence": validation.confidence,
        }
        if validation.corrected_expression:
            values["expression"] = validation.corrected_expression
        if validation.corrected_reading:
            values["reading"] = validation.corrected_reading
        if validation.corrected_meaning_vi:
            values["meaning_vi"] = validation.corrected_meaning_vi
        if validation.corrected_jlpt_level:
            values["estimated_jlpt_level"] = validation.corrected_jlpt_level
        if validation.corrected_difficulty:
            values["difficulty"] = validation.corrected_difficulty
        if validation.corrected_register:
            values["register"] = validation.corrected_register
        return candidate.model_copy(update=values)

    async def _explain(
        self, candidates: list[VocabularyCandidate], provider: str | None, model: str | None
    ) -> VocabularyExplanationResult:
        result, _ = await self._ai.generate_structured(
            build_vocabulary_explanation_prompt(
                [candidate.model_dump(mode="json") for candidate in candidates]
            ),
            VocabularyExplanationResult,
            provider=provider,
            model=self._settings.ai_vocabulary_explanation_model or model,
            max_tokens=self._settings.ai_vocabulary_max_tokens,
        )
        return result

    async def _apply_explanations(self, explanations: VocabularyExplanationResult) -> None:
        if not explanations.explanations:
            return
        # Batch fetch entries by normalized expression to avoid N queries
        from sqlalchemy import select

        from app.models.vocabulary import VocabularyEntry

        norms = [normalize_expression(i.expression) for i in explanations.explanations]
        try:
            rows = (
                await self._entries._session.execute(select(VocabularyEntry).where(VocabularyEntry.normalized_expression.in_(norms)))
            ).scalars().all()
            by_norm = {r.normalized_expression: r for r in rows}
        except Exception:
            by_norm = {}
            for item in explanations.explanations:
                try:
                    e = await self._entries.get_by_normalized(normalize_expression(item.expression))
                    if e:
                        by_norm[e.normalized_expression] = e
                except Exception:
                    continue
        # Batch fetch user vocab states
        entry_ids = [e.id for e in by_norm.values()]
        states_by_entry: dict[str, object] = {}
        if entry_ids:
            try:
                from app.models.vocabulary import UserVocabulary

                srows = (
                    await self._users._session.execute(select(UserVocabulary).where(UserVocabulary.entry_id.in_(entry_ids)))
                ).scalars().all()
                states_by_entry = {s.entry_id: s for s in srows}
            except Exception:
                states_by_entry = {}
        for item in explanations.explanations:
            entry = by_norm.get(normalize_expression(item.expression))
            if entry is None:
                continue
            entry.notes = item.notes
            entry.example_sentence = item.example_sentence
            entry.natural_alternatives = item.natural_alternatives
            await self._entries.update(entry)
            state = states_by_entry.get(entry.id)
            if state is not None:
                state.learning_reason = item.learning_reason  # type: ignore[union-attr]
                await self._users.update(state)

    # -- persistence ---------------------------------------------------------

    async def _create_entry(
        self,
        exercise: Exercise,
        attempt: ExerciseAttempt,
        candidate: VocabularyCandidate,
        extraction_meta: dict[str, Any],
    ) -> None:
        entry = await self._entries.add(
            VocabularyEntry(
                expression=candidate.expression,
                normalized_expression=normalize_expression(candidate.expression),
                reading=candidate.reading,
                type=VocabularyType(candidate.type),
                meaning_vi=candidate.meaning_vi,
                part_of_speech=candidate.part_of_speech,
                estimated_jlpt_level=candidate.estimated_jlpt_level,
                difficulty=candidate.difficulty,
                register=candidate.register,
                usage_context=candidate.usage_context,
                example_sentence=candidate.example_sentence,
                natural_alternatives=candidate.natural_alternatives,
                notes=None,
                importance=candidate.importance,
                confidence=VocabularyConfidence(candidate.confidence),
                provenance=dict(
                    provider=extraction_meta["provider"],
                    model=extraction_meta["model"],
                    prompt_version=extraction_meta["prompt_version"],
                    vocabulary_version=VOCABULARY_VERSION,
                ),
            )
        )
        await self._add_user_state(exercise, attempt, entry, candidate, is_new=True)
        await self._add_discovery(exercise, attempt, entry, candidate, extraction_meta)

    async def _merge_into(
        self,
        exercise: Exercise,
        attempt: ExerciseAttempt,
        candidate: VocabularyCandidate,
        target_normalized: str,
        extraction_meta: dict[str, Any],
    ) -> None:
        entry = await self._entries.get_by_normalized(target_normalized)
        if entry is None:
            logger.warning("vocabulary merge target missing normalized=%s", target_normalized)
            return
        if (
            await self._discoveries.get_by_attempt_entry_source(
                attempt.id, entry.id, candidate.source_type
            )
            is not None
        ):
            return
        await self._add_user_state(exercise, attempt, entry, candidate, is_new=False)
        await self._add_discovery(exercise, attempt, entry, candidate, extraction_meta)

    async def _add_user_state(
        self,
        exercise: Exercise,
        attempt: ExerciseAttempt,
        entry: VocabularyEntry,
        candidate: VocabularyCandidate,
        *,
        is_new: bool,
    ) -> None:
        state = await self._users.get_by_entry(entry.id)
        now = datetime.now(timezone.utc)
        is_new_state = state is None
        if state is None:
            state = await self._users.add(
                UserVocabulary(
                    user_id=None,
                    entry_id=entry.id,
                    discovered_count=0,
                    seen_count=0,
                    used_count=0,
                    incorrect_count=0,
                    correct_usage_count=0,
                    familiarity=VocabularyFamiliarity.NEW,
                    last_seen=now,
                    source_attempt_id=attempt.id,
                    source_exercise_id=exercise.id,
                    user_expression=candidate.user_expression,
                    learning_reason=candidate.learning_reason,
                )
            )
        state.discovered_count += 1
        state.seen_count += 1
        state.last_seen = now
        if candidate.source_type == VocabularySourceType.USER_ANSWER.value:
            was_unused = state.used_count == 0
            state.used_count += 1
            if was_unused:
                state.first_used_at = now
            if candidate.user_expression:
                state.incorrect_count += 1
            else:
                state.correct_usage_count += 1
        if is_new_state:
            state.source_attempt_id = attempt.id
            state.source_exercise_id = exercise.id
            state.user_expression = candidate.user_expression
            state.learning_reason = candidate.learning_reason
            state.discovered_at = now
        state.familiarity = derive_familiarity(
            discovered_count=state.discovered_count,
            seen_count=state.seen_count,
            used_count=state.used_count,
            incorrect_count=state.incorrect_count,
            correct_usage_count=state.correct_usage_count,
        )
        await self._users.update(state)

    async def _add_discovery(
        self,
        exercise: Exercise,
        attempt: ExerciseAttempt,
        entry: VocabularyEntry,
        candidate: VocabularyCandidate,
        extraction_meta: dict[str, Any],
    ) -> None:
        try:
            await self._discoveries.add(
                VocabularyDiscovery(
                    entry_id=entry.id,
                    attempt_id=attempt.id,
                    exercise_id=exercise.id,
                    source_type=VocabularySourceType(candidate.source_type),
                    user_expression=candidate.user_expression,
                    learning_reason=candidate.learning_reason,
                    context_snippet=attempt.answer_text,
                    example_sentence=candidate.example_sentence,
                    provenance=dict(
                        provider=extraction_meta["provider"],
                        model=extraction_meta["model"],
                        prompt_version=extraction_meta["prompt_version"],
                        vocabulary_version=VOCABULARY_VERSION,
                    ),
                )
            )
        except IntegrityError:
            await self._discoveries.session.rollback()
            logger.info(
                "vocabulary discovery already recorded entry=%s attempt=%s source=%s",
                entry.id,
                attempt.id,
                candidate.source_type,
            )

    @staticmethod
    def _stage_meta(
        stage: str, provider: str | None, model: str | None, prompt_version: str
    ) -> dict[str, Any]:
        return {
            "stage": stage,
            "provider": provider or "unknown",
            "model": model or "unknown",
            "prompt_version": prompt_version,
            "vocabulary_version": VOCABULARY_VERSION,
        }

    # -- queries --------------------------------------------------------------

    async def list_bank(
        self,
        *,
        vocabulary_type: str | None = None,
        jlpt_level: str | None = None,
        difficulty_min: int | None = None,
        difficulty_max: int | None = None,
        register: str | None = None,
        source_type: str | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[tuple[VocabularyEntry, UserVocabulary | None]], int]:
        return await self._entries.list_bank(
            vocabulary_type=vocabulary_type,
            jlpt_level=jlpt_level,
            difficulty_min=difficulty_min,
            difficulty_max=difficulty_max,
            register=register,
            source_type=source_type,
            search=search,
            skip=skip,
            limit=limit,
        )

    async def get_detail(
        self, vocabulary_id: str
    ) -> tuple[VocabularyEntry, UserVocabulary | None] | None:
        entry = await self._entries.get(vocabulary_id)
        if entry is None:
            return None
        state = await self._users.get_by_entry(entry.id)
        return entry, state

    async def attempt_vocabulary(
        self, attempt_id: str
    ) -> list[tuple[VocabularyDiscovery, VocabularyEntry]]:
        return await self._discoveries.list_by_attempt(attempt_id)

    async def ai_lookup(self, request: VocabLookupRequest) -> VocabLookupResponse:
        """Perform contextual AI vocabulary lookup (VI ⇋ JA)."""
        provider, default_model = self._task()
        target_provider = request.provider or provider
        target_model = request.model or default_model

        prompt = build_vocabulary_lookup_prompt(
            query=request.query,
            context=request.context,
            direction=request.direction,
            register_preference=request.register_preference,
            target_level=request.target_level,
        )

        try:
            result, _ = await self._ai.generate_structured(
                prompt,
                VocabLookupAiResult,
                provider=target_provider,
                model=target_model,
                max_tokens=1500,
            )
        except Exception as exc:
            logger.warning("vocabulary lookup failed query=%s error=%s", request.query, exc)
            raise VocabularyExtractionError(f"Vocabulary lookup failed: {exc}") from exc

        # Enrich readings with SudachiPy if reading is missing or Japanese
        best_match_dict = result.best_match.model_dump()
        if not best_match_dict.get("reading") and any(
            "\u3040" <= c <= "\u30ff" or "\u4e00" <= c <= "\u9faf"
            for c in best_match_dict.get("expression", "")
        ):
            try:
                converted = furigana_service.tokenize_and_convert(best_match_dict["expression"])
                hiragana_parts = [t.furigana or t.surface for t in converted.tokens]
                best_match_dict["reading"] = "".join(hiragana_parts)
            except Exception:
                pass

        alt_dicts = []
        for alt in result.alternatives:
            alt_dict = alt.model_dump()
            if not alt_dict.get("reading") and any(
                "\u3040" <= c <= "\u30ff" or "\u4e00" <= c <= "\u9faf"
                for c in alt_dict.get("expression", "")
            ):
                try:
                    converted = furigana_service.tokenize_and_convert(alt_dict["expression"])
                    hiragana_parts = [t.furigana or t.surface for t in converted.tokens]
                    alt_dict["reading"] = "".join(hiragana_parts)
                except Exception:
                    pass
            alt_dicts.append(alt_dict)

        return VocabLookupResponse(
            query=request.query,
            detected_direction=result.detected_direction,
            context_used=request.context,
            best_match=best_match_dict,
            alternatives=alt_dicts,
            provider=target_provider,
            model=target_model,
        )

    async def save_lookup_entry(self, payload: VocabSaveLookupRequest) -> tuple[str, bool]:
        """Save a looked-up vocabulary word into the user's Vocabulary Bank."""
        normalized = normalize_expression(payload.expression)
        existing = await self._entries.get_by_normalized(normalized)
        now = datetime.now(timezone.utc)

        if existing is not None:
            state = await self._users.get_by_entry(existing.id)
            if state is not None:
                state.seen_count += 1
                state.last_seen = now
                state.familiarity = derive_familiarity(
                    discovered_count=state.discovered_count,
                    seen_count=state.seen_count,
                    used_count=state.used_count,
                    incorrect_count=state.incorrect_count,
                    correct_usage_count=state.correct_usage_count,
                )
                await self._users.update(state)
            return existing.id, False

        expr_len = len(payload.expression)
        vocab_type = VocabularyType.EXPRESSION if expr_len > 8 or " " in payload.expression else VocabularyType.WORD

        entry = await self._entries.add(
            VocabularyEntry(
                expression=payload.expression,
                normalized_expression=normalized,
                reading=payload.reading,
                type=vocab_type,
                meaning_vi=payload.meaning_vi,
                part_of_speech=payload.part_of_speech,
                estimated_jlpt_level=payload.estimated_jlpt_level,
                difficulty=payload.difficulty,
                register=payload.register,
                usage_context=None,
                example_sentence=payload.example_sentence or "",
                natural_alternatives=[],
                notes=payload.nuance_explanation or payload.notes,
                importance=8,
                confidence=VocabularyConfidence.HIGH,
                provenance=dict(
                    provider="lookup",
                    model="ai-lookup",
                    prompt_version=VOCABULARY_VERSION,
                    vocabulary_version=VOCABULARY_VERSION,
                ),
            )
        )

        await self._users.add(
            UserVocabulary(
                user_id=None,
                entry_id=entry.id,
                discovered_count=1,
                seen_count=1,
                used_count=0,
                incorrect_count=0,
                correct_usage_count=0,
                familiarity=VocabularyFamiliarity.NEW,
                last_seen=now,
                source_attempt_id=None,
                source_exercise_id=None,
                user_expression=None,
                learning_reason=payload.meaning_vi,
            )
        )

        return entry.id, True

