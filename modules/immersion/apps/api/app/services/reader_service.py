import json
import logging
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import select, and_, or_, desc, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.content import CanonicalContent
from app.models.source import ContentSource
from app.models.enrichment import (
    ContentEnrichment,
    ContentSentence,
    ContentVocabulary,
    ContentExpression,
    ContentGrammar,
)
from app.models.reader import (
    UserSavedContent,
    UserReadingProgress,
    UserReadingHistory,
    ContentTranslation,
    ContentExplanation,
)
from app.schemas.reader import (
    FeedItemResponse,
    FeedListResponse,
    AnnotatedSentenceResponse,
    ReaderContentResponse,
    TranslateResponse,
    SentenceExplanationResponse,
    SelectionLookupResponse,
    GrammarLookupResponse,
    ExpressionLookupResponse,
    ProgressUpdateResponse,
    ReadingHistoryItemResponse,
    ReadingHistoryGroupedResponse,
)
from app.schemas.enrichment import (
    ContentVocabularyResponse,
    ContentGrammarResponse,
    ContentExpressionResponse,
)
from fastapi import HTTPException, status
from app.services.feed_ranking import FeedRankingService
from app.services.ai.provider_registry import ai_provider_registry
from app.services.text_segmenter import TextSegmenter
from app.services.normalizer import NormalizationService
from app.services.article_extractor import ArticleExtractor
from app.services.furigana_service import furigana_service
from app.services.deduplicator import DeduplicationService
from app.services.enrichment_pipeline import EnrichmentPipelineService
from app.core.ssrf_validator import SSRFValidator
from app.core.secrets_guard import redact_secrets
from app.core.config import settings
from app.core.http_client import create_async_client
from app.services.browser_fetcher import fetch_html_best_effort

logger = logging.getLogger(__name__)


