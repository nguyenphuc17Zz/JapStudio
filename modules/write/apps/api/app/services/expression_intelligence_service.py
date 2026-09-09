"""Expression Intelligence Service (Phase 21).

Orchestrates:
1. Collocation intelligence & lexical naturalness analysis
2. Personal Expression Bank tracking & persistence
3. Overuse and repetition detection with context-sensitive evaluation
4. 5-tier Register transformation ladder (casual -> highly_formal)
5. Natural expression variation ("Write this meaning in 3 different natural ways")
6. Vietnamese-to-Japanese literalization detection with 3-tier classification
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.exc import IntegrityError

from app.core.config import Settings, get_settings
from app.models.expression_intelligence import ExpressionRecord
from app.prompts.collocation_analysis import (
    build_collocation_analysis_prompt,
    build_collocation_suggestions_prompt,
)
from app.prompts.expression_variation import (
    build_expression_variation_prompt,
)
from app.prompts.register_transformation import (
    build_register_transformation_prompt,
)
from app.repositories.expression_intelligence import ExpressionRecordRepository
from app.schemas.expression_intelligence_ai import (
    CollocationAnalysisResult,
    CollocationSuggestionsResult,
    ExpressionVariationResult,
    RegisterTransformationResult,
)
from app.services.ai_service import AIService

logger = logging.getLogger("app.expression_intelligence")

_MAX_EXAMPLES = 5


class ExpressionIntelligenceService:
    """Core domain service for Japanese Expression Intelligence."""

    def __init__(
        self,
        repository: ExpressionRecordRepository,
        settings: Settings | None = None,
        ai_service: AIService | None = None,
    ) -> None:
        self._repo = repository
        self._settings = settings or get_settings()
        self._ai = ai_service or AIService(settings=self._settings)

    # -- AI Analysis Operations ----------------------------------------------

    async def analyze_expressions(
        self,
        user_id: str | None,
        text: str,
        context_vi: str | None = None,
        target_register: str | None = None,
        provider: str | None = None,
        model: str | None = None,
    ) -> CollocationAnalysisResult:
        """Analyzes a Japanese sentence for collocations, overuse, and Vietnamese transfer issues."""
        system_prompt, user_prompt = build_collocation_analysis_prompt(
            text=text,
            context_vi=context_vi,
            target_register=target_register,
        )

        result, _ = await self._ai.generate_structured(
            prompt=user_prompt,
            response_model=CollocationAnalysisResult,
            system=system_prompt,
            provider=provider or None,
            model=model or None,
        )

        # Automatically aggregate insights into the learner's expression bank
        try:
            await self.aggregate_from_evaluation(
                user_id=user_id,
                analysis_result=result,
                sample_text=text,
                context_register=target_register or "polite",
            )
        except Exception as e:
            logger.warning("Failed to automatically aggregate expression records: %s", e)

        return result

    async def generate_variations(
        self,
        text: str,
        context_vi: str | None = None,
        provider: str | None = None,
        model: str | None = None,
    ) -> ExpressionVariationResult:
        """Generates 3 distinct natural variations for an expression with synthesis challenge prompt."""
        system_prompt, user_prompt = build_expression_variation_prompt(
            text=text,
            context_vi=context_vi,
        )

        result, _ = await self._ai.generate_structured(
            prompt=user_prompt,
            response_model=ExpressionVariationResult,
            system=system_prompt,
            provider=provider or None,
            model=model or None,
        )
        return result

    async def transform_register(
        self,
        text: str,
        source_register: str,
        target_register: str,
        provider: str | None = None,
        model: str | None = None,
    ) -> RegisterTransformationResult:
        """Transforms a sentence across the 5-tier register ladder with honorific rationale."""
        system_prompt, user_prompt = build_register_transformation_prompt(
            text=text,
            source_register=source_register,
            target_register=target_register,
        )

        result, _ = await self._ai.generate_structured(
            prompt=user_prompt,
            response_model=RegisterTransformationResult,
            system=system_prompt,
            provider=provider or None,
            model=model or None,
        )
        return result

    async def get_collocation_suggestions(
        self,
        base_word: str,
        provider: str | None = None,
        model: str | None = None,
    ) -> CollocationSuggestionsResult:
        """Suggests authentic native Japanese collocations for a base word."""
        system_prompt, user_prompt = build_collocation_suggestions_prompt(base_word=base_word)

        result, _ = await self._ai.generate_structured(
            prompt=user_prompt,
            response_model=CollocationSuggestionsResult,
            system=system_prompt,
            provider=provider or None,
            model=model or None,
        )
        return result

    # -- Persistence & Aggregation -------------------------------------------

    async def aggregate_from_evaluation(
        self,
        user_id: str | None,
        analysis_result: CollocationAnalysisResult,
        sample_text: str,
        context_register: str = "polite",
    ) -> None:
        """Upserts expression records into the learner's Expression Bank based on AI analysis."""
        now = datetime.now(timezone.utc)

        # 1. Process Collocations
        for col in analysis_result.collocations:
            record = await self._repo.get_by_expression(user_id, col.expression)
            is_unnatural = col.classification == "unnatural"
            is_natural = col.classification == "natural"

            if record:
                record.used_count += 1
                if is_unnatural:
                    record.misused_count += 1
                elif is_natural:
                    record.natural_use_count += 1

                registers = set(record.registers_used or [])
                if col.register:
                    registers.add(col.register)
                if context_register:
                    registers.add(context_register)
                record.registers_used = sorted(registers)

                if col.native_alternative and col.native_alternative not in (record.native_alternatives or []):
                    record.native_alternatives = list((record.native_alternatives or []) + [col.native_alternative])[:5]

                examples = list(record.example_contexts or [])
                if sample_text and sample_text not in examples:
                    examples.append(sample_text)
                    record.example_contexts = examples[-_MAX_EXAMPLES:]

                score_increment = 95.0 if is_natural else (70.0 if col.classification == "acceptable" else 40.0)
                record.naturalness_avg = round((record.naturalness_avg * 0.7) + (score_increment * 0.3), 1)
                record.last_used_at = now
                if col.explanation_vi and not record.nuance_notes:
                    record.nuance_notes = col.explanation_vi
            else:
                score = 95.0 if is_natural else (70.0 if col.classification == "acceptable" else 40.0)
                new_record = ExpressionRecord(
                    user_id=user_id,
                    expression=col.expression,
                    base_word=col.base_word or None,
                    expression_type="collocation",
                    used_count=1,
                    misused_count=1 if is_unnatural else 0,
                    natural_use_count=1 if is_natural else 0,
                    registers_used=[col.register or context_register],
                    naturalness_avg=score,
                    native_alternatives=[col.native_alternative] if col.native_alternative else [],
                    collocations=[],
                    example_contexts=[sample_text] if sample_text else [],
                    nuance_notes=col.explanation_vi or None,
                    first_used_at=now,
                    last_used_at=now,
                )
                try:
                    await self._repo.create(new_record)
                except IntegrityError:
                    pass

        # 2. Process Overuse Detections
        for over in analysis_result.overuse:
            record = await self._repo.get_by_expression(user_id, over.expression)
            expr_type = "sentence_ending" if any(k in over.expression for k in ("と思います", "です", "ます", "〜こと")) else "discourse_marker"

            if record:
                record.used_count += over.count
                if not over.is_legitimate:
                    record.is_overused = True
                    record.overuse_count += over.count
                if over.suggested_alternatives:
                    existing_alts = set(record.native_alternatives or [])
                    existing_alts.update(over.suggested_alternatives)
                    record.native_alternatives = list(existing_alts)[:6]
                record.last_used_at = now
            else:
                new_record = ExpressionRecord(
                    user_id=user_id,
                    expression=over.expression,
                    expression_type=expr_type,
                    used_count=over.count,
                    is_overused=not over.is_legitimate,
                    overuse_count=over.count if not over.is_legitimate else 0,
                    registers_used=[context_register],
                    naturalness_avg=60.0 if not over.is_legitimate else 85.0,
                    native_alternatives=over.suggested_alternatives or [],
                    collocations=[],
                    example_contexts=[sample_text] if sample_text else [],
                    nuance_notes=over.explanation_vi or None,
                    first_used_at=now,
                    last_used_at=now,
                )
                try:
                    await self._repo.create(new_record)
                except IntegrityError:
                    pass

        # 3. Process Vietnamese Transfer Detections
        for tr in analysis_result.transfers:
            record = await self._repo.get_by_expression(user_id, tr.expression)
            if record:
                record.vietnamese_literal = True
                record.transfer_classification = tr.classification
                record.misused_count += 1
                if tr.native_alternative and tr.native_alternative not in (record.native_alternatives or []):
                    record.native_alternatives = list((record.native_alternatives or []) + [tr.native_alternative])[:5]
                record.last_used_at = now
                if tr.explanation_vi:
                    record.nuance_notes = tr.explanation_vi
            else:
                new_record = ExpressionRecord(
                    user_id=user_id,
                    expression=tr.expression,
                    expression_type="set_phrase",
                    used_count=1,
                    misused_count=1,
                    natural_use_count=0,
                    vietnamese_literal=True,
                    transfer_classification=tr.classification,
                    registers_used=[context_register],
                    naturalness_avg=45.0,
                    native_alternatives=[tr.native_alternative] if tr.native_alternative else [],
                    collocations=[],
                    example_contexts=[sample_text] if sample_text else [],
                    nuance_notes=tr.explanation_vi or None,
                    first_used_at=now,
                    last_used_at=now,
                )
                try:
                    await self._repo.create(new_record)
                except IntegrityError:
                    pass

    # -- Query Methods -------------------------------------------------------

    async def list_expressions(
        self,
        user_id: str | None,
        *,
        expression_type: str | None = None,
        is_overused: bool | None = None,
        vietnamese_literal: bool | None = None,
        transfer_classification: str | None = None,
        base_word: str | None = None,
        limit: int = 50,
        skip: int = 0,
    ) -> tuple[list[ExpressionRecord], int]:
        return await self._repo.list_by_user(
            user_id,
            expression_type=expression_type,
            is_overused=is_overused,
            vietnamese_literal=vietnamese_literal,
            transfer_classification=transfer_classification,
            base_word=base_word,
            limit=limit,
            skip=skip,
        )

    async def get_expression(self, expression_id: str) -> ExpressionRecord | None:
        return await self._repo.get(expression_id)

    async def get_bank_summary(self, user_id: str | None) -> dict[str, Any]:
        return await self._repo.get_bank_summary(user_id)

    async def get_overused(self, user_id: str | None, min_count: int = 3, limit: int = 20) -> list[ExpressionRecord]:
        return await self._repo.get_overused(user_id, min_count=min_count, limit=limit)

    async def get_transfers(self, user_id: str | None, classification: str | None = None, limit: int = 20) -> list[ExpressionRecord]:
        if classification:
            return await self._repo.get_by_transfer_class(user_id, classification, limit=limit)
        items, _ = await self._repo.list_by_user(user_id, vietnamese_literal=True, limit=limit)
        return items
