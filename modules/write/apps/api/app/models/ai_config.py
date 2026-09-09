from __future__ import annotations

from sqlalchemy import JSON, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class AIProviderConfig(UUIDMixin, TimestampMixin, Base):
    """DB-backed provider configuration (keys never default to real values)."""

    __tablename__ = "ai_provider_configs"

    provider_name: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    api_key: Mapped[str | None] = mapped_column(String(500))
    base_url: Mapped[str | None] = mapped_column(String(500))
    default_model: Mapped[str | None] = mapped_column(String(200))
    enabled: Mapped[bool] = mapped_column(default=True, nullable=False)

    models: Mapped[list["AIModelConfig"]] = relationship(
        back_populates="provider_config", cascade="all, delete-orphan"
    )


class AIModelConfig(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "ai_model_configs"

    provider_config_id: Mapped[str] = mapped_column(
        ForeignKey("ai_provider_configs.id", ondelete="CASCADE"), index=True, nullable=False
    )
    model_name: Mapped[str] = mapped_column(String(200), nullable=False)
    capabilities: Mapped[dict | None] = mapped_column(JSON)
    default_temperature: Mapped[float | None] = mapped_column(Float)
    enabled: Mapped[bool] = mapped_column(default=True, nullable=False)

    provider_config: Mapped[AIProviderConfig] = relationship(back_populates="models")
