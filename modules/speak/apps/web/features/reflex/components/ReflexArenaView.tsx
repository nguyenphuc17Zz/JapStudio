"use client";

import React from "react";
import { ZenLoadingState } from "@/components/ui/zen-loading-state";
import { CombatCapsuleHUD } from "./CombatCapsuleHUD";
import { ReflexTimer } from "./ReflexTimer";
import { ReflexPromptCard } from "./ReflexPromptCard";
import { ReflexResultCard } from "./ReflexResultCard";
import { ReflexCoachPanel } from "./ReflexCoachPanel";
import { ReflexSessionSummary } from "./ReflexSessionSummary";
import { StudioSpeakingController } from "./StudioSpeakingController";
import { DEDICATED_MODES } from "./ReflexLobby";
import { useReflexFilters } from "../hooks/useReflexFilters";
import { useReflexSession } from "../hooks/useReflexSession";
import { formatKeyDisplay } from "@/hooks/use-system-keybindings";
import { stopWebSpeech, speakJapaneseText } from "@/features/speaking/services/web-speech";
import { ExerciseSourceBadge } from "@/components/ui/exercise-source-badge";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";

export interface ReflexArenaViewProps {
  session: ReturnType<typeof useReflexSession>;
  subMode: string;
  pressure: "infinite" | "relaxed" | "normal" | "fast" | "reflex" | "extreme";
  setPressure: (p: "infinite" | "relaxed" | "normal" | "fast" | "reflex" | "extreme") => void;
  timerMs: number;
  duration: 0 | 3 | 5 | 10 | 20;
  sessionRemainingSec: number;
  sessionElapsedSec: number;
  subtitleMode: "hidden" | "japanese" | "japanese_reading" | "vietnamese";
  setSubtitleMode: (m: "hidden" | "japanese" | "japanese_reading" | "vietnamese") => void;
  currentStreak: number;
  startTrigger: "manual" | "auto";
  setStartTrigger: React.Dispatch<React.SetStateAction<"manual" | "auto">>;
  autoNext: boolean;
  setAutoNext: React.Dispatch<React.SetStateAction<boolean>>;
  filters: ReturnType<typeof useReflexFilters>;
  keybindings: any;
  showSummary: boolean;
  setShowSummary: (s: boolean) => void;
  transcriptInput: string;
  setTranscriptInput: (t: string) => void;
  handleDirectSubmit: (allowEmpty?: boolean) => Promise<void>;
  playPromptAudio: (autoTransition?: boolean) => void;
  onOpenHelp: () => void;
}

