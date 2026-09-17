"""Builder scoring policy — deterministic, server-owned.

4 dimensions (0-100 each + confidence + evidence), per-sub-mode weights.
One focus skill per turn. Clause spans feed the frontend clause map.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from app.domains.builder.pools import BUSINESS_MARKERS, CASUAL_MARKERS, SKILL_MARKERS, coverage_of


class BuilderSubMode(str, Enum):
    ASSEMBLE = "sentence_assemble"
    EXPAND = "sentence_expand"
    REPAIR = "sentence_repair"


@dataclass
class DimensionScore:
    score: float  # 0-100
    confidence: float = 0.85  # 0-1
    evidence: list[str] = field(default_factory=list)


@dataclass
class ClauseSpan:
    text: str
    kind: str  # keyword | connector | nominalizer | ending | other
    ok: bool = True

    def to_dict(self) -> dict[str, Any]:
        return {"text": self.text, "kind": self.kind, "ok": self.ok}


@dataclass
class BuilderAssessment:
    coverage: DimensionScore
    connection: DimensionScore
    naturalness: DimensionScore
    fluency: DimensionScore
    overall: DimensionScore
    timed_out: bool = False
    reaction_latency_ms: float | None = None
    keywords_used: list[str] = field(default_factory=list)
    clauses: list[ClauseSpan] = field(default_factory=list)
    better_version: str = ""
    better_version_vi: str = ""
    errors: list[dict[str, Any]] = field(default_factory=list)
    praise_points: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        def dim(d: DimensionScore) -> dict:
            return {"score": d.score, "confidence": d.confidence, "evidence": d.evidence}
        return {
            "coverage": dim(self.coverage),
            "connection": dim(self.connection),
            "naturalness": dim(self.naturalness),
            "fluency": dim(self.fluency),
            "overall": dim(self.overall),
            "timed_out": self.timed_out,
            "reaction_latency_ms": self.reaction_latency_ms,
            "keywords_used": self.keywords_used,
            "clauses": [c.to_dict() for c in self.clauses],
            "better_version": self.better_version,
            "better_version_vi": self.better_version_vi,
            "errors": self.errors,
            "praise_points": self.praise_points,
            "meaning_score": round(self.coverage.score, 1),
            "grammar_score": round(self.connection.score, 1),
            "naturalness_score": round(self.naturalness.score, 1),
            "fluency_score": round(self.fluency.score, 1),
            "overall_score": round(self.overall.score, 1),
        }


WEIGHTS: dict[str, dict[str, float]] = {
    BuilderSubMode.ASSEMBLE.value: {"coverage": 0.35, "connection": 0.30, "naturalness": 0.25, "fluency": 0.10},
    BuilderSubMode.EXPAND.value: {"coverage": 0.20, "connection": 0.35, "naturalness": 0.30, "fluency": 0.15},
    BuilderSubMode.REPAIR.value: {"coverage": 0.25, "connection": 0.25, "naturalness": 0.40, "fluency": 0.10},
}

_CONNECTOR_RE = re.compile(r"(ちゃって|っちゃって|まして|なくて|なくては|なければ|なきゃ|くて|いて|んで|ている|ていた|てる|てた|ちゃう|ちゃった|じゃう|じゃった|てしまう|てしまった|はず|わけ|ため|のです|んです|なら|たら|れば|ても|でも|ので|のに|ながら|たり|し、|し |て|で|と|ば|し|の|こと)")
_RELATIVE_RE = re.compile(r"(た|だ|る|う|く|き|ない|てる|ている|てた|られる|れる)(本|映画|店|人|話|こと|もの|やつ|服|料理|場所|理由|写真|手紙|部屋)")


def split_clauses(transcript: str, keywords: list[str]) -> list[ClauseSpan]:
    """Splits transcript into spans for the UI clause map. Heuristic, display-only."""
    spans: list[ClauseSpan] = []
    if not transcript:
        return spans
    parts = _CONNECTOR_RE.split(transcript)
    buf = ""
    for p in parts:
        if not p:
            continue
        if _CONNECTOR_RE.fullmatch(p):
            if buf:
                spans.append(ClauseSpan(text=buf, kind="keyword" if any(k and k in buf for k in (keywords or [])) else "other", ok=True))
                buf = ""
            spans.append(ClauseSpan(text=p, kind="connector", ok=True))
        else:
            buf += p
    if buf:
        kind = "keyword" if any(k and k in buf for k in (keywords or [])) else "other"
        if re.search(r"(よ|ね|かな|じゃん|っけ|もん|な|ぞ|ぜ|です|ます)$", buf.strip()):
            kind = "ending"
        spans.append(ClauseSpan(text=buf, kind=kind, ok=True))
    return spans


def _coverage_score(sub_mode: str, used: list[str], missing: list[str], transcript: str) -> DimensionScore:
    total = len(used) + len(missing)
    if sub_mode == BuilderSubMode.EXPAND.value:
        # Expand: source idea preserved + at least one added clause
        if not transcript:
            return DimensionScore(0.0, 1.0, ["No speech"])
        added = bool(_CONNECTOR_RE.search(transcript)) or len(transcript) >= 12
        if added:
            return DimensionScore(90.0, 0.8, ["Added clause to seed sentence"])
        return DimensionScore(45.0, 0.8, ["Seed repeated without expansion"])
    if sub_mode == BuilderSubMode.REPAIR.value:
        if not transcript:
            return DimensionScore(0.0, 1.0, ["No speech"])
        return DimensionScore(80.0, 0.6, ["Repair attempted — naturalness decides"])
    if total == 0:
        return DimensionScore(70.0, 0.5, ["No keywords required"])
    ratio = len(used) / total
    if ratio >= 1.0:
        return DimensionScore(95.0, 0.9, [f"All {total} keywords used"])
    if ratio >= 0.75:
        return DimensionScore(80.0, 0.85, [f"Used {len(used)}/{total}, missing {missing}"])
    if ratio >= 0.5:
        return DimensionScore(60.0, 0.85, [f"Missing {missing}"])
    return DimensionScore(35.0, 0.9, [f"Missing {missing}"])


def _connection_score(focus_skill: str | None, transcript: str, expected: list[str] | None) -> DimensionScore:
    if not transcript:
        return DimensionScore(0.0, 1.0, ["No speech"])
    t = transcript
    hits = [m for m in (SKILL_MARKERS.get(focus_skill or "", []) or []) if m and m in t]
    generic = bool(_CONNECTOR_RE.search(t))
    if focus_skill == "relative_clause":
        if _RELATIVE_RE.search(t):
            return DimensionScore(92.0, 0.85, ["Relative clause detected (verb-plain + noun)"])
        if generic:
            return DimensionScore(60.0, 0.7, ["Has connectors but no clear relative clause"])
        return DimensionScore(40.0, 0.8, ["No relative clause — try 昨日買った本 pattern"])
    if hits:
        return DimensionScore(90.0, 0.85, [f"Focus markers used: {hits}"])
    if generic:
        return DimensionScore(62.0, 0.75, [f"Connected, but focus skill '{focus_skill}' markers missing (expected one of {expected or (SKILL_MARKERS.get(focus_skill or '') or [])})"])
    if len(t) >= 15:
        return DimensionScore(55.0, 0.7, ["Long sentence but no chaining markers — try て/ので/たら"])
    return DimensionScore(38.0, 0.8, ["Single short clause — add て/ので/relative clause"])


def _naturalness_score(transcript: str, relation: str | None) -> DimensionScore:
    if not transcript:
        return DimensionScore(0.0, 1.0, ["No speech"])
    t = transcript
    casual_hits = [m for m in CASUAL_MARKERS if m in t]
    business_hits = [m for m in BUSINESS_MARKERS if m in t]
    score = 70.0
    evidence: list[str] = []
    if relation == "casual_friend":
        if casual_hits:
            score = 90.0
            evidence.append(f"Native casual: {casual_hits}")
        elif business_hits and not casual_hits:
            score = 55.0
            evidence.append("Textbook-polite with friends — try てる/じゃん/よ")
        else:
            evidence.append("Neutral — add contraction or sentence-end (よ/じゃん)")
    else:
        if business_hits:
            score = 90.0
            evidence.append(f"Polite consistent: {business_hits}")
        elif casual_hits:
            score = min(score, 55.0)
            evidence.append("Too casual for business — use です/ます")
        else:
            evidence.append("Add です/ます for business polish")
    if re.search(r"私は.*(です|ます)\.", t) or t.count("私") >= 2:
        score = min(score, 60.0)
        evidence.append("Drop 私は + 。 — spoken Japanese omits subjects")
    return DimensionScore(float(score), 0.8, evidence or ["Checked register fit"])


def _fluency_score(latency_ms: float | None, timer_ms: int | None, conf: float | None, transcript: str) -> DimensionScore:
    if not transcript:
        return DimensionScore(0.0, 1.0, ["No speech"])
    if latency_ms is None or (conf is not None and conf < 0.4):
        return DimensionScore(60.0, 0.4, ["Latency unreliable"])
    if not timer_ms:
        return DimensionScore(75.0, 0.6, [f"Built in {latency_ms:.0f}ms"])
    ratio = latency_ms / timer_ms
    if ratio < 0.5:
        return DimensionScore(92.0, 0.8, [f"Fast build {latency_ms:.0f}ms"])
    if ratio < 0.8:
        return DimensionScore(78.0, 0.8, [f"Build {latency_ms:.0f}ms"])
    if ratio < 1.0:
        return DimensionScore(60.0, 0.8, ["Slow but complete"])
    return DimensionScore(40.0, 0.85, ["Over time — practice same pattern blind"])


def _independence_mult(level: str | None, blind: bool) -> float:
    m = {"independent": 1.0, "assisted_hint": 0.7, "retry_success": 0.55, "scaffolded": 0.4}.get(level or "independent", 0.7)
    if blind and (level or "independent") == "independent":
        m = 1.1  # blind bonus: building with zero scaffold
    return m


class BuilderScoringPolicy:
    """Server-owned scoring policy."""

    @classmethod
    def build(
        cls,
        sub_mode: str,
        *,
        transcript: str,
        keywords: list[str] | None,
        focus_skill: str | None,
        expected_connectors: list[str] | None,
        relation: str | None,
        reaction_latency_ms: float | None,
        timer_limit_ms: int | None,
        speech_confidence: float | None,
        timed_out: bool = False,
        independence_level: str = "independent",
        blind: bool = False,
        better_version: str = "",
        better_version_vi: str = "",
        errors: list[dict[str, Any]] | None = None,
        praise_points: list[str] | None = None,
    ) -> BuilderAssessment:
        used, missing = coverage_of(transcript, keywords or [])
        coverage = _coverage_score(sub_mode, used, missing, transcript)
        connection = _connection_score(focus_skill, transcript, expected_connectors)
        naturalness = _naturalness_score(transcript, relation)
        fluency = _fluency_score(reaction_latency_ms, timer_limit_ms, speech_confidence, transcript)

        weights = WEIGHTS.get(sub_mode, WEIGHTS[BuilderSubMode.ASSEMBLE.value])
        raw = (
            coverage.score * weights.get("coverage", 0.0)
            + connection.score * weights.get("connection", 0.0)
            + naturalness.score * weights.get("naturalness", 0.0)
            + fluency.score * weights.get("fluency", 0.0)
        )
        if timed_out or not transcript.strip():
            raw = min(raw, 35.0)
        raw *= _independence_mult(independence_level, blind)
        overall = DimensionScore(score=round(max(0.0, min(100.0, raw)), 1), confidence=0.85, evidence=["Weighted coverage/connection/naturalness/fluency"])
        clauses = split_clauses(transcript, keywords or [])
        return BuilderAssessment(
            coverage=coverage,
            connection=connection,
            naturalness=naturalness,
            fluency=fluency,
            overall=overall,
            timed_out=timed_out,
            reaction_latency_ms=reaction_latency_ms,
            keywords_used=used,
            clauses=clauses,
            better_version=better_version,
            better_version_vi=better_version_vi,
            errors=errors or [],
            praise_points=praise_points or [],
        )
