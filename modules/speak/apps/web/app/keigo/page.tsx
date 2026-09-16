"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useKeigoSession } from "@/features/keigo/hooks/useKeigoSession";
import { ReflexTimer as KeigoTimer } from "@/features/reflex/components/ReflexTimer";
import { CombatCapsuleHUD } from "@/features/reflex/components/CombatCapsuleHUD";
import { KeigoPromptCard } from "@/features/keigo/components/KeigoPromptCard";
import { KeigoResultCard } from "@/features/keigo/components/KeigoResultCard";
import { KeigoCoachPanel } from "@/features/keigo/components/KeigoCoachPanel";
import { KeigoSessionSummary } from "@/features/keigo/components/KeigoSessionSummary";
import { StudioSpeakingController } from "@/features/reflex/components/StudioSpeakingController";
import { KEIGO_SUB_MODES, PRESSURE_LEVELS } from "@/features/keigo/constants";
import { GlobalKeybindingsModal } from "@/components/layout/global-keybindings-modal";
import { useSystemKeybindings, formatKeyDisplay } from "@/hooks/use-system-keybindings";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { soundFX } from "@/lib/sound-fx";
import { ExerciseSourceBadge } from "@/components/ui/exercise-source-badge";
import { ZenLoadingState } from "@/components/ui/zen-loading-state";

