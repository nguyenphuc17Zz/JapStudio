"""Rewrite modes generation prompt (Step 6 reveal and multi-mode transformations).

Generates:
1. Controlled comparison variants (Original, Minimal Correction, Natural Japanese, Formal Business)
2. Single-mode transformations across 6 modes:
   - Minimal (文法修正)
   - Naturalization (自然な表現)
   - Register Conversion (丁寧語・敬語・ため口)
   - Concision (簡潔化・無駄の削減)
   - Expansion (詳細化・表現の肉付け)
   - Native Alternative (ネイティブの定番表現・慣用句)
"""

from app.prompts.common import (
    ANTI_HALLUCINATION_RULES,
    MEANING_PRESERVATION_RULES,
    REWRITE_MODES_GENERATION_PROMPT_VERSION,
)

REWRITE_VARIANTS_SYSTEM = (
    "You are an expert Japanese writing editor and tutor.\n"
    "Generate a controlled 4-way comparison for the learner's sentence:\n"
    "1. minimal_correction: Fix only grammatical and particle errors, keeping the learner's vocabulary and structure as intact as possible.\n"
    "2. natural_japanese: How native Japanese speakers would naturally and fluently express this thought in everyday conversation or standard writing.\n"
    "3. formal_business: An appropriate formal business / polite Keigo expression (using 敬語, 謙譲語, or 丁寧語) if relevant, or null if irrelevant.\n"
    "4. casual_variant: A clean casual / plain form (ため口) variant.\n"
    "Include linguistic explanations in Vietnamese for why each variant was formed.\n"
    f"{MEANING_PRESERVATION_RULES}\n"
    f"{ANTI_HALLUCINATION_RULES}\n"
    "Respond with a JSON object containing:\n"
    "- original (string)\n"
    "- minimal_correction (string)\n"
    "- natural_japanese (string)\n"
    "- formal_business (string or null)\n"
    "- casual_variant (string or null)\n"
    "- synthesis_prompt_vi (string: e.g. 'Hãy viết 1 câu mới sử dụng cùng mẫu câu trên.')\n"
    "- explanations (dictionary of string keys -> Vietnamese explanations)\n"
)

SINGLE_MODE_SYSTEM = (
    "You are a master Japanese stylist and language editor.\n"
    "Transform the given Japanese sentence strictly according to the requested transformation mode:\n\n"
    "MODES:\n"
    "- 'minimal': Minimal grammatical correction. Preserve original words/structure as much as possible, only fixing real grammatical/particle errors.\n"
    "- 'natural': Naturalization. Rewrite into smooth, idiomatic Japanese with native flow.\n"
    "- 'register': Register Conversion. Convert cleanly to the requested target register ('casual', 'polite', or 'business') with impeccable grammar and honorific conventions.\n"
    "- 'concision': Concision. Eliminate wordiness, redundancy, and fluff to produce a crisp, punchy, compact sentence.\n"
    "- 'expansion': Expansion. Enrich the sentence by adding vivid descriptive detail, adverbs (onomatopoeia/mimetic words where fitting), or nuance while preserving the core premise.\n"
    "- 'native': Native Alternative. Use authentic idiomatic Japanese expressions, set collocations (慣用句), or characteristic phrasing that native speakers instantly recognize.\n\n"
    f"{MEANING_PRESERVATION_RULES}\n"
    f"{ANTI_HALLUCINATION_RULES}\n"
    "Respond with a JSON object containing:\n"
    "- mode (string)\n"
    "- mode_label_vi (string)\n"
    "- rewritten_text (string)\n"
    "- explanation_vi (string, Vietnamese rationale explaining the linguistic mechanics)\n"
    "- key_changes (list of strings)\n"
)


def build_rewrite_variants_prompt(
    text: str, context_vi: str | None = None, target_concept: str | None = None
) -> tuple[str, str]:
    """Return prompt for generating controlled comparison variants."""
    user_lines = [
        f"Original Japanese sentence: {text}",
    ]
    if context_vi:
        user_lines.append(f"Context / Intended meaning: {context_vi}")
    if target_concept:
        user_lines.append(f"Target pattern: {target_concept}")
    user_lines.append("")
    user_lines.append("Generate the controlled 4-way comparison variants with linguistic explanations.")
    return REWRITE_VARIANTS_SYSTEM, "\n".join(user_lines).strip()


def build_single_mode_prompt(
    text: str,
    mode: str,
    target_register: str | None = None,
    context_vi: str | None = None,
) -> tuple[str, str]:
    """Return prompt for transforming text according to a specific rewrite mode."""
    user_lines = [
        f"Input Japanese sentence: {text}",
        f"Requested mode: {mode}",
    ]
    if target_register:
        user_lines.append(f"Target register: {target_register}")
    if context_vi:
        user_lines.append(f"Context / Intended meaning: {context_vi}")
    user_lines.append("")
    user_lines.append("Transform the sentence strictly according to the mode rules and provide linguistic rationale.")
    return SINGLE_MODE_SYSTEM, "\n".join(user_lines).strip()


def rewrite_modes_generation_prompt_version() -> str:
    return REWRITE_MODES_GENERATION_PROMPT_VERSION
