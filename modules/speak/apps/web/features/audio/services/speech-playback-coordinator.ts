"use client";

/**
 * Single-flight coordinator for ALL speech/audio outputs.
 *
 * The app has many independent players (useAudioPlayer instances, the
 * web-speech module element, speechSynthesis utterances, ad-hoc `new Audio()`
 * clips). Without coordination, spam-clicking replay/preview buttons layers
 * sounds on top of each other. Every output must claim() when starting and
 * release() when ending — claiming automatically stops the previous owner.
 */

export interface SpeechOutputOwner {
  stop: () => void;
}

let currentOwner: SpeechOutputOwner | null = null;

/** Stop the previous owner (if any) and register `owner` as the active output. */
export function claimSpeechOutput(owner: SpeechOutputOwner): void {
  if (typeof window === "undefined" || !owner) return;
  if (currentOwner && currentOwner !== owner) {
    try {
      currentOwner.stop();
    } catch {
      /* ignore stop errors from stale owners */
    }
  }
  currentOwner = owner;
}

/** Release the slot if `owner` still holds it (idempotent). */
export function releaseSpeechOutput(owner: SpeechOutputOwner): void {
  if (currentOwner === owner) {
    currentOwner = null;
  }
}

/** Force-stop whatever is currently playing (e.g. global mute). */
export function stopAllSpeechOutputs(): void {
  const owner = currentOwner;
  currentOwner = null;
  if (owner) {
    try {
      owner.stop();
    } catch {
      /* ignore */
    }
  }
}
