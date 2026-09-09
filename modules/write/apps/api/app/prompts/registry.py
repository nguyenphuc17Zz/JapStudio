"""Prompt registry (Phase 11).

Central registry tracking task, version, description, input/output schema,
criticality and quality policy for every versioned prompt. It is built from
the existing version constants and ``*_prompt_version()`` functions so prompt
provenance (already persisted by every engine) is not redefined or broken.
"""

from dataclasses import dataclass
from typing import Any

from app.prompts.common import (
    ANALYTICS_VERSION,
    CHALLENGE_GENERATION_PROMPT_VERSION,
    COHERENCE_EVALUATION_PROMPT_VERSION,
    COHESION_EVALUATION_PROMPT_VERSION,
    CORRECTION_GENERATION_PROMPT_VERSION,
    CURRICULUM_EXPLANATION_PROMPT_VERSION,
    CURRICULUM_PLANNING_PROMPT_VERSION,
    CURRICULUM_REPLANNING_PROMPT_VERSION,
    CURRICULUM_VERSION,
    DAILY_MISSION_GENERATION_PROMPT_VERSION,
    DISCOURSE_COACH_PROMPT_VERSION,
    DISCOURSE_SEGMENTATION_PROMPT_VERSION,
    DISCOURSE_SYNTHESIS_PROMPT_VERSION,
    DISCOURSE_VERSION,
    ENCOURAGEMENT_PROMPT_VERSION,
    EVALUATION_VERIFICATION_PROMPT_VERSION,
    EVALUATION_VERSION,
    EXERCISE_GENERATION_VERSION,
    EXERCISE_GENERATOR_PROMPT_VERSION,
    EXERCISE_PLANNER_PROMPT_VERSION,
    EXERCISE_VALIDATION_PROMPT_VERSION,
    EXPERIMENT_ANALYSIS_PROMPT_VERSION,
    GOAL_INTERPRETATION_PROMPT_VERSION,
    GRAMMAR_VOCABULARY_EVALUATION_PROMPT_VERSION,
    HINT_GENERATION_PROMPT_VERSION,
    LEARNER_PROFILE_SYNTHESIS_PROMPT_VERSION,
    LEARNING_PLANNER_PROMPT_VERSION,
    MEMORY_CONFLICT_DETECTION_PROMPT_VERSION,
    MEMORY_CONTEXT_SELECTION_PROMPT_VERSION,
    MEMORY_EXTRACTION_PROMPT_VERSION,
    MEMORY_RESOLUTION_PROMPT_VERSION,
    MEMORY_VALIDATION_PROMPT_VERSION,
    MEMORY_VERSION,
    MILESTONE_CELEBRATION_PROMPT_VERSION,
    NATURALNESS_REGISTER_EVALUATION_PROMPT_VERSION,
    OBJECTIVE_PROGRESS_ANALYSIS_PROMPT_VERSION,
    OPTIMIZATION_RECOMMENDATION_PROMPT_VERSION,
    ORGANIZATION_EVALUATION_PROMPT_VERSION,
    PRODUCT_ANALYSIS_PROMPT_VERSION,
    PROGRESS_SUMMARY_PROMPT_VERSION,
    RECOMMENDATION_EXPLANATION_PROMPT_VERSION,
    REQUIRED_POINT_EVALUATION_PROMPT_VERSION,
    REVISION_GUIDANCE_PROMPT_VERSION,
    SCENARIO_COACH_PROMPT_VERSION,
    SCENARIO_EVALUATION_PROMPT_VERSION,
    SCENARIO_GENERATOR_PROMPT_VERSION,
    SCENARIO_PLANNER_PROMPT_VERSION,
    SCENARIO_VALIDATION_PROMPT_VERSION,
    SCENARIO_VERSION,
    SEMANTIC_EVALUATION_PROMPT_VERSION,
    SIMULATION_COACH_PROMPT_VERSION,
    SIMULATION_CONTEXT_SUMMARY_PROMPT_VERSION,
    SIMULATION_PLANNER_PROMPT_VERSION,
    SIMULATION_STATE_UPDATE_PROMPT_VERSION,
    SIMULATION_SUMMARY_PROMPT_VERSION,
    SIMULATION_TURN_EVALUATION_PROMPT_VERSION,
    SIMULATION_TURN_GENERATION_PROMPT_VERSION,
    SIMULATION_VERSION,
    STRUCTURE_SUGGESTION_PROMPT_VERSION,
    STYLE_CONSISTENCY_EVALUATION_PROMPT_VERSION,
    TONE_EVALUATION_PROMPT_VERSION,
    DIFF_EXPLANATION_PROMPT_VERSION,
    REWRITE_LAB_VERSION,
    REWRITE_MODES_GENERATION_PROMPT_VERSION,
    SELF_CORRECTION_DETECTION_PROMPT_VERSION,
    SELF_CORRECTION_EVALUATION_PROMPT_VERSION,
    SOCRATIC_COACH_PROMPT_VERSION,
    TRANSFER_EVALUATION_PROMPT_VERSION,
    TRANSFER_TASK_GENERATION_PROMPT_VERSION,
    VOCABULARY_EXPLANATION_PROMPT_VERSION,
    VOCABULARY_EXTRACTION_PROMPT_VERSION,
    VOCABULARY_VALIDATION_PROMPT_VERSION,
    VOCABULARY_VERSION,
    WEAKNESS_MASTERY_NARRATIVE_PROMPT_VERSION,
    WRITING_DIAGNOSIS_PROMPT_VERSION,
    WRITING_INTELLIGENCE_VERSION,
    EXPRESSION_INTELLIGENCE_VERSION,
    COLLOCATION_ANALYSIS_PROMPT_VERSION,
    EXPRESSION_VARIATION_PROMPT_VERSION,
    REGISTER_TRANSFORMATION_PROMPT_VERSION,
    COLLOCATION_SUGGESTIONS_PROMPT_VERSION,
)
from app.prompts.quality_resolution import QUALITY_RESOLUTION_PROMPT_VERSION
from app.quality.enums import CostProfile, Criticality


