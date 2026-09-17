from unittest.mock import AsyncMock, patch

import pytest

from app.domains.speech.adapters.edge_tts_adapter import EdgeTTSAdapter
from app.domains.speech.contracts import TTSOptions


@pytest.mark.asyncio
async def test_edge_tts_empty_text():
    adapter = EdgeTTSAdapter()
    output = await adapter.synthesize(text="", options=TTSOptions())
    assert output.audio_bytes == b""
    assert output.provider == "edge_tts"


@pytest.mark.asyncio
async def test_edge_tts_available_voices():
    adapter = EdgeTTSAdapter()
    voices = await adapter.get_available_voices()
    assert len(voices) >= 2
    voice_ids = [v.id for v in voices]
    assert "ja-JP-NanamiNeural" in voice_ids
    assert "ja-JP-KeitaNeural" in voice_ids
    # All listed voices must be free ja-JP Neural voices
    assert all(v.id.startswith("ja-JP-") and v.id.endswith("Neural") for v in voices)


def _voice_entry(short_name, gender="Female", locale="ja-JP", status="GA", personalities=None):
    return {
        "Name": f"Microsoft Server Speech Text to Speech Voice ({locale}, {short_name})",
        "ShortName": short_name,
        "Gender": gender,
        "Locale": locale,
        "FriendlyName": f"Microsoft {short_name} Online - {locale}",
        "Status": status,
        "VoiceTag": {"VoicePersonalities": personalities or ["General"]},
    }


@pytest.mark.asyncio
async def test_edge_tts_dynamic_lists_only_free_ja_voices():
    adapter = EdgeTTSAdapter()
    entries = [
        _voice_entry("ja-JP-NanamiNeural", "Female", personalities=["Polite"]),
        _voice_entry("ja-JP-KeitaNeural", "Male"),
        _voice_entry("ja-JP-AoiNeural", "Female", status="Preview"),  # excluded: not GA
        _voice_entry("en-US-AvaNeural", "Female"),  # excluded: not ja-JP
        _voice_entry("ja-JP-CustomVoice", "Female"),  # excluded: not *Neural
        _voice_entry("ja-JP-FakeMultilingualNeural", "Female"),  # excluded: marker
        {  # no Status key -> treated as free
            "ShortName": "ja-JP-ShioriNeural",
            "Gender": "Female",
            "Locale": "ja-JP",
            "FriendlyName": "Microsoft Shiori Online - Japanese (Japan)",
            "VoiceTag": {"VoicePersonalities": ["Polite"]},
        },
    ]

    with patch("edge_tts.list_voices", new=AsyncMock(return_value=entries)):
        voices = await adapter.get_available_voices(refresh=True)

    voice_ids = [v.id for v in voices]
    assert "ja-JP-NanamiNeural" in voice_ids
    assert "ja-JP-KeitaNeural" in voice_ids
    assert "ja-JP-ShioriNeural" in voice_ids
    assert "ja-JP-AoiNeural" not in voice_ids
    assert "en-US-AvaNeural" not in voice_ids
    assert "ja-JP-CustomVoice" not in voice_ids
    assert "ja-JP-FakeMultilingualNeural" not in voice_ids
    # Curated Vietnamese display name is kept for known voices
    assert next(v for v in voices if v.id == "ja-JP-NanamiNeural").name.startswith("Nanami")
    # Default voice stays first
    assert voices[0].id == "ja-JP-NanamiNeural"

    # Second call uses cache (no extra endpoint hit)
    with patch("edge_tts.list_voices", new=AsyncMock(side_effect=RuntimeError("no call"))) as mocked:
        cached = await adapter.get_available_voices()
        mocked.assert_not_called()
    assert [v.id for v in cached] == voice_ids


@pytest.mark.asyncio
async def test_edge_tts_fallback_when_list_fails():
    adapter = EdgeTTSAdapter()
    with patch("edge_tts.list_voices", new=AsyncMock(side_effect=RuntimeError("offline"))):
        voices = await adapter.get_available_voices(refresh=True)
    voice_ids = [v.id for v in voices]
    assert len(voices) == len(EdgeTTSAdapter.FALLBACK_VOICES)
    assert "ja-JP-NanamiNeural" in voice_ids
    assert "ja-JP-KeitaNeural" in voice_ids


@pytest.mark.asyncio
async def test_edge_tts_mocked_synthesis():
    adapter = EdgeTTSAdapter()
    fake_mp3_data = b"ID3\x03\x00\x00\x00\x00\x00#TSSE\x00\x00\x00"

    with patch("edge_tts.Communicate") as mock_comm_cls:
        mock_instance = AsyncMock()
        mock_comm_cls.return_value = mock_instance

        async def fake_stream():
            yield {"type": "audio", "data": fake_mp3_data}

        mock_instance.stream = fake_stream

        opts = TTSOptions(voice_id="ja-JP-NanamiNeural", speed=1.0)
        output = await adapter.synthesize(text="こんにちは", options=opts)

        assert output.provider == "edge_tts"
        assert output.voice == "ja-JP-NanamiNeural"
        assert output.format == "mp3"
        assert len(output.audio_bytes) > 0


def test_clean_text_for_tts():
    from app.domains.speech.adapters.edge_tts_adapter import clean_text_for_tts

    # 1. Underscores replaced with natural pause
    assert clean_text_for_tts("昨日、友達と見た映画がすごく______てさ！") == "昨日、友達と見た映画がすごく、てさ！"
    assert clean_text_for_tts("冷たいご飯を______するための物です。") == "冷たいご飯を、するための物です。"

    # 2. Bracketed blanks
    assert clean_text_for_tts("ここに[______]を入れてください") == "ここに、を入れてください"
    assert clean_text_for_tts("（____）に入る言葉") == "に入る言葉"

    # 3. Leading tildes
    assert clean_text_for_tts("〜をお願いします") == "をお願いします"

    # 4. Punctuation deduplication and boundaries
    assert clean_text_for_tts("あ、すみません。______をお願いします。") == "あ、すみません。をお願いします。"
    assert clean_text_for_tts("駅前に開店した______、すごい行列が______よ。") == "駅前に開店した、すごい行列が、よ。"

    # 5. Empty or blanks only
    assert clean_text_for_tts("______") == ""
    assert clean_text_for_tts("") == ""


@pytest.mark.asyncio
async def test_edge_tts_synthesize_sanitizes_underscores():
    from app.domains.speech.adapters.edge_tts_adapter import EdgeTTSAdapter

    adapter = EdgeTTSAdapter()
    fake_mp3_data = b"ID3\x03\x00\x00\x00\x00\x00#TSSE\x00\x00\x00"

    with patch("edge_tts.Communicate") as mock_comm_cls:
        mock_instance = AsyncMock()
        mock_comm_cls.return_value = mock_instance

        async def fake_stream():
            yield {"type": "audio", "data": fake_mp3_data}

        mock_instance.stream = fake_stream

        # Synthesize with underscores in prompt sentence
        await adapter.synthesize(text="昨日、友達と見た映画がすごく______てさ！")

        # Verify edge_tts.Communicate received clean text WITHOUT any underscores
        mock_comm_cls.assert_called_once()
        called_text = mock_comm_cls.call_args.kwargs.get("text") or mock_comm_cls.call_args.args[0]
        assert "______" not in called_text
        assert "_" not in called_text
        assert called_text == "昨日、友達と見た映画がすごく、てさ！"

