from datetime import datetime, timezone

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import Settings, get_settings
from app.db.session import get_session_factory
from app.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


async def _check_database() -> str:
    async with get_session_factory()() as session:
        await session.execute(text("SELECT 1"))
    return "ok"


def _response(database: str) -> HealthResponse:
    settings: Settings = get_settings()
    return HealthResponse(
        status="ok",
        app=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
        timestamp=datetime.now(timezone.utc),
        database=database,
    )


@router.get("/health/live", response_model=HealthResponse, include_in_schema=False)
async def health_live() -> HealthResponse:
    """Liveness probe: the process is up. Never touches the database."""
    return _response("unchecked")


@router.get("/health/ready", response_model=HealthResponse, include_in_schema=False)
async def health_ready() -> HealthResponse | JSONResponse:
    """Readiness probe: the process can serve traffic (database reachable)."""
    try:
        database = await _check_database()
    except Exception:
        settings: Settings = get_settings()
        return JSONResponse(
            status_code=503,
            content={
                "status": "degraded",
                "app": settings.app_name,
                "version": settings.app_version,
                "environment": settings.app_env,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "database": "down",
            },
        )
    return _response(database)


@router.get("/health", response_model=HealthResponse)
async def health(
    check_db: bool = Query(default=False, description="Also verify database connectivity"),
) -> HealthResponse:
    settings: Settings = get_settings()
    database = "unchecked"
    if check_db:
        try:
            database = await _check_database()
        except Exception:
            database = "down"
    return HealthResponse(
        status="ok",
        app=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
        timestamp=datetime.now(timezone.utc),
        database=database,
    )
