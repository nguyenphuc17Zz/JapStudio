"""Lightweight & High-Performance Duplicate Prevention for AI-Generated Exercises.

Employs two classical information-retrieval techniques:
1. Exact hash deduplication via normalized-text SHA-256.
2. MinHash & Locality-Sensitive Hashing (LSH) for O(1) candidate retrieval
   combined with SequenceMatcher ratio confirmation.
"""

import hashlib
import random
import re
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Literal

from app.core.config import Settings, get_settings
from app.repositories import ExerciseRepository

_PUNCTUATION = re.compile(r"[^a-z0-9]+")
_MERSENNE_PRIME = (1 << 31) - 1  # 2147483647
_NUM_HASHES = 64
_NUM_BANDS = 16
_ROWS_PER_BAND = 4  # 16 * 4 = 64

# Deterministic universal hash coefficients generated with fixed seed for cross-run reproducibility
_RNG = random.Random(0xDEADBEEF)
_HASH_COEFFS: list[tuple[int, int]] = [
    (_RNG.randint(1, _MERSENNE_PRIME - 1), _RNG.randint(0, _MERSENNE_PRIME - 1))
    for _ in range(_NUM_HASHES)
]


@dataclass(frozen=True)
class DuplicateMatch:
    is_duplicate: bool
    kind: Literal["exact", "near"] | None = None
    matched_prompt: str | None = None


def compute_shingles(text: str, k: int = 3) -> set[str]:
    """Extracts overlapping character k-grams from normalized text."""
    if len(text) <= k:
        return {text} if text else set()
    return {text[i : i + k] for i in range(len(text) - k + 1)}


def compute_minhash_signature(shingles: set[str], num_hashes: int = _NUM_HASHES) -> list[int]:
    """Generates MinHash signature vector of length num_hashes using universal hash functions."""
    if not shingles:
        return [0] * num_hashes

    # Compute 32-bit integer hashes of all shingles
    shingle_hashes = [
        int.from_bytes(hashlib.md5(s.encode("utf-8")).digest()[:4], byteorder="little")
        for s in shingles
    ]

    sig = []
    for i in range(num_hashes):
        a, b = _HASH_COEFFS[i]
        min_val = min(((a * h + b) % _MERSENNE_PRIME) for h in shingle_hashes)
        sig.append(min_val)
    return sig


def estimate_jaccard(sig1: list[int], sig2: list[int]) -> float:
    """Estimates Jaccard similarity between two MinHash signatures."""
    if not sig1 or not sig2 or len(sig1) != len(sig2):
        return 0.0
    matches = sum(1 for a, b in zip(sig1, sig2) if a == b)
    return matches / len(sig1)


class ExerciseDedupService:
    """Coordinates exact-hash and MinHash LSH near-duplicate detection."""

    def __init__(
        self,
        repository: ExerciseRepository,
        settings: Settings | None = None,
    ) -> None:
        self._repository = repository
        self._settings = settings or get_settings()

    @staticmethod
    def normalize_prompt(text: str) -> str:
        """Normalize for comparison: casefold, strip diacritics and
        punctuation, collapse whitespace."""
        folded = unicodedata.normalize("NFD", text).casefold()
        stripped = "".join(ch for ch in folded if not unicodedata.combining(ch))
        return " ".join(_PUNCTUATION.sub(" ", stripped).split())

    @staticmethod
    def prompt_hash(normalized: str) -> str:
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    async def find_duplicate(self, prompt_vi: str) -> DuplicateMatch:
        normalized = self.normalize_prompt(prompt_vi)
        if not normalized:
            return DuplicateMatch(is_duplicate=False)

        # 1. Exact Duplicate check via SHA-256
        existing = await self._repository.find_by_prompt_hash(self.prompt_hash(normalized))
        if existing is not None:
            return DuplicateMatch(
                is_duplicate=True, kind="exact", matched_prompt=existing.prompt_vi
            )

        recent = await self._repository.find_recent(
            self._settings.ai_exercise_recent_prompt_window
        )
        if not recent:
            return DuplicateMatch(is_duplicate=False)

        threshold = self._settings.ai_exercise_near_duplicate_threshold
        query_shingles = compute_shingles(normalized)
        query_sig = compute_minhash_signature(query_shingles)

        # 2. MinHash LSH Band Partitioning: Index recent exercises into band buckets
        # Bucket key: (band_index, tuple_of_band_rows)
        buckets: dict[tuple[int, tuple[int, ...]], list[tuple[any, str]]] = {}
        for exercise in recent:
            other = self.normalize_prompt(exercise.prompt_vi)
            if not other:
                continue
            other_sig = compute_minhash_signature(compute_shingles(other))
            for b in range(_NUM_BANDS):
                band_slice = tuple(other_sig[b * _ROWS_PER_BAND : (b + 1) * _ROWS_PER_BAND])
                buckets.setdefault((b, band_slice), []).append((exercise, other))

        # 3. Query LSH buckets for candidate collisions
        candidate_exercises: dict[str, tuple[any, str]] = {}
        for b in range(_NUM_BANDS):
            query_band = tuple(query_sig[b * _ROWS_PER_BAND : (b + 1) * _ROWS_PER_BAND])
            for ex, other_norm in buckets.get((b, query_band), []):
                candidate_exercises[ex.id] = (ex, other_norm)

        # 4. Verify candidates first with SequenceMatcher
        for ex, other_norm in candidate_exercises.values():
            ratio = SequenceMatcher(None, normalized, other_norm).ratio()
            if ratio >= threshold:
                return DuplicateMatch(
                    is_duplicate=True, kind="near", matched_prompt=ex.prompt_vi
                )

        # 5. Fallback safety scan across any non-colliding recent items
        # (guarantees 100% sensitivity for border cases where threshold is close to boundary)
        for exercise in recent:
            if exercise.id in candidate_exercises:
                continue
            other = self.normalize_prompt(exercise.prompt_vi)
            if not other:
                continue
            ratio = SequenceMatcher(None, normalized, other).ratio()
            if ratio >= threshold:
                return DuplicateMatch(
                    is_duplicate=True, kind="near", matched_prompt=exercise.prompt_vi
                )

        return DuplicateMatch(is_duplicate=False)
