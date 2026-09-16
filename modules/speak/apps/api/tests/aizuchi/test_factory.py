"""Aizuchi factory tests — deterministic pools, no giant dicts, AI fallback safe."""

from app.domains.aizuchi.exercise_factory import AizuchiExerciseFactory
from app.domains.aizuchi.pools import BC_FORMS, BUSINESS_TURNS, CASUAL_TURNS


def test_pool_sizes():
    assert len(CASUAL_TURNS) == 15
    assert len(BUSINESS_TURNS) == 15
    for t in CASUAL_TURNS + BUSINESS_TURNS:
        assert t["text"] and t["expected_types"]


def test_policy_dict_small():
    # Guardrail: no giant hardcoded policy dicts
    total_forms = sum(len(v) for v in BC_FORMS.values())
    assert total_forms < 100


def test_build_reaction():
    f = AizuchiExerciseFactory()
    data = f.build_reaction(relation="casual_friend", window_profile="normal", num_turns=3)
    assert len(data["npc_turns"]) == 3
    assert data["window_ms"] == 600
    assert data["relation"] == "casual_friend"
    assert data["expected_types"]


def test_build_interrupt_business():
    f = AizuchiExerciseFactory()
    data = f.build_interrupt(relation="business_polite", window_profile="fast")
    assert data["window_ms"] == 450
    assert "polite_interrupt" in data["expected_types"]
    assert "すみません" in data["instructions"]


def test_no_repetition_burst():
    f = AizuchiExerciseFactory()
    seen = set()
    for _ in range(6):
        d = f.build_reaction(num_turns=3)
        for t in d["npc_turns"]:
            seen.add(t["text"])
    # 18 draws from 15-turn pool with shuffle queues -> at least 10 unique
    assert len(seen) >= 10


def test_generator_force_ai_parameter():
    import inspect
    from app.domains.aizuchi.dynamic_generator import AIAizuchiGenerator

    sig = inspect.signature(AIAizuchiGenerator.generate_dynamic_exercise)
    assert "force_ai" in sig.parameters
    assert sig.parameters["force_ai"].default is False

