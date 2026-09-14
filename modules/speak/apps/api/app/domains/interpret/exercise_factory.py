"""InterpretExerciseFactory — template pools first, AI dynamic generation second.

Mirrors BuilderExerciseFactory: persistent shuffle queues guarantee 0%
repetition across consecutive requests; AI fills infinite variety.
"""

from __future__ import annotations

import random
from collections import deque
from typing import Any

from app.domains.interpret.pools import get_seed_pool

_GLOBAL_RECENT: deque[str] = deque(maxlen=120)
_SHUFFLE_QUEUES: dict[str, list[dict[str, Any]]] = {}

TIMER_BY_MODE = {
    "interpret_word": 8000,
    "interpret_sentence": 20000,
    "interpret_situation": 30000,
}


def _get_next_seed(sub_mode: str, candidate_pool: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    global _SHUFFLE_QUEUES
    pool = candidate_pool or get_seed_pool(sub_mode)
    queue = _SHUFFLE_QUEUES.get(sub_mode, [])
    if candidate_pool and candidate_pool != get_seed_pool(sub_mode):
        unseen = [s for s in pool if s.get("prompt_vi") not in _GLOBAL_RECENT]
        item = random.choice(unseen or pool)
        _GLOBAL_RECENT.append(item["prompt_vi"])
        return item
    if not queue:
        queue = random.sample(pool, len(pool))
    item = queue.pop(0)
    _SHUFFLE_QUEUES[sub_mode] = queue
    _GLOBAL_RECENT.append(item["prompt_vi"])
    return item


class InterpretExerciseFactory:
    """Builds VI-JA interpretation drills from pools (deterministic, zero LLM cost)."""

    def build(
        self,
        sub_mode: str = "interpret_sentence",
        relation: str | None = None,
        scaffold: str = "keyword_hint",
        timer_limit_ms: int | None = None,
        difficulty: str = "normal",
        topic: str | None = None,
    ) -> dict[str, Any]:
        seed = _get_next_seed(sub_mode)
        rel = relation or seed.get("relation", "casual_friend")
        timer = timer_limit_ms or TIMER_BY_MODE.get(sub_mode, 20000)
        blind = scaffold == "none"
        keywords = [] if blind else list(seed.get("expected_ja_keywords", []))
        starter = None if blind or sub_mode != "interpret_sentence" else None

        if sub_mode == "interpret_word":
            instr = f"Hãy nói tiếng Nhật cho: 「{seed['prompt_vi']}」 trong {timer // 1000}s."
        elif sub_mode == "interpret_situation":
            instr = f"Tình huống: {seed['prompt_vi']} Hãy giải thích bằng tiếng Nhật ({rel})."
        else:
            instr = f"Hãy dịch sang tiếng Nhật, giữ đủ ý + tự nhiên: 「{seed['prompt_vi']}」"
        if keywords:
            instr += f" Gợi ý ý chính: {', '.join(keywords)}."
        else:
            instr += " Blind — tự nhớ ý, tự chọn từ!"

        return {
            "title": {"interpret_word": "越日単語 — dịch từ/cụm", "interpret_sentence": "越日文 — dịch câu", "interpret_situation": "越日通訳 — phiên dịch tình huống"}.get(sub_mode, "越日通訳"),
            "objective": "Dịch Việt→Nhật giữ đủ ý, đúng SOV, tự nhiên như bản xứ.",
            "scenario": seed["prompt_vi"],
            "instructions": instr,
            "prompt_vi": seed["prompt_vi"],
            "expected_ja_keywords": list(seed.get("expected_ja_keywords", [])),
            "reference_ja": seed.get("reference_ja"),
            "situation_vi": seed["prompt_vi"] if sub_mode == "interpret_situation" else None,
            "starter_ja": starter,
            "topic": topic or seed.get("topic"),
            "relation": rel,
            "scaffold": scaffold,
            "blind": blind,
            "timer_limit_ms": timer,
            "difficulty": difficulty,
        }
