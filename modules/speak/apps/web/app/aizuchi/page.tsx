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
  RefreshCw,
} from "lucide-react";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useAizuchiSession } from "@/features/aizuchi/hooks/useAizuchiSession";
import { ReflexTimer as AizuchiTimerBar } from "@/features/reflex/components/ReflexTimer";
import { CombatCapsuleHUD } from "@/features/reflex/components/CombatCapsuleHUD";
import { StudioSpeakingController } from "@/features/reflex/components/StudioSpeakingController";
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
          onOpenCheatsheet={() => setShowCheatsheet(true)}
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
            title="Bỏ qua cache & gọi AI sinh bài tập Aizuchi mới theo chuyên đề (Alt+R)"
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

            {/* COL 3: Studio Speaking Controller (Chuẩn EnglishSpeaking Ergonomics) */}
            <div className="lg:col-span-3 h-full min-h-0">
              <StudioSpeakingController
                phase={
                  isEvaluating
                    ? "evaluating"
                    : capturing
                    ? "recording"
                    : isPromptPlaying
                    ? "prompt_playing"
                    : isReady
                    ? "ready"
                    : isResult
                    ? "result"
                    : "idle"
                }
                liveTranscript={session.liveTranscript}
                onStartRecord={() => {
                  if (isReady) session.startAizuchiNow();
                  else if (isPromptPlaying) session.rushToWindow();
                  else if (isResult) session.startNext();
                  else session.startAizuchiNow();
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
                placeholder="Nói phản hồi (へー、なるほど...) hoặc gõ..."
                promptSpeakerLabel="NPC"
                onPlayPrompt={playPromptAudio}
              />
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
          <span className="hidden lg:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">Alt+R</kbd> ✨ Đổi bài AI</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="whitespace-nowrap"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">C</kbd> Cẩm nang</span>
          <span className="whitespace-nowrap"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">?</kbd> Phím tắt</span>
          <span className="whitespace-nowrap"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">Esc</kbd> Thoát</span>
        </div>
      </div>

      <AizuchiCheatsheetModal isOpen={showCheatsheet} onClose={() => setShowCheatsheet(false)} />
      <GlobalKeybindingsModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
