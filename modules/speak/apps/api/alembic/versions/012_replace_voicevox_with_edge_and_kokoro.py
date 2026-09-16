"""Replace VOICEVOX with Edge-TTS and Kokoro-82M TTS

Revision ID: 012_replace_voicevox_with_edge_and_kokoro
Revises: 011_speaking_ramp_mode6
Create Date: 2026-09-16 20:30:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "012_replace_voicevox_with_edge_and_kokoro"
down_revision: Union[str, None] = "011_speaking_ramp_mode6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    cols = [c["name"] for c in insp.get_columns("user_settings")]
    if "kokoro_model_dir" not in cols:
        with op.batch_alter_table("user_settings") as batch_op:
            batch_op.add_column(
                sa.Column("kokoro_model_dir", sa.String(length=500), nullable=False, server_default="models/kokoro")
            )

    # 2. Migrate existing 'voicevox' data in user_settings
    op.execute(
        "UPDATE user_settings SET default_tts_provider = 'edge_tts' WHERE default_tts_provider = 'voicevox'"
    )
    op.execute(
        "UPDATE user_settings SET tts_fallback_provider = 'kokoro' WHERE tts_fallback_provider = 'voicevox'"
    )
    op.execute(
        "UPDATE user_settings SET tts_fallback_voice_id = 'jf_alpha' WHERE tts_fallback_voice_id = '1'"
    )

    # 3. Migrate existing 'voicevox' data in voice_profiles
    op.execute(
        "UPDATE voice_profiles SET provider = 'edge_tts', voice_id = 'ja-JP-NanamiNeural' WHERE provider = 'voicevox'"
    )

    # 4. Migrate conversation_sessions if table exists
    try:
        op.execute(
            "UPDATE conversation_sessions SET tts_provider_preference = 'edge_tts' WHERE tts_provider_preference = 'voicevox'"
        )
    except Exception:
        pass

    # 5. Migrate conversation_turns if table exists
    try:
        op.execute(
            "UPDATE conversation_turns SET tts_provider = 'edge_tts' WHERE tts_provider = 'voicevox'"
        )
    except Exception:
        pass


def downgrade() -> None:
    with op.batch_alter_table("user_settings") as batch_op:
        batch_op.drop_column("kokoro_model_dir")
