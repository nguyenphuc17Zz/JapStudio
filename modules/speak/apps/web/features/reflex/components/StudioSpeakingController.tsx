"use client";

import React, { useState, useEffect } from "react";
import {
  Mic,
  Volume2,
  Sparkles,
  Send,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Zap,
  Play,
  Activity,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZenUnifiedInputBar } from "@/components/ui/zen-unified-input-bar";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";

export interface StudioSpeakingControllerProps {
  phase: "idle" | "ready" | "prompt_playing" | "recording" | "evaluating" | "result";
  liveTranscript: string;
  onStartRecord: () => void;
  onStopRecord?: () => void;
  onSubmit: (text?: string) => void;
  onRetry?: () => void;
  onNext?: () => void;
  onSkip?: () => void;
  onResetTranscript?: () => void;
  isWhisperMode?: boolean;
  onToggleWhisperMode?: () => void;
  volumeLevel?: number;
  textInput: string;
  onTextInputChange: (val: string) => void;
  placeholder?: string;
  promptSpeakerLabel?: string;
  onPlayPrompt?: () => void;
  compact?: boolean;
  className?: string;
}

export function StudioSpeakingController({
  phase,
  liveTranscript,
  onStartRecord,
  onStopRecord,
  onSubmit,
  onRetry,
  onNext,
  onSkip,
  onResetTranscript,
  isWhisperMode,
  onToggleWhisperMode,
  volumeLevel = 0.05,
  textInput,
  onTextInputChange,
  placeholder = "Nói vào micro hoặc gõ câu trả lời tiếng Nhật...",
  promptSpeakerLabel = "NPC",
  onPlayPrompt,
  compact = false,
  className,
}: StudioSpeakingControllerProps) {
  const isRecording = phase === "recording";
  const isEvaluating = phase === "evaluating";
  const isReady = phase === "ready";
  const isPromptPlaying = phase === "prompt_playing";
  const isResult = phase === "result";

  // Pending Review: User has spoken something, but not currently recording or evaluating
  const pendingText = liveTranscript.trim() || textInput.trim();
  const hasPendingReview = Boolean(
    pendingText && !isRecording && !isEvaluating && !isResult && !isPromptPlaying
  );

  // Keyboard shortcut: Enter to submit pending, Backspace/Z to reset, Space to start
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (e.key === "Enter" && hasPendingReview) {
        e.preventDefault();
        soundFX.playSuikinkutsu();
        onSubmit(pendingText);
      } else if ((e.key === "z" || e.key === "Z" || e.key === "Backspace") && hasPendingReview) {
        e.preventDefault();
        onResetTranscript?.();
        onTextInputChange("");
        soundFX.playFurin();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasPendingReview, pendingText, onSubmit, onResetTranscript, onTextInputChange]);

  return (
    <div
      className={cn(
        "h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl p-3.5 sm:p-4 relative overflow-hidden shadow-lg",
        className
      )}
    >
      {/* Ambient Glow */}
      <div className="absolute bottom-[-30px] right-[-30px] w-40 h-40 bg-primary/10 blur-3xl rounded-full pointer-events-none -z-10" />

      {/* 1. Header: Status Indicator + Whisper Mode Toggle */}
      <div className="flex items-center justify-between gap-2 shrink-0 pb-2 border-b border-border/60 dark:border-white/10">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              "h-2 w-2 rounded-full shrink-0",
              isEvaluating
                ? "bg-amber-500 animate-ping"
                : isRecording
                ? "bg-rose-500 animate-pulse"
                : hasPendingReview
                ? "bg-emerald-500 animate-pulse"
                : isPromptPlaying
                ? "bg-primary animate-pulse"
                : isResult
                ? "bg-emerald-500"
                : "bg-muted-foreground/50"
            )}
          />
          <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground truncate">
            {isEvaluating ? (
              <span className="text-primary">AI Đang Chấm Điểm...</span>
            ) : isRecording ? (
              <span className="text-rose-500">Đang Thu Âm Phản Xạ...</span>
            ) : hasPendingReview ? (
              <span className="text-emerald-600 dark:text-emerald-400">Kiểm Tra Câu Trước Khi Nộp</span>
            ) : isPromptPlaying ? (
              <span className="text-primary">{promptSpeakerLabel} Đang Nói...</span>
            ) : isReady ? (
              <span className="text-primary">Sẵn Sàng</span>
            ) : isResult ? (
              <span className="text-emerald-500">Đã Hoàn Thành</span>
            ) : (
              <span>Trạm Thu Âm</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onToggleWhisperMode && (
            <button
              type="button"
              onClick={() => {
                onToggleWhisperMode();
                soundFX.playTaiko();
              }}
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full transition-all flex items-center gap-1 cursor-pointer border whitespace-nowrap shrink-0",
                isWhisperMode
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-500 hover:bg-amber-500/25 ring-1 ring-amber-500/30"
                  : "bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title="Chế độ thu âm giọng thì thầm / giọng nhỏ"
            >
              <Zap className={cn("h-2.5 w-2.5 shrink-0", isWhisperMode ? "text-amber-500 fill-amber-500" : "text-muted-foreground")} />
              <span>{isWhisperMode ? "Whisper x3.5" : "Giọng nhỏ"}</span>
            </button>
          )}

          <Badge
            variant="outline"
            size="sm"
            className="text-[9px] font-mono border-white/15 bg-white/5 text-primary rounded-full px-1.5 py-0 whitespace-nowrap shrink-0"
          >
            Live Studio
          </Badge>
        </div>
      </div>

      {/* 2. Middle Body: Pending Review Card OR Evaluating View OR Normal Mic Arena */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-2 space-y-3">
        {/* CASE A: AI EVALUATING VIEW */}
        {isEvaluating ? (
          <div className="w-full max-w-sm p-4 rounded-2xl space-y-2.5 bg-gradient-to-br from-primary/10 via-amber-500/10 to-primary/5 border border-primary/40 shadow-lg flex flex-col items-center justify-center text-center animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="relative">
              <div className="absolute -inset-2.5 rounded-full bg-primary/20 blur-md animate-pulse" />
              <div className="relative h-12 w-12 rounded-2xl bg-card border border-primary/40 flex items-center justify-center shadow-md">
                <Sparkles className="h-6 w-6 text-primary animate-spin" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center justify-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500 animate-pulse" />
                <span>AI đang chấm điểm & phân tích...</span>
              </h3>
              <p className="text-[11px] text-muted-foreground max-w-xs leading-relaxed">
                Đang kiểm tra ngữ pháp, phản xạ âm thanh và độ tự nhiên tiếng Nhật.
              </p>
            </div>
            <div className="w-36 h-1.5 bg-muted/80 rounded-full overflow-hidden relative">
              <div className="h-full bg-gradient-to-r from-primary via-amber-500 to-primary rounded-full w-full animate-pulse" />
            </div>
          </div>
        ) : hasPendingReview ? (
          /* CASE B: ERGONOMIC REVIEW & SUBMIT CARD (Chuẩn EnglishSpeaking) */
          <div className="w-full max-w-sm p-3.5 rounded-2xl space-y-2.5 bg-card/95 border-2 border-primary/40 shadow-md animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Câu nói đã ghi nhận:</span>
              </div>
              <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary">
                Sẵn sàng nộp
              </Badge>
            </div>

            <div className="p-3 text-sm sm:text-base font-jp font-bold text-foreground leading-relaxed text-center bg-muted/40 rounded-xl border border-border/70 line-clamp-3">
              “{pendingText}”
            </div>

            <div className="flex items-center justify-between gap-1.5 pt-1">
              {onResetTranscript && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onResetTranscript();
                    onTextInputChange("");
                    soundFX.playFurin();
                  }}
                  className="rounded-xl text-xs font-semibold gap-1 text-red-500 border-red-500/30 hover:bg-red-500/10 h-8 px-2.5 cursor-pointer"
                  title="Xoá câu này (Z / Backspace)"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Xoá [Z]</span>
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  soundFX.playFurin();
                  onStartRecord();
                }}
                className="rounded-xl text-xs font-semibold gap-1 border-border/80 hover:bg-muted h-8 px-2.5 cursor-pointer"
                title="Thu âm lại câu này (Space)"
              >
                <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Thu lại</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => {
                  soundFX.playSuikinkutsu();
                  onSubmit(pendingText);
                }}
                disabled={!pendingText.trim()}
                className="rounded-xl text-xs font-bold gap-1.5 bg-gradient-to-r from-blue-600 via-primary to-indigo-600 hover:opacity-95 text-white shadow-md shadow-primary/25 h-8 px-3 flex-1 cursor-pointer"
                title="Nộp bài cho AI chấm điểm (Enter)"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Nộp bài [Enter]</span>
              </Button>
            </div>
          </div>
        ) : (
          /* CASE C: NORMAL RECORDING / IDLE ARENA */
          <>
            {/* Dynamic Soundwaves Visualizer */}
            <div className="flex items-center gap-1 h-10">
              {[0.5, 1.0, 1.5, 1.8, 1.3, 0.9, 0.4].map((scale, i) => {
                const activeMultiplier = isRecording ? (volumeLevel || 0.08) * 50 : 5;
                const height = Math.max(5, Math.min(36, activeMultiplier * scale + 5));
                return (
                  <span
                    key={i}
                    className={cn(
                      "w-1.5 rounded-full transition-all duration-75",
                      isRecording
                        ? "bg-gradient-to-t from-rose-500 to-amber-400 shadow-xs shadow-rose-500/30"
                        : isResult
                        ? "bg-gradient-to-t from-emerald-500 to-teal-400"
                        : "bg-gradient-to-t from-emerald-500 to-primary/60"
                    )}
                    style={{ height: `${height}px` }}
                  />
                );
              })}
            </div>

            {/* Live Speech Recognition Bubble */}
            <div className="w-full p-2.5 rounded-2xl bg-muted/40 dark:bg-black/30 border border-border/80 dark:border-white/10 backdrop-blur-md text-center space-y-1 shadow-inner">
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
                <Mic className="h-3 w-3 text-primary" />
                <span>Giọng bạn:</span>
                {liveTranscript && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                )}
              </div>
              <div className="text-xs sm:text-sm font-black font-jp text-foreground min-h-[1.5rem] flex items-center justify-center px-1">
                {liveTranscript ? (
                  <span className="line-clamp-2">“{liveTranscript}”</span>
                ) : (
                  <span className="text-[11px] text-muted-foreground font-sans font-normal italic">
                    {isRecording
                      ? "Nói to vào mic..."
                      : isReady
                      ? "Bấm nút bắt đầu để thu âm"
                      : isPromptPlaying
                      ? `${promptSpeakerLabel} đang phát âm thanh...`
                      : isResult
                      ? "Đã có kết quả chấm điểm"
                      : "Chờ sẵn sàng..."}
                  </span>
                )}
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col gap-1.5 w-full">
              {isReady && (
                <Button
                  size="sm"
                  className="w-full font-black text-xs h-10 rounded-xl shadow-md bg-gradient-to-r from-blue-600 via-primary to-indigo-600 text-white cursor-pointer ring-1 ring-primary/40 gap-1.5"
                  onClick={() => {
                    soundFX.playFurin();
                    onStartRecord();
                  }}
                >
                  <Mic className="h-3.5 w-3.5" />
                  <span>Bắt Đầu Thu Âm [Space]</span>
                </Button>
              )}

              {isPromptPlaying && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full font-bold text-xs h-9 rounded-xl border-primary/40 text-primary hover:bg-primary/10 cursor-pointer gap-1.5"
                  onClick={() => {
                    onStartRecord();
                  }}
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Nói Ngay [Space]</span>
                </Button>
              )}

              {isRecording && (
                <div className="grid grid-cols-1 gap-1.5 w-full">
                  <Button
                    size="sm"
                    className="w-full font-bold text-xs h-9 rounded-xl shadow-xs gap-1.5 cursor-pointer bg-gradient-to-r from-rose-600 to-amber-600 text-white"
                    onClick={() => {
                      if (onStopRecord) onStopRecord();
                      else onSubmit(liveTranscript);
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Dừng thu âm & nộp câu [Enter]</span>
                  </Button>
                  {onSkip && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full font-bold text-[11px] h-8 rounded-xl border-border/80 text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={onSkip}
                    >
                      Bỏ qua câu này
                    </Button>
                  )}
                </div>
              )}

              {isResult && (
                <div className="grid grid-cols-1 gap-1.5 w-full">
                  {onNext && (
                    <Button
                      size="sm"
                      className="w-full font-bold text-xs h-9 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs cursor-pointer gap-1.5"
                      onClick={() => {
                        soundFX.playSuikinkutsu();
                        onNext();
                      }}
                    >
                      <span>Bài tiếp theo [Enter]</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onRetry && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full font-bold text-[11px] h-8 rounded-xl border-border/80 cursor-pointer gap-1.5"
                      onClick={() => {
                        soundFX.playFurin();
                        onRetry();
                      }}
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Thử lại câu này</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 3. Footer: Unified Input Bar (Text fallback + Quick Send) */}
      <div className="shrink-0 pt-2 border-t border-border/60 dark:border-white/10">
        <ZenUnifiedInputBar
          value={textInput}
          onChange={onTextInputChange}
          onSubmit={() => onSubmit(textInput || liveTranscript)}
          speechTranscript={liveTranscript}
          isRecording={isRecording}
          isEvaluating={isEvaluating}
          placeholder={placeholder}
          submitButtonText="Gửi"
          autoFocus={false}
          hintText="Enter để nộp"
        />
      </div>
    </div>
  );
}
