"""Shared prompt fragments and version identifiers for exercise generation.

Every prompt template carries an explicit version string so that future
prompt changes can be tracked in generation_metadata.
"""

EXERCISE_GENERATION_VERSION = "exercise_generation:v1"
EXERCISE_PLANNER_PROMPT_VERSION = "exercise_planner:v1"
EXERCISE_GENERATOR_PROMPT_VERSION = "exercise_generator:v1"
EXERCISE_VALIDATION_PROMPT_VERSION = "exercise_validation:v1"

EVALUATION_VERSION = "writing_evaluation:v1"
SEMANTIC_EVALUATION_PROMPT_VERSION = "semantic_evaluation:v1"
GRAMMAR_VOCABULARY_EVALUATION_PROMPT_VERSION = "grammar_vocabulary_evaluation:v1"
NATURALNESS_REGISTER_EVALUATION_PROMPT_VERSION = "naturalness_register_evaluation:v1"
CORRECTION_GENERATION_PROMPT_VERSION = "correction_generation:v1"
HINT_GENERATION_PROMPT_VERSION = "hint_generation:v1"
EVALUATION_VERIFICATION_PROMPT_VERSION = "evaluation_verification:v1"

VOCABULARY_VERSION = "vocabulary:v1"
VOCABULARY_EXTRACTION_PROMPT_VERSION = "vocabulary_extraction:v1"
VOCABULARY_VALIDATION_PROMPT_VERSION = "vocabulary_validation:v1"
VOCABULARY_EXPLANATION_PROMPT_VERSION = "vocabulary_explanation:v1"

LEARNING_VERSION = "learning:v1"
LEARNER_PROFILE_SYNTHESIS_PROMPT_VERSION = "learner_profile_synthesis:v2"
MISTAKE_CLUSTERING_PROMPT_VERSION = "mistake_clustering:v1"
LEARNING_PLANNER_PROMPT_VERSION = "learning_planner:v1"
RECOMMENDATION_EXPLANATION_PROMPT_VERSION = "recommendation_explanation:v1"

CURRICULUM_VERSION = "curriculum:v1"
GOAL_INTERPRETATION_PROMPT_VERSION = "goal_interpretation:v1"
CURRICULUM_PLANNING_PROMPT_VERSION = "curriculum_planning:v1"
CURRICULUM_REPLANNING_PROMPT_VERSION = "curriculum_replanning:v1"
CURRICULUM_EXPLANATION_PROMPT_VERSION = "curriculum_explanation:v1"
OBJECTIVE_PROGRESS_ANALYSIS_PROMPT_VERSION = "objective_progress_analysis:v1"

GAMIFICATION_VERSION = "gamification:v1"
DAILY_MISSION_GENERATION_PROMPT_VERSION = "daily_mission_generation:v1"
CHALLENGE_GENERATION_PROMPT_VERSION = "challenge_generation:v1"
PROGRESS_SUMMARY_PROMPT_VERSION = "progress_summary:v1"
MILESTONE_CELEBRATION_PROMPT_VERSION = "milestone_celebration:v1"
ENCOURAGEMENT_PROMPT_VERSION = "encouragement:v1"

DISCOURSE_VERSION = "discourse:v1"
DISCOURSE_SEGMENTATION_PROMPT_VERSION = "discourse_segmentation:v1"
COHERENCE_EVALUATION_PROMPT_VERSION = "coherence_evaluation:v1"
COHESION_EVALUATION_PROMPT_VERSION = "cohesion_evaluation:v1"
ORGANIZATION_EVALUATION_PROMPT_VERSION = "organization_evaluation:v1"
STYLE_CONSISTENCY_EVALUATION_PROMPT_VERSION = "style_consistency_evaluation:v1"
DISCOURSE_SYNTHESIS_PROMPT_VERSION = "discourse_synthesis:v1"
DISCOURSE_COACH_PROMPT_VERSION = "discourse_coach:v1"
REVISION_GUIDANCE_PROMPT_VERSION = "revision_guidance:v1"
STRUCTURE_SUGGESTION_PROMPT_VERSION = "structure_suggestion:v1"
WRITING_SCAFFOLD_PROMPT_VERSION = "writing_scaffold:v1"

SCENARIO_VERSION = "scenario:v1"
SCENARIO_PLANNER_PROMPT_VERSION = "scenario_planner:v1"
SCENARIO_GENERATOR_PROMPT_VERSION = "scenario_generator:v1"
SCENARIO_VALIDATION_PROMPT_VERSION = "scenario_validation:v1"
SCENARIO_EVALUATION_PROMPT_VERSION = "scenario_evaluation:v1"
REQUIRED_POINT_EVALUATION_PROMPT_VERSION = "required_point_evaluation:v1"
TONE_EVALUATION_PROMPT_VERSION = "tone_evaluation:v1"
SCENARIO_COACH_PROMPT_VERSION = "scenario_coach:v1"

