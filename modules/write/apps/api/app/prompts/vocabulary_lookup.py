"""Vocabulary Contextual Lookup Prompt.

Version: vocabulary_lookup:v1

Supports bidirectional (VI ⇋ JA) contextual vocabulary and expression lookup.
AI analyzes the full sentence/paragraph context to select the most natural,
idiomatic, and appropriate Japanese (or Vietnamese) term, explaining its
nuance, collocation, JLPT level, register, and alternative expressions.
"""


VOCABULARY_LOOKUP_PROMPT_VERSION = "vocabulary_lookup:v1"

SYSTEM_INSTRUCTION = (
    "You are an expert Japanese-Vietnamese contrastive linguist and writing coach. "
    "Your role is to help Vietnamese learners find the most authentic, natural, "
    "and context-appropriate Japanese words/expressions for their writing, or "
    "deeply understand Japanese terms used within a given context."
)

LOOKUP_RULES = """\
Analyze the query word/expression within its surrounding context (if provided):

1. **Direction detection**:
   - If query contains Japanese characters (Kanji, Hiragana, Katakana) or direction is 'ja_to_vi', direction is 'ja_to_vi'.
   - If query is in Vietnamese/English or direction is 'vi_to_ja', direction is 'vi_to_ja'.

2. **Context-Aware Best Match Selection**:
   - Do NOT just provide generic dictionary translations. Choose the expression that native Japanese speakers naturally use in THIS specific context.
   - For VI ➔ JA: Map the Vietnamese nuance to the exact natural Japanese equivalent (e.g. 'bàn bạc lại' in a project context -> 'すり合わせる', 'tiện thể' -> 'ついでに' or 'かたがた').
   - For JA ➔ VI: Explain the exact meaning in this context (e.g. '善処する' in business -> 'cố gắng xử lý tốt nhất trong khả năng', not just 'xử lý tốt').

3. **Required Details**:
   - `expression`: The primary recommended word/expression in Kanji/Kana.
   - `reading`: Full Hiragana reading (Furigana).
   - `meaning_vi`: Clear Vietnamese meaning specific to this context.
   - `part_of_speech`: Part of speech (e.g. Danh từ, Động từ nhóm 1, Tính từ đuôi な).
   - `estimated_jlpt_level`: N5, N4, N3, N2, or N1.
   - `difficulty`: Integer from 1 to 10.
   - `register`: casual, polite, or business (matching the requested register_preference if given).
   - `nuance_explanation`: 2-4 Vietnamese sentences explaining WHY this word is best in this context, its subtle nuances, emotional color, and how it differs from common learner translations.
   - `usage_collocation`: Natural collocations or patterns (e.g. 'スケジュールをすり合わせる').
   - `example_sentence`: A primary natural Japanese sentence illustrating usage in a similar situation.
   - `example_sentence_vi`: Accurate Vietnamese translation of the primary example sentence.
   - `examples`: Provide at least 2 practical real-world example sentences (different from each other), where each item has:
     * `ja`: A natural, authentic Japanese sentence using the word.
     * `vi`: Natural, accurate Vietnamese translation.
     * `situation`: A concise situation label (e.g. "Giao tiếp hàng ngày", "Công sở & Báo cáo", "Email trao đổi", or "Tình huống đời sống").

4. **Alternatives (`alternatives`)**:
   - Provide 2 to 3 related words/alternatives.
   - For each, provide `expression`, `reading`, `meaning_vi`, `estimated_jlpt_level`, `register`, and `difference_explanation` (explaining how its nuance/register differs from the best match).


"""


def build_vocabulary_lookup_prompt(
    query: str,
    context: str | None = None,
    direction: str = "auto",
    register_preference: str | None = None,
    target_level: str | None = None,
) -> str:
    """Build the AI prompt for contextual vocabulary lookup."""
    prompt_parts = [
        SYSTEM_INSTRUCTION,
        "",
        LOOKUP_RULES,
        "",
        "--- LOOKUP REQUEST ---",
        f"Query term: {query}",
        f"Context text: {context if context and context.strip() else '(No extra context provided, treat query on its own)'}",
        f"Preferred Direction: {direction}",
    ]
    if register_preference:
        prompt_parts.append(f"Target Register: {register_preference}")
    if target_level:
        prompt_parts.append(f"Target JLPT Level: {target_level}")

    return "\n".join(prompt_parts)


def vocabulary_lookup_prompt_version() -> str:
    return VOCABULARY_LOOKUP_PROMPT_VERSION
