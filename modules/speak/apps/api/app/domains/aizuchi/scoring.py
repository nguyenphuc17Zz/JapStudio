"""Aizuchi scoring policy — deterministic, server-owned.

4 dimensions (0-100 each + confidence + evidence), per-sub-mode weights.
Reaction mapping mirrors ReflexScoringPolicy; window replaces timer.
Variety caps repetition; appropriateness checks type fit + register fit.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class AizuchiSubMode(str, Enum):
    REACTION = "aizuchi_reaction"
    INTERRUPT = "warikomi_interrupt"


@dataclass
class DimensionScore:
    score: float  # 0-100
    confidence: float = 0.85  # 0-1
    evidence: list[str] = field(default_factory=list)


@dataclass
class AizuchiAssessment:
    timing: DimensionScore
    variety: DimensionScore
    appropriateness: DimensionScore
    manner: DimensionScore
    overall: DimensionScore
    timed_out: bool = False
    overlap_rude: bool = False
    reaction_latency_ms: float | None = None
    window_ms: int | None = None

    def to_dict(self) -> dict[str, Any]:
        def dim(d: DimensionScore) -> dict:
            return {"score": d.score, "confidence": d.confidence, "evidence": d.evidence}
        return {
            "timing": dim(self.timing),
            "variety": dim(self.variety),
            "appropriateness": dim(self.appropriateness),
            "manner": dim(self.manner),
            "overall": dim(self.overall),
            "timed_out": self.timed_out,
            "overlap_rude": self.overlap_rude,
            "reaction_latency_ms": self.reaction_latency_ms,
            "window_ms": self.window_ms,
        }


WEIGHTS: dict[str, dict[str, float]] = {
    AizuchiSubMode.REACTION.value: {
        "timing": 0.40,
        "variety": 0.30,
        "appropriateness": 0.25,
        "manner": 0.05,
    },
    AizuchiSubMode.INTERRUPT.value: {
        "timing": 0.35,
        "appropriateness": 0.30,
        "variety": 0.20,
        "manner": 0.15,
    },
}


def _timing_score(latency_ms: float | None, window_ms: int | None, confidence: float | None) -> DimensionScore:
    """Maps backchannel latency to score. Never fakes 0 on unreliable input."""
    if latency_ms is None or (confidence is not None and confidence < 0.4):
        return DimensionScore(score=50.0, confidence=0.3, evidence=["Latency unreliable (low VAD confidence)"])
    if window_ms is None or window_ms <= 0:
        return DimensionScore(score=75.0, confidence=0.6, evidence=[f"Latency {latency_ms:.0f}ms (no window)"])
    ratio = latency_ms / window_ms
    if ratio < 0.6:
        s = 95.0
    elif ratio < 0.9:
        s = 80.0
    elif ratio < 1.0:
        s = 60.0
    else:
        s = 25.0
    return DimensionScore(score=s, confidence=0.85, evidence=[f"Backchannel {latency_ms:.0f}ms / window {window_ms}ms (ratio {ratio:.2f})"])


def _variety_score(distinct_types: int, repeat_run: int, total: int) -> DimensionScore:
    """Rewards distinct backchannel types; caps うん-only runs."""
    if total <= 0:
        return DimensionScore(score=50.0, confidence=0.4, evidence=["No session history yet"])
    if repeat_run >= 5:
        return DimensionScore(score=35.0, confidence=0.9, evidence=[f"Same backchannel x{repeat_run} in a row — vary it"])
    if distinct_types >= 6:
        return DimensionScore(score=95.0, confidence=0.9, evidence=[f"{distinct_types} distinct types"])
    if distinct_types >= 4:
        return DimensionScore(score=82.0, confidence=0.85, evidence=[f"{distinct_types} distinct types"])
    if distinct_types >= 2:
        return DimensionScore(score=65.0, confidence=0.8, evidence=[f"{distinct_types} distinct types"])
    return DimensionScore(score=45.0, confidence=0.8, evidence=["Only 1 backchannel type — try へー/確かに/それで？"])


def _appropriateness_score(
    bc_type: str | None,
    expected_types: list[str] | None,
    relation: str | None,
    transcript: str,
) -> DimensionScore:
    """Checks type fit against expected types + register fit (casual vs business)."""
    if not transcript:
        return DimensionScore(score=0.0, confidence=1.0, evidence=["No speech detected"])
    if not bc_type or bc_type == "other":
        return DimensionScore(score=45.0, confidence=0.5, evidence=["Unrecognized backchannel — AI review pending"])
    score = 70.0
    evidence = [f"Type: {bc_type}"]
    if expected_types and bc_type in expected_types:
        score = 92.0
        evidence.append("Fits the moment")
    elif expected_types:
        score = 55.0
        evidence.append(f"Expected one of {expected_types}")
    else:
        score = 75.0
    # Register fit: はい-only with friends sounds distant; bare うん with clients sounds rude
    t = transcript
    if relation == "casual_friend" and t.strip() == "はい":
        score = min(score, 60.0)
        evidence.append("はい sounds distant with friends — try うん/へー/マジで")
    if relation == "business_polite" and t.strip() in ("うん", "うんうん", "マジで", "まじで"):
        score = min(score, 55.0)
        evidence.append("Too casual for business — try はい/なるほど/確かに")
    return DimensionScore(score=float(score), confidence=0.8, evidence=evidence)


def _manner_score(overlap_rude: bool, timed_out: bool) -> DimensionScore:
    if overlap_rude:
        return DimensionScore(score=20.0, confidence=0.9, evidence=["Talked over the NPC mid-word — wait for the breath pause"])
    if timed_out:
        return DimensionScore(score=30.0, confidence=0.9, evidence=["Missed the window — stay with the speaker"])
    return DimensionScore(score=90.0, confidence=0.8, evidence=["Clean entry"])


def _independence_mult(level: str | None) -> float:
    return {"independent": 1.0, "assisted_hint": 0.7, "retry_success": 0.55, "scaffolded": 0.4}.get(level or "independent", 0.7)


class AizuchiScoringPolicy:
    """Server-owned scoring policy."""

    @classmethod
    def build(
        cls,
        sub_mode: str,
        *,
        reaction_latency_ms: float | None,
        window_ms: int | None,
        speech_confidence: float | None,
        bc_type: str | None,
        expected_types: list[str] | None,
        relation: str | None,
        transcript: str,
        distinct_types: int = 1,
        repeat_run: int = 1,
        session_turns: int = 1,
        timed_out: bool = False,
        overlap_rude: bool = False,
        independence_level: str = "independent",
    ) -> AizuchiAssessment:
        timing = _timing_score(reaction_latency_ms, window_ms, speech_confidence)
        variety = _variety_score(distinct_types, repeat_run, session_turns)
        appropriateness = _appropriateness_score(bc_type, expected_types, relation, transcript)
        manner = _manner_score(overlap_rude, timed_out)

        weights = WEIGHTS.get(sub_mode, WEIGHTS[AizuchiSubMode.REACTION.value])
        overall_raw = (
            timing.score * weights.get("timing", 0.0)
            + variety.score * weights.get("variety", 0.0)
            + appropriateness.score * weights.get("appropriateness", 0.0)
            + manner.score * weights.get("manner", 0.0)
        )
        # Rude overlap caps overall; timeout damps it
        if overlap_rude:
            overall_raw = min(overall_raw, 45.0)
        if timed_out:
            overall_raw = min(overall_raw, 40.0)
        overall_raw *= _independence_mult(independence_level)
        # Perfect requires clean, fitting, varied, fast
        is_perfect = (
            not timed_out and not overlap_rude
            and timing.score >= 80 and appropriateness.score >= 80
            and independence_level == "independent"
        )
        _ = is_perfect
        overall = DimensionScore(score=round(max(0.0, min(100.0, overall_raw)), 1), confidence=0.85, evidence=["Weighted timing/variety/appropriateness/manner"])
        return AizuchiAssessment(
            timing=timing,
            variety=variety,
            appropriateness=appropriateness,
            manner=manner,
            overall=overall,
            timed_out=timed_out,
            overlap_rude=overlap_rude,
            reaction_latency_ms=reaction_latency_ms,
            window_ms=window_ms,
        )