SIMULATION_VERSION = "simulation:v1"
SIMULATION_PLANNER_PROMPT_VERSION = "simulation_planner:v1"
SIMULATION_TURN_GENERATION_PROMPT_VERSION = "simulation_turn_generation:v1"
SIMULATION_TURN_EVALUATION_PROMPT_VERSION = "simulation_turn_evaluation:v1"
SIMULATION_STATE_UPDATE_PROMPT_VERSION = "simulation_state_update:v1"
SIMULATION_CONTEXT_SUMMARY_PROMPT_VERSION = "simulation_context_summary:v1"
SIMULATION_SUMMARY_PROMPT_VERSION = "simulation_summary:v1"
SIMULATION_COACH_PROMPT_VERSION = "simulation_coach:v1"

MEMORY_VERSION = "memory:v1"
MEMORY_EXTRACTION_PROMPT_VERSION = "memory_extraction:v1"
MEMORY_VALIDATION_PROMPT_VERSION = "memory_validation:v1"
MEMORY_CONFLICT_DETECTION_PROMPT_VERSION = "memory_conflict_detection:v1"
MEMORY_RESOLUTION_PROMPT_VERSION = "memory_resolution:v1"
MEMORY_CONTEXT_SELECTION_PROMPT_VERSION = "memory_context_selection:v1"

ANALYTICS_VERSION = "analytics:v1"
PRODUCT_ANALYSIS_PROMPT_VERSION = "product_analysis:v1"
OPTIMIZATION_RECOMMENDATION_PROMPT_VERSION = "optimization_recommendation:v1"
EXPERIMENT_ANALYSIS_PROMPT_VERSION = "experiment_analysis:v1"

WRITING_INTELLIGENCE_VERSION = "writing_intelligence:v1"
WRITING_DIAGNOSIS_PROMPT_VERSION = "writing_diagnosis:v1"
WRITING_CLASSIFIER_PROMPT_VERSION = "writing_classifier:v1"
WEAKNESS_MASTERY_NARRATIVE_PROMPT_VERSION = "weakness_mastery_narrative:v1"

REWRITE_LAB_VERSION = "rewrite_lab:v1"
SELF_CORRECTION_DETECTION_PROMPT_VERSION = "self_correction_detection:v1"
SELF_CORRECTION_EVALUATION_PROMPT_VERSION = "self_correction_evaluation:v1"
REWRITE_MODES_GENERATION_PROMPT_VERSION = "rewrite_modes_generation:v1"
TRANSFER_TASK_GENERATION_PROMPT_VERSION = "transfer_task_generation:v1"
TRANSFER_EVALUATION_PROMPT_VERSION = "transfer_evaluation:v1"
DIFF_EXPLANATION_PROMPT_VERSION = "diff_explanation:v1"
SOCRATIC_COACH_PROMPT_VERSION = "socratic_coach:v1"

REAL_WORLD_MISSION_VERSION = "real_world_mission:v1"
REAL_WORLD_MISSION_GENERATOR_PROMPT_VERSION = "real_world_mission_generator:v1"
REAL_WORLD_MISSION_EVALUATOR_PROMPT_VERSION = "real_world_mission_evaluator:v1"

EXPRESSION_INTELLIGENCE_VERSION = "expression_intelligence:v1"
COLLOCATION_ANALYSIS_PROMPT_VERSION = "collocation_analysis:v1"
EXPRESSION_VARIATION_PROMPT_VERSION = "expression_variation:v1"
REGISTER_TRANSFORMATION_PROMPT_VERSION = "register_transformation:v1"
COLLOCATION_SUGGESTIONS_PROMPT_VERSION = "collocation_suggestions:v1"


