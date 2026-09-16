# Known Limitations & Environmental Constraints

This document explicitly outlines the environmental boundaries and known limitations of the **Japanese Speaking AI Training OS**.

---

## 1. Speech Recognition (STT)
- **Acoustic Environment**: Faster-Whisper accuracy is sensitive to background noise and low-gain laptop microphones. An external headset or quiet room is recommended for optimal transcription accuracy.
- **Dialectal Variation**: Faster-Whisper is primarily tuned for Standard Japanese (Hyojungo / Tokyo dialect). Regional dialects (Kansai-ben, Tohoku-ben) may occasionally experience lower confidence scores.

## 2. Text-to-Speech (TTS)
- **TTS Availability**: Online Azure Neural voice synthesis (Edge-TTS) requires active internet access. There is no offline TTS fallback — without internet, voice synthesis is unavailable (text-only mode still works).

## 3. Pronunciation & Pitch Contour
- **F0 Fundamental Frequency Estimation**: Pitch contour analysis uses librosa / pyin. High ambient background noise or room reverberation may introduce noise artifacts into the estimated F0 curve.
- **Reference Audio**: Pitch comparisons in pronunciation exercises compare the learner's voice against native synthetic reference audio (Edge-TTS).

## 4. YouTube Shadowing
- **YouTube Availability**: Some YouTube videos may have region locks, disabled embeds, or automated bot-blocking on IP addresses that block `yt-dlp`. Videos with available Japanese closed captions provide the highest timestamp precision.

## 5. AI Provider Rate Limits
- **Free Tier Quotas**: Free-tier Google Gemini or Groq API keys may encounter temporary rate limits (e.g. 15 RPM). Hanasu AI OS mitigates this via `AIRouter` automatic failover and request deduplication.
