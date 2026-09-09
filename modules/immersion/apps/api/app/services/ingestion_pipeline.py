import hashlib
import traceback
from datetime import datetime
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.core.security import decrypt_secret
from app.connectors.registry import connector_registry
from app.models.source import ContentSource
from app.models.content import CanonicalContent
from app.models.ingestion import (
    IngestionJob,
    RawIngestionItem,
    IngestionItemLog,
    SourceSyncState,
)
from app.models.enrichment import AIEnrichmentJob
from app.core.config import settings
from app.services.normalizer import NormalizationService
from app.services.deduplicator import DeduplicationService
from app.services.circuit_breaker import CircuitBreakerService
from app.services.rate_limiter import rate_limiter
from app.core.ssrf_validator import SSRFValidator
from app.core.http_client import create_async_client
from app.services.article_extractor import ArticleExtractor
from app.services.browser_fetcher import fetch_html_best_effort
from app.db.retry import locked_commit, is_lock_error

logger = get_logger("services.ingestion_pipeline")


def _parse_iso_datetime(dt_str: Optional[str]) -> Optional[datetime]:
    if not dt_str:
        return None
    try:
        # Handle 'Z' suffix or standard ISO format
        cleaned = dt_str.replace("Z", "+00:00")
        return datetime.fromisoformat(cleaned).replace(tzinfo=None)
    except Exception:
        return None


