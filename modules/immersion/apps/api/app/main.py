from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.core.ssrf_validator import SSRFSecurityException
from app.core.secrets_guard import redact_secrets
from app.db.sync_schema import init_db
from app.connectors import register_default_connectors
from app.services.worker_pool import worker_pool
from app.services.scheduler import scheduler
from app.services.enrichment_worker import enrichment_worker_pool
import importlib
from app.services import reader_service
importlib.reload(reader_service)
from app.api.v1.router import api_router

logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan setup and teardown."""
    setup_logging()
    logger.info("Initializing Japanese Immersion API...")
    register_default_connectors()
    await init_db()
    try:
        from app.db.migrate_vocab_ai_detail import ensure_vocab_ai_detail_columns
        await ensure_vocab_ai_detail_columns()
    except Exception as migrate_err:
        logger.warning(f"Vocab AI-detail migration notice: {migrate_err}")
    try:
        from app.db.migrate_grammar_ai_detail import ensure_grammar_ai_detail_columns
        await ensure_grammar_ai_detail_columns()
    except Exception as migrate_err:
        logger.warning(f"Grammar AI-detail migration notice: {migrate_err}")
    try:
        from app.db.migrate_expression_ai_detail import ensure_expression_ai_detail_columns
        await ensure_expression_ai_detail_columns()
    except Exception as migrate_err:
        logger.warning(f"Expression AI-detail migration notice: {migrate_err}")
    try:
        from app.scripts.clean_db_html_content import clean_database_html
        await clean_database_html()
    except Exception as cleanup_err:
        logger.warning(f"Database HTML cleanup notice: {cleanup_err}")
    await worker_pool.start()
    await scheduler.start()
    await enrichment_worker_pool.start()
    logger.info(f"Japanese Immersion API listening on port {settings.PORT} [{settings.ENVIRONMENT}]")
    yield
    logger.info("Shutting down Japanese Immersion API...")
    await enrichment_worker_pool.stop()
    await scheduler.stop()
    await worker_pool.stop()


app = FastAPI(
    title="JapStudio — Japanese Immersion API",
    description="Backend for Content Ingestion, Source Management, and Connector Operations.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(SSRFSecurityException)
async def ssrf_exception_handler(request: Request, exc: SSRFSecurityException):
    """Intercepts SSRF security violations with 403 Forbidden."""
    logger.warning(f"SSRF Security Violation intercepted: {str(exc)} | Path: {request.url.path}")
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={"detail": f"Security Protection Blocked: {str(exc)}", "type": "SSRFSecurityException"},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Fallback handler to ensure 500 responses always retain CORS headers."""
    logger.error(f"Unhandled Exception on {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    origin = request.headers.get("origin")
    headers = {}
    if origin and (origin in settings.CORS_ORIGINS or "*" in settings.CORS_ORIGINS):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Headers"] = "*"
        headers["Access-Control-Allow-Methods"] = "*"
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Internal Server Error: {redact_secrets(str(exc))}"},
        headers=headers,
    )


# Include API v1 Router
app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["Root"])
async def root():
    """Service status and quick links."""
    return {
        "service": "JapStudio Immersion Engine",
        "module": "Japanese Immersion (Phase 1: Source Manager)",
        "docs": "/docs",
        "health": "/api/v1/health",
        "status": "online",
        "port": settings.PORT,
    }
