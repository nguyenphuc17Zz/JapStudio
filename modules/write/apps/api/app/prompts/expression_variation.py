"""Expression variation prompt (Phase 21).

Generates:
"Write this meaning in 3 different natural ways"
with distinct nuances and registers, followed by a synthesis prompt
asking the learner to create their own variation.
"""

from app.prompts.common import (
    ANTI_HALLUCINATION_RULES,
    EXPRESSION_VARIATION_PROMPT_VERSION,
    MEANING_PRESERVATION_RULES,
)

EXPRESSION_VARIATION_SYSTEM = (
    "You are a master Japanese stylist and expression tutor at Japanese Writing Studio.\n"
    "Your goal is to teach natural expression variety by generating 3 distinct, authentic ways "
    "to express the exact same intended meaning in Japanese, each with a different nuance, "
    "idiomatic phrasing, or register.\n\n"
    "GUIDELINES:\n"
    "1. Produce exactly 3 natural Japanese variations:\n"
    "   - Variation 1: Clean, concise standard phrasing (標準的・スマート).\n"
    "   - Variation 2: Nuanced idiomatic or native-idiom phrasing (慣用表現・こなれた表現).\n"
    "   - Variation 3: Formal/business or alternative register phrasing (ビジネス・改まった表現 hoặc 話し言葉).\n"
    "2. For each variation, explain the precise nuance and stylistic context in Vietnamese.\n"
    "3. Identify the key phrase/collocation used in each variation.\n"
    "4. Formulate an inspiring synthesis task prompt in Vietnamese, challenging the learner "
    "to write their own original sentence utilizing one of the demonstrated patterns.\n\n"
    f"{MEANING_PRESERVATION_RULES}\n"
    f"{ANTI_HALLUCINATION_RULES}\n\n"
    "OUTPUT FORMAT: Return strictly JSON adhering to:\n"
    "- original: string\n"
    "- variations: list of exactly 3 {text, register, nuance_vi, key_phrase}\n"
    "- synthesis_prompt_vi: string (e.g. 'Bây giờ hãy thử viết một câu mới của riêng bạn sử dụng một trong các cách diễn đạt trên!')\n"
)


def build_expression_variation_prompt(
    text: str,
    context_vi: str | None = None,
) -> tuple[str, str]:
    """Return (system, user) prompt for generating 3 natural expression variations."""
    user_lines = [
        f"Original sentence/expression: {text}",
    ]
    if context_vi:
        user_lines.append(f"Context / Intended meaning in Vietnamese: {context_vi}")
    user_lines.append("\nGenerate 3 natural distinct variations with linguistic nuances and a synthesis challenge prompt.")
    return EXPRESSION_VARIATION_SYSTEM, "\n".join(user_lines).strip()


def expression_variation_prompt_version() -> str:
    return EXPRESSION_VARIATION_PROMPT_VERSION
