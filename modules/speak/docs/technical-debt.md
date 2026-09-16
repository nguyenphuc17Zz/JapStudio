# Technical Debt Register

This register classifies technical debt and deferred decisions with impact and future remediation paths.

---

## Technical Debt Classification

| ID | Domain | Issue Description | Impact | Priority | Status / Future Solution |
|---|---|---|---|---|---|
| **TD-01** | **Speech** | Faster-Whisper is loaded in-process rather than via a dedicated microservice. | Model weights share process RAM/VRAM with FastAPI. Managed via `WhisperModelManager` with LRU eviction (max 2 models). | **P2** (Medium) | Acceptable for personal/single-user OS. For multi-tenant cloud scale, extract to a Triton / Faster-Whisper gRPC microservice. |
| **TD-02** | **Audio** | Legacy VOICEVOX synchronous HTTP bottleneck. | Previously, TTS requests queued behind single-threaded external engine. | **Resolved** | Replaced with Edge-TTS (async streaming). Kokoro-82M (direct ONNX runtime in-process) was added then removed on 2026-09-16 due to poor Japanese quality (official JP voice grades C/C-, misread kanji). |
| **TD-03** | **Shadowing** | YouTube video streams are played client-side via YouTube IFrame rather than cached raw video files. | Requires network access to YouTube servers during shadowing sessions. | **P3** (Low) | Intentional architecture decision: avoids storing gigabytes of copyrighted video files locally; only stores lightweight extracted audio segments for pitch comparison. |
| **TD-04** | **Database** | SQLite lacks native async concurrency for high-write bursts without WAL mode. | Handled via SQLite WAL pragmas and async PostgreSQL connection pooling. | **P3** (Low) | Resolved: `session.py` automatically configures WAL pragma for SQLite and full asyncpg pooling for PostgreSQL. |

---

## Technical Debt Summary
- **P0 Critical**: 0 items. (All critical data integrity, security, and lifecycle issues resolved in Phases 12 & 13).
- **P1 High**: 0 items.
- **P2 Medium**: 1 item (In-process Whisper model scaling for cloud multi-tenant).
- **P3 Low**: 2 items (YouTube IFrame playback, SQLite single-file development).
