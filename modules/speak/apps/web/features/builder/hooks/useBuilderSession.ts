"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMicrophone } from "@/features/speaking/hooks/useMicrophone";
import { useVoiceActivityDetection } from "@/features/speaking/hooks/useVoiceActivityDetection";
import { useSpeechPreview } from "@/features/speaking/hooks/useSpeechPreview";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { toast } from "@/lib/toast";
import { useBuilderTimer } from "./useBuilderTimer";
import * as builderApi from "../services/builder-api";
import type {
  BuilderExercise,
  BuilderRelation,
  BuilderResult,
  BuilderScaffold,
  BuilderSkill,
  BuilderSubMode,
} from "../services/builder-api";

export type BuilderPhase =
  | "idle"
  | "loading"
  | "prompt"
  | "ready"
  | "answering"
  | "evaluating"
  | "result"
  | "summary";

export interface UseBuilderSessionOptions {
  subMode: BuilderSubMode;
  focusSkill?: BuilderSkill;
  relation?: BuilderRelation;
  scaffold?: BuilderScaffold;
  startTrigger?: "manual" | "auto";
  autoNext?: boolean;
  autoNextDelayMs?: number;
  onResult?: (r: BuilderResult) => void;
}

export function useBuilderSession(opts: UseBuilderSessionOptions) {
  const {
    subMode,
    focusSkill = "te_chain",
    relation = "casual_friend",
    scaffold = "keyword_hint",
    startTrigger = "manual",
    autoNext = true,
    autoNextDelayMs = 2200,
    onResult,
  } = opts;

  const [phase, setPhase] = useState<BuilderPhase>("idle");
  const [exercise, setExercise] = useState<BuilderExercise | null>(null);
  const [result, setResult] = useState<BuilderResult | null>(null);
  const [results, setResults] = useState<BuilderResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, success: 0 });
  const [streak, setStreak] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isRegeneratingAI, setIsRegeneratingAI] = useState(false);
  const [assembledText, setAssembledText] = useState("");
  const [hintTier, setHintTier] = useState<1 | 2 | 3 | 4>(1);

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

  const timer = useBuilderTimer();
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

  const onPromptFinished = useCallback(() => {
    if (phaseRef.current !== "prompt" && phaseRef.current !== "loading") return;
    if (startTriggerRef.current === "manual") {
      setPhase("ready");
    } else {
      beginAnswering();
    }
  }, [beginAnswering]);

  const playPrompt = useCallback(() => {
    const ex = exerciseRef.current;
    if (!ex) return;
    setPhase("prompt");
    const speakText =
      ex.subMode === "sentence_assemble"
        ? [...ex.keywords, ex.starter || ""].filter(Boolean).join("、")
        : ex.sourceSentence || ex.scenario || "";
    if (!speakText) {
      onPromptFinished();
      return;
    }
    try {
      speakJapaneseText(speakText, {
        rate: 0.95,
        onEnd: () => onPromptFinished(),
        onError: () => onPromptFinished(),
      });
      setTimeout(() => {
        if (phaseRef.current === "prompt") onPromptFinished();
      }, Math.min(15000, 2000 + speakText.length * 250));
    } catch {
      onPromptFinished();
    }
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
      const data = (await builderApi.submitAttempt(ex.id, {
        user_transcript: transcript.trim(),
        reaction_latency_ms: latency,
        timer_ms: ex.timerMs,
        timed_out: timedOut,
        speech_confidence: transcript.trim() ? 0.8 : 0,
        focus_skill: ex.focusSkill,
        keywords: ex.keywords,
        scaffold_level: ex.blind ? "none" : ex.scaffold === "keyword_hint" ? "keyword_hint" : ex.scaffold === "sentence_starter" ? "sentence_starter" : "structured_options",
        blind: ex.blind,
        independence: "independent",
      })) as any;
      const assessment = data.metrics?.builder_assessment || data.assessment || {};
      const res: BuilderResult = {
        exerciseId: ex.id,
        success: !!data.success,
        score: Number(data.score ?? 0),
        feedback: data.feedback || "",
        transcript: transcript.trim(),
        assessment,
        reactionLatencyMs: latency,
        timerMs: ex.timerMs,
        timedOut,
        keywordsUsed: data.keywords_used || assessment.keywords_used || [],
        keywordsMissing: data.keywords_missing || [],
        clauses: data.clauses || assessment.clauses || [],
        isPerfect: !!data.is_perfect,
        focusSkill: ex.focusSkill,
        subMode: ex.subMode,
        canonical: data.metrics?.canonical || ex.canonical || "",
        canonicalVi: data.metrics?.canonical_vi || ex.canonicalVi || "",
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
    setAssembledText("");
    setHintTier(1);
    void fetchExercise();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchExercise = useCallback(async () => {
    setError(null);
    setPhase("loading");
    try {
      const ex = await builderApi.generateExercise({
        subMode: optsRef.current.subMode,
        focusSkill: optsRef.current.focusSkill,
        relation: optsRef.current.relation,
        scaffold: optsRef.current.scaffold,
      });
      setExercise(ex);
      setTimeout(() => playPrompt(), 300);
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
    setAssembledText("");
    setHintTier(1);
    void fetchExercise();
  }, [fetchExercise]);

  const regenerateWithAI = useCallback(async () => {
    if (isRegeneratingAI) return;
    setIsRegeneratingAI(true);
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
    setResult(null);
    try {
      const ex = await builderApi.generateExercise({
        subMode: optsRef.current.subMode,
        focusSkill: optsRef.current.focusSkill,
        relation: optsRef.current.relation,
        scaffold: optsRef.current.scaffold,
        force_ai: true,
      });
      setExercise(ex);
      toast.success("✨ Đã sinh bài tập Xây câu mới từ AI!");
      setTimeout(() => playPrompt(), 300);
    } catch (e: any) {
      toast.error(e?.message || "Không thể gọi AI sinh bài mới.");
    } finally {
      setIsRegeneratingAI(false);
    }
  }, [isRegeneratingAI, playPrompt]);

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
    setAssembledText("");
    setTimeout(() => playPrompt(), 350);
  }, [cancelAutoNext, playPrompt]);

  const startNext = useCallback(() => {
    nextExercise();
  }, [nextExercise]);

  // Rush: skip prompt TTS and start answering immediately
  const rushToAnswer = useCallback(() => {
    if (phaseRef.current !== "prompt" && phaseRef.current !== "ready") return;
    try {
      stopWebSpeech();
    } catch {}
    beginAnswering();
  }, [beginAnswering]);

  return {
    phase,
    setPhase,
    exercise,
    result,
    results,
    error,
    stats,
    streak,
    assembledText,
    setAssembledText,
    hintTier,
    setHintTier,
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
    playPrompt,
    rushToAnswer,
    startAnsweringNow,
  };
}
