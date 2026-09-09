"""Learner profile synthesis prompt (Phase 6, stage 1).

Version: learner_profile_synthesis:v1

Summarizes deterministic evidence (skill scores, trends, exercise history,
mistake patterns) into a structured profile. The AI only reframes what the
code already computed; it never fabricates numbers.
"""

from app.prompts.common import LEARNER_PROFILE_SYNTHESIS_PROMPT_VERSION

SYSTEM_INSTRUCTION = (
    "You are the profiling module of a Japanese writing tutor. You turn "
    "computed learner evidence into a clear, structured learner profile for "
    "a Vietnamese learner of Japanese."
)

RULES = (
    "Rules:\n"
    "- The evidence block below is authoritative and was computed "
    "deterministically. Your strengths/weaknesses must be consistent with the "
    "skill scores and trend direction (improving/stable/declining).\n"
    "- Strengths = skills with the highest scores / improving trends; "
    "weaknesses = lowest scores / declining trends.\n"
    "- estimated_jlpt.min_level/max_level should reflect the difficulty band "
    "the learner currently handles (derived from their exercise history).\n"
    "- recent_trends.overall_score is the recency-weighted average of recent "
    "evaluation scores; improvement is the delta between recent and older "
    "scores. Mirror the given numbers; do not invent others.\n"
    "- Write strengths/weaknesses in Vietnamese, concrete and specific "
    "(e.g. 'Dùng trợ từ は/が chưa chắc chắn', not 'Ngữ pháp còn yếu').\n"
    "- If there is too little evidence, keep the profile minimal and set "
    "confidence to low.\n"
    "- When scenario evidence exists, judge the learner's scenario skills too: "
    "scenario_semantic_fit, audience_fit, purpose_fit, tone_fit, "
    "constraint_compliance (0-100) and the per-genre averages in "
    "scenario_genres. A genre whose average_fit is clearly low is a weakness "
    "worth naming in Vietnamese (e.g. 'Viết email công việc chưa đúng người "
    "đọc và mục đích')."
)

OUTPUT_CONTRACT = (
    "Return exactly one JSON object:\n"
    '{"strengths": [str], "weaknesses": [str], '
    '"estimated_jlpt": {"min_level": "N5"|"N4"|"N3"|"N2"|"N1", '
    '"max_level": "N5"|"N4"|"N3"|"N2"|"N1", "confidence": "high"|"medium"|"low"}, '
    '"recent_trends": {"overall_score": int 0-100, "improvement": number, '
    '"last_7d_attempts": int}}'
)


def build_learner_profile_synthesis_prompt(evidence: dict) -> str:
    """Build the profile synthesis prompt from the deterministic evidence dict."""
    return (
        SYSTEM_INSTRUCTION
        + "\n\n"
        + RULES
        + "\n\n"
        + OUTPUT_CONTRACT
        + "\n\n"
        + "Deterministic learner evidence (JSON):\n"
        + str(evidence)
    )


def learner_profile_synthesis_prompt_version() -> str:
    return LEARNER_PROFILE_SYNTHESIS_PROMPT_VERSION
