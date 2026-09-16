"""Remove Kokoro-82M TTS (poor Japanese quality, all voices dead/offline)

Revision ID: 013_remove_kokoro_tts
Revises: 012_replace_voicevox_with_edge_and_kokoro
Create Date: 2026-09-16 22:40:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "013_remove_kokoro_tts"
down_revision: Union[str, None] = "012_replace_voicevox_with_edge_and_kokoro"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = insp.get_table_names()

    # 1. Migrate user_settings Kokoro references to Edge-TTS
    if "user_settings" in tables:
        op.execute(
            "UPDATE user_settings SET default_tts_provider = 'edge_tts' "
            "WHERE default_tts_provider = 'kokoro'"
        )
        op.execute(
            "UPDATE user_settings SET tts_fallback_provider = 'edge_tts' "
            "WHERE tts_fallback_provider = 'kokoro'"
        )
        op.execute(
            "UPDATE user_settings SET tts_fallback_voice_id = 'ja-JP-NanamiNeural' "
            "WHERE tts_fallback_voice_id LIKE 'jf\\_%' ESCAPE '\\' "
            "OR tts_fallback_voice_id LIKE 'jm\\_%' ESCAPE '\\'"
        )
        cols = [c["name"] for c in insp.get_columns("user_settings")]
        if "kokoro_model_dir" in cols:
            with op.batch_alter_table("user_settings") as batch_op:
                batch_op.drop_column("kokoro_model_dir")

    # 2. Migrate voice_profiles Kokoro references to Edge-TTS
    if "voice_profiles" in tables:
        op.execute(
            "UPDATE voice_profiles SET provider = 'edge_tts', voice_id = 'ja-JP-NanamiNeural' "
            "WHERE provider = 'kokoro'"
        )

    # 3. Migrate conversation_sessions if table exists
    if "conversation_sessions" in tables:
        try:
            op.execute(
                "UPDATE conversation_sessions SET tts_provider_preference = 'edge_tts' "
                "WHERE tts_provider_preference = 'kokoro'"
            )
        except Exception:
            pass
        try:
            op.execute(
                "UPDATE conversation_sessions SET tts_voice_preference = 'ja-JP-NanamiNeural' "
                "WHERE tts_voice_preference LIKE 'jf\\_%' ESCAPE '\\' "
                "OR tts_voice_preference LIKE 'jm\\_%' ESCAPE '\\'"
            )
        except Exception:
            pass

    # 4. Migrate conversation_turns if table exists
    if "conversation_turns" in tables:
        try:
            op.execute(
                "UPDATE conversation_turns SET tts_provider = 'edge_tts' "
                "WHERE tts_provider = 'kokoro'"
            )
        except Exception:
            pass
        try:
            op.execute(
                "UPDATE conversation_turns SET tts_voice = 'ja-JP-NanamiNeural' "
                "WHERE tts_voice LIKE 'jf\\_%' ESCAPE '\\' "
                "OR tts_voice LIKE 'jm\\_%' ESCAPE '\\'"
            )
        except Exception:
            pass


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    if "user_settings" in insp.get_table_names():
        cols = [c["name"] for c in insp.get_columns("user_settings")]
        if "kokoro_model_dir" not in cols:
            with op.batch_alter_table("user_settings") as batch_op:
                batch_op.add_column(
                    sa.Column("kokoro_model_dir", sa.String(length=500), nullable=False, server_default="models/kokoro")
                )
