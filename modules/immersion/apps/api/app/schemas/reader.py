from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.enrichment import (
    ContentVocabularyResponse,
    ContentGrammarResponse,
    ContentExpressionResponse,
)


class ContentImageResponse(BaseModel):
    url: str
    caption: Optional[str] = None
    credit: Optional[str] = None
    position: int = 0


class FeedItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    content_id: int
    title: str
    excerpt: Optional[str] = None
    source_id: int
    source_name: str
    source_slug: str
    source_type: str
    content_type: str
    canonical_url: str
    image_url: Optional[str] = None
    images: List[ContentImageResponse] = Field(default_factory=list)
    images_count: int = 0
    published_at: Optional[datetime] = None

    reading_time_minutes: int = 1
    overall_difficulty: int = 5
    estimated_jlpt: str = "N3"
    quality_score: int = 80
    learning_readiness_score: int = 80

    primary_topic: str = "General"
    secondary_topics: List[str] = Field(default_factory=list)
    content_role: str = "FORMAL"

    is_saved: bool = False
    progress_percent: int = 0

    # Related-rail match explanation (only populated by get_related_contents).
    match_reasons: List[str] = Field(default_factory=list)
    match_score: float = 0.0


class FeedListResponse(BaseModel):
    items: List[FeedItemResponse]
    total: int
    page: int
    page_size: int
    has_next: bool


class AnnotatedSentenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sentence_index: int
    text: str
    start_offset: int
    end_offset: int
    has_high_learning_value: bool
    learning_value_reason: Optional[str] = None
    translation_vi: Optional[str] = None

    vocabularies: List[ContentVocabularyResponse] = Field(default_factory=list)
    grammars: List[ContentGrammarResponse] = Field(default_factory=list)
    expressions: List[ContentExpressionResponse] = Field(default_factory=list)

    furigana_html: Optional[str] = None
    furigana_tokens: List[Dict[str, Any]] = Field(default_factory=list)


class ReaderContentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    content_id: int
    title: str
    excerpt: Optional[str] = None
    content: Optional[str] = None
    author: Optional[str] = None

    source_id: int
    source_name: str
    source_type: str
    source_url: str
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    images: List[ContentImageResponse] = Field(default_factory=list)
    pages_fetched: int = 1
    published_at: Optional[datetime] = None

    reading_time_minutes: int = 1
    estimated_jlpt: str = "N3"
    overall_difficulty: int = 5
    difficulty_breakdown: Dict[str, int] = Field(default_factory=dict)
    difficulty_reasons: List[str] = Field(default_factory=list)

    summaries: Dict[str, Any] = Field(default_factory=dict)  # micro, short, detailed
    topics: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)

    sentences: List[AnnotatedSentenceResponse] = Field(default_factory=list)
    all_vocabularies: List[ContentVocabularyResponse] = Field(default_factory=list)
    all_grammars: List[ContentGrammarResponse] = Field(default_factory=list)
    all_expressions: List[ContentExpressionResponse] = Field(default_factory=list)

    is_saved: bool = False
    progress_percent: int = 0
    last_sentence_index: int = 1
    prev_content_id: Optional[int] = None
    next_content_id: Optional[int] = None


class TranslateRequest(BaseModel):
    sentence_index: Optional[int] = None
    target_language: str = "vi"
    model_provider: Optional[str] = None


class ExplainRequest(BaseModel):
    sentence_index: int = Field(..., ge=1)
    model_provider: Optional[str] = None


class TranslateResponse(BaseModel):
    content_id: int
    sentence_index: Optional[int] = None
    translated_text: str
    cached: bool = False


class SentenceExplanationResponse(BaseModel):
    content_id: int
    sentence_index: int
    literal_translation: str
    natural_meaning: str
    context_nuance: str
    key_grammar_notes: List[str] = Field(default_factory=list)
    cached: bool = False


class SelectionLookupRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=80)
    context: Optional[str] = Field(default=None, max_length=1000)
    content_id: Optional[int] = None
    model_provider: Optional[str] = None


class LookupExample(BaseModel):
    sentence_ja: str = ""
    sentence_vi: str = ""


class LookupAlternative(BaseModel):
    expression: str = ""
    reading: str = ""
    meaning_vi: str = ""
    difference: str = ""


class SelectionLookupResponse(BaseModel):
    query: str
    reading: str
    meaning_vi: str
    part_of_speech: str = "noun"
    jlpt_level: str = ""
    nuance: str = ""
    collocation: str = ""
    example_usage: str = ""
    examples: List[LookupExample] = Field(default_factory=list)
    alternatives: List[LookupAlternative] = Field(default_factory=list)
    model_provider: str = ""
    model_name: str = ""


class GrammarLookupRequest(BaseModel):
    pattern: str = Field(..., min_length=1, max_length=80)
    context: Optional[str] = Field(default=None, max_length=1000)
    content_id: Optional[int] = None
    model_provider: Optional[str] = None


class GrammarLookupResponse(BaseModel):
    pattern: str
    formation: str = ""
    meaning: str = ""
    usage_context: str = ""
    examples: List[LookupExample] = Field(default_factory=list)
    model_provider: str = ""
    model_name: str = ""


class ExpressionLookupRequest(BaseModel):
    expression: str = Field(..., min_length=1, max_length=80)
    context: Optional[str] = Field(default=None, max_length=1000)
    content_id: Optional[int] = None
    model_provider: Optional[str] = None


class ExpressionLookupResponse(BaseModel):
    expression: str
    meaning: str = ""
    usage_context: str = ""
    composition: str = ""
    examples: List[LookupExample] = Field(default_factory=list)
    alternatives: List[LookupAlternative] = Field(default_factory=list)
    model_provider: str = ""
    model_name: str = ""


class FuriganaBatchItem(BaseModel):
    key: str = Field(..., max_length=64)
    text: str = Field(..., max_length=2000)


class FuriganaBatchRequest(BaseModel):
    texts: List[FuriganaBatchItem] = Field(..., max_length=100)


class FuriganaTokenOut(BaseModel):
    text: str
    reading: Optional[str] = None
    is_kanji: bool = False


class FuriganaBatchResult(BaseModel):
    key: str
    tokens: List[FuriganaTokenOut] = Field(default_factory=list)


class FuriganaBatchResponse(BaseModel):
    items: List[FuriganaBatchResult] = Field(default_factory=list)


class ProgressUpdateRequest(BaseModel):
    progress_percent: int = Field(ge=0, le=100)
    last_sentence_index: int = Field(default=1, ge=1)
    time_spent_seconds: int = Field(default=0, ge=0)
    completed: bool = False


class ProgressUpdateResponse(BaseModel):
    success: bool
    progress_percent: int
    completed: bool


class ReadingHistoryItemResponse(BaseModel):
    content_id: int
    title: str
    source_name: str
    image_url: Optional[str] = None
    estimated_jlpt: str = "N3"
    reading_time_minutes: int = 1
    read_at: datetime
    progress_percent: int
    completed: bool


class ReadingHistoryGroupedResponse(BaseModel):
    today: List[ReadingHistoryItemResponse] = Field(default_factory=list)
    yesterday: List[ReadingHistoryItemResponse] = Field(default_factory=list)
    this_week: List[ReadingHistoryItemResponse] = Field(default_factory=list)
    older: List[ReadingHistoryItemResponse] = Field(default_factory=list)
