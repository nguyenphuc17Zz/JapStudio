import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.api.v1.health import router as health_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import setup_logging
from app.core.security import (
    RateLimitMiddleware,
    RequestContextMiddleware,
    SecurityHeadersMiddleware,
)
from app.db.session import close_engine

logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm pricing cache on startup (best-effort)
    try:
        from app.db.session import get_session_factory
        from app.quality.cost import get_dynamic_prices

        async with get_session_factory()() as session:
            await get_dynamic_prices(session)
    except Exception:
        pass
    yield
    await close_engine()



def create_app() -> FastAPI:
    settings = get_settings()
    setup_logging(settings.log_level)

    is_production = settings.app_env == "production"
    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.app_debug,
        lifespan=lifespan,
        docs_url=None if is_production else "/docs",
        redoc_url=None if is_production else "/redoc",
        openapi_url=None if is_production else "/openapi.json",
    )

    application.add_middleware(RateLimitMiddleware)
    application.add_middleware(SecurityHeadersMiddleware)
    application.add_middleware(RequestContextMiddleware)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_origin_regex=None if settings.app_env.lower() == "production" else r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(application)

    application.include_router(health_router)
    application.include_router(health_router, prefix="/api/v1")
    application.include_router(api_router, prefix="/api/v1")

    @application.get("/", include_in_schema=False)
    async def root() -> dict:
        return {"app": settings.app_name, "version": settings.app_version, "docs": "/docs"}

    logger.info("Application '%s' started (env=%s)", settings.app_name, settings.app_env)
    return application


app = create_app()
