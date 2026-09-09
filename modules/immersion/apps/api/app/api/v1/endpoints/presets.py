from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.presets.default_presets import get_presets_grouped
from app.schemas.source import PresetCategoryGroup, PresetInstallRequest
from app.services.source_service import SourceService

router = APIRouter()


@router.get("", response_model=List[PresetCategoryGroup])
async def list_presets():
    """Returns curated Japanese content source presets grouped by category."""
    return get_presets_grouped()


@router.post("/install")
async def install_presets(payload: PresetInstallRequest, db: AsyncSession = Depends(get_db)):
    """Installs one or multiple predefined source presets into the user's immersion sources."""
    installed, skipped = await SourceService.install_presets(db, payload.preset_keys)
    return {
        "installed_count": installed,
        "skipped_count": len(skipped),
        "skipped_reasons": skipped,
        "message": f"Successfully installed {installed} preset sources.",
    }
