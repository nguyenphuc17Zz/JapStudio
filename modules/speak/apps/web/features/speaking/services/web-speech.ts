"use client";

/**
 * Lightweight Client-Side Web Speech API Synthesis for Japanese.
 * 100% offline-first, zero-latency, reliable voice synthesis using local system voices.
 */

import { speechApi } from "./speech-api";
import { getSavedLobbyPreferences } from "./lobby-preferences";
import {
  claimSpeechOutput,
  releaseSpeechOutput,
  type SpeechOutputOwner,
} from "@/features/audio/services/speech-playback-coordinator";

export interface WebSpeechOptions {
  rate?: number; // 0.8 to 1.2, default 1.0
  pitch?: number; // 0.8 to 1.2, default 1.0
  voiceURI?: string;
  provider?: "edge_tts" | "web_speech" | string;
  voiceId?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export function isWebSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): SpeechSynthesisVoice[] {
  if (!isWebSpeechSupported()) return [];
  try {
    const voices = window.speechSynthesis.getVoices() || [];
    if (voices.length > 0) {
      cachedVoices = voices;
    }
  } catch {}
  return cachedVoices;
}

// Pre-load voices on browser initialization
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    loadVoices();
  };
}

export function getJapaneseWebVoices(): SpeechSynthesisVoice[] {
  const allVoices = cachedVoices.length > 0 ? cachedVoices : loadVoices();
  return allVoices.filter((v) => {
    const lang = (v.lang || "").toLowerCase().replace("_", "-");
    const name = (v.name || "").toLowerCase();
    return lang.includes("ja") || name.includes("japanese") || name.includes("japan") || name.includes("日本語");
  });
}

export function getPreferredVoiceURI(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("hanasu-preferred-web-voice");
}

export function setPreferredJapaneseVoice(voiceURI: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("hanasu-preferred-web-voice", voiceURI);
}

/**
 * Select the best reliable local offline Japanese voice.
 * Prioritizes built-in offline OS voices (Haruka, Ichiro, Ayumi, Google 日本語, Kyoko) over flaky online/cloud voices.
 */
export function getPreferredJapaneseVoice(preferredURI?: string): SpeechSynthesisVoice | null {
  const voices = getJapaneseWebVoices();
  if (voices.length === 0) return null;

  const targetURI = preferredURI || getPreferredVoiceURI();
  if (targetURI) {
    const matched = voices.find((v) => v.voiceURI === targetURI);
    if (matched) return matched;
  }

  // 1. High quality built-in Windows Japanese voices (Haruka, Ichiro, Ayumi)
  const windowsVoice = voices.find((v) => {
    const name = v.name.toLowerCase();
    return name.includes("haruka") || name.includes("ichiro") || name.includes("ayumi");
  });
  if (windowsVoice) return windowsVoice;

  // 2. Google Japanese Voice (Chrome built-in)
  const googleVoice = voices.find((v) => {
    const name = v.name.toLowerCase();
    return name.includes("google") && (name.includes("日本語") || name.includes("japanese") || name.includes("ja-jp"));
  });
  if (googleVoice) return googleVoice;

  // 3. Apple/Mac Japanese voices (Kyoko, Otoya)
  const appleVoice = voices.find((v) => {
    const name = v.name.toLowerCase();
    return name.includes("kyoko") || name.includes("otoya");
  });
  if (appleVoice) return appleVoice;

  // 4. Any local service voice for ja-JP
  const localJa = voices.find((v) => (v.lang || "").toLowerCase().replace("_", "-") === "ja-jp" && (v as any).localService);
  if (localJa) return localJa;

  // 5. Any standard ja-JP voice
  const exactJa = voices.find((v) => (v.lang || "").toLowerCase().replace("_", "-") === "ja-jp");
  if (exactJa) return exactJa;

  return voices[0];
}

// Global active utterances set to prevent V8 Garbage Collection mid-speech
const activeUtterancesSet = new Set<SpeechSynthesisUtterance>();
let activeSpeakTimeout: NodeJS.Timeout | null = null;
let activeAudioElement: HTMLAudioElement | null = null;
let activeAudioBlobUrl: string | null = null;
let activeAudioAbortController: AbortController | null = null;
const clientTtsCache = new Map<string, { base64: string; format: string }>();

