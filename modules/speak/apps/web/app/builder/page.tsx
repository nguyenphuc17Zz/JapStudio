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
  Lightbulb,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useBuilderSession } from "@/features/builder/hooks/useBuilderSession";
import { ReflexTimer as BuilderTimerBar } from "@/features/reflex/components/ReflexTimer";
import { CombatCapsuleHUD } from "@/features/reflex/components/CombatCapsuleHUD";
import { StudioSpeakingController } from "@/features/reflex/components/StudioSpeakingController";
import { BuilderResultCard } from "@/features/builder/components/BuilderArena";
import { BuilderSummary } from "@/features/builder/components/BuilderArena";
import { BuilderTaskCard } from "@/features/builder/components/BuilderTaskCard";
import { BuilderInteractiveBoard } from "@/features/builder/components/BuilderInteractiveBoard";
import { BuilderLobby } from "@/features/builder/components/BuilderLobby";
import { BuilderCheatsheetModal } from "@/features/builder/components/BuilderCheatsheetModal";
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
import type { BuilderRelation, BuilderScaffold, BuilderSkill, BuilderSubMode } from "@/features/builder/services/builder-api";

const SUB_MODE_LABEL: Record<string, { label: string; ja: string }> = {
  mixed: { label: "Tổng Hợp", ja: "混合" },
  sentence_assemble: { label: "Nối từ", ja: "文立て" },
  sentence_expand: { label: "Mở rộng", ja: "文拡大" },
  sentence_repair: { label: "Sửa câu", ja: "文修理" },
};

