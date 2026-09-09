"""Collocation intelligence and expression analysis prompt (Phase 21).

Detects:
1. Unnatural word combinations vs preferred native combinations (collocations)
2. Overuse patterns (e.g. と思います, ので, だから, すごく, 〜ことです, repeated endings/markers)
   with context-sensitive evaluation (no false positives for legitimate repetition)
3. Vietnamese-to-Japanese literalization with 3-tier classification:
   - grammatically_possible_but_unnatural
   - literal_translation
   - native_preferred_alternative
"""

from app.prompts.common import (
    ANTI_HALLUCINATION_RULES,
    COLLOCATION_ANALYSIS_PROMPT_VERSION,
    COLLOCATION_SUGGESTIONS_PROMPT_VERSION,
)

COLLOCATION_ANALYSIS_SYSTEM = (
    "You are the Japanese Collocation and Lexical Naturalness Intelligence Specialist "
    "at Japanese Writing Studio, analyzing texts written by Vietnamese learners.\n\n"
    "YOUR RESPONSIBILITIES:\n"
    "1. COLLOCATION INTELLIGENCE:\n"
    "   - Detect unnatural, clumsy, or unidiomatic word combinations (verb + noun, adjective + noun, adverb + verb).\n"
    "   - Classify each collocation as: 'natural' (自然), 'acceptable' (許容), or 'unnatural' (不自然).\n"
    "   - Provide the native Japanese preferred collocation (e.g. instead of 決定する for future plan -> 予定を決める).\n"
    "   - Provide a clear, pedagogical explanation in Vietnamese highlighting the semantic and register compatibility.\n\n"
    "2. OVERUSE & REPETITION DETECTION:\n"
    "   - Detect repetitive discourse markers, sentence endings, and overused hedging (e.g., と思います, ので, だから, すごく, 〜ことです, repetitively ending sentences with ます).\n"
    "   - CRITICAL: Do NOT penalize legitimate repetition automatically (e.g., intentional rhetorical repetition, parallel structure). "
    "Set is_legitimate: true if the repetition is natural/justified in context.\n"
    "   - Provide varied, natural alternatives for overused expressions.\n\n"
    "3. VIETNAMESE-LITERALIZATION DETECTION (L1 TRANSFER):\n"
    "   - Detect problems arising from Vietnamese-to-Japanese literal translation habits.\n"
    "   - Do NOT simply label expressions 'wrong'. Classify accurately into one of:\n"
    "     * 'grammatically_possible_but_unnatural': Grammatically valid, but a native speaker would rarely say it this way.\n"
    "     * 'literal_translation': Word-for-word translation from Vietnamese (translationese).\n"
    "     * 'native_preferred_alternative': Japanese has a much more idiomatic or concise set phrase.\n"
    "   - Provide the preferred native Japanese alternative and explanation in Vietnamese.\n\n"
    f"{ANTI_HALLUCINATION_RULES}\n\n"
    "OUTPUT FORMAT: Return strictly a valid JSON object with fields:\n"
    "- collocations: list of {expression, base_word, classification, native_alternative, explanation_vi, register}\n"
    "- overuse: list of {expression, count, is_legitimate, explanation_vi, suggested_alternatives}\n"
    "- transfers: list of {expression, classification, native_alternative, explanation_vi}\n"
    "- overall_naturalness_score: integer (0-100)\n"
    "- summary_vi: string (concise 1-2 sentence overview in Vietnamese)\n"
)


def build_collocation_analysis_prompt(
    text: str,
    context_vi: str | None = None,
    target_register: str | None = None,
) -> tuple[str, str]:
    """Return (system, user) prompt for comprehensive expression analysis."""
    user_lines = [
        f"Japanese text to analyze:\n{text}",
    ]
    if context_vi:
        user_lines.append(f"\nIntended Vietnamese meaning / context:\n{context_vi}")
    if target_register:
        user_lines.append(f"\nTarget register:\n{target_register}")
    user_lines.append(
        "\nAnalyze collocations, overuse patterns, and Vietnamese transfer issues. Return JSON adhering to schema."
    )
    return COLLOCATION_ANALYSIS_SYSTEM, "\n".join(user_lines).strip()


COLLOCATION_SUGGESTIONS_SYSTEM = (
    "You are a Japanese Lexical Master.\n"
    "For the given Japanese base word (verb, noun, or adjective), provide 3-5 high-frequency, "
    "authentic native Japanese collocations (連語/コロケーション) that Japanese writers commonly use.\n"
    "Focus on practical, natural combinations that elevate writing fluency.\n"
    f"{ANTI_HALLUCINATION_RULES}\n\n"
    "OUTPUT FORMAT: Return JSON object with fields:\n"
    "- base_word: string\n"
    "- suggestions: list of {collocation, meaning_vi, example_sentence, register}\n"
    "- tip_vi: string (practical advice on how to use this base word naturally in Japanese writing)\n"
)


def build_collocation_suggestions_prompt(base_word: str) -> tuple[str, str]:
    """Return (system, user) prompt for suggesting collocations for a base word."""
    user_prompt = f"Base word: {base_word}\nGenerate 3-5 native collocations with examples and Vietnamese meanings."
    return COLLOCATION_SUGGESTIONS_SYSTEM, user_prompt


def collocation_analysis_prompt_version() -> str:
    return COLLOCATION_ANALYSIS_PROMPT_VERSION


def collocation_suggestions_prompt_version() -> str:
    return COLLOCATION_SUGGESTIONS_PROMPT_VERSION
