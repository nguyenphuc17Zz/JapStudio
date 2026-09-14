"""Interpret scoring policy — deterministic, server-owned.

4 dimensions (0-100 each + confidence + evidence), per-sub-mode weights.
Fidelity-first: missing core ideas caps hard. Vietglish patterns cap naturalness.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from app.domains.builder.pools import BUSINESS_MARKERS, CASUAL_MARKERS
from app.domains.interpret.pools import detect_vietglish, fidelity_of


class InterpretSubMode(str, Enum):
    WORD = "interpret_word"
    SENTENCE = "interpret_sentence"
    SITUATION = "interpret_situation"


@dataclass
class DimensionScore:
    score: float  # 0-100
    confidence: float = 0.85  # 0-1
    evidence: list[str] = field(default_factory=list)


@dataclass
class FidelityItem:
    idea_vi: str
    hit: bool = False
    evidence: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {"idea_vi": self.idea_vi, "hit": self.hit, "evidence": self.evidence}


@dataclass
class InterpretAssessment:
    fidelity: DimensionScore
    word_order: DimensionScore
    naturalness: DimensionScore
    fluency: DimensionScore
    overall: DimensionScore
    timed_out: bool = False
    reaction_latency_ms: float | None = None
    keywords_hit: list[str] = field(default_factory=list)
    vietglish_flags: list[str] = field(default_factory=list)
    fidelity_map: list[FidelityItem] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        def dim(d: DimensionScore) -> dict:
            return {"score": d.score, "confidence": d.confidence, "evidence": d.evidence}
        return {
            "fidelity": dim(self.fidelity),
            "word_order": dim(self.word_order),
            "naturalness": dim(self.naturalness),
            "fluency": dim(self.fluency),
            "overall": dim(self.overall),
            "timed_out": self.timed_out,
            "reaction_latency_ms": self.reaction_latency_ms,
            "keywords_hit": self.keywords_hit,
            "vietglish_flags": self.vietglish_flags,
            "fidelity_map": [f.to_dict() for f in self.fidelity_map],
        }


WEIGHTS: dict[str, dict[str, float]] = {
    InterpretSubMode.WORD.value: {"fidelity": 0.55, "word_order": 0.15, "naturalness": 0.20, "fluency": 0.10},
    InterpretSubMode.SENTENCE.value: {"fidelity": 0.40, "word_order": 0.25, "naturalness": 0.25, "fluency": 0.10},
    InterpretSubMode.SITUATION.value: {"fidelity": 0.35, "word_order": 0.20, "naturalness": 0.35, "fluency": 0.10},
}


def _fidelity_score(hit: list[str], missing: list[str]) -> DimensionScore:
    total = len(hit) + len(missing)
    if total == 0:
        return DimensionScore(70.0, 0.5, ["No key ideas to check"])
    ratio = len(hit) / total
    if ratio >= 1.0:
        return DimensionScore(95.0, 0.9, [f"All {total} ideas kept"])
    if ratio >= 0.75:
        return DimensionScore(80.0, 0.85, [f"Kept {len(hit)}/{total}, missing {missing}"])
    if ratio >= 0.5:
        return DimensionScore(58.0, 0.85, [f"Missing core ideas {missing}"])
    return DimensionScore(32.0, 0.9, [f"Lost most ideas {missing}"])


def _word_order_score(transcript: str, vietglish_flags: list[str]) -> DimensionScore:
    if not transcript:
        return DimensionScore(0.0, 1.0, ["No speech"])
    score = 82.0
    evidence: list[str] = ["SOV order checked"]
    if "svo_carryover" in vietglish_flags:
        score = min(score, 45.0)
        evidence.append("SVO carryover — を/に object must precede the verb")
    if "missing_particle" in vietglish_flags:
        score = min(score, 55.0)
        evidence.append("Missing particles は/が/を/に/で")
    if "watashi_overuse" in vietglish_flags:
        score = min(score, 65.0)
        evidence.append("私は overused — drop the subject")
    if not vietglish_flags and any(p in transcript for p in ("た", "てる", "ている")) and any(p in transcript for p in ("は", "が", "を", "に")):
        score = min(95.0, score + 5)
        evidence.append("Particles + verb forms look right")
    return DimensionScore(float(score), 0.8, evidence)


def _naturalness_score(transcript: str, relation: str | None, vietglish_flags: list[str]) -> DimensionScore:
    if not transcript:
        return DimensionScore(0.0, 1.0, ["No speech"])
    t = transcript
    casual_hits = [m for m in CASUAL_MARKERS if m in t]
    business_hits = [m for m in BUSINESS_MARKERS if m in t]
    score = 72.0
    evidence: list[str] = []
    if relation == "casual_friend":
        if casual_hits:
            score = 90.0
            evidence.append(f"Native casual: {casual_hits}")
        elif business_hits and not casual_hits:
            score = 58.0
            evidence.append("Textbook-polite with friends — use plain form + よ/ね")
    else:
        if business_hits:
            score = 90.0
            evidence.append(f"Polite consistent: {business_hits}")
        elif casual_hits:
            score = min(score, 58.0)
            evidence.append("Too casual for workplace — use です/ます")
    if "desu_overuse_casual" in vietglish_flags:
        score = min(score, 58.0)
        evidence.append("です/ます overuse with friends")
    if "literal_roi_ma_thi" in vietglish_flags:
        score = min(score, 50.0)
        evidence.append("Literal rồi/mà/thì — use て/ので/relative clause")
    return DimensionScore(float(score), 0.8, evidence or ["Register checked"])


def _fluency_score(latency_ms: float | None, timer_ms: int | None, conf: float | None, transcript: str) -> DimensionScore:
    if not transcript:
        return DimensionScore(0.0, 1.0, ["No speech"])
    if latency_ms is None or (conf is not None and conf < 0.4):
        return DimensionScore(60.0, 0.4, ["Latency unreliable"])
    if not timer_ms:
        return DimensionScore(75.0, 0.6, [f"Interpreted in {latency_ms:.0f}ms"])
    ratio = latency_ms / timer_ms
    if ratio < 0.5:
        return DimensionScore(92.0, 0.8, [f"Fast interpretation {latency_ms:.0f}ms"])
    if ratio < 0.8:
        return DimensionScore(78.0, 0.8, [f"Interpretation {latency_ms:.0f}ms"])
    if ratio < 1.0:
        return DimensionScore(60.0, 0.8, ["Slow but complete"])
    return DimensionScore(40.0, 0.85, ["Over time"])


def _independence_mult(level: str | None, blind: bool) -> float:
    m = {"independent": 1.0, "assisted_hint": 0.7, "retry_success": 0.55, "scaffolded": 0.4}.get(level or "independent", 0.7)
    if blind and (level or "independent") == "independent":
        m = 1.1
    return m


class InterpretScoringPolicy:
    """Server-owned scoring policy."""

    @classmethod
    def build(
        cls,
        sub_mode: str,
        *,
        transcript: str,
        expected_keywords: list[str] | None,
        relation: str | None,
        reaction_latency_ms: float | None,
        timer_limit_ms: int | None,
        speech_confidence: float | None,
        timed_out: bool = False,
        independence_level: str = "independent",
        blind: bool = False,
    ) -> InterpretAssessment:
        hit, missing, fmap = fidelity_of(transcript, expected_keywords or [])
        flags = detect_vietglish(transcript, relation)
        fidelity = _fidelity_score(hit, missing)
        word_order = _word_order_score(transcript, flags)
        naturalness = _naturalness_score(transcript, relation, flags)
        fluency = _fluency_score(reaction_latency_ms, timer_limit_ms, speech_confidence, transcript)

        weights = WEIGHTS.get(sub_mode, WEIGHTS[InterpretSubMode.SENTENCE.value])
        raw = (
            fidelity.score * weights.get("fidelity", 0.0)
            + word_order.score * weights.get("word_order", 0.0)
            + naturalness.score * weights.get("naturalness", 0.0)
            + fluency.score * weights.get("fluency", 0.0)
        )
        # Missing core ideas caps hard; Vietglish caps naturalness-driven overall
        if missing and len(hit) == 0 and (expected_keywords or []):
            raw = min(raw, 35.0)
        elif missing:
            raw = min(raw, 55.0)
        if "svo_carryover" in flags or "literal_roi_ma_thi" in flags:
            raw = min(raw, 55.0)
        if timed_out or not transcript.strip():
            raw = min(raw, 35.0)
        raw *= _independence_mult(independence_level, blind)
        overall = DimensionScore(score=round(max(0.0, min(100.0, raw)), 1), confidence=0.85, evidence=["Weighted fidelity/word_order/naturalness/fluency"])
        return InterpretAssessment(
            fidelity=fidelity, word_order=word_order, naturalness=naturalness,
            fluency=fluency, overall=overall, timed_out=timed_out,
            reaction_latency_ms=reaction_latency_ms,
            keywords_hit=hit, vietglish_flags=flags,
            fidelity_map=[FidelityItem(idea_vi=f["idea_vi"], hit=f["hit"], evidence=f["evidence"]) for f in fmap],
        )
