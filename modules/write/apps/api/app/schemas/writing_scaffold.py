"""Pydantic schemas for dynamic AI writing scaffolding (idea angles, golden phrases, outlines)."""

from typing import Literal
from pydantic import BaseModel, Field


class WritingScaffoldRequest(BaseModel):
    """Payload to request dynamic pedagogical scaffolding for a writing task."""

    prompt_vi: str = Field(min_length=1, max_length=2000, description="Writing prompt in Vietnamese")
    context_vi: str | None = Field(default=None, max_length=2000, description="Optional background context")
    jlpt_level: str | None = Field(default=None, description="Target JLPT level, e.g. N5..N1")
    register: str | None = Field(default=None, description="Target register, e.g. casual, polite, business, academic")
    genre: str | None = Field(default=None, description="Target genre, e.g. email, essay, report, dialogue")
    keywords: list[str] = Field(default_factory=list, description="Required or recommended keywords")
    provider: str | None = Field(default=None, description="Selected AI provider name")
    model: str | None = Field(default=None, description="Selected AI model name")


class IdeaAngleItem(BaseModel):
    """One pedagogical approach angle to solve the writing prompt."""

    title: str = Field(min_length=1, max_length=100, description="Short title of this perspective")
    description: str = Field(min_length=1, max_length=300, description="Pedagogical advice on how to develop this angle")
    starter: str = Field(min_length=1, max_length=200, description="Japanese starter sentence or opening phrase")


class GoldenPhraseItem(BaseModel):
    """High-scoring phrase, collocation, or discourse connector tailored to the prompt."""

    japanese: str = Field(min_length=1, max_length=200, description="Japanese phrase or pattern")
    reading: str | None = Field(default=None, max_length=200, description="Furigana / Kana reading")
    meaning: str = Field(min_length=1, max_length=300, description="Vietnamese meaning / usage nuance")
    type: Literal["connector", "vocabulary", "expression", "starter"] = Field(
        default="expression", description="Category of the phrase"
    )


class WritingScaffoldResponse(BaseModel):
    """Structured AI output with outline, angles, and high-impact phrases."""

    outline_steps: list[str] = Field(
        min_length=1, max_length=6, description="Logical 3-step or 4-step outline for the writing piece"
    )
    idea_angles: list[IdeaAngleItem] = Field(
        min_length=1, max_length=5, description="2-4 distinct angles to address the prompt"
    )
    golden_phrases: list[GoldenPhraseItem] = Field(
        min_length=1, max_length=10, description="4-8 curated phrases & connectors for the prompt"
    )
