"""Structured AI-pipeline contracts for Expression Intelligence (Phase 21)."""

from pydantic import BaseModel, Field


class CollocationIssue(BaseModel):
    expression: str = Field(description="The Japanese collocation expression found in or evaluated for the sentence")
    base_word: str = Field(description="Root word/verb/noun of the collocation (e.g. 決める, 連絡, 意見)")
    classification: str = Field(
        description="natural | acceptable | unnatural",
        pattern=r"^(natural|acceptable|unnatural)$",
    )
    native_alternative: str = Field(description="Preferred native collocation combination")
    explanation_vi: str = Field(description="Clear explanation in Vietnamese of why this combination works or feels unnatural")
    register: str = Field(default="polite", description="casual | polite | business | formal | highly_formal | mixed")


class OveruseDetection(BaseModel):
    expression: str = Field(description="The repetitive pattern (e.g. と思います, ので, だから, すごく, 〜ことです)")
    count: int = Field(description="Number of times used in context")
    is_legitimate: bool = Field(
        default=False,
        description="True if repetition is rhetorically or structurally justified in context",
    )
    explanation_vi: str = Field(description="Context-sensitive explanation in Vietnamese")
    suggested_alternatives: list[str] = Field(default_factory=list, description="Diverse natural alternatives")


class TransferDetection(BaseModel):
    expression: str = Field(description="Japanese phrase showing Vietnamese L1 transfer / translationese")
    classification: str = Field(
        description="grammatically_possible_but_unnatural | literal_translation | native_preferred_alternative",
        pattern=r"^(grammatically_possible_but_unnatural|literal_translation|native_preferred_alternative)$",
    )
    native_alternative: str = Field(description="Native Japanese preferred phrasing")
    explanation_vi: str = Field(description="Vietnamese explanation highlighting the L1 vs Japanese mindset distinction")


class CollocationAnalysisResult(BaseModel):
    collocations: list[CollocationIssue] = Field(default_factory=list)
    overuse: list[OveruseDetection] = Field(default_factory=list)
    transfers: list[TransferDetection] = Field(default_factory=list)
    overall_naturalness_score: int = Field(default=75, ge=0, le=100)
    summary_vi: str = Field(default="", description="High-level feedback summary in Vietnamese")


class ExpressionVariationItem(BaseModel):
    text: str = Field(description="Natural Japanese rewritten sentence")
    register: str = Field(description="casual | polite | formal | business | highly_formal")
    nuance_vi: str = Field(description="Vietnamese explanation of the nuance and style of this variant")
    key_phrase: str = Field(description="The core idiomatic Japanese expression used in this variation")


class ExpressionVariationResult(BaseModel):
    original: str = Field(description="Original Japanese text")
    variations: list[ExpressionVariationItem] = Field(default_factory=list, min_length=1, max_length=5)
    synthesis_prompt_vi: str = Field(description="Task prompt asking learner to write their own natural variation")


class RegisterTransformationResult(BaseModel):
    original: str = Field(description="Original Japanese text")
    source_register: str = Field(description="Original register level")
    target_register: str = Field(description="Target register level (casual, polite, formal, business, highly_formal)")
    transformed_text: str = Field(description="Rewritten sentence strictly in the target register")
    key_changes: list[str] = Field(default_factory=list, description="List of specific grammatical/honorific changes made")
    explanation_vi: str = Field(description="Linguistic rationale in Vietnamese explaining honorific choices")


class CollocationSuggestionItem(BaseModel):
    collocation: str = Field(description="Natural Japanese collocation with the base word, e.g. 予定を決める")
    meaning_vi: str = Field(description="Vietnamese meaning")
    example_sentence: str = Field(description="Natural example sentence demonstrating the collocation")
    register: str = Field(default="polite", description="casual | polite | business | formal")


class CollocationSuggestionsResult(BaseModel):
    base_word: str = Field(description="Base word queried")
    suggestions: list[CollocationSuggestionItem] = Field(default_factory=list)
    tip_vi: str = Field(default="", description="Pedagogical tip in Vietnamese for using this word in writing")
