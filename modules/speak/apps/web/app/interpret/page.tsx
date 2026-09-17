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
  RefreshCw,
} from "lucide-react";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useInterpretSession } from "@/features/interpret/hooks/useInterpretSession";
import { ReflexTimer as InterpretTimerBar } from "@/features/reflex/components/ReflexTimer";
import { CombatCapsuleHUD } from "@/features/reflex/components/CombatCapsuleHUD";
import { StudioSpeakingController } from "@/features/reflex/components/StudioSpeakingController";
import { InterpretResultCard } from "@/features/interpret/components/InterpretArena";
import { InterpretSummary } from "@/features/interpret/components/InterpretArena";
import { InterpretCoachPanel } from "@/features/interpret/components/InterpretCoachPanel";
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
  const [duration, setDuration] = usePersistedState<0 | 3 | 5 | 10 | 20>("speaking_interpret_duration", 0);
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

  // Zero-Lobby: Automatically initialize Endless Mode on first mount if idle
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedRef.current && phase === "idle" && !showSummary) {
      hasInitializedRef.current = true;
      session.startSession();
    }
  }, [phase, showSummary, session]);

  const handleInsertText = useCallback((text: string) => {
    setTranscriptInput((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return text;
      return `${trimmed} ${text}`;
    });
  }, []);

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
      } else if (e.altKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        soundFX.playTaiko();
        void session.regenerateWithAI();
        setTranscriptInput("");
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

  if (!inSession && (phase as string) !== "summary" && !showSummary) {
    return (
      <div className="w-full h-full min-h-0 flex items-center justify-center p-6">
        <ZenLoadingState
          variant="studio"
          title="Đang Khởi Tạo Bài Luyện Phiên Dịch..."
          ja="通訳演習開始中..."
          description="Sensei AI đang chuẩn bị đề bài và từ vựng then chốt tiếng Nhật..."
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
        provenanceBadge={
          session.exercise ? (
            <ExerciseSourceBadge
              source={session.exercise.generationSource}
              isFallback={session.exercise.isFallback}
            />
          ) : undefined
        }
        extraActions={
          <Button
            variant="outline"
            size="sm"
            disabled={session.isRegeneratingAI || isEvaluating}
            onClick={async () => {
              soundFX.playTaiko();
              await session.regenerateWithAI();
              setTranscriptInput("");
            }}
            className={cn(
              "h-8 px-2 sm:px-2.5 rounded-xl text-xs font-bold border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 gap-1.5 shadow-2xs cursor-pointer transition-all",
              session.isRegeneratingAI && "opacity-70"
            )}
            title="Bỏ qua cache & gọi AI sinh bài tập Dịch mới theo chuyên đề (Alt+R)"
          >
            <RefreshCw className={cn("h-3 w-3", session.isRegeneratingAI && "animate-spin")} />
            <span className="hidden sm:inline">
              {session.isRegeneratingAI ? "Đang đổi..." : "✨ AI Đổi bài"}
            </span>
            <span className="sm:hidden">Đổi bài</span>
          </Button>
        }
        onNextTask={() => session.startNext()}
        isNextDisabled={phase === "loading" || session.isRegeneratingAI}
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

            {/* COL 2 (4 cols): Sensei AI Coach Panel when practicing / Result Card after submission */}
            <div className="lg:col-span-4 h-full min-h-0 relative">
              {phase === "result" && session.result ? (
                <InterpretResultCard
                  result={session.result}
                  exercise={session.exercise as any}
                  isPending={false}
                  liveTranscript={session.liveTranscript}
                  onNext={() => session.startNext()}
                  autoNext={autoNext}
                  onCancelAutoNext={session.cancelAutoNext}
                  onRetry={() => session.retry()}
                />
              ) : (
                <InterpretCoachPanel
                  exercise={session.exercise}
                  onInsertText={handleInsertText}
                  onPlayAudio={(text) => {
                    stopWebSpeech();
                    speakJapaneseText(text, { rate: 0.95 });
                  }}
                />
              )}
            </div>

            {/* COL 3 (4 cols): Studio Speaking Controller (Chuẩn Ergonomics) */}
            <div className="lg:col-span-4 h-full min-h-0">
              <StudioSpeakingController
                phase={
                  isEvaluating
                    ? "evaluating"
                    : isAnswering
                    ? "recording"
                    : isPrompt
                    ? "prompt_playing"
                    : isReady
                    ? "ready"
                    : isResult
                    ? "result"
                    : "idle"
                }
                liveTranscript={session.liveTranscript}
                onStartRecord={() => {
                  if (isReady) session.startAnsweringNow();
                  else if (isPrompt) session.rushToAnswer();
                  else if (isResult) session.startNext();
                  else session.startAnsweringNow();
                }}
                onStopRecord={() => {
                  const text = transcriptInput.trim() || session.liveTranscript.trim();
                  if (text) {
                    void handleDirectSubmit(true);
                  }
                }}
                onSubmit={(text) => {
                  if (text) setTranscriptInput(text);
                  void handleDirectSubmit(true);
                }}
                onRetry={() => {
                  try { stopWebSpeech(); } catch {}
                  session.retry();
                }}
                onNext={() => {
                  try { stopWebSpeech(); } catch {}
                  session.startNext();
                }}
                onSkip={() => {
                  try { stopWebSpeech(); } catch {}
                  session.skip();
                }}
                onResetTranscript={() => {
                  setTranscriptInput("");
                }}
                isWhisperMode={session.isWhisperMode}
                onToggleWhisperMode={() => session.toggleWhisperMode?.()}
                volumeLevel={session.volumeLevel}
                textInput={transcriptInput}
                onTextInputChange={setTranscriptInput}
                placeholder="Nói hoặc gõ bản dịch tiếng Nhật..."
                promptSpeakerLabel="Đề tiếng Việt"
                onPlayPrompt={() => session.readPromptVi()}
              />
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
          <span className="hidden lg:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">Alt+R</kbd> ✨ Đổi bài AI</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="whitespace-nowrap"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">C</kbd> Cẩm nang</span>
          <span className="whitespace-nowrap"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">?</kbd> Phím tắt</span>
          <span className="whitespace-nowrap"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">Esc</kbd> Thoát</span>
        </div>
      </div>

      <InterpretCheatsheetModal isOpen={showCheatsheet} onClose={() => setShowCheatsheet(false)} />
      <GlobalKeybindingsModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
