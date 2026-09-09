"""Dynamic meta endpoints for frontend static lists (topics, practice modes, missions, pricing)."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.practice_data import POPULAR_TOPICS as TOPICS_DATA, PRACTICE_MODES as MODES_DATA
from app.core.config import get_settings
from app.db.session import get_session
from app.models.meta import MissionAction, ProviderPricing

router = APIRouter(tags=["meta"])
DbSession = Annotated[AsyncSession, Depends(get_session)]


class MissionActionUpsert(BaseModel):
    id: str = Field(..., max_length=64)
    category: str = Field(..., max_length=32)
    label_vi: str = Field(..., max_length=255)
    label_ja: str | None = None
    icon: str | None = None
    default_register: str | None = None
    recommended_jlpt: list[str] | None = None
    default_medium: str | None = None
    description_vi: str | None = None
    active: bool = True


class PricingUpsert(BaseModel):
    provider: str = Field(..., max_length=32)
    input_price_per_1m: float = Field(..., ge=0)
    output_price_per_1m: float = Field(..., ge=0)


async def require_admin(request: Request) -> None:
    settings = get_settings()
    if settings.app_env.lower() == "production":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if settings.admin_api_key:
        hdr = request.headers.get("x-admin-key", "") or request.headers.get("X-Admin-Key", "")
        if hdr != settings.admin_api_key:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: invalid admin key")


@router.get("/topics/popular")
async def list_popular_topics() -> list[dict]:
    return TOPICS_DATA


@router.get("/practice/modes")
async def list_practice_modes() -> list[dict]:
    return MODES_DATA


@router.get("/mission-actions")
async def list_mission_actions(session: DbSession, active_only: bool = False) -> list[dict]:
    try:
        q = select(MissionAction)
        if active_only:
            q = q.where(MissionAction.active.is_(True))
        rows = (await session.execute(q.order_by(MissionAction.category, MissionAction.id))).scalars().all()
        if rows:
            return [
                {
                    "id": r.id,
                    "category": r.category,
                    "label_vi": r.label_vi,
                    "label_ja": r.label_ja,
                    "icon": r.icon,
                    "default_register": r.default_register,
                    "recommended_jlpt": r.recommended_jlpt,
                    "default_medium": r.default_medium,
                    "active": r.active,
                }
                for r in rows
            ]
    except Exception:
        pass
    # Fallback to static domain if DB empty/migration not yet run
    try:
        from app.domain.real_world_missions import MISSION_ACTIONS

        return [
            {
                "id": k,
                "category": v.category,
                "label_vi": v.label_vi,
                "label_ja": getattr(v, "label_ja", None),
                "icon": getattr(v, "icon", None),
                "default_register": getattr(v, "default_register", None),
                "recommended_jlpt": getattr(v, "recommended_jlpt", None),
                "default_medium": getattr(v, "default_medium", None),
                "active": True,
            }
            for k, v in MISSION_ACTIONS.items()
        ]
    except Exception:
        return []


@router.get("/pricing")
async def list_pricing(session: DbSession) -> dict:
    try:
        rows = (await session.execute(select(ProviderPricing))).scalars().all()
        if rows:
            return {r.provider: {"input": r.input_price_per_1m, "output": r.output_price_per_1m} for r in rows}
    except Exception:
        pass
    try:
        from app.quality.cost import _DEFAULT_PRICES_PER_1M

        return {k: {"input": v[0], "output": v[1]} for k, v in _DEFAULT_PRICES_PER_1M.items()}
    except Exception:
        return {}


@router.put("/mission-actions", status_code=200)
async def upsert_mission_action(
    payload: MissionActionUpsert,
    session: DbSession,
    request: Request,
    _: None = Depends(require_admin),
) -> dict:
    row = await session.get(MissionAction, payload.id)
    if row is None:
        row = MissionAction(id=payload.id)
        session.add(row)
    row.category = payload.category
    row.label_vi = payload.label_vi
    row.label_ja = payload.label_ja
    row.icon = payload.icon
    row.default_register = payload.default_register
    row.recommended_jlpt = payload.recommended_jlpt
    row.default_medium = payload.default_medium
    row.description_vi = payload.description_vi
    row.active = payload.active
    await session.commit()
    return {"id": row.id, "status": "upserted"}


@router.delete("/mission-actions/{action_id}", status_code=200)
async def delete_mission_action(action_id: str, session: DbSession, request: Request, _: None = Depends(require_admin)) -> dict:
    row = await session.get(MissionAction, action_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    await session.delete(row)
    await session.commit()
    return {"id": action_id, "status": "deleted"}


@router.put("/pricing", status_code=200)
async def upsert_pricing(payload: PricingUpsert, session: DbSession, request: Request, _: None = Depends(require_admin)) -> dict:
    row = await session.get(ProviderPricing, payload.provider)
    if row is None:
        row = ProviderPricing(provider=payload.provider)
        session.add(row)
    row.input_price_per_1m = payload.input_price_per_1m
    row.output_price_per_1m = payload.output_price_per_1m
    await session.commit()
    # Update in-memory cache so cost estimates use new pricing immediately
    try:
        from app.quality.cost import set_dynamic_prices_cache

        all_rows = (await session.execute(select(ProviderPricing))).scalars().all()
        set_dynamic_prices_cache({r.provider: (r.input_price_per_1m, r.output_price_per_1m) for r in all_rows})
    except Exception:
        pass
    return {"provider": row.provider, "status": "upserted"}
