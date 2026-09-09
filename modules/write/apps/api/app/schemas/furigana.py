"""Pydantic schemas for Furigana and morphological analysis."""

from pydantic import BaseModel, Field


class FuriganaToken(BaseModel):
    surface: str = Field(..., description="Surface form of the morpheme")
    reading: str | None = Field(None, description="Hiragana reading for Kanji morpheme, or None if Kana/punct")
    is_kanji: bool = Field(False, description="Whether morpheme contains Kanji")
    pos: list[str] = Field(default_factory=list, description="Part of speech tags from dictionary")


class FuriganaConvertRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Japanese text to tokenize with Furigana")
    mode: str = Field(default="C", description="Sudachi split mode: 'A' (short), 'B' (middle), 'C' (compound)")


class FuriganaBatchRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1, max_length=50, description="List of Japanese texts to convert (max 50, each 500 chars)")
    mode: str = Field(default="C", description="Sudachi split mode")


class FuriganaConvertResponse(BaseModel):
    original_text: str
    annotated_text: str = Field(..., description="Text formatted with [Kanji|hiragana] brackets")
    ruby_html: str = Field(..., description="HTML markup with semantic <ruby> and <rt> tags")
    tokens: list[FuriganaToken]