DISCOURSE_ISSUE_GUIDANCE = (
    "Discourse issue categories (one issue has exactly ONE primary category):\n"
    "- coherence: the text as a whole drifts off the central topic, sentences "
    "contradict each other, or the conclusion does not follow.\n"
    "- cohesion: sentences do not connect smoothly - missing or wrong "
    "transitions, broken reference chains, abrupt jumps between ideas.\n"
    "- organization: opening/development/conclusion are missing or out of "
    "order; ideas are not arranged logically.\n"
    "- flow: the text reads choppily; information rhythm and pacing hurt "
    "readability even though each sentence may be fine.\n"
    "- redundancy: the same meaning is repeated unnecessarily; do NOT flag "
    "rhetorical or emphatic repetition.\n"
    "- style: accidental mixing of register styles (e.g. sudden です・ます to "
    "だ・である) or inconsistent tone; do not flag intentional style shifts.\n"
    "- register: the wording is inconsistent with the exercise register "
    "(casual / polite / business) - but never claim the sentence is "
    "grammatically wrong because of this.\n"
    "- topic_consistency: part of the text quietly changes the subject.\n"
    "Discourse issues are about relationships BETWEEN sentences, never about "
    "a single sentence's grammar or vocabulary (those belong to the "
    "sentence-level evaluation).\n"
)

DISCOURSE_ISSUE_CATEGORIES = (
    "coherence|cohesion|organization|flow|redundancy|style|register|topic_consistency"
)

DISCOURSE_MARKER_GUIDANCE = (
    "Japanese discourse markers to look for (never force the learner to add "
    "them; only note their absence when it genuinely hurts understanding): "
    "そのため, しかし, 一方で, また, さらに, その結果, とはいえ, だから, "
    "それに, ところで, そして.\n"
    "Also check reference continuity (pronouns, repeated subjects, は/が "
    "selection) across sentence boundaries.\n"
)

MEANING_PRESERVATION_RULES = (
    "Every rewrite you produce MUST preserve the learner's original meaning "
    "exactly:\n"
    "- NEVER invent events, reasons, emotions, facts or chronology the "
    "learner did not write.\n"
    "- NEVER remove information the learner did include.\n"
    "- Preserve ambiguity: if the original is vague, keep it vague.\n"
    "- Only improve expression, connection, organization and register - "
    "never the content.\n"
)

MEANING_PRINCIPLE = (
    "An exercise represents a MEANING to express in Japanese, never an exact "
    "Japanese sentence the learner must reproduce. Many different Japanese "
    "sentences must be acceptable answers."
)

ANTI_HALLUCINATION_RULES = (
    "Strict rules to prevent hallucinated feedback:\n"
    "- NEVER invent grammatical rules that do not exist.\n"
    "- NEVER claim a phrase is wrong solely because an alternative sounds "
    "better or different.\n"
    "- ALWAYS distinguish 'incorrect' from 'less natural': a sentence can be "
    "grammatically correct, perfectly understandable, and still not be the "
    "most natural phrasing.\n"
    "- ACCEPT multiple valid Japanese expressions for the same meaning. There "
    "is no single canonical answer.\n"
    "- NEVER require the exact expected structure; the learner's structure may "
    "differ and still be excellent.\n"
    "- Do not penalize valid stylistic choices unnecessarily.\n"
    "- Judge naturalness and register against the exercise context, register "
    "and difficulty level.\n"
    "- Use probabilistic language ('a native speaker would more likely say ...') "
    "instead of absolute claims.\n"
    "- Report at most the most meaningful issues; do not spam trivial points."
)

CATEGORY_GUIDANCE = (
    "Issue categories - get this right:\n"
    "- grammar: the sentence is actually ungrammatical (wrong particle, "
    "conjugation, tense, aspect, transitivity, clause connection, structure, "
    "relative clause, conditional, honorific grammar). Never classify a "
    "stylistic preference as a grammar error.\n"
    "- vocabulary: wrong or unsuitable word choice, unnatural collocation, "
    "overly literal translation, or vocabulary too basic for the expected "
    "register/context. Do not penalize a simpler but valid word.\n"
    "- naturalness: the Japanese is grammatical but a native speaker would "
    "phrase it differently or find it awkward.\n"
    "- register: the Japanese is appropriate but uses the wrong formality "
    "(casual / polite / business) for the exercise.\n"
    "- semantic: important meaning was lost, added or changed.\n"
    "One issue has exactly ONE primary category."
)

SEVERITY_GUIDANCE = (
    "Severity levels:\n"
    "- critical: meaning substantially changed or the sentence fails to "
    "communicate.\n"
    "- major: clear grammar/vocabulary error that significantly affects "
    "communication.\n"
    "- minor: understandable but awkward or suboptimal.\n"
    "- info: optional refinement or stylistic improvement."
)

OUTPUT_INSTRUCTION = (
    "All content fields (context, prompt_vi, issues) must be written in "
    "Vietnamese. Never include English translations inside the content fields."
)

