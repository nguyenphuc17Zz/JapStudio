"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Compass,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  BookOpen,
  Keyboard,
  RotateCcw,
  Zap,
  ArrowRight,
  Send,
  Loader2,
  Edit3,
  HelpCircle,
  Home,
  Clock,
  CheckCircle2,
  Play,
  RefreshCw,
} from "lucide-react";
import { ExerciseSourceBadge } from "@/components/ui/exercise-source-badge";
import { ReflexTimer as SituationsTimerBar } from "@/features/reflex/components/ReflexTimer";
import { CombatCapsuleHUD } from "@/features/reflex/components/CombatCapsuleHUD";
import { StudioSpeakingController } from "@/features/reflex/components/StudioSpeakingController";
import {
  SituationsLobby,
  SituationsPromptCard,
  SituationsResultCard,
  SituationsCoachPanel,
  SituationsSessionSummary,
  SituationsCheatsheetModal,
  useSituationsSession,
  SituationsPressureLevel,
} from "@/features/situations";
import { GlobalKeybindingsModal } from "@/components/layout/global-keybindings-modal";
import { useSystemKeybindings, formatKeyDisplay } from "@/hooks/use-system-keybindings";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import { ZenLoadingState } from "@/components/ui/zen-loading-state";
import { ZenUnifiedInputBar } from "@/components/ui/zen-unified-input-bar";
import { usePersistedState } from "@/hooks/use-persisted-state";

