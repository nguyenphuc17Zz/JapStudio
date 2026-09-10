import json
import logging
import random
import re
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import select, and_, or_, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.content import CanonicalContent
from app.models.enrichment import ContentExpression, ContentSentence
from app.models.knowledge import (
    UserVocabulary,
    VocabularyEncounter,
    UserExpression,
    UserGrammar,
    UserSavedSentence,
    ReviewState,
    ReviewSession,
    ReviewLog,
    SrsPreference,
)
from app.schemas.knowledge import (
    UserVocabularyResponse,
    VocabularyDetailResponse,
    VocabularyListResponse,
    UserExpressionResponse,
    ExpressionListResponse,
    UserGrammarResponse,
    GrammarListResponse,
    SaveSentenceRequest,
    UserSavedSentenceResponse,
    SavedSentenceListResponse,
    LearningEventRequest,
    LearningEventResponse,
    ReviewOption,
    ReviewCardResponse,
    ReviewSessionResponse,
    SubmitReviewAnswerRequest,
    SubmitReviewAnswerResponse,
    KnowledgeStatsResponse,
    KnowledgeGapItem,
    KnowledgeGapsResponse,
    SrsPreferenceResponse,
    SrsPreferenceUpdateRequest,
    ForecastDayItem,
    ReviewForecastResponse,
)
from app.services import fsrs as fsrs_engine
from app.services.review_scheduler import ReviewScheduler

logger = logging.getLogger(__name__)


