from fastapi import APIRouter
from app.api.v1.endpoints import sources, connectors, presets, health, ingestion, enrichment, reader, comprehension, quiz, knowledge, discovery

api_router = APIRouter()

api_router.include_router(sources.router, prefix="/sources", tags=["Sources"])
api_router.include_router(connectors.router, prefix="/connectors", tags=["Connectors"])
api_router.include_router(presets.router, prefix="/presets", tags=["Presets"])
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(ingestion.router, tags=["Content Ingestion"])
api_router.include_router(enrichment.router, tags=["AI Enrichment & Content Intelligence"])
api_router.include_router(reader.router, tags=["Immersion Feed & Smart Reader"])
api_router.include_router(comprehension.router, tags=["Interactive Reading Intelligence"])
api_router.include_router(quiz.router, tags=["AI Quiz & Reading Comprehension Engine"])
api_router.include_router(knowledge.router, tags=["Personal Japanese Knowledge & Spaced Review"])
api_router.include_router(discovery.router, tags=["Japanese Trends & Multi-Source Discovery"])



