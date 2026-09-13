"use client";

import React from "react";
import {
  Clock,
  Zap,
  Volume2,
  Sparkles,
  Activity,
  Mic,
  Play,
  CheckCircle2,
  SkipForward,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ZenLoadingState } from "@/components/ui/zen-loading-state";
import { ZenUnifiedInputBar } from "@/components/ui/zen-unified-input-bar";
import { CombatCapsuleHUD } from "./CombatCapsuleHUD";
import { ReflexTimer } from "./ReflexTimer";
import { ReflexPromptCard } from "./ReflexPromptCard";
import { ReflexResultCard } from "./ReflexResultCard";
import { ReflexSessionSummary } from "./ReflexSessionSummary";
import { DEDICATED_MODES } from "./ReflexLobby";
import { useReflexFilters } from "../hooks/useReflexFilters";
import { useReflexSession } from "../hooks/useReflexSession";
import { formatKeyDisplay } from "@/hooks/use-system-keybindings";
import { stopWebSpeech } from "@/features/speaking/services/web-speech";
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
            ? "Ngẫu nhiên 80+ cặp"
            : `${filters.selectedKeigoCategories.length} Kính ngữ`,
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
              onToPlan={() => (window.location.href = "/learning")}
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

            {/* COLUMN 2: Model Answer & Result Deck (5 cols ~ 41.7%) - ALWAYS VISIBLE FROM START */}
            <div className="lg:col-span-5 h-full min-h-0 relative">
              <ReflexResultCard
                key={`${session.result?.exerciseId || (activeExercise as any)?.id || "res"}_${session.stats.total}`}
                result={session.result}
                exercise={activeExercise as any}
                isPending={!isResult || !session.result}
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
            </div>

            {/* COLUMN 3: Compact Mic & Action Deck (3 cols ~ 25.0%) */}
            <div className="lg:col-span-3 h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl p-3.5 sm:p-4 relative overflow-hidden shadow-lg">
              {/* Ambient Glow */}
              <div className="absolute bottom-[-30px] right-[-30px] w-40 h-40 bg-primary/10 blur-3xl rounded-full pointer-events-none -z-10" />

              {/* Status Header */}
              <div className="flex items-center justify-between gap-2 shrink-0 pb-2 border-b border-border/60 dark:border-white/10">
                <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 whitespace-nowrap shrink-0">
                  {isWaiting ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                      <span className="text-amber-500">NÓI VÀO MIC!</span>
                    </>
                  ) : isRecording ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-rose-500">ĐANG THU ÂM...</span>
                    </>
                  ) : isPromptPlaying ? (
                    <>
                      <Volume2 className="h-3.5 w-3.5 text-primary animate-pulse" />
                      <span className="text-primary">ĐANG ĐỌC ĐỀ...</span>
                    </>
                  ) : isReady ? (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-primary">SẴN SÀNG</span>
                    </>
                  ) : isEvaluating ? (
                    <>
                      <Activity className="h-3.5 w-3.5 text-primary animate-spin" />
                      <span className="text-primary">CHẤM ĐIỂM...</span>
                    </>
                  ) : isResult ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-500">HOÀN THÀNH</span>
                    </>
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
                    title={
                      session.isWhisperMode
                        ? "Chế độ Giọng Nhỏ (Whisper Mode) ĐANG BẬT: Khuếch đại x3.5, VAD siêu nhạy. Bấm để tắt."
                        : "Bật Chế độ Giọng Nhỏ (Whisper Mode): Tăng nhạy cho người nói nhỏ hoặc thì thầm"
                    }
                  >
                    <Zap className={cn("h-2.5 w-2.5 shrink-0", session.isWhisperMode ? "text-amber-500 fill-amber-500" : "text-muted-foreground")} />
                    <span>{session.isWhisperMode ? "Whisper x3.5" : "Giọng nhỏ"}</span>
                  </button>

                  <Badge variant="outline" size="sm" className="text-[9px] font-mono border-white/15 bg-white/5 text-primary rounded-full px-1.5 py-0 whitespace-nowrap shrink-0">
                    Live
                  </Badge>
                </div>
              </div>

              {/* Compact Visualizer & Speech Preview */}
              <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-2 space-y-3">
                {/* Dynamic Mini Soundwaves (7 bars) */}
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

                {/* Compact Live Speech Recognition Bubble */}
                <div className="w-full p-2.5 rounded-2xl bg-muted/40 dark:bg-black/30 border border-border/80 dark:border-white/10 backdrop-blur-md text-center space-y-1 shadow-inner">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
                    <Mic className="h-3 w-3 text-primary" />
                    <span>Giọng bạn:</span>
                    {session.speech.interimTranscript && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    )}
                  </div>
                  <div className="text-xs sm:text-sm font-black font-jp text-foreground min-h-[1.5rem] flex items-center justify-center px-1">
                    {session.speech.interimTranscript || session.speech.transcript ? (
                      <span className="line-clamp-2">“{session.speech.interimTranscript || session.speech.transcript}”</span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground font-sans font-normal italic">
                        {isWaiting
                          ? "Nói to vào mic..."
                          : isReady
                          ? "Bấm [Space] để bắt đầu"
                          : isResult
                          ? "Đã có kết quả ở Cột 2"
                          : "Chờ sẵn sàng..."}
                      </span>
                    )}
                  </div>
                </div>

                {/* Compact Action Buttons */}
                <div className="flex flex-col gap-1.5 w-full">
                  {isReady && (
                    <Button
                      size="sm"
                      className="w-full font-black text-xs h-10 rounded-xl shadow-md bg-gradient-to-r from-blue-600 via-primary to-indigo-600 text-white cursor-pointer ring-1 ring-primary/40 gap-1.5"
                      onClick={() => session.startQuestionNow()}
                    >
                      <Mic className="h-3.5 w-3.5" />
                      <span>Bắt Đầu Nói ({formatKeyDisplay(keybindings.drillStartQuestion)})</span>
                    </Button>
                  )}

                  {isPromptPlaying && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full font-bold text-xs h-9 rounded-xl border-primary/40 text-primary hover:bg-primary/10 cursor-pointer gap-1.5"
                      onClick={() => {
                        stopWebSpeech();
                        session.startQuestionNow();
                      }}
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Nói Ngay ({formatKeyDisplay(keybindings.drillStartQuestion)})</span>
                    </Button>
                  )}

                  {(isWaiting || isRecording) && (
                    <div className="grid grid-cols-1 gap-1.5 w-full">
                      <Button
                        size="sm"
                        variant="akane"
                        className="w-full font-bold text-xs h-9 rounded-xl shadow-xs gap-1.5 cursor-pointer bg-gradient-to-r from-blue-600 to-primary text-white whitespace-nowrap"
                        onClick={() => handleDirectSubmit(true)}
                        title="Nộp câu trả lời ngay để AI chấm điểm (Enter)"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span>Nộp câu này (Enter)</span>
                      </Button>

                      <div className="grid grid-cols-2 gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="font-bold text-[11px] h-8 px-2 rounded-xl border-amber-500/40 text-amber-500 hover:bg-amber-500/10 gap-1 cursor-pointer whitespace-nowrap justify-center"
                          onClick={() => session.togglePause()}
                          title="Tạm dừng đồng hồ"
                        >
                          <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                          <span>{session.isPaused ? "Tiếp Tục" : "Tạm Dừng"}</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="font-bold text-[11px] h-8 px-2 rounded-xl border-border text-foreground hover:bg-muted gap-1 cursor-pointer flex-1 justify-center whitespace-nowrap"
                          onClick={() => {
                            stopWebSpeech();
                            session.skip();
                          }}
                          title="Bỏ qua và chuyển sang bài tiếp theo không cần nộp bài (Phím →)"
                        >
                          <span>Qua bài</span>
                          <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                          <kbd className="text-[9px] font-mono px-1 rounded bg-muted border border-border text-muted-foreground font-bold">→</kbd>
                        </Button>
                      </div>
                    </div>
                  )}

                  {isResult && (
                    <div className="grid grid-cols-1 gap-1.5 w-full">
                      <Button
                        size="sm"
                        variant="akane"
                        className="w-full font-black text-xs h-9 rounded-xl gap-1 bg-gradient-to-r from-blue-600 via-primary to-indigo-600 text-white cursor-pointer shadow-sm"
                        onClick={() => {
                          stopWebSpeech();
                          session.startNext();
                        }}
                      >
                        <span>Câu Tiếp Theo</span>
                        <kbd className="text-[9px] font-mono px-1 rounded bg-black/20 text-white font-bold">Space</kbd>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full font-bold text-[11px] h-8 rounded-xl border-border cursor-pointer gap-1"
                        onClick={() => {
                          stopWebSpeech();
                          session.retry();
                        }}
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Làm lại câu này (R)</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Compact Unified Input Bar */}
              <div className="shrink-0 pt-2 border-t border-border/60 dark:border-white/10">
                <ZenUnifiedInputBar
                  value={transcriptInput || session.speech.transcript || session.speech.interimTranscript}
                  onChange={setTranscriptInput}
                  onSubmit={() => handleDirectSubmit(true)}
                  placeholder={
                    session.isPaused
                      ? "Đang tạm dừng..."
                      : isWaiting
                      ? "Nói hoặc gõ tiếng Nhật..."
                      : isResult
                      ? "Nhấn Space sang câu mới..."
                      : "Gõ câu tiếng Nhật..."
                  }
                  submitButtonText="Nộp"
                  isEvaluating={isEvaluating}
                  showOfficeBadge={false}
                  hintText={isRecording ? "Đang thu âm mic" : undefined}
                />
              </div>
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
