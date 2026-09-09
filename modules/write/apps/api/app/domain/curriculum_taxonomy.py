"""Curriculum & learning journey taxonomy (Phase 13).

Deterministic skill/competency taxonomy for long-term learning journeys.

The AI proposes competencies, milestones and objectives; this module is the
authoritative vocabulary everything is validated against. Competencies map to
measurable learner-evidence skills (the Phase 6 skill names) so mastery can
always be computed deterministically.
"""

GOAL_TYPES = [
    "general",
    "daily_conversation",
    "business",
    "it",
    "brse",
    "jlpt",
    "natural_japanese",
    "writing_fluency",
]

GOAL_LABELS_VI = {
    "general": "Chung",
    "daily_conversation": "Hội thoại hằng ngày",
    "business": "Tiếng Nhật công việc",
    "it": "Công nghệ thông tin (IT)",
    "brse": "Kỹ sư cầu nối (BRSE)",
    "jlpt": "Luyện thi JLPT",
    "natural_japanese": "Tiếng Nhật tự nhiên",
    "writing_fluency": "Viết lưu loát",
}

# Competency categories (compact, extensible; never thousands of skills).
COMPETENCY_CATEGORIES = {
    "language": ["grammar", "vocabulary", "semantic_accuracy", "naturalness"],
    "discourse": ["coherence", "cohesion", "organization", "flow"],
    "register": ["casual_register", "polite_register", "business_register"],
    "communication": [
        "clarification",
        "requesting",
        "refusing",
        "apologizing",
        "negotiating",
        "explaining",
        "reporting",
    ],
    "writing_forms": [
        "sentence_writing",
        "multi_sentence_writing",
        "paragraph_writing",
        "email_writing",
        "chat_writing",
        "report_writing",
        "proposal_writing",
        "simulation",
    ],
}

COMPETENCIES = [skill for group in COMPETENCY_CATEGORIES.values() for skill in group]

COMPETENCY_LABELS_VI = {
    "grammar": "Ngữ pháp",
    "vocabulary": "Từ vựng",
    "semantic_accuracy": "Độ chính xác nghĩa",
    "naturalness": "Tự nhiên",
    "coherence": "Mạch lạc",
    "cohesion": "Liên kết",
    "organization": "Cấu trúc",
    "flow": "Nhịp đọc",
    "casual_register": "Phong cách thân mật",
    "polite_register": "Phong cách lịch sự",
    "business_register": "Phong cách công việc",
    "clarification": "Làm rõ yêu cầu",
    "requesting": "Đưa ra yêu cầu",
    "refusing": "Từ chối",
    "apologizing": "Xin lỗi",
    "negotiating": "Đàm phán",
    "explaining": "Giải thích",
    "reporting": "Báo cáo",
    "sentence_writing": "Viết câu",
    "multi_sentence_writing": "Viết nhiều câu",
    "paragraph_writing": "Viết đoạn văn",
    "email_writing": "Viết email",
    "chat_writing": "Viết chat",
    "report_writing": "Viết báo cáo",
    "proposal_writing": "Viết đề xuất",
    "simulation": "Hội thoại mô phỏng",
}

# Competency -> measurable learner-evidence skills (Phase 6 skill names).
COMPETENCY_TO_SKILLS: dict[str, list[str]] = {
    "grammar": ["grammar"],
    "vocabulary": ["vocabulary"],
    "semantic_accuracy": ["semantic"],
    "naturalness": ["naturalness"],
    "coherence": ["coherence"],
    "cohesion": ["cohesion"],
    "organization": ["organization"],
    "flow": ["flow"],
    "casual_register": ["register_fit", "tone_fit"],
    "polite_register": ["register_fit", "tone_fit"],
    "business_register": ["register_fit", "tone_fit", "audience_fit"],
    "clarification": ["clarification", "scenario_semantic_fit"],
    "requesting": ["communication_effectiveness", "register_fit"],
    "refusing": ["communication_effectiveness", "tone_fit"],
    "apologizing": ["communication_effectiveness", "tone_fit"],
    "negotiating": ["negotiation", "communication_effectiveness"],
    "explaining": ["communication_effectiveness", "purpose_fit"],
    "reporting": ["communication_effectiveness", "purpose_fit", "constraint_compliance"],
    "sentence_writing": ["grammar", "naturalness"],
    "multi_sentence_writing": ["cohesion", "flow", "organization"],
    "paragraph_writing": ["coherence", "organization", "flow"],
    "email_writing": ["register_fit", "purpose_fit", "audience_fit"],
    "chat_writing": ["register_fit", "tone_fit"],
    "report_writing": ["organization", "purpose_fit", "constraint_compliance"],
    "proposal_writing": ["organization", "purpose_fit", "communication_effectiveness"],
    "simulation": ["communication_effectiveness", "goal_progress", "response_management"],
}

