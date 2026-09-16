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

        control_level = "controlled" if scaffold in ("structured_options", "sentence_starter") else ("semi_controlled" if scaffold == "keyword_hint" else "free")
        prompt_vi = seed.get("prompt_vi") or seed.get("situation_vi") or "Hãy xây một câu hoàn chỉnh tự nhiên"
        template = seed.get("template") or ""
        
        # Build suggested vocab
        raw_vocab = seed.get("suggested_vocabulary") or []
        suggested_vocab = []
        if raw_vocab:
            suggested_vocab = raw_vocab
        else:
            for kw in seed.get("keywords", []):
                suggested_vocab.append({"term": kw, "reading": "", "meaning_vi": ""})

        # Build connector items
        raw_conn = seed.get("connector_items") or []
        connector_items = []
        if raw_conn:
            connector_items = raw_conn
        else:
            for c in seed.get("connectors", []):
                connector_items.append({"term": c, "meaning_vi": "", "kind": "connector"})

        # Build progressive hints (4 tiers)
        raw_hints = seed.get("hints") or []
        hints = []
        if raw_hints:
            hints = raw_hints
        else:
            hints = [
                {"tier": 1, "title": "Hướng tư duy ngữ pháp", "content": f"Trọng tâm: {skill}. Chú ý cách chia thể động từ/tính từ phù hợp."},
                {"tier": 2, "title": "Gợi ý từ nối", "content": ", ".join(seed.get("connectors", [])) or "〜て, 〜から, 〜ので"},
                {"tier": 3, "title": "Khung sườn cấu trúc", "content": template or (seed.get("starter") or (seed.get("keywords", [""])[0] + "…"))},
                {"tier": 4, "title": "Câu mẫu hoàn chỉnh", "content": seed.get("canonical", "")},
            ]

        if sub_mode == "sentence_expand":
            return {
                "title": "文拡大 — Mở rộng câu",
                "objective": "Mở rộng câu cụt thành câu dài tự nhiên.",
                "scenario": seed["source"],
                "instructions": f"Câu gốc: 「{seed['source']}」. Hãy nói lại thành câu dài hơn, bắt buộc thêm: {seed.get('requirement', 'mệnh đề mới')}. Focus: {skill}.",
                "source_sentence": seed["source"],
                "expand_requirement": seed.get("requirement"),
                "prompt_vi": prompt_vi,
                "situation_vi": seed.get("situation_vi"),
                "template": template,
                "suggested_vocabulary": suggested_vocab,
                "connector_items": connector_items,
                "hints": hints,
                "control_level": control_level,
                "canonical": seed.get("canonical", ""),
                "canonical_vi": seed.get("canonical_vi", ""),
                "keywords": [], "starter": None,
                "focus_skill": skill, "relation": seed.get("relation", relation),
                "scaffold": scaffold, "blind": blind, "timer_limit_ms": timer,
                "connectors": list(seed.get("connectors", [])), "difficulty": difficulty,
            }
        if sub_mode == "sentence_repair":
            return {
                "title": "文修理 — Sửa câu lủng củng",
                "objective": "Nói lại câu lủng củng thành bản tự nhiên như bản xứ.",
                "scenario": seed["source"],
                "instructions": f"Câu lủng củng: 「{seed['source']}」. Hãy nói lại tự nhiên ({seed.get('fix_hint', '')}). Focus: {skill}.",
                "source_sentence": seed["source"],
                "fix_hint": seed.get("fix_hint"),
                "prompt_vi": prompt_vi,
                "situation_vi": seed.get("situation_vi"),
                "template": template,
                "suggested_vocabulary": suggested_vocab,
                "connector_items": connector_items,
                "hints": hints,
                "control_level": control_level,
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
            instr += f" Tình huống: {seed.get('situation_vi', '')} (tự chọn từ và liên từ!)"
        return {
            "title": "文立て — Lắp ghép xây câu",
            "objective": "Nối từ khóa rời thành 1 câu dài tự nhiên.",
            "scenario": " / ".join(keywords),
            "instructions": instr,
            "keywords": keywords, "starter": starter,
            "prompt_vi": prompt_vi,
            "situation_vi": seed.get("situation_vi"),
            "template": template,
            "suggested_vocabulary": suggested_vocab,
            "connector_items": connector_items,
            "hints": hints,
            "control_level": control_level,
            "canonical": seed.get("canonical", ""),
            "canonical_vi": seed.get("canonical_vi", ""),
            "source_sentence": None,
            "focus_skill": skill, "relation": seed.get("relation", relation),
            "scaffold": scaffold, "blind": blind, "timer_limit_ms": timer,
            "connectors": list(seed.get("connectors", [])), "difficulty": difficulty,
        }
