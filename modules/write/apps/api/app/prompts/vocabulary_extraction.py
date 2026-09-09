"""Vocabulary candidate extraction prompt (Phase 5, stage 1).

Version: vocabulary_extraction:v1
"""

from app.prompts.common import (
    ANTI_HALLUCINATION_RULES,
    VOCABULARY_EXTRACTION_PROMPT_VERSION,
    format_evaluation_input,
)

SYSTEM_INSTRUCTION = (
    "You are the vocabulary curator of a Japanese writing tutor for a "
    "Vietnamese learner. From one writing attempt and its AI evaluation, you "
    "extract the Japanese vocabulary genuinely worth adding to the learner's "
    "personal Vocabulary Bank."
)

EXTRACTION_RULES = (
    "Rules for choosing what to extract:\n"
    "- Extract vocabulary ONLY from the learner's answer, the AI corrections "
    "(correct / natural / native), the register variants, or the issue "
    "explanations. Never invent Japanese words that do not appear there.\n"
    "- Prefer items tied to the learner's mistakes, to naturalness "
    "improvements, or to useful alternatives suggested by the AI: e.g. the "
    "learner wrote とても忙しい and the AI suggested 仕事が立て込んでいる "
    "- 立て込む is worth learning, とても忙しい alone is not.\n"
    "- Support words, expressions and collocations (e.g. 対応を検討する, "
    "仕事が立て込んでいる, 〜という認識です).\n"
    "- AVOID trivial vocabulary (今日, 会社, 行く, 忙しい, ...) unless there "
    "is a concrete learning reason such as a mistake or a register nuance.\n"
    "- Distinguish words from inflected forms: 立て込む and 立て込んでいる "
    "are the same lexical item at different inflections - extract the "
    "dictionary form (or the natural collocation as a whole) once.\n"
    "- Keep the number of candidates small (1-4 is typical). Zero candidates "
    "is a valid answer when nothing is worth saving.\n"
    "- reading: hiragana reading of the expression when it is a single word; "
    "may be omitted for expressions/collocations.\n"
    "- estimated_jlpt_level: your best estimate, never absolute certainty "
    "(N5/N4/N3/N2/N1).\n"
    "- difficulty (1-10): how hard the item is for a Vietnamese learner.\n"
    "- register: casual / polite / business / mixed, only when the item is "
    "register-tied; otherwise omit.\n"
    "- importance (1-10): usefulness, frequency, contextual relevance, "
    "connection to the learner's mistake, naturalness value, business "
    "usefulness, transferability to other contexts.\n"
    "- confidence: high / medium / low - be honest about how sure you are of "
    "the meaning, reading and value of the item.\n"
    "- source_type: user_answer (the learner used this expression), "
    "ai_correction / ai_natural / ai_native / ai_register_variant (it comes "
    "from one of the AI corrected versions), or ai_explanation (discovered "
    "from the issue explanations).\n"
    "- user_expression: what the learner actually wrote when this item is a "
    "replacement for their wording (otherwise omit).\n"
    "- learning_reason: one learner-oriented Vietnamese sentence explaining "
    "WHY this item matters for THIS learner.\n"
    "- meaning_vi and learning_reason must be written in Vietnamese.\n"
    "- example_sentence: a natural Japanese sentence using the expression, "
    "from the attempt/corrections when possible.\n"
    "- natural_alternatives: 0-3 related natural Japanese alternatives.\n"
    "- Do NOT extract anything that is not genuinely useful: quality over "
    "quantity."
)

OUTPUT_CONTRACT = (
    "Return exactly one JSON object:\n"
    '{"candidates": [{"expression": str, "reading": str|null, '
    '"type": "word"|"expression"|"collocation", "meaning_vi": str, '
    '"part_of_speech": str|null, "estimated_jlpt_level": "N5"|"N4"|"N3"|"N2"|"N1"|null, '
    '"difficulty": int 1-10, "register": str|null, "usage_context": str|null, '
    '"example_sentence": str, "natural_alternatives": [str], '
    '"learning_reason": str, "importance": int 1-10, '
    '"confidence": "high"|"medium"|"low", "source_type": '
    '"user_answer"|"ai_correction"|"ai_natural"|"ai_native"|"ai_register_variant"|'
    '"ai_explanation", '
    '"user_expression": str|null}]}\n'
    "Use [] for candidates when nothing is worth learning."
)


def build_vocabulary_extraction_prompt(exercise: object, answer_text: str, evaluation: dict) -> str:
    """Build the stage-1 extraction prompt from an attempt and its evaluation."""
    return (
        SYSTEM_INSTRUCTION
        + "\n\n"
        + EXTRACTION_RULES
        + "\n\n"
        + ANTI_HALLUCINATION_RULES
        + "\n\n"
        + OUTPUT_CONTRACT
        + "\n\n"
        + format_evaluation_input(exercise, answer_text, evaluation)
    )


def vocabulary_extraction_prompt_version() -> str:
    return VOCABULARY_EXTRACTION_PROMPT_VERSION
