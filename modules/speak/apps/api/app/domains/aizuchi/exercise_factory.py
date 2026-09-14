"""AizuchiExerciseFactory — template pools first, AI dynamic generation second.

Mirrors ReflexExerciseFactory: persistent shuffle queues guarantee 0%
repetition across consecutive requests; AI fills infinite variety.
"""

from __future__ import annotations

import random
from collections import deque
from typing import Any

from app.domains.aizuchi.pools import get_pool
from app.domains.aizuchi.pressure_profiles import window_for_profile

_GLOBAL_RECENT_TURNS: deque[str] = deque(maxlen=120)
_SHUFFLE_QUEUES: dict[str, list[dict[str, Any]]] = {}


def _get_next_turn(relation: str, candidate_pool: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    global _SHUFFLE_QUEUES
    pool = candidate_pool or get_pool(relation)
    key = relation
    queue = _SHUFFLE_QUEUES.get(key, [])
    if candidate_pool and candidate_pool != get_pool(relation):
        unseen = [t for t in pool if t.get("text") not in _GLOBAL_RECENT_TURNS]
        item = random.choice(unseen or pool)
        _GLOBAL_RECENT_TURNS.append(item["text"])
        return item
    if not queue:
        queue = random.sample(pool, len(pool))
    item = queue.pop(0)
    _SHUFFLE_QUEUES[key] = queue
    _GLOBAL_RECENT_TURNS.append(item["text"])
    return item


class AizuchiExerciseFactory:
    """Builds single-window aizuchi exercises from pools (deterministic, zero LLM cost)."""

    def build_reaction(
        self,
        relation: str = "casual_friend",
        window_profile: str = "normal",
        window_ms: int | None = None,
        difficulty: str = "normal",
        num_turns: int = 3,
        speed: float = 1.0,
    ) -> dict[str, Any]:
        eff_window = window_ms if window_ms is not None else window_for_profile(window_profile)
        turns = []
        for _ in range(max(1, min(5, num_turns))):
            t = _get_next_turn(relation)
            turns.append({
                "text": t["text"],
                "text_vi": t.get("text_vi", ""),
                "pause_window_ms": eff_window,
                "expected_types": list(t.get("expected_types", ["continuer"])),
                "sample_responses": list(t.get("sample_responses", ["へー、そうなんだ", "うんうん"])),
            })
        title = "相づちリアクション" if relation == "casual_friend" else "相づち（ビジネス）"
        return {
            "title": f"{title} — {len(turns)} turns",
            "objective": "Chêm aizuchi đúng lúc, đúng loại trong khoảng lặng của NPC.",
            "scenario": turns[0]["text"],
            "instructions": "Nghe NPC nói. Khi đèn xanh bật (khoảng lặng), chêm ngay 1-2 từ phù hợp.",
            "npc_turns": turns,
            "expected_types": turns[0]["expected_types"],
            "sample_responses": turns[0]["sample_responses"],
            "window_ms": eff_window,
            "window_profile": window_profile,
            "relation": relation,
            "speed": speed,
            "difficulty": difficulty,
        }

    def build_interrupt(
        self,
        relation: str = "casual_friend",
        window_profile: str = "normal",
        window_ms: int | None = None,
        difficulty: str = "normal",
        speed: float = 1.0,
    ) -> dict[str, Any]:
        eff_window = window_ms if window_ms is not None else window_for_profile(window_profile)
        t1 = _get_next_turn(relation)
        t2 = _get_next_turn(relation)
        monologue = t1["text"] + "、" + t2["text"]
        monologue_vi = (t1.get("text_vi", "") + " " + t2.get("text_vi", "")).strip()
        if relation == "business_polite":
            expected = ["polite_interrupt", "continuer"]
            sample_interrupts = ["すみません、ちょっとよろしいでしょうか", "恐れ入ります、確認させてください"]
            instr = "NPC nói dài. Hãy chen vào lúc NPC lấy hơi: 「すみません、ちょっとよろしいでしょうか」rồi hỏi tiếp."
        else:
            expected = ["surprise", "followup", "continuer"]
            sample_interrupts = ["ちょっと待って！", "え、マジで！？", "で、どうなったの？"]
            instr = "NPC nói dài không ngừng. Hãy chen vào lúc lấy hơi: 「ちょっと待って！」「え、マジで？で、どうしたの？」"
        return {
            "title": "割り込み — chen ngang lịch sự",
            "objective": "Chen ngang đúng lúc pause, không đè giữa chữ.",
            "scenario": monologue,
            "instructions": instr,
            "npc_turns": [
                {
                    "text": monologue,
                    "text_vi": monologue_vi,
                    "pause_window_ms": eff_window,
                    "expected_types": expected,
                    "sample_responses": sample_interrupts,
                },
            ],
            "expected_types": expected,
            "sample_responses": sample_interrupts,
            "window_ms": eff_window,
            "window_profile": window_profile,
            "relation": relation,
            "speed": speed,
            "difficulty": difficulty,
        }
