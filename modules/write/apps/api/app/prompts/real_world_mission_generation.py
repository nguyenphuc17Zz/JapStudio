"""Real-world writing mission generator prompt (Phase 20).

Generates practical, goal-oriented writing missions customized for:
- 4 real-world categories (Daily Life, Work, Services, Social)
- 3 prompt modes (Mode A: Vietnamese Scenario, Mode B: Japanese Scenario, Mode C: Contextual Simulation In-Basket)
- Implicit learner weakness integration without artificial textbook prompts.
"""

from __future__ import annotations

from typing import Any

from app.domain.real_world_missions import (
    CATEGORY_LABELS,
    MISSION_ACTIONS,
    PROMPT_MODE_INFO,
    MissionActionDef,
)
from app.prompts.common import REAL_WORLD_MISSION_GENERATOR_PROMPT_VERSION

REAL_WORLD_MISSION_SYSTEM_PROMPT = (
    "You are the Real-World Writing Mission Generator of an advanced Japanese Writing Tutor.\n"
    "Your goal is to make Japanese writing practice directly transferable to real life.\n\n"
    "CRITICAL PEDAGOGICAL PRINCIPLES:\n"
    "1. REALISM & COMMUNICATIVE PURPOSE:\n"
    "   - Every mission must have an authentic communicative purpose (e.g., 'Your manager asks for an update but the task is delayed.').\n"
    "   - NEVER generate artificial textbook prompts such as 'Write 10 sentences using grammar X'.\n"
    "   - If a target weakness or grammar pattern is specified, organically weave the situation so that using that pattern is natural, but keep the weakness/target hidden from artificial instructions.\n\n"
    "2. PROMPT MODES & IMMERSION:\n"
    "   - MODE A (vietnamese_scenario): Situation, role, and requirements described naturally in Vietnamese. Learner composes original Japanese.\n"
    "   - MODE B (japanese_scenario): Situation, role, and instructions presented directly in natural Japanese (with Vietnamese metadata for clarity).\n"
    "   - MODE C (contextual_simulation): In-basket scenario where the learner receives a realistic INCOMING MESSAGE/EMAIL/TICKET in Japanese (e.g. from manager, client, landlord) and must write the direct response.\n\n"
    "3. STRUCTURED MISSION CONTRACT:\n"
    "   - role: Concrete persona (e.g., 'Kỹ sư BrSE tại công ty IT Tokyo', 'Người thuê căn hộ tại Shinjuku').\n"
    "   - recipient: Recipient name and title (e.g., 'Trưởng phòng Sato (佐藤部長)', 'Chủ nhà Tanaka-san (大家の田中さん)').\n"
    "   - relationship: Interpersonal relationship (e.g., 'Cấp dưới - Cấp trên', 'Khách thuê - Chủ nhà', 'Bạn bè thân thiết').\n"
    "   - objective: Specific communicative goal in Vietnamese.\n"
    "   - situation_vi & context_vi: Clear, natural descriptions in Vietnamese.\n"
    "   - situation_ja & context_ja: Natural Japanese descriptions (required for Mode B and Mode C).\n"
    "   - incoming_message: Realistic incoming text in Japanese (MANDATORY for Mode C, null/optional for Mode A & B).\n"
    "   - constraints: 2-4 realistic pragmatic constraints (e.g., 'Phải xin lỗi trước khi nêu lý do', 'Đưa ra thời gian dự kiến mới').\n"
    "   - required_points: 2-4 concrete factual items that must be included, each with an 'id' and 'description'.\n"
    "   - target_register: One of 'casual', 'polite', 'business'.\n"
    "   - optional_vocabulary: 3-5 contextual Japanese words/phrases with word (kanji), reading (hiragana), meaning (Vietnamese), and short example sentence.\n"
    "   - success_conditions: 2-4 concrete criteria for full mission pass.\n"
    "   - pedagogical_target_summary: A brief note explaining which linguistic or weakness target was embedded.\n\n"
    "Respond with the JSON object only."
)


def build_mission_generator_prompt(
    category: str,
    action_type: str,
    prompt_mode: str,
    jlpt_level: str,
    difficulty: int,
    register: str | None = None,
    role: str | None = None,
    recipient: str | None = None,
    target_weakness: dict[str, Any] | None = None,
    learner_profile_summary: str = "",
    memory_block: str = "",
) -> tuple[str, str]:
    """Builds (system, user) prompts for structured real-world writing mission generation."""
    action_def: MissionActionDef | None = MISSION_ACTIONS.get(action_type)
    category_meta = CATEGORY_LABELS.get(category, {})
    mode_meta = PROMPT_MODE_INFO.get(prompt_mode, {})

    lines: list[str] = [
        "MISSION SPECIFICATIONS:",
        f"- Category: {category} ({category_meta.get('vi', '')})",
        f"- Action Type: {action_type} ({action_def.label_vi if action_def else ''})",
        f"- Prompt Mode: {prompt_mode} ({mode_meta.get('label_vi', '')})",
        f"- Target JLPT Level: {jlpt_level}",
        f"- Difficulty (1-10): {difficulty}",
        f"- Target Register: {register or (action_def.default_register if action_def else 'polite')}",
    ]

    if action_def:
        lines.extend([
            f"- Default Medium: {action_def.default_medium}",
            f"- Suggested Role: {role or action_def.typical_role_vi}",
            f"- Suggested Recipient: {recipient or action_def.typical_recipient_vi}",
            f"- Communicative Purpose: {action_def.communicative_purpose_vi}",
        ])
    else:
        if role:
            lines.append(f"- Specified Role: {role}")
        if recipient:
            lines.append(f"- Specified Recipient: {recipient}")

    if target_weakness:
        lines.extend([
            "",
            "TARGET LEARNER WEAKNESS (Embed seamlessly into the scenario requirements):",
            f"- Category: {target_weakness.get('category', '')}",
            f"- Subtype: {target_weakness.get('subtype', '')}",
            f"- Description: {target_weakness.get('description', '')}",
            f"- Related Patterns/Expressions: {target_weakness.get('related_expressions', [])}",
        ])

    if learner_profile_summary:
        lines.extend(["", "LEARNER PROFILE:", learner_profile_summary])

    if memory_block:
        lines.extend(["", "LEARNER CONTEXT & MEMORY:", memory_block])

    if prompt_mode == "contextual_simulation":
        lines.extend([
            "",
            "SPECIAL INSTRUCTIONS FOR MODE C (In-Basket Simulation):",
            "You MUST generate 'incoming_message' containing an authentic Japanese email/chat/inbox message from the recipient that the learner needs to answer.",
        ])

    lines.extend([
        "",
        "Generate the complete JSON mission object with fields: role, recipient, relationship, objective, situation_vi, context_vi, situation_ja, context_ja, incoming_message, constraints, required_points, target_register, optional_vocabulary, success_conditions, pedagogical_target_summary.",
    ])

    return REAL_WORLD_MISSION_SYSTEM_PROMPT, "\n".join(lines).strip()


def real_world_mission_generator_prompt_version() -> str:
    return REAL_WORLD_MISSION_GENERATOR_PROMPT_VERSION
