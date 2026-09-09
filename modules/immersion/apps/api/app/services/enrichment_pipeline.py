import time
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy import select, delete, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.secrets_guard import redact_secrets
from app.models.content import CanonicalContent
from app.models.source import ContentSource
from app.models.enrichment import (
    AIEnrichmentJob,
    ContentEnrichment,
    ContentSentence,
    ContentVocabulary,
    ContentExpression,
    ContentGrammar
)
from fastapi import HTTPException, status
from app.services.ai.provider_registry import ai_provider_registry
from app.services.ai.prompts.prompt_registry import PromptRegistry
from app.services.text_segmenter import TextSegmenter
from app.services.enrichment_validator import EnrichmentValidator
from app.db.retry import locked_commit

logger = logging.getLogger(__name__)


class EnrichmentPipelineService:
    """Orchestrates content intelligence pipeline, validation, atomic storage, and caching."""

    @classmethod
    async def enrich_content(
        cls,
        db: AsyncSession,
        content_id: int,
        task: str = "ALL",
        model_provider: Optional[str] = None,
        model_name: Optional[str] = None,
        force: bool = False
    ) -> Optional[ContentEnrichment]:
        """Runs end-to-end enrichment for a canonical content item."""
        # 1. Fetch content with relations
        stmt = (
            select(CanonicalContent)
            .where(CanonicalContent.id == content_id)
            .options(
                selectinload(CanonicalContent.source),
                selectinload(CanonicalContent.enrichment),
                selectinload(CanonicalContent.sentences),
            )
        )
        res = await db.execute(stmt)
        content = res.scalars().first()
        if not content:
            logger.error(f"Content with id {content_id} not found for enrichment")
            return None

        # Resolve provider & model
        provider, chosen_model = ai_provider_registry.get_active_provider_and_model(model_provider, model_name)
        prompt_version = PromptRegistry.COMPREHENSIVE_ENRICHMENT_V1

        # 2. Check Cache & Idempotency
        if not force and content.enrichment_status == "ENRICHED" and content.enrichment:
            existing = content.enrichment
            if (
                existing.prompt_version == prompt_version and
                existing.model_provider == provider.name and
                existing.model_name == chosen_model
            ):
                logger.info(f"Cache hit for content {content_id} (hash {content.content_hash[:8]}). Skipping AI.")
                return existing

        # Update status to processing
        content.enrichment_status = "PROCESSING"
        await db.commit()

        # 3. Create Audit Job Record
        job = AIEnrichmentJob(
            content_id=content.id,
            job_type=f"ENRICH_{task.upper()}",
            status="RUNNING",
            attempt_count=1,
            started_at=datetime.utcnow(),
            model_provider=provider.name,
            model_name=chosen_model,
            prompt_version=prompt_version,
            stage_status_json={"init": "RUNNING"}
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)

        body_text = (content.content or content.excerpt or "").strip()
        # If body starts with exact title, strip to avoid duplicate sentence 1
        if body_text and content.title:
            clean_t = content.title.strip()
            if body_text.startswith(clean_t):
                body_text = body_text[len(clean_t):].strip()

        text_to_segment = body_text if body_text else (content.title or "")
        full_text = f"{content.title}\n\n{body_text}".strip() if body_text else (content.title or "")
        source_role = getattr(content.source, "semantic_role", "FORMAL") if content.source else "FORMAL"
        source_name = getattr(content.source, "name", "Unknown Source") if content.source else "Unknown Source"

        try:
            # 4. Text Segmentation (pure, no DB writes yet — the write lock must
            # not be held across the AI network calls below).
            segmented_data = TextSegmenter.segment(text_to_segment)
            # If the first segment is still an exact copy of the title and there are more sentences, drop it
            if len(segmented_data) > 1 and content.title:
                t_norm = "".join(content.title.split())
                first_norm = "".join(segmented_data[0]["text"].split())
                if t_norm == first_norm:
                    segmented_data = segmented_data[1:]
                    for i, s in enumerate(segmented_data, 1):
                        s["sentence_index"] = i

            sentence_index_to_id: Dict[int, int] = {}

            # 5. Short Content Fast-path
            if len(full_text) < 30 or content.language_status == "NON_JA":
                logger.info(f"Content {content_id} is very short or non-JA. Using fast deterministic enrichment.")
                validated_data = EnrichmentValidator.validate_and_refine(
                    raw_data={
                        "language_analysis": {"language": content.language, "language_confidence": 0.5, "is_japanese": (content.language_status == "JA")},
                        "classification": {"primary_type": content.content_type, "secondary_types": [], "content_role": source_role},
                        "topics": {"primary_topic": "General", "secondary_topics": [], "topic_confidence": 0.5},
                        "keywords": [],
                        "entities": [],
                        "difficulty": {"overall_difficulty": 1, "vocabulary_difficulty": 1, "grammar_difficulty": 1, "kanji_difficulty": 1, "sentence_complexity": 1, "conceptual_difficulty": 1, "estimated_jlpt": "N5", "difficulty_reasons": ["Short text"]},
                        "summary": {"micro_summary": content.title, "short_summary": content.title, "detailed_summary": [content.title]},
                        "register": {"register": source_role, "formality_score": 50, "casualness_score": 50, "internet_slang_score": 0, "requires_cultural_context": False, "cultural_topics": []},
                        "vocabulary": [],
                        "expressions": [],
                        "grammar": [],
                        "quality": {"quality_score": 40, "learning_readiness_score": 30, "freshness_score": 100, "learning_ready": False}
                    },
                    source_text=full_text,
                    segmented_sentences=segmented_data
                )
                ai_result_telemetry = {
                    "input_tokens": 10,
                    "output_tokens": 50,
                    "cost": 0.0,
                    "latency_ms": 10
                }
            else:
                # 6. Execute AI Structured Generation
                sys_inst = PromptRegistry.get_system_instruction(source_role=source_role)
                user_prompt = PromptRegistry.build_comprehensive_prompt(
                    title=content.title,
                    content=full_text,
                    source_name=source_name,
                    source_role=source_role
                )
                schema = PromptRegistry.get_comprehensive_schema()

                gen_result = await provider.generate_structured(
                    prompt=user_prompt,
                    system_instruction=sys_inst,
                    response_schema=schema,
                    model=chosen_model
                )

                ai_result_telemetry = {
                    "input_tokens": gen_result.input_tokens,
                    "output_tokens": gen_result.output_tokens,
                    "cost": gen_result.estimated_cost,
                    "latency_ms": gen_result.latency_ms
                }

                # 7. Deterministic Post-Validation & Anti-Hallucination
                validated_data = EnrichmentValidator.validate_and_refine(
                    raw_data=gen_result.structured_data,
                    source_text=full_text,
                    segmented_sentences=segmented_data
                )

            # 8. Persist Enrichment Entity Atomic Update
            enrichment = content.enrichment
            if not enrichment:
                enrichment = ContentEnrichment(content_id=content.id)
                db.add(enrichment)

            lang_res = validated_data["language_analysis"]
            enrichment.language = lang_res["language"]
            enrichment.language_confidence = lang_res["language_confidence"]
            enrichment.is_japanese = lang_res["is_japanese"]
            enrichment.mixed_language = lang_res["mixed_language"]

            class_res = validated_data["classification"]
            enrichment.primary_type = class_res["primary_type"]
            enrichment.secondary_types = class_res["secondary_types"]
            enrichment.content_role = class_res["content_role"]

            top_res = validated_data["topics"]
            enrichment.primary_topic = top_res["primary_topic"]
            enrichment.secondary_topics = top_res["secondary_topics"]
            enrichment.topic_confidence = top_res["topic_confidence"]
            enrichment.keywords = validated_data.get("keywords", [])
            enrichment.entities = validated_data.get("entities", [])

            diff_res = validated_data["difficulty"]
            enrichment.overall_difficulty = diff_res["overall_difficulty"]
            enrichment.vocabulary_difficulty = diff_res["vocabulary_difficulty"]
            enrichment.grammar_difficulty = diff_res["grammar_difficulty"]
            enrichment.kanji_difficulty = diff_res["kanji_difficulty"]
            enrichment.sentence_complexity = diff_res["sentence_complexity"]
            enrichment.conceptual_difficulty = diff_res["conceptual_difficulty"]
            enrichment.estimated_jlpt = diff_res["estimated_jlpt"]
            enrichment.difficulty_reasons = diff_res["difficulty_reasons"]

            sum_res = validated_data["summary"]
            enrichment.micro_summary = sum_res.get("micro_summary", "")
            enrichment.short_summary = sum_res.get("short_summary", "")
            enrichment.detailed_summary = sum_res.get("detailed_summary", [])

            reg_res = validated_data["register"]
            enrichment.register = reg_res["register"]
            enrichment.formality_score = reg_res["formality_score"]
            enrichment.casualness_score = reg_res["casualness_score"]
            enrichment.internet_slang_score = reg_res["internet_slang_score"]
            enrichment.requires_cultural_context = reg_res["requires_cultural_context"]
            enrichment.cultural_topics = reg_res["cultural_topics"]

            qual_res = validated_data["quality"]
            enrichment.quality_score = qual_res["quality_score"]
            enrichment.freshness_score = qual_res["freshness_score"]
            enrichment.learning_readiness_score = qual_res["learning_readiness_score"]
            enrichment.learning_ready = qual_res["learning_ready"]

            enrichment.prompt_version = prompt_version
            enrichment.model_provider = provider.name
            enrichment.model_name = chosen_model
            enrichment.enrichment_version = (enrichment.enrichment_version or 0) + 1

            # Persist sentences now (DB-only from here on — AI calls are done,
            # so the write lock is held for milliseconds, not minutes).
            # Clear old sentences if re-enriching
            await db.execute(delete(ContentSentence).where(ContentSentence.content_id == content.id))
            await db.flush()

            sentence_entities: List[ContentSentence] = []
            for s in segmented_data:
                sent_obj = ContentSentence(
                    content_id=content.id,
                    sentence_index=s["sentence_index"],
                    text=s["text"],
                    start_offset=s["start_offset"],
                    end_offset=s["end_offset"],
                    has_high_learning_value=s["has_high_learning_value"],
                    learning_value_reason=s["learning_value_reason"]
                )
                db.add(sent_obj)
                sentence_entities.append(sent_obj)

            await db.flush()
            for s_obj in sentence_entities:
                sentence_index_to_id[s_obj.sentence_index] = s_obj.id

            # Clear old vocabulary, expressions, grammar for this content
            await db.execute(delete(ContentVocabulary).where(ContentVocabulary.content_id == content.id))
            await db.execute(delete(ContentExpression).where(ContentExpression.content_id == content.id))
            await db.execute(delete(ContentGrammar).where(ContentGrammar.content_id == content.id))
            await db.flush()

            # Insert validated vocabulary
            for v in validated_data.get("vocabulary", []):
                sent_id = sentence_index_to_id.get(v.get("source_sentence_index"))
                v_obj = ContentVocabulary(
                    content_id=content.id,
                    surface_form=v["surface_form"],
                    normalized_form=v["normalized_form"],
                    reading=v["reading"],
                    part_of_speech=v["part_of_speech"],
                    meaning_in_context=v["meaning_in_context"],
                    importance=v["importance"],
                    learning_priority=v["learning_priority"],
                    difficulty=v["difficulty"],
                    source_sentence_id=sent_id,
                    confidence=v["confidence"]
                )
                db.add(v_obj)

            # Insert validated expressions
            for e in validated_data.get("expressions", []):
                sent_id = sentence_index_to_id.get(e.get("source_sentence_index"))
                e_obj = ContentExpression(
                    content_id=content.id,
                    expression=e["expression"],
                    reading=e.get("reading"),
                    meaning_in_context=e["meaning_in_context"],
                    type=e.get("type", "COLLOCATION"),
                    difficulty=e["difficulty"],
                    learning_priority=e["learning_priority"],
                    source_sentence_id=sent_id,
                    confidence=e["confidence"]
                )
                db.add(e_obj)

            # Insert validated grammar
            for g in validated_data.get("grammar", []):
                sent_id = sentence_index_to_id.get(g.get("source_sentence_index"))
                g_obj = ContentGrammar(
                    content_id=content.id,
                    pattern=g["pattern"],
                    meaning_in_context=g["meaning_in_context"],
                    category=g.get("category", "INTERMEDIATE"),
                    difficulty=g["difficulty"],
                    source_sentence_id=sent_id,
                    confidence=g["confidence"]
                )
                db.add(g_obj)

            # Update content status
            content.enrichment_status = "ENRICHED"

            # Update Job audit
            job.status = "SUCCESS"
            job.finished_at = datetime.utcnow()
            job.input_tokens = ai_result_telemetry["input_tokens"]
            job.output_tokens = ai_result_telemetry["output_tokens"]
            job.estimated_cost = ai_result_telemetry["cost"]
            job.latency_ms = ai_result_telemetry["latency_ms"]
            job.stage_status_json = {
                "language": "SUCCESS",
                "classification": "SUCCESS",
                "topics": "SUCCESS",
                "difficulty": "SUCCESS",
                "summary": "SUCCESS",
                "vocabulary": "SUCCESS",
                "expressions": "SUCCESS",
                "grammar": "SUCCESS",
                "quality": "SUCCESS"
            }

            await locked_commit(db)
            await db.refresh(enrichment)
            logger.info(f"Successfully enriched content {content.id} with {chosen_model}")
            return enrichment

        except HTTPException:
            raise
        except Exception as exc:
            logger.exception(f"Error enriching content {content_id}: {exc}")
            content.enrichment_status = "FAILED"
            job.status = "FAILED"
            job.finished_at = datetime.utcnow()
            job.error_type = type(exc).__name__
            job.error_message = str(exc)
            await locked_commit(db)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Lỗi phân tích bài viết bằng AI ({provider.display_name} - {chosen_model}): {redact_secrets(str(exc))}"
            )
