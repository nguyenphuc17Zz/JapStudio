"""BuilderExerciseFactory — template pools first, AI dynamic generation second.

Mirrors AizuchiExerciseFactory: persistent shuffle queues guarantee 0%
repetition across consecutive requests; AI fills infinite variety.
"""

from __future__ import annotations

import random
from collections import deque
from typing import Any

from app.domains.builder.pools import get_seed_pool

_GLOBAL_RECENT: deque[str] = deque(maxlen=120)
_SHUFFLE_QUEUES: dict[str, list[dict[str, Any]]] = {}

TIMER_BY_SCAFFOLD = {
    "none": 20000,
    "keyword_hint": 25000,
    "sentence_starter": 20000,
    "structured_options": 15000,
}


def _get_next_seed(sub_mode: str, candidate_pool: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    global _SHUFFLE_QUEUES
    pool = candidate_pool or get_seed_pool(sub_mode)
    queue = _SHUFFLE_QUEUES.get(sub_mode, [])
    if candidate_pool and candidate_pool != get_seed_pool(sub_mode):
        unseen = [s for s in pool if str(s.get("source") or s.get("keywords")) not in _GLOBAL_RECENT]
        item = random.choice(unseen or pool)
        _GLOBAL_RECENT.append(str(item.get("source") or item.get("keywords")))
        return item
    if not queue:
        queue = random.sample(pool, len(pool))
    item = queue.pop(0)
    _SHUFFLE_QUEUES[sub_mode] = queue
    _GLOBAL_RECENT.append(str(item.get("source") or item.get("keywords")))
    return item


class BuilderExerciseFactory:
    """Builds sentence-builder exercises from pools (deterministic, zero LLM cost)."""

    def build(
        self,
        sub_mode: str = "sentence_assemble",
        focus_skill: str | None = None,
        relation: str = "casual_friend",
        scaffold: str = "keyword_hint",
        timer_limit_ms: int | None = None,
        difficulty: str = "normal",
    ) -> dict[str, Any]:
        seed = _get_next_seed(sub_mode)
        skill = focus_skill or seed.get("focus_skill", "te_chain")
        timer = timer_limit_ms or TIMER_BY_SCAFFOLD.get(scaffold, 20000)
        blind = scaffold == "none"

        if sub_mode == "sentence_expand":
            return {
                "title": "文拡大 — mở rộng câu",
                "objective": "Mở rộng câu cụt thành câu dài tự nhiên.",
                "scenario": seed["source"],
                "instructions": f"Câu gốc: 「{seed['source']}」. Hãy nói lại thành câu dài hơn, bắt buộc thêm: {seed.get('requirement', 'mệnh đề mới')}. Focus: {skill}.",
                "source_sentence": seed["source"],
                "expand_requirement": seed.get("requirement"),
                "situation_vi": seed.get("situation_vi"),
                "canonical": seed.get("canonical", ""),
                "canonical_vi": seed.get("canonical_vi", ""),
                "keywords": [], "starter": None,
                "focus_skill": skill, "relation": seed.get("relation", relation),
                "scaffold": scaffold, "blind": blind, "timer_limit_ms": timer,
                "connectors": list(seed.get("connectors", [])), "difficulty": difficulty,
            }
        if sub_mode == "sentence_repair":
            return {
                "title": "文修理 — sửa câu lủng củng",
                "objective": "Nói lại câu lủng củng thành bản tự nhiên như bản xứ.",
                "scenario": seed["source"],
                "instructions": f"Câu lủng củng: 「{seed['source']}」. Hãy nói lại tự nhiên ({seed.get('fix_hint', '')}). Focus: {skill}.",
                "source_sentence": seed["source"],
                "fix_hint": seed.get("fix_hint"),
                "situation_vi": seed.get("situation_vi"),
                "canonical": seed.get("canonical", ""),
                "canonical_vi": seed.get("canonical_vi", ""),
                "keywords": [], "starter": None,
                "focus_skill": skill, "relation": seed.get("relation", relation),
                "scaffold": scaffold, "blind": blind, "timer_limit_ms": timer,
                "connectors": list(seed.get("connectors", [])), "difficulty": difficulty,
            }
        # assemble (default)
        keywords = list(seed.get("keywords", []))
        starter = None if blind else seed.get("starter")
        if not blind and scaffold == "sentence_starter" and not starter and keywords:
            starter = f"{keywords[0]}…"
        instr = f"Từ khóa: {', '.join(keywords)}. Hãy nói 1 câu dài tự nhiên dùng hết từ khóa. Focus: {skill}."
        if starter:
            instr += f" Gợi ý mở đầu: 「{starter}」"
        else:
            instr += f" Tình huống: {seed.get('situation_vi', '')} (blind — tự chọn từ!)"
        return {
            "title": "文立て — nối từ thành câu",
            "objective": "Nối từ khóa rời thành 1 câu dài tự nhiên.",
            "scenario": " / ".join(keywords),
            "instructions": instr,
            "keywords": keywords, "starter": starter,
            "situation_vi": seed.get("situation_vi"),
            "canonical": seed.get("canonical", ""),
            "canonical_vi": seed.get("canonical_vi", ""),
            "source_sentence": None,
            "focus_skill": skill, "relation": seed.get("relation", relation),
            "scaffold": scaffold, "blind": blind, "timer_limit_ms": timer,
            "connectors": list(seed.get("connectors", [])), "difficulty": difficulty,
        }
