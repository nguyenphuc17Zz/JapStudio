from __future__ import annotations

from typing import Any

from sqlalchemy import func, select

from app.models.expression_intelligence import ExpressionRecord
from app.repositories.base import BaseRepository


def _user_condition(model: object, user_id: str | None):
    """NULL user_id selects the anonymous learner's rows."""
    column = getattr(model, "user_id")
    return column.is_(None) if user_id is None else column == user_id


class ExpressionRecordRepository(BaseRepository[ExpressionRecord]):
    model = ExpressionRecord

    async def get_by_expression(
        self, user_id: str | None, expression: str
    ) -> ExpressionRecord | None:
        return await self._session.scalar(
            select(ExpressionRecord).where(
                _user_condition(ExpressionRecord, user_id),
                ExpressionRecord.expression == expression,
            )
        )

    async def list_by_user(
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
        query = select(ExpressionRecord).where(_user_condition(ExpressionRecord, user_id))

        if expression_type:
            query = query.where(ExpressionRecord.expression_type == expression_type)
        if is_overused is not None:
            query = query.where(ExpressionRecord.is_overused == is_overused)
        if vietnamese_literal is not None:
            query = query.where(ExpressionRecord.vietnamese_literal == vietnamese_literal)
        if transfer_classification:
            query = query.where(ExpressionRecord.transfer_classification == transfer_classification)
        if base_word:
            query = query.where(ExpressionRecord.base_word == base_word)

        # Count total
        count_stmt = select(func.count()).select_from(query.subquery())
        total = (await self._session.scalar(count_stmt)) or 0

        # Query items
        query = query.order_by(
            ExpressionRecord.is_overused.desc(),
            ExpressionRecord.used_count.desc(),
            ExpressionRecord.last_used_at.desc(),
        ).offset(skip).limit(limit)

        result = await self._session.scalars(query)
        return list(result.all()), total

    async def get_overused(
        self, user_id: str | None, min_count: int = 3, limit: int = 20
    ) -> list[ExpressionRecord]:
        result = await self._session.scalars(
            select(ExpressionRecord)
            .where(
                _user_condition(ExpressionRecord, user_id),
                (ExpressionRecord.is_overused == True) | (ExpressionRecord.overuse_count >= min_count),  # noqa: E712
            )
            .order_by(ExpressionRecord.overuse_count.desc(), ExpressionRecord.used_count.desc())
            .limit(limit)
        )
        return list(result.all())

    async def get_by_transfer_class(
        self, user_id: str | None, classification: str, limit: int = 20
    ) -> list[ExpressionRecord]:
        result = await self._session.scalars(
            select(ExpressionRecord)
            .where(
                _user_condition(ExpressionRecord, user_id),
                ExpressionRecord.transfer_classification == classification,
            )
            .order_by(ExpressionRecord.misused_count.desc(), ExpressionRecord.last_used_at.desc())
            .limit(limit)
        )
        return list(result.all())

    async def get_bank_summary(self, user_id: str | None) -> dict[str, Any]:
        records = await self._session.scalars(
            select(ExpressionRecord).where(_user_condition(ExpressionRecord, user_id))
        )
        all_records = list(records.all())

        total = len(all_records)
        overused_count = sum(1 for r in all_records if r.is_overused or r.overuse_count > 0)
        literal_count = sum(1 for r in all_records if r.vietnamese_literal)
        collocations_count = sum(1 for r in all_records if r.expression_type == "collocation")
        discourse_markers_count = sum(1 for r in all_records if r.expression_type == "discourse_marker")
        sentence_endings_count = sum(1 for r in all_records if r.expression_type == "sentence_ending")

        avg_naturalness = (
            sum(r.naturalness_avg for r in all_records) / total if total > 0 else 0.0
        )

        by_transfer = {
            "natural": sum(1 for r in all_records if r.transfer_classification == "natural"),
            "possible_but_unnatural": sum(1 for r in all_records if r.transfer_classification == "possible_but_unnatural"),
            "literal_translation": sum(1 for r in all_records if r.transfer_classification == "literal_translation"),
            "native_preferred": sum(1 for r in all_records if r.transfer_classification == "native_preferred"),
        }

        # Top overused list
        top_overused = sorted(
            [r for r in all_records if r.is_overused or r.overuse_count > 0],
            key=lambda r: (r.overuse_count, r.used_count),
            reverse=True,
        )[:5]

        # Top transfer problems
        top_transfers = sorted(
            [r for r in all_records if r.vietnamese_literal or r.transfer_classification != "natural"],
            key=lambda r: r.misused_count,
            reverse=True,
        )[:5]

        return {
            "total_expressions": total,
            "overused_count": overused_count,
            "literal_count": literal_count,
            "collocations_count": collocations_count,
            "discourse_markers_count": discourse_markers_count,
            "sentence_endings_count": sentence_endings_count,
            "average_naturalness": round(avg_naturalness, 1),
            "by_transfer_classification": by_transfer,
            "top_overused": top_overused,
            "top_transfers": top_transfers,
        }