@dataclass(frozen=True)
class PromptRecord:
    """One auditable prompt entry."""

    task: str
    version: str
    description: str
    criticality: Criticality
    cost_profile: CostProfile
    input_schema: str | None = None
    output_schema: str | None = None
    quality_policy: str | None = None


# task -> (version, description, criticality, cost_profile, output_schema)
_PROMPT_ENTRIES: list[tuple[str, str, str, Criticality, CostProfile, str | None]] = [
    (
        "exercise_planner",
        EXERCISE_PLANNER_PROMPT_VERSION,
        "Exercise planning stage",
        Criticality.HIGH,
        CostProfile.BALANCED,
        "ExercisePlan",
    ),
    (
        "exercise_generator",
        EXERCISE_GENERATOR_PROMPT_VERSION,
        "Exercise content generation",
        Criticality.HIGH,
        CostProfile.BALANCED,
        "ExerciseDraft",
    ),
    (
        "exercise_validation",
        EXERCISE_VALIDATION_PROMPT_VERSION,
        "Exercise validator stage",
        Criticality.HIGH,
        CostProfile.BALANCED,
        "ExerciseValidationResult",
    ),
    (
        "semantic_evaluation",
        SEMANTIC_EVALUATION_PROMPT_VERSION,
        "Semantic equivalence stage",
        Criticality.CRITICAL,
        CostProfile.QUALITY,
        "SemanticEvaluation",
    ),
    (
        "grammar_vocabulary_evaluation",
        GRAMMAR_VOCABULARY_EVALUATION_PROMPT_VERSION,
        "Grammar/vocabulary stage",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "GrammarVocabularyEvaluation",
    ),
    (
        "naturalness_register_evaluation",
        NATURALNESS_REGISTER_EVALUATION_PROMPT_VERSION,
        "Naturalness/register stage",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "NaturalnessRegisterEvaluation",
    ),
    (
        "correction_generation",
        CORRECTION_GENERATION_PROMPT_VERSION,
        "Correction rewrites stage",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "CorrectionResult",
    ),
    (
        "hint_generation",
        HINT_GENERATION_PROMPT_VERSION,
        "Progressive hint stage",
        Criticality.MEDIUM,
        CostProfile.CHEAP,
        "HintResult",
    ),
    (
        "evaluation_verification",
        EVALUATION_VERIFICATION_PROMPT_VERSION,
        "Optional evaluation verifier",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "EvaluationVerificationResult",
    ),
    (
        "vocabulary_extraction",
        VOCABULARY_EXTRACTION_PROMPT_VERSION,
        "Vocabulary candidate extraction",
        Criticality.MEDIUM,
        CostProfile.BALANCED,
        "VocabularyExtractionResult",
    ),
    (
        "vocabulary_validation",
        VOCABULARY_VALIDATION_PROMPT_VERSION,
        "Vocabulary candidate validation",
        Criticality.MEDIUM,
        CostProfile.BALANCED,
        "VocabularyValidationResult",
    ),
    (
        "vocabulary_explanation",
        VOCABULARY_EXPLANATION_PROMPT_VERSION,
        "Vocabulary learning explanation",
        Criticality.MEDIUM,
        CostProfile.BALANCED,
        "VocabularyExplanationResult",
    ),
    (
        "learner_profile_synthesis",
        LEARNER_PROFILE_SYNTHESIS_PROMPT_VERSION,
        "Learner profile AI framing",
        Criticality.CRITICAL,
        CostProfile.QUALITY,
        "LearnerProfileSynthesisResult",
    ),
    (
        "learning_planner",
        LEARNING_PLANNER_PROMPT_VERSION,
        "Adaptive learning planner",
        Criticality.CRITICAL,
        CostProfile.QUALITY,
        "LearningRecommendationResult",
    ),
    (
        "recommendation_explanation",
        RECOMMENDATION_EXPLANATION_PROMPT_VERSION,
        "Recommendation reason",
        Criticality.LOW,
        CostProfile.CHEAP,
        "RecommendationExplanationResult",
    ),
    (
        "goal_interpretation",
        GOAL_INTERPRETATION_PROMPT_VERSION,
        "Goal statement interpretation",
        Criticality.HIGH,
        CostProfile.BALANCED,
        "GoalInterpretationResult",
    ),
    (
        "curriculum_planning",
        CURRICULUM_PLANNING_PROMPT_VERSION,
        "Long-term curriculum planning",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "CurriculumPlanningResult",
    ),
    (
        "curriculum_replanning",
        CURRICULUM_REPLANNING_PROMPT_VERSION,
        "Curriculum replanning",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "CurriculumReplanningResult",
    ),
    (
        "curriculum_explanation",
        CURRICULUM_EXPLANATION_PROMPT_VERSION,
        "Journey explanation",
        Criticality.MEDIUM,
        CostProfile.CHEAP,
        "RecommendationExplanationResult",
    ),
    (
        "objective_progress_analysis",
        OBJECTIVE_PROGRESS_ANALYSIS_PROMPT_VERSION,
        "Objective progress narrative",
        Criticality.MEDIUM,
        CostProfile.BALANCED,
        "ObjectiveProgressAnalysisResult",
    ),
    (
        "daily_mission_generation",
        DAILY_MISSION_GENERATION_PROMPT_VERSION,
        "Daily mission generation",
        Criticality.MEDIUM,
        CostProfile.BALANCED,
        "DailyMissionResult",
    ),
    (
        "challenge_generation",
        CHALLENGE_GENERATION_PROMPT_VERSION,
        "Challenge generation",
        Criticality.MEDIUM,
        CostProfile.BALANCED,
        "ChallengeGenerationResult",
    ),
    (
        "progress_summary",
        PROGRESS_SUMMARY_PROMPT_VERSION,
        "Daily progress summary",
        Criticality.LOW,
        CostProfile.CHEAP,
        "ProgressSummaryResult",
    ),
    (
        "milestone_celebration",
        MILESTONE_CELEBRATION_PROMPT_VERSION,
        "Milestone celebration",
        Criticality.LOW,
        CostProfile.CHEAP,
        "MilestoneCelebrationResult",
    ),
    (
        "encouragement",
        ENCOURAGEMENT_PROMPT_VERSION,
        "Daily encouragement",
        Criticality.LOW,
        CostProfile.CHEAP,
        "EncouragementResult",
    ),
    (
        "discourse_segmentation",
        DISCOURSE_SEGMENTATION_PROMPT_VERSION,
        "Sentence segmentation",
        Criticality.MEDIUM,
        CostProfile.CHEAP,
        "DiscourseSegmentationResult",
    ),
    (
        "coherence_evaluation",
        COHERENCE_EVALUATION_PROMPT_VERSION,
        "Coherence scoring",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "DiscourseAnalysisResult",
    ),
    (
        "cohesion_evaluation",
        COHESION_EVALUATION_PROMPT_VERSION,
        "Cohesion scoring",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "DiscourseAnalysisResult",
    ),
    (
        "organization_evaluation",
        ORGANIZATION_EVALUATION_PROMPT_VERSION,
        "Organization scoring",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "DiscourseAnalysisResult",
    ),
    (
        "style_consistency_evaluation",
        STYLE_CONSISTENCY_EVALUATION_PROMPT_VERSION,
        "Style consistency scoring",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "StyleConsistencyResult",
    ),
    (
        "discourse_synthesis",
        DISCOURSE_SYNTHESIS_PROMPT_VERSION,
        "Discourse synthesis",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "DiscourseSynthesisResult",
    ),
    (
        "discourse_coach",
        DISCOURSE_COACH_PROMPT_VERSION,
        "Discourse coach",
        Criticality.LOW,
        CostProfile.CHEAP,
        "DiscourseCoachResult",
    ),
    (
        "revision_guidance",
        REVISION_GUIDANCE_PROMPT_VERSION,
        "Revision guidance",
        Criticality.MEDIUM,
        CostProfile.BALANCED,
        "RevisionGuidanceResult",
    ),
    (
        "structure_suggestion",
        STRUCTURE_SUGGESTION_PROMPT_VERSION,
        "Structure suggestion",
        Criticality.MEDIUM,
        CostProfile.BALANCED,
        "StructureSuggestionResult",
    ),
    (
        "scenario_planner",
        SCENARIO_PLANNER_PROMPT_VERSION,
        "Scenario planning",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "WritingScenarioPlan",
    ),
    (
        "scenario_generator",
        SCENARIO_GENERATOR_PROMPT_VERSION,
        "Scenario draft generation",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "WritingScenarioDraft",
    ),
    (
        "scenario_validation",
        SCENARIO_VALIDATION_PROMPT_VERSION,
        "Scenario validation",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "WritingScenarioValidationResult",
    ),
    (
        "scenario_evaluation",
        SCENARIO_EVALUATION_PROMPT_VERSION,
        "Scenario-aware evaluation",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "ScenarioEvaluationResult",
    ),
    (
        "required_point_evaluation",
        REQUIRED_POINT_EVALUATION_PROMPT_VERSION,
        "Required point checklist",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "RequiredPointEvaluationResult",
    ),
    (
        "tone_evaluation",
        TONE_EVALUATION_PROMPT_VERSION,
        "Tone evaluation",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "ToneEvaluationResult",
    ),
    (
        "scenario_coach",
        SCENARIO_COACH_PROMPT_VERSION,
        "Scenario coach",
        Criticality.LOW,
        CostProfile.CHEAP,
        "ScenarioCoachResult",
    ),
    (
        "simulation_planner",
        SIMULATION_PLANNER_PROMPT_VERSION,
        "Simulation planning",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "SimulationPlanResult",
    ),
    (
        "simulation_turn_generation",
        SIMULATION_TURN_GENERATION_PROMPT_VERSION,
        "Simulation turn generation",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "SimulationTurnGenerationResult",
    ),
    (
        "simulation_turn_evaluation",
        SIMULATION_TURN_EVALUATION_PROMPT_VERSION,
        "Simulation turn evaluation",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "SimulationTurnEvaluationResult",
    ),
    (
        "simulation_state_update",
        SIMULATION_STATE_UPDATE_PROMPT_VERSION,
        "Simulation state update",
        Criticality.CRITICAL,
        CostProfile.CRITICAL,
        "SimulationStateUpdateResult",
    ),
    (
        "simulation_context_summary",
        SIMULATION_CONTEXT_SUMMARY_PROMPT_VERSION,
        "Simulation context summary",
        Criticality.MEDIUM,
        CostProfile.BALANCED,
        "SimulationContextSummaryResult",
    ),
    (
        "simulation_summary",
        SIMULATION_SUMMARY_PROMPT_VERSION,
        "Simulation session summary",
        Criticality.MEDIUM,
        CostProfile.BALANCED,
        "SimulationSummaryResult",
    ),
    (
        "simulation_coach",
        SIMULATION_COACH_PROMPT_VERSION,
        "Simulation coach",
        Criticality.LOW,
        CostProfile.CHEAP,
        "SimulationCoachResult",
    ),
    (
        "quality_resolution",
        QUALITY_RESOLUTION_PROMPT_VERSION,
        "AI quality resolver",
        Criticality.CRITICAL,
        CostProfile.CRITICAL,
        "QualityResolutionResult",
    ),
    (
        "memory_extraction",
        MEMORY_EXTRACTION_PROMPT_VERSION,
        "Memory candidate extraction",
        Criticality.MEDIUM,
        CostProfile.BALANCED,
        "MemoryExtractionResult",
    ),
    (
        "memory_validation",
        MEMORY_VALIDATION_PROMPT_VERSION,
        "Memory candidate validation",
        Criticality.HIGH,
        CostProfile.BALANCED,
        "MemoryValidationResult",
    ),
    (
        "memory_conflict_detection",
        MEMORY_CONFLICT_DETECTION_PROMPT_VERSION,
        "Memory conflict classification",
        Criticality.HIGH,
        CostProfile.BALANCED,
        "MemoryConflictResult",
    ),
    (
        "memory_resolution",
        MEMORY_RESOLUTION_PROMPT_VERSION,
        "Memory conflict resolution",
        Criticality.HIGH,
        CostProfile.BALANCED,
        "MemoryResolutionResult",
    ),
    (
        "memory_context_selection",
        MEMORY_CONTEXT_SELECTION_PROMPT_VERSION,
        "Memory context selection",
        Criticality.LOW,
        CostProfile.CHEAP,
        "MemoryContextSelectionResult",
    ),
    (
        "product_analysis",
        PRODUCT_ANALYSIS_PROMPT_VERSION,
        "Product metrics analysis",
        Criticality.MEDIUM,
        CostProfile.BALANCED,
        "ProductAnalysisResult",
    ),
    (
        "optimization_recommendation",
        OPTIMIZATION_RECOMMENDATION_PROMPT_VERSION,
        "Single optimization recommendation draft",
        Criticality.MEDIUM,
        CostProfile.BALANCED,
        "OptimizationRecommendationResult",
    ),
    (
        "experiment_analysis",
        EXPERIMENT_ANALYSIS_PROMPT_VERSION,
        "Experiment control vs variant comparison",
        Criticality.LOW,
        CostProfile.BALANCED,
        "ExperimentAnalysisResult",
    ),
    (
        "writing_diagnosis",
        WRITING_DIAGNOSIS_PROMPT_VERSION,
        "Deep root-cause Japanese writing diagnosis and personalized remediation",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "WritingDiagnosisResult",
    ),
    (
        "weakness_mastery_narrative",
        WEAKNESS_MASTERY_NARRATIVE_PROMPT_VERSION,
        "Learner-friendly weakness mastery and progress narrative synthesis",
        Criticality.MEDIUM,
        CostProfile.BALANCED,
        "MasteryNarrativeResult",
    ),
    (
        "self_correction_detection",
        SELF_CORRECTION_DETECTION_PROMPT_VERSION,
        "Self-correction issue detection and zero-leakage category explanation",
        Criticality.HIGH,
        CostProfile.BALANCED,
        "IssueDetectionResult",
    ),
    (
        "self_correction_evaluation",
        SELF_CORRECTION_EVALUATION_PROMPT_VERSION,
        "Self-correction attempt evaluation and progressive ladder scaffolding",
        Criticality.HIGH,
        CostProfile.BALANCED,
        "SelfCorrectionAttemptResult",
    ),
    (
        "rewrite_modes_generation",
        REWRITE_MODES_GENERATION_PROMPT_VERSION,
        "6-mode Japanese rewrite transformation and controlled comparison variants",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "RewriteModeResult",
    ),
    (
        "transfer_task_generation",
        TRANSFER_TASK_GENERATION_PROMPT_VERSION,
        "Context-aware transfer scenario generation from profile and memory",
        Criticality.MEDIUM,
        CostProfile.BALANCED,
        "TransferTaskResult",
    ),
    (
        "transfer_evaluation",
        TRANSFER_EVALUATION_PROMPT_VERSION,
        "Transfer exercise attempt pattern application evaluation",
        Criticality.HIGH,
        CostProfile.BALANCED,
        "TransferEvaluationResult",
    ),
    (
        "diff_explanation",
        DIFF_EXPLANATION_PROMPT_VERSION,
        "Linguistic chunk diff with grammatical reasoning and improvement delta",
        Criticality.MEDIUM,
        CostProfile.BALANCED,
        "DiffExplanationResult",
    ),
    (
        "socratic_coach",
        SOCRATIC_COACH_PROMPT_VERSION,
        "Context-aware Socratic coach teaching underlying grammar patterns",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "SocraticCoachResult",
    ),
    (
        "collocation_analysis",
        COLLOCATION_ANALYSIS_PROMPT_VERSION,
        "Detects unnatural collocations, overuse patterns, and Vietnamese-to-Japanese transfer issues",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "CollocationAnalysisResult",
    ),
    (
        "expression_variation",
        EXPRESSION_VARIATION_PROMPT_VERSION,
        "Generates 3 distinct natural variations for an expression with stylistic nuances and synthesis challenge",
        Criticality.MEDIUM,
        CostProfile.BALANCED,
        "ExpressionVariationResult",
    ),
    (
        "register_transformation",
        REGISTER_TRANSFORMATION_PROMPT_VERSION,
        "Transforms sentences across the 5-tier register ladder with honorific rationale",
        Criticality.HIGH,
        CostProfile.QUALITY,
        "RegisterTransformationResult",
    ),
    (
        "collocation_suggestions",
        COLLOCATION_SUGGESTIONS_PROMPT_VERSION,
        "Suggests authentic native Japanese collocations and example usages for a base word",
        Criticality.MEDIUM,
        CostProfile.BALANCED,
        "CollocationSuggestionsResult",
    ),
]

