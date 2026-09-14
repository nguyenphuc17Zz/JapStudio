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
} from "lucide-react";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useInterpretSession } from "@/features/interpret/hooks/useInterpretSession";
import { ReflexTimer as InterpretTimerBar } from "@/features/reflex/components/ReflexTimer";
import { CombatCapsuleHUD } from "@/features/reflex/components/CombatCapsuleHUD";
import { InterpretResultCard } from "@/features/interpret/components/InterpretArena";
import { InterpretSummary } from "@/features/interpret/components/InterpretArena";
import { InterpretLobby } from "@/features/interpret/components/InterpretLobby";
import { InterpretCheatsheetModal } from "@/features/interpret/components/InterpretCheatsheetModal";
import { GlobalKeybindingsModal } from "@/components/layout/global-keybindings-modal";
import { useSystemKeybindings, formatKeyDisplay } from "@/hooks/use-system-keybindings";
import { speakVietnameseText, speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import { ZenLoadingState } from "@/components/ui/zen-loading-state";
import { ZenUnifiedInputBar } from "@/components/ui/zen-unified-input-bar";
import { ExerciseSourceBadge } from "@/components/ui/exercise-source-badge";
import { toast } from "@/lib/toast";
import type { InterpretRelation, InterpretScaffold, InterpretSubMode } from "@/features/interpret/services/interpret-api";

const SUB_MODE_LABEL: Record<string, { label: string; ja: string }> = {
  mixed: { label: "Tổng Hợp", ja: "混合" },
  interpret_word: { label: "Từ/cụm", ja: "単語" },
  interpret_sentence: { label: "Dịch câu", ja: "文" },
  interpret_situation: { label: "Tình huống", ja: "通訳" },
};

export default function InterpretPage() {
  const [subMode, setSubMode] = usePersistedState<InterpretSubMode>("speaking_interpret_submode", "mixed");
  const [relation, setRelation] = usePersistedState<InterpretRelation>("speaking_interpret_relation", "casual_friend");
  const [scaffold, setScaffold] = usePersistedState<InterpretScaffold>("speaking_interpret_scaffold", "keyword_hint");
  const [topic, setTopic] = usePersistedState<string>("speaking_interpret_topic", "");
  const [startTrigger, setStartTrigger] = usePersistedState<"manual" | "auto">(
    "speaking_interpret_trigger",
    "manual"
  );
  const [autoNext, setAutoNext] = usePersistedState<boolean>("speaking_interpret_autonext", true);
  const [duration, setDuration] = usePersistedState<0 | 3 | 5 | 10 | 20>("speaking_interpret_duration", 5);
  const [subtitleMode, setSubtitleMode] = usePersistedState<"hidden" | "japanese" | "japanese_reading" | "vietnamese">(
    "speaking_interpret_subtitle",
    "japanese_reading"
  );
  const [transcriptInput, setTranscriptInput] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [sessionRemainingSec, setSessionRemainingSec] = useState(duration * 60);
  const [sessionElapsedSec, setSessionElapsedSec] = useState(0);

  const sessionEndTimestampRef = useRef<number | null>(null);
  const sessionPausedRemainingMsRef = useRef(duration * 60 * 1000);

  const session = useInterpretSession({ subMode, relation, scaffold, topic: topic || undefined, startTrigger, autoNext });
  const { matchesAction, keybindings } = useSystemKeybindings();

  const phase = session.phase;
  const isReady = phase === "ready";
  const isAnswering = phase === "answering";
  const isEvaluating = phase === "evaluating" || phase === "loading";
  const isPrompt = phase === "prompt";
  const isResult = phase === "result";
  const inSession = phase !== "idle";
  const ex = session.exercise;

  useEffect(() => {
    if (phase === "idle") {
      setSessionRemainingSec(duration === 0 ? 0 : duration * 60);
      setSessionElapsedSec(0);
      sessionEndTimestampRef.current = null;
      sessionPausedRemainingMsRef.current = duration * 60 * 1000;
    }
  }, [phase, duration]);

  // Alert user via toast when fallback exercise is served
  const lastFallbackExerciseIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (ex && ex.isFallback && ex.id !== lastFallbackExerciseIdRef.current) {
      lastFallbackExerciseIdRef.current = ex.id;
      if (ex.generationSource === "smart_cache_pool") {
        toast.warning("AI không khả dụng (mạng/quota) — Đang sử dụng bài tập từ Ngân hàng Database!");
      } else {
        toast.warning("AI và Database chưa sẵn sàng — Đang sử dụng bài tập từ Bộ mẫu dự phòng!");
      }
    }
  }, [ex]);

  const finishSession = useCallback(() => {
    try {
      stopWebSpeech();
    } catch {}
    session.recorder.releaseMicrophone();
    session.speech.stopListening();
    session.cancelAutoNext();
    setShowSummary(true);
    session.setPhase?.("summary" as any);
    soundFX.playVictory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleDirectSubmit = useCallback(
    async (allowEmpty = false) => {
      const text = transcriptInput.trim() || session.liveTranscript.trim();
      if (!text && !allowEmpty) return;
      setTranscriptInput("");
      soundFX.playTaiko();
      await session.submitManual(text);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transcriptInput, session.liveTranscript]
  );

  const lastResultId = session.result ? session.result.exerciseId : null;
  useEffect(() => {
    if (lastResultId) soundFX.playFurin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResultId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (phase === "idle") return;
      if (matchesAction(e, "openKeybindingsModal") || matchesAction(e, "interpretToggleHelp")) {
        e.preventDefault();
        setShowHelp((v) => !v);
      } else if (matchesAction(e, "interpretOpenCheatsheet")) {
        e.preventDefault();
        soundFX.playFurin();
        setShowCheatsheet((v) => !v);
      } else if (matchesAction(e, "interpretRetry") && (isResult || isAnswering)) {
        e.preventDefault();
        session.retry();
      } else if (matchesAction(e, "interpretSkip") && (isAnswering || isResult || isPrompt)) {
        e.preventDefault();
        session.skip();
      } else if (matchesAction(e, "interpretReplayModel") && ex) {
        e.preventDefault();
        try {
          if (ex.referenceJa) speakJapaneseText(ex.referenceJa, { rate: 0.95 });
          else if (ex.promptVi) speakVietnameseText(ex.promptVi, { rate: 0.95 });
        } catch {}
      } else if (matchesAction(e, "interpretListenPrompt") && ex) {
        e.preventDefault();
        session.readPromptVi();
      } else if (matchesAction(e, "interpretPauseOrResume") && isAnswering) {
        e.preventDefault();
        session.togglePause();
      } else if (matchesAction(e, "interpretSubmitOrNext")) {
        if (isReady) {
          e.preventDefault();
          session.startAnsweringNow();
        } else if (isAnswering) {
          const text = transcriptInput.trim() || session.liveTranscript.trim();
          if (text) {
            e.preventDefault();
            void handleDirectSubmit(true);
          }
        } else if (isResult) {
          e.preventDefault();
          session.startNext();
        }
      } else if (matchesAction(e, "interpretStartVoice")) {
        if (isReady) {
          e.preventDefault();
          session.startAnsweringNow();
        } else if (isPrompt) {
          e.preventDefault();
          session.rushToAnswer();
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
  }, [phase, isReady, isAnswering, isResult, isPrompt, transcriptInput, showCheatsheet, showHelp]);

  const furiganaMode =
    subtitleMode === "hidden" ? "hidden" : subtitleMode === "japanese" ? "kanji" : "kanji_reading";
  const modeInfo = SUB_MODE_LABEL[ex?.subMode || subMode] || SUB_MODE_LABEL.mixed;

  if (!inSession) {
    return (
      <div className="w-full h-full min-h-0 overflow-hidden">
        <InterpretLobby
          subMode={subMode} setSubMode={setSubMode}
          relation={relation} setRelation={setRelation}
          scaffold={scaffold} setScaffold={setScaffold}
          topic={topic} setTopic={setTopic}
          duration={duration} setDuration={setDuration}
          startTrigger={startTrigger} setStartTrigger={setStartTrigger}
          onStart={session.startSession}
          loading={false}
          keybindings={keybindings}
          onOpenHelp={() => setShowHelp(true)}
        />
      </div>
    );
  }

  const subJa = ex?.subMode === "interpret_word" ? "単語" : ex?.subMode === "interpret_situation" ? "通訳" : "文";

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
          label: `${ex?.topic || topic || "Trộn chủ đề"} · ${scaffold === "none" ? "Blind" : "có gợi ý"}`,
          onClick: () => setShowCheatsheet(true),
        }}
        onSubmit={finishSession}
        onExit={exitSession}
        onOpenHelp={() => setShowHelp(true)}
      />

      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {showSummary || (phase as string) === "summary" ? (
          <div className="h-full overflow-y-auto rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl p-4 shadow-xl">
            <InterpretSummary
              results={session.results as any}
              onRestart={() => {
                setShowSummary(false);
                session.startSession();
              }}
              onToPlan={() => (window.location.href = "/dashboard")}
            />
          </div>
        ) : phase === "loading" || (!ex && !isResult) ? (
          <div className="h-full flex items-center justify-center rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl shadow-xl p-6">
            <ZenLoadingState
              variant="studio"
              title="AI Đang Soạn Bài Phiên Dịch..."
              ja="通訳問題生成中..."
              description="AI đang chọn đề Việt, ý chính JA và bản dịch mẫu phù hợp với bạn..."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full min-h-0">
            {/* COL 1: prompt + laser timer */}
            <div className="lg:col-span-4 h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
              <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/10 blur-3xl rounded-full pointer-events-none -z-10" />
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Đề tiếng Việt {ex?.blind ? "· Blind 自力" : ""} · {subJa}
                    </p>
                    <ExerciseSourceBadge source={ex?.generationSource} isFallback={ex?.isFallback} />
                  </div>
                  <button onClick={() => session.readPromptVi()} className="flex items-center gap-1 text-xs text-primary hover:underline" title={`Đọc đề (${formatKeyDisplay(keybindings.interpretListenPrompt)})`}>
                    <Volume2 className="h-3.5 w-3.5" /> Đọc đề
                  </button>
                </div>
                <p className="text-xl font-semibold leading-relaxed">{ex?.promptVi || ""}</p>
                {!ex?.blind && ex?.expectedJaKeywords && ex.expectedJaKeywords.length > 0 ? (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ý chính phải giữ (gợi ý JA):</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ex.expectedJaKeywords.map((k) => (
                        <span key={k} className="rounded-xl bg-sky-500/10 border border-sky-500/30 px-3 py-1 text-sm font-bold text-sky-700">
                          <UniversalFurigana text={k} forceDisplayMode={furiganaMode as any} fontSize="sm" />
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="pt-2 shrink-0 border-t border-border/60 dark:border-white/10 space-y-1.5">
                <InterpretTimerBar
                  variant="laser-bar"
                  remainingMs={session.combatTimer.remainingMs}
                  timerLimitMs={session.combatTimer.totalLimitMs || ex?.timerMs || 20000}
                  progress={session.combatTimer.progress}
                  state={session.combatTimer.state}
                  isActive={session.combatTimer.isActive}
                  isPaused={session.isPaused}
                />
              </div>
            </div>

            {/* COL 2: result deck */}
            <div className="lg:col-span-5 h-full min-h-0 relative">
              <InterpretResultCard
                result={session.result}
                exercise={session.exercise as any}
                isPending={phase !== "result" || !session.result}
                liveTranscript={session.liveTranscript}
                onNext={() => session.startNext()}
                autoNext={autoNext}
                onCancelAutoNext={session.cancelAutoNext}
                onRetry={() => session.retry()}
              />
            </div>

            {/* COL 3: mic deck */}
            <div className="lg:col-span-3 h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl p-3.5 sm:p-4 relative overflow-hidden shadow-lg">
              <div className="absolute bottom-[-30px] right-[-30px] w-40 h-40 bg-primary/10 blur-3xl rounded-full pointer-events-none -z-10" />
              <div className="flex items-center justify-between gap-2 shrink-0 pb-2 border-b border-border/60 dark:border-white/10">
                <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 whitespace-nowrap shrink-0">
                  {isAnswering ? (
                    <><span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" /><span className="text-rose-500">ĐANG DỊCH...</span></>
                  ) : isPrompt ? (
                    <><Volume2 className="h-3.5 w-3.5 text-primary animate-pulse" /><span className="text-primary">NGHE ĐỀ VI...</span></>
                  ) : isReady ? (
                    <><Sparkles className="h-3.5 w-3.5 text-primary" /><span className="text-primary">SẴN SÀNG</span></>
                  ) : isEvaluating ? (
                    <><Activity className="h-3.5 w-3.5 text-primary animate-spin" /><span className="text-primary">CHẤM DỊCH...</span></>
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
                    title="Chế độ Giọng Nhỏ"
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
                    const activeMultiplier = isAnswering ? (session.volumeLevel || 0.08) * 50 : 5;
                    const height = Math.max(5, Math.min(36, activeMultiplier * scale + 5));
                    return (
                      <span
                        key={i}
                        className={cn(
                          "w-1.5 rounded-full transition-all duration-75",
                          isAnswering
                            ? "bg-gradient-to-t from-rose-500 to-amber-400 shadow-xs shadow-rose-500/30"
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
                    <span>Bản dịch của bạn:</span>
                    {session.liveTranscript && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />}
                  </div>
                  <div className="text-xs sm:text-sm font-black font-jp text-foreground min-h-[1.5rem] flex items-center justify-center px-1">
                    {session.liveTranscript ? (
                      <span className="line-clamp-2">“{session.liveTranscript}”</span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground font-sans font-normal italic">
                        {isAnswering
                          ? "Nói bản dịch Nhật của bạn..."
                          : isReady
                          ? "Bấm [Space] hoặc nút dưới để bắt đầu nói"
                          : isResult
                          ? "Đã có kết quả ở Cột 2"
                          : "Chờ đề..."}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 w-full">
                  {isReady && (
                    <Button
                      size="sm"
                      className="w-full font-black text-xs h-10 rounded-xl shadow-md bg-gradient-to-r from-blue-600 via-primary to-indigo-600 text-white cursor-pointer ring-1 ring-primary/40 gap-1.5"
                      onClick={() => session.startAnsweringNow()}
                    >
                      <Mic className="h-3.5 w-3.5" />
                      <span>Bắt Đầu Dịch ({formatKeyDisplay(keybindings.interpretStartVoice)})</span>
                    </Button>
                  )}
                  {isPrompt && (
                    <Button size="sm" variant="outline" className="w-full font-bold text-xs h-9 rounded-xl border-primary/40 text-primary hover:bg-primary/10 cursor-pointer gap-1.5"
                      onClick={() => session.rushToAnswer()}>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Dịch ngay ({formatKeyDisplay(keybindings.interpretStartVoice)})</span>
                    </Button>
                  )}
                  {isAnswering && (
                    <div className="grid grid-cols-1 gap-1.5 w-full">
                      <Button size="sm" variant="akane" className="w-full font-bold text-xs h-9 rounded-xl shadow-xs gap-1.5 cursor-pointer bg-gradient-to-r from-blue-600 to-primary text-white whitespace-nowrap"
                        onClick={() => handleDirectSubmit(true)} title="Nộp bản dịch ngay (Enter)">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span>Nộp bản dịch (Enter)</span>
                      </Button>
                      <div className="grid grid-cols-2 gap-1.5">
                        <Button size="sm" variant="outline" className="font-bold text-[11px] h-8 px-2 rounded-xl border-amber-500/40 text-amber-500 hover:bg-amber-500/10 gap-1 cursor-pointer whitespace-nowrap justify-center"
                          onClick={() => session.togglePause()} title="Tạm dừng đồng hồ">
                          <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                          <span>{session.isPaused ? "Tiếp Tục" : "Tạm Dừng"}</span>
                        </Button>
                        <Button size="sm" variant="outline" className="font-bold text-[11px] h-8 px-2 rounded-xl border-border text-foreground hover:bg-muted gap-1 cursor-pointer flex-1 justify-center whitespace-nowrap"
                          onClick={() => { try { stopWebSpeech(); } catch {} session.skip(); }} title="Qua câu không chấm (N)">
                          <span>Qua câu</span>
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
                        <span>Câu Tiếp Theo</span>
                        <kbd className="text-[9px] font-mono px-1 rounded bg-black/20 text-white font-bold">Space</kbd>
                      </Button>
                      <Button size="sm" variant="outline" className="w-full font-bold text-[11px] h-8 rounded-xl border-border cursor-pointer gap-1"
                        onClick={() => { try { stopWebSpeech(); } catch {} session.retry(); }}>
                        <RotateCcw className="h-3 w-3" />
                        <span>Dịch lại câu này (R)</span>
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
                  placeholder={isAnswering ? "Nói hoặc gõ bản dịch tiếng Nhật..." : isResult ? "Nhấn Space sang câu mới..." : "Gõ bản dịch tiếng Nhật..."}
                  submitButtonText="Nộp"
                  isEvaluating={isEvaluating}
                  isPaused={session.isPaused}
                  showOfficeBadge={false}
                  hintText={isAnswering ? "Đang thu âm mic" : undefined}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="h-7 shrink-0 border-t border-border/60 dark:border-white/10 flex items-center justify-between text-[11px] text-muted-foreground px-1">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.interpretStartVoice)} / {formatKeyDisplay(keybindings.interpretSubmitOrNext)}</kbd> Dịch ngay / Nộp</span>
          <span className="hidden sm:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">N</kbd> Qua câu</span>
          <span className="hidden sm:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">R</kbd> Dịch lại</span>
          <span className="hidden md:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">L</kbd> Đọc đề</span>
          <span className="hidden sm:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">P</kbd> Tạm dừng</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="whitespace-nowrap"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">?</kbd> Phím tắt</span>
          <span className="whitespace-nowrap"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">Esc</kbd> Thoát</span>
        </div>
      </div>

      <InterpretCheatsheetModal isOpen={showCheatsheet} onClose={() => setShowCheatsheet(false)} />
      <GlobalKeybindingsModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