export default function BuilderPage() {
  const [subMode, setSubMode] = usePersistedState<BuilderSubMode>("speaking_builder_submode", "mixed");
  const [focusSkill, setFocusSkill] = usePersistedState<BuilderSkill>("speaking_builder_skill", "te_chain");
  const [relation, setRelation] = usePersistedState<BuilderRelation>("speaking_builder_relation", "casual_friend");
  const [scaffold, setScaffold] = usePersistedState<BuilderScaffold>("speaking_builder_scaffold", "keyword_hint");
  const [startTrigger, setStartTrigger] = usePersistedState<"manual" | "auto">(
    "speaking_builder_trigger",
    "manual"
  );
  const [autoNext, setAutoNext] = usePersistedState<boolean>("speaking_builder_autonext", true);
  const [duration, setDuration] = usePersistedState<0 | 3 | 5 | 10 | 20>("speaking_builder_duration", 0);
  const [subtitleMode, setSubtitleMode] = usePersistedState<"hidden" | "japanese" | "japanese_reading" | "vietnamese">(
    "speaking_builder_subtitle",
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

  const session = useBuilderSession({ subMode, focusSkill, relation, scaffold, startTrigger, autoNext });
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

  const playPromptAudio = useCallback(() => {
    const text = ex?.starter || [...(ex?.keywords || [])].join("、") || ex?.sourceSentence || "";
    if (!text) return;
    try {
      speakJapaneseText(text, { rate: 0.95 });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex]);

  const handleDirectSubmit = useCallback(
    async (allowEmpty = false) => {
      const text = transcriptInput.trim() || session.assembledText.trim() || session.liveTranscript.trim();
      if (!text && !allowEmpty) return;
      setTranscriptInput("");
      session.setAssembledText("");
      soundFX.playTaiko();
      await session.submitManual(text);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transcriptInput, session.assembledText, session.liveTranscript]
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
      if (matchesAction(e, "openKeybindingsModal") || matchesAction(e, "builderToggleHelp")) {
        e.preventDefault();
        setShowHelp((v) => !v);
      } else if (matchesAction(e, "builderOpenCheatsheet")) {
        e.preventDefault();
        soundFX.playFurin();
        setShowCheatsheet((v) => !v);
      } else if (matchesAction(e, "builderRetry") && (isResult || isAnswering)) {
        e.preventDefault();
        session.retry();
      } else if (matchesAction(e, "builderSkip") && (isAnswering || isResult || isPrompt)) {
        e.preventDefault();
        session.skip();
      } else if (e.key.toLowerCase() === "h" && !e.ctrlKey && !e.metaKey && !e.altKey && !isEvaluating) {
        e.preventDefault();
        soundFX.playTaiko();
        session.setHintTier(((session.hintTier % 4) + 1) as 1 | 2 | 3 | 4);
      } else if (matchesAction(e, "builderListenPrompt") && ex) {
        e.preventDefault();
        playPromptAudio();
      } else if (matchesAction(e, "builderReplayModel") && ex) {
        e.preventDefault();
      } else if (matchesAction(e, "builderPauseOrResume") && isAnswering) {
        e.preventDefault();
        session.togglePause();
      } else if (matchesAction(e, "builderSubmitOrNext")) {
        if (isReady) {
          e.preventDefault();
          session.startAnsweringNow();
        } else if (isAnswering) {
          const text = transcriptInput.trim() || session.assembledText.trim() || session.liveTranscript.trim();
          if (text) {
            e.preventDefault();
            void handleDirectSubmit(true);
          }
        } else if (isResult) {
          e.preventDefault();
          session.startNext();
        }
      } else if (matchesAction(e, "builderStartVoice")) {
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
        session.setAssembledText("");
      } else if (e.key === "Escape") {
        if (showCheatsheet) setShowCheatsheet(false);
        else if (showHelp) setShowHelp(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isReady, isAnswering, isResult, isPrompt, transcriptInput, session.assembledText, session.hintTier, showCheatsheet, showHelp]);

  const furiganaMode =
    subtitleMode === "hidden" ? "hidden" : subtitleMode === "japanese" ? "kanji" : "kanji_reading";
  const modeInfo = SUB_MODE_LABEL[ex?.subMode || subMode] || SUB_MODE_LABEL.mixed;

  if (!inSession && (phase as string) !== "summary" && !showSummary) {
    return (
      <div className="w-full h-full min-h-0 flex items-center justify-center p-6">
        <ZenLoadingState
          variant="studio"
          title="Đang Khởi Tạo Bài Tập Xây Câu..."
          ja="文立て演習開始中..."
          description="Sensei AI đang chuẩn bị từ khóa và khung nối câu phù hợp với bạn..."
        />
      </div>
    );
  }

  const isAssemble = (ex?.subMode || "") === "sentence_assemble";

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
          label: `${focusSkill} · ${scaffold === "none" ? "Blind" : scaffold}`,
          onClick: () => setShowCheatsheet(true),
        }}
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
            title="Bỏ qua cache & gọi AI sinh bài tập Xây câu mới theo chuyên đề (Alt+R)"
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
            <BuilderSummary
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
              title="AI Đang Soạn Bài Xây Câu..."
              ja="文立て問題生成中..."
              description="AI đang chọn từ khóa, starter và kỹ năng nối phù hợp với trình độ của bạn..."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 lg:gap-3 h-full min-h-0">
            {/* COL 1 (4 cols): Task Card, Vietnamese Prompt & Vocabulary */}
            <div className="lg:col-span-4 h-full min-h-0 overflow-hidden flex flex-col">
              <BuilderTaskCard
                exercise={session.exercise}
                currentTaskIndex={session.stats.total}
                onNextTask={() => session.startNext()}
                isGeneratingNext={session.isRegeneratingAI || isEvaluating}
                onRegenerateWithAI={async () => {
                  soundFX.playTaiko();
                  await session.regenerateWithAI();
                  setTranscriptInput("");
                }}
                isRegeneratingAI={session.isRegeneratingAI}
                onPlayPrompt={playPromptAudio}
                onInsertVocab={(term) => {
                  session.setAssembledText((prev) => {
                    const next = prev ? `${prev}${term}` : term;
                    setTranscriptInput(next);
                    return next;
                  });
                }}
              />
            </div>

            {/* COL 2 (5 cols): Interactive Sentence Builder Board & Progressive Hints */}
            <div className="lg:col-span-5 h-full min-h-0 overflow-hidden flex flex-col">
              <BuilderInteractiveBoard
                exercise={session.exercise}
                assembledText={session.assembledText || transcriptInput}
                onAssembledTextChange={(text) => {
                  session.setAssembledText(text);
                  setTranscriptInput(text);
                }}
                hintTier={session.hintTier}
                onSelectHintTier={(tier) => session.setHintTier(tier)}
              />
            </div>

            {/* COL 3 (3 cols): Studio Speaking Controller OR Result Card */}
            <div className="lg:col-span-3 h-full min-h-0 overflow-hidden flex flex-col">
              {phase === "result" && session.result ? (
                <BuilderResultCard
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
                      : "idle"
                  }
                  liveTranscript={session.liveTranscript}
                  onStartRecord={() => {
                    if (isReady) session.startAnsweringNow();
                    else if (isPrompt) session.rushToAnswer();
                    else session.startAnsweringNow();
                  }}
                  onStopRecord={() => {
                    const text = transcriptInput.trim() || session.assembledText.trim() || session.liveTranscript.trim();
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
                    session.setAssembledText("");
                  }}
                  isWhisperMode={session.isWhisperMode}
                  onToggleWhisperMode={() => session.toggleWhisperMode?.()}
                  volumeLevel={session.volumeLevel}
                  textInput={transcriptInput || session.assembledText}
                  onTextInputChange={(val) => {
                    setTranscriptInput(val);
                    session.setAssembledText(val);
                  }}
                  placeholder="Nói hoặc gõ câu tiếng Nhật..."
                  promptSpeakerLabel={modeInfo.label}
                  onPlayPrompt={playPromptAudio}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <div className="h-7 shrink-0 border-t border-border/60 dark:border-white/10 flex items-center justify-between text-[11px] text-muted-foreground px-1">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.builderStartVoice)} / {formatKeyDisplay(keybindings.builderSubmitOrNext)}</kbd> Thu âm / Nộp</span>
          <span className="hidden sm:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">H</kbd> Gợi ý ({session.hintTier}/4)</span>
          <span className="hidden sm:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">R</kbd> Bài tiếp theo</span>
          <span className="hidden md:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">L</kbd> Nghe đề</span>
          <span className="hidden sm:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">P</kbd> Tạm dừng</span>
          <span className="hidden lg:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">Alt+R</kbd> ✨ Đổi bài AI</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="whitespace-nowrap"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">C</kbd> Cẩm nang</span>
          <span className="whitespace-nowrap"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">?</kbd> Phím tắt</span>
          <span className="whitespace-nowrap"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">Esc</kbd> Thoát</span>
        </div>
      </div>

      <BuilderCheatsheetModal isOpen={showCheatsheet} onClose={() => setShowCheatsheet(false)} />
      <GlobalKeybindingsModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
