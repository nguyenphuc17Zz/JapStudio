"""Japanese Text Complexity & Readability Engine (Algorithm 12).

Provides mathematically grounded, deterministic text complexity profiling
independent of cloud LLM calls, implementing:

1. Yule's Characteristic K (Information Theory & Quantitative Linguistics):
   Length-invariant measure of vocabulary richness based on the hypergeometric
   word frequency spectrum:
     K = 10^4 * (sum_{m=1}^inf m^2 * V(m, N) - N) / N^2
   where V(m, N) is the number of vocabulary tokens occurring exactly m times.

2. Simpson's Diversity Index (D):
   Probability that two randomly chosen tokens from the text belong to distinct
   types:
     D = 1 - sum(n_i * (n_i - 1)) / (N * (N - 1))

3. Orthographic Character Distribution:
   - Kanji Density (R_kanji)
   - Hiragana Density (R_hiragana)
   - Katakana / Gairaigo Density (R_katakana)

4. Japanese Readability Metric (Adapted Lee-Hasebe & Obi-2 Formula):
   Combines mean sentence length (L_bar) and Kanji density (R_kanji) to project
   estimated JLPT reading difficulty (N5 through N1).
"""

from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass
from typing import Any

# Regex for Japanese scripts
_KANJI_RE = re.compile(r"[\u4e00-\u9faf\u3400-\u4dbf]")
_HIRAGANA_RE = re.compile(r"[\u3040-\u309f]")
_KATAKANA_RE = re.compile(r"[\u30a0-\u30ff]")
_SENTENCE_SPLIT_RE = re.compile(r"[。！？!?\n]+")
_TOKEN_SPLIT_RE = re.compile(r"[\s、。,．・「」『』（）()【】…—―]+")


@dataclass(frozen=True)
class TextComplexityReport:
    """Comprehensive linguistic and statistical complexity report."""

    total_characters: int
    total_tokens: int
    unique_tokens: int
    sentence_count: int
    mean_sentence_length: float
    kanji_density: float
    hiragana_density: float
    katakana_density: float
    type_token_ratio: float
    yules_k: float
    simpsons_diversity: float
    readability_score: float
    estimated_jlpt: str
    complexity_level: str  # "elementary", "intermediate", "advanced"
    summary_vi: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "total_characters": self.total_characters,
            "total_tokens": self.total_tokens,
            "unique_tokens": self.unique_tokens,
            "sentence_count": self.sentence_count,
            "mean_sentence_length": round(self.mean_sentence_length, 2),
            "kanji_density": round(self.kanji_density, 4),
            "hiragana_density": round(self.hiragana_density, 4),
            "katakana_density": round(self.katakana_density, 4),
            "type_token_ratio": round(self.type_token_ratio, 4),
            "yules_k": round(self.yules_k, 2),
            "simpsons_diversity": round(self.simpsons_diversity, 4),
            "readability_score": round(self.readability_score, 2),
            "estimated_jlpt": self.estimated_jlpt,
            "complexity_level": self.complexity_level,
            "summary_vi": self.summary_vi,
        }


