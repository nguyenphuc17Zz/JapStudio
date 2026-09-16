"""Survival Speaking & Speech Recovery Domain Package."""

from app.domains.survival.contracts import (
    CircumlocutionTask,
    RepairStrategy,
    SayItBetterVariants,
    SocialRelationship,
    SurvivalDifficulty,
    SurvivalEvaluationRequest,
    SurvivalEvaluationResult,
    SurvivalHintTier,
    SurvivalMode,
    SurvivalScenarioTask,
    SurvivalVocabularyItem,
)
from app.domains.survival.evaluator import SurvivalEvaluator
from app.domains.survival.fast_pass import (
    check_taboo_violation,
    evaluate_circumlocution_fast_pass,
    evaluate_scenario_fast_pass,
)
from app.domains.survival.generator import SurvivalTaskGenerator
from app.domains.survival.pools import (
    SEED_CIRCUMLOCUTION_TASKS,
    SEED_SURVIVAL_SCENARIOS,
    SURVIVAL_TOPICS,
)

__all__ = [
    "CircumlocutionTask",
    "RepairStrategy",
    "SayItBetterVariants",
    "SocialRelationship",
    "SurvivalDifficulty",
    "SurvivalEvaluationRequest",
    "SurvivalEvaluationResult",
    "SurvivalEvaluator",
    "SurvivalHintTier",
    "SurvivalMode",
    "SurvivalScenarioTask",
    "SurvivalTaskGenerator",
    "SurvivalVocabularyItem",
    "SEED_CIRCUMLOCUTION_TASKS",
    "SEED_SURVIVAL_SCENARIOS",
    "SURVIVAL_TOPICS",
    "check_taboo_violation",
    "evaluate_circumlocution_fast_pass",
    "evaluate_scenario_fast_pass",
]
