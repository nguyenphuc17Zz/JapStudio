"""Scenario taxonomy and format metadata (Phase 9).

Deterministic, metadata-driven definitions for the writing-scenario domain:
allowed dimension values, per-genre exercise types, target lengths and
format-section templates. The AI only produces content; every dimension it
returns is validated against the sets below, and format-section templates
drive the scenario-aware evaluation.
"""

from __future__ import annotations

from dataclasses import dataclass

GENRES: list[str] = [
    "business_email",
    "casual_message",
    "business_chat",
    "meeting_followup",
    "status_report",
    "incident_report",
    "bug_report",
    "requirement_clarification",
    "customer_response",
    "request",
    "apology",
    "proposal",
    "opinion",
    "sns_post",
    "review",
    "personal_note",
    "experience_story",
]

MEDIA: list[str] = [
    "email",
    "chat",
    "sns",
    "report",
    "document",
    "ticket",
    "comment",
    "memo",
    "proposal",
    "presentation_notes",
]

AUDIENCES: list[str] = [
    "friend",
    "family",
    "coworker",
    "senior_coworker",
    "manager",
    "client",
    "vendor",
    "teacher",
    "general_public",
    "social_media_followers",
]

RELATIONSHIPS: list[str] = [
    "close",
    "casual",
    "neutral",
    "professional",
    "formal",
    "customer_vendor",
    "internal_company",
]

PURPOSES: list[str] = [
    "inform",
    "request",
    "apologize",
    "refuse",
    "persuade",
    "explain",
    "report",
    "confirm",
    "propose",
    "complain",
    "thank",
    "invite",
    "follow_up",
    "summarize",
    "clarify",
]

TONES: list[str] = [
    "friendly",
    "neutral",
    "polite",
    "professional",
    "apologetic",
    "persuasive",
    "conciliatory",
    "firm",
]

REGISTERS: list[str] = ["casual", "polite", "business", "mixed"]

# Genres whose exercises get professional-rewrite rewrites when the register
# warrants it (business/polite). Requirement 30: avoid casual rewrites for
# formal-only exercises.
PROFESSIONAL_REWRITE_GENRES: set[str] = {
    "business_email",
    "meeting_followup",
    "status_report",
    "incident_report",
    "bug_report",
    "requirement_clarification",
    "customer_response",
    "request",
    "apology",
    "proposal",
}

# Registers that warrant a professional rewrite level (requirement 30).
PROFESSIONAL_REWRITE_REGISTERS: set[str] = {"business", "polite"}

# Only long-form targets are eligible for the writing-submission pipeline.
LONG_FORM_TARGET_LENGTHS: list[str] = ["multi_sentence", "paragraph", "long_writing"]

MEDIUM_TARGET_LENGTHS: dict[str, str] = {
    "email": "paragraph",
    "chat": "multi_sentence",
    "sns": "multi_sentence",
    "report": "paragraph",
    "document": "long_writing",
    "ticket": "paragraph",
    "comment": "multi_sentence",
    "memo": "multi_sentence",
    "proposal": "long_writing",
    "presentation_notes": "paragraph",
}

GENRE_EXERCISE_TYPES: dict[str, str] = {
    "business_email": "email_writing",
    "casual_message": "scenario_response",
    "business_chat": "chat_writing",
    "meeting_followup": "email_writing",
    "status_report": "report_writing",
    "incident_report": "report_writing",
    "bug_report": "ticket_writing",
    "requirement_clarification": "email_writing",
    "customer_response": "email_writing",
    "request": "email_writing",
    "apology": "email_writing",
    "proposal": "scenario_response",
    "opinion": "opinion_writing",
    "sns_post": "scenario_response",
    "review": "scenario_response",
    "personal_note": "scenario_response",
    "experience_story": "scenario_response",
}

# Canonical medium per genre (drives the target length).
GENRE_MEDIA: dict[str, str] = {
    "business_email": "email",
    "casual_message": "chat",
    "business_chat": "chat",
    "meeting_followup": "email",
    "status_report": "report",
    "incident_report": "report",
    "bug_report": "ticket",
    "requirement_clarification": "email",
    "customer_response": "email",
    "request": "email",
    "apology": "email",
    "proposal": "proposal",
    "opinion": "document",
    "sns_post": "sns",
    "review": "comment",
    "personal_note": "memo",
    "experience_story": "document",
}

# Difficulty dimensions (1-10) composing the deterministic overall difficulty.
DIFFICULTY_DIMENSIONS: list[str] = [
    "language",
    "context",
    "audience",
    "purpose",
    "constraint",
    "register",
]

# IT / BRSE seed concepts. Used as a taxonomy hint inside the AI prompts, not
# as a hard-coded question bank.
BRSE_SEED_CONCEPTS: list[str] = [
    "client asks for a specification change",
    "requirement is ambiguous",
    "developer found a bug",
    "release is delayed",
    "test result must be reported",
    "customer asks for progress",
    "need clarification on a specification",
    "meeting decision must be summarized",
    "need to explain a technical limitation",
    "need to apologize for a missed deadline",
    "need to ask client to confirm a requirement",
]


