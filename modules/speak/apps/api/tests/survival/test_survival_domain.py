"""Unit tests for Survival Speaking & Speech Recovery domain."""

import pytest
from app.domains.survival.contracts import (
    CircumlocutionTask,
    RepairStrategy,
    SocialRelationship,
    SurvivalDifficulty,
    SurvivalEvaluationRequest,
    SurvivalMode,
    SurvivalScenarioTask,
)
from app.domains.survival.fast_pass import (
    check_taboo_violation,
    detect_repair_strategy,
    evaluate_circumlocution_fast_pass,
    evaluate_scenario_fast_pass,
    normalize_japanese_text,
)
from app.domains.survival.generator import SurvivalTaskGenerator
from app.domains.survival.pools import SEED_CIRCUMLOCUTION_TASKS, SEED_SURVIVAL_SCENARIOS


def test_normalize_japanese_text():
    raw = "電子レンジ、で！"
    norm = normalize_japanese_text(raw)
    assert norm == "電子レンジで"


def test_taboo_violation_detected():
    forbidden = ["電子レンジ", "レンジ", "microwave"]
    spoken = "これは電子レンジです。"
    violated, words = check_taboo_violation(spoken, forbidden)
    assert violated is True
    assert "電子レンジ" in words or "レンジ" in words


def test_taboo_violation_not_triggered():
    forbidden = ["電子レンジ", "レンジ"]
    spoken = "料理を温める四角い機械です。"
    violated, words = check_taboo_violation(spoken, forbidden)
    assert violated is False
    assert len(words) == 0


def test_detect_repair_strategy():
    assert detect_repair_strategy("そうですね…少し考えさせてください。") == RepairStrategy.BUYING_TIME
    assert detect_repair_strategy("申し訳ありません、もう一度お願いします。") == RepairStrategy.ASKING_REPETITION
    assert detect_repair_strategy("え、それってどういう意味ですか？") == RepairStrategy.ASKING_CLARIFICATION
    assert detect_repair_strategy("あ、違います、ラーメン一つです。") == RepairStrategy.SELF_CORRECTION
    assert detect_repair_strategy("要するに、こういうことです。") == RepairStrategy.SIMPLIFICATION


def test_circumlocution_fast_pass_success():
    task = SEED_CIRCUMLOCUTION_TASKS[0]  # 電子レンジ
    spoken = "冷たいご飯や料理をチンして温める台所の機械です。"
    res = evaluate_circumlocution_fast_pass(task, spoken, ttfw_ms=1500)
    assert res is not None
    assert res.is_successful is True
    assert res.taboo_violated is False
    assert res.overall_score >= 80
    assert res.speed_rating == "instant"
    assert res.is_fast_pass is True


def test_circumlocution_fast_pass_taboo_violation():
    task = SEED_CIRCUMLOCUTION_TASKS[0]  # 電子レンジ
    spoken = "レンジで温めるやつです。"
    res = evaluate_circumlocution_fast_pass(task, spoken)
    assert res is not None
    assert res.is_successful is False
    assert res.taboo_violated is True
    assert "レンジ" in res.violated_words
    assert res.overall_score <= 40


def test_scenario_fast_pass_success():
    task = SEED_SURVIVAL_SCENARIOS[0]  # boss question, recommended: BUYING_TIME
    spoken = "そうですね…少し考えを整理させていただけますでしょうか。"
    res = evaluate_scenario_fast_pass(task, spoken, ttfw_ms=1200)
    assert res is not None
    assert res.is_successful is True
    assert res.strategy_identified == RepairStrategy.BUYING_TIME
    assert res.overall_score >= 85


def test_seed_pools_validity():
    assert len(SEED_CIRCUMLOCUTION_TASKS) >= 5
    for task in SEED_CIRCUMLOCUTION_TASKS:
        assert task.target_word
        assert len(task.forbidden_words) > 0
        assert len(task.tier_hints) == 5

    assert len(SEED_SURVIVAL_SCENARIOS) >= 4
    for scen in SEED_SURVIVAL_SCENARIOS:
        assert scen.npc_utterance_ja
        assert scen.recommended_strategy
        assert len(scen.tier_hints) == 5


def test_task_generator_offline_seed():
    gen = SurvivalTaskGenerator(db=None)
    t1 = gen.get_seed_circumlocution_task()
    t2 = gen.get_seed_circumlocution_task()
    assert isinstance(t1, CircumlocutionTask)
    assert isinstance(t2, CircumlocutionTask)

    s1 = gen.get_seed_scenario_task()
    assert isinstance(s1, SurvivalScenarioTask)