NATURAL_VIETNAMESE_RULES = (
    "Rules for the Vietnamese content you generate:\n"
    "- Write the way a real Vietnamese person actually speaks or writes.\n"
    "- NEVER produce literal 'textbook' Vietnamese (e.g. 'Tôi đã đi đến công ty "
    "vào ngày hôm qua bởi vì tôi có rất nhiều công việc.' is forbidden).\n"
    "- Prefer natural phrasing such as 'Hôm qua tui phải lên công ty vì còn một "
    "đống việc chưa xử lý.'\n"
    "- Avoid repetitive patterns across different exercises.\n"
    "- Create a meaningful situation/context that justifies the content.\n"
    "- Respect the requested register (casual / polite / business) and make the "
    "register consistent with the situation.\n"
    "- Respect the requested difficulty level.\n"
    "- Avoid culturally nonsensical situations.\n"
    "- Avoid impossible translation constraints (no wordplay, no puns, no idioms "
    "that cannot be expressed in Japanese).\n"
    "- Produce ONE clear target meaning strictly matching the requested target_length "
    "(for paragraph, produce 3-5 sentences forming a complete paragraph; for "
    "multi_sentence, 2-3 connected sentences; for sentence, 1 standard sentence; "
    "for short_sentence, 1 concise sentence). The learner must know what they need to "
    "communicate.\n"
    "- Keep enough ambiguity and nuance that translating well requires real "
    "Japanese production, not a mechanical word substitution.\n"
)

STYLE_EXAMPLES = (
    "Style examples (good vs bad):\n"
    "BAD (textbook): 'Tôi đã đi đến công ty vào ngày hôm qua bởi vì tôi có rất "
    "nhiều công việc.'\n"
    "GOOD (natural): 'Hôm qua tui phải lên công ty vì còn một đống việc chưa xử lý.'\n"
)

OUTPUT_INSTRUCTION = (
    "All content fields (context, prompt_vi, issues) must be written in "
    "Vietnamese. Never include English translations inside the content fields."
)


def format_recent_items(label: str, items: list[str], max_items: int = 10) -> str:
    """Render a bounded list of recent items (topics or prompts) for prompts."""
    if not items:
        return ""
    listed = items[:max_items]
    return f"{label}:\n" + "\n".join(f"- {item}" for item in listed) + "\n"


def format_exercise_input(exercise: object) -> str:
    """Render the exercise block shared by every evaluation prompt."""
    return (
        "Exercise (the learner must express this meaning in Japanese):\n"
        f"- exercise_type: {exercise.exercise_type.value}\n"
        f"- topic: {exercise.topic}"
        + (f" / subtopic: {exercise.subtopic}" if exercise.subtopic else "")
        + f"\n- register: {exercise.register.value}\n"
        f"- jlpt_level: {exercise.jlpt_level.value}\n"
        f"- difficulty: {exercise.difficulty} / 10\n"
        f"- target_length: {exercise.target_length.value}\n"
        f"- context: {exercise.context}\n"
        f"- prompt (Vietnamese): {exercise.prompt_vi}\n"
    )


def format_evaluation_input(exercise: object, answer_text: str, evaluation: dict) -> str:
    """Render the evaluation block shared by the vocabulary prompts.

    ``evaluation`` is the persisted WritingEvaluation payload (JSON).
    """
    issues = evaluation.get("issues") or []
    issue_lines = []
    for issue in issues:
        issue_lines.append(
            f"- [{issue.get('category')} / {issue.get('severity')}] "
            f"「{issue.get('original_text')}」-> {issue.get('suggested_fix')} "
            f"({issue.get('explanation')})"
        )
    corrections = evaluation.get("corrections") or {}
    correction_lines = []
    for key in ("correct_version", "natural_version", "native_version"):
        if corrections.get(key):
            correction_lines.append(f"- {key}: {corrections[key]}")
    for key in ("casual_version", "polite_version", "business_version"):
        if corrections.get(key):
            correction_lines.append(f"- {key}: {corrections[key]}")

    return (
        format_exercise_input(exercise)
        + f"Learner's Japanese answer:\n{answer_text}\n"
        + "AI evaluation of that answer:\n"
        + f"- semantic classification: {evaluation.get('semantic_classification')}\n"
        + f"- naturalness classification: {evaluation.get('naturalness_classification')}\n"
        + f"- scores: {evaluation.get('scores')}\n"
        + "Issues:\n"
        + ("\n".join(issue_lines) if issue_lines else "- none\n")
        + "AI corrected versions (correct / natural / native / register variants):\n"
        + ("\n".join(correction_lines) if correction_lines else "- none\n")
        + f"- summary: {evaluation.get('summary')}\n"
    )
