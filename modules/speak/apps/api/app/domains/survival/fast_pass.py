"""Fast-Pass Deterministic Evaluation Engine for Survival Speaking (<15ms).

Performs instant local validation:
- Taboo words violation detection (Morphological & Substring matching)
- Conversational repair strategy markers detection
- Semantic anchors & keyword coverage calculation
- Reaction latency (TTFW) classification
"""

from __future__ import annotations

import re
import unicodedata
from app.domains.survival.contracts import (
    CircumlocutionTask,
    RepairStrategy,
    SurvivalEvaluationResult,
    SurvivalScenarioTask,
)


def normalize_japanese_text(text: str) -> str:
    """Normalizes Japanese characters (NFKC, remove punctuation and spaces)."""
    normalized = unicodedata.normalize("NFKC", text.lower())
    # Remove Japanese punctuation, symbols, and spaces
    cleaned = re.sub(r"[、。！？・\s\.,!?\"'「」『』〜ー\-]", "", normalized)
    return cleaned


def check_taboo_violation(spoken_text: str, forbidden_words: list[str]) -> tuple[bool, list[str]]:
    """Checks whether the user's utterance contains any forbidden taboo lemmas."""
    norm_spoken = normalize_japanese_text(spoken_text)
    violated: list[str] = []

    for word in forbidden_words:
        norm_word = normalize_japanese_text(word)
        if not norm_word:
            continue
        if norm_word in norm_spoken:
            violated.append(word)

    return len(violated) > 0, violated


STRATEGY_PATTERNS: dict[RepairStrategy, list[str]] = {
    RepairStrategy.BUYING_TIME: [
        "そうですね", "ええと", "えーと", "少し考え", "まとめ", "お時間", "考えさせて", "私の考え",
        "非常に重要", "整理", "ちょっと待って", "何て言うか",
    ],
    RepairStrategy.ASKING_REPETITION: [
        "もう一度", "もう一回", "聞き取れ", "聞き取り", "お電話が遠い", "電波", "ゆっくり", "おっしゃって",
        "もういちど", "もういっかい", "聞こえな",
    ],
    RepairStrategy.ASKING_CLARIFICATION: [
        "どういう意味", "どういうこと", "ってこと", "具体的に", "確認", "合っていますか",
        "という意味", "わかんなかった",
    ],
    RepairStrategy.SELF_CORRECTION: [
        "あ違う", "あ違います", "あ間違え", "言い直す", "じゃなくて", "ではなくて", "正確に言うと",
    ],
    RepairStrategy.SIMPLIFICATION: [
        "要するに", "つまり", "端的に", "簡単に言うと", "一言で",
    ],
}


def detect_repair_strategy(spoken_text: str) -> RepairStrategy | None:
    """Identifies which conversational repair strategy was employed in the utterance."""
    norm_spoken = normalize_japanese_text(spoken_text)
    for strategy, markers in STRATEGY_PATTERNS.items():
        for marker in markers:
            norm_marker = normalize_japanese_text(marker)
            if norm_marker in norm_spoken:
                return strategy
    return None


def calculate_semantic_anchor_coverage(spoken_text: str, anchors: list[str]) -> tuple[int, list[str]]:
    """Calculates how many semantic key anchors are present in the explanation."""
    norm_spoken = normalize_japanese_text(spoken_text)
    hit_anchors: list[str] = []
    for anchor in anchors:
        norm_anchor = normalize_japanese_text(anchor)
        if norm_anchor and norm_anchor in norm_spoken:
            hit_anchors.append(anchor)
    return len(hit_anchors), hit_anchors