# Engine-level version records (whole-pipeline provenance versions).
_ENGINE_VERSIONS: list[tuple[str, str, str, Criticality, CostProfile]] = [
    (
        EXERCISE_GENERATION_VERSION,
        "Exercise generation pipeline",
        Criticality.HIGH,
        CostProfile.BALANCED,
    ),
    (EVALUATION_VERSION, "Writing evaluation pipeline", Criticality.HIGH, CostProfile.QUALITY),
    (VOCABULARY_VERSION, "Vocabulary pipeline", Criticality.MEDIUM, CostProfile.BALANCED),
    (DISCOURSE_VERSION, "Long-form discourse pipeline", Criticality.HIGH, CostProfile.QUALITY),
    (SCENARIO_VERSION, "Scenario pipeline", Criticality.HIGH, CostProfile.QUALITY),
    (SIMULATION_VERSION, "Simulation pipeline", Criticality.HIGH, CostProfile.QUALITY),
    (MEMORY_VERSION, "Learner memory pipeline", Criticality.MEDIUM, CostProfile.BALANCED),
    (CURRICULUM_VERSION, "Curriculum pipeline", Criticality.HIGH, CostProfile.QUALITY),
    (ANALYTICS_VERSION, "Product analytics pipeline", Criticality.MEDIUM, CostProfile.BALANCED),
    (WRITING_INTELLIGENCE_VERSION, "Writing intelligence pipeline", Criticality.HIGH, CostProfile.QUALITY),
    (REWRITE_LAB_VERSION, "Self-Correction & Rewrite Lab pipeline", Criticality.HIGH, CostProfile.QUALITY),
    (EXPRESSION_INTELLIGENCE_VERSION, "Japanese Expression Intelligence pipeline", Criticality.HIGH, CostProfile.QUALITY),
]


