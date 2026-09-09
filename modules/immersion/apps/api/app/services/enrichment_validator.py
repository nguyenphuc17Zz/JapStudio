import re
from typing import Dict, Any, List, Optional, Tuple


class EnrichmentValidator:
    """Deterministic post-generation validator and anti-hallucination guardrail."""

    TRIVIAL_STOPWORDS = {
        "は", "が", "を", "に", "へ", "で", "と", "から", "より", "の", "も",
        "これ", "それ", "あれ", "どれ", "この", "その", "あの", "どの",
        "こと", "もの", "ため", "とき", "よう", "そう"
    }

    VALID_JLPT_LEVELS = {"N5", "N4", "N3", "N2", "N1", "N1+"}

    @classmethod
    def validate_and_refine(
        cls,
        raw_data: Dict[str, Any],
        source_text: str,
        segmented_sentences: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Validates AI output, filters hallucinations, clamps scores, and matches sentence anchors."""
        data = dict(raw_data)

        # 1. Validate Language Analysis
        lang_info = data.get("language_analysis", {})
        language = lang_info.get("language", "ja")
        conf = float(lang_info.get("language_confidence", 1.0))
        is_ja = bool(lang_info.get("is_japanese", True))
        mixed = bool(lang_info.get("mixed_language", False))

        # Check actual presence of Japanese kana/kanji
        has_kana_kanji = bool(re.search(r"[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]", source_text))
        if not has_kana_kanji:
            is_ja = False
            conf = 0.1

        data["language_analysis"] = {
            "language": language,
            "language_confidence": min(max(conf, 0.0), 1.0),
            "is_japanese": is_ja,
            "mixed_language": mixed
        }

        # 2. Validate Difficulty Scores (Clamp 1-10)
        diff_info = data.get("difficulty", {})
        data["difficulty"] = {
            "overall_difficulty": cls._clamp(diff_info.get("overall_difficulty", 5), 1, 10),
            "vocabulary_difficulty": cls._clamp(diff_info.get("vocabulary_difficulty", 5), 1, 10),
            "grammar_difficulty": cls._clamp(diff_info.get("grammar_difficulty", 5), 1, 10),
            "kanji_difficulty": cls._clamp(diff_info.get("kanji_difficulty", 5), 1, 10),
            "sentence_complexity": cls._clamp(diff_info.get("sentence_complexity", 5), 1, 10),
            "conceptual_difficulty": cls._clamp(diff_info.get("conceptual_difficulty", 5), 1, 10),
            "estimated_jlpt": diff_info.get("estimated_jlpt", "N3") if diff_info.get("estimated_jlpt") in cls.VALID_JLPT_LEVELS else "N3",
            "difficulty_reasons": [str(r) for r in diff_info.get("difficulty_reasons", []) if r]
        }

        # 3. Validate Register & Formality Scores (Clamp 0-100)
        reg_info = data.get("register", {})
        data["register"] = {
            "register": reg_info.get("register", "FORMAL"),
            "formality_score": cls._clamp(reg_info.get("formality_score", 70), 0, 100),
            "casualness_score": cls._clamp(reg_info.get("casualness_score", 30), 0, 100),
            "internet_slang_score": cls._clamp(reg_info.get("internet_slang_score", 0), 0, 100),
            "requires_cultural_context": bool(reg_info.get("requires_cultural_context", False)),
            "cultural_topics": [str(t) for t in reg_info.get("cultural_topics", []) if t]
        }

        # 4. Anti-Hallucination for Vocabulary
        valid_vocab = []
        seen_terms = set()
        for item in data.get("vocabulary", []):
            surface = item.get("surface_form", "").strip()
            if not surface:
                continue

            # Must appear in source text to prevent hallucination!
            if surface not in source_text:
                continue

            # Filter trivial stopwords
            if surface in cls.TRIVIAL_STOPWORDS:
                continue

            # Deduplicate by surface form
            if surface in seen_terms:
                continue
            seen_terms.add(surface)

            # Match source sentence index
            source_sent_str = item.get("source_sentence", "")
            matched_idx = cls._find_matching_sentence_index(source_sent_str or surface, segmented_sentences)

            valid_vocab.append({
                "surface_form": surface,
                "normalized_form": item.get("normalized_form", surface),
                "reading": item.get("reading", surface),
                "part_of_speech": item.get("part_of_speech", "noun"),
                "meaning_in_context": item.get("meaning_in_context", ""),
                "importance": cls._clamp(item.get("importance", 3), 1, 5),
                "learning_priority": cls._clamp(item.get("learning_priority", 50), 0, 100),
                "difficulty": cls._clamp(item.get("difficulty", 5), 1, 10),
                "source_sentence_index": matched_idx,
                "confidence": min(max(float(item.get("confidence", 1.0)), 0.0), 1.0)
            })
        data["vocabulary"] = valid_vocab

        # 5. Validate Expressions
        valid_expressions = []
        seen_expr = set()
        for item in data.get("expressions", []):
            expr = item.get("expression", "").strip()
            if not expr:
                continue

            expr_clean = expr.replace("〜", "")
            # Check presence if meaningful
            if expr_clean and (expr_clean in source_text or expr in source_text):
                if expr not in seen_expr:
                    seen_expr.add(expr)
                    matched_idx = cls._find_matching_sentence_index(item.get("source_sentence", "") or expr_clean, segmented_sentences)
                    valid_expressions.append({
                        "expression": expr,
                        "reading": item.get("reading"),
                        "meaning_in_context": item.get("meaning_in_context", ""),
                        "type": item.get("type", "COLLOCATION"),
                        "difficulty": cls._clamp(item.get("difficulty", 5), 1, 10),
                        "learning_priority": cls._clamp(item.get("learning_priority", 50), 0, 100),
                        "source_sentence_index": matched_idx,
                        "confidence": min(max(float(item.get("confidence", 1.0)), 0.0), 1.0)
                    })
        data["expressions"] = valid_expressions

        # 6. Validate Grammar Patterns
        valid_grammar = []
        seen_pat = set()
        for item in data.get("grammar", []):
            pat = item.get("pattern", "").strip()
            if not pat:
                continue
            if pat not in seen_pat:
                seen_pat.add(pat)
                pat_clean = pat.replace("〜", "")
                matched_idx = cls._find_matching_sentence_index(item.get("source_sentence", "") or pat_clean, segmented_sentences)
                valid_grammar.append({
                    "pattern": pat,
                    "meaning_in_context": item.get("meaning_in_context", ""),
                    "category": item.get("category", "INTERMEDIATE"),
                    "difficulty": cls._clamp(item.get("difficulty", 5), 1, 10),
                    "source_sentence_index": matched_idx,
                    "confidence": min(max(float(item.get("confidence", 1.0)), 0.0), 1.0)
                })
        data["grammar"] = valid_grammar

        # 7. Quality & Learning Readiness Calculation
        qual_info = data.get("quality", {})
        base_quality = cls._clamp(qual_info.get("quality_score", 80), 0, 100)

        # Penalize if extremely short (< 20 chars)
        if len(source_text) < 20:
            base_quality = min(base_quality, 40)

        is_learning_ready = (
            data["language_analysis"]["is_japanese"] and
            data["language_analysis"]["language_confidence"] >= 0.7 and
            base_quality >= 50 and
            len(source_text) >= 20
        )

        readiness_score = int((base_quality * 0.7) + (data["language_analysis"]["language_confidence"] * 30))
        readiness_score = cls._clamp(readiness_score, 0, 100)

        data["quality"] = {
            "quality_score": base_quality,
            "freshness_score": cls._clamp(qual_info.get("freshness_score", 100), 0, 100),
            "learning_readiness_score": readiness_score,
            "learning_ready": is_learning_ready
        }

        return data

    @classmethod
    def _clamp(cls, val: Any, min_val: int, max_val: int) -> int:
        try:
            int_val = int(val)
            return max(min(int_val, max_val), min_val)
        except (ValueError, TypeError):
            return min_val

    @classmethod
    def _find_matching_sentence_index(
        cls,
        target_text: str,
        segmented_sentences: List[Dict[str, Any]]
    ) -> Optional[int]:
        if not target_text or not segmented_sentences:
            return None

        # Try exact substring match first
        for sent in segmented_sentences:
            if target_text in sent["text"] or sent["text"] in target_text:
                return sent["sentence_index"]

        return None
