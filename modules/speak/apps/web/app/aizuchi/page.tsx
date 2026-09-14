"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mic,
  Clock,
  Play,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  Volume2,
  Activity,
  Zap,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useAizuchiSession } from "@/features/aizuchi/hooks/useAizuchiSession";
import { ReflexTimer as AizuchiTimerBar } from "@/features/reflex/components/ReflexTimer";
import { CombatCapsuleHUD } from "@/features/reflex/components/CombatCapsuleHUD";
import { AizuchiResultCard } from "@/features/aizuchi/components/AizuchiArena";
import { AizuchiSummary } from "@/features/aizuchi/components/AizuchiArena";
import { AizuchiLobby } from "@/features/aizuchi/components/AizuchiLobby";
import { AizuchiCheatsheetModal } from "@/features/aizuchi/components/AizuchiCheatsheetModal";
import { GlobalKeybindingsModal } from "@/components/layout/global-keybindings-modal";
import { useSystemKeybindings, formatKeyDisplay } from "@/hooks/use-system-keybindings";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import { ZenLoadingState } from "@/components/ui/zen-loading-state";
import { ZenUnifiedInputBar } from "@/components/ui/zen-unified-input-bar";
import { ExerciseSourceBadge } from "@/components/ui/exercise-source-badge";
import { toast } from "@/lib/toast";
import type { AizuchiRelation, AizuchiSubMode, WindowProfile } from "@/features/aizuchi/services/aizuchi-api";

const SUB_MODE_LABEL: Record<string, { label: string; ja: string }> = {
  mixed: { label: "Tổng Hợp", ja: "混合" },
  aizuchi_reaction: { label: "Nghe-chêm", ja: "相づち" },
  warikomi_interrupt: { label: "Chen ngang", ja: "割り込み" },
};