class PromptRegistry:
    """Auditable prompt/task metadata registry."""

    def __init__(self, entries: list[PromptRecord] | None = None) -> None:
        self._records: dict[str, PromptRecord] = {}
        for record in entries or []:
            self._records[record.task] = record

    def register(self, record: PromptRecord) -> None:
        self._records[record.task] = record

    def get(self, task: str) -> PromptRecord | None:
        return self._records.get(task)

    def version_for(self, task: str) -> str | None:
        record = self._records.get(task)
        return record.version if record is not None else None

    def criticality_for(self, task: str) -> Criticality | None:
        record = self._records.get(task)
        return record.criticality if record is not None else None

    def records(self) -> list[PromptRecord]:
        return [self._records[key] for key in sorted(self._records)]

    def find_version(self, version: str) -> list[PromptRecord]:
        """Look up every prompt currently carrying the given version string."""
        return [record for record in self._records.values() if record.version == version]

    def to_public_dict(self) -> list[dict[str, Any]]:
        return [
            {
                "task": record.task,
                "version": record.version,
                "description": record.description,
                "criticality": record.criticality.value,
                "cost_profile": record.cost_profile.value,
                "output_schema": record.output_schema,
            }
            for record in self.records()
        ]


def create_prompt_registry() -> PromptRegistry:
    records: list[PromptRecord] = [
        PromptRecord(
            task=task,
            version=version,
            description=description,
            criticality=criticality,
            cost_profile=cost_profile,
            output_schema=output_schema,
        )
        for task, version, description, criticality, cost_profile, output_schema in _PROMPT_ENTRIES
    ]
    for version, description, criticality, cost_profile in _ENGINE_VERSIONS:
        task = version.rsplit(":", 1)[0]
        records.append(
            PromptRecord(
                task=task,
                version=version,
                description=description,
                criticality=criticality,
                cost_profile=cost_profile,
            )
        )
    return PromptRegistry(records)
