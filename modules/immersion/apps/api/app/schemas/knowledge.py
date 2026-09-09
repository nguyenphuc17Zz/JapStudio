from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# 1. Vocabulary Schemas
# ---------------------------------------------------------------------------

class UserVocabularyResponse(BaseModel):
    id: int
    user_id: str
    term: str
    normalized_form: str
    reading: str
    meaning: str
    part_of_speech: str
    status: str
    encounter_count: int
    successful_recognition_count: int
    failed_recognition_count: int
    confidence: str
    mastery_score: float
    recognition_score: float
    recall_score: float
    learning_value_score: int
    importance: int
    difficulty: int
    source_count: int
    content_count: int
    first_seen_at: datetime
    last_seen_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VocabularyDetailResponse(UserVocabularyResponse):
    collocations: List[str] = Field(default_factory=list)
    related_terms: List[str] = Field(default_factory=list)
    contexts: List[Dict[str, Any]] = Field(default_factory=list)
    sources_breakdown: Dict[str, int] = Field(default_factory=dict)
    review_state: Optional[Dict[str, Any]] = None
    # AI-enriched word detail (null/empty when never enriched or AI failed)
    nuance: Optional[str] = None
    jlpt_level: Optional[str] = None
    examples: List[Dict[str, Any]] = Field(default_factory=list)
    alternatives: List[Dict[str, Any]] = Field(default_factory=list)


class VocabularyListResponse(BaseModel):
    items: List[UserVocabularyResponse]
    total: int
    page: int
    limit: int


# ---------------------------------------------------------------------------
# 2. Expression & Grammar Schemas
# ---------------------------------------------------------------------------

class UserExpressionResponse(BaseModel):
    id: int
    user_id: str
    expression: str
    normalized_expression: str
    reading: Optional[str] = None
    meaning: str
    type: str
    status: str
    encounter_count: int
    mastery_score: float
    importance: int
    first_seen_at: datetime
    last_seen_at: datetime
    contexts: List[Dict[str, Any]] = Field(default_factory=list)
    # AI-enriched expression detail (null/empty when never enriched or AI failed).
    # `examples`/`alternatives` read from the corresponding *_json columns.
    usage_context: Optional[str] = None
    composition: Optional[str] = None
    examples: List[Dict[str, Any]] = Field(default_factory=list, validation_alias="examples_json")
    alternatives: List[Dict[str, Any]] = Field(default_factory=list, validation_alias="alternatives_json")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ExpressionListResponse(BaseModel):
    items: List[UserExpressionResponse]
    total: int
    page: int
    limit: int


class UserGrammarResponse(BaseModel):
    id: int
    user_id: str
    pattern: str
    meaning: str
    encounter_count: int
    correct_count: int
    incorrect_count: int
    mastery_score: float
    confidence: str
    first_seen_at: datetime
    last_seen_at: datetime
    contexts: List[Dict[str, Any]] = Field(default_factory=list)
    # AI-enriched grammar detail (null/empty when never enriched or AI failed).
    # `examples` reads from the `examples_json` column on the row.
    formation: Optional[str] = None
    usage_context: Optional[str] = None
    examples: List[Dict[str, Any]] = Field(default_factory=list, validation_alias="examples_json")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class GrammarListResponse(BaseModel):
    items: List[UserGrammarResponse]
    total: int
    page: int
    limit: int


# ---------------------------------------------------------------------------
# 3. Saved Sentences Schemas
# ---------------------------------------------------------------------------

class SaveSentenceRequest(BaseModel):
    content_id: Optional[int] = None
    sentence_id: Optional[str] = None
    sentence_text: str
    translation_text: Optional[str] = None
    reason: str = "MEMORABLE"
    notes: Optional[str] = None


class UserSavedSentenceResponse(BaseModel):
    id: int
    user_id: str
    content_id: Optional[int] = None
    content_title: Optional[str] = None
    sentence_id: Optional[str] = None
    sentence_text: str
    translation_text: Optional[str] = None
    reason: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SavedSentenceListResponse(BaseModel):
    items: List[UserSavedSentenceResponse]
    total: int
    page: int = 1
    limit: int = 20


# ---------------------------------------------------------------------------
# 4. Status Update Request
# ---------------------------------------------------------------------------

class UpdateStatusRequest(BaseModel):
    status: str  # NEW, SEEN, LEARNING, FAMILIAR, MASTERED, IGNORED


# ---------------------------------------------------------------------------
# 5. Learning Event Ingestion
# ---------------------------------------------------------------------------

