"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  Crown,
  Mic,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  BookOpen,
  Edit3,
  CheckCircle2,
} from "lucide-react";
import { useKeigoSession } from "@/features/keigo/hooks/useKeigoSession";
import { ReflexTimer as KeigoTimer } from "@/features/reflex/components/ReflexTimer";
import { CombatCapsuleHUD } from "@/features/reflex/components/CombatCapsuleHUD";
import { KeigoPromptCard } from "@/features/keigo/components/KeigoPromptCard";
import { KeigoResultCard } from "@/features/keigo/components/KeigoResultCard";
import { KeigoSessionSummary } from "@/features/keigo/components/KeigoSessionSummary";
import { KeigoCheatsheetModal } from "@/features/keigo/components/KeigoCheatsheetModal";
import { KeigoLobby, KEIGO_SUB_MODES, PRESSURE_LEVELS } from "@/features/keigo/components/KeigoLobby";
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

export default function KeigoPage() {
  const [subMode, setSubMode] = useState("mixed");
  const [pressure, setPressure] = useState<"infinite" | "relaxed" | "normal" | "fast" | "reflex" | "extreme">("normal");
  const [subtitleMode, setSubtitleMode] = useState<"hidden" | "japanese" | "japanese_reading" | "vietnamese">("japanese");
  const [startTrigger, setStartTrigger] = useState<"manual" | "auto">("manual");
  const [transcriptInput, setTranscriptInput] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [showKeybindingsModal, setShowKeybindingsModal] = useState(false);
  const [duration, setDuration] = useState<0 | 3 | 5 | 10 | 20>(5);
  const [sessionRemainingSec, setSessionRemainingSec] = useState(duration * 60);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [autoNext, setAutoNext] = useState(false);

  const sessionEndTimestampRef = useRef<number | null>(null);
  const sessionPausedRemainingMsRef = useRef<number>(duration * 60 * 1000);

  const { matchesAction, keybindings } = useSystemKeybindings();

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedSubMode = localStorage.getItem("speaking_keigo_submode");
      if (savedSubMode) setSubMode(savedSubMode);
      const savedPressure = localStorage.getItem("speaking_keigo_pressure");
      if (savedPressure) setPressure(savedPressure as any);
      const savedDuration = localStorage.getItem("speaking_keigo_duration");
      if (savedDuration !== null) setDuration(Number(savedDuration) as any);
      const savedSubtitle = localStorage.getItem("speaking_keigo_subtitle");
      if (savedSubtitle) setSubtitleMode(savedSubtitle as any);
      const savedTrigger = localStorage.getItem("speaking_keigo_trigger");
      if (savedTrigger) setStartTrigger(savedTrigger as any);
      const savedAutoNext = localStorage.getItem("speaking_keigo_autonext");
      if (savedAutoNext !== null) setAutoNext(savedAutoNext === "true");
    } catch (e) {}
  }, []);

  // Save preferences on change
  useEffect(() => {
    try {
      localStorage.setItem("speaking_keigo_submode", subMode);
      localStorage.setItem("speaking_keigo_pressure", pressure);
      localStorage.setItem("speaking_keigo_duration", String(duration));
      localStorage.setItem("speaking_keigo_subtitle", subtitleMode);
      localStorage.setItem("speaking_keigo_trigger", startTrigger);
      localStorage.setItem("speaking_keigo_autonext", String(autoNext));
    } catch (e) {}
  }, [subMode, pressure, duration, subtitleMode, startTrigger, autoNext]);

  const session = useKeigoSession({
    subMode,
    pressureLevel: pressure as any,
    autoNext,
    startTrigger,
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

  const timerMs = PRESSURE_LEVELS.find((p) => p.id === pressure)?.ms ?? 5000;
  const activeExercise = session.exercise;
  const pathname = usePathname();
  const { insights, dismiss } = useCoachProactive();
  const [coachOpen, setCoachOpen] = useState(false);
  const coach = useCoachCore();

  const handleCoachSelect = (prompt: string) => {
    setCoachOpen(true);
    setTimeout(() => coach.ask(prompt, { route: pathname || "/keigo", exerciseId: (activeExercise as any)?.id }), 300);
  };

  const playedPromptExerciseIdRef = useRef<string | null>(null);

  const playPromptAudio = useCallback(
    (autoTransition = false) => {
      if (!activeExercise) return;
      const rc = activeExercise.extra_metadata?.keigo_config || {};
      const text = rc.prompt || activeExercise.prompt || activeExercise.scenario || activeExercise.title;
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
  const handleDirectSubmit = useCallback(async (allowEmpty = false) => {
    const text = transcriptInput.trim() || speechTranscript.trim();
    if (!text && !allowEmpty) return;
    await submitWithTranscript(text || "");
    setTranscriptInput("");
  }, [transcriptInput, speechTranscript, submitWithTranscript]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "textarea" || tag === "input") {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleDirectSubmit(true);
        }
        return;
      }

      if (matchesAction(e, "openKeybindingsModal") || matchesAction(e, "drillToggleHelp")) {
        e.preventDefault();
        setShowKeybindingsModal((v) => !v);
      } else if (matchesAction(e, "keigoOpenCheatsheet")) {
        e.preventDefault();
        setShowCheatsheet((v) => !v);
      } else if (matchesAction(e, "keigoToggleInputMode")) {
        e.preventDefault();
        setShowTextInput((v) => !v);
      } else if (
        matchesAction(e, "keigoToggleHint") &&
        session.phase !== "idle" &&
        session.phase !== "summary"
      ) {
        e.preventDefault();
        soundFX.playFurin();
        session.cycleHint();
      } else if (matchesAction(e, "keigoRetry") && session.phase === "result") {
        e.preventDefault();
        soundFX.playSuikinkutsu();
        session.retry();
      } else if (matchesAction(e, "keigoSkip") && session.phase === "result") {
        e.preventDefault();
        soundFX.playSuikinkutsu();
        session.startNext();
      } else if (
        (matchesAction(e, "keigoReplayModel") ||
          matchesAction(e, "keigoListenPrompt") ||
          matchesAction(e, "drillReplayAudio")) &&
        session.phase === "result"
      ) {
        e.preventDefault();
        const canonical =
          session.result?.canonicalAnswer ||
          session.exercise?.canonical ||
          (session.exercise?.target_patterns && session.exercise.target_patterns.length > 0
            ? session.exercise.target_patterns[0]
            : "");
        if (canonical) {
          soundFX.playFurin();
          speakJapaneseText(canonical, { rate: 0.95 });
        }
      } else if (matchesAction(e, "keigoListenPrompt") && session.phase !== "idle") {
        e.preventDefault();
        playPromptAudio(false);
      } else if (e.key === "Escape") {
        if (showCheatsheet) {
          setShowCheatsheet(false);
        } else if (showKeybindingsModal) {
          setShowKeybindingsModal(false);
        } else if (session.phase !== "idle") {
          session.setPhase("idle" as any);
          setShowSummary(false);
          stopWebSpeech();
        }
      } else if (matchesAction(e, "keigoSubmitOrNext") || matchesAction(e, "drillSubmitOrNext")) {
        e.preventDefault();
        if (session.phase === "ready") {
          session.startVoiceRecording();
        } else if (session.phase === "waiting_for_speech" || session.phase === "recording") {
          handleDirectSubmit(true);
        } else if (session.phase === "result") {
          soundFX.playSuikinkutsu();
          session.startNext();
        }
      } else if (matchesAction(e, "keigoStartVoice")) {
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
        <KeigoSessionSummary
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
        <KeigoLobby
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
          startTrigger={startTrigger}
          setStartTrigger={setStartTrigger}
          onStartSession={() => {
            soundFX.playKatana();
            session.startSession();
          }}
          onOpenCheatsheet={() => setShowCheatsheet(true)}
          onOpenHelp={() => setShowKeybindingsModal(true)}
          error={session.error}
        />

        <KeigoCheatsheetModal isOpen={showCheatsheet} onClose={() => setShowCheatsheet(false)} />
        <GlobalKeybindingsModal isOpen={showKeybindingsModal} onClose={() => setShowKeybindingsModal(false)} />
      </div>
    );
  }

  const isEvaluating = session.phase === "evaluating" || session.phase === "loading";
  const isRecordingOrWaiting = session.phase === "waiting_for_speech" || session.phase === "recording";
  const currentSubModeInfo = KEIGO_SUB_MODES.find((m) => m.id === subMode) || KEIGO_SUB_MODES[0];

  return (
    <div className="w-full max-w-7xl mx-auto h-full flex flex-col justify-between px-2 sm:px-4 py-2 gap-2 overflow-hidden select-none animate-in fade-in duration-200">
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
        filterTrigger={{
          label: "Sổ tay kính ngữ",
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
              title="AI Đang Thiết Lập Thử Thách Kính Ngữ..."
              ja="敬語課題生成中..."
              description="AI đang thiết lập tình huống kinh doanh, đối tượng giao tiếp và ngữ cảnh tôn kính..."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full min-h-0">
            {/* LEFT COLUMN: Mission Deck */}
            <div className="lg:col-span-5 h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
              <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-72 h-36 bg-amber-500/10 blur-3xl rounded-full pointer-events-none -z-10" />

              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <KeigoPromptCard
                  exercise={activeExercise}
                  subtitleMode={subtitleMode}
                  onPlayAudio={() => playPromptAudio(false)}
                  phase={session.phase}
                  hintLevel={session.hintLevel}
                  onCycleHint={session.cycleHint}
                />
              </div>

              <div className="pt-2 shrink-0 border-t border-border/60 dark:border-white/10 space-y-1.5">
                <KeigoTimer
                  variant="laser-bar"
                  remainingMs={session.timer.remainingMs}
                  timerLimitMs={session.timer.isActive ? timerMs : activeExercise?.timerLimitMs ?? timerMs}
                  progress={session.timer.progress}
                  state={session.timer.state}
                  isActive={session.timer.isActive}
                />
              </div>
            </div>

            {/* RIGHT COLUMN: Combat Action Deck or Result Card */}
            <div className="lg:col-span-7 h-full min-h-0 relative">
              {session.phase === "result" && session.result ? (
                <div className="h-full overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                  <KeigoResultCard
                    result={session.result}
                    exercise={activeExercise}
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
              ) : (
                <div className="h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
                  {/* Status Header */}
                  <div className="flex items-center justify-between gap-2 shrink-0 pb-2 border-b border-border/60 dark:border-white/10">
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      {isEvaluating ? (
                        <span className="text-primary">AI ĐANG CHẤM ĐIỂM...</span>
                      ) : session.phase === "ready" ? (
                        <>
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-amber-500">ĐÃ SẴN SÀNG TRẢ LỜI</span>
                        </>
                      ) : isRecordingOrWaiting ? (
                        <>
                          <Mic className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
                          <span className="text-rose-500">ĐANG THU ÂM KÍNH NGỮ...</span>
                        </>
                      ) : (
                        <span>LUYỆN TẬP KÍNH NGỮ THỰC CHIẾN</span>
                      )}
                    </span>

                    <Badge variant="outline" size="sm" className="text-[10px] font-mono border-white/15 bg-white/5 text-primary rounded-full">
                      Business Keigo Engine
                    </Badge>
                  </div>

                  {/* Soundwaves & Actions */}
                  <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-2 space-y-4">
                    <div className="flex items-center gap-1.5 h-14">
                      {[0.5, 1.1, 0.7, 1.5, 0.9, 1.3, 0.6].map((scale, i) => {
                        const activeMultiplier = isRecordingOrWaiting ? 36 : 6;
                        const height = Math.max(6, Math.min(50, activeMultiplier * scale + 6));
                        return (
                          <span
                            key={i}
                            className={cn(
                              "w-1.5 rounded-full transition-all duration-75",
                              isRecordingOrWaiting
                                ? "bg-gradient-to-t from-rose-500 to-amber-400"
                                : "bg-gradient-to-t from-blue-600 to-primary/60"
                            )}
                            style={{ height: `${height}px` }}
                          />
                        );
                      })}
                    </div>

                    {session.phase === "ready" && (
                      <Button
                        size="lg"
                        className="font-extrabold text-sm h-11 px-6 rounded-2xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all gap-2 bg-gradient-to-r from-amber-500 via-amber-600 to-primary text-white cursor-pointer ring-2 ring-amber-500/30"
                        onClick={() => session.startVoiceRecording()}
                      >
                        <Mic className="h-4 w-4" />
                        <span>🎙️ Bắt Đầu Trả Lời ({formatKeyDisplay(keybindings.keigoStartVoice)})</span>
                      </Button>
                    )}

                    {isRecordingOrWaiting && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="akane"
                          className="font-bold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer bg-gradient-to-r from-blue-600 to-primary text-white"
                          onClick={() => handleDirectSubmit(true)}
                          disabled={isEvaluating}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Nộp câu này</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="font-bold text-xs h-9 px-3 rounded-xl border-border/80 text-muted-foreground hover:text-foreground"
                          onClick={() => session.skip()}
                          disabled={isEvaluating}
                        >
                          Bỏ qua câu ({formatKeyDisplay(keybindings.keigoSkip)})
                        </Button>
                      </div>
                    )}
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
                      placeholder="Nói vào mic hoặc gõ câu kính ngữ... (VD: ご覧になります / 参ります)"
                      submitButtonText={`Gửi (${formatKeyDisplay(keybindings.keigoSubmitOrNext)})`}
                      autoFocus={true}
                      hintText="Gõ phím thay mic khi ở văn phòng"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Shortcuts Strip */}
      <div className="h-7 shrink-0 border-t border-border/60 dark:border-white/10 flex items-center justify-between text-[11px] text-muted-foreground px-1">
        <div className="flex items-center gap-3">
          <span><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.keigoSubmitOrNext)}</kbd> Bắt đầu / Nộp</span>
          <span className="hidden sm:inline"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.keigoRetry)}</kbd> Làm lại</span>
          <span className="hidden md:inline"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.keigoListenPrompt)}</kbd> Nghe đề</span>
        </div>
        <div className="flex items-center gap-2">
          <span><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.keigoOpenCheatsheet)}</kbd> Sổ tay</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">Esc</kbd> Thoát</span>
        </div>
      </div>

      <KeigoCheatsheetModal isOpen={showCheatsheet} onClose={() => setShowCheatsheet(false)} />
      <GlobalKeybindingsModal isOpen={showKeybindingsModal} onClose={() => setShowKeybindingsModal(false)} />
      <CoachPanel open={coachOpen} onClose={() => setCoachOpen(false)} />
    </div>
  );
}