export function stopWebSpeech(): void {
  releaseSpeechOutput(webSpeechOwner);
  if (activeSpeakTimeout) {
    clearTimeout(activeSpeakTimeout);
    activeSpeakTimeout = null;
  }
  if (activeAudioAbortController) {
    try {
      activeAudioAbortController.abort();
    } catch {}
    activeAudioAbortController = null;
  }
  if (activeAudioElement) {
    try {
      activeAudioElement.onplay = null;
      activeAudioElement.onended = null;
      activeAudioElement.onerror = null;
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
      activeAudioElement.removeAttribute("src");
      activeAudioElement.load();
    } catch {}
  }
  if (activeAudioBlobUrl) {
    try {
      URL.revokeObjectURL(activeAudioBlobUrl);
    } catch {}
    activeAudioBlobUrl = null;
  }
  if (isWebSpeechSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn("[WebSpeech] Cancel error:", e);
    }
  }
  activeUtterancesSet.clear();
}

// Single-flight owner for everything spoken through this module
// (shared audio element + speechSynthesis utterances).
const webSpeechOwner: SpeechOutputOwner = {
  stop: () => {
    try {
      stopWebSpeech();
    } catch {}
  },
};

export function getVietnameseWebVoices(): SpeechSynthesisVoice[] {
  // Always try fresh getVoices() — Chrome loads voices async and cachedVoices may still be empty on first call
  let allVoices: SpeechSynthesisVoice[] = [];
  try {
    allVoices = window.speechSynthesis?.getVoices?.() || [];
    if (allVoices.length > 0 && allVoices.length !== cachedVoices.length) {
      cachedVoices = allVoices;
    }
  } catch {}
  if (allVoices.length === 0) {
    allVoices = cachedVoices.length > 0 ? cachedVoices : loadVoices();
  }
  return allVoices.filter((v) => {
    const lang = (v.lang || "").toLowerCase().replace("_", "-");
    const name = (v.name || "").toLowerCase();
    return lang === "vi-vn" || lang.startsWith("vi-") || lang === "vi" || name.includes("vietnam") || name.includes("tiếng việt") || name.includes("tien viet");
  });
}

export function getPreferredVietnameseVoice(): SpeechSynthesisVoice | null {
  const voices = getVietnameseWebVoices();
  if (voices.length === 0) return null;
  // Prefer exact vi-VN lang match first (most accurate)
  const exactVi = voices.find((v) => (v.lang || "").toLowerCase().replace("_", "-") === "vi-vn");
  if (exactVi) return exactVi;
  const googleVoice = voices.find((v) => v.name.toLowerCase().includes("google") && v.name.toLowerCase().includes("viet"));
  if (googleVoice) return googleVoice;
  // Windows: "Microsoft An" is the only offline vi-VN voice — match narrowly, not loose "an"
  const msAn = voices.find((v) => {
    const n = v.name.toLowerCase();
    return n.includes("microsoft an") || n === "an" || n.includes(" an ") || n.endsWith(" an");
  });
  if (msAn) return msAn;
  // Any vi voice with localService preferred
  const local = voices.find((v) => (v as any).localService);
  if (local) return local;
  return voices[0];
}

export function isVietnameseVoiceAvailable(): boolean {
  return getVietnameseWebVoices().length > 0;
}

/**
 * Strips any non-Japanese noise, hints, parenthesized translations (Vietnamese/English),
 * or metadata markers so the Japanese TTS voice never reads foreign languages.
 */
export function extractJapaneseSpokenText(text: string): string {
  if (!text) return "";
  // 1. Remove hint splitters
  let clean = text.split("---HINT---")[0];

  // 2. Remove parenthesized text containing Latin/Vietnamese letters (e.g. "(nói)", "（bên mình）", "(ăn)")
  clean = clean.replace(/\s*[（\(][^）\)]*[a-zA-ZÀ-ỹà-ỹ][^）\)]*[）\)]/g, "");

  // 3. Remove bracketed text containing Latin/Vietnamese letters (e.g. "[tiếng việt]", "【nghĩa】")
  clean = clean.replace(/\s*[\[【][^\]】]*[a-zA-ZÀ-ỹà-ỹ][^\]】]*[\]】]/g, "");

  // 4. If text has a separator like " : " or " ➔ " or " -> " followed by Vietnamese/Latin, keep only the Japanese prefix
  const separatorMatch = clean.match(/^([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s〜…ー]+)\s*[:➔→\->-]\s*[a-zA-ZÀ-ỹà-ỹ]/);
  if (separatorMatch) {
    clean = separatorMatch[1];
  }

  clean = clean.trim();

  // 5. Safety check: must have at least one Japanese character (Kanji / Hiragana / Katakana)
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(clean);
  if (!hasJapanese) {
    return "";
  }

  return clean;
}

/**
 * Speaks Vietnamese text cleanly using official Vietnamese system voices (vi-VN).
 * IMPORTANT: if no vi-VN voice is installed, we do NOT fall back to English
 * (which sounds very weird) — we skip TTS and call onEnd immediately.
 * Caller can show text-only fallback.
 */
