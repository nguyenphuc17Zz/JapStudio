from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Options
# ---------------------------------------------------------------------------

class QuizOptionClientResponse(BaseModel):
    """Client-facing option (does NOT leak correct answer before submission)."""
    id: int
    option_index: int
    text: str
    text_vi: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class QuizOptionDetailResponse(BaseModel):
    """Option with solution details (revealed after submission / review)."""
    id: int
    option_index: int
    text: str
    text_vi: Optional[str] = None
    is_correct: bool
    explanation: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Questions
# ---------------------------------------------------------------------------

class QuizQuestionClientResponse(BaseModel):
    """Client question representation during test taking."""
    id: int
    question_index: int
    question_type: str
    skill_type: str
    prompt: str
    prompt_vi: Optional[str] = None
    difficulty: str
    points: int
    source_scope: str
    source_sentence_id: Optional[str] = None
    hints: List[str] = Field(default_factory=list)
    options: List[QuizOptionClientResponse]

    model_config = ConfigDict(from_attributes=True)


class QuizQuestionDetailResponse(BaseModel):
    """Detailed question representation with answers and explanations."""
    id: int
    question_index: int
    question_type: str
    skill_type: str
    prompt: str
    prompt_vi: Optional[str] = None
    explanation: str
    explanation_vi: Optional[str] = None
    difficulty: str
    points: int
    source_scope: str
    source_sentence_id: Optional[str] = None
    hints: List[str] = Field(default_factory=list)
    options: List[QuizOptionDetailResponse]
    metadata_json: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Quizzes
# ---------------------------------------------------------------------------

class ReadingQuizResponse(BaseModel):
    """Quiz payload sent to client for test taking."""
    id: int
    content_id: int
    quiz_version: int
    difficulty: str
    question_count: int
    estimated_time_minutes: int
    status: str
    quality_score: float
    questions: List[QuizQuestionClientResponse]

    model_config = ConfigDict(from_attributes=True)


class ReadingQuizDetailResponse(BaseModel):
    """Full quiz data for review or admin inspection."""
    id: int
    content_id: int
    quiz_version: int
    generator_version: str
    prompt_version: str
    difficulty: str
    question_count: int
    estimated_time_minutes: int
    status: str
    quality_score: float
    blueprint_json: Dict[str, Any]
    created_at: datetime
    questions: List[QuizQuestionDetailResponse]

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Attempts & Answering
# ---------------------------------------------------------------------------

class StartQuizAttemptRequest(BaseModel):
    mode: str = "RELAXED"  # RELAXED, FOCUS, CHALLENGE


class QuizAttemptResponse(BaseModel):
    id: int
    quiz_id: int
    content_id: int
    user_id: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    score: int
    max_score: int
    correct_count: int
    question_count: int
    completion_status: str
    mode: str

    model_config = ConfigDict(from_attributes=True)


class AdaptiveNextResponse(BaseModel):
    attempt_id: int
    done: bool = False
    theta: float = 0.0
    se: float = 1.0
    answered_count: int = 0
    total_count: int = 0
    stop_reason: Optional[str] = None  # SE_THRESHOLD, ALL_ANSWERED, MAX_ITEMS
    question: Optional[QuizQuestionClientResponse] = None


class LearnerAbilityResponse(BaseModel):
    user_id: str
    theta: float = 0.0
    se: float = 1.0
    answers_count: int = 0
    skill_thetas: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


class SubmitAnswerRequest(BaseModel):
    question_id: int
    selected_option_id: Optional[int] = None
    selected_option_ids: List[int] = Field(default_factory=list)
    answer_text: Optional[str] = None
    confidence: Optional[str] = None  # HIGH, MEDIUM, LOW
    response_time_ms: Optional[int] = None
    hints_used: int = 0


class SubmitAnswerResponse(BaseModel):
    question_id: int
    is_correct: bool
    points_earned: int
    correct_option_id: Optional[int] = None
    explanation: str
    explanation_vi: Optional[str] = None
    source_sentence: Optional[str] = None
    source_sentence_id: Optional[str] = None
    misconception_type: Optional[str] = None
    misconception_feedback: Optional[str] = None


# ---------------------------------------------------------------------------
# Result & Analysis
# ---------------------------------------------------------------------------

class AnswerReviewItem(BaseModel):
    question_id: int
    question_index: int
    prompt: str
    prompt_vi: Optional[str] = None
    skill_type: str
    selected_option_id: Optional[int] = None
    correct_option_id: Optional[int] = None
    is_correct: bool
    points_earned: int
    confidence: Optional[str] = None
    response_time_ms: Optional[int] = None
    explanation: str
    explanation_vi: Optional[str] = None
    source_sentence: Optional[str] = None
    misconception_type: Optional[str] = None
    options: List[QuizOptionDetailResponse]


class VocabularyBridgeItem(BaseModel):
    surface_form: str
    reading: str
    meaning: str
    jlpt_level: Optional[str] = None
    priority_score: int
    reason: str


class GrammarBridgeItem(BaseModel):
    pattern: str
    meaning: str
    jlpt_level: Optional[str] = None
    reason: str


class CompleteQuizResponse(BaseModel):
    attempt_id: int
    quiz_id: int
    content_id: int
    score: int
    max_score: int
    score_percentage: float
    correct_count: int
    question_count: int
    completion_status: str
    total_time_seconds: Optional[int] = None
    skill_scores: Dict[str, float]
    confidence_pattern: Dict[str, int]
    misconceptions: List[Dict[str, Any]]
    ai_summary_feedback: str
    vocabulary_bridge: List[VocabularyBridgeItem]
    grammar_bridge: List[GrammarBridgeItem]
    next_recommendations: List[str]
    answers_review: List[AnswerReviewItem]


# ---------------------------------------------------------------------------
# Admin Dashboard
# ---------------------------------------------------------------------------

class QuizAdminStatsResponse(BaseModel):
    total_quizzes: int
    ready_quizzes: int
    draft_quizzes: int
    failed_quizzes: int
    avg_quality_score: float
    total_attempts: int
    completed_attempts: int
    avg_accuracy_percentage: float
    quizzes_list: List[Dict[str, Any]] = Field(default_factory=list)
    # Per-question IRT item analysis (p-value, discrimination, timing, flags).
    item_analysis: List[Dict[str, Any]] = Field(default_factory=list)
