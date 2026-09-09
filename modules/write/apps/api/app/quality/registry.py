"""AI quality registry (Phase 11).

Maps task name -> validator -> quality policy -> verifier -> criticality.
Extensible: engines and tests register their own checkers without touching
the core service.
"""

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from app.quality.enums import CostProfile, Criticality
from app.quality.policy import AIQualityPolicy

# A validator receives the AI result plus a per-task context dict and returns
# a list of violation messages (empty list == valid).
ValidatorFn = Callable[..., list[str]]

# An optional verifier runs an additional AI pass (or deterministic recheck).
VerifierFn = Callable[..., Any]


@dataclass(frozen=True)
class QualityTaskSpec:
    """Everything the quality layer knows about one AI task."""

    task: str
    criticality: Criticality
    policy: AIQualityPolicy
    validator: ValidatorFn | None = None
    verifier: VerifierFn | None = None
    cost_profile: CostProfile = CostProfile.BALANCED


class AIQualityRegistry:
    """Central registry of quality tasks.

    ``register`` is idempotent per task (last registration wins) so tests can
    override behavior cleanly.
    """

    def __init__(self) -> None:
        self._specs: dict[str, QualityTaskSpec] = {}

    def register(
        self,
        task: str,
        *,
        criticality: Criticality,
        policy: AIQualityPolicy | None = None,
        validator: ValidatorFn | None = None,
        verifier: VerifierFn | None = None,
        cost_profile: CostProfile = CostProfile.BALANCED,
    ) -> None:
        resolved_policy = policy or AIQualityPolicy(task=task, criticality=criticality)
        self._specs[task] = QualityTaskSpec(
            task=task,
            criticality=criticality,
            policy=resolved_policy,
            validator=validator,
            verifier=verifier,
            cost_profile=cost_profile,
        )

    def unregister(self, task: str) -> None:
        self._specs.pop(task, None)

    def get(self, task: str) -> QualityTaskSpec | None:
        return self._specs.get(task)

    def require(self, task: str) -> QualityTaskSpec:
        spec = self._specs.get(task)
        if spec is None:
            raise KeyError(f"No quality task registered: {task}")
        return spec

    def tasks(self) -> list[str]:
        return sorted(self._specs)

    def validate(self, task: str, result: Any, **context: Any) -> list[str]:
        """Run the registered validator; returns violation messages."""
        spec = self.require(task)
        if spec.validator is None:
            return []
        try:
            return list(spec.validator(result, **context))
        except Exception as exc:  # validators may raise on hard failures
            return [f"validator raised {type(exc).__name__}: {exc}"]

    def criticality(self, task: str) -> Criticality:
        return self.require(task).criticality

    def policy(self, task: str) -> AIQualityPolicy:
        return self.require(task).policy


