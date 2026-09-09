"""Unit and integration tests for Furigana & Sudachi tokenization API."""

import pytest
from app.services.furigana_service import furigana_service, katakana_to_hiragana


class TestFuriganaService:
    def test_katakana_to_hiragana(self) -> None:
        assert katakana_to_hiragana("カンジ") == "かんじ"
        assert katakana_to_hiragana("トウキョウ") == "とうきょう"
        assert katakana_to_hiragana("テスト") == "てすと"
        assert katakana_to_hiragana("日本語") == "日本語"

    def test_tokenize_and_convert_basic(self) -> None:
        result = furigana_service.tokenize_and_convert("日本語を勉強します")
        assert result.original_text == "日本語を勉強します"
        assert "[日本語|にほんご]" in result.annotated_text
        assert "<ruby>日本語<rp>(</rp><rt>にほんご</rt><rp>)</rp></ruby>" in result.ruby_html
        assert len(result.tokens) > 0

    def test_empty_string(self) -> None:
        result = furigana_service.tokenize_and_convert("")
        assert result.original_text == ""
        assert result.annotated_text == ""
        assert result.ruby_html == ""
        assert result.tokens == []


class TestFuriganaApi:
    async def test_convert_endpoint(self, client) -> None:
        response = await client.post(
            "/api/v1/furigana/convert",
            json={"text": "桜の花が咲きました"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["original_text"] == "桜の花が咲きました"
        assert "<ruby>" in data["ruby_html"]
        assert "<rt>" in data["ruby_html"]
        assert len(data["tokens"]) > 0

    async def test_batch_convert_endpoint(self, client) -> None:
        response = await client.post(
            "/api/v1/furigana/batch",
            json={"texts": ["今日", "明日", "明後日"]},
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        assert data[0]["original_text"] == "今日"
        assert data[1]["original_text"] == "明日"
        assert data[2]["original_text"] == "明後日"
