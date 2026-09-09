"""Writing Intelligence Service (Phase 16).

Transforms raw evaluation and discourse feedback issues into normalized,
long-term recurring Japanese writing weaknesses with mastery tracking,
evidence deduplication, and aggregated writing fingerprints.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.exc import IntegrityError

from app.core.config import Settings, get_settings
from app.models.writing_intelligence import WritingWeakness
from app.prompts.writing_diagnosis import build_writing_diagnosis_prompt
from app.repositories.writing_intelligence import WritingWeaknessRepository
from app.schemas.writing_intelligence import (
    DueRetestOut,
    EvidenceSummaryOut,
    MasteryNarrativeOut,
    MasteryStateOut,
    WeaknessDetailOut,
)
from app.schemas.writing_intelligence_ai import WritingDiagnosisResult
from app.services.ai_service import AIService
from app.services.mastery_engine import WritingMasteryEngine

logger = logging.getLogger("app.writing_intelligence")

_MAX_EXAMPLES = 5
_MAX_EVIDENCE_REFS = 20

SEVERITY_RANKS = {"info": 0, "minor": 1, "major": 2, "critical": 3}


# Subtype definitions per category for human-friendly descriptions and mapping
SUBTYPE_DESCRIPTIONS = {
    # Grammar
    ("grammar", "particles"): "Sử dụng trợ từ tiếng Nhật (は, が, に, で, を, と, へ...)",
    ("grammar", "conjugation"): "Chia thể động từ, tính từ (thể て, bị động, sai khiến, điều kiện...)",
    ("grammar", "sentence_structure"): "Cấu trúc câu, trật tự từ và quan hệ chủ-vị",
    ("grammar", "tense_aspect"): "Thời gian và thể hoàn thành/tiếp diễn (ている, てある, た/る...)",
    ("grammar", "modifiers"): "Bổ nghĩa cho danh từ/động từ (liên thể, liên dụng)",
    ("grammar", "clause_connection"): "Nối vế câu, liên từ phức hợp (から, ので, のに, けれども...)",
    # Lexicon
    ("lexicon", "wrong_word_choice"): "Lựa chọn từ chưa chính xác hoặc dùng sai ngữ nghĩa",
    ("lexicon", "collocation"): "Kết hợp từ không tự nhiên theo thói quen bản ngữ",
    ("lexicon", "synonym_confusion"): "Nhầm lẫn giữa các từ đồng nghĩa/gần nghĩa",
    ("lexicon", "vocabulary_precision"): "Từ vựng chung chung, thiếu độ chuẩn xác cần thiết",
    ("lexicon", "overuse"): "Lạm dụng từ ngữ hoặc biểu đạt lặp lại đơn điệu",
    # Naturalness
    ("naturalness", "literal_translation"): "Diễn đạt mang tính dịch thô từng chữ (translationese)",
    ("naturalness", "vietnamese_transfer"): "Chuyển di tiêu cực từ tư duy tiếng Việt sang tiếng Nhật",
    ("naturalness", "unnatural_phrase"): "Cách diễn đạt gượng gạo, không thuần Nhật",
    ("naturalness", "redundant_expression"): "Biểu đạt dư thừa, lặp ý không cần thiết",
    ("naturalness", "repetitive_expression"): "Lặp lại từ ngữ hoặc cấu trúc câu đơn điệu",
    ("naturalness", "Japanese_native_preference"): "Chưa dùng đúng thói quen tư duy biểu đạt của người Nhật",
    # Register
    ("register", "casual_polite_mismatch"): "Trộn lẫn văn phong thân mật và lịch sự (Desu/Masu vs Da/Dearu)",
    ("register", "business_register"): "Văn phong công việc/thương mại chưa chuẩn mực",
    ("register", "keigo"): "Kính ngữ, khiêm nhường ngữ hoặc tôn kính ngữ chưa đúng",
    ("register", "written_spoken_mismatch"): "Lẫn lộn giữa văn nói và văn viết",
    ("register", "excessive_politeness"): "Kính ngữ quá mức hoặc nhị trùng kính ngữ",
    ("register", "insufficient_politeness"): "Mức độ lịch sự chưa đủ so với mối quan hệ/bối cảnh",
    # Discourse
    ("discourse", "coherence"): "Tính mạch lạc và logic xuyên suốt đoạn văn",
    ("discourse", "cohesion"): "Tính liên kết giữa các câu bằng từ nối và đại từ",
    ("discourse", "organization"): "Bố cục sắp xếp ý và cấu trúc đoạn văn",
    ("discourse", "topic_continuity"): "Duy trì và phát triển chủ đề xuyên suốt",
    ("discourse", "transition"): "Chuyển ý giữa các câu/đoạn chưa mượt mà",
    ("discourse", "insufficient_elaboration"): "Thiếu dẫn chứng, luận cứ hoặc giải thích cụ thể",
}


class WritingIntelligenceService:
    """Domain service for weakness normalization, aggregation, writing fingerprinting and AI diagnosis."""

    def __init__(
        self,
        weakness_repository: WritingWeaknessRepository,
        settings: Settings | None = None,
        ai_service: AIService | None = None,
    ) -> None:
        self._repository = weakness_repository
        self._settings = settings or get_settings()
        self._ai = ai_service or AIService(settings=self._settings)
        self._mastery_engine = WritingMasteryEngine(settings=self._settings, ai_service=self._ai)

    # -- Normalization Taxonomy ---------------------------------------------

    def normalize_issue(
        self, issue: dict[str, Any], context: dict[str, Any] | None = None
    ) -> tuple[str, str, str]:
        """Maps any evaluation issue to a normalized (category, subtype, description)."""
        raw_cat = str(issue.get("category", "")).strip().lower()
        explanation = str(issue.get("explanation", "")).lower()
        suggested = str(issue.get("suggested_fix", "")).lower()
        orig = str(issue.get("original_text", "")).lower()
        combined = f"{raw_cat} {explanation} {suggested} {orig}"

        # 1. Grammar
        if raw_cat in ("grammar", "sentence_structure") or any(
            k in combined for k in ("trợ từ", "particle", "助詞", "chia động từ", "conjugation", "活用")
        ):
            category = "grammar"
            if any(k in combined for k in ("trợ từ", "particle", "助詞", " は ", " が ", " に ", " で ", " を ", " と ", " へ ")):
                subtype = "particles"
            elif any(k in combined for k in ("chia", "conjugation", "thể ", "thể-", "te-form", "bị động", "sai khiến", "passive", "causative", "potential", "khả năng", "điều kiện", "conditional", "活用", "過去形")):
                subtype = "conjugation"
            elif any(k in combined for k in ("thì", "tense", "aspect", "đang", "thời gian", "ている", "てある", "ておく", "時制", "アスペクト")):
                subtype = "tense_aspect"
            elif any(k in combined for k in ("bổ nghĩa", "modifier", "tính từ", "phó từ", "adjective", "adverb", "連体", "連用", "形容詞", "副詞")):
                subtype = "modifiers"
            elif any(k in combined for k in ("nối câu", "liên từ", "mệnh đề", "clause", "connection", "から", "ので", "のに", "けれども", "接続", "複文")):
                subtype = "clause_connection"
            else:
                subtype = "sentence_structure"

        # 2. Register
        elif raw_cat == "register" or any(
            k in combined for k in ("kính ngữ", "keigo", "敬語", "lịch sự", "polite", "suồng sã", "casual", "văn nói", "văn viết", "business", "thương mại")
        ):
            category = "register"
            if any(k in combined for k in ("kính ngữ", "keigo", "敬語", "khiêm nhường", "tôn kính", "謙譲", "尊敬")):
                subtype = "keigo"
            elif any(k in combined for k in ("business", "thương mại", "công việc", "email", "ビジネス", "trang trọng")):
                subtype = "business_register"
            elif any(k in combined for k in ("văn nói", "văn viết", "khẩu ngữ", "spoken", "written", "話し言葉", "書き言葉", "口語")):
                subtype = "written_spoken_mismatch"
            elif any(k in combined for k in ("quá mức", "excessive", "lạm dụng", "nhị trùng", "二重敬語", "過剰")):
                subtype = "excessive_politeness"
            elif any(k in combined for k in ("thiếu", "chưa đủ", "cộc lốc", "insufficient", "thất lễ", "失礼", "不足")):
                subtype = "insufficient_politeness"
            else:
                subtype = "casual_polite_mismatch"

        # 3. Discourse
        elif raw_cat in ("discourse", "coherence", "cohesion", "organization", "flow", "style_consistency") or any(
            k in combined for k in ("mạch lạc", "liên kết", "coherence", "cohesion", "bố cục", "đoạn văn", "chủ đề", "chuyển tiếp")
        ):
            category = "discourse"
            if any(k in combined for k in ("liên kết", "cohesion", "từ nối", "chỉ định từ", "指示詞", "結束性")):
                subtype = "cohesion"
            elif any(k in combined for k in ("bố cục", "cấu trúc đoạn", "organization", "dàn bài", "構成", "段落")):
                subtype = "organization"
            elif any(k in combined for k in ("chủ đề", "duy trì", "topic", "continuity", "話題", "主題")):
                subtype = "topic_continuity"
            elif any(k in combined for k in ("chuyển ý", "chuyển tiếp", "transition", "flow", "trôi chảy", "展開")):
                subtype = "transition"
            elif any(k in combined for k in ("thiếu ý", "triển khai", "giải thích", "chưa đủ", "elaboration", "dẫn chứng", "説明不足")):
                subtype = "insufficient_elaboration"
            else:
                subtype = "coherence"

        # 4. Lexicon
        elif raw_cat in ("vocabulary", "lexicon") or any(
            k in combined for k in ("từ vựng", "từ đồng nghĩa", "kết hợp từ", "collocation", "word choice", "chọn từ", "nghĩa của từ")
        ):
            category = "lexicon"
            if any(k in combined for k in ("đồng nghĩa", "gần nghĩa", "synonym", "phân biệt", "nhầm lẫn", "類義語", "使い分け")):
                subtype = "synonym_confusion"
            elif any(k in combined for k in ("đi cùng", "kết hợp", "collocation", "cụm từ", "連語", "コロケーション")):
                subtype = "collocation"
            elif any(k in combined for k in ("chính xác", "chuẩn xác", "precision", "mơ hồ", "cụ thể", "độ chính xác", "適切")):
                subtype = "vocabulary_precision"
            else:
                subtype = "wrong_word_choice"

        # 5. Naturalness / Default
        else:
            category = "naturalness"
            if any(k in combined for k in ("dịch thô", "dịch từng chữ", "literal", "tiếng việt", "translationese", "直訳", "母国語")):
                subtype = "literal_translation"
            elif any(k in combined for k in ("dư thừa", "thừa", "redundant", "dài dòng", "冗長", "重複", "二重")):
                subtype = "redundant_expression"
            elif any(k in combined for k in ("lặp lại", "lặp từ", "đơn điệu", "repetitive", "繰り返")):
                subtype = "repetitive_expression"
            elif any(k in combined for k in ("người bản xứ", "người nhật", "tự nhiên hơn", "native", "bản ngữ", "日本人", "自然な発想")):
                subtype = "Japanese_native_preference"
            else:
                subtype = "unnatural_phrase"

        description = SUBTYPE_DESCRIPTIONS.get(
            (category, subtype), f"Vấn đề về {category} ({subtype})"
        )
        return category, subtype, description

    # -- Aggregation & Upsert -----------------------------------------------

    async def aggregate_from_evaluation(
        self,
        user_id: str | None,
        issues: list[dict[str, Any]],
        evaluation_id: str,
        *,
        context: dict[str, Any] | None = None,
        score: int | None = None,
    ) -> list[WritingWeakness]:
        """Process evaluation issues into normalized writing weaknesses."""
        if not issues:
            return []

        now = datetime.now(timezone.utc)
        context = context or {}
        created_or_updated: list[WritingWeakness] = []

        seen_keys_in_batch: set[tuple[str, str]] = set()

        for raw_issue in issues:
            category, subtype, default_desc = self.normalize_issue(raw_issue, context)
            key = (category, subtype)
            if key in seen_keys_in_batch:
                continue
            seen_keys_in_batch.add(key)

            snippet = str(raw_issue.get("original_text") or raw_issue.get("suggested_fix") or "").strip()
            severity = str(raw_issue.get("severity") or "minor").lower()
            if severity not in SEVERITY_RANKS:
                severity = "minor"

            weakness = await self._upsert_occurrence(
                user_id=user_id,
                category=category,
                subtype=subtype,
                description=default_desc,
                snippet=snippet,
                severity=severity,
                evaluation_id=evaluation_id,
                source_type="exercise_evaluation",
                context=context,
                now=now,
            )
            if weakness:
                created_or_updated.append(weakness)

        return created_or_updated

    async def aggregate_from_discourse(
        self,
        user_id: str | None,
        discourse_issues: list[dict[str, Any]],
        evaluation_id: str,
        *,
        context: dict[str, Any] | None = None,
        score: int | None = None,
    ) -> list[WritingWeakness]:
        """Process long-form discourse issues into normalized writing weaknesses."""
        if not discourse_issues:
            return []

        now = datetime.now(timezone.utc)
        context = context or {}
        created_or_updated: list[WritingWeakness] = []
        seen_keys_in_batch: set[tuple[str, str]] = set()

        for raw_issue in discourse_issues:
            category, subtype, default_desc = self.normalize_issue(raw_issue, context)
            key = (category, subtype)
            if key in seen_keys_in_batch:
                continue
            seen_keys_in_batch.add(key)

            snippet = str(raw_issue.get("explanation") or raw_issue.get("suggested_fix") or "").strip()
            severity = str(raw_issue.get("severity") or "minor").lower()
            if severity not in SEVERITY_RANKS:
                severity = "minor"

            weakness = await self._upsert_occurrence(
                user_id=user_id,
                category=category,
                subtype=subtype,
                description=default_desc,
                snippet=snippet,
                severity=severity,
                evaluation_id=evaluation_id,
                source_type="discourse_evaluation",
                context=context,
                now=now,
            )
            if weakness:
                created_or_updated.append(weakness)

        return created_or_updated

    async def _upsert_occurrence(
        self,
        user_id: str | None,
        category: str,
        subtype: str,
        description: str,
        snippet: str,
        severity: str,
        evaluation_id: str,
        source_type: str,
        context: dict[str, Any],
        now: datetime,
    ) -> WritingWeakness | None:
        """Upsert a weakness occurrence with full lifecycle state machine updates."""
        weakness = await self._repository.get_by_key(user_id, category, subtype)

        evidence_item = {
            "evaluation_id": evaluation_id,
            "source_type": source_type,
            "created_at": now.isoformat(),
        }

        register = context.get("register")
        topic = context.get("topic") or context.get("scenario_genre")
        jlpt = context.get("jlpt_level")
        context_type = self._mastery_engine.resolve_context_type(
            source_type=source_type,
            exercise_type=context.get("exercise_type"),
            explicit_context=context.get("writing_context_type"),
        )

        if weakness is None:
            # First occurrence
            examples = [snippet[:300]] if snippet else []
            registers = [register] if register else []
            contexts = [topic] if topic else []
            jlpts = [jlpt] if jlpt else []

            weakness = WritingWeakness(
                user_id=user_id,
                category=category,
                subtype=subtype,
                description=description,
                examples=examples,
                frequency=1,
                first_seen_at=now,
                last_seen_at=now,
                severity=severity,
                recurrence_count=1,
                corrected_count=0,
                exposure_count=1,
                mastery_score=0.0,
                confidence="low",
                status="new",
                lifecycle_state="new",
                correct_count_by_context={},
                incorrect_count_by_context={context_type: 1},
                context_generalization_score=0.0,
                register_diversity_score=round(min(len(registers) / 3.0, 1.0), 2) if registers else 0.0,
                last_correct_at=None,
                last_incorrect_at=now,
                days_since_last_error=0.0,
                retest_due_at=None,
                retest_interval_days=0,
                retest_passed_count=0,
                mastery_evidence={},
                mastery_history=[{
                    "from_state": None,
                    "to_state": "new",
                    "timestamp": now.isoformat(),
                    "trigger": "first_occurrence",
                }],
                affected_registers=registers,
                affected_contexts=contexts,
                affected_jlpt_levels=jlpts,
                related_expressions=[],
                related_grammar_patterns=[],
                evidence_refs=[evidence_item],
            )
            # Compute initial evidence & state
            self._mastery_engine.on_occurrence(weakness, now, context_type, register)
            try:
                persisted = await self._repository.add(weakness)
                return persisted
            except IntegrityError:
                await self._repository.session.rollback()
                weakness = await self._repository.get_by_key(user_id, category, subtype)
                if weakness is None:
                    return None

        # Existing occurrence update
        weakness.frequency += 1
        weakness.exposure_count += 1
        weakness.recurrence_count += 1
        weakness.last_seen_at = now

        # Severity comparison (keep highest)
        if SEVERITY_RANKS.get(severity, 0) > SEVERITY_RANKS.get(weakness.severity, 0):
            weakness.severity = severity

        # Examples update
        examples = list(weakness.examples or [])
        if snippet and snippet not in examples:
            examples.append(snippet[:300])
        weakness.examples = examples[:_MAX_EXAMPLES]

        # Context lists
        if register and register not in (weakness.affected_registers or []):
            weakness.affected_registers = list(weakness.affected_registers or []) + [register]
        if topic and topic not in (weakness.affected_contexts or []):
            weakness.affected_contexts = list(weakness.affected_contexts or []) + [topic]
        if jlpt and jlpt not in (weakness.affected_jlpt_levels or []):
            weakness.affected_jlpt_levels = list(weakness.affected_jlpt_levels or []) + [jlpt]

        # Evidence references
        refs = list(weakness.evidence_refs or [])
        refs.append(evidence_item)
        weakness.evidence_refs = refs[-_MAX_EVIDENCE_REFS:]

        # Execute Mastery Engine state transition & evidence updates
        self._mastery_engine.on_occurrence(weakness, now, context_type, register)

        # Confidence calculation
        weakness.confidence = self.compute_confidence(weakness.exposure_count)

        await self._repository.session.flush()
        await self._repository.session.refresh(weakness)
        return weakness

    async def record_correction(
        self,
        user_id: str | None,
        category: str,
        subtype: str,
        *,
        evaluation_id: str | None = None,
        context: dict[str, Any] | None = None,
        writing_context_type: str | None = None,
    ) -> WritingWeakness | None:
        """Mark that a weakness was successfully addressed/corrected in writing."""
        weakness = await self._repository.get_by_key(user_id, category, subtype)
        if weakness is None:
            return None

        now = datetime.now(timezone.utc)
        context = context or {}
        context_type = self._mastery_engine.resolve_context_type(
            source_type=None,
            exercise_type=context.get("exercise_type"),
            explicit_context=writing_context_type or context.get("writing_context_type"),
        )
        register = context.get("register")

        weakness.corrected_count += 1
        weakness.exposure_count += 1
        weakness.last_seen_at = now

        if evaluation_id:
            refs = list(weakness.evidence_refs or [])
            refs.append({
                "evaluation_id": evaluation_id,
                "source_type": "correction_success",
                "created_at": now.isoformat(),
            })
            weakness.evidence_refs = refs[-_MAX_EVIDENCE_REFS:]

        # Execute Mastery Engine state transition & evidence updates
        self._mastery_engine.on_correction(weakness, now, context_type, register)

        # Confidence calculation
        weakness.confidence = self.compute_confidence(weakness.exposure_count)

        await self._repository.session.flush()
        await self._repository.session.refresh(weakness)
        return weakness

    @staticmethod
    def compute_mastery_score(corrected: int, recurrence: int) -> float:
        total = corrected + recurrence
        if total <= 0:
            return 0.0
        return round(float(corrected) / float(total), 2)

    @staticmethod
    def compute_confidence(exposure_count: int) -> str:
        if exposure_count >= 5:
            return "high"
        if exposure_count >= 2:
            return "medium"
        return "low"

    # -- Writing Fingerprint & Profile ---------------------------------------

    async def build_fingerprint(self, user_id: str | None) -> dict[str, Any]:
        """Aggregates all recorded writing weaknesses into a comprehensive fingerprint."""
        all_weaknesses = await self._repository.list_by_user(user_id, limit=200)

        # Categorize by status and dimensions
        top_recurring = sorted(
            [w for w in all_weaknesses if w.status in ("recurring", "persistent", "new", "regressed")],
            key=lambda w: (w.recurrence_count, w.frequency),
            reverse=True,
        )[:5]

        persistent = [w for w in all_weaknesses if w.status == "persistent"]
        emerging = [w for w in all_weaknesses if w.status == "new"]
        declining = [w for w in all_weaknesses if w.status in ("improving", "mastered")]

        register_weaknesses = [w for w in all_weaknesses if w.category == "register"]
        naturalness_weaknesses = [w for w in all_weaknesses if w.category == "naturalness"]
        discourse_weaknesses = [w for w in all_weaknesses if w.category == "discourse"]

        # Category level aggregation
        categories = ["grammar", "lexicon", "naturalness", "register", "discourse"]
        dimensions: list[dict[str, Any]] = []

        for cat in categories:
            cat_items = [w for w in all_weaknesses if w.category == cat]
            total = len(cat_items)
            mastered = sum(1 for w in cat_items if w.status == "mastered")
            recur = sum(1 for w in cat_items if w.status == "recurring")
            pers = sum(1 for w in cat_items if w.status == "persistent")
            avg_m = (
                round(sum(w.mastery_score for w in cat_items) / total, 2)
                if total > 0
                else 1.0
            )
            dimensions.append({
                "category": cat,
                "total_weaknesses": total,
                "mastered_count": mastered,
                "recurring_count": recur,
                "persistent_count": pers,
                "average_mastery": avg_m,
            })

        # Dimension strength sorting
        # Dimensions with few active weaknesses or high mastery are strongest
        sorted_dims = sorted(
            dimensions,
            key=lambda d: (d["persistent_count"] * 3 + d["recurring_count"], -d["average_mastery"]),
        )
        strongest = [d["category"] for d in sorted_dims if d["persistent_count"] == 0 and d["recurring_count"] <= 1]
        weakest = [d["category"] for d in reversed(sorted_dims) if d["persistent_count"] > 0 or d["recurring_count"] > 1]

        if not strongest and dimensions:
            strongest = [sorted_dims[0]["category"]]
        if not weakest and dimensions:
            weakest = [sorted_dims[-1]["category"]]

        total_tracked = len(all_weaknesses)
        active_count = sum(1 for w in all_weaknesses if w.status != "mastered")
        mastered_count = sum(1 for w in all_weaknesses if w.status == "mastered")
        overall_mastery = (
            round(mastered_count / total_tracked, 2) if total_tracked > 0 else 0.0
        )

        return {
            "strongest_dimensions": strongest,
            "weakest_dimensions": weakest,
            "top_recurring": top_recurring,
            "emerging": emerging,
            "declining": declining,
            "persistent": persistent,
            "register_weaknesses": register_weaknesses,
            "naturalness_weaknesses": naturalness_weaknesses,
            "discourse_weaknesses": discourse_weaknesses,
            "dimensions": dimensions,
            "total_tracked_weaknesses": total_tracked,
            "active_weakness_count": active_count,
            "mastered_weakness_count": mastered_count,
            "overall_mastery_rate": overall_mastery,
        }

    async def get_profile(self, user_id: str | None) -> dict[str, Any]:
        """Provides full Writing Intelligence Profile for user analytics & planner."""
        fingerprint = await self.build_fingerprint(user_id)
        all_weaknesses = await self._repository.list_by_user(user_id, limit=100)

        top_recurring = fingerprint["top_recurring"]
        persistent = fingerprint["persistent"]
        recent_improvements = fingerprint["declining"][:5]

        # Recommended focus priorities
        recommended_focus: list[str] = []
        for w in top_recurring[:3]:
            desc = SUBTYPE_DESCRIPTIONS.get(
                (w.category, w.subtype), f"{w.category} ({w.subtype})"
            )
            recommended_focus.append(f"{w.category.upper()}: {desc}")

        total_evals = sum(w.frequency for w in all_weaknesses)
        last_analyzed = (
            max(w.last_seen_at for w in all_weaknesses)
            if all_weaknesses
            else None
        )

        return {
            "fingerprint": fingerprint,
            "top_recurring_weaknesses": top_recurring,
            "persistent_weaknesses": persistent,
            "recent_improvements": recent_improvements,
            "recommended_focus": recommended_focus,
            "total_evaluations_analyzed": total_evals,
            "last_analyzed_at": last_analyzed,
        }

    async def get_summary(self, user_id: str | None) -> dict[str, Any]:
        """Provides lightweight summary for UI dashboard & intelligence panel."""
        fingerprint = await self.build_fingerprint(user_id)
        top_recurring = fingerprint["top_recurring"]
        persistent = fingerprint["persistent"]
        recent_improvements = fingerprint["declining"][:5]

        recommended_focus: list[str] = []
        for w in top_recurring[:3]:
            desc = SUBTYPE_DESCRIPTIONS.get(
                (w.category, w.subtype), f"{w.category} ({w.subtype})"
            )
            recommended_focus.append(f"{w.category.capitalize()}: {desc}")

        return {
            "top_recurring": top_recurring,
            "persistent": persistent,
            "recent_improvements": recent_improvements,
            "recommended_focus": recommended_focus,
            "overall_mastery_rate": fingerprint["overall_mastery_rate"],
            "active_weaknesses_count": fingerprint["active_weakness_count"],
            "strongest_dimensions": fingerprint["strongest_dimensions"],
            "weakest_dimensions": fingerprint["weakest_dimensions"],
        }

    async def list_weaknesses(
        self,
        user_id: str | None,
        *,
        category: str | None = None,
        status: str | None = None,
        lifecycle_state: str | None = None,
        severity: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[WritingWeakness], int]:
        return await self._repository.list_with_filters(
            user_id=user_id,
            category=category,
            status=status,
            lifecycle_state=lifecycle_state,
            severity=severity,
            skip=skip,
            limit=limit,
        )

    async def get_weakness_by_id(self, weakness_id: str) -> WritingWeakness | None:
        return await self._repository.get(weakness_id)

    # -- Phase 17 Mastery Engine APIs ---------------------------------------

    async def get_weakness_detail(self, weakness_id: str) -> WeaknessDetailOut | None:
        """Get full weakness detail with evidence breakdown and narrative."""
        weakness = await self._repository.get(weakness_id)
        if weakness is None:
            return None
        return self._mastery_engine.build_weakness_detail(weakness)

    async def get_mastery_state(self, weakness_id: str) -> MasteryStateOut | None:
        """Get current mastery state and evidence for a weakness."""
        weakness = await self._repository.get(weakness_id)
        if weakness is None:
            return None
        evidence = self._mastery_engine.compute_evidence(weakness)
        narrative_dict = weakness.mastery_narrative
        narrative = (
            MasteryNarrativeOut.model_validate(narrative_dict)
            if narrative_dict
            else self._mastery_engine._build_fallback_narrative(weakness, evidence)
        )
        return MasteryStateOut(
            weakness_id=weakness.id,
            category=weakness.category,
            subtype=weakness.subtype,
            lifecycle_state=weakness.lifecycle_state or "new",
            status=weakness.status,
            mastery_score=weakness.mastery_score,
            confidence=weakness.confidence,
            retest_due_at=weakness.retest_due_at,
            retest_interval_days=weakness.retest_interval_days or 0,
            retest_passed_count=weakness.retest_passed_count or 0,
            evidence=evidence,
            narrative=narrative,
        )

    async def get_mastery_history(self, weakness_id: str) -> list[dict[str, Any]] | None:
        """Get the full chronological lifecycle transition history for a weakness."""
        weakness = await self._repository.get(weakness_id)
        if weakness is None:
            return None
        return list(weakness.mastery_history or [])

    async def get_due_retests(
        self, user_id: str | None, now: datetime | None = None, due_only: bool = False
    ) -> list[DueRetestOut]:
        """List all weaknesses currently due (or scheduled) for spaced interval retesting."""
        calc_now = now or datetime.now(timezone.utc)
        filter_now = calc_now if due_only else None
        weaknesses = await self._repository.list_due_retests(user_id, now=filter_now)
        return [self._mastery_engine.build_due_retest(w, calc_now) for w in weaknesses]

    async def get_evidence_summary(self, user_id: str | None) -> EvidenceSummaryOut:
        """Get aggregated evidence summary across all tracked weaknesses."""
        all_weaknesses = await self._repository.list_by_user(user_id, limit=200)
        return self._mastery_engine.build_evidence_summary(all_weaknesses)

    async def generate_narrative_for_weakness(
        self,
        weakness_id: str,
        *,
        provider: str | None = None,
        model: str | None = None,
    ) -> MasteryNarrativeOut | None:
        """Generate/refresh AI narrative for a specific weakness and persist it."""
        weakness = await self._repository.get(weakness_id)
        if weakness is None:
            return None
        narrative = await self._mastery_engine.generate_narrative(
            weakness, provider=provider, model=model
        )
        await self._repository.session.flush()
        await self._repository.session.refresh(weakness)
        return narrative


    # -- AI Writing Diagnosis & Insights ------------------------------------

    async def diagnose_writing(
        self,
        user_id: str | None,
        *,
        provider: str | None = None,
        model: str | None = None,
        user_context: dict[str, Any] | None = None,
    ) -> WritingDiagnosisResult:
        """Perform pure AI-powered deep root-cause diagnosis on learner's writing tendencies (no fallback/mock)."""
        fingerprint = await self.build_fingerprint(user_id)
        
        top_weaknesses = [
            {
                "category": w.category,
                "subtype": w.subtype,
                "description": w.description,
                "recurrence_count": w.recurrence_count,
                "mastery_score": w.mastery_score,
                "status": w.status,
                "examples": w.examples[:2],
            }
            for w in fingerprint["top_recurring"]
        ]

        persistent_weaknesses = [
            {
                "category": w.category,
                "subtype": w.subtype,
                "description": w.description,
                "recurrence_count": w.recurrence_count,
                "status": w.status,
                "examples": w.examples[:2],
            }
            for w in fingerprint["persistent"]
        ]

        prompt = build_writing_diagnosis_prompt(
            fingerprint=fingerprint,
            top_weaknesses=top_weaknesses,
            persistent_weaknesses=persistent_weaknesses,
            user_context=user_context,
        )

        effective_provider = provider
        if not effective_provider:
            if self._settings.gemini_api_key:
                effective_provider = "gemini"
            elif self._settings.groq_api_key:
                effective_provider = "groq"
            else:
                effective_provider = (
                    self._settings.ai_learning_provider
                    or self._settings.ai_default_provider
                    or None
                )
        effective_model = model or self._settings.ai_learning_model or None

        result, _ = await self._ai.generate_structured(
            prompt,
            WritingDiagnosisResult,
            provider=effective_provider,
            model=effective_model,
            max_tokens=self._settings.ai_learning_max_tokens,
        )
        return result

