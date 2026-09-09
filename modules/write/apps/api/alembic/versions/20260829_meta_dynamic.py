"""dynamic meta: mission_actions + provider_pricing

Revision ID: a9b8c7d6e5f4
Revises: f6a1b2c3d4e5
Create Date: 2026-08-29 11:30:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a9b8c7d6e5f4"
down_revision: str | None = "f6a1b2c3d4e5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "mission_actions" not in tables:
        op.create_table(
            "mission_actions",
            sa.Column("id", sa.String(length=64), primary_key=True, nullable=False),
            sa.Column("category", sa.String(length=32), nullable=False, index=True),
            sa.Column("label_vi", sa.String(length=255), nullable=False),
            sa.Column("label_ja", sa.String(length=255), nullable=True),
            sa.Column("icon", sa.String(length=16), nullable=True),
            sa.Column("default_register", sa.String(length=32), nullable=True),
            sa.Column("recommended_jlpt", sa.JSON(), nullable=True),
            sa.Column("default_medium", sa.String(length=32), nullable=True),
            sa.Column("description_vi", sa.Text(), nullable=True),
            sa.Column("active", sa.Boolean(), server_default="1", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    if "provider_pricing" not in tables:
        op.create_table(
            "provider_pricing",
            sa.Column("provider", sa.String(length=32), primary_key=True, nullable=False),
            sa.Column("input_price_per_1m", sa.Float(), nullable=False),
            sa.Column("output_price_per_1m", sa.Float(), nullable=False),
            sa.Column("currency", sa.String(length=8), server_default="USD", nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
    # Seed pricing if empty
    conn = op.get_bind()
    res = conn.execute(sa.text("SELECT COUNT(*) FROM provider_pricing"))
    if res.scalar() == 0:
        conn.execute(
            sa.text(
                "INSERT INTO provider_pricing (provider, input_price_per_1m, output_price_per_1m) VALUES "
                "('gemini', 0.10, 0.40), ('groq', 0.30, 0.79), ('ollama', 0.0, 0.0), ('fake', 0.0, 0.0)"
            )
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if "provider_pricing" in tables:
        op.drop_table("provider_pricing")
    if "mission_actions" in tables:
        op.drop_table("mission_actions")
