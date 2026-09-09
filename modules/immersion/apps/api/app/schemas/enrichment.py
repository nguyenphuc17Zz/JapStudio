from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class AIEnrichmentJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content_id: int
    content_title: Optional[str] = None
    source_name: Optional[str] = None

    job_type: str
    status: str
    attempt_count: int
    max_attempts: int

    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    model_provider: str
    model_name: str
    prompt_version: str

    input_tokens: int
    output_tokens: int
    estimated_cost: float
    latency_ms: int

    error_type: Optional[str] = None
    error_message: Optional[str] = None
    stage_status_json: Dict[str, Any] = Field(default_factory=dict)

    created_at: datetime
    updated_at: datetime


class AIEnrichmentJobListResponse(BaseModel):
    items: List[AIEnrichmentJobResponse]
    total: int
    page: int
    limit: int


class EnrichmentStatsResponse(BaseModel):
    queued: int
    processing: int
    success: int
    partial_success: int
    failed: int
    tokens_today: int
    estimated_cost_today_usd: float


class ContentSentenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content_id: int
    sentence_index: int
    text: str
    start_offset: int
    end_offset: int
    has_high_learning_value: bool
    learning_value_reason: Optional[str] = None


class ContentVocabularyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content_id: int
    surface_form: str
    normalized_form: str
    reading: str
    part_of_speech: str
    meaning_in_context: str
    importance: int
    learning_priority: int
    difficulty: int
    source_sentence_id: Optional[int] = None
    confidence: float


class ContentExpressionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content_id: int
    expression: str
    reading: Optional[str] = None
    meaning_in_context: str
    type: str
    difficulty: int
    learning_priority: int
    source_sentence_id: Optional[int] = None
    confidence: float


class ContentGrammarResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content_id: int
    pattern: str
    meaning_in_context: str
    category: str
    difficulty: int
    source_sentence_id: Optional[int] = None
    confidence: float


class ContentEnrichmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: int
    content_id: int

    # Language
    language: str
    language_confidence: float
    is_japanese: bool
    mixed_language: bool

    # Classification
    primary_type: str
    secondary_types: List[str]
    content_role: str

    # Topics & Entities
    primary_topic: str
    secondary_topics: List[str]
    topic_confidence: float
    keywords: List[str]
    entities: List[Dict[str, Any]]

    # Difficulty
    overall_difficulty: int
    vocabulary_difficulty: int
    grammar_difficulty: int
    kanji_difficulty: int
    sentence_complexity: int
    conceptual_difficulty: int
    estimated_jlpt: str
    difficulty_reasons: List[str]

    # Summaries
    micro_summary: str
    short_summary: str
    detailed_summary: List[str]

    # Register & Culture
    linguistic_register: str = Field(default="FORMAL", alias="register", serialization_alias="register")
    formality_score: int
    casualness_score: int
    internet_slang_score: int
    requires_cultural_context: bool
    cultural_topics: List[str]

    # Quality & Readiness
    quality_score: int
    freshness_score: int
    learning_readiness_score: int
    learning_ready: bool

    # Versioning
    enrichment_version: int
    prompt_version: str
    model_provider: str
    model_name: str

    created_at: datetime
    updated_at: datetime


class EnrichmentDetailResponse(BaseModel):
    content_id: int
    title: str
    canonical_url: str
    source_id: int
    source_name: str
    enrichment_status: str

    enrichment: Optional[ContentEnrichmentResponse] = None
    sentences: List[ContentSentenceResponse] = Field(default_factory=list)
    vocabularies: List[ContentVocabularyResponse] = Field(default_factory=list)
    expressions: List[ContentExpressionResponse] = Field(default_factory=list)
    grammars: List[ContentGrammarResponse] = Field(default_factory=list)
    latest_job: Optional[AIEnrichmentJobResponse] = None


class ReEnrichRequest(BaseModel):
    task: str = "ALL"  # ALL, SUMMARY, VOCABULARY, GRAMMAR, DIFFICULTY, QUALITY
    model_provider: Optional[str] = None
    model_name: Optional[str] = None
    force: bool = False


class ProviderMetaResponse(BaseModel):
    name: str
    display_name: str
    configured: bool
    default_model: str
    requires_key: bool
    has_key: bool = False
    masked_key: Optional[str] = None


class AIModelMetaResponse(BaseModel):
    id: str
    name: str
    provider: str
    description: Optional[str] = None
    context_window: Optional[int] = None
    is_active: bool = False


class TestProviderRequest(BaseModel):
    api_key: Optional[str] = None


class TestProviderResponse(BaseModel):
    success: bool
    message: str
    models: List[AIModelMetaResponse] = Field(default_factory=list)


class ConfigureProviderRequest(BaseModel):
    api_key: str


class SelectModelRequest(BaseModel):
    provider: str
    model_id: str


class SelectModelResponse(BaseModel):
    success: bool
    message: str
    provider: str
    model_id: str