export function speakVietnameseText(text: string, options: WebSpeechOptions = {}): boolean {
  if (!isWebSpeechSupported() || !text?.trim()) {
    options.onEnd?.();
    return false;
  }

  const cleanText = text.trim();
  if (!cleanText) {
    options.onEnd?.();
    return false;
  }

  // Guard: never pronounce Vietnamese with an English voice
  const voice = getPreferredVietnameseVoice();
  if (!voice) {
    console.warn("[WebSpeech] No Vietnamese voice (vi-VN) found — skipping TTS to avoid English-voice fallback. Text:", cleanText.slice(0, 60));
    // Immediately continue flow ( caller’s onEnd will open answering phase )
    setTimeout(() => options.onEnd?.(), 0);
    return false;
  }

  if (activeSpeakTimeout) {
    clearTimeout(activeSpeakTimeout);
    activeSpeakTimeout = null;
  }

  const wasSpeaking = window.speechSynthesis.speaking || window.speechSynthesis.pending;
  if (wasSpeaking) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }

  const delayMs = wasSpeaking ? 50 : 0;

  activeSpeakTimeout = setTimeout(() => {
    activeSpeakTimeout = null;
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "vi-VN";
      utterance.rate = options.rate ?? 1.0;
      utterance.pitch = options.pitch ?? 1.0;
      utterance.voice = voice;

      utterance.onstart = () => {
        options.onStart?.();
      };

      utterance.onend = () => {
        activeUtterancesSet.delete(utterance);
        releaseSpeechOutput(webSpeechOwner);
        options.onEnd?.();
      };

      utterance.onerror = (e: any) => {
        activeUtterancesSet.delete(utterance);
        const isCanceled = e?.error === "canceled" || e?.error === "interrupted";
        if (isCanceled) {
          options.onError?.(e);
          return;
        }
        console.warn("[WebSpeech] Vietnamese speech error:", e);
        options.onError?.(e);
        options.onEnd?.();
      };

      activeUtterancesSet.add(utterance);
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("[WebSpeech] Failed to speak Vietnamese:", err);
      options.onError?.(err);
      options.onEnd?.();
    }
  }, delayMs);

  return true;
}

function speakWithWebSpeech(cleanText: string, options: WebSpeechOptions = {}): boolean {
  if (!isWebSpeechSupported() || !cleanText) {
    options.onEnd?.();
    return false;
  }

  if (activeSpeakTimeout) {
    clearTimeout(activeSpeakTimeout);
    activeSpeakTimeout = null;
  }

  const wasSpeaking = window.speechSynthesis.speaking || window.speechSynthesis.pending;
  if (wasSpeaking) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }

  const delayMs = wasSpeaking ? 50 : 0;

  activeSpeakTimeout = setTimeout(() => {
    activeSpeakTimeout = null;
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "ja-JP";
      utterance.rate = options.rate ?? 1.0;
      utterance.pitch = options.pitch ?? 1.0;

      const voice = getPreferredJapaneseVoice(options.voiceURI);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        options.onStart?.();
      };

      utterance.onend = () => {
        activeUtterancesSet.delete(utterance);
        releaseSpeechOutput(webSpeechOwner);
        options.onEnd?.();
      };

      utterance.onerror = (e: any) => {
        activeUtterancesSet.delete(utterance);
        const isCanceled = e?.error === "canceled" || e?.error === "interrupted";
        if (isCanceled) {
          options.onError?.(e);
          return;
        }
        console.warn("[WebSpeech] Speech error:", e);
        options.onError?.(e);
        options.onEnd?.();
      };

      activeUtterancesSet.add(utterance);
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("[WebSpeech] Failed to speak:", err);
      options.onError?.(err);
      options.onEnd?.();
    }
  }, delayMs);

  return true;
}

/**
 * Speaks Japanese text cleanly, directly, and reliably.
 * Automatically synchronizes with the user's preferred TTS provider & voice from Settings (Edge-TTS).
 * Falls back gracefully to offline Web Speech API if backend is unavailable.
 */
