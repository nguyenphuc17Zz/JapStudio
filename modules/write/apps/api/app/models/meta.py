"""Dynamic meta tables — mission actions & provider pricing (admin-editable)."""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class MissionAction(Base):
    __tablename__ = "mission_actions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # action_type
    category: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    label_vi: Mapped[str] = mapped_column(String(255), nullable=False)
    label_ja: Mapped[str | None] = mapped_column(String(255), nullable=True)
    icon: Mapped[str | None] = mapped_column(String(16), nullable=True)
    default_register: Mapped[str | None] = mapped_column(String(32), nullable=True)
    recommended_jlpt: Mapped[list | None] = mapped_column(JSON, nullable=True)
    default_medium: Mapped[str | None] = mapped_column(String(32), nullable=True)
    description_vi: Mapped[str | None] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)


class ProviderPricing(Base):
    __tablename__ = "provider_pricing"

    provider: Mapped[str] = mapped_column(String(32), primary_key=True)
    input_price_per_1m: Mapped[float] = mapped_column(Float, nullable=False)
    output_price_per_1m: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="USD")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)
