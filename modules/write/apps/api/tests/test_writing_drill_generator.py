"""Unit tests for WritingDrillGenerator (Phase 18).

Tests deterministic adaptive drill selection, stage progression, variety,
and AI generation with fallback resilience.
"""

import pytest
from app.schemas.writing_drill import DrillGuidanceLevel, WritingDrillType
from app.services.writing_drill_generator import WritingDrillGenerator


def test_adaptive_drill_selection_particles():
    types = WritingDrillGenerator.select_drill_types("grammar", "particles")
    assert types == [
        WritingDrillType.RECOGNITION,
        WritingDrillType.PATTERN_SUBSTITUTION,
        WritingDrillType.CORRECTION,
        WritingDrillType.VIETNAMESE_TO_JAPANESE,
    ]


def test_adaptive_drill_selection_collocation():
    types = WritingDrillGenerator.select_drill_types("lexicon", "collocation")
    assert types == [
        WritingDrillType.RECOGNITION,
        WritingDrillType.PATTERN_SUBSTITUTION,
        WritingDrillType.VIETNAMESE_TO_JAPANESE,
        WritingDrillType.FREE_RESPONSE,
    ]


def test_adaptive_drill_selection_literal_translation():
    types = WritingDrillGenerator.select_drill_types("naturalness", "literal_translation")
    assert types == [
        WritingDrillType.VIETNAMESE_TO_JAPANESE,
        WritingDrillType.JAPANESE_TO_NATURAL_REWRITE,
        WritingDrillType.REWRITE,
        WritingDrillType.FREE_RESPONSE,
    ]


def test_adaptive_drill_selection_register():
    types = WritingDrillGenerator.select_drill_types("register", "business_register")
    assert types == [
        WritingDrillType.RECOGNITION,
        WritingDrillType.REWRITE,
        WritingDrillType.PATTERN_SUBSTITUTION,
        WritingDrillType.REAL_WORLD_MINI_TASK,
    ]


def test_adaptive_drill_selection_coherence():
    types = WritingDrillGenerator.select_drill_types("discourse", "coherence")
    assert types == [
        WritingDrillType.RECOGNITION,
        WritingDrillType.REWRITE,
        WritingDrillType.PATTERN_SUBSTITUTION,
        WritingDrillType.FREE_RESPONSE,
    ]


def test_adaptive_drill_selection_fallback_unknown():
    types = WritingDrillGenerator.select_drill_types("unknown_category", "unknown_subtype")
    assert len(types) == 4
    assert WritingDrillType.RECOGNITION in types


def test_fallback_generator_creates_4_stages():
    generator = WritingDrillGenerator()
    draft = generator.generate_fallback_drills(
        category="grammar",
        subtype="particles",
        description="Sử dụng trợ từ tiếng Nhật",
        user_level="N3",
    )
    assert len(draft.items) == 4
    assert draft.items[0].stage == 1
    assert draft.items[0].guidance_level == DrillGuidanceLevel.HEAVY_GUIDANCE.value
    assert draft.items[1].stage == 2
    assert draft.items[1].guidance_level == DrillGuidanceLevel.LIGHT_GUIDANCE.value
    assert draft.items[2].stage == 3
    assert draft.items[2].guidance_level == DrillGuidanceLevel.MINIMAL_GUIDANCE.value
    assert draft.items[3].stage == 4
    assert draft.items[3].guidance_level == DrillGuidanceLevel.NO_GUIDANCE.value


@pytest.mark.asyncio
async def test_ai_drill_generation_with_fake_provider():
    generator = WritingDrillGenerator()
    draft = await generator.generate_drill_draft(
        weakness={"category": "grammar", "subtype": "particles", "description": "Sử dụng trợ từ"},
        mastery_score=0.3,
        user_level="N3",
    )
    assert draft.title
    assert len(draft.items) >= 3
    assert draft.items[0].stage == 1
    assert draft.items[0].target_answer


@pytest.mark.asyncio
async def test_evaluate_attempt_recognition_exact_match():
    generator = WritingDrillGenerator()
    item = {
        "drill_type": "recognition",
        "options": [
            {"id": "a", "text": "で", "is_correct": True, "explanation": "Đúng"},
            {"id": "b", "text": "に", "is_correct": False, "explanation": "Sai"},
        ],
        "target_answer": "で",
    }
    result = await generator.evaluate_attempt(item, "a")
    assert result.is_correct is True
    assert result.score == 100

    wrong_result = await generator.evaluate_attempt(item, "b")
    assert wrong_result.is_correct is False
    assert wrong_result.score < 50
