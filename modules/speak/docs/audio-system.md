# Audio Platform & Speech Subsystems

## 1. Speech-to-Text (STT) Engine
- **Engine**: Faster-Whisper (CTranslate2 backend).
- **Hardware Acceleration**: Automatic NVIDIA CUDA GPU auto-detection (`float16`) with multi-threaded CPU fallback (`int8`).
- **Model Cache & LRU Eviction**: `WhisperModelManager` limits concurrently loaded models to 2 (e.g. `base` and `small`), freeing VRAM and purging CUDA cache on model eviction.
- **Worker Thread Isolation**: Transcriptions run in background threads via `asyncio.to_thread` to maintain zero API event-loop blocking.

---

## 2. Text-to-Speech (TTS) Engine
- **Engine**: Single-provider architecture: **Edge-TTS** (Microsoft Azure Neural online, ultra-natural Tokyo pitch accent).
- **Voice Profiles**: Edge-TTS catalog loaded dynamically via `edge_tts.list_voices()` filtered to free `ja-JP` GA Neural voices only (verified live 2026-09-16: 2 voices — Nanami, Keita; Microsoft removed the rest from the free endpoint, 24h cache) with speed and volume controls.
- **TTS Cache**: `InMemoryTTSCache` stores up to 500 audio chunks with a 2-hour TTL and total byte tracking to eliminate redundant synthesis of common Japanese phrases (`はい`, `そうです`, `わかりました`).

---

## 3. Web Audio & Acoustic Capture
- **VAD & Anti-Echo**: Browser Web Audio API Voice Activity Detection suppresses microphone feedback while AI is speaking (`ai_speaking` state).
- **Pitch Contour Extraction**: Librosa F0 tracking estimates Japanese pitch accent curves and mora timing duration for visual pronunciation comparison.