export default function KeigoPage() {
  const [subMode, setSubMode] = useState("mixed");
  const [pressure, setPressure] = useState<"infinite" | "relaxed" | "normal" | "fast" | "reflex" | "extreme">("normal");
  const [subtitleMode, setSubtitleMode] = useState<"hidden" | "japanese" | "japanese_reading" | "vietnamese">("japanese");
  const [startTrigger, setStartTrigger] = useState<"manual" | "auto">("manual");
  const [transcriptInput, setTranscriptInput] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [showKeybindingsModal, setShowKeybindingsModal] = useState(false);
  const [duration, setDuration] = useState<0 | 3 | 5 | 10 | 20>(0);
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
        if (showKeybindingsModal) {
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
  }, [session, transcriptInput, showKeybindingsModal, matchesAction, playPromptAudio, handleDirectSubmit]);

  // Zero-Lobby: Automatically initialize Endless Mode on mount if idle
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedRef.current && session.phase === "idle" && !showSummary) {
      hasInitializedRef.current = true;
      session.startSession();
    }
  }, [session.phase, showSummary, session]);

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
            window.location.href = "/dashboard";
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

  if (session.phase === "idle" && !showSummary) {
    return (
      <div className="h-full flex items-center justify-center rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl shadow-xl p-6">
        <ZenLoadingState
          variant="studio"
          title="AI Đang Thiết Lập Thử Thách Kính Ngữ..."
          ja="敬語課題生成中..."
          description="AI đang thiết lập tình huống kinh doanh, đối tượng giao tiếp và ngữ cảnh tôn kính..."
        />
      </div>
    );
  }

  const isEvaluating = session.phase === "evaluating" || session.phase === "loading";
  const isRecordingOrWaiting = session.phase === "waiting_for_speech" || session.phase === "recording";
  const currentSubModeInfo = KEIGO_SUB_MODES.find((m) => m.id === subMode) || KEIGO_SUB_MODES[0];

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
        provenanceBadge={
          activeExercise ? (
            <ExerciseSourceBadge
              source={activeExercise.generationSource || activeExercise.generation_source}
            />
          ) : undefined
        }
        extraActions={
          <Button
            variant="outline"
            size="sm"
            disabled={isEvaluating}
            onClick={() => {
              soundFX.playTaiko();
              stopWebSpeech();
              session.startNext();
              setTranscriptInput("");
            }}
            className="h-8 px-2 sm:px-2.5 rounded-xl text-xs font-bold border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 gap-1.5 shadow-2xs cursor-pointer transition-all"
            title="Chuyển sang thử thách kính ngữ mới (Alt+R)"
          >
            <Sparkles className="h-3 w-3" />
            <span className="hidden sm:inline">✨ Đổi câu</span>
            <span className="sm:hidden">Đổi</span>
          </Button>
        }
        onNextTask={() => {
          stopWebSpeech();
          session.startNext();
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
          window.location.href = "/dashboard";
        }}
        onOpenHelp={() => setShowKeybindingsModal(true)}
      />

      {/* 2. Middle Arena Stage (4 : 4 : 4 Balanced Split) */}
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
            {/* COLUMN 1: Mission Deck & Countdown Timer (4 cols) */}
            <div className="lg:col-span-4 h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
              <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-72 h-36 bg-amber-500/10 blur-3xl rounded-full pointer-events-none -z-10" />

              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <KeigoPromptCard
                  exercise={activeExercise}
                  subtitleMode={subtitleMode}
                  onPlayAudio={() => playPromptAudio(false)}
                  phase={session.phase}
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

            {/* COLUMN 2: Sensei AI Coach Panel when practicing / Result Card after submission (4 cols) */}
            <div className="lg:col-span-4 h-full min-h-0 relative">
              {session.phase === "result" && session.result ? (
                <KeigoResultCard
                  result={session.result}
                  exercise={activeExercise}
                  isPending={false}
                  liveTranscript={session.speech.transcript || transcriptInput}
                  onNext={() => {
                    stopWebSpeech();
                    session.startNext();
                  }}
                  onRetry={() => {
                    stopWebSpeech();
                    session.retry();
                  }}
                  onCancelAutoNext={session.cancelAutoNext}
                />
              ) : (
                <KeigoCoachPanel
                  exercise={activeExercise}
                  onInsertText={(text) => {
                    setTranscriptInput((prev) => {
                      const trimmed = prev.trim();
                      return trimmed ? `${trimmed} ${text}` : text;
                    });
                  }}
                  onPlayAudio={(text) => {
                    stopWebSpeech();
                    speakJapaneseText(text, { rate: 0.95 });
                  }}
                />
              )}
            </div>

            {/* COLUMN 3: Studio Speaking Controller (4 cols) */}
            <div className="lg:col-span-4 h-full min-h-0">
              <StudioSpeakingController
                phase={
                  isEvaluating
                    ? "evaluating"
                    : isRecordingOrWaiting
                    ? "recording"
                    : session.phase === "prompt_playing"
                    ? "prompt_playing"
                    : session.phase === "ready"
                    ? "ready"
                    : session.phase === "result"
                    ? "result"
                    : "idle"
                }
                liveTranscript={session.speech.transcript || transcriptInput}
                onStartRecord={() => {
                  stopWebSpeech();
                  session.startVoiceRecording();
                }}
                onStopRecord={() => {
                  handleDirectSubmit(true);
                }}
                onSubmit={(text) => {
                  if (text) setTranscriptInput(text);
                  handleDirectSubmit(true);
                }}
                onRetry={() => {
                  stopWebSpeech();
                  session.retry();
                }}
                onNext={() => {
                  stopWebSpeech();
                  session.startNext();
                }}
                onSkip={() => {
                  stopWebSpeech();
                  session.skip();
                }}
                onResetTranscript={() => {
                  setTranscriptInput("");
                }}
                isWhisperMode={session.recorder.isWhisperMode}
                onToggleWhisperMode={() => session.recorder.toggleWhisperMode?.()}
                volumeLevel={session.recorder.volumeLevel}
                textInput={transcriptInput}
                onTextInputChange={setTranscriptInput}
                placeholder="Nói vào mic hoặc gõ câu kính ngữ... (VD: 承知いたしました / ご覧になります)"
                promptSpeakerLabel="Đối tác / Cấp trên"
                onPlayPrompt={() => playPromptAudio(false)}
              />
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
          <span><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">Esc</kbd> Thoát</span>
        </div>
      </div>

      <GlobalKeybindingsModal isOpen={showKeybindingsModal} onClose={() => setShowKeybindingsModal(false)} />
    </div>
  );
}
