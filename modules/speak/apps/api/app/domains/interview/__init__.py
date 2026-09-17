"""Dynamic AI Interview Coach Domain Package."""

from app.domains.interview.contracts import (
    EvaluateAnswerRequest,
    GenerateQuestionRequest,
    IndustryTemplate,
    InterviewCoachEvaluation,
    InterviewerPersonality,
    InterviewQuestion,
    KeigoAnalysisItem,
    PREPScoreBreakdown,
    PREPStarters,
)
from app.domains.interview.dynamic_generator import InterviewCoachService
from app.domains.interview.pools import (
    DEFAULT_PREP_STARTERS,
    INDUSTRY_TEMPLATES,
    INTERVIEWER_PROFILES,
    SEED_QUESTIONS_BY_TURN,
)

__all__ = [
    "EvaluateAnswerRequest",
    "GenerateQuestionRequest",
    "IndustryTemplate",
    "InterviewCoachEvaluation",
    "InterviewCoachService",
    "InterviewerPersonality",
    "InterviewQuestion",
    "KeigoAnalysisItem",
    "PREPScoreBreakdown",
    "PREPStarters",
    "DEFAULT_PREP_STARTERS",
    "INDUSTRY_TEMPLATES",
    "INTERVIEWER_PROFILES",
    "SEED_QUESTIONS_BY_TURN",
]
