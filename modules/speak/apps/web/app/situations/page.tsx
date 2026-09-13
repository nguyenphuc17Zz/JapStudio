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
} from "lucide-react";
import { ReflexTimer as SituationsTimerBar } from "@/features/reflex/components/ReflexTimer";
import { CombatCapsuleHUD } from "@/features/reflex/components/CombatCapsuleHUD";
import {
  SituationsLobby,
  SituationsPromptCard,
  SituationsResultCard,
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
    5
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

  return (
    <div className="w-full text-foreground space-y-3">
      {/* 1. Lobby View */}
      {session.phase === "idle" && (
        <SituationsLobby
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          customTopic={customTopic}
          onSelectCustomTopic={setCustomTopic}
          selectedMode={selectedMode}
          onSelectMode={setSelectedMode}
          pressureLevel={pressureLevel}
          onSelectPressureLevel={setPressureLevel}
          duration={duration}
          onSelectDuration={setDuration}
          subtitleMode={subtitleMode}
          onSelectSubtitleMode={setSubtitleMode}
          onStartSession={session.startSession}
          onOpenCheatsheet={() => setIsCheatsheetOpen(true)}
          onOpenKeybindings={() => setIsKeybindingsOpen(true)}
          isLoading={false}
        />
      )}

      {/* 2. Active Session View (Zero-Scroll Split Arena) */}
      {session.phase !== "idle" && session.phase !== "summary" && (
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
            filterTrigger={{
              label: "Sổ tay bối cảnh",
              onClick: () => setIsCheatsheetOpen(true),
            }}
            onSubmit={() => {
              stopWebSpeech();
              sessionRef.current.recorder.releaseMicrophone();
              sessionRef.current.speech.stopListening();
              session.setPhase("summary");
              soundFX.playVictory();
            }}
            onExit={() => {
              stopWebSpeech();
              session.setPhase("idle");
            }}
            onOpenHelp={() => setIsKeybindingsOpen(true)}
          />

          {/* Middle Stage: 3-Column Split (3 : 6 : 3) */}
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
                {/* COLUMN 1: Prompt & Situational Scenario Deck (4 cols ~ 33.3%) */}
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

                {/* COLUMN 2: Result & Model Dialogue Card (5 cols ~ 41.7% - Always Visible) */}
                <div className="lg:col-span-5 h-full min-h-0 overflow-y-auto pr-0.5">
                  <SituationsResultCard
                    result={session.result}
                    exercise={activeExercise}
                    isPending={session.phase !== "result" || !session.result}
                    liveTranscript={session.speech.transcript}
                    onNext={session.startNext}
                    onRetry={session.retry}
                    onAskCoach={(prompt) => setCoachHint(prompt)}
                    onCancelAutoNext={session.cancelAutoNext}
                  />
                </div>

                {/* COLUMN 3: Compact Mic & Action Deck (3 cols ~ 25.0%) */}
                <div className="lg:col-span-3 h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl p-3.5 sm:p-4 relative overflow-hidden shadow-lg">
                  {/* Ambient Glow */}
                  <div className="absolute bottom-[-30px] right-[-30px] w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none -z-10" />

                  {/* Status Header */}
                  <div className="flex items-center justify-between gap-2 shrink-0 pb-2 border-b border-border/60 dark:border-white/10">
                    <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 whitespace-nowrap shrink-0">
                      {session.phase === "evaluating" ? (
                        <>
                          <Sparkles className="h-3.5 w-3.5 text-primary animate-spin" />
                          <span className="text-primary">CHẤM ĐIỂM...</span>
                        </>
                      ) : session.phase === "ready" ? (
                        <>
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          <span className="text-primary">SẴN SÀNG</span>
                        </>
                      ) : session.phase === "prompt_playing" ? (
                        <>
                          <Volume2 className="h-3.5 w-3.5 text-primary animate-pulse" />
                          <span className="text-primary">NPC ĐANG NÓI...</span>
                        </>
                      ) : (session.phase === "waiting_for_speech" || session.phase === "recording") ? (
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
                      Situations Live
                    </Badge>
                  </div>

                  {/* Compact Visualizer & Speech Preview */}
                  <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-2 space-y-3">
                    {/* Dynamic Mini Soundwaves */}
                    <div className="flex items-center gap-1 h-10">
                      {[0.5, 1.0, 1.5, 1.8, 1.3, 0.9, 0.4].map((scale, i) => {
                        const isSpeakingOrRecording = session.phase === "recording" || session.phase === "waiting_for_speech" || session.isUserSpeaking;
                        const activeMultiplier = isSpeakingOrRecording ? (session.recorder.volumeLevel || 0.08) * 50 : 5;
                        const height = Math.max(5, Math.min(36, activeMultiplier * scale + 5));
                        return (
                          <span
                            key={i}
                            className={cn(
                              "w-1.5 rounded-full transition-all duration-75",
                              isSpeakingOrRecording
                                ? "bg-gradient-to-t from-rose-500 to-amber-400 shadow-xs shadow-rose-500/30"
                                : session.phase === "result"
                                ? "bg-gradient-to-t from-emerald-500 to-teal-400"
                                : "bg-gradient-to-t from-emerald-500 to-primary/60"
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
                            {session.phase === "waiting_for_speech" || session.phase === "recording"
                              ? "Nói to vào mic..."
                              : session.phase === "ready"
                              ? "Bấm nút bắt đầu để đối đáp"
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
                          className="w-full font-black text-xs h-10 rounded-xl shadow-md bg-gradient-to-r from-blue-600 via-primary to-indigo-600 text-white cursor-pointer ring-1 ring-primary/40 gap-1.5"
                          onClick={() => {
                            soundFX.playFurin();
                            session.startVoiceRecording();
                          }}
                        >
                          <Mic className="h-3.5 w-3.5" />
                          <span>Bắt Đầu Nói ({formatKeyDisplay(keybindings.situationsStartVoice)})</span>
                        </Button>
                      )}

                      {session.phase === "prompt_playing" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full font-bold text-xs h-9 rounded-xl border-primary/40 text-primary hover:bg-primary/10 cursor-pointer gap-1.5"
                          onClick={() => {
                            stopWebSpeech();
                            session.startVoiceRecording();
                          }}
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Nói Ngay</span>
                        </Button>
                      )}

                      {(session.phase === "waiting_for_speech" || session.phase === "recording") && (
                        <div className="grid grid-cols-1 gap-1.5 w-full">
                          <Button
                            size="sm"
                            variant="akane"
                            className="w-full font-bold text-xs h-9 rounded-xl shadow-xs gap-1.5 cursor-pointer bg-gradient-to-r from-blue-600 to-primary text-white"
                            onClick={() => handleDirectSubmit(true)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Nộp câu đối đáp</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full font-bold text-[11px] h-8 rounded-xl border-border/80 text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={() => session.startNext()}
                          >
                            Bỏ qua câu ({formatKeyDisplay(keybindings.situationsSkip)})
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
                          <span>Tình huống tiếp theo (Enter)</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Unified Input Bar */}
                  <div className="shrink-0 pt-2 border-t border-border/60 dark:border-white/10">
                    <ZenUnifiedInputBar
                      value={transcriptInput}
                      onChange={setTranscriptInput}
                      onSubmit={() => handleDirectSubmit(true)}
                      speechTranscript={session.speech.transcript}
                      isRecording={session.phase === "recording" || session.isUserSpeaking}
                      isEvaluating={session.phase === "evaluating"}
                      placeholder="Nói hoặc gõ câu đối đáp..."
                      submitButtonText="Gửi"
                      autoFocus={false}
                      hintText="Enter để nộp"
                    />
                  </div>
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
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="whitespace-nowrap"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.situationsOpenCheatsheet)}</kbd> Sổ tay</span>
              <span className="whitespace-nowrap"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">Esc</kbd> Thoát</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Session Summary View */}
      {session.phase === "summary" && (
        <SituationsSessionSummary
          results={session.results}
          onRestart={session.startSession}
          onToLobby={() => session.setPhase("idle")}
          onRetryWeak={session.startSession}
        />
      )}

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
