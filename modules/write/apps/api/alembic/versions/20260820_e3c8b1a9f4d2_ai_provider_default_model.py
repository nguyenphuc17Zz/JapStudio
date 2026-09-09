"""add default_model to ai_provider_configs

Revision ID: e3c8b1a9f4d2
Revises: b6d8f0a2c4e6
Create Date: 2026-08-20 21:15:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e3c8b1a9f4d2"
down_revision: str | None = "b6d8f0a2c4e6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "ai_provider_configs",
        sa.Column("default_model", sa.String(length=200), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("ai_provider_configs", "default_model")
