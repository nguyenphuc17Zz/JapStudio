"""Builder factory tests — deterministic pools, scaffold handling, no repetition bursts."""

from app.domains.builder.exercise_factory import BuilderExerciseFactory
from app.domains.builder.pools import get_seed_pool


def test_build_assemble_keywords_and_starter():
    f = BuilderExerciseFactory()
    data = f.build(sub_mode="sentence_assemble", scaffold="sentence_starter")
    assert len(data["keywords"]) >= 3
    assert data["starter"]
    assert data["timer_limit_ms"] == 20000
    assert not data["blind"]


def test_build_assemble_blind():
    f = BuilderExerciseFactory()
    data = f.build(sub_mode="sentence_assemble", scaffold="none")
    assert data["blind"] is True
    assert data["starter"] is None
    assert data["situation_vi"]


def test_build_expand_has_source():
    f = BuilderExerciseFactory()
    data = f.build(sub_mode="sentence_expand", scaffold="keyword_hint")
    assert data["source_sentence"]
    assert data["expand_requirement"]


def test_build_repair_has_source_and_hint():
    f = BuilderExerciseFactory()
    data = f.build(sub_mode="sentence_repair", scaffold="keyword_hint")
    assert data["source_sentence"]
    assert data["timer_limit_ms"] == 25000


def test_no_repetition_burst():
    f = BuilderExerciseFactory()
    seen = set()
    for _ in range(8):
        d = f.build(sub_mode="sentence_assemble")
        seen.add(" / ".join(d["keywords"]))
    assert len(seen) >= 6


def test_seed_pool_routing():
    assert len(get_seed_pool("sentence_assemble")) == 12
    assert len(get_seed_pool("sentence_expand")) == 9
    assert len(get_seed_pool("sentence_repair")) == 9


def test_generator_force_ai_parameter():
    import inspect
    from app.domains.builder.dynamic_generator import AIBuilderGenerator

    sig = inspect.signature(AIBuilderGenerator.generate_dynamic_exercise)
    assert "force_ai" in sig.parameters
    assert sig.parameters["force_ai"].default is False

