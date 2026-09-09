import pytest
from app.services.normalizer import NormalizationService


def test_clean_html_content_nhk_easy():
    raw_sample = (
        '<img src="https://nhkeasier.com/media/jpg/20260901de47592.jpg" alt="Story illustration">\n'
        '<p><ruby>福井県<rt>ふくいけん</rt></ruby>では8<ruby>月<rt>がつ</rt></ruby>30<ruby>日<rt>にち</rt></ruby>、'
        'とてもたくさんの<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>りました。<ruby>家<rt>いえ</rt></ruby>'
        'の<ruby>中<rt>なか</rt></ruby>にも<ruby>水<rt>みず</rt></ruby>が<ruby>入<rt>はい</rt></ruby>りました。</p>\n'
        '<audio src="https://nhkeasier.com/media/mp3/20260901de47592.mp3" controls preload="none"></audio>\n'
        '<ul><li><a href="https://www3.nhk.or.jp/news/easy/20260901de47592/20260901de47592.html">Original</a></li>'
        '<li><a href="https://nhkeasier.com/story/9921/" class="permalink">Permalink</a></li></ul>'
    )

    clean_text, cover_img, audio_url, images = NormalizationService.clean_html_content(raw_sample)

    # 1. Clean Japanese text without tags, rt readings, or audio tags
    assert "福井県では8月30日、とてもたくさんの雨が降りました。家の中にも水が入りました。" in clean_text
    assert "<" not in clean_text
    assert ">" not in clean_text
    assert "ふくいけん" not in clean_text  # rt furigana stripped so kanji remains clean
    assert "Original" not in clean_text
    assert "Permalink" not in clean_text

    # 2. Cover image extracted
    assert cover_img == "https://nhkeasier.com/media/jpg/20260901de47592.jpg"
    assert len(images) >= 1
    assert images[0]["url"] == "https://nhkeasier.com/media/jpg/20260901de47592.jpg"

    # 3. Audio extracted
    assert audio_url == "https://nhkeasier.com/media/mp3/20260901de47592.mp3"


def test_strip_html_to_plain():
    html_input = "<p>こんにちは！<br>元気ですか？&amp;楽しいです。</p>"
    plain = NormalizationService.strip_html_to_plain(html_input)
    assert plain == "こんにちは！\n元気ですか？&楽しいです。"


def test_has_html_tags():
    assert NormalizationService.has_html_tags("<p>Hello</p>") is True
    assert NormalizationService.has_html_tags("<img src='abc.jpg'>") is True
    assert NormalizationService.has_html_tags("福井県では8月30日、雨が降りました。") is False
