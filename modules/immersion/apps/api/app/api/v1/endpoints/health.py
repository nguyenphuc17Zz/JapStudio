from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.session import get_db
from app.services.health_service import HealthService

router = APIRouter()


@router.get("")
async def system_health(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Immersion API system health check."""
    db_ok = True
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "error",
        "module": "Japanese Immersion (Source Manager)",
        "version": "1.0.0",
    }


@router.post("/check-all")
async def check_all_sources_health(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Runs health check sweeps across all active sources."""
    return await HealthService.check_all_sources(db)
