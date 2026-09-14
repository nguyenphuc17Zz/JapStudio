"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMicrophone } from "@/features/speaking/hooks/useMicrophone";
import { useVoiceActivityDetection } from "@/features/speaking/hooks/useVoiceActivityDetection";
import { useSpeechPreview } from "@/features/speaking/hooks/useSpeechPreview";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { useAizuchiWindow } from "./useAizuchiWindow";
import * as aizuchiApi from "../services/aizuchi-api";
import type {
  AizuchiExercise,
  AizuchiRelation,
  AizuchiResult,
  AizuchiSubMode,
  WindowProfile,
} from "../services/aizuchi-api";

export type AizuchiPhase =
  | "idle"
  | "loading"
  | "npc_speaking"
  | "ready"
  | "window_open"
  | "recording"
  | "evaluating"
  | "result"
  | "summary";

export interface UseAizuchiSessionOptions {
  subMode: AizuchiSubMode;
  relation: AizuchiRelation;
  windowProfile: WindowProfile;
  startTrigger?: "manual" | "auto";
  speed?: number;
  autoNext?: boolean;
  autoNextDelayMs?: number;
  onResult?: (r: AizuchiResult) => void;
}

const BC_TYPE_HINT: Record<string, RegExp> = {
  surprise: /へー|えー|マジ|まじ|そうなんだ|本当|ほんと|うそ/,
  empathy: /確かに|だよね|大変|たいへん|最悪|よかった|お疲れ|それは/,
  continuer: /^(うん|はい|ええ|なるほど|ふーん)/,
  followup: /それで|どうした|どうなった|その後|じゃあ/,
  polite_interrupt: /すみません|よろしい|恐れ入り|失礼/,
};

function guessBcType(text: string): string | null {
  const t = (text || "").trim();
  if (!t) return null;
  for (const [k, re] of Object.entries(BC_TYPE_HINT)) {
    if (re.test(t)) return k;
  }
  return null;
}