# Exercise modes an objective can be practiced through (existing exercise
# types + the interactive simulation mode).
EXERCISE_MODES = [
    "sentence_translation",
    "multi_sentence_translation",
    "paragraph_translation",
    "free_writing",
    "register_challenge",
    "scenario_response",
    "email_writing",
    "chat_writing",
    "report_writing",
    "ticket_writing",
    "opinion_writing",
    "simulation",
]

# Preferred exercise modes per competency (used for defaults and validation).
COMPETENCY_TO_MODES: dict[str, list[str]] = {
    "grammar": ["sentence_translation", "multi_sentence_translation"],
    "vocabulary": ["sentence_translation", "free_writing"],
    "semantic_accuracy": ["sentence_translation", "multi_sentence_translation"],
    "naturalness": ["sentence_translation", "free_writing", "register_challenge"],
    "coherence": ["paragraph_translation", "free_writing"],
    "cohesion": ["multi_sentence_translation", "free_writing"],
    "organization": ["paragraph_translation", "free_writing"],
    "flow": ["multi_sentence_translation", "free_writing"],
    "casual_register": ["register_challenge", "free_writing"],
    "polite_register": ["register_challenge", "free_writing"],
    "business_register": ["register_challenge", "email_writing", "chat_writing"],
    "clarification": ["scenario_response", "chat_writing"],
    "requesting": ["email_writing", "scenario_response"],
    "refusing": ["email_writing", "scenario_response"],
    "apologizing": ["email_writing", "scenario_response"],
    "negotiating": ["scenario_response", "simulation"],
    "explaining": ["report_writing", "free_writing"],
    "reporting": ["report_writing", "email_writing"],
    "sentence_writing": ["sentence_translation"],
    "multi_sentence_writing": ["multi_sentence_translation"],
    "paragraph_writing": ["paragraph_translation", "free_writing"],
    "email_writing": ["email_writing"],
    "chat_writing": ["chat_writing"],
    "report_writing": ["report_writing"],
    "proposal_writing": ["scenario_response", "opinion_writing"],
    "simulation": ["simulation"],
}

# Exercise mode -> scenario genre prefill (Phase 9 integration).
MODE_TO_SCENARIO_GENRE = {
    "email_writing": "business_email",
    "chat_writing": "business_chat",
    "report_writing": "status_report",
    "ticket_writing": "bug_report",
    "scenario_response": "requirement_clarification",
    "opinion_writing": "opinion",
}

MASTERY_STATES = [
    "not_started",
    "introduced",
    "practicing",
    "developing",
    "proficient",
    "mastered",
]

MASTERY_LABELS_VI = {
    "not_started": "Chưa bắt đầu",
    "introduced": "Đã làm quen",
    "practicing": "Đang luyện tập",
    "developing": "Đang phát triển",
    "proficient": "Khá thành thạo",
    "mastered": "Đã thành thạo",
}

# Deterministic goal -> competencies mapping (used when the AI is unavailable
# and as the canonical interpretation of each supported goal type).
DEFAULT_COMPETENCIES_BY_GOAL: dict[str, list[str]] = {
    "general": [
        "grammar",
        "vocabulary",
        "naturalness",
        "sentence_writing",
        "multi_sentence_writing",
        "polite_register",
        "casual_register",
    ],
    "daily_conversation": [
        "casual_register",
        "polite_register",
        "naturalness",
        "sentence_writing",
        "chat_writing",
        "clarification",
        "requesting",
    ],
    "business": [
        "business_register",
        "polite_register",
        "email_writing",
        "requesting",
        "clarification",
        "apologizing",
        "reporting",
        "negotiating",
    ],
    "it": [
        "business_register",
        "reporting",
        "clarification",
        "explaining",
        "chat_writing",
        "report_writing",
    ],
    "brse": [
        "business_register",
        "reporting",
        "clarification",
        "negotiating",
        "explaining",
        "email_writing",
        "report_writing",
        "proposal_writing",
    ],
    "jlpt": [
        "grammar",
        "vocabulary",
        "naturalness",
        "semantic_accuracy",
        "sentence_writing",
        "paragraph_writing",
    ],
    "natural_japanese": [
        "naturalness",
        "casual_register",
        "polite_register",
        "business_register",
        "coherence",
        "cohesion",
        "flow",
    ],
    "writing_fluency": [
        "organization",
        "coherence",
        "cohesion",
        "flow",
        "paragraph_writing",
        "report_writing",
        "proposal_writing",
    ],
}


def competencies_for_goal(goal_type: str) -> list[str]:
    """Deterministic competency map for a supported goal type."""
    if goal_type not in DEFAULT_COMPETENCIES_BY_GOAL:
        return list(DEFAULT_COMPETENCIES_BY_GOAL["general"])
    return list(DEFAULT_COMPETENCIES_BY_GOAL[goal_type])


def skills_for_competencies(competencies: list[str]) -> list[str]:
    """Flatten competencies to their measurable evidence skills (deduped)."""
    skills: list[str] = []
    for competency in competencies:
        for skill in COMPETENCY_TO_SKILLS.get(competency, []):
            if skill not in skills:
                skills.append(skill)
    return skills
