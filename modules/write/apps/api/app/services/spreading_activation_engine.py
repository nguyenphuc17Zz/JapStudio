"""ACT-R Cognitive Architecture Spreading Activation Engine (Algorithm 15).

Implements John R. Anderson's ACT-R memory retrieval equation:
    A_i = B_i + sum_{j in C} W_j * S_ji

Where:
  1. Base-Level Activation (B_i):
     Models the retention and accessibility of chunk 'i' governed by the
     Ebbinghaus Power Law of Practice and Forgetting:
       B_i = ln(n) - d * ln(Delta_t + 1.0)
     where:
       n = occurrence / practice count
       Delta_t = elapsed time (days) since last access
       d = 0.5 (canonical cognitive decay exponent)

  2. Associative Spreading Activation (sum_j W_j * S_ji):
     Current writing goals, prompt topics, and draft text act as attentional
     context sources (C). Activation spreads to long-term episodic memories
     via associative strength S_ji computed through character trigram
     cosine resonance.

  3. Total Activation to Retrieval Probability:
     P(retrieve | A_i) = 1 / (1 + exp(-(A_i - tau) / s))
"""

from __future__ import annotations

import math
from collections import Counter
from datetime import datetime, timezone
from typing import Any

_DEFAULT_DECAY = 0.5  # Canonical ACT-R decay parameter d
_TAU = 0.0            # Retrieval threshold
_SCALE = 1.0          # Logistic scaling factor s


class SpreadingActivationEngine:
    """Cognitive memory retrieval scorer based on ACT-R spreading activation."""

    def __init__(self, decay: float = _DEFAULT_DECAY) -> None:
        self._decay = decay

    def compute_base_level(
        self,
        occurrence_count: int,
        last_seen_at: datetime | None,
        now: datetime | None = None,
    ) -> float:
        """Calculates Base-Level Activation B_i = ln(n) - d * ln(Delta_t + 1.0)."""
        now = now or datetime.now(timezone.utc)
        n = max(1, occurrence_count)

        if last_seen_at is None:
            age_days = 0.0
        else:
            if last_seen_at.tzinfo is None:
                last_seen_at = last_seen_at.replace(tzinfo=timezone.utc)
            age_days = max(0.0, (now - last_seen_at).total_seconds() / 86400.0)

        # Base-level equation
        b_i = math.log(n) - self._decay * math.log(age_days + 1.0)
        return b_i

    def compute_associative_strength(self, context_text: str, memory_content: str) -> float:
        """Computes associative resonance S_ji via character trigram Cosine similarity."""
        if not context_text or not memory_content:
            return 0.0

        ctx_trigrams = self._get_trigrams(context_text)
        mem_trigrams = self._get_trigrams(memory_content)

        if not ctx_trigrams or not mem_trigrams:
            # Fallback to direct substring match if text too short for trigrams
            if any(word in memory_content for word in context_text.split() if len(word) >= 2):
                return 0.5
            return 0.0

        # Cosine similarity between trigram vectors
        dot_product = sum(
            count * mem_trigrams[tri]
            for tri, count in ctx_trigrams.items()
            if tri in mem_trigrams
        )
        norm_ctx = math.sqrt(sum(c ** 2 for c in ctx_trigrams.values()))
        norm_mem = math.sqrt(sum(c ** 2 for c in mem_trigrams.values()))

        if norm_ctx == 0.0 or norm_mem == 0.0:
            return 0.0

        return dot_product / (norm_ctx * norm_mem)

    def compute_activation(
        self,
        occurrence_count: int,
        last_seen_at: datetime | None,
        context_text: str,
        memory_content: str,
        importance_weight: float = 1.0,
        now: datetime | None = None,
    ) -> float:
        """Computes total cognitive activation A_i = B_i + W * S_ji."""
        base_level = self.compute_base_level(occurrence_count, last_seen_at, now=now)
        resonance = self.compute_associative_strength(context_text, memory_content)

        # Spreading activation component (W = 2.5 * importance)
        w = 2.5 * max(0.1, importance_weight)
        spreading = w * resonance

        total_activation = base_level + spreading
        return total_activation

    def retrieval_probability(self, total_activation: float) -> float:
        """Transforms continuous activation into logistic retrieval probability."""
        try:
            val = (total_activation - _TAU) / _SCALE
            return 1.0 / (1.0 + math.exp(-val))
        except OverflowError:
            return 1.0 if total_activation > 0 else 0.0

    @staticmethod
    def _get_trigrams(text: str) -> Counter[str]:
        clean = "".join(text.split()).lower()
        if len(clean) < 3:
            return Counter([clean]) if clean else Counter()
        return Counter(clean[i : i + 3] for i in range(len(clean) - 2))


spreading_activation_engine = SpreadingActivationEngine()