class LearningEventRequest(BaseModel):
    event_type: str  # ENCOUNTERED, RECOGNIZED, FAILED_RECOGNITION, CONTEXT_GUESS_CORRECT, CONTEXT_GUESS_WRONG, QUIZ_CORRECT, QUIZ_WRONG, SAVED, IGNORED
    item_type: str = "VOCABULARY"  # VOCABULARY, EXPRESSION, GRAMMAR
    term: str
    normalized_form: Optional[str] = None
    reading: Optional[str] = None
    meaning: Optional[str] = None
    part_of_speech: Optional[str] = "noun"
    content_id: Optional[int] = None
    sentence_text: Optional[str] = None
    source_sentence_id: Optional[str] = None
    source_name: Optional[str] = None
    confidence: Optional[str] = None
    learning_priority: Optional[int] = None
    collocations: List[str] = Field(default_factory=list)
    # AI-enriched word detail supplied by the caller (e.g. lookup modal
    # already has it). When absent on WORD_SAVED, the backend enriches itself.
    nuance: Optional[str] = None
    collocation: Optional[str] = None
    jlpt_level: Optional[str] = None
    examples: List[Dict[str, Any]] = Field(default_factory=list)
    alternatives: List[Dict[str, Any]] = Field(default_factory=list)
    # AI-enriched grammar detail supplied by the caller (grammar lookup
    # modal). Same enrich-on-save behavior as vocabulary.
    formation: Optional[str] = None
    usage_context: Optional[str] = None
    # Expression kind from article enrichment (COLLOCATION, IDIOM, SLANG,
    # FORMAL_PATTERN). Used when collecting expressions into the library.
    expression_type: Optional[str] = None


class LearningEventResponse(BaseModel):
    success: bool
    item_id: int
    item_type: str
    new_encounter_count: int
    mastery_score: float
    review_scheduled: bool
    status: str
    ai_enriched: bool = False


# ---------------------------------------------------------------------------
# 6. Spaced Review Schemas
# ---------------------------------------------------------------------------

class ReviewOption(BaseModel):
    id: int
    text: str
    is_correct: bool


class ReviewCardResponse(BaseModel):
    item_id: int
    item_type: str  # VOCABULARY, EXPRESSION, GRAMMAR
    review_type: str  # CONTEXT_MEANING, RECALL, USAGE, FORMATION
    prompt: str
    context_sentence: Optional[str] = None
    clue: Optional[str] = None
    options: List[ReviewOption]
    correct_answer: str
    explanation: str
    stability: float
    difficulty: float
    reps: int
    # Real preview intervals (days) for Again/Hard/Good/Easy, computed for
    # this exact card so the UI never shows static placeholder numbers.
    interval_preview: Dict[str, int] = Field(default_factory=dict)


class ReviewSessionStartRequest(BaseModel):
    limit: int = 12
    item_type: Optional[str] = None  # ALL, VOCABULARY, EXPRESSION, GRAMMAR


class ReviewSessionResponse(BaseModel):
    session_id: int
    items_total: int
    cards: List[ReviewCardResponse]


class SubmitReviewAnswerRequest(BaseModel):
    item_id: int
    item_type: str
    rating: int  # 1: AGAIN, 2: HARD, 3: GOOD, 4: EASY
    answer_was_correct: bool = True


class SubmitReviewAnswerResponse(BaseModel):
    item_id: int
    item_type: str
    rating: int
    rating_label: str  # AGAIN, HARD, GOOD, EASY
    new_stability: float
    new_difficulty: float
    next_review_at: datetime
    scheduled_days: int
    new_mastery_score: float
    new_status: str
    leech_suspended: bool = False


class FinishReviewSessionRequest(BaseModel):
    items_completed: int = 0
    ratings: Dict[str, int] = Field(default_factory=dict)


class SuspendReviewItemRequest(BaseModel):
    item_type: str  # VOCABULARY, EXPRESSION, GRAMMAR
    item_id: int


class DueBreakdownResponse(BaseModel):
    total: int = 0
    vocabulary: int = 0
    expression: int = 0
    grammar: int = 0
    new: int = 0


# ---------------------------------------------------------------------------
# 7. Knowledge Stats & Gaps Schemas
# ---------------------------------------------------------------------------

class KnowledgeStatsResponse(BaseModel):
    total_vocabulary: int
    learning_vocabulary: int
    familiar_vocabulary: int
    mastered_vocabulary: int
    total_expressions: int
    total_grammar: int
    saved_sentences_count: int
    review_due_count: int
    avg_vocabulary_mastery: float
    recognition_vs_recall: Dict[str, float]
    recent_growth: Dict[str, int]


class KnowledgeGapItem(BaseModel):
    type: str  # RECALL_LAG, CONFUSED_PAIR, NEGATION_SENSITIVITY, REGISTER_GAP
    title: str
    description: str
    examples: List[str]
    suggested_action: str


class KnowledgeGapsResponse(BaseModel):
    gaps: List[KnowledgeGapItem]
    summary: str
