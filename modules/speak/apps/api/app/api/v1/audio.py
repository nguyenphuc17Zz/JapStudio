import base64
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.audio.contracts import (
    AudioQualityReport,
    PlaybackPreset,
    ProviderHealth,
    VoiceProfileDTO,
)
from app.domains.audio.recording_service import AudioQualityAnalyzer
from app.domains.audio.schemas import (
    AudioPresetCreateRequest,
    AudioPresetResponse,
    AudioQualityCheckRequest,
    AudioSettingsDTO,
    AudioSettingsUpdateRequest,
    TTSEngineStatusDTO,
    TTSPreviewRequest,
    TTSPreviewResponse,
    VoiceProfileCreateRequest,
    VoiceProfileResponse,
    VoiceProfileUpdateRequest,
)
from app.domains.audio.service import AudioService
from app.domains.audio.tts_service import tts_service
from app.domains.audio.voice_service import VoiceService
from app.domains.speech.tts_router import tts_router
from app.domains.users.service import UserService
from app.infrastructure.database.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/audio", tags=["audio"])


# 1. Voices & Health
@router.get("/voices", response_model=list[VoiceProfileDTO])
async def list_available_voices(
    provider: str = Query(default="edge_tts"),
    db: AsyncSession = Depends(get_db),
):
    """Lists available voices with capabilities from the specified TTS provider."""
    voice_service = VoiceService(db)
    return await voice_service.list_available_voices(provider_id=provider)


@router.get("/providers/health", response_model=list[ProviderHealth])
async def get_providers_health():
    """Checks live status, version, and latency of registered speech providers."""
    return await tts_service.get_providers_health()


# 2. Voice Preview
@router.post("/tts/preview", response_model=TTSPreviewResponse)
async def preview_voice(payload: TTSPreviewRequest):
    """Synthesizes a short preview clip with in-memory caching."""
    result = await tts_service.preview_voice(
        text=payload.text,
        voice_id=payload.voice_id,
        provider=payload.provider,
        speed=payload.speed,
        pitch=payload.pitch,
        style=payload.style,
    )
    return TTSPreviewResponse(
        audio_base64=result.audio_base64 or "",
        format=result.format,
        duration_ms=result.duration_ms,
        provider=result.provider,
        voice_id=result.voice_id,
        processing_time_ms=result.processing_time_ms,
        is_cached=result.is_cached,
    )


# 3. Voice Profiles (CRUD)
@router.get("/voice-profiles", response_model=list[VoiceProfileResponse])
async def list_user_voice_profiles(db: AsyncSession = Depends(get_db)):
    user_service = UserService(db)
    user = await user_service.get_or_create_default_user()
    service = AudioService(db)
    profiles = await service.list_user_voice_profiles(user.id)
    return [
        VoiceProfileResponse(
            id=p.id,
            user_id=p.user_id,
            name=p.name,
            provider=p.provider,
            voice_id=p.voice_id,
            description=p.description,
            settings_json=p.settings_json or {},
            is_default=p.is_default,
            is_favorite=p.is_favorite,
            created_at=p.created_at.isoformat(),
            updated_at=p.updated_at.isoformat(),
        )
        for p in profiles
    ]


