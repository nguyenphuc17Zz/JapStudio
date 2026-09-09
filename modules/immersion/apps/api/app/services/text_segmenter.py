import re
from typing import List, Dict, Any

# Maximum characters for a single segment before force-splitting
_MAX_SEGMENT_LEN = 400


class TextSegmenter:
    """Accurate Japanese sentence segmentation with character offset calculation.

    Strategy:
    1. Normalize line endings to LF.
    2. Split on paragraph boundaries (blank lines / double newlines) first —
       this is the primary separator for web/RSS articles that have been
       HTML-stripped, where content arrives as continuous paragraphs.
    3. Within each paragraph, split on Japanese sentence-ending punctuation
       (。！？) or Western full-stop followed by whitespace.
    4. Hard-split any remaining chunk that exceeds MAX_SEGMENT_LEN to avoid
       rendering a single unreadably-long block in the Smart Reader.
    """

    # Japanese sentence endings (keep punctuation attached to preceding text)
    _JP_SENTENCE_RE = re.compile(r"([^。！？]+[。！？]+|[^。！？]+$)")
    # Western sentence: split on ". " or "? " or "! "
    _WESTERN_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")
    # Kanji codepoint range
    _KANJI_RE = re.compile(r"[\u4E00-\u9FAF]")
    # Kana
    _KANA_RE = re.compile(r"[\u3040-\u30FF]")

    @classmethod
    def segment(cls, text: str) -> List[Dict[str, Any]]:
        """Segments text into indexed sentences with best-effort character offsets."""
        if not text or not text.strip():
            return []

        # 0. Defensive HTML cleaning: strip any HTML markup before segmenting
        if "<" in text and ">" in text:
            from app.services.normalizer import NormalizationService
            if NormalizationService.has_html_tags(text):
                text = NormalizationService.strip_html_to_plain(text)

        # 1. Normalize line endings
        text = text.replace("\r\n", "\n").replace("\r", "\n")

        sentences: List[Dict[str, Any]] = []
        sentence_idx = 1

        # 2. Split into paragraphs on one-or-more blank lines
        paragraphs = re.split(r"\n{2,}", text)

        global_offset = 0  # Track approximate byte position across paragraphs

        for para in paragraphs:
            para = para.strip()
            if not para:
                global_offset += 2  # account for blank line separator
                continue

            # 3. Split paragraph into sentence-level chunks
            raw_chunks = cls._split_paragraph(para)

            for chunk in raw_chunks:
                chunk = chunk.strip()
                if not chunk:
                    continue

                # 4. Hard-split overlong chunks (>MAX_SEGMENT_LEN chars)
                sub_chunks = cls._hard_split(chunk)

                for sub in sub_chunks:
                    sub = sub.strip()
                    # Defensive: strip any stray tag or skip leftover tags
                    sub = re.sub(r"</?[a-zA-Z][^>]*>", "", sub).strip()
                    if not sub or sub in ("</p>", "<p>", "<ul>", "<li>", "</li>", "</ul>"):
                        continue

                    has_kanji = bool(cls._KANJI_RE.search(sub))
                    has_kana = bool(cls._KANA_RE.search(sub))
                    is_substantive = len(sub) >= 12 and (has_kanji or has_kana)

                    start_offset = text.find(sub, global_offset)
                    if start_offset == -1:
                        start_offset = global_offset
                    end_offset = start_offset + len(sub)

                    sentences.append({
                        "sentence_index": sentence_idx,
                        "text": sub,
                        "start_offset": start_offset,
                        "end_offset": end_offset,
                        "has_high_learning_value": is_substantive,
                        "learning_value_reason": (
                            "Contains rich grammatical structure and kanji vocabulary"
                            if is_substantive else None
                        ),
                    })
                    sentence_idx += 1

            global_offset += len(para) + 2  # +2 for paragraph separator

        return sentences

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @classmethod
    def _split_paragraph(cls, para: str) -> List[str]:
        """Split a single paragraph into sentence-sized chunks.

        Tries Japanese punctuation first; falls back to single-newline split
        for paragraphs without any 。！？ (e.g. English-heavy or title-only).
        """
        # Check if paragraph contains Japanese sentence endings
        if re.search(r"[。！？]", para):
            chunks = [m.group(0) for m in cls._JP_SENTENCE_RE.finditer(para)]
            return chunks if chunks else [para]

        # No JP punctuation — try splitting on single newlines
        lines = [ln.strip() for ln in para.split("\n") if ln.strip()]
        if len(lines) > 1:
            return lines

        # Single continuous block — return as-is (will be hard-split if needed)
        return [para]

    @classmethod
    def _hard_split(cls, text: str) -> List[str]:
        """Split text that exceeds _MAX_SEGMENT_LEN into ≤MAX_SEGMENT_LEN chunks.

        Prefers splitting on commas (、，,), spaces, or particle boundaries;
        falls back to hard character-count truncation.
        """
        if len(text) <= _MAX_SEGMENT_LEN:
            return [text]

        chunks: List[str] = []
        remaining = text

        while len(remaining) > _MAX_SEGMENT_LEN:
            # Try to find a natural break point within the first MAX chars
            window = remaining[:_MAX_SEGMENT_LEN]

            # Prefer Japanese comma 、 or full-width comma ，
            split_pos = max(window.rfind("、"), window.rfind("，"), window.rfind(","))

            if split_pos > _MAX_SEGMENT_LEN // 3:
                chunks.append(remaining[: split_pos + 1].strip())
                remaining = remaining[split_pos + 1 :].strip()
            else:
                # Hard truncate at MAX_SEGMENT_LEN
                chunks.append(remaining[:_MAX_SEGMENT_LEN].strip())
                remaining = remaining[_MAX_SEGMENT_LEN:].strip()

        if remaining:
            chunks.append(remaining)

        return chunks
