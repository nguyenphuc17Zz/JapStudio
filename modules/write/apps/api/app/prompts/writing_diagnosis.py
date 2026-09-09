"""Writing Intelligence Diagnosis Prompt (Phase 16).

Version: writing_diagnosis:v1

Synthesizes the learner's Writing Fingerprint, recurring weaknesses,
and error examples into a deep, empathetic root-cause diagnosis
and actionable remediation plan for Vietnamese learners of Japanese.
"""

from typing import Any

from app.prompts.common import WRITING_DIAGNOSIS_PROMPT_VERSION

SYSTEM_INSTRUCTION = (
    "You are the Chief Japanese Writing Diagnostic Specialist at Japanese Writing Studio. "
    "Your mission is to perform an in-depth pedagogical diagnosis of a Vietnamese learner's "
    "recurring Japanese writing weaknesses, uncovering root psychological and linguistic causes "
    "(such as L1 Vietnamese language interference, literal word-by-word translation habits, "
    "or nuance misunderstandings) and providing high-yield, actionable Japanese writing tips."
)

RULES = (
    "DIAGNOSTIC GUIDELINES:\n"
    "1. Deep Root Cause Analysis:\n"
    "   - Explain WHY the learner makes these recurring mistakes from a cognitive perspective of a Vietnamese speaker.\n"
    "   - E.g., for particles (は vs が): Vietnamese speakers often confuse topic marker with grammatical subject in adjectival predicates (〜が好き/上手).\n"
    "   - E.g., for naturalness: Vietnamese word-order translation (translationese) instead of Japanese noun-modifying or topic-first phrasing.\n"
    "   - E.g., for register: Mixing だ/である and です/ます or using polite forms inside subordinate clauses before から/ので.\n"
    "   - If no specific recurring weaknesses exist yet, provide foundational Japanese writing insights tailored for Vietnamese learners (e.g. topic-comment mindset vs subject-predicate mindset, natural verb-final pacing).\n"
    "2. Concrete Japanese Demonstrations:\n"
    "   - Provide clear, memorable ❌ Bad vs ⭕ Good contrast pairs for the top persistent weaknesses or foundational mistakes.\n"
    "3. Positive & Actionable:\n"
    "   - Acknowledge their strengths and write an encouraging, motivating diagnosis in Vietnamese.\n"
    "   - Provide 3-4 specific action steps (e.g. 'Ôn tập mẫu câu 〜ので vs 〜から', 'Luyện viết câu ngắn trước khi nối câu phức').\n"
    "4. Return strictly valid JSON adhering to the specified schema."
)


def build_writing_diagnosis_prompt(
    fingerprint: dict[str, Any],
    top_weaknesses: list[dict[str, Any]],
    persistent_weaknesses: list[dict[str, Any]],
    user_context: dict[str, Any] | None = None,
) -> str:
    """Build the AI prompt for writing diagnosis synthesis."""
    context_str = f"\nUser Context: {user_context}" if user_context else ""
    return (
        f"{SYSTEM_INSTRUCTION}\n\n"
        f"{RULES}\n\n"
        f"=== LEARNER WRITING INTELLIGENCE DATA ===\n"
        f"Top Recurring Weaknesses:\n{top_weaknesses}\n\n"
        f"Persistent Weaknesses:\n{persistent_weaknesses}\n\n"
        f"Writing Fingerprint Summary:\n"
        f"- Strongest Dimensions: {fingerprint.get('strongest_dimensions', [])}\n"
        f"- Weakest Dimensions: {fingerprint.get('weakest_dimensions', [])}\n"
        f"- Active Weakness Count: {fingerprint.get('active_weakness_count', 0)}\n"
        f"- Overall Mastery Rate: {fingerprint.get('overall_mastery_rate', 0.0)}\n"
        f"{context_str}\n\n"
        f"Provide your in-depth diagnosis as a structured JSON object."
    )


def writing_diagnosis_prompt_version() -> str:
    return WRITING_DIAGNOSIS_PROMPT_VERSION