@dataclass(frozen=True)
class ScenarioFormat:
    """Format template for one genre (metadata-driven, not AI content)."""

    genre: str
    required_sections: tuple[str, ...] = ()
    optional_sections: tuple[str, ...] = ()
    register_preferences: tuple[str, ...] = ()
    tone_preferences: tuple[str, ...] = ()
    professional_rewrite: bool = False


FORMAT_BY_GENRE: dict[str, ScenarioFormat] = {
    "business_email": ScenarioFormat(
        "business_email",
        ("opening", "purpose", "main_content", "request_action", "closing"),
        (),
        ("business", "polite"),
        ("polite", "professional", "apologetic", "conciliatory", "firm"),
        professional_rewrite=True,
    ),
    "casual_message": ScenarioFormat(
        "casual_message", ("greeting", "message_body", "sign_off"), (), ("casual",), ("friendly",)
    ),
    "business_chat": ScenarioFormat(
        "business_chat",
        ("greeting", "message_body", "call_to_action"),
        (),
        ("business", "polite"),
        ("polite", "professional"),
    ),
    "meeting_followup": ScenarioFormat(
        "meeting_followup",
        ("summary", "decisions", "action_items", "owner", "deadline"),
        ("questions", "next_meeting"),
        ("business",),
        ("professional", "polite"),
        professional_rewrite=True,
    ),
    "status_report": ScenarioFormat(
        "status_report",
        ("summary", "completed_work", "in_progress", "next_steps", "blockers"),
        ("risks", "metrics"),
        ("business",),
        ("professional", "neutral"),
        professional_rewrite=True,
    ),
    "incident_report": ScenarioFormat(
        "incident_report",
        ("summary", "impact", "timeline", "root_cause", "resolution", "prevention"),
        ("contributing_factors",),
        ("business",),
        ("professional", "conciliatory"),
        professional_rewrite=True,
    ),
    "bug_report": ScenarioFormat(
        "bug_report",
        (
            "summary",
            "environment",
            "steps_to_reproduce",
            "actual_result",
            "expected_result",
            "impact",
        ),
        ("workaround", "screenshots"),
        ("business",),
        ("professional", "neutral"),
        professional_rewrite=True,
    ),
    "requirement_clarification": ScenarioFormat(
        "requirement_clarification",
        ("acknowledgement", "questions", "proposed_next_step"),
        ("impact_assessment",),
        ("business",),
        ("polite", "professional"),
        professional_rewrite=True,
    ),
    "customer_response": ScenarioFormat(
        "customer_response",
        ("acknowledgement", "explanation", "action_plan", "closing"),
        ("apology",),
        ("business", "polite"),
        ("polite", "professional", "apologetic", "conciliatory"),
        professional_rewrite=True,
    ),
    "request": ScenarioFormat(
        "request",
        ("greeting", "request", "rationale", "appreciation"),
        ("deadline",),
        ("business", "polite"),
        ("polite", "professional"),
        professional_rewrite=True,
    ),
    "apology": ScenarioFormat(
        "apology",
        ("apology", "explanation", "remedy", "commitment"),
        (),
        ("business", "polite"),
        ("apologetic", "conciliatory", "polite"),
        professional_rewrite=True,
    ),
    "proposal": ScenarioFormat(
        "proposal",
        ("context", "proposal", "benefits", "timeline", "call_to_action"),
        ("cost", "risks"),
        ("business",),
        ("professional", "persuasive"),
        professional_rewrite=True,
    ),
    "opinion": ScenarioFormat(
        "opinion",
        ("stance", "reasoning", "examples", "conclusion"),
        ("counterargument",),
        ("casual", "mixed"),
        ("neutral", "friendly"),
    ),
    "sns_post": ScenarioFormat(
        "sns_post", ("hook", "content", "hashtags"), (), ("casual",), ("friendly", "neutral")
    ),
    "review": ScenarioFormat(
        "review", ("summary", "pros", "cons", "verdict"), (), ("casual", "neutral"), ("neutral",)
    ),
    "personal_note": ScenarioFormat(
        "personal_note", ("greeting", "message", "sign_off"), (), ("casual",), ("friendly",)
    ),
    "experience_story": ScenarioFormat(
        "experience_story",
        ("opening", "events", "reflection", "closing"),
        (),
        ("casual",),
        ("friendly", "neutral"),
    ),
}

GENRE_VALUES: set[str] = set(GENRES)
MEDIUM_VALUES: set[str] = set(MEDIA)
AUDIENCE_VALUES: set[str] = set(AUDIENCES)
RELATIONSHIP_VALUES: set[str] = set(RELATIONSHIPS)
PURPOSE_VALUES: set[str] = set(PURPOSES)
TONE_VALUES: set[str] = set(TONES)
REGISTER_VALUES: set[str] = set(REGISTERS)


def format_for_genre(genre: str) -> ScenarioFormat | None:
    return FORMAT_BY_GENRE.get(genre)


def sections_for_genre(genre: str) -> tuple[str, ...]:
    fmt = FORMAT_BY_GENRE.get(genre)
    return fmt.required_sections + fmt.optional_sections if fmt else ()
