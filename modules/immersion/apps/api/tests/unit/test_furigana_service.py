import pytest
from app.services.furigana_service import (
    furigana_service,
    is_kanji,
    has_any_kanji,
    katakana_to_hiragana,
)


def test_kanji_helpers():
    assert is_kanji("日") is True
    assert is_kanji("本") is True
    assert is_kanji("あ") is False
    assert is_kanji("A") is False
    assert has_any_kanji("日本語") is True
    assert has_any_kanji("ひらがな") is False
    assert has_any_kanji("English") is False


def test_katakana_to_hiragana():
    assert katakana_to_hiragana("ニホンゴ") == "にほんご"
    assert katakana_to_hiragana("タベル") == "たべる"
    assert katakana_to_hiragana("テスト") == "てすと"
    assert katakana_to_hiragana("") == ""


def test_furigana_service_simple_kanji():
    ruby_html, tokens = furigana_service.generate_sentence_furigana("日本語")
    assert "<ruby>" in ruby_html
    assert "<rt>" in ruby_html
    assert any(t["is_kanji"] and t["reading"] for t in tokens)


def test_furigana_service_okurigana_separation():
    # 食べる should separate 食 (た) and べる
    ruby_html, tokens = furigana_service.generate_sentence_furigana("食べる")
    assert "<ruby>食<rt>た</rt></ruby>べる" == ruby_html
    assert tokens[0]["text"] == "食"
    assert tokens[0]["reading"] == "た"
    assert tokens[0]["is_kanji"] is True
    assert tokens[1]["text"] == "べる"
    assert tokens[1]["reading"] is None
    assert tokens[1]["is_kanji"] is False


def test_furigana_service_pure_kana_and_english():
    ruby_html, tokens = furigana_service.generate_sentence_furigana("とても NEC")
    assert "<ruby>" not in ruby_html
    assert all(t["is_kanji"] is False for t in tokens)
