"""Real-world writing mission 10-dimensional evaluation prompt (Phase 20).

Evaluates learner Japanese response across 10 communicative & linguistic criteria:
1. task_completion
2. factual_completeness
3. naturalness
4. grammar
5. vocabulary
6. register
7. politeness
8. tone
9. clarity
10. discourse
Plus point-by-point checklist verification, constraint verification, and native model rewrite.
"""

from __future__ import annotations

from typing import Any

from app.prompts.common import REAL_WORLD_MISSION_EVALUATOR_PROMPT_VERSION

REAL_WORLD_MISSION_EVALUATION_SYSTEM_PROMPT = (
    "You are the 10-Dimensional Real-World Mission Evaluator of an advanced Japanese Writing Tutor.\n"
    "Your role is to rigorously evaluate a learner's Japanese response to a real-world writing mission.\n\n"
    "EVALUATION CRITERIA (Score 0-100 for each dimension with status: 'excellent' (>=85), 'good' (>=70), 'needs_work' (>=50), 'poor' (<50), and Vietnamese feedback):\n"
    "1. task_completion: Did the text achieve the core communicative objective? (e.g. requesting a deadline extension, apologizing effectively).\n"
    "2. factual_completeness: Are all required facts, reasons, dates, and details included?\n"
    "3. naturalness: How natural and idiomatic is the phrasing compared to native Japanese conventions?\n"
    "4. grammar: Accuracy of grammatical structures, particles (助詞), verb conjugations, and clauses.\n"
    "5. vocabulary: Precision, appropriateness, and richness of lexical items and domain terminology.\n"
    "6. register: Strict adherence to the target register (casual / polite / business keigo).\n"
    "7. politeness: Correct level of honorifics (尊敬語, 謙譲語, 丁寧語) reflecting the interpersonal hierarchy.\n"
    "8. tone: Emotional and communicative nuance (apologetic, firm, cooperative, appreciative).\n"
    "9. clarity: Directness, lack of ambiguity, and ease of understanding for the recipient.\n"
    "10. discourse: Text organization, opening greetings (挨拶), paragraph transitions, and closing formulas (結びの言葉).\n\n"
    "REQUIRED OUTPUT SECTIONS:\n"
    "- overall_score: Weighted integer score (0-100).\n"
    "- passed: Boolean (true if overall_score >= 70 and all required points are satisfied or partially satisfied).\n"
    "- dimensions: Detailed score object containing all 10 criteria above.\n"
    "- required_points: Array checking every required point with status ('satisfied', 'partially_satisfied', 'missing') and 'explanation_vi'.\n"
    "- constraints_respected: Boolean.\n"
    "- constraints_feedback: Array of strings checking each constraint.\n"
    "- strengths_vi: 2-3 specific positive aspects in Vietnamese.\n"
    "- improvements_vi: 2-3 concrete, actionable improvement recommendations in Vietnamese.\n"
    "- native_model_rewrite: A fluent, perfectly natural Japanese native rewrite for the exact same mission.\n"
    "- rewrite_nuances_vi: Explanation in Vietnamese highlighting the phrasing choices in the native rewrite.\n"
    "- cultural_discourse_tip_vi: A valuable cultural or business etiquette tip relevant to this situation.\n\n"
    "Respond with the JSON object only."
)


def build_mission_evaluation_prompt(
    mission: dict[str, Any],
    learner_text: str,
) -> tuple[str, str]:
    """Builds (system, user) prompts for 10-dimensional evaluation."""
    required_points = mission.get("required_points", [])
    constraints = mission.get("constraints", [])

    lines: list[str] = [
        "MISSION SPECIFICATION:",
        f"- Role: {mission.get('role', '')}",
        f"- Recipient: {mission.get('recipient', '')}",
        f"- Relationship: {mission.get('relationship', '')}",
        f"- Objective: {mission.get('objective', '')}",
        f"- Target Register: {mission.get('target_register', '')}",
        f"- Target JLPT Level: {mission.get('jlpt_level', '')}",
        f"- Context (VI): {mission.get('context_vi', '') or mission.get('situation_vi', '')}",
    ]

    if mission.get("context_ja") or mission.get("situation_ja"):
        lines.append(f"- Context (JA): {mission.get('context_ja', '') or mission.get('situation_ja', '')}")

    if mission.get("incoming_message"):
        lines.extend([
            "",
            "INCOMING MESSAGE (Mode C In-Basket that learner is replying to):",
            f"{mission.get('incoming_message')}",
        ])

    if required_points:
        lines.extend(["", "REQUIRED INFORMATION CHECKLIST (Must be verified in learner's answer):"])
        for idx, pt in enumerate(required_points, 1):
            pt_id = pt.get("id", f"pt_{idx}") if isinstance(pt, dict) else f"pt_{idx}"
            pt_desc = pt.get("description", str(pt)) if isinstance(pt, dict) else str(pt)
            lines.append(f"  {idx}. [{pt_id}] {pt_desc}")

    if constraints:
        lines.extend(["", "CONSTRAINTS & RULES:"])
        for c in constraints:
            lines.append(f"  - {c}")

    lines.extend([
        "",
        "LEARNER'S JAPANESE RESPONSE TO EVALUATE:",
        f'"""\n{learner_text.strip()}\n"""',
        "",
        "Perform a thorough 10-dimension evaluation and output the complete JSON object.",
    ])

    return REAL_WORLD_MISSION_EVALUATION_SYSTEM_PROMPT, "\n".join(lines).strip()


def real_world_mission_evaluator_prompt_version() -> str:
    return REAL_WORLD_MISSION_EVALUATOR_PROMPT_VERSION