def create_default_quality_registry() -> AIQualityRegistry:
    """Default registry wiring every engine task to its validator/policy.

    Validators live in ``app.quality.validators``; registering them here keeps
    the mapping extensible and testable.
    """
    from app.quality import validators as v

    registry = AIQualityRegistry()
    registry.register(
        "semantic_evaluation",
        criticality=Criticality.CRITICAL,
        validator=v.semantic_evaluation,
        cost_profile=CostProfile.QUALITY,
    )
    registry.register(
        "grammar_vocabulary_evaluation",
        criticality=Criticality.HIGH,
        validator=v.grammar_vocabulary_evaluation,
        cost_profile=CostProfile.QUALITY,
    )
    registry.register(
        "naturalness_register_evaluation",
        criticality=Criticality.HIGH,
        validator=v.naturalness_register_evaluation,
        cost_profile=CostProfile.QUALITY,
    )
    registry.register(
        "writing_evaluation",
        criticality=Criticality.HIGH,
        validator=v.writing_evaluation,
        verifier=v.evaluation_verifier,
        cost_profile=CostProfile.QUALITY,
    )
    registry.register(
        "exercise_generation",
        criticality=Criticality.HIGH,
        validator=v.exercise_generation,
        cost_profile=CostProfile.BALANCED,
    )
    registry.register(
        "vocabulary_extraction",
        criticality=Criticality.MEDIUM,
        validator=v.vocabulary_candidate,
        cost_profile=CostProfile.BALANCED,
    )
    registry.register(
        "learner_profile_synthesis",
        criticality=Criticality.CRITICAL,
        validator=v.learner_profile_synthesis,
        cost_profile=CostProfile.QUALITY,
    )
    registry.register(
        "learning_planner",
        criticality=Criticality.CRITICAL,
        validator=v.learning_planner,
        cost_profile=CostProfile.QUALITY,
    )
    registry.register(
        "scenario_generation",
        criticality=Criticality.HIGH,
        validator=v.scenario_generation,
        cost_profile=CostProfile.QUALITY,
    )
    registry.register(
        "scenario_evaluation",
        criticality=Criticality.HIGH,
        validator=v.scenario_evaluation,
        cost_profile=CostProfile.QUALITY,
    )
    registry.register(
        "discourse_evaluation",
        criticality=Criticality.HIGH,
        validator=v.discourse_evaluation,
        cost_profile=CostProfile.QUALITY,
    )
    registry.register(
        "simulation_turn_evaluation",
        criticality=Criticality.HIGH,
        validator=v.simulation_turn_evaluation,
        cost_profile=CostProfile.QUALITY,
    )
    registry.register(
        "simulation_state_update",
        criticality=Criticality.CRITICAL,
        validator=v.simulation_state_update,
        cost_profile=CostProfile.CRITICAL,
    )
    registry.register(
        "simulation_plan",
        criticality=Criticality.HIGH,
        validator=v.simulation_plan,
        cost_profile=CostProfile.QUALITY,
    )
    registry.register(
        "encouragement",
        criticality=Criticality.LOW,
        cost_profile=CostProfile.CHEAP,
    )
    registry.register(
        "daily_mission",
        criticality=Criticality.MEDIUM,
        cost_profile=CostProfile.BALANCED,
    )
    registry.register(
        "challenge_generation",
        criticality=Criticality.MEDIUM,
        cost_profile=CostProfile.BALANCED,
    )
    registry.register(
        "progress_summary",
        criticality=Criticality.MEDIUM,
        cost_profile=CostProfile.BALANCED,
    )
    registry.register(
        "memory_extraction",
        criticality=Criticality.MEDIUM,
        validator=v.memory_extraction,
        cost_profile=CostProfile.BALANCED,
    )
    registry.register(
        "memory_validation",
        criticality=Criticality.HIGH,
        validator=v.memory_validation,
        cost_profile=CostProfile.BALANCED,
    )
    registry.register(
        "memory_conflict_detection",
        criticality=Criticality.HIGH,
        validator=v.memory_conflict,
        cost_profile=CostProfile.BALANCED,
    )
    from app.quality import curriculum_validators as cv

    registry.register(
        "goal_interpretation",
        criticality=Criticality.HIGH,
        validator=cv.goal_interpretation,
        cost_profile=CostProfile.BALANCED,
    )
    registry.register(
        "curriculum_planning",
        criticality=Criticality.HIGH,
        validator=cv.curriculum_planning,
        cost_profile=CostProfile.QUALITY,
    )
    registry.register(
        "curriculum_replanning",
        criticality=Criticality.HIGH,
        validator=cv.curriculum_replanning,
        cost_profile=CostProfile.QUALITY,
    )
    registry.register(
        "objective_progress_analysis",
        criticality=Criticality.MEDIUM,
        validator=cv.objective_progress_analysis,
        cost_profile=CostProfile.BALANCED,
    )
    from app.quality import analytics_validators as av

    registry.register(
        "product_analysis",
        criticality=Criticality.MEDIUM,
        validator=av.product_analysis,
        cost_profile=CostProfile.BALANCED,
    )
    registry.register(
        "optimization_recommendation",
        criticality=Criticality.MEDIUM,
        validator=av.optimization_recommendation,
        cost_profile=CostProfile.BALANCED,
    )
    registry.register(
        "experiment_analysis",
        criticality=Criticality.LOW,
        validator=av.experiment_analysis,
        cost_profile=CostProfile.BALANCED,
    )
    return registry