export function useAizuchiSession(opts: UseAizuchiSessionOptions) {
  const { subMode, relation, windowProfile, startTrigger = "manual", speed = 1.0, autoNext = true, autoNextDelayMs = 2200, onResult } = opts;

  const [phase, setPhase] = useState<AizuchiPhase>("idle");
  const [exercise, setExercise] = useState<AizuchiExercise | null>(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [result, setResult] = useState<AizuchiResult | null>(null);
  const [results, setResults] = useState<AizuchiResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [stats, setStats] = useState({ total: 0, success: 0, bestLatency: Number.POSITIVE_INFINITY });
  const [streak, setStreak] = useState(0);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const exerciseRef = useRef(exercise);
  exerciseRef.current = exercise;
  const turnIndexRef = useRef(turnIndex);
  turnIndexRef.current = turnIndex;
  const startTriggerRef = useRef(startTrigger);
  startTriggerRef.current = startTrigger;
  const windowOpenAtRef = useRef<number | null>(null);
  const latencyRef = useRef<number | null>(null);
  const latestTranscriptRef = useRef("");
  const submittedRef = useRef(false);
  const usedTypesRef = useRef<string[]>([]);
  const autoNextTimerRef = useRef<NodeJS.Timeout | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const window = useAizuchiWindow();
  const windowRef = useRef(window);
  windowRef.current = window;

  const mic = useMicrophone();
  const micRef = useRef(mic);
  micRef.current = mic;

  const submitTurnRef = useRef<(transcript: string, opts?: { timedOut?: boolean }) => Promise<void>>(async () => {});

  const speechPreview = useSpeechPreview({
    language: "ja-JP",
    enabled: true,
    onTranscriptChange: (text) => {
      if (!text.trim()) return;
      latestTranscriptRef.current = text.trim();
      if (phaseRef.current === "window_open" && windowOpenAtRef.current !== null && latencyRef.current === null) {
        latencyRef.current = performance.now() - windowOpenAtRef.current;
        setPhase("recording");
      }
    },
  });
  const speechPreviewRef = useRef(speechPreview);
  speechPreviewRef.current = speechPreview;

  const { isUserSpeaking } = useVoiceActivityDetection({
    volumeLevel: mic.volumeLevel,
    sensitivity: "high",
    enabled: phase === "window_open" || phase === "recording",
    onSpeechStart: () => {
      if (phaseRef.current === "window_open" && windowOpenAtRef.current !== null && latencyRef.current === null) {
        latencyRef.current = performance.now() - windowOpenAtRef.current;
        setPhase("recording");
      }
    },
    onSpeechEnd: async () => {
      if (phaseRef.current === "recording" || phaseRef.current === "window_open") {
        const captured = latestTranscriptRef.current || speechPreviewRef.current.interimTranscript.trim();
        if (captured && !submittedRef.current) {
          await submitTurnRef.current(captured);
        }
      }
    },
  });
  void isUserSpeaking;

  // Release mic when not capturing
  useEffect(() => {
    if (phase !== "window_open" && phase !== "recording") {
      micRef.current.releaseMicrophone();
      speechPreviewRef.current.stopPreview();
    }
  }, [phase]);

  useEffect(() => {
    return () => {
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      try {
        stopWebSpeech();
      } catch {}
      micRef.current.releaseMicrophone();
      speechPreviewRef.current.stopPreview();
    };
  }, []);

  const openWindow = useCallback(() => {
    if (phaseRef.current !== "npc_speaking" && phaseRef.current !== "ready") return;
    const ex = exerciseRef.current;
    const turn = ex?.npcTurns[turnIndexRef.current];
    const wms = turn?.pause_window_ms ?? ex?.windowMs ?? 600;
    submittedRef.current = false;
    latencyRef.current = null;
    latestTranscriptRef.current = "";
    speechPreviewRef.current.clearPreview();
    windowOpenAtRef.current = performance.now();
    setPhase("window_open");
    windowRef.current.start(wms, () => {
      // Window expired with no speech captured
      if (!submittedRef.current && !latestTranscriptRef.current) {
        void submitTurnRef.current("", { timedOut: true });
      } else if (!submittedRef.current && latestTranscriptRef.current) {
        void submitTurnRef.current(latestTranscriptRef.current);
      }
    });
    void speechPreviewRef.current.startPreview();
    void micRef.current.startRecording();
  }, []);

  const onNpcFinished = useCallback(() => {
    if (phaseRef.current !== "npc_speaking") return;
    if (startTriggerRef.current === "manual") {
      setPhase("ready");
    } else {
      openWindow();
    }
  }, [openWindow]);

  const playCurrentTurn = useCallback(() => {
    const ex = exerciseRef.current;
    const turn = ex?.npcTurns[turnIndexRef.current];
    if (!ex || !turn) return;
    setPhase("npc_speaking");
    try {
      speakJapaneseText(turn.text, {
        rate: optsRef.current.speed ?? 1.0,
        onEnd: () => onNpcFinished(),
        onError: () => onNpcFinished(),
      });
      // Safety: if TTS never callbacks (no voice), transition after estimate
      setTimeout(() => {
        if (phaseRef.current === "npc_speaking") onNpcFinished();
      }, Math.min(12000, 1500 + turn.text.length * 220));
    } catch {
      onNpcFinished();
    }
  }, [onNpcFinished]);

  const startAizuchiNow = useCallback(() => {
    if (phaseRef.current !== "ready" && phaseRef.current !== "npc_speaking") return;
    try {
      stopWebSpeech();
    } catch {}
    openWindow();
  }, [openWindow]);

  const submitTurn = useCallback(
    async (transcript: string, o?: { timedOut?: boolean }) => {
      if (submittedRef.current) return;
      const ex = exerciseRef.current;
      if (!ex) return;
      submittedRef.current = true;
      windowRef.current.stop();
      micRef.current.releaseMicrophone();
      speechPreviewRef.current.stopPreview();
      setPhase("evaluating");
      const timedOut = !!o?.timedOut || !transcript.trim();
      const bcType = transcript.trim() ? guessBcType(transcript) : null;
      const latency = timedOut ? null : latencyRef.current;
      const turn = ex.npcTurns[turnIndexRef.current];
      const wms = turn?.pause_window_ms ?? ex.windowMs ?? 600;
      try {
        const data = (await aizuchiApi.submitAttempt(ex.id, {
          user_transcript: transcript.trim(),
          reaction_latency_ms: latency,
          window_ms: wms,
          timed_out: timedOut,
          overlap_rude: false,
          bc_type: bcType,
          speech_confidence: transcript.trim() ? 0.8 : 0,
        })) as any;
        const assessment = data.metrics?.aizuchi_assessment || data.assessment || {};
        const turnSamples = turn?.sample_responses || data.metrics?.sample_responses || ex.sampleResponses || [];
        const res: AizuchiResult = {
          exerciseId: ex.id,
          turnIndex: turnIndexRef.current,
          success: !!data.success,
          score: Number(data.score ?? 0),
          feedback: data.feedback || "",
          transcript: transcript.trim(),
          assessment,
          reactionLatencyMs: latency,
          windowMs: wms,
          timedOut,
          overlapRude: false,
          bcType: data.bc_type || bcType,
          isPerfect: !!data.is_perfect,
          sampleResponses: turnSamples,
        };
        if (res.bcType) {
          usedTypesRef.current = [...usedTypesRef.current, res.bcType];
        }
        setResult(res);
        setResults((prev) => [...prev, res]);
        setStats((s) => ({
          total: s.total + 1,
          success: s.success + (res.success ? 1 : 0),
          bestLatency: latency !== null ? Math.min(s.bestLatency, latency) : s.bestLatency,
        }));
        setStreak((s) => (res.success ? s + 1 : 0));
        setPhase("result");
        optsRef.current.onResult?.(res);
        if (optsRef.current.autoNext) {
          if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
          autoNextTimerRef.current = setTimeout(() => {
            nextTurn();
          }, optsRef.current.autoNextDelayMs ?? 2200);
        }
      } catch (e: any) {
        setError(e?.message || "Gửi bài thất bại. Hãy thử lại.");
        setPhase("result");
      }
    },
    []
  );
  submitTurnRef.current = submitTurn;

  const nextTurn = useCallback(() => {
    const ex = exerciseRef.current;
    if (!ex) return;
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    try {
      stopWebSpeech();
    } catch {}
    setResult(null);
    if (turnIndexRef.current + 1 < ex.npcTurns.length) {
      setTurnIndex(turnIndexRef.current + 1);
      // play after state settles
      setTimeout(() => playCurrentTurn(), 350);
    } else {
      setPhase("summary");
    }
  }, [playCurrentTurn]);

  const startSession = useCallback(async () => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    try {
      stopWebSpeech();
    } catch {}
    setError(null);
    setResult(null);
    setResults([]);
    setStats({ total: 0, success: 0, bestLatency: Number.POSITIVE_INFINITY });
    setStreak(0);
    setIsPaused(false);
    usedTypesRef.current = [];
    setPhase("loading");
    try {
      const ex = await aizuchiApi.generateExercise({
        subMode: optsRef.current.subMode,
        relation: optsRef.current.relation,
        windowProfile: optsRef.current.windowProfile,
        speed: optsRef.current.speed ?? 1.0,
        numTurns: 3,
      });
      if (!ex.npcTurns || ex.npcTurns.length === 0) {
        throw new Error("Bài tập rỗng (NPC turns). Hãy thử lại.");
      }
      setExercise(ex);
      setTurnIndex(0);
      setTimeout(() => playCurrentTurn(), 350);
    } catch (e: any) {
      setError(e?.message || "Tạo bài thất bại. Hãy thử lại.");
      setPhase("idle");
    }
  }, [playCurrentTurn]);

  const stopSession = useCallback(() => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    try {
      stopWebSpeech();
    } catch {}
    windowRef.current.stop();
    micRef.current.releaseMicrophone();
    speechPreviewRef.current.stopPreview();
    setIsPaused(false);
    setPhase("idle");
  }, []);

  const submitManual = useCallback(
    async (text: string) => {
      if (phaseRef.current !== "window_open" && phaseRef.current !== "recording") return;
      if (windowOpenAtRef.current !== null && latencyRef.current === null && text.trim()) {
        latencyRef.current = performance.now() - windowOpenAtRef.current;
      }
      await submitTurn(text);
    },
    [submitTurn]
  );

  const skipTurn = useCallback(async () => {
    if (phaseRef.current !== "window_open" && phaseRef.current !== "recording") return;
    await submitTurn("", { timedOut: true });
  }, [submitTurn]);

  const togglePause = useCallback(() => {
    if (phaseRef.current !== "window_open" && phaseRef.current !== "recording") return;
    if (windowRef.current.totalMs <= 0) return;
    windowRef.current.togglePause();
    setIsPaused((p) => !p);
  }, []);

  const cancelAutoNext = useCallback(() => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
  }, []);

  // True skip: advance without submitting (no score, no streak change)
  const skip = useCallback(() => {
    cancelAutoNext();
    try {
      stopWebSpeech();
    } catch {}
    windowRef.current.stop();
    submittedRef.current = true;
    micRef.current.releaseMicrophone();
    speechPreviewRef.current.stopPreview();
    setResult(null);
    nextTurn();
  }, [cancelAutoNext, nextTurn]);

  // Retry current turn (replay NPC + reopen window)
  const retry = useCallback(() => {
    cancelAutoNext();
    try {
      stopWebSpeech();
    } catch {}
    windowRef.current.stop();
    setResult(null);
    setTimeout(() => playCurrentTurn(), 350);
  }, [cancelAutoNext, playCurrentTurn]);

  const startNext = useCallback(() => {
    nextTurn();
  }, [nextTurn]);

  // Rush: skip NPC TTS and open the pause window immediately
  const rushToWindow = useCallback(() => {
    if (phaseRef.current !== "npc_speaking" && phaseRef.current !== "ready") return;
    try {
      stopWebSpeech();
    } catch {}
    openWindow();
  }, [openWindow]);

  const currentTurn = exercise?.npcTurns[turnIndex] || null;
  const variety = Array.from(new Set(usedTypesRef.current));

  return {
    phase,
    setPhase,
    exercise,
    currentTurn,
    turnIndex,
    totalTurns: exercise?.npcTurns.length || 0,
    result,
    results,
    error,
    stats,
    streak,
    variety,
    window: { remainingMs: window.remainingMs, totalMs: window.totalMs, ratio: window.ratio, state: window.state },
    timer: { remainingMs: window.remainingMs, totalLimitMs: window.totalMs, progress: window.ratio, state: window.state, isActive: phase === "window_open" || phase === "recording" },
    liveTranscript: speechPreview.interimTranscript,
    volumeLevel: mic.volumeLevel,
    micGain: mic.micGain,
    setMicGain: mic.setMicGain,
    isWhisperMode: mic.isWhisperMode,
    toggleWhisperMode: mic.toggleWhisperMode,
    recorder: { releaseMicrophone: () => micRef.current.releaseMicrophone() },
    speech: { interimTranscript: speechPreview.interimTranscript, transcript: speechPreview.interimTranscript, stopListening: () => speechPreviewRef.current.stopPreview() },
    isPaused,
    setIsPaused,
    togglePause,
    startSession,
    stopSession,
    nextTurn,
    startNext,
    retry,
    skip,
    cancelAutoNext,
    submitManual,
    skipTurn,
    playCurrentTurn,
    rushToWindow,
    startAizuchiNow,
  };
}
