"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Music,
  Mic,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  BookOpen,
  Edit3,
  CheckCircle2,
} from "lucide-react";
import { usePitchSession } from "@/features/pitch/hooks/usePitchSession";
import { ReflexTimer as PitchTimer } from "@/features/reflex/components/ReflexTimer";
import { CombatCapsuleHUD } from "@/features/reflex/components/CombatCapsuleHUD";
import { PitchPromptCard } from "@/features/pitch/components/PitchPromptCard";
import { PitchResultCard } from "@/features/pitch/components/PitchResultCard";
import { PitchSessionSummary } from "@/features/pitch/components/PitchSessionSummary";
import { PitchCheatsheetModal } from "@/features/pitch/components/PitchCheatsheetModal";
import { PitchLobby, PITCH_SUB_MODES, PITCH_PRESSURE_LEVELS } from "@/features/pitch/components/PitchLobby";
import { GlobalKeybindingsModal } from "@/components/layout/global-keybindings-modal";
import { CoachPanel } from "@/features/coach";
import { usePathname } from "next/navigation";
import { useCoachCore } from "@/features/coach/hooks/useCoachCore";
import { CoachInsightCard } from "@/features/coach/components/CoachInsightCard";
import { useCoachProactive } from "@/features/coach/hooks/useCoachProactive";
import { useSystemKeybindings, formatKeyDisplay } from "@/hooks/use-system-keybindings";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import { ZenLoadingState } from "@/components/ui/zen-loading-state";
import { ZenUnifiedInputBar } from "@/components/ui/zen-unified-input-bar";
import { usePersistedState } from "@/hooks/use-persisted-state";