class KnowledgeService:
    """Core domain logic for personal Japanese knowledge profile, event ingestion, and spaced review."""

    # ---------------------------------------------------------------------------
    # 1b. AI word-detail helpers (nuance / collocation / examples / alternatives)
    # ---------------------------------------------------------------------------

    MAX_AI_EXAMPLES = 3
    MAX_AI_ALTERNATIVES = 4

    @classmethod
    def _apply_ai_detail(
        cls,
        vocab: UserVocabulary,
        nuance: Optional[str] = None,
        collocation: Optional[str] = None,
        examples: Optional[List[Dict[str, Any]]] = None,
        alternatives: Optional[List[Dict[str, Any]]] = None,
        jlpt_level: Optional[str] = None,
    ) -> bool:
        """Merges AI word detail into a vocab row, filling only empty fields.

        Never overwrites detail the user already has. Appends a new
        collocation (deduped) and merges examples/alternatives by identity
        (sentence_ja / expression), capped to avoid unbounded JSON growth.
        Alternative expressions are also mirrored into related_terms_json so
        existing related-term navigation keeps working. Returns True when
        anything changed.
        """
        changed = False

        if nuance and str(nuance).strip() and not (vocab.nuance or "").strip():
            vocab.nuance = str(nuance).strip()
            changed = True

        if jlpt_level and str(jlpt_level).strip() and not (vocab.jlpt_level or "").strip():
            vocab.jlpt_level = str(jlpt_level).strip().upper()
            changed = True

        if collocation and str(collocation).strip():
            collocs = list(vocab.collocations_json or [])
            if str(collocation).strip() not in collocs:
                collocs.append(str(collocation).strip())
                vocab.collocations_json = collocs
                changed = True

        if examples:
            merged = list(vocab.examples_json or [])
            seen = {str(e.get("sentence_ja", "")).strip() for e in merged if isinstance(e, dict)}
            for e in examples:
                if not isinstance(e, dict):
                    continue
                key = str(e.get("sentence_ja", "")).strip()
                if not key or key in seen:
                    continue
                seen.add(key)
                merged.append({
                    "sentence_ja": key,
                    "sentence_vi": str(e.get("sentence_vi", "")).strip(),
                })
                changed = True
            vocab.examples_json = merged[: cls.MAX_AI_EXAMPLES]

        if alternatives:
            merged_alts = list(vocab.alternatives_json or [])
            seen_expr = {str(a.get("expression", "")).strip() for a in merged_alts if isinstance(a, dict)}
            related = list(vocab.related_terms_json or [])
            for a in alternatives:
                if not isinstance(a, dict):
                    continue
                expr = str(a.get("expression", "")).strip()
                if not expr or expr in seen_expr:
                    continue
                seen_expr.add(expr)
                merged_alts.append({
                    "expression": expr,
                    "reading": str(a.get("reading", "")).strip(),
                    "meaning_vi": str(a.get("meaning_vi", "")).strip(),
                    "difference": str(a.get("difference", "")).strip(),
                })
                if expr not in related:
                    related.append(expr)
                changed = True
            vocab.alternatives_json = merged_alts[: cls.MAX_AI_ALTERNATIVES]
            vocab.related_terms_json = related

        return changed

    @classmethod
    def _vocab_has_ai_detail(cls, vocab: UserVocabulary) -> bool:
        """True when the vocab already carries AI-enriched word detail."""
        return bool(
            (vocab.nuance or "").strip()
            or (vocab.examples_json or [])
            or (vocab.alternatives_json or [])
        )

    @classmethod
    async def _enrich_vocab_via_ai(
        cls,
        db: AsyncSession,
        vocab: UserVocabulary,
        sentence_text: Optional[str] = None,
        content_id: Optional[int] = None,
    ) -> bool:
        """Fetches AI word detail via the lookup pipeline and merges it.

        Graceful by design: any AI failure is logged and swallowed so the
        save itself is never blocked. Single-character terms are skipped
        because the lookup API requires 2-80 characters.
        """
        term = (vocab.term or "").strip()
        if len(term) < 2:
            return False
        try:
            from app.services.reader_service import ReaderService
            lookup = await ReaderService.lookup_selection(
                db=db,
                query=term,
                context=sentence_text,
                content_id=content_id,
                detail="full",
            )
        except Exception as e:
            logger.warning(f"AI enrich-on-save skipped for '{term}': {e}")
            return False
        return cls._apply_ai_detail(
            vocab,
            nuance=lookup.nuance,
            collocation=lookup.collocation,
            examples=[e.model_dump() if hasattr(e, "model_dump") else dict(e) for e in (lookup.examples or [])],
            alternatives=[a.model_dump() if hasattr(a, "model_dump") else dict(a) for a in (lookup.alternatives or [])],
            jlpt_level=lookup.jlpt_level,
        )

    # ---------------------------------------------------------------------------
    # 1c. AI grammar-detail helpers (formation / usage / examples)
    # ---------------------------------------------------------------------------

    MAX_GRAMMAR_EXAMPLES = 3

    @classmethod
    def _apply_grammar_ai_detail(
        cls,
        gram: UserGrammar,
        formation: Optional[str] = None,
        usage_context: Optional[str] = None,
        examples: Optional[List[Dict[str, Any]]] = None,
    ) -> bool:
        """Merges AI grammar detail into a row, filling only empty fields.

        Never overwrites detail the user already has. Merges examples by
        sentence_ja identity, capped to avoid unbounded JSON growth.
        Returns True when anything changed.
        """
        changed = False

        if formation and str(formation).strip() and not (gram.formation or "").strip():
            gram.formation = str(formation).strip()
            changed = True

        if usage_context and str(usage_context).strip() and not (gram.usage_context or "").strip():
            gram.usage_context = str(usage_context).strip()
            changed = True

        if examples:
            merged = list(gram.examples_json or [])
            seen = {str(e.get("sentence_ja", "")).strip() for e in merged if isinstance(e, dict)}
            for e in examples:
                if not isinstance(e, dict):
                    continue
                key = str(e.get("sentence_ja", "")).strip()
                if not key or key in seen:
                    continue
                seen.add(key)
                merged.append({
                    "sentence_ja": key,
                    "sentence_vi": str(e.get("sentence_vi", "")).strip(),
                })
                changed = True
            gram.examples_json = merged[: cls.MAX_GRAMMAR_EXAMPLES]

        return changed

    @classmethod
    def _grammar_has_ai_detail(cls, gram: UserGrammar) -> bool:
        """True when the grammar row already carries AI-enriched detail."""
        return bool(
            (gram.formation or "").strip()
            or (gram.usage_context or "").strip()
            or (gram.examples_json or [])
        )

    @classmethod
    async def _ensure_review_state(
        cls,
        db: AsyncSession,
        user_id: str,
        item_type: str,
        item_id: int,
        difficulty: float = 5.0,
    ) -> bool:
        """Creates a ReviewState row for explicitly saved items (idempotent).

        Returns True when a new state was created (i.e. the item just entered
        the SRS queue). Vocabulary uses its own inline logic; this helper
        covers EXPRESSION and GRAMMAR which previously never entered review.
        """
        rs_stmt = select(ReviewState).where(
            and_(
                ReviewState.user_id == user_id,
                ReviewState.item_type == item_type,
                ReviewState.item_id == item_id,
            )
        )
        if (await db.execute(rs_stmt)).scalars().first():
            return False
        db.add(ReviewState(
            user_id=user_id,
            item_type=item_type,
            item_id=item_id,
            stability=1.0,
            difficulty=float(difficulty or 5.0),
            reps=0,
            lapses=0,
            next_review_at=datetime.utcnow(),
            scheduled_days=1,
            due_status="DUE",
        ))
        return True

    @classmethod
    async def _enrich_grammar_via_ai(
        cls,
        db: AsyncSession,
        gram: UserGrammar,
        sentence_text: Optional[str] = None,
        content_id: Optional[int] = None,
    ) -> bool:
        """Fetches AI grammar detail via the lookup pipeline and merges it.

        Graceful by design: any AI failure is logged and swallowed so the
        save itself is never blocked. Short patterns are skipped because the
        lookup API requires 2-80 characters.
        """
        pat = (gram.pattern or "").strip()
        if len(pat) < 2:
            return False
        try:
            from app.services.reader_service import ReaderService
            lookup = await ReaderService.lookup_grammar(
                db=db,
                pattern=pat,
                context=sentence_text,
                content_id=content_id,
                detail="full",
            )
        except Exception as e:
            logger.warning(f"AI grammar enrich-on-save skipped for '{pat}': {e}")
            return False
        return cls._apply_grammar_ai_detail(
            gram,
            formation=lookup.formation,
            usage_context=lookup.usage_context,
            examples=[e.model_dump() if hasattr(e, "model_dump") else dict(e) for e in (lookup.examples or [])],
        )

    @classmethod
    async def enrich_grammar_detail(
        cls,
        db: AsyncSession,
        user_id: str,
        grammar_id: int,
    ) -> UserGrammarResponse:
        """On-demand AI enrichment for a previously saved pattern (library button).

        Uses the most recent saved context sentence. Raises ValueError when
        the pattern is unknown or already complete.
        """
        stmt = select(UserGrammar).where(
            and_(UserGrammar.id == grammar_id, UserGrammar.user_id == user_id)
        )
        gram = (await db.execute(stmt)).scalars().first()
        if not gram:
            raise ValueError(f"Grammar item {grammar_id} not found.")
        if cls._grammar_has_ai_detail(gram):
            return UserGrammarResponse.model_validate(gram)

        contexts = gram.contexts_json or []
        latest = contexts[-1] if contexts else {}
        enriched = await cls._enrich_grammar_via_ai(
            db,
            gram,
            sentence_text=(latest.get("sentence") if isinstance(latest, dict) else None),
            content_id=(latest.get("content_id") if isinstance(latest, dict) else None),
        )
        if not enriched:
            raise ValueError("AI không bổ sung được chi tiết cho mẫu này lúc này. Hãy thử lại sau.")
        await db.commit()
        return UserGrammarResponse.model_validate(gram)

    # ---------------------------------------------------------------------------
    # 1d. AI expression-detail helpers (usage / composition / examples)
    # ---------------------------------------------------------------------------

    MAX_EXPRESSION_EXAMPLES = 3
    MAX_EXPRESSION_ALTERNATIVES = 4

    @classmethod
    def _apply_expression_ai_detail(
        cls,
        expr: UserExpression,
        usage_context: Optional[str] = None,
        composition: Optional[str] = None,
        examples: Optional[List[Dict[str, Any]]] = None,
        alternatives: Optional[List[Dict[str, Any]]] = None,
    ) -> bool:
        """Merges AI expression detail into a row, filling only empty fields.

        Never overwrites detail already stored. Merges examples/alternatives
        by identity, capped to avoid unbounded JSON growth. Returns True when
        anything changed.
        """
        changed = False

        if usage_context and str(usage_context).strip() and not (expr.usage_context or "").strip():
            expr.usage_context = str(usage_context).strip()
            changed = True

        if composition and str(composition).strip() and not (expr.composition or "").strip():
            expr.composition = str(composition).strip()
            changed = True

        if examples:
            merged = list(expr.examples_json or [])
            seen = {str(e.get("sentence_ja", "")).strip() for e in merged if isinstance(e, dict)}
            for e in examples:
                if not isinstance(e, dict):
                    continue
                key = str(e.get("sentence_ja", "")).strip()
                if not key or key in seen:
                    continue
                seen.add(key)
                merged.append({
                    "sentence_ja": key,
                    "sentence_vi": str(e.get("sentence_vi", "")).strip(),
                })
                changed = True
            expr.examples_json = merged[: cls.MAX_EXPRESSION_EXAMPLES]

        if alternatives:
            merged_alts = list(expr.alternatives_json or [])
            seen_expr = {str(a.get("expression", "")).strip() for a in merged_alts if isinstance(a, dict)}
            for a in alternatives:
                if not isinstance(a, dict):
                    continue
                alt_expr = str(a.get("expression", "")).strip()
                if not alt_expr or alt_expr in seen_expr:
                    continue
                seen_expr.add(alt_expr)
                merged_alts.append({
                    "expression": alt_expr,
                    "reading": str(a.get("reading", "")).strip(),
                    "meaning_vi": str(a.get("meaning_vi", "")).strip(),
                    "difference": str(a.get("difference", "")).strip(),
                })
                changed = True
            expr.alternatives_json = merged_alts[: cls.MAX_EXPRESSION_ALTERNATIVES]

        return changed

    @classmethod
    def _expression_has_ai_detail(cls, expr: UserExpression) -> bool:
        """True when the expression already carries AI-enriched detail."""
        return bool(
            (expr.usage_context or "").strip()
            or (expr.composition or "").strip()
            or (expr.examples_json or [])
            or (expr.alternatives_json or [])
        )

    @classmethod
    async def enrich_expression_detail(
        cls,
        db: AsyncSession,
        user_id: str,
        expression_id: int,
    ) -> UserExpressionResponse:
        """On-demand AI enrichment for a collected expression (library button).

        Uses the most recent saved context sentence. Raises ValueError when
        the expression is unknown or already complete.
        """
        stmt = select(UserExpression).where(
            and_(UserExpression.id == expression_id, UserExpression.user_id == user_id)
        )
        expr = (await db.execute(stmt)).scalars().first()
        if not expr:
            raise ValueError(f"Expression item {expression_id} not found.")
        if cls._expression_has_ai_detail(expr):
            return UserExpressionResponse.model_validate(expr)

        contexts = expr.contexts_json or []
        latest = contexts[-1] if contexts else {}
        sentence_text = latest.get("sentence") if isinstance(latest, dict) else None
        content_id = latest.get("content_id") if isinstance(latest, dict) else None

        if not (expr.expression or "").strip():
            raise ValueError("AI không bổ sung được chi tiết cho cụm này lúc này. Hãy thử lại sau.")
        try:
            from app.services.reader_service import ReaderService
            lookup = await ReaderService.lookup_expression(
                db=db,
                expression=expr.expression.strip(),
                context=sentence_text,
                content_id=content_id,
                detail="full",
            )
        except Exception as e:
            logger.warning(f"AI expression backfill skipped for '{expr.expression}': {e}")
            raise ValueError("AI không bổ sung được chi tiết cho cụm này lúc này. Hãy thử lại sau.")

        changed = cls._apply_expression_ai_detail(
            expr,
            usage_context=lookup.usage_context,
            composition=lookup.composition,
            examples=[e.model_dump() if hasattr(e, "model_dump") else dict(e) for e in (lookup.examples or [])],
            alternatives=[a.model_dump() if hasattr(a, "model_dump") else dict(a) for a in (lookup.alternatives or [])],
        )
        if not changed:
            raise ValueError("AI không bổ sung được chi tiết cho cụm này lúc này. Hãy thử lại sau.")
        if lookup.meaning and (not expr.meaning or len(lookup.meaning) > len(expr.meaning)):
            expr.meaning = lookup.meaning
        await db.commit()
        return UserExpressionResponse.model_validate(expr)

    @classmethod
    async def auto_collect_expressions(
        cls,
        db: AsyncSession,
        user_id: str,
        content_id: int,
        max_items: int = 12,
    ) -> Dict[str, int]:
        """Saves an article's collocations into the library (manual button).

        Zero extra AI cost when expressions are already stored. When the
        article has none yet but has readable text, runs one AI enrichment
        pass first so the button genuinely searches instead of reporting
        nothing without doing any work. Idempotent — existing entries are
        counted as skipped, never duplicated.
        """
        stmt = (
            select(ContentExpression)
            .where(ContentExpression.content_id == content_id)
            .order_by(ContentExpression.learning_priority.desc())
            .limit(max(1, min(max_items, 50)))
        )
        candidates = (await db.execute(stmt)).scalars().all()

        if not candidates:
            candidates = await cls._ensure_article_expressions(db, content_id)

        saved = 0
        skipped = 0
        for expr in candidates:
            term = (expr.expression or "").strip()
            if not term:
                skipped += 1
                continue
            normalized = cls.normalize_term(term.replace(" ", "")) or term

            exists_stmt = select(UserExpression.id).where(
                and_(
                    UserExpression.user_id == user_id,
                    UserExpression.normalized_expression == normalized,
                )
            )
            if (await db.execute(exists_stmt)).scalar() is not None:
                skipped += 1
                continue

            sentence_text: Optional[str] = None
            if expr.source_sentence_id:
                s_stmt = select(ContentSentence.text).where(
                    ContentSentence.id == expr.source_sentence_id
                )
                sentence_text = (await db.execute(s_stmt)).scalar()

            await cls.ingest_learning_event(
                db=db,
                user_id=user_id,
                req=LearningEventRequest(
                    event_type="ENCOUNTERED",
                    item_type="EXPRESSION",
                    term=term,
                    normalized_form=normalized,
                    reading=expr.reading,
                    meaning=expr.meaning_in_context,
                    content_id=content_id,
                    sentence_text=sentence_text,
                    expression_type=expr.type,
                ),
            )
            saved += 1

        return {"saved": saved, "skipped": skipped}

    @classmethod
    async def _ensure_article_expressions(
        cls,
        db: AsyncSession,
        content_id: int,
    ) -> list:
        """Runs one AI enrichment pass when an article has no stored expressions.

        Returns the freshly extracted candidates (possibly empty when the
        article genuinely has nothing worth learning, per the no-force prompt
        rule). Raises ValueError when the article is missing or AI fails.
        """
        content = (
            await db.execute(
                select(CanonicalContent).where(CanonicalContent.id == content_id)
            )
        ).scalars().first()
        if not content:
            raise ValueError(f"Content {content_id} not found.")
        body = ((content.content or "") + (content.excerpt or "") + (content.title or "")).strip()
        if len(body) < 30:
            return []

        try:
            from app.services.enrichment_pipeline import EnrichmentPipelineService
            await EnrichmentPipelineService.enrich_content(
                db=db,
                content_id=content_id,
                task="FULL_ENRICHMENT",
                force=False,
            )
        except Exception as e:
            logger.warning(f"AI expression scan failed for content {content_id}: {e}")
            raise ValueError("Không thể quét cụm từ lúc này. Hãy thử lại sau.")

        stmt = (
            select(ContentExpression)
            .where(ContentExpression.content_id == content_id)
            .order_by(ContentExpression.learning_priority.desc())
            .limit(50)
        )
        return (await db.execute(stmt)).scalars().all()

    # ---------------------------------------------------------------------------
    # 1. Normalization & Lemmatization Utilities
    # ---------------------------------------------------------------------------

    @classmethod
    def normalize_term(cls, term: str) -> str:
        """Normalizes common Japanese inflected forms back to their dictionary base lemma."""
        term = term.strip()
        # Check longer specific compound suffixes first
        if term.endswith("している") and len(term) > 4:
            return term[:-4] + "する"
        if term.endswith("された") and len(term) > 3:
            return term[:-3] + "する"
        if term.endswith("ていた") and len(term) > 3:
            return term[:-3] + "る"
        if term.endswith("ている") and len(term) > 3:
            return term[:-3] + "る"
        if term.endswith("した") and len(term) > 2:
            return term[:-2] + "する"
        if term.endswith("て") and len(term) > 2:
            return term[:-1] + "る"
        if term.endswith("増えた"):
            return "増える"
        if term.endswith("減った"):
            return "減る"
        if term.endswith("進んだ"):
            return "進む"
        if term.endswith("読んだ"):
            return "読む"
        if term.endswith("書いた"):
            return "書く"
        return term

    # ---------------------------------------------------------------------------
    # 2. Centralized Learning Event Ingestion
    # ---------------------------------------------------------------------------

    @classmethod
    async def ingest_learning_event(
        cls,
        db: AsyncSession,
        user_id: str,
        req: LearningEventRequest,
    ) -> LearningEventResponse:
        """Processes a decoupled learning event from reading, context guessing, or quizzes."""
        normalized = req.normalized_form or cls.normalize_term(req.term)
        reading = req.reading or req.term
        meaning = req.meaning or f"Nghĩa của {req.term}"

        now = datetime.utcnow()
        review_scheduled = False

        if req.item_type == "EXPRESSION":
            # Handle Expression
            stmt = select(UserExpression).where(
                and_(UserExpression.user_id == user_id, UserExpression.normalized_expression == normalized)
            )
            expr = (await db.execute(stmt)).scalars().first()
            if not expr:
                expr = UserExpression(
                    user_id=user_id,
                    expression=req.term,
                    normalized_expression=normalized,
                    reading=reading,
                    meaning=meaning,
                    type=(req.expression_type or "").strip().upper() or "COLLOCATION",
                    status="LEARNING",
                    encounter_count=1,
                    mastery_score=25.0,
                    contexts_json=[{
                        "sentence": req.sentence_text or "",
                        "content_id": req.content_id,
                        "date": now.isoformat(),
                    }],
                    examples_json=[],
                    alternatives_json=[],
                )
                db.add(expr)
            else:
                expr.encounter_count += 1
                expr.last_seen_at = now
                if req.event_type in ["QUIZ_CORRECT", "RECOGNIZED"]:
                    expr.mastery_score = min(expr.mastery_score + 10.0, 100.0)
                elif req.event_type in ["QUIZ_WRONG", "FAILED_RECOGNITION"]:
                    expr.mastery_score = max(expr.mastery_score - 10.0, 5.0)

                # Add context if sentence provided
                if req.sentence_text:
                    existing_ctxs = expr.contexts_json or []
                    if not any(c.get("sentence") == req.sentence_text for c in existing_ctxs):
                        existing_ctxs.append({
                            "sentence": req.sentence_text,
                            "content_id": req.content_id,
                            "date": now.isoformat(),
                        })
                        expr.contexts_json = existing_ctxs[-10:]

            await db.flush()
            if req.event_type == "WORD_SAVED" and expr.status != "IGNORED":
                if await cls._ensure_review_state(db, user_id, "EXPRESSION", expr.id):
                    review_scheduled = True

            await db.commit()
            return LearningEventResponse(
                success=True,
                item_id=expr.id,
                item_type="EXPRESSION",
                new_encounter_count=expr.encounter_count,
                mastery_score=expr.mastery_score,
                review_scheduled=review_scheduled,
                status=expr.status,
            )

        elif req.item_type == "GRAMMAR":
            # Handle Grammar
            stmt = select(UserGrammar).where(
                and_(UserGrammar.user_id == user_id, UserGrammar.pattern == req.term)
            )
            gram = (await db.execute(stmt)).scalars().first()
            if not gram:
                gram = UserGrammar(
                    user_id=user_id,
                    pattern=req.term,
                    meaning=meaning,
                    encounter_count=1,
                    correct_count=1 if req.event_type in ["QUIZ_CORRECT", "RECOGNIZED"] else 0,
                    incorrect_count=1 if req.event_type in ["QUIZ_WRONG", "FAILED_RECOGNITION"] else 0,
                    mastery_score=30.0 if req.event_type == "QUIZ_CORRECT" else 15.0,
                    contexts_json=[{
                        "sentence": req.sentence_text or "",
                        "content_id": req.content_id,
                        "date": now.isoformat(),
                    }],
                    formation=(req.formation or "").strip() or None,
                    usage_context=(req.usage_context or "").strip() or None,
                    examples_json=[
                        {"sentence_ja": str(e.get("sentence_ja", "")).strip(), "sentence_vi": str(e.get("sentence_vi", "")).strip()}
                        for e in (req.examples or []) if isinstance(e, dict) and str(e.get("sentence_ja", "")).strip()
                    ][:3],
                )
                db.add(gram)
            else:
                gram.encounter_count += 1
                gram.last_seen_at = now
                if req.event_type in ["QUIZ_CORRECT", "RECOGNIZED"]:
                    gram.correct_count += 1
                    gram.mastery_score = min(gram.mastery_score + 10.0, 100.0)
                    gram.confidence = "HIGH"
                elif req.event_type in ["QUIZ_WRONG", "FAILED_RECOGNITION"]:
                    gram.incorrect_count += 1
                    gram.mastery_score = max(gram.mastery_score - 12.0, 5.0)
                    gram.confidence = "LOW"

                if req.sentence_text:
                    existing_ctxs = gram.contexts_json or []
                    if not any(c.get("sentence") == req.sentence_text for c in existing_ctxs):
                        existing_ctxs.append({
                            "sentence": req.sentence_text,
                            "content_id": req.content_id,
                            "date": now.isoformat(),
                        })
                        gram.contexts_json = existing_ctxs[-10:]

            # Merge caller-supplied AI grammar detail (fill-when-empty only).
            cls._apply_grammar_ai_detail(
                gram,
                formation=req.formation,
                usage_context=req.usage_context,
                examples=req.examples,
            )

            # Enrich-on-save: explicit WORD_SAVED without AI detail yet gets
            # one AI grammar lookup (server-side). Failures are swallowed so
            # the save itself is never blocked.
            ai_enriched_grammar = cls._grammar_has_ai_detail(gram)
            if req.event_type == "WORD_SAVED" and not ai_enriched_grammar:
                await cls._enrich_grammar_via_ai(
                    db,
                    gram,
                    sentence_text=req.sentence_text,
                    content_id=req.content_id,
                )
                ai_enriched_grammar = cls._grammar_has_ai_detail(gram)

            await db.flush()
            review_scheduled_gram = False
            if req.event_type == "WORD_SAVED":
                if await cls._ensure_review_state(db, user_id, "GRAMMAR", gram.id):
                    review_scheduled_gram = True

            await db.commit()
            return LearningEventResponse(
                success=True,
                item_id=gram.id,
                item_type="GRAMMAR",
                new_encounter_count=gram.encounter_count,
                mastery_score=gram.mastery_score,
                review_scheduled=review_scheduled_gram,
                status="LEARNING",
                ai_enriched=ai_enriched_grammar,
            )

        # Default: VOCABULARY
        v_stmt = select(UserVocabulary).where(
            and_(
                UserVocabulary.user_id == user_id,
                or_(
                    and_(UserVocabulary.normalized_form == normalized, UserVocabulary.reading == reading),
                    UserVocabulary.term == req.term,
                )
            )
        )
        vocab = (await db.execute(v_stmt)).scalars().first()

        # Caller-supplied collocations only — no boilerplate placeholders.
        # Empty stays empty (UI hides the block and offers AI backfill).
        collocations = list(req.collocations or [])
        if req.collocation and req.collocation.strip() and req.collocation.strip() not in collocations:
            collocations.append(req.collocation.strip())

        related_terms = [normalized]
        for alt in (req.alternatives or []):
            expr = str((alt or {}).get("expression", "")).strip() if isinstance(alt, dict) else ""
            if expr and expr not in related_terms:
                related_terms.append(expr)

        if not vocab:
            vocab = UserVocabulary(
                user_id=user_id,
                term=req.term,
                normalized_form=normalized,
                reading=reading,
                meaning=meaning,
                part_of_speech=req.part_of_speech or "noun",
                status="LEARNING" if req.event_type == "WORD_SAVED" else "SEEN",
                encounter_count=1,
                successful_recognition_count=1 if req.event_type in ["RECOGNIZED", "CONTEXT_GUESS_CORRECT", "QUIZ_CORRECT"] else 0,
                failed_recognition_count=1 if req.event_type in ["FAILED_RECOGNITION", "CONTEXT_GUESS_WRONG", "QUIZ_WRONG"] else 0,
                confidence=req.confidence or ("HIGH" if req.event_type in ["QUIZ_CORRECT", "CONTEXT_GUESS_CORRECT"] else "MEDIUM"),
                mastery_score=25.0 if req.event_type == "QUIZ_CORRECT" else 15.0,
                recognition_score=30.0 if req.event_type == "QUIZ_CORRECT" else 10.0,
                recall_score=0.0,
                learning_value_score=req.learning_priority or 75,
                collocations_json=collocations,
                related_terms_json=related_terms,
                contexts_json=[{
                    "sentence": req.sentence_text or "",
                    "content_id": req.content_id,
                    "date": now.isoformat(),
                }] if req.sentence_text else [],
                sources_breakdown_json={req.source_name or "NHK News": 1} if req.source_name else {"General": 1},
                nuance=(req.nuance or "").strip() or None,
                jlpt_level=(req.jlpt_level or "").strip().upper() or None,
                examples_json=[
                    {"sentence_ja": str(e.get("sentence_ja", "")).strip(), "sentence_vi": str(e.get("sentence_vi", "")).strip()}
                    for e in (req.examples or []) if isinstance(e, dict) and str(e.get("sentence_ja", "")).strip()
                ][: cls.MAX_AI_EXAMPLES],
                alternatives_json=[
                    {
                        "expression": str(a.get("expression", "")).strip(),
                        "reading": str(a.get("reading", "")).strip(),
                        "meaning_vi": str(a.get("meaning_vi", "")).strip(),
                        "difference": str(a.get("difference", "")).strip(),
                    }
                    for a in (req.alternatives or []) if isinstance(a, dict) and str(a.get("expression", "")).strip()
                ][: cls.MAX_AI_ALTERNATIVES],
            )
            db.add(vocab)
            await db.flush()
        else:
            vocab.encounter_count += 1
            vocab.last_seen_at = now
            if req.meaning and (not vocab.meaning or len(req.meaning) > len(vocab.meaning)):
                vocab.meaning = req.meaning

            # Update scores based on outcome
            if req.event_type in ["RECOGNIZED", "CONTEXT_GUESS_CORRECT", "QUIZ_CORRECT"]:
                vocab.successful_recognition_count += 1
                vocab.mastery_score = min(vocab.mastery_score + 8.0, 100.0)
                vocab.recognition_score = min(vocab.recognition_score + 10.0, 100.0)
                vocab.confidence = "HIGH"
            elif req.event_type in ["FAILED_RECOGNITION", "CONTEXT_GUESS_WRONG", "QUIZ_WRONG"]:
                vocab.failed_recognition_count += 1
                vocab.mastery_score = max(vocab.mastery_score - 10.0, 5.0)
                vocab.confidence = "LOW"
            elif req.event_type == "WORD_SAVED":
                vocab.mastery_score = max(vocab.mastery_score, 20.0)

            # Context memory update
            if req.sentence_text:
                existing_ctxs = vocab.contexts_json or []
                if not any(c.get("sentence") == req.sentence_text for c in existing_ctxs):
                    existing_ctxs.append({
                        "sentence": req.sentence_text,
                        "content_id": req.content_id,
                        "date": now.isoformat(),
                    })
                    vocab.contexts_json = existing_ctxs[-10:]

            # Source breakdown update
            src = req.source_name or "General"
            sb = dict(vocab.sources_breakdown_json or {})
            sb[src] = sb.get(src, 0) + 1
            vocab.sources_breakdown_json = sb
            vocab.source_count = len(sb)

            # Advance status on solid evidence
            if vocab.status not in ["IGNORED"]:
                if vocab.mastery_score >= 80.0 and vocab.successful_recognition_count >= 4:
                    vocab.status = "MASTERED"
                elif vocab.mastery_score >= 45.0 and vocab.encounter_count >= 2:
                    vocab.status = "FAMILIAR"
                else:
                    vocab.status = "LEARNING"

            # Merge caller-supplied AI detail (e.g. lookup modal re-save),
            # filling only fields the vocab does not have yet.
            cls._apply_ai_detail(
                vocab,
                nuance=req.nuance,
                collocation=req.collocation,
                examples=req.examples,
                alternatives=req.alternatives,
                jlpt_level=req.jlpt_level,
            )

        # Enrich-on-save: explicit WORD_SAVED without AI detail yet gets one
        # AI lookup (server-side). Failures are swallowed inside the helper
        # so the save itself is never blocked.
        if req.event_type == "WORD_SAVED" and not cls._vocab_has_ai_detail(vocab):
            await cls._enrich_vocab_via_ai(
                db,
                vocab,
                sentence_text=req.sentence_text,
                content_id=req.content_id,
            )

        ai_enriched = cls._vocab_has_ai_detail(vocab)

        # Log encounter record
        encounter = VocabularyEncounter(
            user_id=user_id,
            vocabulary_id=vocab.id,
            content_id=req.content_id,
            context_type="QUIZ" if "QUIZ" in req.event_type else ("CONTEXT_GUESS" if "GUESS" in req.event_type else "READING"),
            interaction_type=req.event_type,
            result="SUCCESS" if "CORRECT" in req.event_type else ("FAILURE" if "WRONG" in req.event_type else "NEUTRAL"),
            confidence=req.confidence,
            sentence_text=req.sentence_text,
            source_sentence_id=req.source_sentence_id,
        )
        db.add(encounter)

        # Smart Auto-Add to Spaced Review Queue:
        # If learning_value >= 70 OR user failed recognition OR explicitly saved
        should_review = (
            vocab.learning_value_score >= 70 or
            vocab.failed_recognition_count > 0 or
            req.event_type in ["WORD_SAVED", "CONTEXT_GUESS_WRONG", "QUIZ_WRONG"]
        ) and vocab.status != "IGNORED"

        if should_review:
            rs_stmt = select(ReviewState).where(
                and_(
                    ReviewState.user_id == user_id,
                    ReviewState.item_type == "VOCABULARY",
                    ReviewState.item_id == vocab.id,
                )
            )
            rev_state = (await db.execute(rs_stmt)).scalars().first()
            if not rev_state:
                rev_state = ReviewState(
                    user_id=user_id,
                    item_type="VOCABULARY",
                    item_id=vocab.id,
                    stability=1.0,
                    difficulty=float(vocab.difficulty or 5.0),
                    reps=0,
                    lapses=0,
                    next_review_at=now,  # ready for review immediately or today
                    scheduled_days=1,
                    due_status="DUE",
                )
                db.add(rev_state)
                review_scheduled = True

        await db.commit()

        return LearningEventResponse(
            success=True,
            item_id=vocab.id,
            item_type="VOCABULARY",
            new_encounter_count=vocab.encounter_count,
            mastery_score=vocab.mastery_score,
            review_scheduled=review_scheduled,
            status=vocab.status,
            ai_enriched=ai_enriched,
        )

    # ---------------------------------------------------------------------------
    # 3. Library Views & Detail Queries
    # ---------------------------------------------------------------------------

    @classmethod
    async def get_vocabulary_list(
        cls,
        db: AsyncSession,
        user_id: str,
        status: Optional[str] = None,
        search: Optional[str] = None,
        difficulty: Optional[int] = None,
        page: int = 1,
        limit: int = 20,
    ) -> VocabularyListResponse:
        """Queries user vocabulary library with filtering, searching, and pagination."""
        filters = [UserVocabulary.user_id == user_id]
        if status and status != "ALL":
            filters.append(UserVocabulary.status == status)
        if difficulty and difficulty > 0:
            filters.append(UserVocabulary.difficulty == difficulty)
        if search:
            q = f"%{search}%"
            filters.append(or_(
                UserVocabulary.term.ilike(q),
                UserVocabulary.reading.ilike(q),
                UserVocabulary.meaning.ilike(q),
                UserVocabulary.normalized_form.ilike(q),
            ))

        total_stmt = select(func.count(UserVocabulary.id)).where(and_(*filters))
        total = (await db.execute(total_stmt)).scalar() or 0

        stmt = (
            select(UserVocabulary)
            .where(and_(*filters))
            .order_by(desc(UserVocabulary.last_seen_at))
            .offset((page - 1) * limit)
            .limit(limit)
        )
        items = (await db.execute(stmt)).scalars().all()

        return VocabularyListResponse(
            items=[UserVocabularyResponse.model_validate(v) for v in items],
            total=total,
            page=page,
            limit=limit,
        )

    @classmethod
    async def get_vocabulary_detail(
        cls,
        db: AsyncSession,
        user_id: str,
        vocab_id: int,
    ) -> VocabularyDetailResponse:
        """Retrieves comprehensive vocabulary detail with encounter contexts, collocations, and review state."""
        stmt = (
            select(UserVocabulary)
            .where(and_(UserVocabulary.id == vocab_id, UserVocabulary.user_id == user_id))
            .options(selectinload(UserVocabulary.encounters))
        )
        vocab = (await db.execute(stmt)).scalars().first()
        if not vocab:
            raise ValueError(f"Vocabulary item {vocab_id} not found.")

        # Load review state if present
        rs_stmt = select(ReviewState).where(
            and_(
                ReviewState.user_id == user_id,
                ReviewState.item_type == "VOCABULARY",
                ReviewState.item_id == vocab.id,
            )
        )
        rev_state = (await db.execute(rs_stmt)).scalars().first()
        review_dict = {
            "stability": rev_state.stability,
            "difficulty": rev_state.difficulty,
            "reps": rev_state.reps,
            "lapses": rev_state.lapses,
            "due_status": rev_state.due_status,
            "next_review_at": rev_state.next_review_at.isoformat(),
        } if rev_state else None

        base_resp = UserVocabularyResponse.model_validate(vocab)
        return VocabularyDetailResponse(
            **base_resp.model_dump(),
            collocations=vocab.collocations_json or [],
            related_terms=vocab.related_terms_json or [],
            contexts=vocab.contexts_json or [],
            sources_breakdown=vocab.sources_breakdown_json or {},
            review_state=review_dict,
            nuance=vocab.nuance,
            jlpt_level=vocab.jlpt_level,
            examples=vocab.examples_json or [],
            alternatives=vocab.alternatives_json or [],
        )

    @classmethod
    async def enrich_vocabulary_detail(
        cls,
        db: AsyncSession,
        user_id: str,
        vocab_id: int,
    ) -> VocabularyDetailResponse:
        """On-demand AI enrichment for a previously saved word (library button).

        Uses the most recent saved context sentence. Returns the refreshed
        detail; raises ValueError when the word is unknown or already complete.
        """
        stmt = select(UserVocabulary).where(
            and_(UserVocabulary.id == vocab_id, UserVocabulary.user_id == user_id)
        )
        vocab = (await db.execute(stmt)).scalars().first()
        if not vocab:
            raise ValueError(f"Vocabulary item {vocab_id} not found.")
        if cls._vocab_has_ai_detail(vocab):
            return await cls.get_vocabulary_detail(db=db, user_id=user_id, vocab_id=vocab_id)

        contexts = vocab.contexts_json or []
        latest = contexts[-1] if contexts else {}
        enriched = await cls._enrich_vocab_via_ai(
            db,
            vocab,
            sentence_text=(latest.get("sentence") if isinstance(latest, dict) else None),
            content_id=(latest.get("content_id") if isinstance(latest, dict) else None),
        )
        if not enriched:
            raise ValueError("AI không bổ sung được chi tiết cho từ này lúc này. Hãy thử lại sau.")
        await db.commit()
        return await cls.get_vocabulary_detail(db=db, user_id=user_id, vocab_id=vocab_id)

    @classmethod
    async def get_expressions_list(
        cls,
        db: AsyncSession,
        user_id: str,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        expr_type: Optional[str] = None,
        status: Optional[str] = None,
    ) -> ExpressionListResponse:
        """Queries user expressions and collocations library."""
        filters = [UserExpression.user_id == user_id]
        if search and search.strip():
            q = f"%{search.strip()}%"
            filters.append(
                or_(
                    UserExpression.expression.ilike(q),
                    UserExpression.reading.ilike(q),
                    UserExpression.meaning.ilike(q),
                    UserExpression.normalized_expression.ilike(q),
                )
            )
        if expr_type and expr_type.strip().upper() != "ALL":
            filters.append(UserExpression.type == expr_type.strip().upper())
        if status and status.strip().upper() != "ALL":
            filters.append(UserExpression.status == status.strip().upper())
        total = (await db.execute(select(func.count(UserExpression.id)).where(and_(*filters)))).scalar() or 0
        items = (await db.execute(
            select(UserExpression).where(and_(*filters)).order_by(desc(UserExpression.last_seen_at)).offset((page - 1) * limit).limit(limit)
        )).scalars().all()

        return ExpressionListResponse(
            items=[UserExpressionResponse.model_validate(e) for e in items],
            total=total,
            page=page,
            limit=limit,
        )

    @classmethod
    async def get_grammar_list(
        cls,
        db: AsyncSession,
        user_id: str,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        confidence: Optional[str] = None,
    ) -> GrammarListResponse:
        """Queries user grammar pattern library."""
        filters = [UserGrammar.user_id == user_id]
        if search and search.strip():
            q = f"%{search.strip()}%"
            filters.append(
                or_(
                    UserGrammar.pattern.ilike(q),
                    UserGrammar.meaning.ilike(q),
                )
            )
        if confidence and confidence.strip().upper() != "ALL":
            filters.append(UserGrammar.confidence == confidence.strip().upper())
        total = (await db.execute(select(func.count(UserGrammar.id)).where(and_(*filters)))).scalar() or 0
        items = (await db.execute(
            select(UserGrammar).where(and_(*filters)).order_by(desc(UserGrammar.last_seen_at)).offset((page - 1) * limit).limit(limit)
        )).scalars().all()

        return GrammarListResponse(
            items=[UserGrammarResponse.model_validate(g) for g in items],
            total=total,
            page=page,
            limit=limit,
        )

    # ---------------------------------------------------------------------------
    # 4. Saved Sentences Operations
    # ---------------------------------------------------------------------------

    @classmethod
    async def save_sentence(
        cls,
        db: AsyncSession,
        user_id: str,
        req: SaveSentenceRequest,
    ) -> UserSavedSentenceResponse:
        """Saves a memorable Japanese sentence from an article."""
        sentence = UserSavedSentence(
            user_id=user_id,
            content_id=req.content_id,
            sentence_id=req.sentence_id,
            sentence_text=req.sentence_text,
            translation_text=req.translation_text,
            reason=req.reason,
            notes=req.notes,
        )
        db.add(sentence)
        await db.commit()
        await db.refresh(sentence)

        # Title lookup
        title = None
        if req.content_id:
            c = (await db.execute(select(CanonicalContent).where(CanonicalContent.id == req.content_id))).scalars().first()
            if c:
                title = c.title

        return UserSavedSentenceResponse(
            id=sentence.id,
            user_id=sentence.user_id,
            content_id=sentence.content_id,
            content_title=title,
            sentence_id=sentence.sentence_id,
            sentence_text=sentence.sentence_text,
            translation_text=sentence.translation_text,
            reason=sentence.reason,
            notes=sentence.notes,
            created_at=sentence.created_at,
        )

    @classmethod
    async def get_saved_sentences(
        cls,
        db: AsyncSession,
        user_id: str,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> SavedSentenceListResponse:
        """Retrieves saved sentences with paging, text search, and reason filter."""
        filters = [UserSavedSentence.user_id == user_id]
        if search and search.strip():
            q = f"%{search.strip()}%"
            filters.append(
                or_(
                    UserSavedSentence.sentence_text.ilike(q),
                    UserSavedSentence.translation_text.ilike(q),
                )
            )
        if reason and reason.strip().upper() != "ALL":
            filters.append(UserSavedSentence.reason == reason.strip().upper())
        total = (await db.execute(select(func.count(UserSavedSentence.id)).where(and_(*filters)))).scalar() or 0
        stmt = (
            select(UserSavedSentence)
            .where(and_(*filters))
            .options(selectinload(UserSavedSentence.content))
            .order_by(desc(UserSavedSentence.created_at))
            .offset((page - 1) * limit)
            .limit(limit)
        )
        sentences = (await db.execute(stmt)).scalars().all()
        items = [
            UserSavedSentenceResponse(
                id=s.id,
                user_id=s.user_id,
                content_id=s.content_id,
                content_title=s.content.title if s.content else None,
                sentence_id=s.sentence_id,
                sentence_text=s.sentence_text,
                translation_text=s.translation_text,
                reason=s.reason,
                notes=s.notes,
                created_at=s.created_at,
            )
            for s in sentences
        ]
        return SavedSentenceListResponse(items=items, total=total, page=page, limit=limit)

    @classmethod
    async def delete_saved_sentence(cls, db: AsyncSession, user_id: str, sentence_id: int) -> bool:
        stmt = select(UserSavedSentence).where(
            and_(UserSavedSentence.id == sentence_id, UserSavedSentence.user_id == user_id)
        )
        s = (await db.execute(stmt)).scalars().first()
        if not s:
            return False
        await db.delete(s)
        await db.commit()
        return True

    @classmethod
    async def update_item_status(
        cls,
        db: AsyncSession,
        user_id: str,
        item_type: str,
        item_id: int,
        new_status: str,
    ) -> bool:
        """Updates status of a vocabulary, expression or grammar item."""
        if item_type == "VOCABULARY":
            stmt = select(UserVocabulary).where(and_(UserVocabulary.id == item_id, UserVocabulary.user_id == user_id))
            item = (await db.execute(stmt)).scalars().first()
        elif item_type == "EXPRESSION":
            stmt = select(UserExpression).where(and_(UserExpression.id == item_id, UserExpression.user_id == user_id))
            item = (await db.execute(stmt)).scalars().first()
        else:
            return False

        if not item:
            return False

        item.status = new_status
        if new_status == "MASTERED":
            item.mastery_score = max(item.mastery_score, 85.0)
        elif new_status == "IGNORED":
            # Suspend review state if exists
            rs_stmt = select(ReviewState).where(
                and_(ReviewState.user_id == user_id, ReviewState.item_type == item_type, ReviewState.item_id == item_id)
            )
            rs = (await db.execute(rs_stmt)).scalars().first()
            if rs:
                rs.due_status = "SUSPENDED"

        await db.commit()
        return True

    # ---------------------------------------------------------------------------
    # 5. Spaced Review Studio & Session Execution
    # ---------------------------------------------------------------------------

    @classmethod
    async def get_due_review_count(cls, db: AsyncSession, user_id: str) -> int:
        """Returns count of cards due for review as of now."""
        now = datetime.utcnow()
        stmt = select(func.count(ReviewState.id)).where(
            and_(
                ReviewState.user_id == user_id,
                ReviewState.due_status != "SUSPENDED",
                ReviewState.next_review_at <= now,
            )
        )
        return (await db.execute(stmt)).scalar() or 0

    # ---------------------------------------------------------------------------
    # 5b. SRS 2.0 Card Builders, Distractors & Session Composition
    # ---------------------------------------------------------------------------

    # Legacy default for new cards per session (now per-user via SrsPreference).
    NEW_CARDS_PER_SESSION = 5
    LEECH_LAPSE_THRESHOLD = 8
    # Interleave: 1 new card per N due cards. Sibling spacing: cards sharing
    # the same source article stay this far apart. Band shuffle keeps priority
    # order while varying surface order per day.
    INTERLEAVE_EVERY = 4
    SIBLING_GAP = 3
    SHUFFLE_BAND = 4
    SERENDIPITY_PER_SESSION = 1

    @classmethod
    async def get_srs_preferences(cls, db: AsyncSession, user_id: str) -> SrsPreference:
        """Loads per-user SRS tuning, creating defaults on first use."""
        pref = (await db.execute(
            select(SrsPreference).where(SrsPreference.user_id == user_id)
        )).scalars().first()
        if not pref:
            pref = SrsPreference(user_id=user_id)
            db.add(pref)
            await db.flush()
        return pref

    @classmethod
    async def update_srs_preferences(
        cls, db: AsyncSession, user_id: str, req: SrsPreferenceUpdateRequest,
    ) -> SrsPreferenceResponse:
        pref = await cls.get_srs_preferences(db, user_id)
        if req.request_retention is not None:
            pref.request_retention = fsrs_engine.clamp_retention(req.request_retention)
        if req.max_interval is not None:
            pref.max_interval = max(int(req.max_interval), 1)
        if req.new_per_session is not None:
            pref.new_per_session = min(max(int(req.new_per_session), 0), 20)
        await db.commit()
        await db.refresh(pref)
        return SrsPreferenceResponse.model_validate(pref)

    @staticmethod
    def _card_retrievability(state: ReviewState, now: datetime) -> Optional[float]:
        """Predicted recall probability now; None for never-reviewed cards."""
        if state.last_review_at is None:
            return None
        elapsed = max((now - state.last_review_at).total_seconds() / 86400.0, 0.0)
        return fsrs_engine.forgetting_curve(elapsed, state.stability)

    @staticmethod
    def _sibling_key(item_type: str, item: Any) -> str:
        """Groups cards from the same article so they can be spaced apart."""
        ctxs = getattr(item, "contexts_json", None) or []
        for ctx in reversed(ctxs):
            if isinstance(ctx, dict) and ctx.get("content_id"):
                return f"{item_type}:{ctx['content_id']}"
        return f"{item_type}:item:{getattr(item, 'id', '?')}"

    @classmethod
    def _order_session_queue(
        cls,
        due: List[Dict[str, Any]],
        new: List[Dict[str, Any]],
        upcoming: List[Dict[str, Any]],
        limit: int,
        seed: str,
    ) -> List[Dict[str, Any]]:
        """R-first ordering with new-card interleave, sibling spacing and band shuffle.

        Each entry: {"state", "spec", "item", "retrievability"}. Deterministic
        for a given seed (user + day), so refreshes don't reshuffle mid-day.
        """
        rng = fsrs_engine.seeded_rng(seed)
        due_sorted = sorted(due, key=lambda p: (p["retrievability"] if p["retrievability"] is not None else 1.0))
        # Interleave new cards: 1 per INTERLEAVE_EVERY due cards.
        merged: List[Dict[str, Any]] = []
        new_iter = iter(new)
        since_new = 0
        for entry in due_sorted:
            merged.append(entry)
            since_new += 1
            if since_new >= cls.INTERLEAVE_EVERY:
                nxt = next(new_iter, None)
                if nxt is not None:
                    merged.append(nxt)
                since_new = 0
        for leftover in new_iter:
            merged.append(leftover)
        # Upcoming fill.
        merged.extend(upcoming)
        # Sibling spacing: postpone cards whose group appeared recently.
        spaced: List[Dict[str, Any]] = []
        deferred: List[Dict[str, Any]] = []
        last_seen: Dict[str, int] = {}
        for pos, entry in enumerate(merged):
            key = entry.get("sibling_key") or ""
            last = last_seen.get(key)
            if last is not None and pos - last < cls.SIBLING_GAP:
                deferred.append(entry)
                continue
            spaced.append(entry)
            last_seen[key] = len(spaced) - 1
        spaced.extend(deferred)
        # Band shuffle: stable priority, varied surface order.
        order = fsrs_engine.band_shuffle(list(range(len(spaced))), cls.SHUFFLE_BAND, rng)
        ordered = [spaced[i] for i in order]
        return ordered[: max(int(limit), 1)]

    @classmethod
    async def forecast_review_load(
        cls, db: AsyncSession, user_id: str, days: int = 30,
    ) -> ReviewForecastResponse:
        """Simulates due counts per day + measured 30-day recall rate."""
        days = max(1, min(int(days or 30), 90))
        pref = await cls.get_srs_preferences(db, user_id)
        retention = fsrs_engine.clamp_retention(pref.request_retention)
        now = datetime.utcnow()
        states = (await db.execute(
            select(ReviewState).where(
                and_(ReviewState.user_id == user_id, ReviewState.due_status != "SUSPENDED")
            )
        )).scalars().all()
        buckets = [0] * days
        new_count = 0
        for s in states:
            if s.last_review_at is None:
                new_count += 1
                continue
            elapsed_now = max((now - s.last_review_at).total_seconds() / 86400.0, 0.0)
            placed = False
            for d in range(days):
                if fsrs_engine.forgetting_curve(elapsed_now + d, s.stability) < retention:
                    buckets[d] += 1
                    placed = True
                    break
            if not placed:
                buckets[-1] += 1
        cutoff = now - timedelta(days=30)
        logs = (await db.execute(
            select(ReviewLog.rating).where(
                and_(ReviewLog.user_id == user_id, ReviewLog.reviewed_at >= cutoff)
            )
        )).scalars().all()
        recall_rate = (
            round(sum(1 for r in logs if r and r >= 3) / len(logs), 3) if logs else 0.0
        )
        out_days = [
            ForecastDayItem(
                date=(now + timedelta(days=d)).date().isoformat(),
                due_count=buckets[d],
                new_count=new_count if d == 0 else 0,
            )
            for d in range(days)
        ]
        return ReviewForecastResponse(days=out_days, retention_30d=recall_rate)

    @classmethod
    def _preview_intervals(
        cls, stability: float, difficulty: float, reps: int,
        retention: float = fsrs_engine.DEFAULT_RETENTION,
        max_interval: int = fsrs_engine.DEFAULT_MAX_INTERVAL,
    ) -> Dict[str, int]:
        """Real Again/Hard/Good/Easy intervals (days) for one card's FSRS state."""
        return fsrs_engine.preview_intervals(
            stability, difficulty,
            retention=retention, max_interval=max_interval,
            is_new=(reps == 0),
        )

    @staticmethod
    def _pick_context(contexts_json: Optional[list], examples_json: Optional[list] = None) -> Optional[str]:
        """Newest saved context first, then stored AI examples, else None (no boilerplate)."""
        if contexts_json:
            for ctx in reversed(contexts_json):
                s = ctx.get("sentence") if isinstance(ctx, dict) else None
                if s and str(s).strip():
                    return str(s).strip()
        if examples_json:
            for ex in examples_json:
                s = ex.get("sentence_ja") if isinstance(ex, dict) else None
                if s and str(s).strip():
                    return str(s).strip()
        return None

    @staticmethod
    def _mask_term(sentence: Optional[str], term: str) -> Optional[str]:
        if not sentence:
            return None
        clean = (term or "").replace("〜", "").strip()
        if clean and clean in sentence:
            return sentence.replace(clean, " ＿＿＿ ", 1)
        return sentence

    @classmethod
    def _vocab_card_spec(cls, v: UserVocabulary) -> Optional[Dict[str, Any]]:
        """CONTEXT_MEANING normally; RECALL when the word keeps failing recall."""
        ctx = cls._pick_context(v.contexts_json, v.examples_json)
        if v.recall_score < 40 and v.encounter_count >= 2:
            return {
                "review_type": "RECALL",
                "prompt": "Điền từ tiếng Nhật chính xác vào chỗ trống theo ngữ cảnh câu văn:",
                "context_sentence": cls._mask_term(ctx, v.term) or ctx,
                "clue": f"Nghĩa gợi ý: {v.meaning}",
                "correct": v.term,
                "distractor_kind": "term_ja",
                "explanation": f"'{v.term}' ({v.reading}): {v.meaning}. Thích hợp nhất trong ngữ cảnh câu này.",
            }
        return {
            "review_type": "CONTEXT_MEANING",
            "prompt": f"Từ '{v.term}' ({v.reading}) mang ý nghĩa gì trong câu văn sau?",
            "context_sentence": ctx,
            "clue": f"Từ loại: {v.part_of_speech}",
            "correct": v.meaning,
            "distractor_kind": "meaning_vi",
            "explanation": f"Trong văn cảnh bài đọc: '{v.term}' mang nghĩa chuẩn xác là '{v.meaning}'.",
        }

    @classmethod
    def _expression_card_spec(cls, e: UserExpression) -> Optional[Dict[str, Any]]:
        """USAGE when AI detail exists, else MEANING choice, else RECALL fallback."""
        ctx = cls._pick_context(e.contexts_json, e.examples_json)
        if (e.usage_context or "").strip():
            return {
                "review_type": "USAGE",
                "prompt": f"Cụm '{e.expression}'{f' ({e.reading})' if e.reading else ''} được dùng trong hoàn cảnh nào?",
                "context_sentence": ctx,
                "clue": f"Nghĩa: {e.meaning}",
                "correct": e.usage_context.strip(),
                "distractor_kind": "usage",
                "explanation": f"'{e.expression}': {e.meaning}. {e.usage_context.strip()}",
            }
        if ctx and (e.expression or "").strip() in ctx:
            return {
                "review_type": "RECALL",
                "prompt": "Điền cụm từ chính xác vào chỗ trống theo ngữ cảnh câu văn:",
                "context_sentence": cls._mask_term(ctx, e.expression),
                "clue": f"Nghĩa gợi ý: {e.meaning}",
                "correct": e.expression,
                "distractor_kind": "expression",
                "explanation": f"'{e.expression}'{f' ({e.reading})' if e.reading else ''}: {e.meaning}.",
            }
        return {
            "review_type": "CONTEXT_MEANING",
            "prompt": f"Cụm '{e.expression}'{f' ({e.reading})' if e.reading else ''} mang ý nghĩa gì?",
            "context_sentence": ctx,
            "clue": f"Loại: {e.type}",
            "correct": e.meaning,
            "distractor_kind": "meaning_vi",
            "explanation": f"'{e.expression}' mang nghĩa chuẩn xác là '{e.meaning}'.",
        }

    @classmethod
    def _grammar_card_spec(cls, g: UserGrammar) -> Optional[Dict[str, Any]]:
        """FORMATION when the formation is known, else USAGE, else MEANING choice."""
        ctx = cls._pick_context(g.contexts_json, g.examples_json)
        if (g.formation or "").strip():
            return {
                "review_type": "FORMATION",
                "prompt": f"Mẫu '{g.pattern}' có công thức cấu tạo nào sau đây?",
                "context_sentence": ctx,
                "clue": f"Ý nghĩa: {g.meaning}",
                "correct": g.formation.strip(),
                "distractor_kind": "formation",
                "explanation": f"'{g.pattern}': {g.meaning}. Công thức: {g.formation.strip()}",
            }
        if (g.usage_context or "").strip():
            return {
                "review_type": "USAGE",
                "prompt": f"Mẫu '{g.pattern}' được dùng trong hoàn cảnh nào?",
                "context_sentence": ctx,
                "clue": f"Ý nghĩa: {g.meaning}",
                "correct": g.usage_context.strip(),
                "distractor_kind": "usage",
                "explanation": f"'{g.pattern}': {g.meaning}. {g.usage_context.strip()}",
            }
        return {
            "review_type": "CONTEXT_MEANING",
            "prompt": f"Mẫu ngữ pháp '{g.pattern}' mang ý nghĩa gì?",
            "context_sentence": ctx,
            "clue": None,
            "correct": g.meaning,
            "distractor_kind": "meaning_vi",
            "explanation": f"'{g.pattern}' mang nghĩa chuẩn xác là '{g.meaning}'.",
        }

    @classmethod
    async def _ai_session_distractors(
        cls, specs: List[Dict[str, Any]]
    ) -> Dict[str, List[str]]:
        """One AI call generating 3 distractors per card. {} on any failure."""
        if not specs:
            return {}
        try:
            from app.services.ai.provider_registry import ai_provider_registry
            provider, chosen_model = ai_provider_registry.get_active_provider_and_model(None)
        except Exception as e:
            logger.warning(f"AI distractors skipped (no provider): {e}")
            return {}

        cards_desc = "\n".join(
            f"- key: {s['key']} | kind: {s['kind']} | correct: {s['correct'][:120]}"
            f"{' | context: ' + s['context'][:200] if s.get('context') else ''}"
            for s in specs
        )
        try:
            gen = await provider.generate_structured(
                prompt=(
                    "Generate 3 wrong-but-plausible multiple-choice distractors for EACH review card below.\n"
                    "Rules: same language and answer kind as the correct answer; clearly wrong to a careful learner; "
                    "never equal or paraphrase-equal to the correct answer; concise (one line each).\n\n"
                    f"{cards_desc}\n\n"
                    "Return JSON ONLY in exactly this shape: {\"<key>\": [\"distractor 1\", \"distractor 2\", \"distractor 3\"]}"
                ),
                system_instruction=(
                    "You generate multiple-choice distractors for Japanese flashcards. Output strict JSON only."
                ),
                response_schema={"type": "object"},
                model=chosen_model,
            )
            data = gen.structured_data if isinstance(gen.structured_data, dict) else {}
        except Exception as e:
            logger.warning(f"AI distractor generation failed: {e}")
            return {}

        valid: Dict[str, List[str]] = {}
        wanted = {s["key"]: s["correct"] for s in specs}
        for key, correct in wanted.items():
            raw = data.get(key)
            if not isinstance(raw, list):
                continue
            cleaned = []
            for d in raw:
                if not isinstance(d, str):
                    continue
                d = d.strip()
                if d and d != correct and d not in cleaned:
                    cleaned.append(d)
            if len(cleaned) >= 2:
                valid[key] = cleaned[:3]
        return valid

    @classmethod
    def _build_options(cls, correct: str, distractors: List[str]) -> Optional[List[ReviewOption]]:
        """Shuffled options, or None when fewer than 2 usable distractors."""
        pool = []
        seen = {correct}
        for d in distractors:
            if d and d not in seen:
                seen.add(d)
                pool.append(d)
            if len(pool) >= 3:
                break
        if len(pool) < 2:
            return None
        texts = [correct] + pool
        random.shuffle(texts)
        return [ReviewOption(id=i + 1, text=t, is_correct=(t == correct)) for i, t in enumerate(texts)]

    @classmethod
    async def start_review_session(
        cls,
        db: AsyncSession,
        user_id: str,
        limit: int = 12,
        item_type: Optional[str] = None,
    ) -> ReviewSessionResponse:
        """Builds an FSRS session: most-forgotten first, new cards interleaved.

        Ordering is R-first (predicted recall ascending) with new-card
        interleave, same-article spacing, seeded band shuffle and one
        serendipity bonus card. Deterministic within a day per user.

        One AI call generates distractors for the whole session; any failure
        falls back to distractors sampled from the user's own library.
        """
        limit = max(1, min(limit or 12, 50))
        now = datetime.utcnow()
        pref = await cls.get_srs_preferences(db, user_id)
        retention = fsrs_engine.clamp_retention(pref.request_retention)
        max_interval = max(int(pref.max_interval or fsrs_engine.DEFAULT_MAX_INTERVAL), 1)
        new_cap = min(max(int(pref.new_per_session), 0), 20)
        base_filters = [
            ReviewState.user_id == user_id,
            ReviewState.due_status != "SUSPENDED",
        ]
        if item_type and item_type != "ALL":
            base_filters.append(ReviewState.item_type == item_type)

        # Over-fetch pools; final ordering happens in Python (needs R + siblings).
        due_pool = (await db.execute(
            select(ReviewState)
            .where(and_(*base_filters,
                        ReviewState.last_review_at.isnot(None),
                        ReviewState.next_review_at <= now))
            .order_by(ReviewState.next_review_at)
            .limit(limit * 2)
        )).scalars().all()
        new_pool = (await db.execute(
            select(ReviewState)
            .where(and_(*base_filters, ReviewState.last_review_at.is_(None)))
            .order_by(ReviewState.next_review_at)
            .limit(min(limit, new_cap) if new_cap else 0)
        )).scalars().all() if new_cap else []
        upcoming_pool = (await db.execute(
            select(ReviewState)
            .where(and_(*base_filters,
                        ReviewState.last_review_at.isnot(None),
                        ReviewState.next_review_at > now))
            .order_by(ReviewState.next_review_at)
            .limit(limit)
        )).scalars().all()

        # 4. Load items + collect card specs (with sibling keys + R).
        async def _load_pending(states: List[ReviewState]) -> List[Dict[str, Any]]:
            out: List[Dict[str, Any]] = []
            for state in states:
                item = None
                spec = None
                if state.item_type == "VOCABULARY":
                    item = (await db.execute(
                        select(UserVocabulary).where(UserVocabulary.id == state.item_id)
                    )).scalars().first()
                    if item:
                        spec = cls._vocab_card_spec(item)
                elif state.item_type == "EXPRESSION":
                    item = (await db.execute(
                        select(UserExpression).where(UserExpression.id == state.item_id)
                    )).scalars().first()
                    if item:
                        spec = cls._expression_card_spec(item)
                elif state.item_type == "GRAMMAR":
                    item = (await db.execute(
                        select(UserGrammar).where(UserGrammar.id == state.item_id)
                    )).scalars().first()
                    if item:
                        spec = cls._grammar_card_spec(item)
                if item is None or spec is None:
                    continue
                out.append({
                    "state": state,
                    "spec": spec,
                    "sibling_key": cls._sibling_key(state.item_type, item),
                    "retrievability": cls._card_retrievability(state, now),
                })
            return out

        due = [p for p in await _load_pending(list(due_pool)) if p["retrievability"] is not None]
        new = await _load_pending(list(new_pool))
        upcoming = [p for p in await _load_pending(list(upcoming_pool)) if p["retrievability"] is not None]
        pending = cls._order_session_queue(
            due, new, upcoming, limit, seed=f"{user_id}:{now.date().isoformat()}",
        )

        # 5. Serendipity bonus: one random well-known card for retrieval variety.
        if len(pending) >= 1 and cls.SERENDIPITY_PER_SESSION:
            taken = {(p["state"].item_type, p["state"].item_id) for p in pending}
            bonus_states = (await db.execute(
                select(ReviewState)
                .where(and_(*base_filters,
                            ReviewState.last_review_at.isnot(None),
                            ReviewState.next_review_at > now,
                            ReviewState.reps >= 3))
                .order_by(func.random())
                .limit(3)
            )).scalars().all()
            for bs in bonus_states:
                if (bs.item_type, bs.item_id) in taken:
                    continue
                bonus = await _load_pending([bs])
                if bonus:
                    pending.append(bonus[0])
                    break

        # 6. One AI call for the whole session's distractors.
        # No fallback: if AI fails, the session is refused with a clear
        # error so the user knows instead of getting junk options.
        ai_map = await cls._ai_session_distractors([
            {
                "key": f"{p['state'].item_type}:{p['state'].item_id}:{p['spec']['review_type']}",
                "kind": p['spec']['distractor_kind'],
                "correct": p['spec']['correct'],
                "context": p['spec'].get('context_sentence') or "",
            }
            for p in pending
        ])
        if pending and not ai_map:
            raise ValueError("Không tạo được đáp án nhiễu bằng AI lúc này. Hãy thử lại sau.")

        cards: List[ReviewCardResponse] = []
        for p in pending:
            state = p["state"]
            spec = p["spec"]
            key = f"{state.item_type}:{state.item_id}:{spec['review_type']}"
            distractors = list(ai_map.get(key, []))
            options = cls._build_options(spec["correct"], distractors)
            if options is None:
                continue  # malformed AI entry for this card — skip it, keep the rest
            cards.append(ReviewCardResponse(
                item_id=state.item_id,
                item_type=state.item_type,
                review_type=spec["review_type"],
                prompt=spec["prompt"],
                context_sentence=spec.get("context_sentence"),
                clue=spec.get("clue"),
                options=options,
                correct_answer=spec["correct"],
                explanation=spec["explanation"],
                stability=state.stability,
                difficulty=state.difficulty,
                reps=state.reps,
                interval_preview=cls._preview_intervals(
                    state.stability, state.difficulty, state.reps,
                    retention=retention, max_interval=max_interval,
                ),
            ))

        if not cards:
            raise ValueError("Không tạo được thẻ ôn nào. Hãy thử lại sau.")

        # Create ReviewSession
        session = ReviewSession(
            user_id=user_id,
            items_total=len(cards),
            items_completed=0,
            score=0,
            ratings_breakdown_json={},
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

        return ReviewSessionResponse(
            session_id=session.id,
            items_total=len(cards),
            cards=cards,
        )

    @classmethod
    async def submit_review_rating(
        cls,
        db: AsyncSession,
        user_id: str,
        req: SubmitReviewAnswerRequest,
    ) -> SubmitReviewAnswerResponse:
        """Processes user rating (Again/Hard/Good/Easy) and applies FSRS updates incrementally."""
        rs_stmt = select(ReviewState).where(
            and_(
                ReviewState.user_id == user_id,
                ReviewState.item_type == req.item_type,
                ReviewState.item_id == req.item_id,
            )
        )
        state = (await db.execute(rs_stmt)).scalars().first()
        if not state:
            raise ValueError(f"ReviewState for item {req.item_id} not found.")

        # Snapshot pre-review memory state for the history log.
        old_stability = float(state.stability or 1.0)

        # FSRS transition with the user's retention tuning + deterministic fuzz.
        pref = await cls.get_srs_preferences(db, user_id)
        retention = fsrs_engine.clamp_retention(pref.request_retention)
        max_interval = max(int(pref.max_interval or fsrs_engine.DEFAULT_MAX_INTERVAL), 1)
        if state.last_review_at is None:
            elapsed = None
        else:
            elapsed = max((datetime.utcnow() - state.last_review_at).total_seconds() / 86400.0, 0.0)
        new_s, new_d, interval, next_rev, new_reps, new_lapses = ReviewScheduler.calculate_next_schedule(
            rating=req.rating,
            current_stability=state.stability,
            current_difficulty=state.difficulty,
            reps=state.reps,
            lapses=state.lapses,
            elapsed_days=elapsed,
            request_retention=retention,
            max_interval=max_interval,
            seed=f"{user_id}:{req.item_type}:{req.item_id}:{state.reps}",
        )

        state.stability = new_s
        state.difficulty = new_d
        state.scheduled_days = interval
        state.next_review_at = next_rev
        state.reps = new_reps
        state.lapses = new_lapses
        state.last_review_at = datetime.utcnow()
        state.due_status = "SCHEDULED" if interval > 1 else "DUE"

        # Leech handling: repeatedly forgotten cards are auto-suspended
        leech_suspended = False
        if new_lapses >= cls.LEECH_LAPSE_THRESHOLD and state.due_status != "SUSPENDED":
            state.due_status = "SUSPENDED"
            leech_suspended = True
            logger.info(f"Leech suspended: {req.item_type} {req.item_id} ({new_lapses} lapses)")

        # Update target vocabulary item
        new_mastery = 50.0
        new_status = "LEARNING"

        if req.item_type == "VOCABULARY":
            v = (await db.execute(select(UserVocabulary).where(UserVocabulary.id == req.item_id))).scalars().first()
            if v:
                if req.rating == ReviewScheduler.RATING_AGAIN:
                    v.mastery_score = max(v.mastery_score - 15.0, 5.0)
                    v.confidence = "LOW"
                    v.failed_recognition_count += 1
                elif req.rating == ReviewScheduler.RATING_HARD:
                    v.mastery_score = min(v.mastery_score + 4.0, 100.0)
                    v.recall_score = min(v.recall_score + 5.0, 100.0)
                    v.confidence = "MEDIUM"
                elif req.rating == ReviewScheduler.RATING_GOOD:
                    v.mastery_score = min(v.mastery_score + 10.0, 100.0)
                    v.recall_score = min(v.recall_score + 12.0, 100.0)
                    v.successful_recognition_count += 1
                    v.confidence = "HIGH"
                elif req.rating == ReviewScheduler.RATING_EASY:
                    v.mastery_score = min(v.mastery_score + 15.0, 100.0)
                    v.recall_score = min(v.recall_score + 18.0, 100.0)
                    v.successful_recognition_count += 1
                    v.confidence = "HIGH"

                # Advance status on strong mastery
                if v.mastery_score >= 80.0 and v.successful_recognition_count >= 3:
                    v.status = "MASTERED"
                elif v.mastery_score >= 45.0:
                    v.status = "FAMILIAR"

                new_mastery = v.mastery_score
                new_status = v.status

        elif req.item_type == "EXPRESSION":
            e = (await db.execute(select(UserExpression).where(UserExpression.id == req.item_id))).scalars().first()
            if e:
                if req.rating == ReviewScheduler.RATING_AGAIN:
                    e.mastery_score = max(e.mastery_score - 15.0, 5.0)
                elif req.rating == ReviewScheduler.RATING_HARD:
                    e.mastery_score = min(e.mastery_score + 4.0, 100.0)
                elif req.rating == ReviewScheduler.RATING_GOOD:
                    e.mastery_score = min(e.mastery_score + 10.0, 100.0)
                elif req.rating == ReviewScheduler.RATING_EASY:
                    e.mastery_score = min(e.mastery_score + 15.0, 100.0)

                if e.mastery_score >= 80.0:
                    e.status = "MASTERED"
                elif e.mastery_score >= 45.0 and e.status not in ("IGNORED",):
                    e.status = "FAMILIAR"

                new_mastery = e.mastery_score
                new_status = e.status

        elif req.item_type == "GRAMMAR":
            g = (await db.execute(select(UserGrammar).where(UserGrammar.id == req.item_id))).scalars().first()
            if g:
                if req.rating in (ReviewScheduler.RATING_GOOD, ReviewScheduler.RATING_EASY):
                    g.correct_count += 1
                    g.confidence = "HIGH"
                    bonus = 15.0 if req.rating == ReviewScheduler.RATING_EASY else 10.0
                    g.mastery_score = min(g.mastery_score + bonus, 100.0)
                elif req.rating == ReviewScheduler.RATING_HARD:
                    g.mastery_score = min(g.mastery_score + 4.0, 100.0)
                    g.confidence = "MEDIUM"
                else:
                    g.incorrect_count += 1
                    g.confidence = "LOW"
                    g.mastery_score = max(g.mastery_score - 15.0, 5.0)

                new_mastery = g.mastery_score
                new_status = "LEARNING"

        await db.commit()

        # Per-answer history for retention stats, forecasts and future fits.
        try:
            db.add(ReviewLog(
                user_id=user_id,
                item_type=req.item_type,
                item_id=req.item_id,
                rating=req.rating,
                retrievability=(
                    fsrs_engine.forgetting_curve(elapsed, old_stability)
                    if elapsed is not None else 1.0
                ),
                elapsed_days=elapsed,
                interval_days=interval,
            ))
            await db.commit()
        except Exception as e:
            logger.warning(f"Review log write skipped: {e}")

        return SubmitReviewAnswerResponse(
            item_id=req.item_id,
            item_type=req.item_type,
            rating=req.rating,
            rating_label=ReviewScheduler.RATING_LABELS.get(req.rating, "GOOD"),
            new_stability=new_s,
            new_difficulty=new_d,
            next_review_at=next_rev,
            scheduled_days=interval,
            new_mastery_score=new_mastery,
            new_status=new_status,
            leech_suspended=leech_suspended,
        )

    @classmethod
    async def finish_review_session(
        cls,
        db: AsyncSession,
        user_id: str,
        session_id: int,
        items_completed: int,
        ratings: Optional[Dict[str, int]] = None,
    ) -> Dict[str, Any]:
        """Persists session completion stats (previously never saved)."""
        stmt = select(ReviewSession).where(
            and_(ReviewSession.id == session_id, ReviewSession.user_id == user_id)
        )
        session = (await db.execute(stmt)).scalars().first()
        if not session:
            raise ValueError(f"Review session {session_id} not found.")
        session.items_completed = max(0, items_completed)
        ratings = ratings or {}
        session.ratings_breakdown_json = {str(k): int(v) for k, v in ratings.items()}
        session.score = int(ratings.get("3", 0)) + int(ratings.get(3, 0)) + int(ratings.get("4", 0)) + int(ratings.get(4, 0))
        session.ended_at = datetime.utcnow()
        await db.commit()
        return {
            "success": True,
            "session_id": session.id,
            "items_completed": session.items_completed,
            "score": session.score,
        }

    @classmethod
    async def suspend_review_item(
        cls,
        db: AsyncSession,
        user_id: str,
        item_type: str,
        item_id: int,
    ) -> Dict[str, Any]:
        """Manually suspends one card from the SRS queue."""
        stmt = select(ReviewState).where(
            and_(
                ReviewState.user_id == user_id,
                ReviewState.item_type == item_type,
                ReviewState.item_id == item_id,
            )
        )
        state = (await db.execute(stmt)).scalars().first()
        if not state:
            raise ValueError(f"Review state for {item_type} {item_id} not found.")
        state.due_status = "SUSPENDED"
        await db.commit()
        return {"success": True}

    @classmethod
    async def get_due_breakdown(
        cls,
        db: AsyncSession,
        user_id: str,
    ) -> Dict[str, int]:
        """Due counts split by item type plus never-reviewed cards."""
        now = datetime.utcnow()
        base = [ReviewState.user_id == user_id, ReviewState.due_status != "SUSPENDED"]
        out: Dict[str, int] = {}
        total = 0
        for item_type, key in (("VOCABULARY", "vocabulary"), ("EXPRESSION", "expression"), ("GRAMMAR", "grammar")):
            n = (await db.execute(
                select(func.count(ReviewState.id)).where(
                    and_(*base, ReviewState.item_type == item_type, ReviewState.next_review_at <= now)
                )
            )).scalar() or 0
            out[key] = int(n)
            total += int(n)
        out["total"] = total
        out["new"] = int((await db.execute(
            select(func.count(ReviewState.id)).where(
                and_(*base, ReviewState.last_review_at.is_(None))
            )
        )).scalar() or 0)
        return out

    # ---------------------------------------------------------------------------
    # 6. Knowledge Stats & Gaps Insights
    # ---------------------------------------------------------------------------

    @classmethod
    async def get_knowledge_stats(cls, db: AsyncSession, user_id: str) -> KnowledgeStatsResponse:
        """Aggregates high-level knowledge metrics without expensive recalculation."""
        total_vocab = (await db.execute(
            select(func.count(UserVocabulary.id)).where(UserVocabulary.user_id == user_id)
        )).scalar() or 0

        learning_vocab = (await db.execute(
            select(func.count(UserVocabulary.id)).where(
                and_(UserVocabulary.user_id == user_id, UserVocabulary.status == "LEARNING")
            )
        )).scalar() or 0

        familiar_vocab = (await db.execute(
            select(func.count(UserVocabulary.id)).where(
                and_(UserVocabulary.user_id == user_id, UserVocabulary.status == "FAMILIAR")
            )
        )).scalar() or 0

        mastered_vocab = (await db.execute(
            select(func.count(UserVocabulary.id)).where(
                and_(UserVocabulary.user_id == user_id, UserVocabulary.status == "MASTERED")
            )
        )).scalar() or 0

        total_expr = (await db.execute(
            select(func.count(UserExpression.id)).where(UserExpression.user_id == user_id)
        )).scalar() or 0

        total_gram = (await db.execute(
            select(func.count(UserGrammar.id)).where(UserGrammar.user_id == user_id)
        )).scalar() or 0

        saved_sent = (await db.execute(
            select(func.count(UserSavedSentence.id)).where(UserSavedSentence.user_id == user_id)
        )).scalar() or 0

        due_count = await cls.get_due_review_count(db, user_id)

        avg_mastery = (await db.execute(
            select(func.avg(UserVocabulary.mastery_score)).where(UserVocabulary.user_id == user_id)
        )).scalar() or 0.0

        avg_recog = (await db.execute(
            select(func.avg(UserVocabulary.recognition_score)).where(UserVocabulary.user_id == user_id)
        )).scalar() or 0.0

        avg_recall = (await db.execute(
            select(func.avg(UserVocabulary.recall_score)).where(UserVocabulary.user_id == user_id)
        )).scalar() or 0.0

        # Recent growth (last 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        vocab_week = (await db.execute(
            select(func.count(UserVocabulary.id)).where(
                and_(UserVocabulary.user_id == user_id, UserVocabulary.first_seen_at >= seven_days_ago)
            )
        )).scalar() or 0

        mastered_week = (await db.execute(
            select(func.count(UserVocabulary.id)).where(
                and_(
                    UserVocabulary.user_id == user_id,
                    UserVocabulary.status == "MASTERED",
                    UserVocabulary.updated_at >= seven_days_ago,
                )
            )
        )).scalar() or 0

        return KnowledgeStatsResponse(
            total_vocabulary=total_vocab,
            learning_vocabulary=learning_vocab,
            familiar_vocabulary=familiar_vocab,
            mastered_vocabulary=mastered_vocab,
            total_expressions=total_expr,
            total_grammar=total_gram,
            saved_sentences_count=saved_sent,
            review_due_count=due_count,
            avg_vocabulary_mastery=round(float(avg_mastery), 1),
            recognition_vs_recall={
                "recognition": round(float(avg_recog), 1),
                "recall": round(float(avg_recall), 1),
            },
            recent_growth={
                "vocab_added_week": vocab_week,
                "mastered_week": mastered_week,
            },
        )

    @classmethod
    async def get_knowledge_gaps(cls, db: AsyncSession, user_id: str) -> KnowledgeGapsResponse:
        """Detects linguistic blindspots, recall lags, and confused terms."""
        gaps: List[KnowledgeGapItem] = []

        # 1. Check Recall Lag
        lag_stmt = select(UserVocabulary).where(
            and_(
                UserVocabulary.user_id == user_id,
                UserVocabulary.recognition_score >= 60.0,
                UserVocabulary.recall_score <= 30.0,
            )
        ).limit(5)
        lag_items = (await db.execute(lag_stmt)).scalars().all()
        if lag_items:
            gaps.append(KnowledgeGapItem(
                type="RECALL_LAG",
                title="Chênh lệch Nhận Diện & Gợi Nhớ (Recognition vs Recall)",
                description="Bạn nhận biết rất tốt các từ này khi đọc bài, nhưng chưa thể chủ động nhớ ra khi cần dùng.",
                examples=[f"{v.term} ({v.reading}: {v.meaning})" for v in lag_items[:4]],
                suggested_action="Thực hiện phiên Spaced Review dạng 'Điền từ vào chỗ trống' (Recall Mode) để kích hoạt khả năng nhớ chủ động.",
            ))

        # 2. Check Confused Pairs / Derivatives
        deriv_terms = ["増える", "増加", "増加傾向", "急増"]
        found_derivs = (await db.execute(
            select(UserVocabulary).where(
                and_(UserVocabulary.user_id == user_id, UserVocabulary.term.in_(deriv_terms))
            )
        )).scalars().all()
        if len(found_derivs) >= 2:
            gaps.append(KnowledgeGapItem(
                type="CONFUSED_PAIR",
                title="Cụm phái sinh & Sắc thái gia tăng (Nuance & Derivative)",
                description="Các từ cùng gốc về xu hướng tăng trưởng (Động từ vs Danh từ ghép vs Cụm thành ngữ) cần phân biệt sắc thái trang trọng.",
                examples=[f"{v.term} (Mastery: {int(v.mastery_score)}%)" for v in found_derivs],
                suggested_action="Xem tab Collocations trong Thư viện để ghi nhớ đi kèm các trợ từ chuẩn (ví dụ: 〜が増える vs 〜の増加傾向にある).",
            ))

        # 3. Check Grammar Nuances
        gram_items = (await db.execute(
            select(UserGrammar).where(
                and_(UserGrammar.user_id == user_id, UserGrammar.incorrect_count > 0)
            )
        )).scalars().all()
        if gram_items:
            gaps.append(KnowledgeGapItem(
                type="NEGATION_SENSITIVITY",
                title="Sắc thái phủ định & Điều kiện trong Ngữ pháp",
                description="Phát hiện sự nhầm lẫn giữa phủ định một phần và phủ định toàn bộ trong các bài kiểm tra đọc hiểu vừa qua.",
                examples=[g.pattern for g in gram_items[:3]],
                suggested_action="Đối chiếu câu gốc trong bài đọc để nắm rõ vế trước và vế sau của cấu trúc.",
            ))

        summary = (
            f"Hệ thống phát hiện {len(gaps)} nhóm kiến thức cần tối ưu hóa. "
            "Tập trung cải thiện khả năng Gợi nhớ (Recall) và phân biệt collocations sẽ giúp bạn bứt phá năng lực đọc hiểu tiếng Nhật tự nhiên."
        ) if gaps else "Hồ sơ tri thức của bạn phát triển rất cân bằng. Hãy tiếp tục duy trì nhịp độ đọc đều đặn!"

        return KnowledgeGapsResponse(gaps=gaps, summary=summary)
