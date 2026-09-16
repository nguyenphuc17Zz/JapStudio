"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMicrophone } from "@/features/speaking/hooks/useMicrophone";
import { useVoiceActivityDetection } from "@/features/speaking/hooks/useVoiceActivityDetection";
import { useSpeechPreview } from "@/features/speaking/hooks/useSpeechPreview";
import { isVietnameseVoiceAvailable, speakVietnameseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { toast } from "@/lib/toast";
import { useInterpretTimer } from "./useInterpretTimer";
import * as interpretApi from "../services/interpret-api";
import type {
  InterpretExercise,
  InterpretRelation,
  InterpretResult,
  InterpretScaffold,
  InterpretSubMode,
} from "../services/interpret-api";

export type InterpretPhase =
  | "idle"
  | "loading"
  | "prompt"
  | "ready"
  | "answering"
  | "evaluating"
  | "result"
  | "summary";

export interface UseInterpretSessionOptions {
  subMode: InterpretSubMode;
  relation: InterpretRelation;
  scaffold: InterpretScaffold;
  topic?: string;
  startTrigger?: "manual" | "auto";
  autoNext?: boolean;
  autoNextDelayMs?: number;
  onResult?: (r: InterpretResult) => void;
}

export function useInterpretSession(opts: UseInterpretSessionOptions) {
  const { subMode, relation, scaffold, topic, startTrigger = "manual", autoNext = true, autoNextDelayMs = 4500, onResult } = opts;

  const [phase, setPhase] = useState<InterpretPhase>("idle");
  const [exercise, setExercise] = useState<InterpretExercise | null>(null);
  const [result, setResult] = useState<InterpretResult | null>(null);
  const [results, setResults] = useState<InterpretResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, success: 0 });
  const [streak, setStreak] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isRegeneratingAI, setIsRegeneratingAI] = useState(false);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const exerciseRef = useRef(exercise);
  exerciseRef.current = exercise;
  const startTriggerRef = useRef(startTrigger);
  startTriggerRef.current = startTrigger;
  const promptAtRef = useRef<number | null>(null);
  const latestTranscriptRef = useRef("");
  const submittedRef = useRef(false);
  const autoNextTimerRef = useRef<NodeJS.Timeout | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const timer = useInterpretTimer();
  const timerRef = useRef(timer);
  timerRef.current = timer;

  const mic = useMicrophone();
  const micRef = useRef(mic);
  micRef.current = mic;

  const submitAnswerRef = useRef<(transcript: string, o?: { timedOut?: boolean }) => Promise<void>>(async () => {});

  const speechPreview = useSpeechPreview({
    language: "ja-JP",
    enabled: true,
    onTranscriptChange: (text) => {
      if (!text.trim()) return;
      latestTranscriptRef.current = text.trim();
    },
  });
  const speechPreviewRef = useRef(speechPreview);
  speechPreviewRef.current = speechPreview;

  const { isUserSpeaking } = useVoiceActivityDetection({
    volumeLevel: mic.volumeLevel,
    sensitivity: "high",
    enabled: phase === "answering",
    onSpeechEnd: async () => {
      if (phaseRef.current === "answering") {
        const captured = latestTranscriptRef.current || speechPreviewRef.current.interimTranscript.trim();
        if (captured && !submittedRef.current) {
          await submitAnswerRef.current(captured);
        }
      }
    },
  });
  void isUserSpeaking;

  useEffect(() => {
    if (phase !== "answering") {
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

  const beginAnswering = useCallback(() => {
    const ex = exerciseRef.current;
    if (!ex) return;
    submittedRef.current = false;
    latestTranscriptRef.current = "";
    speechPreviewRef.current.clearPreview();
    promptAtRef.current = performance.now();
    setPhase("answering");
    timerRef.current.start(ex.timerMs, () => {
      if (!submittedRef.current) {
        const captured = latestTranscriptRef.current;
        void submitAnswerRef.current(captured, { timedOut: !captured.trim() });
      }
    });
    void speechPreviewRef.current.startPreview();
    void micRef.current.startRecording();
  }, []);

  const readPromptVi = useCallback(() => {
    const ex = exerciseRef.current;
    if (!ex?.promptVi) return;
    if (!isVietnameseVoiceAvailable()) {
      console.warn("[Interpret] Vietnamese TTS voice not installed — showing text only. Install 'Tiếng Việt' voice in Windows Settings > Time & Language > Language.");
      return;
    }
    try {
      stopWebSpeech();
      speakVietnameseText(ex.promptVi, { rate: 0.95 });
    } catch {}
  }, []);

  const onPromptFinished = useCallback(() => {
    if (phaseRef.current !== "prompt" && phaseRef.current !== "loading") return;
    if (startTriggerRef.current === "manual") {
      setPhase("ready");
    } else {
      beginAnswering();
    }
  }, [beginAnswering]);

  const showPrompt = useCallback(() => {
    setPhase("prompt");
    // Auto-read the Vietnamese prompt once, then open answering/ready.
    // If no vi-VN voice installed we skip TTS entirely (avoid English-voice gibberish) and go straight to answering/ready.
    const ex = exerciseRef.current;
    if (ex?.promptVi && isVietnameseVoiceAvailable()) {
      try {
        const ok = speakVietnameseText(ex.promptVi, {
          rate: 0.95,
          onEnd: () => onPromptFinished(),
          onError: () => onPromptFinished(),
        });
        if (ok) {
          setTimeout(() => {
            if (phaseRef.current === "prompt") onPromptFinished();
          }, Math.min(15000, 2000 + ex.promptVi.length * 120));
          return;
        }
      } catch {}
    }
    // No Vietnamese voice or TTS failed → show text-only prompt
    onPromptFinished();
  }, [onPromptFinished]);

  const startAnsweringNow = useCallback(() => {
    if (phaseRef.current !== "ready" && phaseRef.current !== "prompt") return;
    try {
      stopWebSpeech();
    } catch {}
    beginAnswering();
  }, [beginAnswering]);

  const submitAnswer = useCallback(async (transcript: string, o?: { timedOut?: boolean }) => {
    if (submittedRef.current) return;
    const ex = exerciseRef.current;
    if (!ex) return;
    submittedRef.current = true;
    timerRef.current.stop();
    micRef.current.releaseMicrophone();
    speechPreviewRef.current.stopPreview();
    setPhase("evaluating");
    const timedOut = !!o?.timedOut || !transcript.trim();
    const latency = timedOut || promptAtRef.current === null ? null : performance.now() - promptAtRef.current;
    try {
      const data = (await interpretApi.submitAttempt(ex.id, {
        user_transcript: transcript.trim(),
        reaction_latency_ms: latency,
        timer_ms: ex.timerMs,
        timed_out: timedOut,
        speech_confidence: transcript.trim() ? 0.8 : 0,
        expected_keywords: ex.expectedJaKeywords,
        blind: ex.blind,
        independence: "independent",
      })) as any;
      const assessment = data.metrics?.interpret_assessment || data.assessment || {};
      const res: InterpretResult = {
        exerciseId: ex.id,
        success: !!data.success,
        score: Number(data.score ?? 0),
        feedback: data.feedback || "",
        transcript: transcript.trim(),
        assessment,
        reactionLatencyMs: latency,
        timerMs: ex.timerMs,
        timedOut,
        keywordsHit: data.keywords_hit || assessment.keywords_hit || [],
        vietglishFlags: data.vietglish_flags || assessment.vietglish_flags || [],
        fidelityMap: data.fidelity || assessment.fidelity_map || [],
        isPerfect: !!data.is_perfect,
        subMode: ex.subMode,
        referenceJa: data.metrics?.reference_ja || ex.referenceJa || null,
      };
      setResult(res);
      setResults((prev) => [...prev, res]);
      setStats((s) => ({ total: s.total + 1, success: s.success + (res.success ? 1 : 0) }));
      setStreak((s) => (res.success ? s + 1 : 0));
      setPhase("result");
      optsRef.current.onResult?.(res);
      if (optsRef.current.autoNext) {
        if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = setTimeout(() => {
          nextExercise();
        }, optsRef.current.autoNextDelayMs ?? 4500);
      }
    } catch (e: any) {
      setError(e?.message || "Gửi bài thất bại. Hãy thử lại.");
      setPhase("result");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  submitAnswerRef.current = submitAnswer;

  const nextExercise = useCallback(() => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    try {
      stopWebSpeech();
    } catch {}
    setResult(null);
    void fetchExercise();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchExercise = useCallback(async () => {
    setError(null);
    setPhase("loading");
    try {
      const ex = await interpretApi.generateExercise({
        subMode: optsRef.current.subMode,
        relation: optsRef.current.relation,
        scaffold: optsRef.current.scaffold,
        topic: optsRef.current.topic,
      });
      setExercise(ex);
      setTimeout(() => showPrompt(), 300);
    } catch (e: any) {
      setError(e?.message || "Tạo bài thất bại. Hãy thử lại.");
      setPhase("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startSession = useCallback(() => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    try {
      stopWebSpeech();
    } catch {}
    setResult(null);
    setResults([]);
    setStats({ total: 0, success: 0 });
    setStreak(0);
    setIsPaused(false);
    void fetchExercise();
  }, [fetchExercise]);

  const stopSession = useCallback(() => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    try {
      stopWebSpeech();
    } catch {}
    timerRef.current.stop();
    micRef.current.releaseMicrophone();
    speechPreviewRef.current.stopPreview();
    setIsPaused(false);
    setPhase("idle");
  }, []);

  const showSummary = useCallback(() => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    try {
      stopWebSpeech();
    } catch {}
    timerRef.current.stop();
    setPhase("summary");
  }, []);

  const submitManual = useCallback(
    async (text: string) => {
      if (phaseRef.current !== "answering") return;
      await submitAnswer(text);
    },
    [submitAnswer]
  );

  const skipExercise = useCallback(async () => {
    if (phaseRef.current !== "answering" && phaseRef.current !== "prompt") return;
    timerRef.current.stop();
    await submitAnswer("", { timedOut: true });
  }, [submitAnswer]);

  const togglePause = useCallback(() => {
    if (phaseRef.current !== "answering") return;
    if (timerRef.current.totalMs <= 0) return;
    timerRef.current.togglePause();
    setIsPaused((p) => !p);
  }, []);

  const cancelAutoNext = useCallback(() => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
  }, []);

  // True skip: next exercise without submitting
  const skip = useCallback(() => {
    cancelAutoNext();
    try {
      stopWebSpeech();
    } catch {}
    timerRef.current.stop();
    setIsPaused(false);
    setResult(null);
    void fetchExercise();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelAutoNext]);

  // Retry current exercise (re-answer same prompt)
  const retry = useCallback(() => {
    cancelAutoNext();
    try {
      stopWebSpeech();
    } catch {}
    timerRef.current.stop();
    setIsPaused(false);
    setResult(null);
    setTimeout(() => showPrompt(), 350);
  }, [cancelAutoNext, showPrompt]);

  const startNext = useCallback(() => {
    nextExercise();
  }, [nextExercise]);

  // Rush: skip VI prompt TTS and start answering immediately
  const rushToAnswer = useCallback(() => {
    if (phaseRef.current !== "prompt" && phaseRef.current !== "ready") return;
    try {
      stopWebSpeech();
    } catch {}
    beginAnswering();
  }, [beginAnswering]);

  // On-demand AI regeneration (bypass cache)
  const regenerateWithAI = useCallback(
    async (overrideTopic?: string) => {
      cancelAutoNext();
      try {
        stopWebSpeech();
      } catch {}
      timerRef.current.stop();
      setIsPaused(false);
      setResult(null);
      setIsRegeneratingAI(true);
      try {
        const ex = await interpretApi.generateExercise({
          subMode: optsRef.current.subMode,
          relation: optsRef.current.relation,
          scaffold: optsRef.current.scaffold,
          topic: overrideTopic ?? optsRef.current.topic,
          force_ai: true,
        });
        setExercise(ex);
        toast.success("✨ Đã tạo bài tập mới từ AI theo chuyên đề!");
        setTimeout(() => showPrompt(), 300);
      } catch (err: any) {
        toast.error("Không thể tạo bài AI lúc này. Vui lòng thử lại!");
      } finally {
        setIsRegeneratingAI(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cancelAutoNext, showPrompt]
  );

  return {
    phase,
    setPhase,
    exercise,
    result,
    results,
    error,
    stats,
    streak,
    timer: { remainingMs: timer.remainingMs, totalMs: timer.totalMs, ratio: timer.ratio },
    combatTimer: { remainingMs: timer.remainingMs, totalLimitMs: timer.totalMs, progress: timer.ratio, state: timer.ratio > 0.5 ? "normal" as const : timer.ratio > 0.25 ? "warning" as const : "critical" as const, isActive: phase === "answering" },
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
    isRegeneratingAI,
    regenerateWithAI,
    startSession,
    stopSession,
    nextExercise,
    startNext,
    retry,
    skip,
    cancelAutoNext,
    showSummary,
    submitManual,
    skipExercise,
    readPromptVi,
    rushToAnswer,
    startAnsweringNow,
  };
}
