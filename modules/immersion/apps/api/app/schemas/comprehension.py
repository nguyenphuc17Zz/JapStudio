from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Interaction Telemetry Schemas
# ---------------------------------------------------------------------------

class InteractionLogRequest(BaseModel):
    content_id: int
    section_id: Optional[str] = None
    sentence_index: Optional[int] = None
    target_id: Optional[str] = None
    interaction_type: str  # CONTEXT_GUESS, COMPREHENSION_CHECK, MAIN_IDEA, AUTHOR_INTENTION, PREDICTION, SENTENCE_ANALYSIS, ASSISTANCE_REQUEST
    result: str  # CORRECT, INCORRECT, UNDERSTOOD, MOSTLY, NOT_UNDERSTOOD, SKIPPED, REVEALED
    confidence: Optional[str] = None  # HIGH, MEDIUM, LOW
    time_spent_ms: Optional[int] = None
    metadata_json: Dict[str, Any] = Field(default_factory=dict)


class InteractionLogResponse(BaseModel):
    id: int
    success: bool = True
    recorded_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Context Guessing Schemas (3-Stage Progressive Reveal)
# ---------------------------------------------------------------------------

class ContextGuessOption(BaseModel):
    id: int
    text: str
    is_correct: bool


class ContextGuessResponse(BaseModel):
    vocabulary_id: int
    surface_form: str
    reading: str
    sentence_text: str
    options: List[ContextGuessOption]
    clues: List[str] = Field(default_factory=list)
    clue_hint: str = ""
    full_meaning: str = ""
    why_this_word: str = ""
    micro_examples: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Checkpoint Schemas (Section comprehension checkpoints)
# ---------------------------------------------------------------------------

class CheckpointOption(BaseModel):
    id: int
    text: str
    is_correct: bool
    explanation: str = ""


class CheckpointResponse(BaseModel):
    id: int
    content_id: int
    section_index: int
    sentence_range_start: int
    sentence_range_end: int
    checkpoint_type: str  # MAIN_IDEA, AUTHOR_INTENTION, PREDICT_NEXT
    question_text: str
    options: List[CheckpointOption]
    explanation: str = ""
    completed: bool = False
    user_result: Optional[str] = None


class CheckpointSubmitRequest(BaseModel):
    selected_option_id: int
    confidence: Optional[str] = None
    time_spent_ms: Optional[int] = None


class CheckpointSubmitResponse(BaseModel):
    checkpoint_id: int
    is_correct: bool
    correct_option_id: int
    explanation: str
    feedback_message: str


# ---------------------------------------------------------------------------
# Sentence Decomposition Schemas
# ---------------------------------------------------------------------------

class SentenceComponentItem(BaseModel):
    text: str
    role: str  # Topic, Subject, Object, Modifier, Predicate, Particle
    role_vi: str  # Chủ đề, Chủ ngữ, Tân ngữ, Định ngữ, Vị ngữ, Trợ từ


class SentenceDecompositionResponse(BaseModel):
    sentence_index: int
    original_text: str
    components: List[SentenceComponentItem] = Field(default_factory=list)
    syntax_pattern: str = ""
    explanation: str = ""


# ---------------------------------------------------------------------------
# AI Reading Companion Schemas
# ---------------------------------------------------------------------------

class AICompanionQueryRequest(BaseModel):
    sentence_index: Optional[int] = None
    selected_word: Optional[str] = None
    question_type: str  # WHAT_MEANS, WHY_GRAMMAR, SIMPLIFY, EXPLAIN_NUANCE, WHY_FORMAL, KEY_POINT, CUSTOM
    custom_query: Optional[str] = None
    depth: str = "standard"  # quick, standard, deep
    language: str = "vi"  # vi, ja
    model_provider: Optional[str] = None


class AICompanionQueryResponse(BaseModel):
    content_id: int
    question_type: str
    answer_title: str
    answer_markdown: str
    key_takeaways: List[str] = Field(default_factory=list)
    cached: bool = False
    model_provider: Optional[str] = None
    model_name: Optional[str] = None


# ---------------------------------------------------------------------------
# Comprehension Signals & Session Summary Schemas
# ---------------------------------------------------------------------------

class ComprehensionSignalsResponse(BaseModel):
    content_id: int
    vocabulary_score: int = 80
    vocabulary_signal: str = "strong"  # strong, medium, needs_review
    grammar_score: int = 80
    grammar_signal: str = "strong"
    main_idea_score: int = 80
    main_idea_signal: str = "strong"
    inference_score: int = 80
    inference_signal: str = "strong"
    struggled_words: List[str] = Field(default_factory=list)
    struggled_sentences: List[int] = Field(default_factory=list)


class ReadingSessionSummaryResponse(BaseModel):
    content_id: int
    title: str
    time_spent_seconds: int = 0
    progress_percent: int = 0
    interactions_count: int = 0
    signals: ComprehensionSignalsResponse
    struggled_items: List[Dict[str, Any]] = Field(default_factory=list)


class ResumeCheckpointResponse(BaseModel):
    has_unclear_sentence: bool = False
    unclear_sentence_index: Optional[int] = None
    unclear_sentence_text: Optional[str] = None
    message: str = ""
