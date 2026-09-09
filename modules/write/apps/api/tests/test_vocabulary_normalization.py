"""Unit tests for deterministic vocabulary normalization (Phase 5)."""

from app.services.vocabulary_normalization import normalize_expression


class TestNormalizeExpression:
    def test_keeps_japanese_unchanged(self) -> None:
        assert normalize_expression("立て込む") == "立て込む"
        assert normalize_expression("日本語") == "日本語"

    def test_strips_whitespace_and_punctuation(self) -> None:
        assert normalize_expression(" 仕事が立て込んでいる。") == "仕事が立て込んでいる"
        assert normalize_expression("とても忙しい、") == "とても忙しい"

    def test_keeps_long_vowel_mark(self) -> None:
        assert normalize_expression("コーヒー") == "コーヒー"
        assert normalize_expression("コーヒー") != "コヒー"

    def test_keeps_hyphenated_compounds(self) -> None:
        assert normalize_expression("タクシーに乗る") == "タクシーに乗る"

    def test_normalizes_kana_variants(self) -> None:
        assert normalize_expression("ハンバーガー") == normalize_expression("ハンバーガー")

    def test_inflected_forms_differ(self) -> None:
        assert normalize_expression("立て込む") != normalize_expression("立て込んでいる")

    def test_strips_quotes_and_brackets(self) -> None:
        assert normalize_expression("「対応を検討する」") == "対応を検討する"

    def test_empty_input(self) -> None:
        assert normalize_expression("") == ""
        assert normalize_expression("   ") == ""