class IngestionPipelineService:
    """Core execution engine for ingesting content from a single source."""

    @classmethod
    async def process_job(
        cls,
        session: AsyncSession,
        job_id: int
    ) -> IngestionJob:
        """Executes the complete ingestion lifecycle for an enqueued job."""
        # 1. Load job and associated source
        stmt = select(IngestionJob).where(IngestionJob.id == job_id).limit(1)
        res = await session.execute(stmt)
        job = res.scalar_one_or_none()

        if not job or job.status in ("SUCCESS", "CANCELLED"):
            return job

        source_stmt = select(ContentSource).where(ContentSource.id == job.source_id).limit(1)
        res_source = await session.execute(source_stmt)
        source = res_source.scalar_one_or_none()

        if not source:
            job.status = "FAILED"
            job.error_summary = f"Source #{job.source_id} not found"
            job.error_type = "permanent"
            await session.commit()
            return job

        # 2. Acquire Concurrency Slots & Source Spacing
        target_url = source.feed_url or source.base_url or ""
        await rate_limiter.acquire_global_slot()
        if target_url:
            await rate_limiter.acquire_host_slot(target_url)

        try:
            await rate_limiter.throttle_source_spacing(source.id)

            # 3. Mark Job RUNNING and lock source
            job.status = "RUNNING"
            job.started_at = datetime.utcnow()
            source.is_syncing = True
            await session.commit()

            # 4. Load or Initialize SourceSyncState
            state_stmt = select(SourceSyncState).where(SourceSyncState.source_id == source.id).limit(1)
            res_state = await session.execute(state_stmt)
            state = res_state.scalar_one_or_none()
            if not state:
                state = SourceSyncState(source_id=source.id)
                session.add(state)
                await session.flush()

            # 5. Circuit Breaker Check
            can_run, circuit_msg = CircuitBreakerService.can_execute(state)
            if not can_run:
                job.status = "FAILED"
                job.error_summary = circuit_msg
                job.error_type = "circuit_open"
                job.finished_at = datetime.utcnow()
                source.is_syncing = False
                await session.commit()
                return job

            # 6. Retrieve Connector & Decrypt Credentials
            conn_type = source.connector_type or source.source_type
            connector = connector_registry.get(conn_type)

            decrypted_secret = None
            if source.credential and source.credential.encrypted_secret:
                decrypted_secret = decrypt_secret(source.credential.encrypted_secret)

            # 7. Connector Fetch (Executed safely)
            try:
                fetch_result = await connector.fetch(
                    source=source,
                    decrypted_secret=decrypted_secret,
                    limit=50,
                    cursor=state.cursor
                )
            except Exception as e:
                logger.error(f"Connector fetch exception on source #{source.id}: {str(e)}\n{traceback.format_exc()}")
                is_perm = any(code in str(e) for code in ["401", "403", "404", "invalid"])
                CircuitBreakerService.record_failure(state, is_permanent=is_perm)
                job.status = "FAILED"
                job.error_summary = f"Connector fetch exception: {str(e)}"
                job.error_type = "permanent" if is_perm else "transient"
                job.finished_at = datetime.utcnow()
                source.is_syncing = False
                source.consecutive_failure_count += 1
                source.last_error_message = str(e)
                source.health_status = "ERROR" if source.consecutive_failure_count >= 5 else "WARNING"
                await session.commit()
                return job

            if not fetch_result.success:
                err_msg = fetch_result.error_message or "Connector returned fetch failure"
                is_perm = any(err.error_type == "permanent" for err in fetch_result.errors)
                CircuitBreakerService.record_failure(state, is_permanent=is_perm)
                job.status = "FAILED"
                job.error_summary = err_msg
                job.error_type = "permanent" if is_perm else "transient"
                job.finished_at = datetime.utcnow()
                source.is_syncing = False
                source.consecutive_failure_count += 1
                source.last_error_message = err_msg
                source.health_status = "ERROR" if source.consecutive_failure_count >= 5 else "WARNING"
                await session.commit()
                return job

            # 8. Staging, Normalization, Validation, and Deduplication Pipeline
            items_seen = 0
            items_fetched = len(fetch_result.items)
            items_normalized = 0
            items_created = 0
            items_updated = 0
            items_duplicate = 0
            items_rejected = 0
            items_wall_rejected = 0

            # 8pre. Bot-wall batch guard (Nikkei regression: 15/50 items shared one
            # identical 126-char wall text under different titles/URLs, slipping past
            # title+content dedupe). Groups by CONTENT-ONLY hash; groups of >=5 are
            # treated as wall boilerplate, never persisted.
            wall_batch_indexes: set = set()
            try:
                _freq: dict = {}
                _idx_by_hash: dict = {}
                for _i, _ri in enumerate(fetch_result.items):
                    _txt = NormalizationService.clean_text(_ri.content or _ri.excerpt or "") or ""
                    _h = hashlib.sha256(_txt.encode("utf-8")).hexdigest()
                    _freq[_h] = _freq.get(_h, 0) + 1
                    _idx_by_hash.setdefault(_h, []).append(_i)
                for _h, _c in _freq.items():
                    if _c >= 5:
                        wall_batch_indexes.update(_idx_by_hash[_h])
                if wall_batch_indexes:
                    logger.warning(
                        f"Job #{job.id}: bot-wall batch detected "
                        f"({len(wall_batch_indexes)}/{items_fetched} items share identical content)"
                    )
            except Exception as _werr:
                logger.debug(f"Wall-batch pre-scan skipped: {_werr}")

            # Shared scrape config/headers for phase 1 (no DB access here).
            source_cfg = getattr(source, "config_json", None) or {}
            if not isinstance(source_cfg, dict):
                source_cfg = {}
            source_hdr = getattr(source, "headers_json", None) or {}
            req_headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
                "Referer": (source_cfg.get("referer") if isinstance(source_cfg, dict) else None) or "https://www.google.co.jp/",
            }
            if isinstance(source_hdr, dict):
                req_headers.update(source_hdr)

            def _make_scrape_get(fetch_client):
                async def _get(url: str):
                    try:
                        SSRFValidator.validate_url(url)
                    except Exception:
                        return None
                    try:
                        r = await fetch_client.get(url)
                        return (r.status_code, r.text)
                    except Exception:
                        return None

                return _get

            # ---------------------------------------------------------------
            # PHASE 1: fetch + normalize + scrape. ZERO DB access on purpose:
            # network I/O (multipage x8, browser 25s) must never run while this
            # session holds the SQLite write lock — that starved all other
            # writers ("database is locked" on unrelated requests).
            # ---------------------------------------------------------------
            prepared: list = []
            for _loop_idx, raw_item in enumerate(fetch_result.items):
                # 8b. Normalization (pure, no DB)
                canonical_url = NormalizationService.canonicalize_url(raw_item.url)
                clean_title = NormalizationService.clean_text(raw_item.title)
                if clean_title and NormalizationService.has_html_tags(clean_title):
                    clean_title = NormalizationService.strip_html_to_plain(clean_title)

                clean_content = raw_item.content
                extracted_audio = None
                extracted_images_inline: list = []
                cover_image_url = raw_item.image_url

                if clean_content and NormalizationService.has_html_tags(clean_content):
                    c_text, c_img, c_aud, c_imgs = NormalizationService.clean_html_content(
                        clean_content, base_url=canonical_url
                    )
                    clean_content = c_text
                    if c_img and not cover_image_url:
                        cover_image_url = c_img
                    if c_aud:
                        extracted_audio = c_aud
                    if c_imgs:
                        extracted_images_inline.extend(c_imgs)

                clean_content = NormalizationService.clean_text(clean_content)

                clean_excerpt = raw_item.excerpt
                if clean_excerpt and NormalizationService.has_html_tags(clean_excerpt):
                    clean_excerpt = NormalizationService.strip_html_to_plain(clean_excerpt)
                clean_excerpt = NormalizationService.clean_text(clean_excerpt)

                clean_author = NormalizationService.clean_text(raw_item.author)

                # 8b-1. Bot-wall flag (connector metadata or batch prescan).
                _wall_reason = None
                try:
                    _meta_flag = raw_item.source_metadata
                    if isinstance(_meta_flag, dict) and _meta_flag.get("bot_wall"):
                        _wall_reason = f"BOT_WALL ({_meta_flag.get('wall_reason') or 'unknown'})"
                    if isinstance(_meta_flag, dict) and not extracted_audio and _meta_flag.get("audio_url"):
                        extracted_audio = _meta_flag.get("audio_url")
                except Exception:
                    pass
                if not _wall_reason and _loop_idx in wall_batch_indexes:
                    _wall_reason = "BOT_WALL_BATCH (identical content repeated across batch)"

                scraped_images: list = list(extracted_images_inline)
                scraped_pages = 1

                if not _wall_reason:
                    # 8b-2. Auto-scrape genuine article body if content is missing or short.
                    # Threshold raised 200 -> 2000: RSS leads of 200-800 chars (sources
                    # #2/#7/#13/#17/#20) previously skipped rescrape and stayed truncated.
                    # Uses multipage merge (?page=N) + inline image collection via the
                    # tiered chain (direct -> browser when walled).
                    did_autoscrape = False
                    if (not clean_content or len(clean_content) < 2000) and canonical_url:
                        did_autoscrape = True
                        try:
                            SSRFValidator.validate_url(canonical_url)

                            async with create_async_client(headers=req_headers, timeout=8.0) as fetch_client:
                                async def _fetch_html_guarded(url: str):
                                    html, _via = await fetch_html_best_effort(
                                        url, _make_scrape_get(fetch_client),
                                        headers=req_headers, config=source_cfg,
                                    )
                                    return html

                                art_html, _art_via = await fetch_html_best_effort(
                                    canonical_url, _make_scrape_get(fetch_client),
                                    headers=req_headers, config=source_cfg,
                                )
                                if art_html:
                                    try:
                                        extracted = await ArticleExtractor.extract_multipage(
                                            art_html, canonical_url, _fetch_html_guarded,
                                            config=source_cfg if isinstance(source_cfg, dict) else {},
                                        )
                                    except Exception:
                                        extracted = ArticleExtractor.extract(art_html, canonical_url, config=source_cfg if isinstance(source_cfg, dict) else {})
                                    if getattr(extracted, "is_bot_wall", False):
                                        logger.debug(f"Auto-scrape hit bot wall for {canonical_url}")
                                    elif extracted.content and len(extracted.content) > len(clean_content or ""):
                                        clean_content = extracted.content
                                        if extracted.title and (not clean_title or len(clean_title) < 5):
                                            clean_title = extracted.title
                                        if extracted.excerpt and not clean_excerpt:
                                            clean_excerpt = extracted.excerpt
                                        if extracted.author and not clean_author:
                                            clean_author = extracted.author
                                        scraped_pages = getattr(extracted, "pages_fetched", 1) or 1
                                        for im in getattr(extracted, "images", None) or []:
                                            try:
                                                d = im.model_dump() if hasattr(im, "model_dump") else dict(im)
                                                if d.get("url"):
                                                    scraped_images.append(d)
                                            except Exception:
                                                pass
                        except Exception as scrape_err:
                            logger.debug(f"Auto-scrape during ingestion skipped for {canonical_url}: {scrape_err}")

                    # 8b-3. Image-only backfill for items that skipped auto-scrape.
                    # Covers RSS/ATOM items whose feed text is already full (>=2000 chars)
                    # so 8b-2 never ran: they would otherwise never get inline images.
                    # Single page only (cheap, 1 request); NEVER touches title/content.
                    if not did_autoscrape and not scraped_images and canonical_url:
                        try:
                            _meta = raw_item.source_metadata
                            _has_imgs = isinstance(_meta, dict) and len(_meta.get("images") or []) > 0
                        except Exception:
                            _has_imgs = False
                        if not _has_imgs:
                            try:
                                SSRFValidator.validate_url(canonical_url)
                                async with create_async_client(headers=req_headers, timeout=8.0) as img_client:
                                    img_html, _img_via = await fetch_html_best_effort(
                                        canonical_url, _make_scrape_get(img_client),
                                        headers=req_headers, config=source_cfg,
                                    )
                                    if img_html:
                                        img_only = ArticleExtractor.extract(
                                            img_html, canonical_url,
                                            config=source_cfg if isinstance(source_cfg, dict) else {},
                                        )
                                        if getattr(img_only, "is_bot_wall", False):
                                            logger.debug(f"Image-backfill hit bot wall for {canonical_url}")
                                        else:
                                            for im in getattr(img_only, "images", None) or []:
                                                try:
                                                    d = im.model_dump() if hasattr(im, "model_dump") else dict(im)
                                                    if d.get("url"):
                                                        scraped_images.append(d)
                                                except Exception:
                                                    pass
                                            if img_only.image_url and not cover_image_url:
                                                cover_image_url = img_only.image_url
                            except Exception as img_err:
                                logger.debug(f"Image-backfill skipped for {canonical_url}: {img_err}")

                prepared.append({
                    "raw": raw_item,
                    "canonical_url": canonical_url,
                    "clean_title": clean_title,
                    "clean_content": clean_content,
                    "clean_excerpt": clean_excerpt,
                    "clean_author": clean_author,
                    "wall_reason": _wall_reason,
                    "scraped_images": scraped_images,
                    "scraped_pages": scraped_pages,
                    "cover_image_url": cover_image_url,
                    "extracted_audio": extracted_audio,
                })

            # ---------------------------------------------------------------
            # PHASE 2: persist. DB-only, no network — commits every 5 items so
            # the SQLite write lock is held for milliseconds, never minutes.
            # ---------------------------------------------------------------
            _aborted = False
            for prep in prepared:
                if items_seen > 0 and items_seen % 5 == 0:
                    try:
                        await locked_commit(session)
                    except Exception as commit_err:
                        if is_lock_error(commit_err):
                            logger.warning(f"Job #{job.id}: batch commit hit DB lock, aborting for retry")
                            try:
                                await session.rollback()
                            except Exception:
                                pass
                            job.status = "FAILED"
                            job.error_type = "transient"
                            job.error_summary = (
                                "Database was busy (another job held the write lock); "
                                "will retry automatically with backoff."
                            )
                            job.items_seen = items_seen
                            job.items_fetched = items_fetched
                            job.items_created = items_created
                            job.items_updated = items_updated
                            job.items_duplicate = items_duplicate
                            job.items_rejected = items_rejected
                            job.finished_at = datetime.utcnow()
                            job.duration_ms = (job.finished_at - job.started_at).total_seconds() * 1000.0
                            source.is_syncing = False
                            try:
                                await locked_commit(session)
                            except Exception:
                                pass
                            _aborted = True
                            break
                        raise
                raw_item = prep["raw"]
                items_seen += 1

                # 8a. Stage Raw Ingestion Item
                raw_record = RawIngestionItem(
                    job_id=job.id,
                    source_id=source.id,
                    external_id=raw_item.external_id,
                    raw_payload_json=raw_item.model_dump(),
                    status="FETCHED"
                )
                session.add(raw_record)
                await session.flush()

                # 8b. Normalization (already prepared in phase 1)
                canonical_url = prep["canonical_url"]
                clean_title = prep["clean_title"]
                clean_content = prep["clean_content"]
                clean_excerpt = prep["clean_excerpt"]
                clean_author = prep["clean_author"]
                scraped_images = prep["scraped_images"]
                scraped_pages = prep["scraped_pages"]

                # 8b-1. Bot-wall rejection (flagged by connector deep-fetch, or batch).
                # Never auto-scrape or persist wall pages — they only waste AI quota.
                _wall_reason = prep["wall_reason"]
                if _wall_reason:
                    items_rejected += 1
                    items_wall_rejected += 1
                    raw_record.status = "REJECTED"
                    raw_record.rejection_reason = _wall_reason
                    session.add(IngestionItemLog(
                        job_id=job.id,
                        source_id=source.id,
                        external_id=raw_item.external_id,
                        url=raw_item.url,
                        status="REJECTED",
                        reason=_wall_reason
                    ))
                    continue

                # 8c. Validation: URL & Size limits (text already scraped in phase 1)
                if not canonical_url:
                    items_rejected += 1
                    raw_record.status = "REJECTED"
                    raw_record.rejection_reason = "INVALID_OR_EMPTY_URL"
                    session.add(IngestionItemLog(
                        job_id=job.id,
                        source_id=source.id,
                        external_id=raw_item.external_id,
                        url=raw_item.url,
                        status="REJECTED",
                        reason="INVALID_OR_EMPTY_URL"
                    ))
                    continue

                valid_size, size_err = NormalizationService.validate_size_limits(clean_title, clean_content)
                if not valid_size:
                    items_rejected += 1
                    raw_record.status = "REJECTED"
                    raw_record.rejection_reason = size_err
                    session.add(IngestionItemLog(
                        job_id=job.id,
                        source_id=source.id,
                        external_id=raw_item.external_id,
                        url=canonical_url,
                        status="REJECTED",
                        reason=size_err
                    ))
                    continue

                # 8d. Language Detection & HTML Sanitization
                has_ja, ja_status = NormalizationService.detect_japanese_presence(clean_title, clean_content)
                sanitized_content = NormalizationService.sanitize_html(clean_content)
                items_normalized += 1
                raw_record.status = "NORMALIZED"

                # 8e. Content Fingerprint & Deduplication
                content_hash = DeduplicationService.compute_content_hash(clean_title, sanitized_content)
                pub_dt = _parse_iso_datetime(raw_item.published_at)
                upd_dt = _parse_iso_datetime(raw_item.updated_at)

                existing = await DeduplicationService.find_existing(
                    session=session,
                    source_id=source.id,
                    external_id=raw_item.external_id,
                    canonical_url=canonical_url,
                    content_hash=content_hash
                )

                action, target_record = DeduplicationService.decide_action(
                    existing=existing,
                    new_hash=content_hash,
                    new_updated_at=upd_dt
                )

                if action == "DUPLICATE":
                    items_duplicate += 1
                    raw_record.status = "PERSISTED"
                    raw_record.content_id = target_record.id
                    session.add(IngestionItemLog(
                        job_id=job.id,
                        source_id=source.id,
                        external_id=raw_item.external_id,
                        url=canonical_url,
                        status="DUPLICATE",
                        reason="Content identical to existing record",
                        content_id=target_record.id
                    ))
                    continue

                if action == "UPDATE" and target_record:
                    target_record.title = clean_title
                    target_record.content = sanitized_content
                    target_record.excerpt = clean_excerpt
                    target_record.author = clean_author or target_record.author
                    target_record.content_hash = content_hash
                    target_record.updated_at_source = upd_dt or datetime.utcnow()
                    target_record.fetched_at = datetime.utcnow()
                    target_record.language_status = ja_status
                    try:
                        merged_meta = dict(target_record.metadata_json or {})
                        if scraped_images:
                            merged_meta["images"] = ArticleExtractor.merge_image_lists(
                                merged_meta.get("images"),
                                scraped_images,
                                # full multipage success replaces junk from old broken extracts
                                replace_on_full=scraped_pages > 1,
                            )
                        if scraped_pages and scraped_pages > 1:
                            merged_meta["pages_fetched"] = scraped_pages
                        if prep.get("extracted_audio"):
                            merged_meta["audio_url"] = prep["extracted_audio"]
                        target_record.metadata_json = merged_meta
                    except Exception:
                        pass
                    # Backfill cover when the old record has none
                    if not target_record.image_url and prep["cover_image_url"]:
                        target_record.image_url = prep["cover_image_url"]

                    items_updated += 1
                    raw_record.status = "PERSISTED"
                    raw_record.content_id = target_record.id
                    session.add(IngestionItemLog(
                        job_id=job.id,
                        source_id=source.id,
                        external_id=raw_item.external_id,
                        url=canonical_url,
                        status="UPDATED",
                        reason="Article updated from source",
                        content_id=target_record.id
                    ))
                    continue

                # Action is CREATE
                dup_group = await DeduplicationService.resolve_duplicate_group(
                    session=session,
                    canonical_url=canonical_url,
                    content_hash=content_hash
                )

                base_meta = dict(raw_item.source_metadata or {})
                if scraped_images:
                    base_meta["images"] = ArticleExtractor.merge_image_lists(
                        base_meta.get("images"),
                        scraped_images,
                        replace_on_full=scraped_pages > 1,
                    )
                if scraped_pages and scraped_pages > 1:
                    base_meta["pages_fetched"] = scraped_pages
                if prep.get("extracted_audio"):
                    base_meta["audio_url"] = prep["extracted_audio"]

                new_content = CanonicalContent(
                    source_id=source.id,
                    external_id=raw_item.external_id,
                    canonical_url=canonical_url,
                    content_type="ARTICLE",
                    title=clean_title,
                    excerpt=clean_excerpt,
                    content=sanitized_content,
                    author=clean_author,
                    published_at=pub_dt,
                    updated_at_source=upd_dt,
                    fetched_at=datetime.utcnow(),
                    language=source.language or "ja",
                    language_status=ja_status,
                    image_url=prep["cover_image_url"],
                    status="PUBLISHED",
                    content_hash=content_hash,
                    duplicate_group_id=dup_group,
                    metadata_json=base_meta
                )
                session.add(new_content)
                await session.flush()

                items_created += 1
                raw_record.status = "PERSISTED"
                raw_record.content_id = new_content.id
                session.add(IngestionItemLog(
                    job_id=job.id,
                    source_id=source.id,
                    external_id=raw_item.external_id,
                    url=canonical_url,
                    status="CREATED",
                    content_id=new_content.id
                ))
                # Auto-queue AI Enrichment for newly persisted content — ONLY when
                # auto-queue is enabled. Default OFF: user presses the button on
                # the article detail page instead (quota control).
                # Empty sentinel: the worker resolves CURRENT settings at
                # execution time (never a stale snapshot from ingest time).
                if settings.ENRICHMENT_AUTO_QUEUE_ENABLED:
                    session.add(AIEnrichmentJob(
                        content_id=new_content.id,
                        job_type="ENRICH_ALL",
                        status="QUEUED",
                        model_provider="",
                        model_name=""
                    ))

            # 9. Update Checkpoint & Sync State
            if fetch_result.next_cursor:
                state.cursor = fetch_result.next_cursor
            if fetch_result.next_page:
                state.page = (state.page or 0) + 1
            if fetch_result.items:
                state.last_seen_external_id = fetch_result.items[0].external_id
            CircuitBreakerService.record_success(state)

            # 10. Update Source Metrics & Health
            source.items_fetched_total += items_created
            source.items_fetched_today += items_created
            source.last_sync_at = datetime.utcnow()
            source.is_syncing = False

            # 11. Finalize Job (skipped when the batch loop already aborted with
            # a transient lock failure — status/metrics were set there).
            if not _aborted:
                job.items_seen = items_seen
                job.items_fetched = items_fetched
                job.items_normalized = items_normalized
                job.items_created = items_created
                job.items_updated = items_updated
                job.items_duplicate = items_duplicate
                job.items_rejected = items_rejected
                job.finished_at = datetime.utcnow()
                job.duration_ms = (job.finished_at - job.started_at).total_seconds() * 1000.0

                if items_wall_rejected and not items_created and not items_updated:
                    # Entire batch was bot-wall boilerplate: fail loudly (permanent —
                    # retrying won't help) instead of reporting a fake SUCCESS.
                    job.status = "FAILED"
                    job.error_type = "permanent"
                    job.error_summary = (
                        f"Source returned bot-wall pages for {items_wall_rejected}/{items_fetched} items. "
                        + ArticleExtractor.BOT_WALL_FIX_HINT
                    )
                    source.health_status = "ERROR"
                    source.consecutive_failure_count += 1
                    source.last_error_message = job.error_summary
                elif fetch_result.warnings and not items_created and not items_duplicate:
                    job.status = "PARTIAL_SUCCESS"
                    job.error_summary = fetch_result.warnings[0].message
                    source.last_success_at = datetime.utcnow()
                    source.health_status = "HEALTHY"
                    source.consecutive_failure_count = 0
                else:
                    job.status = "SUCCESS"
                    source.last_success_at = datetime.utcnow()
                    source.health_status = "HEALTHY"
                    source.consecutive_failure_count = 0

            try:
                await locked_commit(session)
            except Exception as final_err:
                if is_lock_error(final_err):
                    logger.warning(f"Job #{job.id}: final commit hit DB lock")
                    try:
                        await session.rollback()
                    except Exception:
                        pass
                    if job.status not in ("FAILED",):
                        job.status = "FAILED"
                        job.error_type = "transient"
                        job.error_summary = "Database was busy at finalize; will retry automatically."
                    job.finished_at = job.finished_at or datetime.utcnow()
                    source.is_syncing = False
                    try:
                        await locked_commit(session)
                    except Exception:
                        pass
                else:
                    raise
            logger.info(
                f"Job #{job.id} completed: Source #{source.id} ({source.name}) - "
                f"Fetched: {items_fetched}, Created: {items_created}, Updated: {items_updated}, "
                f"Dupes: {items_duplicate}, Rejected: {items_rejected} in {job.duration_ms:.1f}ms"
            )
            return job

        finally:
            if target_url:
                rate_limiter.release_host_slot(target_url)
            rate_limiter.release_global_slot()
