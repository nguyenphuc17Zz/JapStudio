import asyncio
import json
import logging
import re
import sys
import os

# Ensure apps/api directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import select, delete, text
from app.db.session import AsyncSessionLocal
from app.models.content import CanonicalContent
from app.models.enrichment import ContentSentence
from app.services.normalizer import NormalizationService
from app.services.text_segmenter import TextSegmenter
from app.services.deduplicator import DeduplicationService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("clean_db_html")


async def clean_database_html():
    logger.info("Starting database HTML content cleanup...")
    async with AsyncSessionLocal() as session:
        stmt = select(CanonicalContent).where(
            CanonicalContent.content.like("%<%")
        )
        res = await session.execute(stmt)
        articles = res.scalars().all()
        logger.info(f"Found {len(articles)} articles with HTML markup in content.")

        cleaned_count = 0
        total_sentences_recreated = 0

        for art in articles:
            raw_c = art.content or ""
            raw_title = art.title or ""
            raw_excerpt = art.excerpt or ""

            # 1. Clean HTML from content
            clean_text, cov_img, audio_url, inline_imgs = NormalizationService.clean_html_content(
                raw_c, base_url=art.canonical_url
            )
            clean_text = clean_text or ""

            # 2. Clean title and excerpt if needed
            clean_title = NormalizationService.strip_html_to_plain(raw_title) if NormalizationService.has_html_tags(raw_title) else raw_title
            clean_excerpt = NormalizationService.strip_html_to_plain(raw_excerpt) if NormalizationService.has_html_tags(raw_excerpt) else raw_excerpt

            # 3. Update metadata
            meta = dict(art.metadata_json or {})
            if audio_url:
                meta["audio_url"] = audio_url
            if inline_imgs:
                existing_imgs = meta.get("images") or []
                for im in inline_imgs:
                    if not any(e.get("url") == im.get("url") for e in existing_imgs):
                        existing_imgs.append(im)
                meta["images"] = existing_imgs

            art.content = clean_text
            art.title = clean_title.strip()
            art.excerpt = clean_excerpt.strip() if clean_excerpt else None
            art.metadata_json = meta
            if cov_img and not art.image_url:
                art.image_url = cov_img
            art.content_hash = DeduplicationService.compute_content_hash(art.title, art.content)

            # 4. Re-segment sentences without duplicate title
            body_text = clean_text.strip()
            if body_text and art.title:
                t_clean = art.title.strip()
                if body_text.startswith(t_clean):
                    body_text = body_text[len(t_clean):].strip()

            text_to_segment = body_text if body_text else art.title
            segments = TextSegmenter.segment(text_to_segment)

            if len(segments) > 1 and art.title:
                t_norm = "".join(art.title.split())
                first_norm = "".join(segments[0]["text"].split())
                if t_norm == first_norm:
                    segments = segments[1:]
                    for idx, s in enumerate(segments, 1):
                        s["sentence_index"] = idx

            # Delete old dirty sentences and replace with clean
            await session.execute(delete(ContentSentence).where(ContentSentence.content_id == art.id))
            for s in segments:
                session.add(ContentSentence(
                    content_id=art.id,
                    sentence_index=s["sentence_index"],
                    text=s["text"],
                    start_offset=s["start_offset"],
                    end_offset=s["end_offset"],
                    has_high_learning_value=s.get("has_high_learning_value", False),
                    learning_value_reason=s.get("learning_value_reason"),
                ))
            total_sentences_recreated += len(segments)
            cleaned_count += 1

        await session.commit()
        logger.info(f"Successfully cleaned {cleaned_count} articles and recreated {total_sentences_recreated} clean sentences.")


if __name__ == "__main__":
    asyncio.run(clean_database_html())