export function speakJapaneseText(text: string, options: WebSpeechOptions = {}): boolean {
  if (!text?.trim()) {
    options.onEnd?.();
    return false;
  }

  // Single-flight: stop any other speech output and cancel our own
  // previous in-flight synthesis so spam clicks can't stack audio.
  if (activeAudioAbortController) {
    try {
      activeAudioAbortController.abort();
    } catch {}
    activeAudioAbortController = null;
  }
  claimSpeechOutput(webSpeechOwner);

  // Clean text of non-Japanese noise, parentheses translations, or special delimiters
  const cleanText = extractJapaneseSpokenText(text);
  if (!cleanText) {
    // If text was 100% Vietnamese / Latin, gracefully speak with Vietnamese voice
    if (/[a-zA-ZÀ-ỹà-ỹ]/.test(text)) {
      return speakVietnameseText(text, options);
    }
    options.onEnd?.();
    return false;
  }

  // Read active TTS preferences
  const prefs = getSavedLobbyPreferences();
  const provider = (options.provider || prefs.tts_engine || prefs.tts_provider || "edge_tts").toLowerCase();
  const voiceId = options.voiceId || prefs.tts_voice || "ja-JP-NanamiNeural";
  const speed = options.rate ?? prefs.tts_speed ?? 1.0;
  const pitch = options.pitch ?? 0.0;

  // If user explicitly chose web_speech (browser), or disabled TTS
  if (provider === "web_speech" || provider === "none" || !prefs.tts_enabled) {
    return speakWithWebSpeech(cleanText, options);
  }

  // Otherwise, use Neural TTS (Edge-TTS) via speechApi
  stopWebSpeech();

  const cacheKey = `${provider}:${voiceId}:${speed.toFixed(2)}:${cleanText}`;

  // Helper to play base64 audio
  const playBase64 = (audioBase64: string, format = "mp3") => {
    let hasStartedPlaying = false;
    let isPlaybackFinished = false;

    try {
      const byteCharacters = atob(audioBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: `audio/${format}` });
      const objectUrl = URL.createObjectURL(blob);

      if (activeAudioBlobUrl) {
        try {
          URL.revokeObjectURL(activeAudioBlobUrl);
        } catch {}
      }
      activeAudioBlobUrl = objectUrl;

      if (!activeAudioElement) {
        activeAudioElement = new Audio();
      }

      const audio = activeAudioElement;
      // Detach any previous listeners before binding new source
      audio.onplay = null;
      audio.onended = null;
      audio.onerror = null;

      audio.src = objectUrl;
      audio.playbackRate = 1.0;

      audio.onplay = () => {
        hasStartedPlaying = true;
        options.onStart?.();
      };

      audio.onended = () => {
        isPlaybackFinished = true;
        // Clean up listeners immediately so setting src / revoking does not trigger onerror
        audio.onplay = null;
        audio.onended = null;
        audio.onerror = null;
        releaseSpeechOutput(webSpeechOwner);
        try {
          audio.removeAttribute("src");
          audio.load();
        } catch {}
        if (activeAudioBlobUrl === objectUrl) {
          try {
            URL.revokeObjectURL(objectUrl);
          } catch {}
          activeAudioBlobUrl = null;
        }
        options.onEnd?.();
      };

      audio.onerror = (e) => {
        audio.onplay = null;
        audio.onended = null;
        audio.onerror = null;
        // If audio already started playing or ended, NEVER trigger fallback duplicate voice!
        if (hasStartedPlaying || isPlaybackFinished) {
          return;
        }
        console.warn("[UniversalTTS] Audio element error before playback, falling back to Web Speech:", e);
        speakWithWebSpeech(cleanText, options);
      };

      audio.play().catch((playErr) => {
        if (hasStartedPlaying || isPlaybackFinished) return;
        console.warn("[UniversalTTS] Autoplay blocked, falling back to Web Speech:", playErr);
        speakWithWebSpeech(cleanText, options);
      });
    } catch (err) {
      if (hasStartedPlaying || isPlaybackFinished) return;
      console.warn("[UniversalTTS] Base64 decode error, falling back to Web Speech:", err);
      speakWithWebSpeech(cleanText, options);
    }
  };

  // Check in-memory client cache
  const cached = clientTtsCache.get(cacheKey);
  if (cached) {
    playBase64(cached.base64, cached.format);
    return true;
  }

  // Fetch from backend
  const abortCtrl = new AbortController();
  activeAudioAbortController = abortCtrl;

  speechApi
    .synthesize(cleanText, voiceId, speed, pitch, provider)
    .then((res) => {
      if (abortCtrl.signal.aborted) return;
      if (res && res.audio_base64) {
        if (clientTtsCache.size >= 200) {
          const firstKey = clientTtsCache.keys().next().value;
          if (firstKey) clientTtsCache.delete(firstKey);
        }
        clientTtsCache.set(cacheKey, { base64: res.audio_base64, format: res.format || "mp3" });
        playBase64(res.audio_base64, res.format || "mp3");
      } else {
        speakWithWebSpeech(cleanText, options);
      }
    })
    .catch((err) => {
      if (abortCtrl.signal.aborted) return;
      console.warn("[UniversalTTS] Backend synthesis failed, falling back to Web Speech:", err);
      speakWithWebSpeech(cleanText, options);
    });

  return true;
}