@router.post("/voice-profiles", response_model=VoiceProfileResponse)
async def create_voice_profile(
    payload: VoiceProfileCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    user_service = UserService(db)
    user = await user_service.get_or_create_default_user()
    service = AudioService(db)
    p = await service.create_voice_profile(user.id, payload)
    return VoiceProfileResponse(
        id=p.id,
        user_id=p.user_id,
        name=p.name,
        provider=p.provider,
        voice_id=p.voice_id,
        description=p.description,
        settings_json=p.settings_json or {},
        is_default=p.is_default,
        is_favorite=p.is_favorite,
        created_at=p.created_at.isoformat(),
        updated_at=p.updated_at.isoformat(),
    )


@router.patch("/voice-profiles/{profile_id}", response_model=VoiceProfileResponse)
async def update_voice_profile(
    profile_id: str,
    payload: VoiceProfileUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    user_service = UserService(db)
    user = await user_service.get_or_create_default_user()
    service = AudioService(db)
    p = await service.update_voice_profile(profile_id, user.id, payload)
    if not p:
        raise HTTPException(status_code=404, detail="Voice profile not found.")
    return VoiceProfileResponse(
        id=p.id,
        user_id=p.user_id,
        name=p.name,
        provider=p.provider,
        voice_id=p.voice_id,
        description=p.description,
        settings_json=p.settings_json or {},
        is_default=p.is_default,
        is_favorite=p.is_favorite,
        created_at=p.created_at.isoformat(),
        updated_at=p.updated_at.isoformat(),
    )


@router.delete("/voice-profiles/{profile_id}")
async def delete_voice_profile(
    profile_id: str,
    db: AsyncSession = Depends(get_db),
):
    user_service = UserService(db)
    user = await user_service.get_or_create_default_user()
    service = AudioService(db)
    deleted = await service.delete_voice_profile(profile_id, user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Voice profile not found.")
    return {"success": True}


# 4. Playback Presets
@router.get("/presets", response_model=list[PlaybackPreset])
async def list_presets(db: AsyncSession = Depends(get_db)):
    user_service = UserService(db)
    user = await user_service.get_or_create_default_user()
    service = AudioService(db)
    return await service.list_presets(user.id)


@router.post("/presets", response_model=AudioPresetResponse)
async def create_preset(
    payload: AudioPresetCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    user_service = UserService(db)
    user = await user_service.get_or_create_default_user()
    service = AudioService(db)
    m = await service.create_preset(user.id, payload)
    return AudioPresetResponse(
        id=m.id,
        user_id=m.user_id,
        name=m.name,
        description=m.description,
        speed=m.speed,
        volume=m.volume,
        loop_count=m.loop_count,
        pause_after_ms=m.pause_after_ms,
        auto_play=m.auto_play,
        record_after=m.record_after,
        is_system=m.is_system,
        created_at=m.created_at.isoformat(),
    )


# 5. Microphone Calibration & Audio Quality Check
@router.post("/quality-check", response_model=AudioQualityReport)
async def check_audio_quality(payload: AudioQualityCheckRequest):
    """Analyzes audio recording for volume, noise floor, and clipping distortion."""
    try:
        raw_bytes = base64.b64decode(payload.audio_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Base64 audio data.")
    return AudioQualityAnalyzer.analyze(raw_bytes)


# 6. Audio Settings
@router.get("/settings", response_model=AudioSettingsDTO)
async def get_audio_settings(db: AsyncSession = Depends(get_db)):
    user_service = UserService(db)
    user = await user_service.get_or_create_default_user()
    service = AudioService(db)
    return await service.get_audio_settings(user.id)


@router.patch("/settings", response_model=AudioSettingsDTO)
async def update_audio_settings(
    payload: AudioSettingsUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    user_service = UserService(db)
    user = await user_service.get_or_create_default_user()
    service = AudioService(db)
    return await service.update_audio_settings(user.id, payload)


# 7. Diagnostics
@router.get("/diagnostics")
async def get_audio_diagnostics(db: AsyncSession = Depends(get_db)):
    service = AudioService(db)
    return await service.get_audio_diagnostics()


# 8. TTS Engine Status
class TTSEngineUpdateRequest(BaseModel):
    default_tts_provider: str | None = None


async def _build_tts_status_dto(db: AsyncSession) -> TTSEngineStatusDTO:
    user_service = UserService(db)
    user = await user_service.get_or_create_default_user()
    service = AudioService(db)
    settings = await service.get_audio_settings(user.id)

    edge_prov = tts_router.get_provider("edge_tts")
    edge_health = await edge_prov.health_check()

    return TTSEngineStatusDTO(
        edge_tts_available=bool(edge_health.get("is_available")),
        edge_tts_latency_ms=edge_health.get("latency_ms"),
        status_message="Edge-TTS đã sẵn sàng" if edge_health.get("is_available") else "Kiểm tra kết nối TTS",
        active_provider=settings.default_tts_provider or "edge_tts",
    )


@router.get("/engine", response_model=TTSEngineStatusDTO)
@router.get("/tts/status", response_model=TTSEngineStatusDTO)
async def get_tts_engine_status(db: AsyncSession = Depends(get_db)):
    """Retrieves real-time status of the Edge-TTS engine."""
    return await _build_tts_status_dto(db)


@router.put("/engine", response_model=TTSEngineStatusDTO)
async def update_tts_engine(payload: TTSEngineUpdateRequest, db: AsyncSession = Depends(get_db)):
    """Updates active TTS configuration."""
    user_service = UserService(db)
    user = await user_service.get_or_create_default_user()
    service = AudioService(db)

    update_data = {}
    if payload.default_tts_provider is not None:
        prov = payload.default_tts_provider.strip().lower()
        if prov in ("edge_tts", "none", "web_speech"):
            update_data["default_tts_provider"] = prov

    if update_data:
        await service.update_audio_settings(user.id, AudioSettingsUpdateRequest(**update_data))

    return await _build_tts_status_dto(db)