def evaluate_circumlocution_fast_pass(
    task: CircumlocutionTask,
    spoken_text: str,
    ttfw_ms: float | None = None,
    hint_tier_used: int = 0,
) -> SurvivalEvaluationResult | None:
    """Performs instant deterministic matching for Circumlocution.

    Returns None if text requires full AI listener inference.
    """
    if not spoken_text.strip():
        return SurvivalEvaluationResult(
            is_successful=False,
            overall_score=0,
            taboo_violated=False,
            violated_words=[],
            listener_guessed_correctly=False,
            listener_confidence=0.0,
            speed_rating="slow",
            ttfw_ms=ttfw_ms,
            ai_feedback_vi="Chưa phát hiện giọng nói hoặc âm thanh quá nhỏ. Vui lòng nói lại rõ ràng.",
            suggested_corrections=task.sample_explanations[:2],
            is_fast_pass=True,
            evaluation_source="fast_pass",
            xp_earned=0,
        )

    # 1. Check Taboo violation
    taboo_violated, violated_words = check_taboo_violation(spoken_text, task.forbidden_words)
    if taboo_violated:
        return SurvivalEvaluationResult(
            is_successful=False,
            overall_score=30,
            taboo_violated=True,
            violated_words=violated_words,
            listener_guessed_correctly=False,
            listener_confidence=0.0,
            speed_rating="normal" if not ttfw_ms or ttfw_ms < 3000 else "slow",
            ttfw_ms=ttfw_ms,
            ai_feedback_vi=f"⚠️ Vi phạm từ cấm! Bạn đã lỡ nói từ: {', '.join(violated_words)}. Hãy thử lại bằng cách miêu tả công dụng/chức năng mà không gọi tên trực tiếp.",
            suggested_corrections=task.sample_explanations[:2],
            is_fast_pass=True,
            evaluation_source="fast_pass",
            xp_earned=5,
        )

    # 2. Check semantic anchors
    hits_count, hit_anchors = calculate_semantic_anchor_coverage(spoken_text, task.semantic_anchors)

    # Speed rating
    speed = "instant" if ttfw_ms and ttfw_ms < 2000 else ("normal" if not ttfw_ms or ttfw_ms < 4500 else "slow")

    # If user hit >= 2 strong semantic anchors, deterministic guess is highly confident!
    if hits_count >= 2:
        penalty = hint_tier_used * 5
        base_score = 90 - penalty
        if speed == "instant":
            base_score += 5
        final_score = max(60, min(100, base_score))

        return SurvivalEvaluationResult(
            is_successful=True,
            overall_score=final_score,
            taboo_violated=False,
            violated_words=[],
            listener_guessed_correctly=True,
            listener_guessed_word=task.target_word,
            listener_confidence=0.92,
            speed_rating=speed,
            ttfw_ms=ttfw_ms,
            ai_feedback_vi=f"Xuất sắc! Người nghe đã đoán ngay ra 「{task.target_word}」 thông qua các đặc điểm: {', '.join(hit_anchors)}. Bạn đã giải thích rất gãy gọn!",
            suggested_corrections=[],
            is_fast_pass=True,
            evaluation_source="fast_pass",
            xp_earned=30,
        )

    return None  # Needs AI listener evaluation


def evaluate_scenario_fast_pass(
    task: SurvivalScenarioTask,
    spoken_text: str,
    ttfw_ms: float | None = None,
    hint_tier_used: int = 0,
) -> SurvivalEvaluationResult | None:
    """Performs instant deterministic matching for Survival Repair Scenarios."""
    if not spoken_text.strip():
        return SurvivalEvaluationResult(
            is_successful=False,
            overall_score=0,
            ai_feedback_vi="Chưa nhận diện được âm thanh phát ngôn.",
            is_fast_pass=True,
            evaluation_source="fast_pass",
            xp_earned=0,
        )

    detected_strat = detect_repair_strategy(spoken_text)
    speed = "instant" if ttfw_ms and ttfw_ms < 2000 else ("normal" if not ttfw_ms or ttfw_ms < 4500 else "slow")

    if detected_strat == task.recommended_strategy:
        penalty = hint_tier_used * 5
        score = 92 - penalty
        if speed == "instant":
            score += 5
        score = max(65, min(100, score))

        strat_names_vi = {
            RepairStrategy.BUYING_TIME: "Câu giờ lịch sự để suy nghĩ",
            RepairStrategy.ASKING_REPETITION: "Xin đối phương nhắc lại khéo léo",
            RepairStrategy.ASKING_CLARIFICATION: "Hỏi làm rõ ý tứ người đối diện",
            RepairStrategy.SELF_CORRECTION: "Tự đính chính tức thì khi nói nhầm",
            RepairStrategy.SIMPLIFICATION: "Đơn giản hóa ý tưởng gãy gọn",
        }

        return SurvivalEvaluationResult(
            is_successful=True,
            overall_score=score,
            strategy_identified=detected_strat,
            speed_rating=speed,
            ttfw_ms=ttfw_ms,
            ai_feedback_vi=f"Phản xạ tuyệt vời! Bạn đã áp dụng chính xác chiến lược '{strat_names_vi.get(detected_strat, detected_strat)}' giúp cuộc hội thoại không bị gián đoạn.",
            suggested_corrections=[],
            is_fast_pass=True,
            evaluation_source="fast_pass",
            xp_earned=35,
        )

    return None