class ReaderService:
    """Core domain logic for Immersion Feed, Smart Reader, translation, and user reading state."""

    @staticmethod
    def _parse_content_images(content: "CanonicalContent") -> List[Dict[str, Any]]:
        """Reads hotlinked inline images from metadata_json (no extra table)."""
        try:
            meta = getattr(content, "metadata_json", None) or {}
            if not isinstance(meta, dict):
                return []
            imgs = meta.get("images") or []
            out: List[Dict[str, Any]] = []
            for im in imgs:
                if not isinstance(im, dict):
                    continue
                url = (im.get("url") or "").strip()
                if not url or url.startswith("data:"):
                    continue
                try:
                    pos = int(im.get("position") or 0)
                except Exception:
                    pos = 0
                out.append({
                    "url": url,
                    "caption": (im.get("caption") or None),
                    "credit": (im.get("credit") or None),
                    "position": max(pos, 0),
                })
            return out
        except Exception:
            return []

    @staticmethod
    def _parse_pages_fetched(content: "CanonicalContent") -> int:
        try:
            meta = getattr(content, "metadata_json", None) or {}
            if isinstance(meta, dict):
                return int(meta.get("pages_fetched") or 1)
        except Exception:
            pass
        return 1

    @staticmethod
    def estimate_jlpt_heuristic(text: str) -> Tuple[str, int]:
        """
        Calculates heuristic JLPT level (N5..N1) and difficulty (1..10)
        based on Japanese Kanji density for unenriched articles.
        """
        if not text:
            return "N3", 5
        import re
        kanji = re.findall(r'[\u4e00-\u9fff]', text)
        kana = re.findall(r'[\u3040-\u30ff]', text)
        total_ja = len(kanji) + len(kana)
        if total_ja == 0:
            return "N3", 5
        kanji_ratio = len(kanji) / total_ja
        if kanji_ratio < 0.15:
            return "N5", 2
        elif kanji_ratio < 0.26:
            return "N4", 4
        elif kanji_ratio < 0.36:
            return "N3", 6
        elif kanji_ratio < 0.46:
            return "N2", 8
        else:
            return "N1", 9

    @classmethod
    async def get_feed(
        cls,
        db: AsyncSession,
        user_id: str,
        tab: str = "ALL",
        source_id: Optional[int] = None,
        jlpt: Optional[str] = None,
        topic: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "relevant",
        seed: Optional[int] = None,
        page: int = 1,
        page_size: int = 12
    ) -> FeedListResponse:
        """Retrieves and ranks feed items with filters, source diversity, and reading state."""
        stmt = (
            select(CanonicalContent)
            .join(CanonicalContent.source)
            .outerjoin(CanonicalContent.enrichment)
            .where(
                and_(
                    CanonicalContent.status == "PUBLISHED",
                    CanonicalContent.language_status != "NON_JA",
                )
            )
            .options(
                selectinload(CanonicalContent.source),
                selectinload(CanonicalContent.enrichment),
            )
        )

        # 1. Filter by category tab
        if tab == "NEWS":
            stmt = stmt.where(or_(
                CanonicalContent.content_type.in_(["NEWS", "NEWS_ARTICLE"]),
                ContentSource.source_type == "NEWS",
                ContentSource.category.ilike("%news%"),
                ContentSource.category.ilike("%tin tức%"),
                ContentSource.name.ilike("%news%"),
                ContentSource.slug.in_(["nhk-news-easy", "nhk-general-news", "asahi-shimbun", "mainichi-flash", "itmedia-news", "pr-times"]),
            ))
        elif tab == "SOCIAL":
            stmt = stmt.where(or_(
                CanonicalContent.content_type.in_(["POST", "FORUM_POST", "SOCIAL_POST"]),
                ContentSource.source_type.in_(["SOCIAL", "FORUM"]),
                ContentSource.category.ilike("%social%"),
                ContentSource.category.ilike("%culture%"),
                ContentSource.category.ilike("%gourmet%"),
                ContentSource.category.ilike("%community%"),
                ContentSource.category.ilike("%ẩm thực%"),
                ContentSource.category.ilike("%văn hóa%"),
                ContentSource.slug.in_(["tabelog-gourmet", "hatena-it", "hateba-blog", "reddit", "twitter"]),
            ))
        elif tab == "BLOGS":
            stmt = stmt.where(or_(
                CanonicalContent.content_type.in_(["BLOG_POST", "BLOG", "ARTICLE"]),
                ContentSource.source_type.in_(["BLOG", "TECH_BLOG", "WEB"]),
                ContentSource.category.ilike("%blog%"),
                ContentSource.category.ilike("%tech%"),
                ContentSource.category.ilike("%technology%"),
                ContentSource.category.ilike("%opinion%"),
                ContentSource.category.ilike("%lifestyle%"),
                ContentSource.slug.in_(["note", "qiita-trending", "zenn-trending", "matcha-japan", "hateba-blog"]),
            ))

        # 2. Specific source filter
        if source_id:
            stmt = stmt.where(CanonicalContent.source_id == source_id)

        # 3. Topic filter
        if topic and topic.lower() != "all":
            stmt = stmt.where(func.lower(ContentEnrichment.primary_topic) == topic.lower())

        # 4. Search keyword
        if search and search.strip():
            term = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    CanonicalContent.title.ilike(term),
                    CanonicalContent.content.ilike(term),
                    ContentEnrichment.primary_topic.ilike(term),
                )
            )

        # Execute query
        res = await db.execute(stmt)
        all_contents = res.scalars().all()
        if not all_contents:
            return FeedListResponse(items=[], total=0, page=page, page_size=page_size, has_next=False)

        # Fetch user saved contents & progress in batch
        saved_stmt = select(UserSavedContent.content_id).where(UserSavedContent.user_id == user_id)
        saved_res = await db.execute(saved_stmt)
        saved_set = set(saved_res.scalars().all())

        prog_stmt = select(UserReadingProgress.content_id, UserReadingProgress.progress_percent).where(UserReadingProgress.user_id == user_id)
        prog_res = await db.execute(prog_stmt)
        prog_map = dict(prog_res.all())

        # Convert to raw feed item dictionaries with scores
        item_dicts: List[Dict[str, Any]] = []
        for c in all_contents:
            enr = c.enrichment
            s = c.source
            reading_time = FeedRankingService.calculate_reading_time(c.content or c.excerpt or c.title)
            score = FeedRankingService.calculate_rank_score(
                published_at=c.published_at or c.created_at,
                quality_score=enr.quality_score if enr else 70,
                readiness_score=enr.learning_readiness_score if enr else 60,
                source_priority=s.priority if s else 5,
            )

            if enr and enr.estimated_jlpt:
                card_jlpt = enr.estimated_jlpt
                card_difficulty = int(round(enr.overall_difficulty or 5))
            else:
                card_jlpt, card_difficulty = cls.estimate_jlpt_heuristic(
                    (c.title or "") + " " + (c.excerpt or "") + " " + (c.content or "")[:400]
                )

            card_cover = c.image_url
            card_images = cls._parse_content_images(c)
            if not card_cover and card_images:
                card_cover = card_images[0]["url"]

            item_dicts.append({
                "content_id": c.id,
                "title": c.title,
                "excerpt": c.excerpt or (c.content[:140] + "..." if c.content else None),
                "source_id": s.id if s else 0,
                "source_name": s.name if s else "Unknown",
                "source_slug": s.slug if s else "unknown",
                "source_type": s.source_type if s else "WEB",
                "content_type": c.content_type,
                "canonical_url": c.canonical_url,
                "image_url": card_cover,
                "images": card_images,
                "images_count": len(card_images),
                "published_at": c.published_at or c.created_at,
                "reading_time_minutes": reading_time,
                "overall_difficulty": card_difficulty,
                "estimated_jlpt": card_jlpt,
                "quality_score": enr.quality_score if enr else 80,
                "learning_readiness_score": enr.learning_readiness_score if enr else 75,
                "primary_topic": enr.primary_topic if enr else "General",
                "secondary_topics": enr.secondary_topics if enr else [],
                "content_role": enr.content_role if enr else "FORMAL",
                "is_saved": (c.id in saved_set),
                "progress_percent": prog_map.get(c.id, 0),
                "_score": score,
            })

        # Post-filter by JLPT if requested (ensuring unenriched heuristic cards match accurately)
        if jlpt and jlpt.upper() != "ALL":
            item_dicts = [item for item in item_dicts if item["estimated_jlpt"] == jlpt.upper()]

        # Sorting
        if sort_by == "random":
            import random
            r = random.Random(seed if seed is not None else 42)
            r.shuffle(item_dicts)
        elif sort_by == "newest":
            item_dicts.sort(key=lambda x: x["published_at"] or datetime.min, reverse=True)
        elif sort_by == "easiest":
            item_dicts.sort(key=lambda x: x["overall_difficulty"])
        elif sort_by == "hardest":
            item_dicts.sort(key=lambda x: x["overall_difficulty"], reverse=True)
        elif sort_by == "useful":
            item_dicts.sort(key=lambda x: x["quality_score"], reverse=True)
        else:
            # Default "relevant"
            item_dicts.sort(key=lambda x: x["_score"], reverse=True)

        # Apply source & topic diversity (only when not purely random discovery)
        if sort_by != "random":
            diversified_items = FeedRankingService.apply_diversity_rules(item_dicts)
        else:
            diversified_items = item_dicts

        total = len(diversified_items)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated = diversified_items[start_idx:end_idx]

        return FeedListResponse(
            items=[FeedItemResponse(**item) for item in paginated],
            total=total,
            page=page,
            page_size=page_size,
            has_next=(end_idx < total)
        )

    @classmethod
    async def get_content_for_reader(
        cls,
        db: AsyncSession,
        content_id: int,
        user_id: str
    ) -> Optional[ReaderContentResponse]:
        """Loads complete article with annotated sentences, vocabulary, grammar, and user state."""
        stmt = (
            select(CanonicalContent)
            .where(CanonicalContent.id == content_id)
            .options(
                selectinload(CanonicalContent.source),
                selectinload(CanonicalContent.enrichment),
                selectinload(CanonicalContent.sentences),
                selectinload(CanonicalContent.vocabularies),
                selectinload(CanonicalContent.expressions),
                selectinload(CanonicalContent.grammars),
            )
        )
        res = await db.execute(stmt)
        content = res.scalars().first()
        if not content:
            return None

        # Fetch cached translations for sentences in this content
        trans_stmt = (
            select(ContentTranslation)
            .where(
                and_(
                    ContentTranslation.content_id == content_id,
                    ContentTranslation.target_language == "vi"
                )
            )
        )
        trans_res = await db.execute(trans_stmt)
        translations = trans_res.scalars().all()
        trans_map = {t.sentence_index: t.translated_text for t in translations if t.sentence_index is not None}

        # Check user saved status
        saved_stmt = select(UserSavedContent).where(
            and_(UserSavedContent.user_id == user_id, UserSavedContent.content_id == content_id)
        )
        is_saved = bool((await db.execute(saved_stmt)).scalars().first())

        # Check user reading progress
        prog_stmt = select(UserReadingProgress).where(
            and_(UserReadingProgress.user_id == user_id, UserReadingProgress.content_id == content_id)
        )
        prog = (await db.execute(prog_stmt)).scalars().first()
        progress_percent = prog.progress_percent if prog else 0
        last_sent_idx = prog.last_sentence_index if prog else 1

        # Build sentence index mappings
        vocab_by_sent: Dict[int, List[ContentVocabularyResponse]] = {}
        for v in content.vocabularies:
            if v.source_sentence_id:
                vocab_by_sent.setdefault(v.source_sentence_id, []).append(ContentVocabularyResponse.model_validate(v))

        gram_by_sent: Dict[int, List[ContentGrammarResponse]] = {}
        for g in content.grammars:
            if g.source_sentence_id:
                gram_by_sent.setdefault(g.source_sentence_id, []).append(ContentGrammarResponse.model_validate(g))

        expr_by_sent: Dict[int, List[ContentExpressionResponse]] = {}
        for e in content.expressions:
            if e.source_sentence_id:
                expr_by_sent.setdefault(e.source_sentence_id, []).append(ContentExpressionResponse.model_validate(e))

        annotated_sentences: List[AnnotatedSentenceResponse] = []
        has_dirty_html = any("<" in s.text and ">" in s.text for s in content.sentences)

        if has_dirty_html:
            # Runtime fallback clean: re-segment using clean content text
            clean_body = NormalizationService.strip_html_to_plain(content.content or content.excerpt or "")
            if clean_body and content.title:
                c_title = content.title.strip()
                if clean_body.startswith(c_title):
                    clean_body = clean_body[len(c_title):].strip()

            runtime_segs = TextSegmenter.segment(clean_body if clean_body else content.title)
            if len(runtime_segs) > 1 and content.title:
                t_norm = "".join(content.title.split())
                first_norm = "".join(runtime_segs[0]["text"].split())
                if t_norm == first_norm:
                    runtime_segs = runtime_segs[1:]
                    for i, seg in enumerate(runtime_segs, 1):
                        seg["sentence_index"] = i

            all_vocab = [ContentVocabularyResponse.model_validate(v) for v in content.vocabularies]
            all_grammar = [ContentGrammarResponse.model_validate(g) for g in content.grammars]
            all_expr = [ContentExpressionResponse.model_validate(e) for e in content.expressions]

            for seg in runtime_segs:
                seg_text = seg["text"]
                ruby_html, tokens = furigana_service.generate_sentence_furigana(seg_text)
                seg_vocab = [v for v in all_vocab if v.surface_form and v.surface_form in seg_text]
                seg_grammar = [g for g in all_grammar if g.pattern and g.pattern.replace("〜", "") in seg_text]
                seg_expr = [e for e in all_expr if e.expression and e.expression.replace("〜", "") in seg_text]

                annotated_sentences.append(
                    AnnotatedSentenceResponse(
                        id=-(seg["sentence_index"]),
                        sentence_index=seg["sentence_index"],
                        text=seg_text,
                        start_offset=seg["start_offset"],
                        end_offset=seg["end_offset"],
                        has_high_learning_value=seg["has_high_learning_value"],
                        learning_value_reason=seg["learning_value_reason"],
                        translation_vi=trans_map.get(seg["sentence_index"]),
                        vocabularies=seg_vocab,
                        grammars=seg_grammar,
                        expressions=seg_expr,
                        furigana_html=ruby_html,
                        furigana_tokens=tokens,
                    )
                )
        else:
            for s in sorted(content.sentences, key=lambda x: x.sentence_index):
                ruby_html, tokens = furigana_service.generate_sentence_furigana(s.text)
                annotated_sentences.append(
                    AnnotatedSentenceResponse(
                        id=s.id,
                        sentence_index=s.sentence_index,
                        text=s.text,
                        start_offset=s.start_offset,
                        end_offset=s.end_offset,
                        has_high_learning_value=s.has_high_learning_value,
                        learning_value_reason=s.learning_value_reason,
                        translation_vi=trans_map.get(s.sentence_index),
                        vocabularies=vocab_by_sent.get(s.id, []),
                        grammars=gram_by_sent.get(s.id, []),
                        expressions=expr_by_sent.get(s.id, []),
                        furigana_html=ruby_html,
                        furigana_tokens=tokens,
                    )
                )

        # ── Auto-scrape from target URL if content is missing or too short ───
        raw_text = content.content or content.excerpt or ""
        meta = content.metadata_json or {}
        if not isinstance(meta, dict):
            meta = {}

        if (not raw_text or len(raw_text) < 300 or len(annotated_sentences) <= 1) and content.canonical_url and not meta.get("auto_scraped"):
            try:
                logger.info(f"Content {content_id}: content is short/missing ({len(raw_text)} chars) — executing auto-scrape from source.")
                meta["auto_scraped"] = True
                content.metadata_json = meta
                await db.commit()
                refreshed = await cls.refetch_content(db=db, content_id=content_id, user_id=user_id)
                if refreshed and refreshed.content and len(refreshed.content) > len(raw_text):
                    return refreshed
            except Exception as auto_err:
                logger.warning(f"Auto-scrape failed for content {content_id}: {auto_err}")
                meta["auto_scraped"] = True
                content.metadata_json = meta
                await db.commit()

        # ── Runtime fallback segmentation ────────────────────────────────────────
        # If the article has substantial text but the stored sentence list is
        # suspiciously short (e.g. enriched before the TextSegmenter fix was
        # deployed), re-segment on the fly WITHOUT touching the DB.  This gives
        # the reader the full article immediately while a background re-enrich
        # can be triggered separately if needed.
        expected_min_sentences = max(3, len(raw_text) // 200)  # ~200 chars per sentence
        if raw_text and len(annotated_sentences) < expected_min_sentences:
            logger.info(
                f"Content {content_id}: only {len(annotated_sentences)} DB sentences for "
                f"{len(raw_text)} chars — running runtime segmentation fallback."
            )
            runtime_segs = TextSegmenter.segment(raw_text)
            # Only use runtime segments if they produce more sentences
            if len(runtime_segs) > len(annotated_sentences):
                # Merge vocab/grammar into runtime sentences via substring matching
                all_vocab = [ContentVocabularyResponse.model_validate(v) for v in content.vocabularies]
                all_grammar = [ContentGrammarResponse.model_validate(g) for g in content.grammars]
                all_expr = [ContentExpressionResponse.model_validate(e) for e in content.expressions]

                annotated_sentences = []
                for seg in runtime_segs:
                    seg_text = seg["text"]
                    ruby_html, tokens = furigana_service.generate_sentence_furigana(seg_text)
                    seg_vocab = [v for v in all_vocab if v.surface_form and v.surface_form in seg_text]
                    seg_grammar = [g for g in all_grammar if g.pattern and g.pattern.replace("〜", "") in seg_text]
                    seg_expr = [e for e in all_expr if e.expression and e.expression.replace("〜", "") in seg_text]

                    annotated_sentences.append(
                        AnnotatedSentenceResponse(
                            id=-(seg["sentence_index"]),  # negative id = runtime (not persisted)
                            sentence_index=seg["sentence_index"],
                            text=seg_text,
                            start_offset=seg["start_offset"],
                            end_offset=seg["end_offset"],
                            has_high_learning_value=seg["has_high_learning_value"],
                            learning_value_reason=seg["learning_value_reason"],
                            translation_vi=None,
                            vocabularies=seg_vocab,
                            grammars=seg_grammar,
                            expressions=seg_expr,
                            furigana_html=ruby_html,
                            furigana_tokens=tokens,
                        )
                    )
                logger.info(
                    f"Content {content_id}: runtime fallback produced {len(annotated_sentences)} sentences."
                )
        # ────────────────────────────────────────────────────────────────────────

        # Find Prev & Next content IDs for smooth bottom navigation
        prev_stmt = (
            select(CanonicalContent.id)
            .where(and_(CanonicalContent.id < content_id, CanonicalContent.status == "PUBLISHED"))
            .order_by(desc(CanonicalContent.id))
            .limit(1)
        )
        prev_id = (await db.execute(prev_stmt)).scalar_one_or_none()

        next_stmt = (
            select(CanonicalContent.id)
            .where(and_(CanonicalContent.id > content_id, CanonicalContent.status == "PUBLISHED"))
            .order_by(CanonicalContent.id.asc())
            .limit(1)
        )
        next_id = (await db.execute(next_stmt)).scalar_one_or_none()

        enr = content.enrichment
        reading_time = FeedRankingService.calculate_reading_time(content.content or content.excerpt or content.title)

        diff_breakdown = {}
        if enr:
            diff_breakdown = {
                "overall": enr.overall_difficulty,
                "vocabulary": enr.vocabulary_difficulty,
                "grammar": enr.grammar_difficulty,
                "kanji": enr.kanji_difficulty,
                "sentence_complexity": enr.sentence_complexity,
                "conceptual": enr.conceptual_difficulty,
            }

        summaries = {}
        if enr:
            summaries = {
                "micro": enr.micro_summary,
                "short": enr.short_summary,
                "detailed": enr.detailed_summary,
            }

        reader_images = cls._parse_content_images(content)
        reader_cover = content.image_url or (reader_images[0]["url"] if reader_images else None)
        audio_url = (content.metadata_json or {}).get("audio_url") if isinstance(content.metadata_json, dict) else None

        return ReaderContentResponse(
            content_id=content.id,
            title=content.title,
            excerpt=content.excerpt,
            content=content.content,
            author=content.author,
            source_id=content.source_id,
            source_name=content.source.name if content.source else "Unknown",
            source_type=content.source.source_type if content.source else "WEB",
            source_url=content.canonical_url,
            image_url=reader_cover,
            audio_url=audio_url,
            images=reader_images,
            pages_fetched=cls._parse_pages_fetched(content),
            published_at=content.published_at or content.created_at,
            reading_time_minutes=reading_time,
            estimated_jlpt=enr.estimated_jlpt if enr else "N3",
            overall_difficulty=enr.overall_difficulty if enr else 5,
            difficulty_breakdown=diff_breakdown,
            difficulty_reasons=enr.difficulty_reasons if enr else [],
            summaries=summaries,
            topics=[enr.primary_topic] + (enr.secondary_topics or []) if enr else [],
            keywords=enr.keywords if enr else [],
            sentences=annotated_sentences,
            all_vocabularies=[ContentVocabularyResponse.model_validate(v) for v in sorted(content.vocabularies, key=lambda x: x.learning_priority, reverse=True)],
            all_grammars=[ContentGrammarResponse.model_validate(g) for g in content.grammars],
            all_expressions=[ContentExpressionResponse.model_validate(e) for e in content.expressions],
            is_saved=is_saved,
            progress_percent=progress_percent,
            last_sentence_index=last_sent_idx,
            prev_content_id=prev_id,
            next_content_id=next_id,
        )

    @classmethod
    async def translate_sentence_or_content(
        cls,
        db: AsyncSession,
        content_id: int,
        sentence_index: Optional[int] = None,
        target_language: str = "vi",
        model_provider: Optional[str] = None
    ) -> TranslateResponse:
        """Translates Japanese sentence/content on-demand with persistent DB caching."""
        # 1. Resolve AI provider & model without fallback
        provider, chosen_model = ai_provider_registry.get_active_provider_and_model(model_provider)

        # 2. Check cache for this specific provider and model
        stmt = select(ContentTranslation).where(
            and_(
                ContentTranslation.content_id == content_id,
                ContentTranslation.sentence_index == sentence_index,
                ContentTranslation.target_language == target_language,
                ContentTranslation.model_provider == provider.name,
                ContentTranslation.model_name == chosen_model,
            )
        )
        res = await db.execute(stmt)
        cached = res.scalars().first()
        if cached:
            return TranslateResponse(
                content_id=content_id,
                sentence_index=sentence_index,
                translated_text=cached.translated_text,
                cached=True
            )

        # 2. Fetch Japanese source text
        c_stmt = (
            select(CanonicalContent)
            .where(CanonicalContent.id == content_id)
            .options(selectinload(CanonicalContent.sentences))
        )
        c_res = await db.execute(c_stmt)
        content = c_res.scalars().first()
        if not content:
            raise ValueError(f"Content with id {content_id} not found")

        if sentence_index is not None:
            target_sentence = next((s for s in content.sentences if s.sentence_index == sentence_index), None)
            text_to_translate = target_sentence.text if target_sentence else ""
        else:
            text_to_translate = f"{content.title}\n\n{content.content or content.excerpt or ''}"

        if not text_to_translate:
            return TranslateResponse(content_id=content_id, sentence_index=sentence_index, translated_text="", cached=False)

        # 3. Call AI provider for translation
        prompt = (
            f"Dịch đoạn văn bản tiếng Nhật sau đây sang tiếng Việt một cách tự nhiên, mạch lạc, chính xác về mặt ngữ nghĩa:\n\n"
            f"<japanese_source_content>\n{text_to_translate}\n</japanese_source_content>"
        )
        sys_inst = (
            "Bạn là dịch giả tiếng Nhật - tiếng Việt chuyên nghiệp.\n"
            "Dịch sát nghĩa và mượt mà. Chỉ trả về JSON theo schema: {\"translation\": \"nội dung dịch\"}"
        )
        schema = {"type": "object", "properties": {"translation": {"type": "string"}}, "required": ["translation"]}

        try:
            gen_result = await provider.generate_structured(
                prompt=prompt,
                system_instruction=sys_inst,
                response_schema=schema,
                model=chosen_model,
            )
            translated_text = gen_result.structured_data.get("translation", "")
            if not translated_text or not isinstance(translated_text, str) or not translated_text.strip():
                raise ValueError("Mô hình AI không trả về nội dung bản dịch hợp lệ.")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"AI Translation failed on {provider.name}/{chosen_model}: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Lỗi dịch câu bằng AI ({provider.display_name} - {chosen_model}): {redact_secrets(str(e))}"
            )

        # 4. Save to persistent cache
        new_trans = ContentTranslation(
            content_id=content_id,
            sentence_index=sentence_index,
            target_language=target_language,
            translated_text=translated_text.strip(),
            model_provider=provider.name,
            model_name=chosen_model
        )
        db.add(new_trans)
        await db.commit()

        return TranslateResponse(
            content_id=content_id,
            sentence_index=sentence_index,
            translated_text=translated_text.strip(),
            cached=False
        )

    @classmethod
    async def explain_sentence(
        cls,
        db: AsyncSession,
        content_id: int,
        sentence_index: int,
        model_provider: Optional[str] = None
    ) -> SentenceExplanationResponse:
        """Explains sentence grammar, nuance, and literal breakdown with persistent caching."""
        # 1. Check cache
        stmt = select(ContentExplanation).where(
            and_(
                ContentExplanation.content_id == content_id,
                ContentExplanation.sentence_index == sentence_index,
            )
        )
        res = await db.execute(stmt)
        cached = res.scalars().first()
        if cached:
            return SentenceExplanationResponse(
                content_id=content_id,
                sentence_index=sentence_index,
                literal_translation=cached.literal_translation,
                natural_meaning=cached.natural_meaning,
                context_nuance=cached.context_nuance,
                key_grammar_notes=cached.key_grammar_notes or [],
                cached=True
            )

        # 2. Fetch sentence text
        c_stmt = (
            select(CanonicalContent)
            .where(CanonicalContent.id == content_id)
            .options(selectinload(CanonicalContent.sentences))
        )
        c_res = await db.execute(c_stmt)
        content = c_res.scalars().first()
        if not content:
            raise ValueError(f"Content with id {content_id} not found")

        target_sentence = next((s for s in content.sentences if s.sentence_index == sentence_index), None)
        text = target_sentence.text if target_sentence else ""

        # 3. Call AI provider
        provider, chosen_model = ai_provider_registry.get_active_provider_and_model(model_provider)
        prompt = (
            f"Phân tích sư phạm câu tiếng Nhật sau trong ngữ cảnh bài viết:\n\n"
            f"<japanese_source_content>\n{text}\n</japanese_source_content>"
        )
        sys_inst = (
            "Bạn là giáo viên tiếng Nhật giải thích ngữ pháp và sắc thái cho người học.\n"
            "Định dạng nội dung các trường giải thích bằng Markdown rõ ràng (in đậm **từ khóa/cấu trúc**, dùng `backticks` cho từ tiếng Nhật).\n"
            "Trả về JSON định dạng sau:\n"
            "{\n"
            "  \"literal_translation\": \"dịch từng từ / sát nghĩa đen\",\n"
            "  \"natural_meaning\": \"ý nghĩa tự nhiên trong ngữ cảnh\",\n"
            "  \"context_nuance\": \"sắc thái, văn phong (trang trọng/thân mật/nhấn mạnh điều gì, định dạng Markdown)\",\n"
            "  \"key_grammar_notes\": [\"điểm ngữ pháp 1 (định dạng Markdown)\", \"điểm ngữ pháp 2\"]\n"
            "}"
        )
        schema = {
            "type": "object",
            "properties": {
                "literal_translation": {"type": "string"},
                "natural_meaning": {"type": "string"},
                "context_nuance": {"type": "string"},
                "key_grammar_notes": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["literal_translation", "natural_meaning", "context_nuance"]
        }

        try:
            gen_result = await provider.generate_structured(
                prompt=prompt,
                system_instruction=sys_inst,
                response_schema=schema,
                model=chosen_model,
            )
            data = gen_result.structured_data
            if not data or not isinstance(data, dict):
                raise ValueError("Mô hình AI không trả về dữ liệu phân tích hợp lệ.")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"AI Sentence Explanation failed on {provider.name}/{chosen_model}: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Lỗi phân tích câu bằng AI ({provider.display_name} - {chosen_model}): {redact_secrets(str(e))}"
            )

        # 4. Save to cache
        expl = ContentExplanation(
            content_id=content_id,
            sentence_index=sentence_index,
            literal_translation=data.get("literal_translation", text),
            natural_meaning=data.get("natural_meaning", text),
            context_nuance=data.get("context_nuance", "Văn phong tự nhiên"),
            key_grammar_notes=data.get("key_grammar_notes", []),
        )
        db.add(expl)
        await db.commit()

        return SentenceExplanationResponse(
            content_id=content_id,
            sentence_index=sentence_index,
            literal_translation=expl.literal_translation,
            natural_meaning=expl.natural_meaning,
            context_nuance=expl.context_nuance,
            key_grammar_notes=expl.key_grammar_notes,
            cached=False
        )

    @classmethod
    async def lookup_selection(
        cls,
        db: AsyncSession,
        query: str,
        context: Optional[str] = None,
        content_id: Optional[int] = None,
        model_provider: Optional[str] = None,
    ) -> SelectionLookupResponse:
        """Explains a free-selected word/phrase (bôi đen) in its sentence context.

        No persistent cache: lookups are only persisted when the user
        explicitly saves them into the Personal Knowledge Library.
        """
        term = (query or "").strip()
        if len(term) < 2 or len(term) > 80:
            raise ValueError("Cụm tra cứu phải dài từ 2 đến 80 ký tự.")

        provider, chosen_model = ai_provider_registry.get_active_provider_and_model(model_provider)

        context_block = f"<sentence_context>\n{(context or '').strip()[:1000]}\n</sentence_context>" if (context or "").strip() else ""
        prompt = (
            f"Giải nghĩa từ/cụm tiếng Nhật mà người học vừa bôi đen trong bài đọc:\n\n"
            f"<selected_text>\n{term}\n</selected_text>\n"
            f"{context_block}"
        )
        sys_inst = (
            "Bạn là từ điển Nhật-Việt theo ngữ cảnh cho người học tiếng Nhật.\n"
            "Trả về JSON định dạng sau:\n"
            "{\n"
            "  \"reading\": \"cách đọc hiragana/katakana của cụm được chọn (giữ nguyên nếu là số/ký hiệu)\",\n"
            "  \"meaning_vi\": \"nghĩa tiếng Việt chính xác nhất TRONG NGỮ CẢNH câu (1-2 dòng, không lan man)\",\n"
            "  \"part_of_speech\": \"từ loại (noun/verb/adjective/adverb/expression/other)\",\n"
            "  \"jlpt_level\": \"cấp độ JLPT ước lượng (N5/N4/N3/N2/N1, để trống nếu không chắc)\",\n"
            "  \"nuance\": \"sắc thái sử dụng: trang trọng hay thân mật, nhấn mạnh điều gì, dễ nhầm với từ nào (2-3 câu)\",\n"
            "  \"collocation\": \"cụm từ đi kèm chuẩn nhất của người bản xứ (dạng: Cụm + nghĩa ngắn)\",\n"
            "  \"example_usage\": \"1 câu ví dụ ngắn dùng cụm này kèm nghĩa tiếng Việt\",\n"
            "  \"examples\": [{\"sentence_ja\": \"câu ví dụ thực tế 1\", \"sentence_vi\": \"nghĩa tiếng Việt 1\"}, {\"sentence_ja\": \"câu ví dụ thực tế 2\", \"sentence_vi\": \"nghĩa tiếng Việt 2\"}],\n"
            "  \"alternatives\": [{\"expression\": \"từ gần nghĩa 1\", \"reading\": \"cách đọc\", \"meaning_vi\": \"nghĩa\", \"difference\": \"khác ở điểm nào (1 dòng)\"}]\n"
            "}"
        )
        schema = {
            "type": "object",
            "properties": {
                "reading": {"type": "string"},
                "meaning_vi": {"type": "string"},
                "part_of_speech": {"type": "string"},
                "jlpt_level": {"type": "string"},
                "nuance": {"type": "string"},
                "collocation": {"type": "string"},
                "example_usage": {"type": "string"},
                "examples": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "sentence_ja": {"type": "string"},
                            "sentence_vi": {"type": "string"},
                        },
                    },
                },
                "alternatives": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "expression": {"type": "string"},
                            "reading": {"type": "string"},
                            "meaning_vi": {"type": "string"},
                            "difference": {"type": "string"},
                        },
                    },
                },
            },
            "required": ["reading", "meaning_vi"]
        }

        try:
            gen_result = await provider.generate_structured(
                prompt=prompt,
                system_instruction=sys_inst,
                response_schema=schema,
                model=chosen_model,
            )
            data = gen_result.structured_data
            if not data or not isinstance(data, dict) or not data.get("meaning_vi"):
                raise ValueError("Mô hình AI không trả về nghĩa hợp lệ.")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"AI Selection Lookup failed on {provider.name}/{chosen_model}: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Lỗi tra từ bằng AI ({provider.display_name} - {chosen_model}): {redact_secrets(str(e))}"
            )

        return SelectionLookupResponse(
            query=term,
            reading=data.get("reading") or term,
            meaning_vi=data.get("meaning_vi", ""),
            part_of_speech=data.get("part_of_speech") or "noun",
            jlpt_level=data.get("jlpt_level") or "",
            nuance=data.get("nuance") or "",
            collocation=data.get("collocation") or "",
            example_usage=data.get("example_usage") or "",
            examples=[
                e for e in (data.get("examples") or [])
                if isinstance(e, dict) and e.get("sentence_ja")
            ][:3],
            alternatives=[
                a for a in (data.get("alternatives") or [])
                if isinstance(a, dict) and a.get("expression")
            ][:4],
            model_provider=provider.name,
            model_name=chosen_model,
        )

    @classmethod
    async def lookup_expression(
        cls,
        db: AsyncSession,
        expression: str,
        context: Optional[str] = None,
        content_id: Optional[int] = None,
        model_provider: Optional[str] = None,
    ) -> ExpressionLookupResponse:
        """Explains a Japanese collocation/expression in its sentence context.

        Returns meaning, usage situations, composition, real examples, and
        related expressions. No persistent cache: results persist only when
        the user saves the expression into the Personal Knowledge Library.
        """
        expr = (expression or "").strip()
        if len(expr) < 1 or len(expr) > 80:
            raise ValueError("Cụm từ tra cứu phải dài từ 1 đến 80 ký tự.")

        provider, chosen_model = ai_provider_registry.get_active_provider_and_model(model_provider)

        context_block = f"<sentence_context>\n{(context or '').strip()[:1000]}\n</sentence_context>" if (context or "").strip() else ""
        prompt = (
            f"Giải thích cụm từ/collocation tiếng Nhật mà người học vừa chọn trong bài đọc:\n\n"
            f"<selected_expression>\n{expr}\n</selected_expression>\n"
            f"{context_block}"
        )
        sys_inst = (
            "Bạn là từ điển Nhật-Việt theo ngữ cảnh cho người học tiếng Nhật.\n"
            "Trả về JSON định dạng sau:\n"
            "{\n"
            "  \"meaning\": \"nghĩa tiếng Việt chính xác nhất TRONG NGỮ CẢNH câu (1-2 dòng, không lan man)\",\n"
            "  \"usage_context\": \"hoàn cảnh sử dụng: văn nói hay văn viết, trang trọng hay thân mật, dùng khi nào, đi kèm từ loại gì (2-3 câu)\",\n"
            "  \"composition\": \"cấu tạo cụm: các từ thành phần + vai trò từng từ (1-2 dòng)\",\n"
            "  \"examples\": [{\"sentence_ja\": \"câu ví dụ thực tế 1\", \"sentence_vi\": \"nghĩa tiếng Việt 1\"}, {\"sentence_ja\": \"câu ví dụ thực tế 2\", \"sentence_vi\": \"nghĩa tiếng Việt 2\"}],\n"
            "  \"alternatives\": [{\"expression\": \"cụm gần nghĩa 1\", \"reading\": \"cách đọc\", \"meaning_vi\": \"nghĩa\", \"difference\": \"khác ở điểm nào (1 dòng)\"}]\n"
            "}"
        )
        schema = {
            "type": "object",
            "properties": {
                "meaning": {"type": "string"},
                "usage_context": {"type": "string"},
                "composition": {"type": "string"},
                "examples": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "sentence_ja": {"type": "string"},
                            "sentence_vi": {"type": "string"},
                        },
                    },
                },
                "alternatives": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "expression": {"type": "string"},
                            "reading": {"type": "string"},
                            "meaning_vi": {"type": "string"},
                            "difference": {"type": "string"},
                        },
                    },
                },
            },
            "required": ["meaning"]
        }

        try:
            gen_result = await provider.generate_structured(
                prompt=prompt,
                system_instruction=sys_inst,
                response_schema=schema,
                model=chosen_model,
            )
            data = gen_result.structured_data
            if not data or not isinstance(data, dict) or not data.get("meaning"):
                raise ValueError("Mô hình AI không trả về giải thích hợp lệ.")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"AI Expression Lookup failed on {provider.name}/{chosen_model}: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Lỗi tra cụm từ bằng AI ({provider.display_name} - {chosen_model}): {redact_secrets(str(e))}"
            )

        return ExpressionLookupResponse(
            expression=expr,
            meaning=data.get("meaning", ""),
            usage_context=data.get("usage_context") or "",
            composition=data.get("composition") or "",
            examples=[
                e for e in (data.get("examples") or [])
                if isinstance(e, dict) and e.get("sentence_ja")
            ][:3],
            alternatives=[
                a for a in (data.get("alternatives") or [])
                if isinstance(a, dict) and a.get("expression")
            ][:4],
            model_provider=provider.name,
            model_name=chosen_model,
        )

    @classmethod
    async def lookup_grammar(
        cls,
        db: AsyncSession,
        pattern: str,
        context: Optional[str] = None,
        content_id: Optional[int] = None,
        model_provider: Optional[str] = None,
    ) -> GrammarLookupResponse:
        """Explains a Japanese grammar pattern in its sentence context.

        Returns formation, meaning, usage situations, and real examples.
        No persistent cache: results persist only when the user saves the
        pattern into the Personal Knowledge Library.
        """
        pat = (pattern or "").strip()
        if len(pat) < 2 or len(pat) > 80:
            raise ValueError("Mẫu ngữ pháp tra cứu phải dài từ 2 đến 80 ký tự.")

        provider, chosen_model = ai_provider_registry.get_active_provider_and_model(model_provider)

        context_block = f"<sentence_context>\n{(context or '').strip()[:1000]}\n</sentence_context>" if (context or "").strip() else ""
        prompt = (
            f"Giải thích mẫu ngữ pháp tiếng Nhật mà người học vừa chọn trong bài đọc:\n\n"
            f"<grammar_pattern>\n{pat}\n</grammar_pattern>\n"
            f"{context_block}"
        )
        sys_inst = (
            "Bạn là giáo viên ngữ pháp Nhật-Việt cho người học tiếng Nhật.\n"
            "Trả về JSON định dạng sau:\n"
            "{\n"
            "  \"formation\": \"công thức cấu tạo mẫu câu (dạng: Thể từ điển + pattern, N + pattern... 1-2 dòng)\",\n"
            "  \"meaning\": \"ý nghĩa cốt lõi TRONG NGỮ CẢNH câu (1-2 dòng, không lan man)\",\n"
            "  \"usage_context\": \"hoàn cảnh sử dụng: văn nói hay văn viết, trang trọng hay thân mật, dùng khi nào (2-3 câu)\",\n"
            "  \"examples\": [{\"sentence_ja\": \"câu ví dụ thực tế 1\", \"sentence_vi\": \"nghĩa tiếng Việt 1\"}, {\"sentence_ja\": \"câu ví dụ thực tế 2\", \"sentence_vi\": \"nghĩa tiếng Việt 2\"}, {\"sentence_ja\": \"câu ví dụ thực tế 3\", \"sentence_vi\": \"nghĩa tiếng Việt 3\"}]\n"
            "}"
        )
        schema = {
            "type": "object",
            "properties": {
                "formation": {"type": "string"},
                "meaning": {"type": "string"},
                "usage_context": {"type": "string"},
                "examples": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "sentence_ja": {"type": "string"},
                            "sentence_vi": {"type": "string"},
                        },
                    },
                },
            },
            "required": ["formation", "meaning"]
        }

        try:
            gen_result = await provider.generate_structured(
                prompt=prompt,
                system_instruction=sys_inst,
                response_schema=schema,
                model=chosen_model,
            )
            data = gen_result.structured_data
            if not data or not isinstance(data, dict) or not data.get("meaning"):
                raise ValueError("Mô hình AI không trả về giải thích hợp lệ.")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"AI Grammar Lookup failed on {provider.name}/{chosen_model}: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Lỗi tra ngữ pháp bằng AI ({provider.display_name} - {chosen_model}): {redact_secrets(str(e))}"
            )

        return GrammarLookupResponse(
            pattern=pat,
            formation=data.get("formation") or "",
            meaning=data.get("meaning", ""),
            usage_context=data.get("usage_context") or "",
            examples=[
                e for e in (data.get("examples") or [])
                if isinstance(e, dict) and e.get("sentence_ja")
            ][:3],
            model_provider=provider.name,
            model_name=chosen_model,
        )

    @classmethod
    async def toggle_save(cls, db: AsyncSession, user_id: str, content_id: int) -> bool:
        """Saves content if not saved, unsaves if already saved. Returns new saved status."""
        stmt = select(UserSavedContent).where(
            and_(UserSavedContent.user_id == user_id, UserSavedContent.content_id == content_id)
        )
        res = await db.execute(stmt)
        existing = res.scalars().first()

        if existing:
            await db.delete(existing)
            await db.commit()
            return False
        else:
            db.add(UserSavedContent(user_id=user_id, content_id=content_id))
            await db.commit()
            return True

    @classmethod
    async def update_progress(
        cls,
        db: AsyncSession,
        user_id: str,
        content_id: int,
        progress_percent: int,
        last_sentence_index: int,
        time_spent_seconds: int,
        completed: bool
    ) -> ProgressUpdateResponse:
        """Debounced updates to reading progress and logs to reading history."""
        stmt = select(UserReadingProgress).where(
            and_(UserReadingProgress.user_id == user_id, UserReadingProgress.content_id == content_id)
        )
        res = await db.execute(stmt)
        prog = res.scalars().first()

        if prog:
            prog.progress_percent = max(prog.progress_percent, progress_percent)
            prog.last_sentence_index = last_sentence_index
            prog.time_spent_seconds += time_spent_seconds
            if completed or prog.progress_percent >= 90:
                prog.completed = True
            prog.last_read_at = datetime.utcnow()
        else:
            prog = UserReadingProgress(
                user_id=user_id,
                content_id=content_id,
                progress_percent=progress_percent,
                last_sentence_index=last_sentence_index,
                time_spent_seconds=time_spent_seconds,
                completed=completed or (progress_percent >= 90)
            )
            db.add(prog)

        # Log session to history
        db.add(
            UserReadingHistory(
                user_id=user_id,
                content_id=content_id,
                progress_percent=progress_percent,
                time_spent_seconds=time_spent_seconds,
                read_at=datetime.utcnow()
            )
        )

        await db.commit()
        return ProgressUpdateResponse(
            success=True,
            progress_percent=prog.progress_percent,
            completed=prog.completed
        )

    @classmethod
    async def get_saved(
        cls,
        db: AsyncSession,
        user_id: str,
        page: int = 1,
        page_size: int = 20
    ) -> FeedListResponse:
        """Retrieves user's saved bookmarked contents."""
        stmt = (
            select(CanonicalContent)
            .join(UserSavedContent, UserSavedContent.content_id == CanonicalContent.id)
            .where(UserSavedContent.user_id == user_id)
            .order_by(desc(UserSavedContent.created_at))
            .options(
                selectinload(CanonicalContent.source),
                selectinload(CanonicalContent.enrichment),
            )
        )
        res = await db.execute(stmt)
        contents = res.scalars().all()

        total = len(contents)
        start = (page - 1) * page_size
        paginated = contents[start:start + page_size]

        items = []
        for c in paginated:
            enr = c.enrichment
            s = c.source
            reading_time = FeedRankingService.calculate_reading_time(c.content or c.excerpt or c.title)
            saved_imgs = cls._parse_content_images(c)
            saved_cover = c.image_url or (saved_imgs[0]["url"] if saved_imgs else None)
            items.append(
                FeedItemResponse(
                    content_id=c.id,
                    title=c.title,
                    excerpt=c.excerpt or (c.content[:140] if c.content else None),
                    source_id=s.id if s else 0,
                    source_name=s.name if s else "Unknown",
                    source_slug=s.slug if s else "unknown",
                    source_type=s.source_type if s else "WEB",
                    content_type=c.content_type,
                    canonical_url=c.canonical_url,
                    image_url=saved_cover,
                    images=saved_imgs,
                    images_count=len(saved_imgs),
                    published_at=c.published_at or c.created_at,
                    reading_time_minutes=reading_time,
                    overall_difficulty=enr.overall_difficulty if enr else 5,
                    estimated_jlpt=enr.estimated_jlpt if enr else "N3",
                    quality_score=enr.quality_score if enr else 80,
                    learning_readiness_score=enr.learning_readiness_score if enr else 80,
                    primary_topic=enr.primary_topic if enr else "General",
                    secondary_topics=enr.secondary_topics if enr else [],
                    content_role=enr.content_role if enr else "FORMAL",
                    is_saved=True,
                    progress_percent=100,
                )
            )

        return FeedListResponse(items=items, total=total, page=page, page_size=page_size, has_next=(start + page_size < total))

    @classmethod
    async def get_history(cls, db: AsyncSession, user_id: str) -> ReadingHistoryGroupedResponse:
        """Retrieves reading history grouped chronologically: Today, Yesterday, This Week, Older."""
        stmt = (
            select(UserReadingHistory, CanonicalContent)
            .join(CanonicalContent, CanonicalContent.id == UserReadingHistory.content_id)
            .options(selectinload(CanonicalContent.source), selectinload(CanonicalContent.enrichment))
            .where(UserReadingHistory.user_id == user_id)
            .order_by(desc(UserReadingHistory.read_at))
            .limit(100)
        )
        res = await db.execute(stmt)
        rows = res.all()

        today_dt = datetime.utcnow().date()
        yesterday_dt = today_dt - timedelta(days=1)
        week_ago_dt = today_dt - timedelta(days=7)

        grouped = ReadingHistoryGroupedResponse()
        seen_content_today = set()

        for h, c in rows:
            r_date = h.read_at.date()
            enr = c.enrichment
            s = c.source
            reading_time = FeedRankingService.calculate_reading_time(c.content or c.excerpt or c.title)

            item = ReadingHistoryItemResponse(
                content_id=c.id,
                title=c.title,
                source_name=s.name if s else "Unknown",
                image_url=c.image_url,
                estimated_jlpt=enr.estimated_jlpt if enr else "N3",
                reading_time_minutes=reading_time,
                read_at=h.read_at,
                progress_percent=h.progress_percent,
                completed=(h.progress_percent >= 90)
            )

            if r_date == today_dt:
                if c.id not in seen_content_today:
                    grouped.today.append(item)
                    seen_content_today.add(c.id)
            elif r_date == yesterday_dt:
                grouped.yesterday.append(item)
            elif r_date >= week_ago_dt:
                grouped.this_week.append(item)
            else:
                grouped.older.append(item)

        return grouped

    @classmethod
    async def get_continue_reading(cls, db: AsyncSession, user_id: str, limit: int = 5) -> List[FeedItemResponse]:
        """Retrieves in-progress articles that user hasn't completed yet."""
        stmt = (
            select(UserReadingProgress, CanonicalContent)
            .join(CanonicalContent, CanonicalContent.id == UserReadingProgress.content_id)
            .options(selectinload(CanonicalContent.source), selectinload(CanonicalContent.enrichment))
            .where(
                and_(
                    UserReadingProgress.user_id == user_id,
                    UserReadingProgress.completed == False,
                    UserReadingProgress.progress_percent > 0,
                    UserReadingProgress.progress_percent < 95,
                )
            )
            .order_by(desc(UserReadingProgress.last_read_at))
            .limit(limit)
        )
        res = await db.execute(stmt)
        rows = res.all()

        items = []
        for p, c in rows:
            enr = c.enrichment
            s = c.source
            reading_time = FeedRankingService.calculate_reading_time(c.content or c.excerpt or c.title)
            prog_imgs = cls._parse_content_images(c)
            prog_cover = c.image_url or (prog_imgs[0]["url"] if prog_imgs else None)
            items.append(
                FeedItemResponse(
                    content_id=c.id,
                    title=c.title,
                    excerpt=c.excerpt or (c.content[:140] if c.content else None),
                    source_id=s.id if s else 0,
                    source_name=s.name if s else "Unknown",
                    source_slug=s.slug if s else "unknown",
                    source_type=s.source_type if s else "WEB",
                    content_type=c.content_type,
                    canonical_url=c.canonical_url,
                    image_url=prog_cover,
                    images=prog_imgs,
                    images_count=len(prog_imgs),
                    published_at=c.published_at or c.created_at,
                    reading_time_minutes=reading_time,
                    overall_difficulty=enr.overall_difficulty if enr else 5,
                    estimated_jlpt=enr.estimated_jlpt if enr else "N3",
                    quality_score=enr.quality_score if enr else 80,
                    learning_readiness_score=enr.learning_readiness_score if enr else 80,
                    primary_topic=enr.primary_topic if enr else "General",
                    secondary_topics=enr.secondary_topics if enr else [],
                    content_role=enr.content_role if enr else "FORMAL",
                    is_saved=False,
                    progress_percent=p.progress_percent,
                )
            )
        return items

    # Related-rail hybrid ranking weights
    JLPT_ORDER = {"N5": 1, "N4": 2, "N3": 3, "N2": 4, "N1": 5, "N1+": 6}
    RELATED_POOL_SIZE = 150

    @classmethod
    def _jlpt_rank(cls, jlpt: Optional[str]) -> int:
        return cls.JLPT_ORDER.get((jlpt or "N3").strip().upper(), 3)

    @classmethod
    async def get_related_contents(cls, db: AsyncSession, content_id: int, limit: int = 6) -> List[FeedItemResponse]:
        """Ranks related articles with a hybrid multi-signal score + MMR diversity.

        Signals: primary/secondary topic overlap, keyword overlap, JLPT
        proximity, shared vocabulary, recency, quality/readiness, same source
        and content-type affinity. Each item carries human-readable
        match_reasons for the UI rail.
        """
        # 1. Target signals
        enr_stmt = select(ContentEnrichment).where(ContentEnrichment.content_id == content_id)
        enr = (await db.execute(enr_stmt)).scalars().first()

        target_stmt = select(CanonicalContent).where(CanonicalContent.id == content_id)
        target = (await db.execute(target_stmt)).scalars().first()
        if not target:
            return []

        t_topic = ((enr.primary_topic if enr else None) or "General").strip()
        t_topic_low = t_topic.lower()
        t_secondary = {str(t).strip().lower() for t in ((enr.secondary_topics if enr else None) or []) if str(t).strip()}
        t_keywords = {str(k).strip().lower() for k in ((enr.keywords if enr else None) or []) if str(k).strip()}
        t_jlpt = cls._jlpt_rank(enr.estimated_jlpt if enr else "N3")
        t_jlpt_label = (enr.estimated_jlpt if enr else "N3") or "N3"
        t_source_id = target.source_id
        t_content_type = (target.content_type or "").upper()

        v_stmt = select(ContentVocabulary.normalized_form).where(
            ContentVocabulary.content_id == content_id
        )
        t_vocab = {str(v).strip() for v in (await db.execute(v_stmt)).scalars().all() if str(v).strip()}

        # 2. Candidate pool: newest published Japanese articles (excluding current)
        pool_stmt = (
            select(CanonicalContent)
            .outerjoin(CanonicalContent.enrichment)
            .where(
                and_(
                    CanonicalContent.id != content_id,
                    CanonicalContent.status == "PUBLISHED",
                    CanonicalContent.language_status != "NON_JA",
                )
            )
            .options(selectinload(CanonicalContent.source), selectinload(CanonicalContent.enrichment))
            .order_by(desc(CanonicalContent.published_at))
            .limit(cls.RELATED_POOL_SIZE)
        )
        pool = (await db.execute(pool_stmt)).scalars().all()
        if not pool:
            return []

        # 3. Vocabulary overlap sets for the whole pool in one query
        pool_ids = [c.id for c in pool]
        pv_stmt = select(ContentVocabulary.content_id, ContentVocabulary.normalized_form).where(
            ContentVocabulary.content_id.in_(pool_ids)
        )
        pool_vocab: Dict[int, set] = {cid: set() for cid in pool_ids}
        for cid, norm in (await db.execute(pv_stmt)).all():
            if norm and str(norm).strip():
                pool_vocab.setdefault(cid, set()).add(str(norm).strip())

        now = datetime.utcnow()

        def score_candidate(c) -> tuple[float, List[str], dict]:
            c_enr = c.enrichment
            c_topic = ((c_enr.primary_topic if c_enr else None) or "General").strip()
            c_secondary = {str(t).strip().lower() for t in ((c_enr.secondary_topics if c_enr else None) or []) if str(t).strip()}
            c_keywords = {str(k).strip().lower() for k in ((c_enr.keywords if c_enr else None) or []) if str(k).strip()}
            c_jlpt_label = (c_enr.estimated_jlpt if c_enr else "N3") or "N3"

            score = 0.0
            reasons: List[str] = []

            if c_topic.lower() == t_topic_low and t_topic_low != "general":
                score += 40.0
                reasons.append(f"Cùng chủ đề {c_topic}")
            shared_sec = (t_secondary & c_secondary) - {t_topic_low}
            if shared_sec:
                score += min(20.0, 10.0 * len(shared_sec))
                reasons.append(f"Chung chủ đề {sorted(shared_sec)[0].title()}")
            shared_kw = t_keywords & c_keywords
            if shared_kw:
                score += min(15.0, 5.0 * len(shared_kw))
                reasons.append(f"Chung từ khóa {sorted(shared_kw)[0]}")
            shared_vocab = t_vocab & pool_vocab.get(c.id, set())
            if shared_vocab:
                score += min(20.0, 2.0 * len(shared_vocab))
                reasons.append(f"Chung {len(shared_vocab)} từ vựng")
            jlpt_diff = abs(cls._jlpt_rank(c_jlpt_label) - t_jlpt)
            score += 15.0 * (1.0 - jlpt_diff / 5.0)
            if jlpt_diff == 0:
                reasons.append(f"Cùng {c_jlpt_label}")

            pub = c.published_at or c.created_at
            age_days = max(0, (now - pub).days) if pub else 365
            score += max(0.0, 5.0 * (1.0 - age_days / 180.0))
            if age_days <= 7:
                reasons.append("Mới đăng")

            q = ((c_enr.quality_score if c_enr else 80) + (c_enr.learning_readiness_score if c_enr else 80)) / 2.0
            score += (q / 100.0) * 5.0

            if t_source_id and c.source_id == t_source_id:
                score += 3.0
                s_name = c.source.name if c.source else None
                if s_name:
                    reasons.append(f"Cùng nguồn {s_name}")
            if t_content_type and (c.content_type or "").upper() == t_content_type:
                score += 2.0

            fingerprint = {
                "topic": c_topic.lower(),
                "keywords": c_keywords,
            }
            return score, reasons[:2] if reasons else ["Gợi ý cho bạn"], fingerprint

        scored = [(c, *score_candidate(c)) for c in pool]

        # 4. MMR selection: relevance minus similarity-to-already-selected
        selected: List[tuple] = []
        remaining = scored[:]
        mmr_lambda = 0.7
        while remaining and len(selected) < limit:
            best = None
            best_mmr = None
            for cand in remaining:
                _, base_score, _, fp = cand
                if not selected:
                    mmr = base_score
                else:
                    sims = []
                    for _, _, _, sel_fp in selected:
                        topic_sim = 1.0 if fp["topic"] == sel_fp["topic"] else 0.0
                        union = fp["keywords"] | sel_fp["keywords"]
                        kw_sim = (len(fp["keywords"] & sel_fp["keywords"]) / len(union)) if union else 0.0
                        sims.append(0.5 * topic_sim + 0.5 * kw_sim)
                    mmr = mmr_lambda * base_score - (1.0 - mmr_lambda) * 40.0 * max(sims)
                if best_mmr is None or mmr > best_mmr:
                    best_mmr = mmr
                    best = cand
            selected.append(best)
            remaining.remove(best)

        items = []
        for c, base_score, reasons, _ in selected:
            c_enr = c.enrichment
            s = c.source
            reading_time = FeedRankingService.calculate_reading_time(c.content or c.excerpt or c.title)
            rel_imgs = cls._parse_content_images(c)
            rel_cover = c.image_url or (rel_imgs[0]["url"] if rel_imgs else None)
            items.append(
                FeedItemResponse(
                    content_id=c.id,
                    title=c.title,
                    excerpt=c.excerpt or (c.content[:140] if c.content else None),
                    source_id=s.id if s else 0,
                    source_name=s.name if s else "Unknown",
                    source_slug=s.slug if s else "unknown",
                    source_type=s.source_type if s else "WEB",
                    content_type=c.content_type,
                    canonical_url=c.canonical_url,
                    image_url=rel_cover,
                    images=rel_imgs,
                    images_count=len(rel_imgs),
                    published_at=c.published_at or c.created_at,
                    reading_time_minutes=reading_time,
                    overall_difficulty=c_enr.overall_difficulty if c_enr else 5,
                    estimated_jlpt=c_enr.estimated_jlpt if c_enr else "N3",
                    quality_score=c_enr.quality_score if c_enr else 80,
                    learning_readiness_score=c_enr.learning_readiness_score if c_enr else 80,
                    primary_topic=c_enr.primary_topic if c_enr else "General",
                    secondary_topics=c_enr.secondary_topics if c_enr else [],
                    content_role=c_enr.content_role if c_enr else "FORMAL",
                    is_saved=False,
                    progress_percent=0,
                    match_reasons=reasons,
                    match_score=round(base_score, 1),
                )
            )
        return items

    @classmethod
    async def refetch_content(
        cls,
        db: AsyncSession,
        content_id: int,
        user_id: str,
    ) -> Optional[ReaderContentResponse]:
        """Fetches the live original article URL, re-extracts full body text, updates canonical content,
        re-enriches sentences and linguistic data, and returns the updated reader content."""
        stmt = (
            select(CanonicalContent)
            .where(CanonicalContent.id == content_id)
            .options(
                selectinload(CanonicalContent.source),
                selectinload(CanonicalContent.enrichment),
            )
        )
        res = await db.execute(stmt)
        content = res.scalars().first()
        if not content:
            return None

        target_url = content.canonical_url
        if not target_url:
            raise ValueError("No canonical URL found for this content item.")

        SSRFValidator.validate_url(target_url)

        source_config = {}
        source_headers = {}
        if content.source:
            source_config = getattr(content.source, "config_json", None) or {}
            source_headers = getattr(content.source, "headers_json", None) or {}

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": (source_config.get("referer") if isinstance(source_config, dict) else None) or "https://www.google.co.jp/",
        }
        if isinstance(source_headers, dict):
            headers.update(source_headers)

        async with create_async_client(headers=headers, timeout=15.0) as client:
            async def _http_get(url: str):
                try:
                    SSRFValidator.validate_url(url)
                except Exception:
                    return None
                try:
                    r = await client.get(url)
                    return (r.status_code, r.text)
                except Exception:
                    return None

            first_html, _via = await fetch_html_best_effort(
                target_url, _http_get, headers=headers, config=source_config,
            )
            if not first_html:
                raise RuntimeError(f"Could not fetch {target_url} (direct + browser failed)")

            async def _fetch_html_guarded(url: str):
                html, _v = await fetch_html_best_effort(
                    url, _http_get, headers=headers, config=source_config,
                )
                return html

            try:
                extracted = await ArticleExtractor.extract_multipage(
                    first_html, target_url, _fetch_html_guarded,
                    config=source_config if isinstance(source_config, dict) else {},
                )
            except Exception:
                extracted = ArticleExtractor.extract(first_html, target_url, config=source_config if isinstance(source_config, dict) else {})

            if getattr(extracted, "is_bot_wall", False):
                raise ValueError(
                    f"Trang bài viết chặn bot ({extracted.wall_reason}). {ArticleExtractor.BOT_WALL_FIX_HINT}"
                )

            if not extracted.content or len(extracted.content) < 30:
                raise RuntimeError("Could not extract meaningful article content from target URL.")

            content.content = extracted.content
            if extracted.title and len(extracted.title) > 5:
                content.title = extracted.title
            if extracted.excerpt:
                content.excerpt = extracted.excerpt
            if extracted.author and not content.author:
                content.author = extracted.author
            if extracted.image_url:
                content.image_url = extracted.image_url

            content.content_hash = DeduplicationService.compute_content_hash(content.title, content.content)
            content.fetched_at = datetime.utcnow()
            content.updated_at = datetime.utcnow()
            meta = content.metadata_json or {}
            if not isinstance(meta, dict):
                meta = {}
            meta["auto_scraped"] = True
            try:
                imgs = getattr(extracted, "images", None) or []
                if imgs:
                    existing_imgs = meta.get("images") or []
                    meta["images"] = ArticleExtractor.merge_image_lists(
                        existing_imgs,
                        imgs,
                        # full multipage success replaces junk from old broken extracts
                        replace_on_full=getattr(extracted, "pages_fetched", 1) > 1,
                    )
                if getattr(extracted, "pages_fetched", 1) and extracted.pages_fetched > 1:
                    meta["pages_fetched"] = extracted.pages_fetched
            except Exception:
                pass
            content.metadata_json = meta
            await db.commit()

        # Guarantee segmented sentences are saved in DB
        try:
            body_text = (content.content or content.excerpt or "").strip()
            if body_text and content.title:
                clean_t = content.title.strip()
                if body_text.startswith(clean_t):
                    body_text = body_text[len(clean_t):].strip()

            text_to_segment = body_text if body_text else (content.title or "")
            segmented_data = TextSegmenter.segment(text_to_segment)
            if len(segmented_data) > 1 and content.title:
                t_norm = "".join(content.title.split())
                first_norm = "".join(segmented_data[0]["text"].split())
                if t_norm == first_norm:
                    segmented_data = segmented_data[1:]
                    for i, s in enumerate(segmented_data, 1):
                        s["sentence_index"] = i

            await db.execute(delete(ContentSentence).where(ContentSentence.content_id == content.id))
            for s in segmented_data:
                db.add(ContentSentence(
                    content_id=content.id,
                    sentence_index=s["sentence_index"],
                    text=s["text"],
                    start_offset=s["start_offset"],
                    end_offset=s["end_offset"],
                    has_high_learning_value=s.get("has_high_learning_value", False),
                    learning_value_reason=s.get("learning_value_reason"),
                ))
            await db.commit()
        except Exception as seg_err:
            logger.warning(f"Error persisting segmented sentences for {content_id}: {seg_err}")

        # Enqueue background re-enrichment without blocking reader display —
        # ONLY when auto-queue is enabled (default OFF: user presses the
        # button on the detail page instead).
        try:
            from app.services.enrichment_worker import enrichment_worker_pool
            if settings.ENRICHMENT_AUTO_QUEUE_ENABLED:
                await enrichment_worker_pool.enqueue(
                    db=db,
                    content_id=content_id,
                    task="ALL",
                    force=True
                )
                logger.info(f"Enqueued background AI enrichment for content {content_id}")
        except Exception as enrich_err:
            logger.warning(f"Re-enrichment enqueue notice for content {content_id}: {enrich_err}")

        return await cls.get_content_for_reader(db=db, content_id=content_id, user_id=user_id)

