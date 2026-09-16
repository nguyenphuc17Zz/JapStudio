"use client";

import { SessionMode, VADSensitivity, VoiceSettingsConfig } from "../types";

const LOBBY_STORAGE_KEY = "speaking_training_lobby_prefs_v1";

export interface SavedLobbyPreferences {
  mode: SessionMode;
  ai_provider: string;
  ai_model: string;
  stt_provider: string;
  stt_model: string;
  tts_provider: string;
  tts_engine: "edge_tts" | "web_speech" | "none";
  tts_enabled: boolean;
  tts_voice: string;
  tts_speed?: number;
  auto_end_of_speech: boolean;
  vad_sensitivity: VADSensitivity;
}

export const DEFAULT_SAVED_PREFERENCES: SavedLobbyPreferences = {
  mode: "conversation",
  ai_provider: "auto",
  ai_model: "auto",
  stt_provider: "faster_whisper",
  stt_model: "base",
  tts_provider: "edge_tts",
  tts_engine: "edge_tts",
  tts_enabled: true,
  tts_voice: "ja-JP-NanamiNeural",
  tts_speed: 1.0,
  auto_end_of_speech: true,
  vad_sensitivity: "medium",
};

/**
 * Safely reads saved speaking lobby preferences from localStorage.
 */
export function getSavedLobbyPreferences(): SavedLobbyPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_SAVED_PREFERENCES;
  }

  try {
    const raw = localStorage.getItem(LOBBY_STORAGE_KEY);
    if (!raw) return DEFAULT_SAVED_PREFERENCES;

    const parsed = JSON.parse(raw);
    const prefs = {
      ...DEFAULT_SAVED_PREFERENCES,
      ...parsed,
    };
    // Migrate legacy 'voicevox'/'kokoro' preferences to 'edge_tts'
    if (prefs.tts_provider === "voicevox" || prefs.tts_provider === "kokoro") {
      prefs.tts_provider = "edge_tts";
    }
    if (prefs.tts_engine === "voicevox" || (prefs.tts_engine as string) === "kokoro") {
      prefs.tts_engine = "edge_tts";
    }
    if (prefs.tts_voice === "1" || (typeof prefs.tts_voice === "string" && /^(jf_|jm_)/.test(prefs.tts_voice))) {
      prefs.tts_voice = "ja-JP-NanamiNeural";
    }
    return prefs;
  } catch (err) {
    console.warn("[LobbyPreferences] Failed to load preferences from localStorage:", err);
    return DEFAULT_SAVED_PREFERENCES;
  }
}

/**
 * Persists updated speaking lobby preferences to localStorage.
 */
export function saveLobbyPreferences(updates: Partial<SavedLobbyPreferences>): SavedLobbyPreferences {
  if (typeof window === "undefined") {
    return { ...DEFAULT_SAVED_PREFERENCES, ...updates };
  }

  try {
    const current = getSavedLobbyPreferences();
    const next: SavedLobbyPreferences = {
      ...current,
      ...updates,
    };
    localStorage.setItem(LOBBY_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(
      new CustomEvent("speaking_lobby_prefs_changed", { detail: next })
    );
    return next;
  } catch (err) {
    console.warn("[LobbyPreferences] Failed to save preferences to localStorage:", err);
    return { ...DEFAULT_SAVED_PREFERENCES, ...updates };
  }
}

/**
 * Synchronizes lobby preferences from backend AudioSettings.
 */
export function syncLobbyPreferencesFromAudioSettings(settings: {
  default_tts_provider?: string | null;
  default_voice_profile_id?: string | null;
  default_tts_speed?: number | null;
}): SavedLobbyPreferences {
  const updates: Partial<SavedLobbyPreferences> = {};
  if (settings.default_tts_provider) {
    updates.tts_provider = settings.default_tts_provider;
    if (["edge_tts", "web_speech"].includes(settings.default_tts_provider)) {
      updates.tts_engine = settings.default_tts_provider as any;
    }
  }
  if (settings.default_voice_profile_id) {
    updates.tts_voice = settings.default_voice_profile_id;
  }
  if (settings.default_tts_speed != null) {
    updates.tts_speed = settings.default_tts_speed;
  }
  return saveLobbyPreferences(updates);
}
