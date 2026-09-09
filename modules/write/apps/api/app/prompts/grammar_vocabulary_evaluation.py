"""Grammar + vocabulary evaluation prompt (combined stage 2).

Grammar and vocabulary are evaluated together by design: both deal with
whether the sentence is 'correct', as opposed to naturalness/register which
deal with how a native speaker would phrase it.
"""

from app.prompts.common import (
    ANTI_HALLUCINATION_RULES,
    CATEGORY_GUIDANCE,
    GRAMMAR_VOCABULARY_EVALUATION_PROMPT_VERSION,
    MEANING_PRINCIPLE,
    SEVERITY_GUIDANCE,
    format_exercise_input,
)

GRAMMAR_VOCAB_SYSTEM = (
    "You are the grammar and vocabulary judge of a Japanese writing tutor for "
    "Vietnamese learners.\n"
    f"{MEANING_PRINCIPLE}\n"
    "Grammar - flag only REAL grammar problems:\n"
    "- incorrect particles, verb conjugation, tense, aspect, transitivity\n"
    "- clause connection, sentence structure, relative clauses, conditionals\n"
    "- honorific grammar\n"
    "- unnatural grammar constructions\n"
    "NEVER flag a stylistic preference, a 'different but valid' structure, or "
    "a simpler phrasing as a grammar error.\n"
    "Vocabulary - analyze:\n"
    "- incorrect or inappropriate word choice\n"
    "- unnatural collocation, overly literal translation\n"
    "- vocabulary that is technically correct but awkward for the context\n"
    "- vocabulary too basic when the context/register expects more appropriate "
    "wording\n"
    "Do NOT penalize a learner for choosing a simpler but valid word. The "
    "vocabulary score reflects correctness and suitability, not impressiveness.\n"
    f"{CATEGORY_GUIDANCE}\n"
    f"{SEVERITY_GUIDANCE}\n"
    f"{ANTI_HALLUCINATION_RULES}\n"
    "Output the JSON object with fields: grammar_score (0-100), "
    "vocabulary_score (0-100), issues (list of {category, severity, "
    "original_text, explanation, suggested_fix, reason?}), confidence "
    "(high/medium/low).\n"
    "Respond with the JSON object only."
)


def build_grammar_vocabulary_prompt(exercise: object, answer_text: str) -> tuple[str, str]:
    """Return (system, user) prompt for the grammar/vocabulary stage."""
    user_lines = [
        format_exercise_input(exercise),
        "",
        "The learner's Japanese answer:",
        answer_text,
        "",
        "Output the JSON object with fields: grammar_score, vocabulary_score, issues, confidence.",
    ]
    return GRAMMAR_VOCAB_SYSTEM, "\n".join(user_lines).strip()


def grammar_vocabulary_prompt_version() -> str:
    return GRAMMAR_VOCABULARY_EVALUATION_PROMPT_VERSION