export function ReflexArenaView({
  session,
  subMode,
  pressure,
  setPressure,
  timerMs,
  duration,
  sessionRemainingSec,
  sessionElapsedSec,
  subtitleMode,
  setSubtitleMode,
  currentStreak,
  startTrigger,
  setStartTrigger,
  autoNext,
  setAutoNext,
  filters,
  keybindings,
  showSummary,
  setShowSummary,
  transcriptInput,
  setTranscriptInput,
  handleDirectSubmit,
  playPromptAudio,
  onOpenHelp,
}: ReflexArenaViewProps) {
  const activeExercise = session.exercise;
  const isWaiting = session.phase === "waiting_for_speech";
  const isRecording = session.phase === "recording";
  const isEvaluating = session.phase === "evaluating" || session.phase === "loading";
  const isPromptPlaying = session.phase === "prompt_playing";
  const isReady = session.phase === "ready";
  const isResult = session.phase === "result";

  const subModeInfo = DEDICATED_MODES.find((m) => m.id === subMode);
  const subModeLabel = subMode === "mixed" ? "Tổng Hợp Toàn Diện" : subModeInfo?.title || "Phản Xạ";
  const subModeJa = subModeInfo?.titleJa || "瞬発";

  const filterTrigger =
    (subMode === "reflex_conjugation" || (activeExercise as any)?.exercise_type === "reflex_conjugation")
      ? {
          label: filters.selectedForms.length === 0 ? "50 Thể" : `${filters.selectedForms.length} Thể`,
          onClick: () => filters.setShowFormFilterModal(true),
        }
      : (subMode === "reflex_qna" || (activeExercise as any)?.exercise_type === "reflex_qna")
      ? {
          label: filters.customKeywords.trim()
            ? `💡 "${filters.customKeywords.trim()}"`
            : filters.selectedQnaTopics.length === 0
            ? "Ngẫu nhiên vô tận"
            : `${filters.selectedQnaTopics.length} Chủ đề`,
          onClick: () => filters.setShowQnaTopicFilterModal(true),
        }
      : (subMode === "reflex_transformation" || (activeExercise as any)?.exercise_type === "reflex_transformation")
      ? {
          label: filters.selectedTransformCategories.length === 0
            ? "Ngẫu nhiên 75+ dạng"
            : `${filters.selectedTransformCategories.length} Nhóm`,
          onClick: () => filters.setShowTransformFilterModal(true),
        }
      : (subMode === "reflex_context" || (activeExercise as any)?.exercise_type === "reflex_context")
      ? {
          label: filters.selectedContextCategories.length === 0
            ? "Ngẫu nhiên 60+ tình huống"
            : `${filters.selectedContextCategories.length} Bối cảnh`,
          onClick: () => filters.setShowContextFilterModal(true),
        }
      : (subMode === "reflex_vocabulary" || (activeExercise as any)?.exercise_type === "reflex_vocabulary")
      ? {
          label: filters.customVocabKeywords.trim()
            ? `Từ khóa: "${filters.customVocabKeywords.trim()}"`
            : filters.selectedVocabCategories.length === 0
            ? "Ngẫu nhiên 500+ từ"
            : `${filters.selectedVocabCategories.length} Từ vựng`,
          onClick: () => filters.setShowVocabFilterModal(true),
        }
      : (subMode === "reflex_keigo_vocab" || (activeExercise as any)?.exercise_type === "reflex_keigo_vocab")
      ? {
          label: filters.customKeigoKeywords.trim()
            ? `Kính ngữ: "${filters.customKeigoKeywords.trim()}"`
            : filters.selectedKeigoCategories.length === 0
            ? "Ngẫu nhiên 290 cặp"
            : `${filters.selectedKeigoCategories.length} công thức`,
          onClick: () => filters.setShowKeigoFilterModal(true),
        }
      : undefined;

  return (
    <div className="w-full max-w-[1760px] mx-auto h-full flex flex-col justify-between px-2 sm:px-4 py-2 gap-2 overflow-hidden select-none animate-in fade-in duration-200">
      {/* 1. Combat Capsule HUD */}
      <CombatCapsuleHUD
        questionNumber={session.stats.total + (isResult ? 0 : 1)}
        subModeLabel={subModeLabel}
        subModeJa={subModeJa}
        currentStreak={currentStreak}
        duration={duration}
        sessionRemainingSec={sessionRemainingSec}
        sessionElapsedSec={sessionElapsedSec}
        subtitleMode={subtitleMode}
        setSubtitleMode={setSubtitleMode}
        micGain={session.micGain ?? 2.0}
        setMicGain={(g) => session.setMicGain(g)}
        startTrigger={startTrigger}
        setStartTrigger={setStartTrigger}
        autoNext={autoNext}
        setAutoNext={setAutoNext}
        tier={
          subMode === "reflex_vocabulary" || subMode === "reflex_conjugation" || subMode === "mixed"
            ? (filters.selectedVocabTier ?? 0)
            : undefined
        }
        setTier={(t) => filters.setSelectedVocabTier(t === 0 ? null : t)}
        filterTrigger={filterTrigger}
        onNextTask={() => {
          stopWebSpeech();
          session.startNext();
        }}
        onSubmit={() => {
          stopWebSpeech();
          session.recorder.releaseMicrophone();
          session.speech.stopListening();
          setShowSummary(true);
          session.setPhase("summary" as any);
          soundFX.playVictory();
        }}
        onExit={() => {
          stopWebSpeech();
          session.recorder.releaseMicrophone();
          session.speech.stopListening();
          session.setPhase("idle" as any);
          setShowSummary(false);
        }}
        onOpenHelp={onOpenHelp}
        provenanceBadge={
          activeExercise ? (
            <ExerciseSourceBadge
              source={activeExercise.generationSource || activeExercise.generation_source}
            />
          ) : undefined
        }
      />

      {/* 2. Middle Arena Stage */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {showSummary ? (
          <div className="h-full overflow-y-auto rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl p-4 shadow-xl">
            <ReflexSessionSummary
              results={session.results as any}
              onRestart={() => {
                setShowSummary(false);
                session.startSession();
              }}
              onToPlan={() => (window.location.href = "/dashboard")}
            />
          </div>
        ) : session.phase === "loading" || (!activeExercise && !isResult) ? (
          <div className="h-full flex items-center justify-center rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl shadow-xl p-6">
            <ZenLoadingState
              variant="studio"
              title="AI Đang Chuẩn Bị Câu Hỏi Phản Xạ..."
              ja="瞬発設問生成中..."
              description="AI đang tinh chỉnh câu hỏi ngữ pháp, từ vựng và bối cảnh phù hợp với tốc độ phản xạ của bạn..."
            />
          </div>
        ) : (
          /* 3-COLUMN BALANCED ARENA LAYOUT (4 : 5 : 3 -> 33.3% : 41.7% : 25.0%) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full min-h-0">
            {/* COLUMN 1: Mission Deck & Countdown Laser Timer (4 cols ~ 33.3%) */}
            <div className="lg:col-span-4 h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
              {/* Ambient Top Glow */}
              <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/10 blur-3xl rounded-full pointer-events-none -z-10" />

              {/* Prompt Card (Always stays visible so learner never loses context) */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <ReflexPromptCard
                  exercise={activeExercise as any}
                  subtitleMode={subtitleMode}
                  phase={session.phase}
                  onPlayAudio={playPromptAudio}
                  compact={true}
                />
              </div>

              {/* Bottom: Countdown Laser Bar Timer */}
              <div className="pt-2 shrink-0 border-t border-border/60 dark:border-white/10 space-y-1.5">
                <ReflexTimer
                  variant="laser-bar"
                  remainingMs={session.timer.remainingMs}
                  timerLimitMs={session.timer.totalLimitMs || timerMs}
                  progress={session.timer.progress}
                  state={session.timer.state}
                  isActive={session.timer.isActive}
                  isPaused={session.isPaused}
                />
              </div>
            </div>

            {/* COLUMN 2: AI Coach Suggestions (Pending) OR Result Deck (Finished) (4 cols ~ 33.3%) */}
            <div className="lg:col-span-4 h-full min-h-0 relative">
              {isResult && session.result ? (
                <ReflexResultCard
                  key={`${session.result?.exerciseId || (activeExercise as any)?.id || "res"}_${session.stats.total}`}
                  result={session.result}
                  exercise={activeExercise as any}
                  isPending={false}
                  liveTranscript={session.speech.interimTranscript || session.speech.transcript}
                  onNext={() => session.startNext()}
                  onSkip={() => {
                    stopWebSpeech();
                    session.skip();
                  }}
                  onRetry={() => session.retry()}
                  onSlowMode={() => setPressure("relaxed")}
                  onCancelAutoNext={session.cancelAutoNext}
                />
              ) : (
                <ReflexCoachPanel
                  exercise={activeExercise as any}
                  subMode={subMode}
                  onInsertText={(text) => {
                    setTranscriptInput(text);
                  }}
                  onPlayAudio={(text) => {
                    stopWebSpeech();
                    speakJapaneseText(text, { rate: 0.95 });
                  }}
                />
              )}
            </div>

            {/* COLUMN 3: Studio Speaking Controller (Chuẩn EnglishSpeaking Ergonomics - 4 cols ~ 33.3%) */}
            <div className="lg:col-span-4 h-full min-h-0">
              <StudioSpeakingController
                phase={
                  isEvaluating
                    ? "evaluating"
                    : isRecording || isWaiting
                    ? "recording"
                    : isPromptPlaying
                    ? "prompt_playing"
                    : isReady
                    ? "ready"
                    : isResult
                    ? "result"
                    : "idle"
                }
                liveTranscript={session.speech.interimTranscript || session.speech.transcript}
                onStartRecord={() => {
                  stopWebSpeech();
                  session.startQuestionNow();
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
                  session.speech.resetTranscript();
                }}
                isWhisperMode={session.isWhisperMode}
                onToggleWhisperMode={() => session.toggleWhisperMode?.()}
                volumeLevel={session.volumeLevel}
                textInput={transcriptInput}
                onTextInputChange={setTranscriptInput}
                placeholder={
                  session.isPaused
                    ? "Đang tạm dừng..."
                    : isWaiting
                    ? "Nói hoặc gõ tiếng Nhật..."
                    : isResult
                    ? "Nhấn Space sang câu mới..."
                    : "Gõ câu tiếng Nhật..."
                }
                promptSpeakerLabel="AI"
                onPlayPrompt={() => playPromptAudio(false)}
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Minimal Shortcuts Strip */}
      <div className="h-7 shrink-0 border-t border-border/60 dark:border-white/10 flex items-center justify-between text-[11px] text-muted-foreground px-1">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.reflexStartVoice)} / {formatKeyDisplay(keybindings.reflexSubmitOrNext)}</kbd> Bắt đầu / Nộp</span>
          <span className="hidden sm:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">→</kbd> Qua bài</span>
          <span className="hidden sm:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.reflexRetry)}</kbd> Làm lại</span>
          <span className="hidden md:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.reflexListenPrompt)}</kbd> Nghe đề</span>
          <span className="hidden md:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.reflexReplayModel)}</kbd> Nghe mẫu</span>
          <span className="hidden sm:inline whitespace-nowrap shrink-0"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.reflexPauseOrResume)}</kbd> Tạm dừng</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="whitespace-nowrap"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">{formatKeyDisplay(keybindings.reflexToggleHelp)}</kbd> Phím tắt</span>
          <span className="whitespace-nowrap"><kbd className="px-1 py-0.5 rounded bg-muted/60 border font-mono font-bold">Esc</kbd> Thoát</span>
        </div>
      </div>
    </div>
  );
}
