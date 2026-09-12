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

export default function SituationsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("infinite");
  const [customTopic, setCustomTopic] = useState<string>("");
  const [selectedMode, setSelectedMode] = useState<string>("standard");
  const [pressureLevel, setPressureLevel] = useState<SituationsPressureLevel>("normal");
  const [duration, setDuration] = useState<number>(5);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [subtitleMode, setSubtitleMode] = useState<"hidden" | "japanese" | "japanese_reading" | "vietnamese">("japanese");
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [transcriptInput, setTranscriptInput] = useState("");
  const [isCheatsheetOpen, setIsCheatsheetOpen] = useState(false);
  const [isKeybindingsOpen, setIsKeybindingsOpen] = useState(false);
  const [coachHint, setCoachHint] = useState<string | null>(null);
  const [hintTier, setHintTier] = useState<number>(0);

  const { matchesAction, keybindings } = useSystemKeybindings();

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedCat = localStorage.getItem("speaking_situations_category");
      if (savedCat) setSelectedCategory(savedCat);
      const savedTopic = localStorage.getItem("speaking_situations_customtopic");
      if (savedTopic) setCustomTopic(savedTopic);
      const savedMode = localStorage.getItem("speaking_situations_mode");
      if (savedMode) setSelectedMode(savedMode);
      const savedPressure = localStorage.getItem("speaking_situations_pressure");
      if (savedPressure) setPressureLevel(savedPressure as any);
      const savedDuration = localStorage.getItem("speaking_situations_duration");
      if (savedDuration !== null) setDuration(Number(savedDuration));
      const savedSubtitle = localStorage.getItem("speaking_situations_subtitle");
      if (savedSubtitle) setSubtitleMode(savedSubtitle as any);
    } catch (e) {}
  }, []);

  // Save preferences on change
  useEffect(() => {
    try {
      localStorage.setItem("speaking_situations_category", selectedCategory);
      localStorage.setItem("speaking_situations_customtopic", customTopic);
      localStorage.setItem("speaking_situations_mode", selectedMode);
      localStorage.setItem("speaking_situations_pressure", pressureLevel);
      localStorage.setItem("speaking_situations_duration", String(duration));
      localStorage.setItem("speaking_situations_subtitle", subtitleMode);
    } catch (e) {}
  }, [selectedCategory, customTopic, selectedMode, pressureLevel, duration, subtitleMode]);

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
        } else if (session.phase !== "idle") {
          soundFX.playFurin();
          session.setPhase("idle");
        }
      } else if (matchesAction(e, "situationsRetry") && session.phase === "result") {
        e.preventDefault();
        soundFX.playFurin();
        session.retry();
      } else if (matchesAction(e, "situationsSkip") && session.phase === "result") {
        e.preventDefault();
        soundFX.playSuikinkutsu();
        session.startNext();
      } else if (
        (matchesAction(e, "situationsReplayModel") ||
          matchesAction(e, "situationsListenPrompt") ||
          matchesAction(e, "drillReplayAudio")) &&
        session.phase === "result"
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
        <div className="w-full max-w-7xl mx-auto h-full flex flex-col justify-between px-2 sm:px-4 py-2 gap-2 overflow-hidden select-none animate-in fade-in duration-200">
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

          {/* Middle Stage: 2-Column Split */}
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
                {/* LEFT COLUMN: Mission Deck */}
                <div className="lg:col-span-5 h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
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

                {/* RIGHT COLUMN: Combat Action Deck or Result Card */}
                <div className="lg:col-span-7 h-full min-h-0 relative">
                  {session.phase === "result" && session.result ? (
                    <div className="h-full overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                      <SituationsResultCard
                        result={session.result}
                        exercise={activeExercise}
                        onNext={session.startNext}
                        onRetry={session.retry}
                        onAskCoach={(prompt) => setCoachHint(prompt)}
                        onCancelAutoNext={session.cancelAutoNext}
                      />
                    </div>
                  ) : (
                    <div className="h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
                      {/* Status Header */}
                      <div className="flex items-center justify-between gap-2 shrink-0 pb-2 border-b border-border/60 dark:border-white/10">
                        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          {session.phase === "prompt_playing" ? (
                            <>
                              <Volume2 className="h-3.5 w-3.5 text-primary animate-pulse" />
                              <span className="text-primary">NPC ĐANG NÓI CÂU MỞ ĐẦU...</span>
                            </>
                          ) : session.phase === "ready" ? (
                            <>
                              <Sparkles className="h-3.5 w-3.5 text-primary" />
                              <span className="text-primary">ĐÃ SẴN SÀNG ĐỐI ĐÁP</span>
                            </>
                          ) : (session.phase === "waiting_for_speech" || session.phase === "recording") ? (
                            <>
                              <Mic className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
                              <span className="text-rose-500">
                                {session.isUserSpeaking ? "ĐANG GHI NHẬN GIỌNG NÓI..." : "MỜI BẠN NÓI HOẶC GÕ ĐỐI ĐÁP..."}
                              </span>
                            </>
                          ) : session.phase === "evaluating" ? (
                            <span className="text-primary">AI ĐANG CHẤM ĐIỂM...</span>
                          ) : null}
                        </span>

                        <Badge variant="outline" size="sm" className="text-[10px] font-mono border-white/15 bg-white/5 text-primary rounded-full">
                          AI Roleplay Live
                        </Badge>
                      </div>

                      {/* Soundwaves & Actions */}
                      <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-2 space-y-4">
                        <div className="flex items-center gap-1.5 h-14">
                          {[0.5, 1.1, 0.7, 1.5, 0.9, 1.3, 0.6].map((scale, i) => {
                            const activeMultiplier = session.isUserSpeaking || session.phase === "recording" ? 36 : 6;
                            const height = Math.max(6, Math.min(50, activeMultiplier * scale + 6));
                            return (
                              <span
                                key={i}
                                className={cn(
                                  "w-1.5 rounded-full transition-all duration-75",
                                  session.isUserSpeaking
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
                            className="font-extrabold text-sm h-11 px-6 rounded-2xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all gap-2 bg-gradient-to-r from-blue-600 via-primary to-indigo-600 text-white cursor-pointer ring-2 ring-primary/40"
                            onClick={() => {
                              soundFX.playFurin();
                              session.startVoiceRecording();
                            }}
                          >
                            <Mic className="h-4 w-4" />
                            <span>🎙️ Bắt Đầu Trả Lời ({formatKeyDisplay(keybindings.situationsStartVoice)})</span>
                          </Button>
                        )}

                        {(session.phase === "waiting_for_speech" || session.phase === "recording") && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="akane"
                              className="font-bold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer bg-gradient-to-r from-blue-600 to-primary text-white"
                              onClick={() => handleDirectSubmit(true)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Nộp câu đối đáp</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="font-bold text-xs h-9 px-3 rounded-xl border-border/80 text-muted-foreground hover:text-foreground"
                              onClick={() => session.startNext()}
                            >
                              Bỏ qua câu ({formatKeyDisplay(keybindings.situationsSkip)})
                            </Button>
                          </div>
                        )}
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
                          placeholder="Nói vào mic hoặc gõ câu đối đáp tiếng Nhật... (VD: すみません、...)"
                          submitButtonText={`Gửi (${formatKeyDisplay(keybindings.situationsSubmitOrNext)})`}
                          autoFocus={true}
                          hintText="Gõ phím thoải mái khi ở văn phòng"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Shortcuts Strip */}
          <div className="h-7 shrink-0 border-t border-border/60 dark:border-white/10 flex items-center justify-between text-[11px] text-muted-foreground px-1">
            <div className="flex items-center gap-3">
              <span><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.situationsSubmitOrNext)}</kbd> Bắt đầu / Nộp</span>
              <span className="hidden sm:inline"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.situationsRetry)}</kbd> Làm lại</span>
              <span className="hidden md:inline"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.situationsListenPrompt)}</kbd> Nghe NPC</span>
            </div>
            <div className="flex items-center gap-2">
              <span><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.situationsOpenCheatsheet)}</kbd> Sổ tay</span>
              <span><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">Esc</kbd> Thoát</span>
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
