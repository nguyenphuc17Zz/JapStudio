"""Deterministic Japanese sentence segmentation tests (discourse stage 0)."""

from app.services.discourse_segmentation import sentence_offsets, split_sentences


class TestSplitSentences:
    def test_empty_text(self) -> None:
        assert split_sentences("") == []
        assert split_sentences("   ") == []

    def test_single_sentence_without_punctuation(self) -> None:
        assert split_sentences("今日は仕事が多かった") == ["今日は仕事が多かった"]

    def test_splits_on_japanese_full_stop(self) -> None:
        text = "今日は忙しかった。だから帰りが遅くなった。"
        assert split_sentences(text) == ["今日は忙しかった。", "だから帰りが遅くなった。"]

    def test_splits_on_question_and_exclamation_marks(self) -> None:
        text = "元気ですか？とても元気だ！"
        assert split_sentences(text) == ["元気ですか？", "とても元気だ！"]

    def test_keeps_closing_quotes_with_their_sentence(self) -> None:
        text = "彼は「大丈夫」と言った。その後で笑った。"
        assert split_sentences(text) == ["彼は「大丈夫」と言った。", "その後で笑った。"]

    def test_quote_at_sentence_end_stays_with_previous(self) -> None:
        text = "彼は言った。「疲れた」"
        assert split_sentences(text) == ["彼は言った。「疲れた」"]

    def test_commas_and_continuations_never_split(self) -> None:
        text = "朝ごはんを食べて、会社に行った。帰りに、本を買った。"
        assert split_sentences(text) == ["朝ごはんを食べて、会社に行った。", "帰りに、本を買った。"]

    def test_newline_is_a_boundary(self) -> None:
        text = "一行目。\n二行目。"
        assert split_sentences(text) == ["一行目。", "二行目。"]

    def test_trailing_fragment_joins_previous_sentence(self) -> None:
        text = "とても疲れた。明日は休みたい"
        assert split_sentences(text) == ["とても疲れた。明日は休みたい"]

    def test_max_sentences_caps_output(self) -> None:
        text = "一。二。三。四。五。"
        assert len(split_sentences(text, max_sentences=3)) == 3
        assert split_sentences(text, max_sentences=3)[0] == "一。"

    def test_pda_nested_dialogue_with_periods_never_splits_enclosing_sentence(self) -> None:
        text = "田中さんは「明日は雨ですね。傘を持って行きます。」と言いました。その後で部屋を出た。"
        sentences = split_sentences(text)
        assert len(sentences) == 2
        assert sentences[0] == "田中さんは「明日は雨ですね。傘を持って行きます。」と言いました。"
        assert sentences[1] == "その後で部屋を出た。"

    def test_pda_parenthetical_internal_punctuation(self) -> None:
        text = "東京（日本の首都です。人口が多い！）に行きました。とても楽しかった。"
        sentences = split_sentences(text)
        assert len(sentences) == 2
        assert sentences[0] == "東京（日本の首都です。人口が多い！）に行きました。"
        assert sentences[1] == "とても楽しかった。"



class TestSentenceOffsets:
    def test_offsets_align_with_sentences(self) -> None:
        text = "今日は忙しかった。だから帰りが遅くなった。"
        sentences = split_sentences(text)
        offsets = sentence_offsets(text)
        assert offsets == [0, len(sentences[0])]
        assert text[offsets[0] :] == text

    def test_offsets_after_leading_whitespace(self) -> None:
        text = "  \n今日は忙しかった。だから帰りが遅くなった。"
        offsets = sentence_offsets(text)
        assert text[offsets[0]] == "今"
