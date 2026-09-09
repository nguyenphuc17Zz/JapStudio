"""Writing Priority Engine (Phase 22).

Computes a deterministic composite priority score for each WritingWeakness
using 8 weighted signals.  The result is fully reproducible, never depends
on AI, and is covered by unit tests in test_adaptive_curriculum.py.

Signal weights (tuned for Japanese writing learners):
  severity              ×2.0  — critical errors cost most
  recurrence            ×1.5  — errors that repeat matter more
  non-mastery           ×2.5  — low mastery = urgent
  practical importance  ×1.5  — register & grammar affect real communication
  recent frequency      ×2.0  — errors that recur in the last 14 days
  transfer failure      ×1.5  — errors that do not generalise across contexts
  register impact       ×1.0  — extra weight when register-category weakness
  goal alignment        ×1.2  — matches the learner's declared goal type
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.models.writing_intelligence import WritingWeakness
from app.schemas.adaptive_curriculum import RankedWeakness

# ---- constants ---------------------------------------------------------------

SEVERITY_RANKS = {"info": 1, "minor": 2, "major": 3, "critical": 4}
MAX_SEVERITY_RANK = 4

# Practical importance by category (higher = more impactful in communication)
_CATEGORY_IMPORTANCE: dict[str, float] = {
    "register": 1.0,
    "grammar": 1.0,
    "naturalness": 0.75,
    "lexicon": 0.65,
    "discourse": 0.55,
}

# Goal type → categories that matter most for that goal
_GOAL_CATEGORY_ALIGNMENT: dict[str, set[str]] = {
    "business": {"register", "grammar", "discourse"},
    "jlpt": {"grammar", "lexicon", "naturalness"},
    "conversation": {"naturalness", "register", "grammar"},
    "academic": {"discourse", "grammar", "lexicon"},
    "general": {"grammar", "naturalness", "lexicon"},
}

_RECENT_DAYS = 14
_MAX_RECURRENCE = 20.0

# Signal weights (all positive)
_W_SEVERITY = 2.0
_W_RECURRENCE = 1.5
_W_NON_MASTERY = 2.5
_W_PRACTICAL = 1.5
_W_RECENT_FREQ = 2.0
_W_TRANSFER_FAIL = 1.5
_W_REGISTER_IMPACT = 1.0
_W_GOAL_ALIGN = 1.2

# Maximum raw sum (used for normalization to 0–100)
_MAX_RAW = (
    _W_SEVERITY * 1.0
    + _W_RECURRENCE * 1.0
    + _W_NON_MASTERY * 1.0
    + _W_PRACTICAL * 1.0
    + _W_RECENT_FREQ * 1.0
    + _W_TRANSFER_FAIL * 1.0
    + _W_REGISTER_IMPACT * 1.0
    + _W_GOAL_ALIGN * 1.0
)


# ---- engine ------------------------------------------------------------------


class WritingPriorityEngine:
    """Deterministic 8-signal priority scorer for writing weaknesses."""

    def __init__(self, goal_type: str | None = None) -> None:
        self._goal_type = goal_type or "general"

    # -- public API ------------------------------------------------------------

    def score(self, weakness: WritingWeakness) -> RankedWeakness:
        """Compute priority score and build a RankedWeakness."""
        signals = self._compute_signals(weakness)
        raw = sum(signals.values())
        normalized = round(min(max(raw / _MAX_RAW * 100, 0.0), 100.0), 2)
        reason = self._build_reason(weakness, signals)

        from app.services.context_rotation_engine import ContextRotationEngine

        next_ctx = ContextRotationEngine.current_context(weakness)

        return RankedWeakness(
            weakness_id=weakness.id,
            category=weakness.category,
            subtype=weakness.subtype,
            description=weakness.description,
            priority_score=normalized,
            priority_reason=reason,
            lifecycle_state=weakness.lifecycle_state or "new",
            next_context_type=next_ctx,
            severity=weakness.severity,
            recurrence_count=weakness.recurrence_count,
            mastery_score=weakness.mastery_score,
        )

    def rank(self, weaknesses: list[WritingWeakness]) -> list[RankedWeakness]:
        """Rank a list of weaknesses from highest to lowest priority."""
        scored = [self.score(w) for w in weaknesses]
        return sorted(scored, key=lambda r: r.priority_score, reverse=True)

    # -- signal computation ----------------------------------------------------

    def _compute_signals(self, weakness: WritingWeakness) -> dict[str, float]:
        now = datetime.now(timezone.utc)

        # 1. Severity (normalised to [0, 1])
        sev_rank = SEVERITY_RANKS.get(weakness.severity or "minor", 2)
        s_severity = _W_SEVERITY * (sev_rank / MAX_SEVERITY_RANK)

        # 2. Recurrence (normalised to [0, 1])
        recur = min(float(weakness.recurrence_count or 1), _MAX_RECURRENCE)
        s_recurrence = _W_RECURRENCE * (recur / _MAX_RECURRENCE)

        # 3. Non-mastery (inverse mastery_score, boosted if regressed)
        mastery = float(weakness.mastery_score or 0.0)
        is_regressed = weakness.lifecycle_state == "recurrent" or weakness.status == "regressed"
        if is_regressed:
            s_non_mastery = _W_NON_MASTERY * 1.0  # Max non-mastery signal for regressed skills
        else:
            s_non_mastery = _W_NON_MASTERY * (1.0 - min(mastery, 1.0))

        # 4. Practical importance by category
        importance = _CATEGORY_IMPORTANCE.get(weakness.category or "", 0.5)
        s_practical = _W_PRACTICAL * importance

        # 5. Recent frequency (occurrences in last _RECENT_DAYS days)
        refs = list(weakness.evidence_refs or [])
        recent_count = _count_recent_refs(refs, now, _RECENT_DAYS)
        # normalise: 5+ occurrences in 14 days = max signal
        s_recent = _W_RECENT_FREQ * min(recent_count / 5.0, 1.0)

        # 6. Transfer failure (inverse context generalization score)
        ctx_gen = float(weakness.context_generalization_score or 0.0)
        s_transfer = _W_TRANSFER_FAIL * (1.0 - min(ctx_gen, 1.0))

        # 7. Register impact (extra weight for register-category weaknesses)
        if weakness.category == "register":
            reg_div = float(weakness.register_diversity_score or 0.0)
            # Higher diversity = more contexts affected = higher impact
            s_register = _W_REGISTER_IMPACT * min(reg_div + 0.3, 1.0)
        else:
            s_register = 0.0

        # 8. Goal alignment
        aligned_cats = _GOAL_CATEGORY_ALIGNMENT.get(self._goal_type, set())
        s_goal = _W_GOAL_ALIGN * (1.0 if weakness.category in aligned_cats else 0.3)

        return {
            "severity": s_severity,
            "recurrence": s_recurrence,
            "non_mastery": s_non_mastery,
            "practical": s_practical,
            "recent_frequency": s_recent,
            "transfer_failure": s_transfer,
            "register_impact": s_register,
            "goal_alignment": s_goal,
        }

    def _build_reason(
        self, weakness: WritingWeakness, signals: dict[str, float]
    ) -> str:
        """Build a human-readable template reason string."""
        parts: list[str] = []

        if signals["non_mastery"] >= _W_NON_MASTERY * 0.7:
            pct = round((1.0 - weakness.mastery_score) * 100)
            parts.append(f"chưa thành thạo {pct}%")

        if signals["recurrence"] >= _W_RECURRENCE * 0.6:
            parts.append(f"tái diễn {weakness.recurrence_count} lần")

        if signals["recent_frequency"] >= _W_RECENT_FREQ * 0.6:
            refs = list(weakness.evidence_refs or [])
            now = datetime.now(timezone.utc)
            cnt = _count_recent_refs(refs, now, _RECENT_DAYS)
            parts.append(f"xuất hiện {cnt} lần trong {_RECENT_DAYS} ngày qua")

        if signals["transfer_failure"] >= _W_TRANSFER_FAIL * 0.7:
            parts.append("chưa vượt qua ở nhiều ngữ cảnh")

        if signals["severity"] >= _W_SEVERITY * 0.75:
            parts.append(f"mức độ {weakness.severity}")

        if not parts:
            parts.append("điểm yếu cần ưu tiên theo hồ sơ học tập")

        category_vi = {
            "grammar": "ngữ pháp",
            "register": "văn phong",
            "naturalness": "tự nhiên",
            "lexicon": "từ vựng",
            "discourse": "bố cục",
        }.get(weakness.category, weakness.category)

        return f"Lỗi {category_vi} ({weakness.subtype}): {', '.join(parts)}."


# ---- helpers -----------------------------------------------------------------


def _count_recent_refs(
    refs: list[dict[str, Any]], now: datetime, window_days: int
) -> int:
    """Count evidence_refs created within window_days of now."""
    count = 0
    for ref in refs:
        ts_raw = ref.get("created_at")
        if not ts_raw:
            continue
        try:
            ts = datetime.fromisoformat(str(ts_raw))
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            age_days = (now - ts).total_seconds() / 86400.0
            if age_days <= window_days:
                count += 1
        except (ValueError, TypeError):
            continue
    return count