class TextComplexityEngine:
    """Pure deterministic statistical profiler for Japanese text."""

    @classmethod
    def analyze(cls, text: str) -> TextComplexityReport:
        clean_text = text.strip() if text else ""
        if not clean_text:
            return TextComplexityReport(
                total_characters=0,
                total_tokens=0,
                unique_tokens=0,
                sentence_count=0,
                mean_sentence_length=0.0,
                kanji_density=0.0,
                hiragana_density=0.0,
                katakana_density=0.0,
                type_token_ratio=1.0,
                yules_k=0.0,
                simpsons_diversity=1.0,
                readability_score=100.0,
                estimated_jlpt="N5",
                complexity_level="elementary",
                summary_vi="Chưa có văn bản để phân tích độ phức tạp.",
            )

        # 1. Character distributions
        total_chars = len(clean_text)
        kanji_count = len(_KANJI_RE.findall(clean_text))
        hiragana_count = len(_HIRAGANA_RE.findall(clean_text))
        katakana_count = len(_KATAKANA_RE.findall(clean_text))

        r_kanji = kanji_count / max(1, total_chars)
        r_hiragana = hiragana_count / max(1, total_chars)
        r_katakana = katakana_count / max(1, total_chars)

        # 2. Sentences
        sentences = [s.strip() for s in _SENTENCE_SPLIT_RE.split(clean_text) if s.strip()]
        sentence_count = max(1, len(sentences))
        mean_sentence_length = total_chars / sentence_count

        # 3. Tokenization & Word frequency spectrum
        tokens = cls._tokenize_japanese(clean_text)
        total_tokens = len(tokens)
        freqs = Counter(tokens)
        unique_tokens = len(freqs)
        ttr = unique_tokens / max(1, total_tokens)

        # 4. Yule's Characteristic K
        # Spectrum V(m, N): number of words occurring exactly m times
        spectrum: Counter[int] = Counter(freqs.values())
        s2 = sum((m ** 2) * count for m, count in spectrum.items())
        if total_tokens > 1:
            yules_k = 10000.0 * (s2 - total_tokens) / (total_tokens ** 2)
            yules_k = max(0.0, yules_k)
        else:
            yules_k = 0.0

        # 5. Simpson's Diversity Index D
        if total_tokens > 1:
            sum_n_pairs = sum(n * (n - 1) for n in freqs.values())
            simpsons_diversity = 1.0 - (sum_n_pairs / (total_tokens * (total_tokens - 1)))
            simpsons_diversity = max(0.0, min(1.0, simpsons_diversity))
        else:
            simpsons_diversity = 1.0

        # 6. Lee-Hasebe & Obi-2 Readability Metric
        # Formula calibrated for Japanese writing:
        # Lower score = higher density of kanji and longer sentences = harder to read.
        raw_score = 100.0 - (0.15 * mean_sentence_length) - (1.4 * (r_kanji * 100.0))
        readability_score = max(0.0, min(100.0, raw_score))

        # Project JLPT difficulty based on readability and kanji density
        if readability_score >= 75.0 and r_kanji < 0.18:
            estimated_jlpt = "N5"
            complexity_level = "elementary"
        elif readability_score >= 60.0 and r_kanji < 0.28:
            estimated_jlpt = "N4"
            complexity_level = "elementary"
        elif readability_score >= 45.0 and r_kanji < 0.38:
            estimated_jlpt = "N3"
            complexity_level = "intermediate"
        elif readability_score >= 30.0:
            estimated_jlpt = "N2"
            complexity_level = "advanced"
        else:
            estimated_jlpt = "N1"
            complexity_level = "advanced"

        # Summary
        summary_vi = (
            f"Độ phức tạp {complexity_level.upper()} (tương đương JLPT {estimated_jlpt}). "
            f"Mật độ Kanji: {r_kanji * 100:.1f}%, độ dài câu TB: {mean_sentence_length:.1f} ký tự, "
            f"Đa dạng từ vựng Yule's K: {yules_k:.1f} (Simpson D: {simpsons_diversity:.2f})."
        )

        return TextComplexityReport(
            total_characters=total_chars,
            total_tokens=total_tokens,
            unique_tokens=unique_tokens,
            sentence_count=sentence_count,
            mean_sentence_length=mean_sentence_length,
            kanji_density=r_kanji,
            hiragana_density=r_hiragana,
            katakana_density=r_katakana,
            type_token_ratio=ttr,
            yules_k=yules_k,
            simpsons_diversity=simpsons_diversity,
            readability_score=readability_score,
            estimated_jlpt=estimated_jlpt,
            complexity_level=complexity_level,
            summary_vi=summary_vi,
        )

    @classmethod
    def _tokenize_japanese(cls, text: str) -> list[str]:
        """Segments Japanese text into lexical tokens using script transition boundaries."""
        raw_chunks = _TOKEN_SPLIT_RE.split(text)
        tokens: list[str] = []

        for chunk in raw_chunks:
            if not chunk:
                continue

            # Segment by character script transitions (Kanji run, Katakana run, Hiragana run)
            current_token = []
            last_script = None

            for char in chunk:
                if _KANJI_RE.match(char):
                    script = "K"
                elif _KATAKANA_RE.match(char):
                    script = "C"
                elif _HIRAGANA_RE.match(char):
                    script = "H"
                else:
                    script = "O"

                # Treat Kanji + immediately following Hiragana okurigana as 1 token (e.g. 食べる)
                if last_script == "K" and script == "H":
                    current_token.append(char)
                elif last_script is not None and script != last_script and not (last_script == "K" and script == "H"):
                    if current_token:
                        tokens.append("".join(current_token))
                    current_token = [char]
                else:
                    current_token.append(char)

                last_script = script

            if current_token:
                tokens.append("".join(current_token))

        return [t for t in tokens if t]
