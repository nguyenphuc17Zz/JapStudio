import pytest
from app.domains.situations.dynamic_generator import SITUATIONAL_CATEGORIES, INFINITE_RANDOM_SEEDS
from app.domains.situations.scenario_generator import ScenarioGenerator


def test_situational_categories_completeness():
    assert len(SITUATIONAL_CATEGORIES) >= 6
    expected_cats = ["food", "retail", "transportation", "healthcare", "workplace", "travel"]
    for cat in expected_cats:
        assert cat in SITUATIONAL_CATEGORIES
        info = SITUATIONAL_CATEGORIES[cat]
        assert "ja" in info and len(info["ja"]) > 0
        assert "locations" in info and len(info["locations"]) > 0
        assert "roles" in info and len(info["roles"]) > 0


def test_infinite_random_seeds():
    assert len(INFINITE_RANDOM_SEEDS) >= 10
    for seed in INFINITE_RANDOM_SEEDS:
        assert "loc" in seed
        assert "role" in seed
        assert "topic" in seed


def test_scenario_generator_fallback():
    gen = ScenarioGenerator()
    sc = gen.generate(category="food", difficulty="normal", duration_minutes=5)
    assert "location" in sc
    assert "actors" in sc
    assert "goals" in sc
    assert len(sc["goals"]) > 0


from unittest.mock import AsyncMock, MagicMock
from app.domains.situations.dynamic_generator import AISituationsGenerator


@pytest.mark.asyncio
async def test_generator_force_ai_parameter():
    db = MagicMock()
    generator = AISituationsGenerator(db)
    generator._generate_raw_ai_situation = AsyncMock(return_value={
        "situation_title": "Tại quán Ramen Shinjuku",
        "location": "Quán Ramen",
        "npc_name": "Nhân viên quán",
        "npc_opening_dialogue": "いらっしゃいませ！何名様ですか？",
        "npc_dialogue_vi": "Kính chào quý khách! Quý khách đi mấy người ạ?",
        "goals": [{"id": "g1", "task": "Báo đi 1 người"}],
        "canonical": "一人です。",
        "ai_generated": True,
        "generation_source": "ai",
        "is_fallback": False,
    })

    # When force_ai=True, _generate_raw_ai_situation is called with force_ai=True
    result = await generator.generate_dynamic_exercise(
        category="food",
        force_ai=True,
    )
    assert result["generation_source"] == "ai"
    assert result["is_fallback"] is False
    generator._generate_raw_ai_situation.assert_called_once()
    assert generator._generate_raw_ai_situation.call_args.kwargs.get("force_ai") is True