export default function AizuchiPage() {
  const [subMode, setSubMode] = usePersistedState<AizuchiSubMode>("speaking_aizuchi_submode", "mixed");
  const [relation, setRelation] = usePersistedState<AizuchiRelation>("speaking_aizuchi_relation", "casual_friend");
  const [windowProfile, setWindowProfile] = usePersistedState<WindowProfile>("speaking_aizuchi_window", "normal");
  const [startTrigger, setStartTrigger] = usePersistedState<"manual" | "auto">(
    "speaking_aizuchi_trigger",
    "manual"
  );
  const [autoNext, setAutoNext] = usePersistedState<boolean>("speaking_aizuchi_autonext", true);
  const [duration, setDuration] = usePersistedState<0 | 3 | 5 | 10 | 20>("speaking_aizuchi_duration", 5);
  const [subtitleMode, setSubtitleMode] = usePersistedState<"hidden" | "japanese" | "japanese_reading" | "vietnamese">(
    "speaking_aizuchi_subtitle",
    "japanese_reading"
  );
  const [transcriptInput, setTranscriptInput] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showNpcTranslation, setShowNpcTranslation] = useState(false);
  const [sessionRemainingSec, setSessionRemainingSec] = useState(duration * 60);
  const [sessionElapsedSec, setSessionElapsedSec] = useState(0);

  const sessionEndTimestampRef = useRef<number | null>(null);
  const sessionPausedRemainingMsRef = useRef(duration * 60 * 1000);

  const session = useAizuchiSession({ subMode, relation, windowProfile, startTrigger, speed: 1.0, autoNext });
  const { matchesAction, keybindings } = useSystemKeybindings();

  const phase = session.phase;
  const isReady = phase === "ready";
  const isWaiting = phase === "window_open";
  const isRecording = phase === "recording";
  const isEvaluating = phase === "evaluating" || phase === "loading";
  const isPromptPlaying = phase === "npc_speaking";
  const isResult = phase === "result";
  const capturing = isWaiting || isRecording;
  const inSession = phase !== "idle";

  // Reset session clock when back to lobby
  useEffect(() => {
    if (phase === "idle") {
      setSessionRemainingSec(duration === 0 ? 0 : duration * 60);
      setSessionElapsedSec(0);
      sessionEndTimestampRef.current = null;
      sessionPausedRemainingMsRef.current = duration * 60 * 1000;
    }
  }, [phase, duration]);

  // Reset NPC translation visibility when turn changes
  useEffect(() => {
    setShowNpcTranslation(false);
  }, [session.turnIndex, session.exercise?.id]);

  // Alert user via toast when fallback exercise is served
  const lastFallbackExerciseIdRef = useRef<string | null>(null);
  useEffect(() => {
    const ex = session.exercise;
    if (ex && ex.isFallback && ex.id !== lastFallbackExerciseIdRef.current) {
      lastFallbackExerciseIdRef.current = ex.id;
      if (ex.generationSource === "smart_cache_pool") {
        toast.warning("AI không khả dụng (mạng/quota) — Đang sử dụng bài tập từ Ngân hàng Database!");
      } else {
        toast.warning("AI và Database chưa sẵn sàng — Đang sử dụng bài tập từ Bộ mẫu dự phòng!");
      }
    }
  }, [session.exercise]);

  const finishSession = useCallback(() => {
    try {
      stopWebSpeech();
    } catch {}
    session.recorder.releaseMicrophone();
    session.speech.stopListening();
    session.cancelAutoNext();
    setShowSummary(true);
    session.setPhase("summary" as any);
    soundFX.playVictory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Session duration countdown / elapsed tracking
  useEffect(() => {
    const active = phase !== "idle" && (phase as string) !== "summary" && !showSummary;
    if (!active) return;
    if (duration === 0) {
      if (session.isPaused) return;
      const id = setInterval(() => setSessionElapsedSec((s) => s + 1), 1000);
      return () => clearInterval(id);
    }
    if (session.isPaused) {
      if (sessionEndTimestampRef.current !== null) {
        sessionPausedRemainingMsRef.current = Math.max(0, sessionEndTimestampRef.current - Date.now());
        sessionEndTimestampRef.current = null;
      }
      return;
    }
    if (sessionEndTimestampRef.current === null) {
      sessionEndTimestampRef.current = Date.now() + sessionPausedRemainingMsRef.current;
    }
    const id = setInterval(() => {
      if (sessionEndTimestampRef.current === null) return;
      const left = Math.max(0, sessionEndTimestampRef.current - Date.now());
      setSessionRemainingSec(Math.ceil(left / 1000));
      if (left <= 0) {
        clearInterval(id);
        sessionEndTimestampRef.current = null;
        finishSession();
      }
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, phase, session.isPaused, showSummary]);

  const exitSession = useCallback(() => {
    try {
      stopWebSpeech();
    } catch {}
    session.stopSession();
    setShowSummary(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playPromptAudio = useCallback(() => {
    const text = session.currentTurn?.text;
    if (!text) return;
    try {
      speakJapaneseText(text, { rate: 1.0 });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.currentTurn]);

  const handleDirectSubmit = useCallback(
    async (allowEmpty = false) => {
      const text = (transcriptInput.trim() || session.liveTranscript.trim());
      if (!text && !allowEmpty) return;
      setTranscriptInput("");
      soundFX.playTaiko();
      await session.submitManual(text);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transcriptInput, session.liveTranscript]
  );

  // Result chime
  const lastResultId = session.result ? `${session.result.exerciseId}_${session.result.turnIndex}` : null;
  useEffect(() => {
    if (lastResultId) soundFX.playFurin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResultId]);

  // Global keybindings
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (phase === "idle") return;
      if (matchesAction(e, "openKeybindingsModal") || matchesAction(e, "aizuchiToggleHelp")) {
        e.preventDefault();
        setShowHelp((v) => !v);
      } else if (matchesAction(e, "aizuchiOpenCheatsheet")) {
        e.preventDefault();
        soundFX.playFurin();
        setShowCheatsheet((v) => !v);
      } else if (matchesAction(e, "aizuchiRetry") && (isResult || capturing)) {
        e.preventDefault();
        session.retry();
      } else if (matchesAction(e, "aizuchiSkip") && (capturing || isResult)) {
        e.preventDefault();
        session.skip();
      } else if (matchesAction(e, "aizuchiListenPrompt") && session.currentTurn) {
        e.preventDefault();
        playPromptAudio();
      } else if (matchesAction(e, "aizuchiReplayModel") && session.currentTurn) {
        // Model answer audio handled by ResultCard (A) — do not double-play prompt
        e.preventDefault();
      } else if (matchesAction(e, "aizuchiPauseOrResume") && capturing) {
        e.preventDefault();
        session.togglePause();
      } else if (matchesAction(e, "aizuchiSubmitOrNext")) {
        if (isReady) {
          e.preventDefault();
          session.startAizuchiNow();
        } else if (capturing) {
          const text = transcriptInput.trim() || session.liveTranscript.trim();
          if (text) {
            e.preventDefault();
            void handleDirectSubmit(true);
          }
        } else if (isResult) {
          e.preventDefault();
          session.startNext();
        }
      } else if (matchesAction(e, "aizuchiStartVoice")) {
        if (isReady) {
          e.preventDefault();
          session.startAizuchiNow();
        } else if (isPromptPlaying) {
          e.preventDefault();
          session.rushToWindow();
        } else if (isResult) {
          e.preventDefault();
          session.startNext();
        }
      } else if (e.key === "Escape") {
        if (showCheatsheet) setShowCheatsheet(false);
        else if (showHelp) setShowHelp(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isReady, capturing, isResult, isPromptPlaying, transcriptInput, showCheatsheet, showHelp]);

  const furiganaMode =
    subtitleMode === "hidden" ? "hidden" : subtitleMode === "japanese" ? "kanji" : "kanji_reading";
  const modeInfo = SUB_MODE_LABEL[session.exercise?.subMode || subMode] || SUB_MODE_LABEL.mixed;

  if (!inSession) {
    return (
      <div className="w-full h-full min-h-0 overflow-hidden">
        <AizuchiLobby
          subMode={subMode}
          setSubMode={setSubMode}
          relation={relation}
          setRelation={setRelation}
          windowProfile={windowProfile}
          setWindowProfile={setWindowProfile}
          duration={duration}
          setDuration={setDuration}
          startTrigger={startTrigger}
          setStartTrigger={setStartTrigger}
          onStart={session.startSession}
          loading={false}
          keybindings={keybindings}
          onOpenHelp={() => setShowHelp(true)}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1760px] mx-auto h-full flex flex-col justify-between px-2 sm:px-4 py-2 gap-2 overflow-hidden select-none animate-in fade-in duration-200">
      <CombatCapsuleHUD
        questionNumber={session.stats.total + (isResult ? 0 : 1)}
        subModeLabel={modeInfo.label}
        subModeJa={modeInfo.ja}
        currentStreak={session.streak}
        duration={duration}
        sessionRemainingSec={sessionRemainingSec}
        sessionElapsedSec={sessionElapsedSec}
        subtitleMode={subtitleMode}
        setSubtitleMode={setSubtitleMode}
        startTrigger={startTrigger}
        setStartTrigger={setStartTrigger}
        micGain={session.micGain ?? 2.0}
        setMicGain={(g) => session.setMicGain(g)}
        autoNext={autoNext}
        setAutoNext={setAutoNext}
        filterTrigger={{
          label: relation === "casual_friend" ? "タメ口 bạn bè" : "丁寧語 công sở",
          onClick: () => setShowCheatsheet(true),
        }}
        onSubmit={finishSession}
        onExit={exitSession}
        onOpenHelp={() => setShowHelp(true)}
      />

      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {showSummary || (phase as string) === "summary" ? (
          <div className="h-full overflow-y-auto rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl p-4 shadow-xl">
            <AizuchiSummary
              results={session.results as any}
              onRestart={() => {
                setShowSummary(false);
                session.startSession();
              }}
              onToPlan={() => (window.location.href = "/dashboard")}
            />
          </div>
        ) : phase === "loading" || (!session.exercise && !isResult) ? (
          <div className="h-full flex items-center justify-center rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl shadow-xl p-6">
            <ZenLoadingState
              variant="studio"
              title="AI Đang Chuẩn Bị Tình Huống Aizuchi..."
              ja="相づち場面生成中..."
              description="AI đang dựng hội thoại NPC, khoảng lặng pause và gợi ý chêm phù hợp với bạn..."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full min-h-0">
            {/* COL 1: NPC prompt + laser timer */}
            <div className="lg:col-span-4 h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
              <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/10 blur-3xl rounded-full pointer-events-none -z-10" />
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      NPC · Turn {Math.min(session.turnIndex + 1, session.totalTurns)}/{session.totalTurns}
                    </p>
                    <ExerciseSourceBadge source={session.exercise?.generationSource} isFallback={session.exercise?.isFallback} />
                  </div>
                  <button onClick={playPromptAudio} className="flex items-center gap-1 text-xs text-primary hover:underline" title={`Nghe lại (${formatKeyDisplay(keybindings.aizuchiListenPrompt)})`}>
                    <Volume2 className="h-3.5 w-3.5" /> Nghe lại
                  </button>
                </div>
                <div className="text-xl leading-relaxed">
                  <UniversalFurigana
                    text={session.currentTurn?.text || ""}
                    forceDisplayMode={furiganaMode as any}
                    fontSize="lg"
                    showAudioButton
                    enableClickToSpeak
                  />
                </div>
                {session.currentTurn?.text_vi ? (
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => setShowNpcTranslation((v) => !v)}
                      className="text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="h-3 w-3" />
                      <span>{showNpcTranslation ? "Ẩn dịch nghĩa NPC" : "Xem dịch nghĩa NPC"}</span>
                    </button>
                    {showNpcTranslation && (
                      <p className="mt-1 text-xs text-muted-foreground bg-muted/40 p-2 rounded-xl border border-border/50 animate-in fade-in duration-150">
                        {session.currentTurn.text_vi}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="pt-2 shrink-0 border-t border-border/60 dark:border-white/10 space-y-1.5">
                <AizuchiTimerBar
                  variant="laser-bar"
                  remainingMs={session.timer.remainingMs}
                  timerLimitMs={session.timer.totalLimitMs || 600}
                  progress={session.timer.progress}
                  state={session.timer.state === "idle" ? "normal" : session.timer.state}
                  isActive={session.timer.isActive}
                  isPaused={session.isPaused}
                />
              </div>
            </div>

            {/* COL 2: Result deck */}
            <div className="lg:col-span-5 h-full min-h-0 relative">
              <AizuchiResultCard
                result={session.result}
                exercise={session.exercise as any}
                isPending={phase !== "result" || !session.result}
                liveTranscript={session.liveTranscript}
                onNext={() => session.startNext()}
                autoNext={autoNext}
                onCancelAutoNext={session.cancelAutoNext}
                onRetry={() => session.retry()}
                onSkip={() => session.skip()}
              />
            </div>

            {/* COL 3: Mic deck */}
            <div className="lg:col-span-3 h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl p-3.5 sm:p-4 relative overflow-hidden shadow-lg">
              <div className="absolute bottom-[-30px] right-[-30px] w-40 h-40 bg-primary/10 blur-3xl rounded-full pointer-events-none -z-10" />
              <div className="flex items-center justify-between gap-2 shrink-0 pb-2 border-b border-border/60 dark:border-white/10">
                <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 whitespace-nowrap shrink-0">
                  {isReady ? (
                    <><Sparkles className="h-3.5 w-3.5 text-primary" /><span className="text-primary">SẴN SÀNG</span></>
                  ) : isWaiting ? (
                    <><span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" /><span className="text-amber-500">CHÊM NGAY!</span></>
                  ) : isRecording ? (
                    <><span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" /><span className="text-rose-500">ĐANG THU ÂM...</span></>
                  ) : isPromptPlaying ? (
                    <><Volume2 className="h-3.5 w-3.5 text-primary animate-pulse" /><span className="text-primary">NPC ĐANG NÓI...</span></>
                  ) : isEvaluating ? (
                    <><Activity className="h-3.5 w-3.5 text-primary animate-spin" /><span className="text-primary">CHẤM ĐIỂM...</span></>
                  ) : isResult ? (
                    <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /><span className="text-emerald-500">HOÀN THÀNH</span></>
                  ) : (
                    <span>TRẠM THU ÂM</span>
                  )}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      session.toggleWhisperMode?.();
                      soundFX.playTaiko();
                    }}
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full transition-all flex items-center gap-1 cursor-pointer border whitespace-nowrap shrink-0",
                      session.isWhisperMode
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-500 hover:bg-amber-500/25 ring-1 ring-amber-500/30"
                        : "bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    title="Chế độ Giọng Nhỏ: khuếch đại mic, VAD siêu nhạy"
                  >
                    <Zap className={cn("h-2.5 w-2.5 shrink-0", session.isWhisperMode ? "text-amber-500 fill-amber-500" : "text-muted-foreground")} />
                    <span>{session.isWhisperMode ? "Whisper x3.5" : "Giọng nhỏ"}</span>
                  </button>
                  <Badge variant="outline" size="sm" className="text-[9px] font-mono border-white/15 bg-white/5 text-primary rounded-full px-1.5 py-0 whitespace-nowrap shrink-0">
                    Live
                  </Badge>
                </div>
              </div>

              <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-2 space-y-3">
                <div className="flex items-center gap-1 h-10">
                  {[0.5, 1.0, 1.5, 1.8, 1.3, 0.9, 0.4].map((scale, i) => {
                    const activeMultiplier = isRecording || isWaiting ? (session.volumeLevel || 0.08) * 50 : 5;
                    const height = Math.max(5, Math.min(36, activeMultiplier * scale + 5));
                    return (
                      <span
                        key={i}
                        className={cn(
                          "w-1.5 rounded-full transition-all duration-75",
                          isRecording
                            ? "bg-gradient-to-t from-rose-500 to-amber-400 shadow-xs shadow-rose-500/30"
                            : isWaiting
                            ? "bg-gradient-to-t from-amber-500 to-yellow-300 shadow-xs shadow-amber-500/30"
                            : isResult
                            ? "bg-gradient-to-t from-emerald-500 to-teal-400"
                            : "bg-gradient-to-t from-blue-600 to-primary/60"
                        )}
                        style={{ height: `${height}px` }}
                      />
                    );
                  })}
                </div>

                <div className="w-full p-2.5 rounded-2xl bg-muted/40 dark:bg-black/30 border border-border/80 dark:border-white/10 backdrop-blur-md text-center space-y-1 shadow-inner">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
                    <Mic className="h-3 w-3 text-primary" />
                    <span>Aizuchi của bạn:</span>
                    {session.liveTranscript && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />}
                  </div>
                  <div className="text-xs sm:text-sm font-black font-jp text-foreground min-h-[1.5rem] flex items-center justify-center px-1">
                    {session.liveTranscript ? (
                      <span className="line-clamp-2">“{session.liveTranscript}”</span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground font-sans font-normal italic">
                        {isReady
                          ? "Bấm [Space] hoặc nút dưới để phản hồi"
                          : isWaiting
                          ? "Chêm ngay へー / うんうん / 確かに..."
                          : isResult
                          ? "Đã có kết quả ở Cột 2"
                          : "Chờ NPC nói..."}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 w-full">
                  {isReady && (
                    <Button
                      size="sm"
                      className="w-full font-black text-xs h-10 rounded-xl shadow-md bg-gradient-to-r from-blue-600 via-primary to-indigo-600 text-white cursor-pointer ring-1 ring-primary/40 gap-1.5"
                      onClick={() => session.startAizuchiNow()}
                    >
                      <Mic className="h-3.5 w-3.5" />
                      <span>Bắt Đầu Phản Hồi ({formatKeyDisplay(keybindings.aizuchiStartVoice)})</span>
                    </Button>
                  )}
                  {isPromptPlaying && (
                    <Button size="sm" variant="outline" className="w-full font-bold text-xs h-9 rounded-xl border-primary/40 text-primary hover:bg-primary/10 cursor-pointer gap-1.5"
                      onClick={() => session.rushToWindow()}>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Vào window ngay ({formatKeyDisplay(keybindings.aizuchiStartVoice)})</span>
                    </Button>
                  )}
                  {capturing && (
                    <div className="grid grid-cols-1 gap-1.5 w-full">
                      <Button size="sm" variant="akane" className="w-full font-bold text-xs h-9 rounded-xl shadow-xs gap-1.5 cursor-pointer bg-gradient-to-r from-blue-600 to-primary text-white whitespace-nowrap"
                        onClick={() => handleDirectSubmit(true)} title="Nộp câu chêm ngay (Enter)">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span>Nộp câu này (Enter)</span>
                      </Button>
                      <div className="grid grid-cols-2 gap-1.5">
                        <Button size="sm" variant="outline" className="font-bold text-[11px] h-8 px-2 rounded-xl border-amber-500/40 text-amber-500 hover:bg-amber-500/10 gap-1 cursor-pointer whitespace-nowrap justify-center"
                          onClick={() => session.togglePause()} title="Tạm dừng cửa sổ pause">
                          <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                          <span>{session.isPaused ? "Tiếp Tục" : "Tạm Dừng"}</span>
                        </Button>
                        <Button size="sm" variant="outline" className="font-bold text-[11px] h-8 px-2 rounded-xl border-border text-foreground hover:bg-muted gap-1 cursor-pointer flex-1 justify-center whitespace-nowrap"
                          onClick={() => { try { stopWebSpeech(); } catch {} session.skip(); }} title="Qua turn không chấm (N)">
                          <span>Qua turn</span>
                          <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                          <kbd className="text-[9px] font-mono px-1 rounded bg-muted border border-border text-muted-foreground font-bold">N</kbd>
                        </Button>
                      </div>
                    </div>
                  )}
                  {isResult && (
                    <div className="grid grid-cols-1 gap-1.5 w-full">
                      <Button size="sm" variant="akane" className="w-full font-black text-xs h-9 rounded-xl gap-1 bg-gradient-to-r from-blue-600 via-primary to-indigo-600 text-white cursor-pointer shadow-sm"
                        onClick={() => { try { stopWebSpeech(); } catch {} session.startNext(); }}>
                        <span>Turn Tiếp Theo</span>
                        <kbd className="text-[9px] font-mono px-1 rounded bg-black/20 text-white font-bold">Space</kbd>
                      </Button>
                      <Button size="sm" variant="outline" className="w-full font-bold text-[11px] h-8 rounded-xl border-border cursor-pointer gap-1"
                        onClick={() => { try { stopWebSpeech(); } catch {} session.retry(); }}>
                        <RotateCcw className="h-3 w-3" />
                        <span>Chêm lại turn này (R)</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 pt-2 border-t border-border/60 dark:border-white/10">
                <ZenUnifiedInputBar
                  value={transcriptInput}
                  onChange={setTranscriptInput}
                  onSubmit={() => handleDirectSubmit(true)}
                  speechTranscript={session.liveTranscript}
                  placeholder={isWaiting ? "Chêm hoặc gõ: へー / 確かに / それで?..." : isResult ? "Nhấn Space sang turn mới..." : "Gõ câu chêm..."}
                  submitButtonText="Nộp"
                  isEvaluating={isEvaluating}
                  isPaused={session.isPaused}
                  showOfficeBadge={false}
                  hintText={isRecording ? "Đang thu âm mic" : undefined}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="h-7 shrink-0 border-t border-border/60 dark:border-white/10 flex items-center justify-between text-[11px] text-muted-foreground px-1">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.aizuchiStartVoice)} / {formatKeyDisplay(keybindings.aizuchiSubmitOrNext)}</kbd> Vào window / Nộp</span>
          <span className="hidden sm:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">N</kbd> Qua turn</span>
          <span className="hidden sm:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">R</kbd> Chêm lại</span>
          <span className="hidden md:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">L</kbd> Nghe NPC</span>
          <span className="hidden sm:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">P</kbd> Tạm dừng</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="whitespace-nowrap"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">?</kbd> Phím tắt</span>
          <span className="whitespace-nowrap"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">Esc</kbd> Thoát</span>
        </div>
      </div>

      <AizuchiCheatsheetModal isOpen={showCheatsheet} onClose={() => setShowCheatsheet(false)} />
      <GlobalKeybindingsModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