export default function SituationsPage() {
  const [selectedCategory, setSelectedCategory] = usePersistedState<string>(
    "speaking_situations_category",
    "infinite"
  );
  const [customTopic, setCustomTopic] = usePersistedState<string>(
    "speaking_situations_customtopic",
    ""
  );
  const [selectedMode, setSelectedMode] = usePersistedState<string>(
    "speaking_situations_mode",
    "standard"
  );
  const [pressureLevel, setPressureLevel] = usePersistedState<SituationsPressureLevel>(
    "speaking_situations_pressure",
    "normal"
  );
  const [duration, setDuration] = usePersistedState<number>(
    "speaking_situations_duration",
    0
  );
  const [subtitleMode, setSubtitleMode] = usePersistedState<
    "hidden" | "japanese" | "japanese_reading" | "vietnamese"
  >("speaking_situations_subtitle", "japanese");
  const [inputMode, setInputMode] = usePersistedState<"voice" | "text">(
    "speaking_situations_input_mode",
    "voice"
  );

  const [elapsedSec, setElapsedSec] = useState(0);
  const [transcriptInput, setTranscriptInput] = useState("");
  const [isCheatsheetOpen, setIsCheatsheetOpen] = useState(false);
  const [isKeybindingsOpen, setIsKeybindingsOpen] = useState(false);
  const [coachHint, setCoachHint] = useState<string | null>(null);
  const [hintTier, setHintTier] = useState<number>(0);

  const { matchesAction, keybindings } = useSystemKeybindings();

  const session = useSituationsSession({
    category: selectedCategory,
    customTopic,
    subMode: "situational_roleplay",
    pressureLevel,
    duration,
    mode: selectedMode,
    autoNext: true,
  });
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const { onPromptAudioFinished, submitWithTranscript } = session;

  const activeExercise = session.exercise;
  const playedPromptExerciseIdRef = useRef<string | null>(null);

  // Reset hint tier when exercise changes
  useEffect(() => {
    setHintTier(0);
  }, [session.exercise?.id]);

  const playPromptAudio = useCallback(
    (autoTransition = false) => {
      if (!activeExercise) return;
      const sc = activeExercise.extra_metadata?.situational_config || {};
      const sData = activeExercise.situationalData || sc.situational_data || {};
      const text = sData.npc_opening_dialogue || activeExercise.prompt || activeExercise.canonical;

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
    if (session.phase === "idle" || session.phase === "summary") {
      setElapsedSec(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [session.phase]);

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

      if (e.altKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        soundFX.playTaiko();
        session.regenerateWithAI();
        setTranscriptInput("");
        return;
      }

      if (matchesAction(e, "situationsOpenCheatsheet")) {
        e.preventDefault();
        soundFX.playFurin();
        setIsCheatsheetOpen((v) => !v);
      } else if (matchesAction(e, "openKeybindingsModal")) {
        e.preventDefault();
        soundFX.playFurin();
        setIsKeybindingsOpen((v) => !v);
      } else if (e.key === "Escape") {
        if (isCheatsheetOpen) {
          setIsCheatsheetOpen(false);
        } else if (isKeybindingsOpen) {
          setIsKeybindingsOpen(false);
        } else if (session.phase === "waiting_for_speech" || session.phase === "recording") {
          session.setIsPaused((v) => !v);
        }
      } else if (matchesAction(e, "situationsRetry") && session.phase === "result") {
        e.preventDefault();
        soundFX.playFurin();
        session.retry();
      } else if (
        (e.key === "ArrowRight" || matchesAction(e, "situationsSkip") || matchesAction(e, "drillSkip")) &&
        session.phase !== "idle" &&
        session.phase !== "summary"
      ) {
        e.preventDefault();
        soundFX.playSuikinkutsu();
        session.startNext();
      } else if (
        matchesAction(e, "situationsReplayModel") ||
        (matchesAction(e, "drillReplayAudio") && session.phase === "result")
      ) {
        e.preventDefault();
        const sc = session.exercise?.extra_metadata?.situational_config || {};
        const canonical = sc.canonical || session.exercise?.canonical || "";
        if (canonical) {
          soundFX.playFurin();
          speakJapaneseText(canonical, { rate: 0.95 });
        }
      } else if (matchesAction(e, "situationsListenPrompt")) {
        e.preventDefault();
        soundFX.playFurin();
        playPromptAudio(false);
      } else if (matchesAction(e, "situationsToggleHint")) {
        e.preventDefault();
        soundFX.playFurin();
        setHintTier((prev) => (prev + 1) % 4);
      } else if (matchesAction(e, "situationsToggleInputMode")) {
        e.preventDefault();
        soundFX.playFurin();
        setInputMode((m) => (m === "voice" ? "text" : "voice"));
      } else if (matchesAction(e, "situationsStartVoice") && session.phase === "ready") {
        e.preventDefault();
        soundFX.playFurin();
        session.startVoiceRecording();
      } else if (matchesAction(e, "situationsSubmitOrNext")) {
        e.preventDefault();
        if (session.phase === "idle") {
          soundFX.playKatana();
          session.startSession();
        } else if (session.phase === "waiting_for_speech" || session.phase === "recording") {
          handleDirectSubmit(true);
        } else if (session.phase === "result") {
          soundFX.playSuikinkutsu();
          session.startNext();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session, transcriptInput, isCheatsheetOpen, isKeybindingsOpen, matchesAction, playPromptAudio, handleDirectSubmit]);

  // Zero-Lobby: Automatically initialize Endless Mode on mount if idle
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedRef.current && session.phase === "idle") {
      hasInitializedRef.current = true;
      session.startSession();
    }
  }, [session.phase, session]);

  if (session.phase === "idle") {
    return (
      <div className="h-full flex items-center justify-center rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl shadow-xl p-6">
        <ZenLoadingState
          variant="ai"
          title="AI Đang Khởi Tạo Tình Huống Sống Động..."
          ja="ロールプレイ生成中..."
          description="Đang thiết lập bối cảnh thực tế, nhân vật AI bản xứ và mục tiêu giao tiếp..."
        />
      </div>
    );
  }

  if (session.phase === "summary") {
    return (
      <div className="w-full h-[calc(100vh-3.5rem)] min-h-0 overflow-y-auto p-4">
        <SituationsSessionSummary
          results={session.results}
          onRestart={session.startSession}
          onToLobby={() => (window.location.href = "/dashboard")}
          onRetryWeak={session.startSession}
        />
        <SituationsCheatsheetModal
          isOpen={isCheatsheetOpen}
          onClose={() => setIsCheatsheetOpen(false)}
        />
        <GlobalKeybindingsModal
          isOpen={isKeybindingsOpen}
          onClose={() => setIsKeybindingsOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1760px] mx-auto h-full flex flex-col justify-between px-2 sm:px-4 py-2 gap-2 overflow-hidden select-none animate-in fade-in duration-200">
      {/* Top Combat Capsule HUD */}
      <CombatCapsuleHUD
        questionNumber={session.results.length + 1}
        subModeLabel="Tình Huống Thực Chiến"
        subModeJa="場面"
        currentStreak={1}
        duration={duration}
        sessionRemainingSec={session.timer.remainingMs ? Math.ceil(session.timer.remainingMs / 1000) : 0}
        sessionElapsedSec={elapsedSec}
        subtitleMode={subtitleMode}
        setSubtitleMode={setSubtitleMode}
        provenanceBadge={
          session.exercise ? (
            <ExerciseSourceBadge
              source={session.exercise.generationSource}
              isFallback={session.exercise.isFallback}
            />
          ) : undefined
        }
        extraActions={
          <div className="flex items-center gap-1.5">
            <div className="relative hidden md:flex items-center w-48 sm:w-60">
              <Sparkles className="h-3 w-3 absolute left-2.5 text-emerald-500 pointer-events-none" />
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    soundFX.playTaiko();
                    await session.regenerateWithAI();
                    setTranscriptInput("");
                  }
                }}
                placeholder="Tình huống tùy biến... (Enter)"
                className="w-full pl-7 pr-2 py-1 text-[11px] rounded-xl border border-emerald-500/30 bg-background/80 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={session.isRegeneratingAI || session.phase === "evaluating"}
              onClick={async () => {
                soundFX.playTaiko();
                await session.regenerateWithAI();
                setTranscriptInput("");
              }}
              className={cn(
                "h-8 px-2 sm:px-2.5 rounded-xl text-xs font-bold border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 gap-1.5 shadow-2xs cursor-pointer transition-all",
                session.isRegeneratingAI && "opacity-70"
              )}
              title="Bỏ qua cache & gọi AI sinh tình huống mới (Alt+R)"
            >
              <RefreshCw className={cn("h-3 w-3", session.isRegeneratingAI && "animate-spin")} />
              <span className="hidden sm:inline">
                {session.isRegeneratingAI ? "Đang đổi..." : "✨ AI Đổi bài"}
              </span>
              <span className="sm:hidden">Đổi bài</span>
            </Button>
          </div>
        }
        onNextTask={() => session.startNext()}
        isNextDisabled={session.phase === "loading" || session.isRegeneratingAI}
        onSubmit={() => {
          stopWebSpeech();
          sessionRef.current.recorder.releaseMicrophone();
          sessionRef.current.speech.stopListening();
          session.setPhase("summary");
          soundFX.playVictory();
        }}
        onExit={() => {
          stopWebSpeech();
          window.location.href = "/dashboard";
        }}
        onOpenHelp={() => setIsKeybindingsOpen(true)}
      />

      {/* Middle Stage: 3-Column Split (4 : 4 : 4 Balanced Split) */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {session.phase === "loading" ? (
          <div className="h-full flex items-center justify-center rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl shadow-xl p-6">
            <ZenLoadingState
              variant="ai"
              title="AI Đang Khởi Tạo Tình Huống Sống Động..."
              ja="ロールプレイ生成中..."
              description="Đang thiết lập bối cảnh thực tế, nhân vật AI bản xứ và mục tiêu giao tiếp..."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full min-h-0">
            {/* COLUMN 1: Prompt & Situational Scenario Deck (4 cols) */}
            <div className="lg:col-span-4 h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl p-3.5 sm:p-4 relative overflow-hidden shadow-lg">
              <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-72 h-36 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none -z-10" />

              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <SituationsPromptCard
                  exercise={activeExercise}
                  subtitleMode={subtitleMode}
                  onPlayAudio={() => playPromptAudio(false)}
                  phase={session.phase}
                  hintTier={hintTier}
                  onSetHintTier={setHintTier}
                />
              </div>

              <div className="pt-2 shrink-0 border-t border-border/60 dark:border-white/10 space-y-1.5">
                <SituationsTimerBar
                  variant="laser-bar"
                  remainingMs={session.timer.remainingMs}
                  timerLimitMs={session.timer.totalLimitMs}
                  progress={session.timer.progress}
                  state={session.timer.state}
                  isActive={session.timer.isActive}
                  isPaused={session.timer.isPaused}
                />
              </div>
            </div>

            {/* COLUMN 2: Sensei AI Coach Panel when practicing / Result Card after submission (4 cols) */}
            <div className="lg:col-span-4 h-full min-h-0 overflow-y-auto pr-0.5">
              {session.phase === "result" && session.result ? (
                <SituationsResultCard
                  result={session.result}
                  exercise={activeExercise}
                  isPending={false}
                  liveTranscript={session.speech.transcript}
                  onNext={session.startNext}
                  onRetry={session.retry}
                  onAskCoach={(prompt) => setCoachHint(prompt)}
                  onCancelAutoNext={session.cancelAutoNext}
                />
              ) : (
                <SituationsCoachPanel
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
                      session.phase === "evaluating"
                        ? "evaluating"
                        : session.phase === "recording" || session.phase === "waiting_for_speech"
                        ? "recording"
                        : session.phase === "prompt_playing"
                        ? "prompt_playing"
                        : session.phase === "ready"
                        ? "ready"
                        : session.phase === "result"
                        ? "result"
                        : "idle"
                    }
                    liveTranscript={session.speech.transcript}
                    onStartRecord={() => {
                      if (session.phase === "ready") {
                        soundFX.playFurin();
                        session.startVoiceRecording();
                      } else if (session.phase === "prompt_playing") {
                        stopWebSpeech();
                        session.startVoiceRecording();
                      } else if (session.phase === "result") {
                        soundFX.playSuikinkutsu();
                        session.startNext();
                      } else {
                        session.startVoiceRecording();
                      }
                    }}
                    onStopRecord={() => {
                      handleDirectSubmit(true);
                    }}
                    onSubmit={(text) => {
                      if (text) setTranscriptInput(text);
                      handleDirectSubmit(true);
                    }}
                    onRetry={() => {
                      session.retry();
                    }}
                    onNext={() => {
                      session.startNext();
                    }}
                    onSkip={() => {
                      session.startNext();
                    }}
                    onResetTranscript={() => {
                      setTranscriptInput("");
                      try {
                        session.speech.stopListening();
                      } catch {}
                    }}
                    volumeLevel={session.recorder.volumeLevel}
                    textInput={transcriptInput}
                    onTextInputChange={setTranscriptInput}
                    placeholder="Nói hoặc gõ câu đối đáp tiếng Nhật..."
                    promptSpeakerLabel={activeExercise?.situationalData?.npc_name || "NPC"}
                    onPlayPrompt={() => playPromptAudio(false)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Shortcuts Strip */}
          <div className="h-7 shrink-0 border-t border-border/60 dark:border-white/10 flex items-center justify-between text-[11px] text-muted-foreground px-1">
            <div className="flex items-center gap-3 overflow-hidden">
              <span className="whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.situationsSubmitOrNext)}</kbd> Bắt đầu / Nộp</span>
              <span className="hidden sm:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.situationsRetry)}</kbd> Làm lại</span>
              <span className="hidden md:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.situationsListenPrompt)}</kbd> Nghe NPC</span>
              <span className="hidden lg:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">Alt+R</kbd> ✨ Đổi bài AI</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="whitespace-nowrap"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.situationsOpenCheatsheet)}</kbd> Sổ tay</span>
              <span className="whitespace-nowrap"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">Esc</kbd> Thoát</span>
            </div>
          </div>
      {/* Modals */}
      <SituationsCheatsheetModal
        isOpen={isCheatsheetOpen}
        onClose={() => setIsCheatsheetOpen(false)}
      />

      <GlobalKeybindingsModal
        isOpen={isKeybindingsOpen}
        onClose={() => setIsKeybindingsOpen(false)}
      />
    </div>
  );
}
