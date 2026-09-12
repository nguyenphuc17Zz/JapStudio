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

      {/* 2. Active Session View */}
      {session.phase !== "idle" && session.phase !== "summary" && (
        <div className="max-w-5xl mx-auto space-y-4 animate-in fade-in duration-200">
          {/* Top Session Navigation Header */}
          <div className="px-4 py-2.5 rounded-2xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#121722]/80 backdrop-blur-xl shadow-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  soundFX.playFurin();
                  session.setPhase("idle");
                }}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-xl"
                title="Về Sảnh chính (Esc)"
              >
                <Home className="h-4 w-4" />
              </Button>

              <Badge variant="matcha" size="sm" className="font-bold text-[10px] tracking-wide">
                TÌNH HUỐNG THỰC CHIẾN
              </Badge>

              <span className="text-xs font-bold text-muted-foreground">
                Câu #{session.results.length + 1}
              </span>

              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-muted/80 text-foreground border border-border/80 shadow-2xs">
                <Clock className="h-3 w-3 text-emerald-500" />
                <span>
                  {duration === 0
                    ? `Phiên: ${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, "0")} / ∞`
                    : `Phiên: ${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, "0")} / ${duration}m`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  soundFX.playFurin();
                  setIsCheatsheetOpen(true);
                }}
                className="h-8 gap-1.5 text-xs font-bold shadow-2xs rounded-xl"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sổ tay (C)</span>
              </Button>

              <Button
                variant="akane"
                size="sm"
                onClick={() => {
                  stopWebSpeech();
                  sessionRef.current.recorder.releaseMicrophone();
                  sessionRef.current.speech.stopListening();
                  session.setPhase("summary");
                  soundFX.playVictory();
                }}
                className="h-8 gap-1.5 px-3 text-xs font-bold shadow-2xs cursor-pointer rounded-xl bg-primary text-white"
                title="Nộp bài và xem bảng điểm tổng kết (kết thúc phiên)"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Nộp bài</span>
              </Button>
            </div>
          </div>

          {/* Loading State */}
          {session.phase === "loading" && (
            <ZenLoadingState
              variant="ai"
              title="AI Đang Khởi Tạo Tình Huống Sống Động..."
              ja="ロールプレイ生成中..."
              description="Đang thiết lập bối cảnh thực tế, nhân vật AI bản xứ và mục tiêu giao tiếp..."
            />
          )}

          {/* Result State */}
          {session.phase === "result" && session.result && (
            <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-200">
              <SituationsResultCard
                result={session.result}
                exercise={activeExercise}
                onNext={session.startNext}
                onRetry={session.retry}
                onAskCoach={(prompt) => setCoachHint(prompt)}
                onCancelAutoNext={session.cancelAutoNext}
              />
            </div>
          )}

          {/* Active Workout Cockpit (Unified Center Stage) */}
          {(session.phase === "prompt_playing" ||
            session.phase === "ready" ||
            session.phase === "waiting_for_speech" ||
            session.phase === "recording" ||
            session.phase === "evaluating") && (
            <div className="max-w-4xl mx-auto rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#121722]/85 backdrop-blur-2xl shadow-xl p-5 sm:p-7 flex flex-col items-center text-center space-y-5 relative overflow-hidden">
              <div className="absolute top-[-60px] left-1/2 -translate-x-1/2 w-[480px] h-[240px] bg-emerald-500/10 blur-3xl rounded-full pointer-events-none -z-10" />

              {/* Prompt Card */}
              <div className="w-full">
                <SituationsPromptCard
                  exercise={activeExercise}
                  subtitleMode={subtitleMode}
                  onPlayAudio={() => playPromptAudio(false)}
                  phase={session.phase}
                  hintTier={hintTier}
                  onSetHintTier={setHintTier}
                />
              </div>

              <div className="w-full h-px bg-gradient-to-r from-transparent via-border/80 dark:via-white/10 to-transparent my-1" />

              {/* Cockpit: Timer, Status Alert, Action Button */}
              <div className="w-full flex flex-col items-center justify-center space-y-4">
                <SituationsTimerBar
                  variant="minimal"
                  remainingMs={session.timer.remainingMs}
                  timerLimitMs={session.timer.totalLimitMs}
                  progress={session.timer.progress}
                  state={session.timer.state}
                  isActive={session.timer.isActive}
                  isPaused={session.timer.isPaused}
                />

                {/* Status Alert Message */}
                <div className="text-center">
                  {session.phase === "prompt_playing" ? (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm font-extrabold animate-pulse">
                      <Volume2 className="h-4 w-4" />
                      <span>NPC đang nói câu mở đầu... Hãy lắng nghe kỹ để đối đáp phù hợp</span>
                    </div>
                  ) : session.phase === "ready" ? (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm font-extrabold shadow-2xs">
                      <Sparkles className="h-4 w-4" />
                      <span>🎯 NPC đã dứt lời! Bấm bắt đầu hoặc phím tắt để trả lời</span>
                    </div>
                  ) : (session.phase === "waiting_for_speech" || session.phase === "recording") ? (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs sm:text-sm font-black animate-pulse">
                      <Mic className="h-4 w-4" />
                      <span>{session.isUserSpeaking ? "ĐANG GHI NHẬN GIỌNG NÓI CỦA BẠN..." : "MỜI BẠN NÓI HOẶC GÕ CÂU ĐỐI ĐÁP..."}</span>
                    </div>
                  ) : session.phase === "evaluating" ? (
                    <ZenLoadingState
                      variant="inline"
                      title="AI Đang Đánh Giá Ngữ Dụng & Mục Tiêu Giao Tiếp..."
                      ja="語用論・会話目標分析中..."
                    />
                  ) : null}
                </div>

                {/* Big Action Button */}
                {session.phase === "ready" && (
                  <Button
                    size="lg"
                    className="font-extrabold text-sm md:text-base h-13 min-w-[270px] px-8 rounded-2xl shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all gap-2.5 ring-2 ring-emerald-500/30 cursor-pointer bg-gradient-to-r from-emerald-500 via-teal-600 to-primary text-white"
                    onClick={() => {
                      soundFX.playFurin();
                      session.startVoiceRecording();
                    }}
                  >
                    <Mic className="h-5 w-5" />
                    <span>🎙️ Bắt Đầu Trả Lời ({formatKeyDisplay(keybindings.situationsStartVoice)})</span>
                  </Button>
                )}

                {/* Unified Input Bar for Voice or Typing */}
                <div className="w-full max-w-xl mx-auto space-y-1">
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

                {/* Quick action buttons */}
                <div className="flex items-center gap-2.5 pt-0.5">
                  <Button
                    size="sm"
                    variant="akane"
                    className="font-bold text-xs h-8 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleDirectSubmit(true)}
                    disabled={session.phase === "evaluating"}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Nộp câu đối đáp</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="font-bold text-xs h-8 px-3 rounded-xl border-border/80 text-muted-foreground hover:text-foreground"
                    onClick={() => session.startNext()}
                    disabled={session.phase === "evaluating"}
                  >
                    Bỏ qua câu ({formatKeyDisplay(keybindings.situationsSkip)})
                  </Button>
                </div>
              </div>
            </div>
          )}
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