export default function PitchPage() {
  const [subMode, setSubMode] = usePersistedState<string>("speaking_pitch_submode", "mixed");
  const [pressure, setPressure] = usePersistedState<
    "infinite" | "relaxed" | "normal" | "fast" | "reflex" | "extreme"
  >("speaking_pitch_pressure", "normal");
  const [subtitleMode, setSubtitleMode] = usePersistedState<
    "hidden" | "japanese" | "japanese_reading" | "vietnamese"
  >("speaking_pitch_subtitle", "japanese");
  const [startTrigger, setStartTrigger] = usePersistedState<"manual" | "auto">(
    "speaking_pitch_trigger",
    "manual"
  );
  const [duration, setDuration] = usePersistedState<0 | 3 | 5 | 10 | 20>(
    "speaking_pitch_duration",
    5
  );
  const [autoNext, setAutoNext] = usePersistedState<boolean>("speaking_pitch_autonext", false);
  const [tier, setTier] = usePersistedState<number>("speaking_pitch_tier", 0);
  const [category, setCategory] = usePersistedState<string>("speaking_pitch_category", "all");
  const [showTextInput, setShowTextInput] = usePersistedState<boolean>(
    "speaking_pitch_show_text_input",
    false
  );

  const [transcriptInput, setTranscriptInput] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [showKeybindingsModal, setShowKeybindingsModal] = useState(false);
  const [sessionRemainingSec, setSessionRemainingSec] = useState(duration * 60);
  const [elapsedSec, setElapsedSec] = useState(0);

  const sessionEndTimestampRef = useRef<number | null>(null);
  const sessionPausedRemainingMsRef = useRef<number>(duration * 60 * 1000);

  const { matchesAction, keybindings } = useSystemKeybindings();

  const session = usePitchSession({
    subMode,
    pressureLevel: pressure as any,
    autoNext,
    startTrigger,
    tier,
    category,
  });
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const {
    phase: sessionPhase,
    isPaused: sessionPaused,
    setPhase: sessionSetPhase,
    onPromptAudioFinished,
    submitWithTranscript,
  } = session;

  useEffect(() => {
    if (sessionPhase === "idle" || sessionPhase === "summary" || showSummary) {
      setSessionRemainingSec(duration * 60);
      setElapsedSec(0);
      sessionEndTimestampRef.current = null;
      sessionPausedRemainingMsRef.current = duration * 60 * 1000;
    }
  }, [duration, sessionPhase, showSummary]);

  useEffect(() => {
    const isSessionActive = sessionPhase !== "idle" && sessionPhase !== "summary" && !showSummary;
    if (!isSessionActive) return;

    if (duration === 0) {
      // Endless session timer: count elapsed seconds upward
      const interval = setInterval(() => {
        setElapsedSec((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }

    if (sessionPaused) {
      if (sessionEndTimestampRef.current !== null) {
        const remaining = Math.max(0, sessionEndTimestampRef.current - Date.now());
        sessionPausedRemainingMsRef.current = remaining;
        sessionEndTimestampRef.current = null;
      }
      return;
    }

    if (sessionEndTimestampRef.current === null) {
      sessionEndTimestampRef.current = Date.now() + sessionPausedRemainingMsRef.current;
    }

    const interval = setInterval(() => {
      if (sessionEndTimestampRef.current === null) return;
      const remainingMs = sessionEndTimestampRef.current - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      setSessionRemainingSec(remainingSec);

      if (remainingSec <= 0) {
        clearInterval(interval);
        sessionEndTimestampRef.current = null;
        setShowSummary(true);
        sessionSetPhase("summary" as any);
        soundFX.playVictory();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [sessionPhase, sessionPaused, showSummary, sessionSetPhase, duration]);

  const timerMs = PITCH_PRESSURE_LEVELS.find((p) => p.id === pressure)?.ms ?? 5000;
  const activeExercise = session.exercise;
  const pathname = usePathname();
  const { insights, dismiss } = useCoachProactive();
  const [coachOpen, setCoachOpen] = useState(false);
  const coach = useCoachCore();

  const handleCoachSelect = (prompt: string) => {
    setCoachOpen(true);
    setTimeout(() => coach.ask(prompt, { route: pathname || "/pitch", exerciseId: (activeExercise as any)?.id }), 300);
  };

  const playedPromptExerciseIdRef = useRef<string | null>(null);

  const playPromptAudio = useCallback(
    (autoTransition = false) => {
      if (!activeExercise) return;
      const pc = activeExercise.extra_metadata?.pitch_config || {};
      const text = pc.canonical || pc.prompt || activeExercise.canonical || activeExercise.prompt;
      if (text) {
        speakJapaneseText(text, {
          rate: 1.0,
          onEnd: () => {
            if (autoTransition) onPromptAudioFinished();
          },
          onError: () => {
            if (autoTransition) onPromptAudioFinished();
          },
        });
      } else if (autoTransition) {
        onPromptAudioFinished();
      }
    },
    [activeExercise, onPromptAudioFinished]
  );

  useEffect(() => {
    if (session.phase === "prompt_playing" && activeExercise?.id) {
      if (playedPromptExerciseIdRef.current !== activeExercise.id) {
        playedPromptExerciseIdRef.current = activeExercise.id;
        playPromptAudio(true);
      }
    } else if (session.phase === "idle" || session.phase === "summary") {
      playedPromptExerciseIdRef.current = null;
      stopWebSpeech();
    }
  }, [session.phase, activeExercise?.id, playPromptAudio]);

  useEffect(() => {
    return () => {
      stopWebSpeech();
      sessionRef.current.recorder.releaseMicrophone();
      sessionRef.current.speech.stopListening();
    };
  }, []);

  useEffect(() => {
    if (session.phase === "result" && session.result) {
      if (session.result.isPerfect) {
        soundFX.playVictory();
      } else if (session.result.success) {
        soundFX.playSuikinkutsu();
      } else if (session.result.timedOut) {
        soundFX.playTaiko();
      }
    }
  }, [session.phase, session.result]);

  const speechTranscript = session.speech.transcript;
  const canonicalExercise = session.exercise?.canonical;
  const handleDirectSubmit = useCallback(async () => {
    const text = transcriptInput.trim() || speechTranscript.trim() || canonicalExercise || " ";
    await submitWithTranscript(text);
    setTranscriptInput("");
  }, [transcriptInput, speechTranscript, canonicalExercise, submitWithTranscript]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "textarea" || tag === "input") {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleDirectSubmit();
        }
        return;
      }

      if (
        (session.exercise?.subMode === "pitch_recognition" || session.exercise?.exercise_type === "pitch_recognition") &&
        (session.phase === "ready" || session.phase === "waiting_for_speech" || session.phase === "recording")
      ) {
        if (matchesAction(e, "pitchQuizOption1") || e.code === "Digit1" || e.code === "Numpad1") {
          e.preventDefault();
          soundFX.playSuikinkutsu();
          session.submitQuizChoice(0);
          return;
        } else if (matchesAction(e, "pitchQuizOption2") || e.code === "Digit2" || e.code === "Numpad2") {
          e.preventDefault();
          soundFX.playSuikinkutsu();
          session.submitQuizChoice(1);
          return;
        }
      }

      if (matchesAction(e, "openKeybindingsModal") || matchesAction(e, "drillToggleHelp")) {
        e.preventDefault();
        setShowKeybindingsModal((v) => !v);
      } else if (matchesAction(e, "pitchOpenCheatsheet")) {
        e.preventDefault();
        setShowCheatsheet((v) => !v);
      } else if (matchesAction(e, "pitchToggleInputMode")) {
        e.preventDefault();
        setShowTextInput((v) => !v);
      } else if (matchesAction(e, "pitchRetry") && session.phase === "result") {
        e.preventDefault();
        soundFX.playSuikinkutsu();
        session.retry();
      } else if (
        (e.key === "ArrowRight" || matchesAction(e, "pitchSkip") || matchesAction(e, "drillSkip")) &&
        session.phase !== "idle" &&
        session.phase !== "summary"
      ) {
        e.preventDefault();
        soundFX.playSuikinkutsu();
        session.startNext();
      } else if (
        matchesAction(e, "pitchReplayModel") ||
        (matchesAction(e, "drillReplayAudio") && session.phase === "result")
      ) {
        e.preventDefault();
        const canonical =
          session.exercise?.canonical ||
          (session.exercise?.extra_metadata?.pitch_config as any)?.canonical ||
          "";
        if (canonical) {
          soundFX.playFurin();
          speakJapaneseText(canonical, { rate: 0.95 });
        }
      } else if (matchesAction(e, "pitchListenPrompt") && session.phase !== "idle") {
        e.preventDefault();
        playPromptAudio(false);
      } else if (e.key === "Escape") {
        if (showCheatsheet) {
          setShowCheatsheet(false);
        } else if (showKeybindingsModal) {
          setShowKeybindingsModal(false);
        } else if (coachOpen) {
          setCoachOpen(false);
        } else if (session.phase === "waiting_for_speech" || session.phase === "recording") {
          session.setIsPaused((v) => !v);
        }
      } else if (matchesAction(e, "pitchSubmitOrNext") || matchesAction(e, "drillSubmitOrNext")) {
        e.preventDefault();
        if (session.phase === "ready") {
          session.startVoiceRecording();
        } else if (session.phase === "waiting_for_speech" || session.phase === "recording") {
          handleDirectSubmit();
        } else if (session.phase === "result") {
          soundFX.playSuikinkutsu();
          session.startNext();
        }
      } else if (matchesAction(e, "pitchStartVoice")) {
        if (session.phase === "ready") {
          e.preventDefault();
          session.startVoiceRecording();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session, transcriptInput, showCheatsheet, showKeybindingsModal, matchesAction, playPromptAudio, handleDirectSubmit]);

  const formatSessionTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (showSummary || session.phase === "summary") {
    return (
      <div className="py-6 animate-in fade-in duration-300">
        <PitchSessionSummary
          results={session.results}
          onRestart={() => {
            setShowSummary(false);
            soundFX.playSuikinkutsu();
            session.startSession();
          }}
          onToLobby={() => {
            setShowSummary(false);
            session.setPhase("idle" as any);
          }}
          onRetryWeak={() => {
            setShowSummary(false);
            soundFX.playSuikinkutsu();
            session.startSession();
          }}
        />
      </div>
    );
  }

  if (session.phase === "idle") {
    return (
      <div className="py-2">
        <PitchLobby
          subMode={subMode}
          setSubMode={setSubMode}
          pressure={pressure}
          setPressure={setPressure}
          subtitleMode={subtitleMode}
          setSubtitleMode={setSubtitleMode}
          duration={duration}
          setDuration={setDuration}
          autoNext={autoNext}
          setAutoNext={setAutoNext}
          tier={tier}
          setTier={setTier}
          category={category}
          setCategory={setCategory}
          onStartSession={() => {
            soundFX.playKatana();
            session.startSession();
          }}
          onOpenCheatsheet={() => setShowCheatsheet(true)}
          onOpenHelp={() => setShowKeybindingsModal(true)}
          error={session.error}
        />

        <PitchCheatsheetModal isOpen={showCheatsheet} onClose={() => setShowCheatsheet(false)} />
        <GlobalKeybindingsModal isOpen={showKeybindingsModal} onClose={() => setShowKeybindingsModal(false)} />
      </div>
    );
  }

  const isEvaluating = session.phase === "evaluating" || session.phase === "loading";
  const isRecordingOrWaiting = session.phase === "waiting_for_speech" || session.phase === "recording";
  const currentSubModeInfo = PITCH_SUB_MODES.find((m) => m.id === subMode) || PITCH_SUB_MODES[0];

  return (
    <div className="w-full max-w-[1760px] mx-auto h-full flex flex-col justify-between px-2 sm:px-4 py-2 gap-2 overflow-hidden select-none animate-in fade-in duration-200">
      {/* 1. Combat Capsule HUD */}
      <CombatCapsuleHUD
        questionNumber={session.stats.total + (session.phase === "result" ? 0 : 1)}
        subModeLabel={currentSubModeInfo.label}
        subModeJa={currentSubModeInfo.ja}
        currentStreak={session.stats.correct}
        duration={duration}
        sessionRemainingSec={sessionRemainingSec}
        sessionElapsedSec={elapsedSec}
        subtitleMode={subtitleMode}
        setSubtitleMode={setSubtitleMode}
        startTrigger={startTrigger}
        setStartTrigger={setStartTrigger}
        autoNext={autoNext}
        setAutoNext={setAutoNext}
        tier={tier}
        setTier={setTier}
        category={category}
        setCategory={setCategory}
        filterTrigger={{
          label: "Sổ tay cao độ",
          onClick: () => setShowCheatsheet(true),
        }}
        onSubmit={() => {
          stopWebSpeech();
          session.recorder.releaseMicrophone();
          session.speech.stopListening();
          setShowSummary(true);
          sessionSetPhase("summary" as any);
          soundFX.playVictory();
        }}
        onExit={() => {
          stopWebSpeech();
          session.setPhase("idle" as any);
          setShowSummary(false);
        }}
        onOpenHelp={() => setShowKeybindingsModal(true)}
      />

      {/* 2. Middle Arena Stage */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {session.phase === "loading" || (!activeExercise && !showSummary) ? (
          <div className="h-full flex items-center justify-center rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl shadow-xl p-6">
            <ZenLoadingState
              variant="studio"
              title="AI Đang Tạo Bài Luyện Ngữ Điệu & Cao Độ..."
              ja="アクセント課題生成中..."
              description="AI đang chuẩn bị mẫu câu, phân tích cao độ F₀ và phân bổ nhịp Mora chuẩn Tokyo..."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full min-h-0">
            {/* COLUMN 1: Mission & Pitch Prompt Deck (4 cols ~ 33.3%) */}
            <div className="lg:col-span-4 h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl p-3.5 sm:p-4 relative overflow-hidden shadow-lg">
              <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-72 h-36 bg-sky-500/10 blur-3xl rounded-full pointer-events-none -z-10" />

              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <PitchPromptCard
                  exercise={activeExercise}
                  subtitleMode={subtitleMode}
                  onPlayAudio={() => playPromptAudio(false)}
                  phase={session.phase}
                  onSelectQuizChoice={(idx) => {
                    soundFX.playSuikinkutsu();
                    session.submitQuizChoice(idx);
                  }}
                />
              </div>

              <div className="pt-2 shrink-0 border-t border-border/60 dark:border-white/10 space-y-1.5">
                <PitchTimer
                  variant="laser-bar"
                  remainingMs={session.timer.remainingMs}
                  timerLimitMs={session.timer.isActive ? timerMs : activeExercise?.timerLimitMs ?? timerMs}
                  progress={session.timer.progress}
                  state={session.timer.state}
                  isActive={session.timer.isActive}
                />
              </div>
            </div>

            {/* COLUMN 2: Result & Model Accent Card (5 cols ~ 41.7% - Always Visible) */}
            <div className="lg:col-span-5 h-full min-h-0 overflow-y-auto pr-0.5">
              <PitchResultCard
                result={session.result}
                exercise={activeExercise}
                isPending={session.phase !== "result" || !session.result}
                liveTranscript={session.speech.transcript}
                onNext={() => {
                  soundFX.playSuikinkutsu();
                  session.startNext();
                }}
                onRetry={() => {
                  soundFX.playSuikinkutsu();
                  session.retry();
                }}
                onAskCoach={handleCoachSelect}
                onCancelAutoNext={session.cancelAutoNext}
              />
            </div>

            {/* COLUMN 3: Compact Mic & Action Deck (3 cols ~ 25.0%) */}
            <div className="lg:col-span-3 h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl p-3.5 sm:p-4 relative overflow-hidden shadow-lg">
              {/* Ambient Glow */}
              <div className="absolute bottom-[-30px] right-[-30px] w-40 h-40 bg-sky-500/10 blur-3xl rounded-full pointer-events-none -z-10" />

              {/* Status Header */}
              <div className="flex items-center justify-between gap-2 shrink-0 pb-2 border-b border-border/60 dark:border-white/10">
                <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 whitespace-nowrap shrink-0">
                  {isEvaluating ? (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-primary animate-spin" />
                      <span className="text-primary">CHẤM CAO ĐỘ...</span>
                    </>
                  ) : session.phase === "ready" ? (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                      <span className="text-sky-400">SẴN SÀNG</span>
                    </>
                  ) : isRecordingOrWaiting ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-rose-500">ĐANG THU ÂM...</span>
                    </>
                  ) : session.phase === "result" ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-500">HOÀN THÀNH</span>
                    </>
                  ) : (
                    <span>TRẠM THU ÂM</span>
                  )}
                </span>

                <Badge variant="outline" size="sm" className="text-[9px] font-mono border-white/15 bg-white/5 text-primary rounded-full px-1.5 py-0 whitespace-nowrap shrink-0">
                  Pitch Mic Live
                </Badge>
              </div>

              {/* Compact Visualizer & Speech Preview */}
              <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-2 space-y-3">
                {/* Dynamic Mini Soundwaves */}
                <div className="flex items-center gap-1 h-10">
                  {[0.5, 1.0, 1.5, 1.8, 1.3, 0.9, 0.4].map((scale, i) => {
                    const activeMultiplier = isRecordingOrWaiting ? (session.recorder.volumeLevel || 0.08) * 50 : 5;
                    const height = Math.max(5, Math.min(36, activeMultiplier * scale + 5));
                    return (
                      <span
                        key={i}
                        className={cn(
                          "w-1.5 rounded-full transition-all duration-75",
                          isRecordingOrWaiting
                            ? "bg-gradient-to-t from-rose-500 to-amber-400 shadow-xs shadow-rose-500/30"
                            : session.phase === "result"
                            ? "bg-gradient-to-t from-emerald-500 to-teal-400"
                            : "bg-gradient-to-t from-sky-500 to-primary/60"
                        )}
                        style={{ height: `${height}px` }}
                      />
                    );
                  })}
                </div>

                {/* Compact Live Speech Recognition Bubble */}
                <div className="w-full p-2.5 rounded-2xl bg-muted/40 dark:bg-black/30 border border-border/80 dark:border-white/10 backdrop-blur-md text-center space-y-1 shadow-inner">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
                    <Mic className="h-3 w-3 text-primary" />
                    <span>Giọng bạn:</span>
                    {session.speech.transcript && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    )}
                  </div>
                  <div className="text-xs sm:text-sm font-black font-jp text-foreground min-h-[1.5rem] flex items-center justify-center px-1">
                    {session.speech.transcript ? (
                      <span className="line-clamp-2">“{session.speech.transcript}”</span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground font-sans font-normal italic">
                        {isRecordingOrWaiting
                          ? "Nói to vào mic..."
                          : session.phase === "ready"
                          ? "Bấm nút bắt đầu để phát âm"
                          : session.phase === "result"
                          ? "Đã có kết quả ở Cột 2"
                          : "Chờ sẵn sàng..."}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-1.5 w-full">
                  {session.phase === "ready" && (
                    <Button
                      size="sm"
                      className="w-full font-black text-xs h-10 rounded-xl shadow-md bg-gradient-to-r from-sky-500 via-sky-600 to-indigo-600 text-white cursor-pointer ring-1 ring-sky-500/40 gap-1.5"
                      onClick={() => session.startVoiceRecording()}
                    >
                      <Mic className="h-3.5 w-3.5" />
                      <span>Bắt Đầu Nói ({formatKeyDisplay(keybindings.pitchStartVoice)})</span>
                    </Button>
                  )}

                  {isRecordingOrWaiting && (
                    <div className="grid grid-cols-1 gap-1.5 w-full">
                      <Button
                        size="sm"
                        variant="akane"
                        className="w-full font-bold text-xs h-9 rounded-xl shadow-xs gap-1.5 cursor-pointer bg-gradient-to-r from-blue-600 to-primary text-white"
                        onClick={() => handleDirectSubmit()}
                        disabled={isEvaluating}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Nộp câu này</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full font-bold text-[11px] h-8 rounded-xl border-border/80 text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => session.skip()}
                        disabled={isEvaluating}
                      >
                        Bỏ qua câu ({formatKeyDisplay(keybindings.pitchSkip)})
                      </Button>
                    </div>
                  )}

                  {session.phase === "result" && (
                    <Button
                      size="sm"
                      className="w-full font-bold text-xs h-9 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs cursor-pointer gap-1.5"
                      onClick={() => {
                        soundFX.playSuikinkutsu();
                        session.startNext();
                      }}
                    >
                      <span>Câu tiếp theo (Enter)</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Unified Input Bar */}
              <div className="shrink-0 pt-2 border-t border-border/60 dark:border-white/10">
                <ZenUnifiedInputBar
                  value={transcriptInput}
                  onChange={setTranscriptInput}
                  onSubmit={handleDirectSubmit}
                  speechTranscript={session.speech.transcript}
                  isRecording={isRecordingOrWaiting}
                  isEvaluating={isEvaluating}
                  placeholder="Nói hoặc gõ từ/câu cao độ..."
                  submitButtonText="Gửi"
                  autoFocus={false}
                  hintText="Enter để nộp"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Shortcuts Strip */}
      <div className="h-7 shrink-0 border-t border-border/60 dark:border-white/10 flex items-center justify-between text-[11px] text-muted-foreground px-1">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.pitchSubmitOrNext)}</kbd> Bắt đầu / Nộp</span>
          <span className="hidden sm:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.pitchRetry)}</kbd> Làm lại</span>
          <span className="hidden md:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.pitchListenPrompt)}</kbd> Nghe mẫu</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="whitespace-nowrap"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.pitchOpenCheatsheet)}</kbd> Sổ tay</span>
          <span className="whitespace-nowrap"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">Esc</kbd> Thoát</span>
        </div>
      </div>

      <PitchCheatsheetModal isOpen={showCheatsheet} onClose={() => setShowCheatsheet(false)} />
      <GlobalKeybindingsModal isOpen={showKeybindingsModal} onClose={() => setShowKeybindingsModal(false)} />

      <CoachPanel open={coachOpen} onClose={() => setCoachOpen(false)} />
    </div>
  );
}
