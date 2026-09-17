"use client";

import React, { useState, useEffect } from "react";
import {
  Mic,
  Send,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Sparkles,
  Loader2,
  Keyboard,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";

export interface BuilderSpeakingControllerProps {
  status: "idle" | "ready" | "prompt" | "recording" | "processing";
  isListening: boolean;
  liveTranscript: string;
  durationMs?: number;
  volumeLevel?: number;
  isEvaluating: boolean;
  pendingText?: string | null;
  onStartRecord: () => void;
  onStopRecord: () => void;
  onConfirmSubmit?: () => void;
  onReRecord?: () => void;
  onResetLiveTranscript?: () => void;
  onSubmitTextFallback?: (text: string) => void;
  className?: string;
}

export function BuilderSpeakingController({
  status,
  isListening,
  liveTranscript,
  durationMs = 0,
  volumeLevel = 0.05,
  isEvaluating,
  pendingText,
  onStartRecord,
  onStopRecord,
  onConfirmSubmit,
  onReRecord,
  onResetLiveTranscript,
  onSubmitTextFallback,
  className,
}: BuilderSpeakingControllerProps) {
  const [showFallbackText, setShowFallbackText] = useState(false);
  const [textInput, setTextInput] = useState("");

  const isRecording = status === "recording" || isListening;
  const hasPendingReview = Boolean(pendingText && !isRecording && !isEvaluating);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    onSubmitTextFallback?.(textInput.trim());
    setTextInput("");
    setShowFallbackText(false);
  };

  // Keyboard shortcut listener: Enter to submit pending, Z / Backspace to clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (e.code === "Enter" && hasPendingReview) {
        e.preventDefault();
        soundFX.playSuikinkutsu();
        onConfirmSubmit?.();
      } else if (
        (e.code === "KeyZ" || e.code === "Backspace" || e.code === "Delete") &&
        hasPendingReview
      ) {
        e.preventDefault();
        onResetLiveTranscript?.();
        soundFX.playFurin();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasPendingReview, onConfirmSubmit, onResetLiveTranscript]);

  return (
    <div
      className={cn(
        "h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl p-3.5 sm:p-4 shadow-lg relative overflow-hidden gap-2.5",
        className
      )}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-2 rounded-full",
              isEvaluating
                ? "bg-amber-500 animate-ping"
                : isRecording
                ? "bg-rose-500 animate-pulse"
                : hasPendingReview
                ? "bg-primary animate-pulse"
                : "bg-muted-foreground/50"
            )}
          />
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {isEvaluating
              ? "AI đang chấm điểm & phân tích"
              : isRecording
              ? "Đang thu âm câu nói [Space]"
              : hasPendingReview
              ? "Kiểm tra câu trước khi nộp"
              : "Phòng thu giọng nói"}
          </span>
        </div>

        <Badge variant="outline" className="text-[10px] font-mono border-border/60 text-muted-foreground">
          {isRecording ? "Live STT" : "Direct Mic"}
        </Badge>
      </div>

      {/* Central Voice Arena */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto space-y-3 py-1">
        {/* 1. Dedicated AI Evaluating Loading View */}
        {isEvaluating ? (
          <div className="w-full p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-amber-500/10 to-primary/5 border border-primary/40 shadow-lg flex flex-col items-center justify-center animate-in fade-in-0 zoom-in-95 duration-200 text-center space-y-2.5">
            <div className="relative">
              <div className="absolute -inset-2.5 rounded-full bg-primary/20 blur-md animate-pulse" />
              <div className="relative size-12 rounded-2xl bg-card border border-primary/40 flex items-center justify-center shadow-md">
                <Loader2 className="size-6 text-primary animate-spin" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground flex items-center justify-center gap-1.5">
                <Sparkles className="size-3.5 text-amber-500 fill-amber-500 animate-pulse" />
                <span>AI đang chấm điểm câu ghép...</span>
              </h3>
              <p className="text-[11px] text-muted-foreground max-w-xs leading-relaxed">
                Đang kiểm tra từ khóa, trợ từ, liên từ nối và độ tự nhiên bản xứ.
              </p>
            </div>

            <div className="w-36 h-1.5 bg-muted/80 rounded-full overflow-hidden relative">
              <div className="h-full bg-gradient-to-r from-primary via-amber-500 to-primary rounded-full w-full animate-pulse" />
            </div>

            <span className="text-[10px] font-mono text-muted-foreground">
              Đang phân tích phản xạ...
            </span>
          </div>
        ) : hasPendingReview ? (
          /* 2. Review & Submit Card (Kiểm tra câu trước khi nộp) */
          <div className="w-full p-3.5 rounded-2xl bg-card border-2 border-primary/40 shadow-md animate-in fade-in-0 slide-in-from-bottom-2 duration-200 space-y-2.5">
            <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Câu nói đã ghi nhận:</span>
              </div>
              <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary">
                Sẵn sàng nộp
              </Badge>
            </div>

            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70 font-jp text-sm sm:text-base font-bold text-foreground leading-relaxed text-center select-text cursor-text">
              <UniversalFurigana text={pendingText || ""} fontSize="normal" />
            </div>

            <div className="flex items-center justify-between gap-1.5 pt-1">
              {onResetLiveTranscript && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onResetLiveTranscript}
                  className="rounded-xl text-xs font-semibold gap-1 text-red-500 border-red-500/30 hover:bg-red-500/10 h-8 px-2.5"
                  title="Xoá câu này [Z]"
                >
                  <Trash2 className="size-3.5" />
                  <span>Xoá [Z]</span>
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onReRecord || onStartRecord}
                className="rounded-xl text-xs font-semibold gap-1 border-border/80 hover:bg-muted h-8 px-2.5"
                title="Thu âm lại câu này [Space]"
              >
                <RotateCcw className="size-3.5 text-muted-foreground" />
                <span>Thu lại</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={onConfirmSubmit}
                disabled={!pendingText?.trim()}
                className="rounded-xl text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/25 h-8 px-3 flex-1"
                title="Nộp bài cho AI chấm điểm [Enter]"
              >
                <Send className="size-3.5" />
                <span>Nộp bài [Enter]</span>
              </Button>
            </div>
          </div>
        ) : (
          /* 3. Normal Recording / Idle Arena */
          <>
            <div className="relative flex flex-col items-center">
              {isRecording && (
                <div className="absolute inset-0 -m-3 rounded-full bg-rose-500/20 animate-ping pointer-events-none" />
              )}

              <button
                type="button"
                onClick={isRecording ? onStopRecord : onStartRecord}
                disabled={isEvaluating}
                className={cn(
                  "size-20 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-xl cursor-pointer select-none",
                  isRecording
                    ? "bg-rose-500 text-white shadow-rose-500/40 scale-105"
                    : "bg-primary text-primary-foreground shadow-primary/30 hover:scale-105 active:scale-95"
                )}
                title={isRecording ? "Dừng nói [Space]" : "Bắt đầu nói [Space]"}
              >
                <Mic className={cn("size-8", isRecording && "animate-pulse")} />
                <span className="text-[10px] font-mono font-bold mt-0.5">
                  {isRecording ? "Dừng" : "Nói [Space]"}
                </span>
              </button>
            </div>

            {/* Simulated/reactive Waveform */}
            {isRecording && (
              <div className="flex items-center justify-center gap-1 h-8 animate-in fade-in-0">
                {[4, 8, 14, 20, 12, 18, 24, 16, 10, 15, 22, 12, 6, 14, 8].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 bg-rose-500 rounded-full transition-all duration-150"
                    style={{
                      height: `${Math.max(4, Math.min(32, h * (1 + volumeLevel * 3)))}px`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Live Transcript subtitle bubble */}
            {liveTranscript ? (
              <div className="w-full p-2.5 rounded-2xl bg-primary/5 border border-primary/20 text-center animate-in fade-in-0 slide-in-from-bottom-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-primary">
                    Phụ đề trực tiếp:
                  </span>
                  {isRecording && onResetLiveTranscript && (
                    <button
                      type="button"
                      onClick={onResetLiveTranscript}
                      className="text-[9px] px-1.5 py-0.5 rounded font-semibold text-muted-foreground hover:text-red-500 hover:bg-red-500/10 flex items-center gap-0.5"
                      title="Xoá câu vừa nói"
                    >
                      <RotateCcw className="size-2" />
                      <span>Xoá [Backspace]</span>
                    </button>
                  )}
                </div>
                <p className="font-jp text-sm font-semibold text-foreground leading-snug">
                  "{liveTranscript}"
                </p>
              </div>
            ) : !isRecording ? (
              <p className="text-[11px] text-muted-foreground text-center max-w-xs leading-relaxed">
                Nói to, rõ ràng cả câu tiếng Nhật ngay khi sẵn sàng [Space].
              </p>
            ) : (
              <p className="text-[11px] text-rose-500 dark:text-rose-400 text-center font-mono animate-pulse">
                Đang lắng nghe... [Space] khi nói xong.
              </p>
            )}
          </>
        )}
      </div>

      {/* Fallback Text Input Drawer */}
      {showFallbackText && (
        <form
          onSubmit={handleTextSubmit}
          className="p-3 rounded-2xl bg-muted/40 border border-border/80 space-y-2 animate-in fade-in-0 duration-150"
        >
          <div className="flex gap-2">
            <textarea
              value={textInput}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTextInput(e.target.value)}
              placeholder="Nhập câu tiếng Nhật bạn định nói..."
              rows={1}
              disabled={isEvaluating}
              className="w-full rounded-xl text-xs resize-none bg-background min-h-[36px] font-jp p-2 border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!textInput.trim() || isEvaluating}
              className="h-9 px-3 rounded-xl font-bold text-xs gap-1 shrink-0"
            >
              <Send className="size-3.5" />
              <span>Nộp</span>
            </Button>
          </div>
        </form>
      )}

      {/* Bottom Auxiliary Tools */}
      <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs shrink-0">
        <Button
          variant="ghost"
          size="sm"
          disabled={isEvaluating}
          onClick={() => setShowFallbackText(!showFallbackText)}
          className="h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1 px-2.5 rounded-lg"
        >
          <Keyboard className="size-3.5" />
          <span>{showFallbackText ? "Đóng nhập phím" : "Nhập phím (Dự phòng)"}</span>
        </Button>

        <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
          [Space] Thu/Dừng • [Enter] Nộp • [Z] Xoá
        </span>
      </div>
    </div>
  );
}
