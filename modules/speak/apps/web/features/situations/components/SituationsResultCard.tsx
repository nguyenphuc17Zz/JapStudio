"use client";

import React, { useState, useEffect } from "react";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Sparkles,
  Volume2,
  Clock,
  Lightbulb,
  Eye,
  EyeOff,
  Mic,
  MessageSquare,
} from "lucide-react";
import { SituationsExercise, SituationsResult } from "../services/situations-api";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";

interface SituationsResultCardProps {
  result: SituationsResult | null;
  exercise?: SituationsExercise | null;
  isPending?: boolean;
  liveTranscript?: string;
  onNext?: () => void;
  onRetry?: () => void;
  onAskCoach?: (prompt: string) => void;
  onCancelAutoNext?: () => void;
  className?: string;
}

export function SituationsResultCard({
  result,
  exercise,
  isPending = false,
  liveTranscript = "",
  onNext,
  onRetry,
  onAskCoach,
  onCancelAutoNext,
  className,
}: SituationsResultCardProps) {
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    setIsRevealed(false);
  }, [exercise?.id]);

  const sc = exercise?.extra_metadata?.situational_config || {};
  const sData = exercise?.situationalData || sc.situational_data || {};
  const canonical = sc.canonical || exercise?.canonical || "";

  // Keyboard shortcut listener:
  // - V: toggle reveal text (when isPending)
  // - A: play model audio (works anytime, even before pressing V when answer is blurred)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (e.key.toLowerCase() === "v" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (isPending) {
          e.preventDefault();
          soundFX.playFurin();
          setIsRevealed((prev) => !prev);
        }
      } else if (e.key.toLowerCase() === "a" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (canonical) {
          soundFX.playFurin();
          speakJapaneseText(canonical, { rate: 1.0 });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPending, canonical]);

  if (!result && !exercise) return null;

  const isPerfect = result?.isPerfect || (result?.score ?? 0) >= 90;
  const isSuccess = result?.success ?? false;
  const isTimeout = result?.timedOut ?? false;
  const score = result?.score ?? 0;
  const latency = result?.reactionLatencyMs ?? 0;
  const isBlurred = isPending && !isRevealed;
  const metrics = result?.metrics || {};
  const culturalTip = result?.culturalTip || sc.cultural_tip || sData.cultural_tip || exercise?.culturalTip || "";

  // Auto-play model answer TTS on result show
  useEffect(() => {
    if (isPending || !canonical || !result) return;

    setIsTTSPlaying(true);
    const timer = setTimeout(() => {
      speakJapaneseText(canonical, {
        rate: 0.95,
        onEnd: () => setIsTTSPlaying(false),
        onError: () => setIsTTSPlaying(false),
      });
    }, 200);

    return () => {
      clearTimeout(timer);
      stopWebSpeech();
    };
  }, [canonical, result?.exerciseId, isPending]);

  const taskCompletion = metrics.task_completion ?? score;
  const pragmatics = metrics.pragmatics ?? 88;
  const fluency = metrics.fluency ?? 85;
  const naturalness = metrics.naturalness ?? 87;

  return (
    <div
      className={cn(
        "p-3.5 sm:p-4 rounded-3xl border border-border/80 bg-card shadow-md washi-texture space-y-2.5 animate-in fade-in zoom-in-95 duration-200",
        className
      )}
    >
      {/* 1. Status, Score & Latency Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs whitespace-nowrap shrink-0",
              isPending
                ? "bg-primary/10 border-primary/25 text-primary"
                : isPerfect
                ? "bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-400"
                : isSuccess
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/20 border-rose-500/40 text-rose-600 dark:text-rose-400"
            )}
          >
            {isPending ? (
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            ) : isPerfect ? (
              <Trophy className="h-3.5 w-3.5 fill-current" />
            ) : isSuccess ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            <span>
              {isPending
                ? "ĐỐI THOẠI MẪU"
                : isPerfect
                ? "XỬ LÝ XUẤT SẮC"
                : isSuccess
                ? "HOÀN THÀNH MỤC TIÊU"
                : isTimeout
                ? "HẾT THỜI GIAN"
                : "CẦN BỔ SUNG"}
            </span>
          </span>

          {!isPending && (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-black border shadow-2xs whitespace-nowrap shrink-0",
                isPerfect
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-400"
                  : isSuccess
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/20 border-rose-500/40 text-rose-600 dark:text-rose-400"
              )}
            >
              <span>{score.toFixed(0)}</span>
              <span className="text-[10px] font-normal opacity-80">/100</span>
            </span>
          )}
        </div>

        {latency ? (
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-foreground whitespace-nowrap shrink-0">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>Phản xạ: {Math.round(latency)}ms</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground whitespace-nowrap shrink-0">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>Chờ câu đối đáp...</span>
          </div>
        )}
      </div>

      {/* 4 Situational Metrics (Only Shown on Evaluation) */}
      {!isPending && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/70 text-center space-y-1">
            <div className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">Độ Đạt Mục Tiêu</div>
            <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
              {taskCompletion}%
            </div>
            <div className="text-[10px] text-muted-foreground whitespace-nowrap">Goal Completion</div>
          </div>

          <div className="p-3 rounded-2xl bg-muted/40 border border-border/70 text-center space-y-1">
            <div className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">Độ Chuẩn Ngữ Dụng</div>
            <div className="text-lg font-black font-mono text-sky-600 dark:text-sky-400 whitespace-nowrap">
              {pragmatics}%
            </div>
            <div className="text-[10px] text-muted-foreground whitespace-nowrap">Pragmatic Match</div>
          </div>

          <div className="p-3 rounded-2xl bg-muted/40 border border-border/70 text-center space-y-1">
            <div className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">Tốc Độ Phản Xạ</div>
            <div className="text-lg font-black font-mono text-purple-600 dark:text-purple-400 whitespace-nowrap">
              {fluency}%
            </div>
            <div className="text-[10px] text-muted-foreground whitespace-nowrap">Fluency Rate</div>
          </div>

          <div className="p-3 rounded-2xl bg-muted/40 border border-border/70 text-center space-y-1">
            <div className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">Sắc Thái Tự Nhiên</div>
            <div className="text-lg font-black font-mono text-amber-600 dark:text-amber-400 whitespace-nowrap">
              {naturalness}%
            </div>
            <div className="text-[10px] text-muted-foreground whitespace-nowrap">Social Tone</div>
          </div>
        </div>
      )}

      {/* Dual Voice Dialogue Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* CARD A: User Voice */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border/60">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <Mic className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{isPending ? "Giọng của bạn (Live)" : "Bạn đã đối đáp"}</span>
              </span>
              {(result?.userTranscript || liveTranscript) && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono font-bold whitespace-nowrap shrink-0">
                  STT ja-JP
                </span>
              )}
            </div>

            <div className="rounded-xl bg-muted/40 dark:bg-black/25 p-3 border border-border/60 min-h-[3.5rem] flex items-center justify-center text-center shadow-inner">
              {result?.userTranscript ? (
                <span className="text-base sm:text-lg font-black font-jp text-foreground tracking-wide leading-snug">
                  <UniversalFurigana text={result.userTranscript} fontSize="normal" />
                </span>
              ) : isPending ? (
                liveTranscript ? (
                  <span className="text-base sm:text-lg font-black font-jp text-foreground tracking-wide leading-snug">
                    <UniversalFurigana text={liveTranscript} fontSize="normal" />
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground italic font-sans font-medium flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                    Đang lắng nghe câu đối đáp của bạn...
                  </span>
                )
              ) : (
                <span className="text-xs text-muted-foreground italic font-sans">
                  {isTimeout ? "Không nhận diện được giọng nói (Hết giờ)" : "Không có âm thanh thu âm"}
                </span>
              )}
            </div>
          </div>

          <div className="p-2 rounded-xl bg-muted/20 border border-dashed border-border/70 text-[11px] text-muted-foreground text-center italic">
            {isPending ? "Micro đang kích hoạt ở Cột 3" : "Đã hoàn thành phản xạ tình huống"}
          </div>
        </div>

        {/* CARD B: Model Voice */}
        <div className="p-4 rounded-2xl bg-emerald-500/[0.03] dark:bg-emerald-500/[0.06] border border-emerald-500/25 shadow-xs space-y-3 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-emerald-500/20">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Đáp án mẫu chuẩn Nhật</span>
              </span>

              <div className="flex items-center gap-1.5 shrink-0">
                {isPending && (
                  <button
                    type="button"
                    onClick={() => setIsRevealed(!isRevealed)}
                    className="text-[10px] px-2.5 py-0.5 rounded-full bg-card/80 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-500/10 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
                    title={isRevealed ? "Ẩn đáp án (Phím V)" : "Hiện đáp án (Phím V)"}
                  >
                    {isRevealed ? (
                      <>
                        <EyeOff className="h-3 w-3 shrink-0" />
                        <span>Ẩn</span>
                        <kbd className="text-[9px] font-mono px-1 rounded bg-emerald-500/10 border border-emerald-500/25 font-bold">V</kbd>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3 shrink-0" />
                        <span>Xem</span>
                        <kbd className="text-[9px] font-mono px-1 rounded bg-emerald-500/10 border border-emerald-500/25 font-bold">V</kbd>
                      </>
                    )}
                  </button>
                )}

                {canonical && (
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playFurin();
                      speakJapaneseText(canonical, { rate: 1.0 });
                    }}
                    className="p-1 px-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 shrink-0 shadow-2xs transition-colors flex items-center gap-1.5 text-[11px] font-bold cursor-pointer whitespace-nowrap"
                    title="Nghe câu đối đáp mẫu (Phím A)"
                  >
                    <Volume2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Nghe mẫu</span>
                    <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/15 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-bold ml-0.5">A</kbd>
                  </button>
                )}
              </div>
            </div>

            {/* Model Text in Speech Bubble Container with Blur/Reveal */}
            <div className="relative min-h-[3.5rem]">
              <div
                className={cn(
                  "p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/25 min-h-[3.5rem] flex items-center justify-center text-center shadow-inner transition-all duration-300",
                  isBlurred && "filter blur-sm select-none pointer-events-none"
                )}
              >
                <span className="text-base sm:text-lg font-black font-jp text-foreground tracking-wide leading-snug">
                  <UniversalFurigana text={canonical || "すみません、これをお願いします。"} fontSize="normal" />
                </span>
              </div>

              {isBlurred && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/75 backdrop-blur-[2px] rounded-xl z-10">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs font-bold border-emerald-500/40 bg-background/95 text-emerald-600 dark:text-emerald-400 shadow-xs hover:bg-background cursor-pointer whitespace-nowrap"
                    onClick={() => setIsRevealed(true)}
                  >
                    <Eye className="h-3.5 w-3.5 shrink-0" />
                    <span>Xem trước câu đối đáp</span>
                    <kbd className="text-[10px] font-mono px-1 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/25 ml-1 font-bold">V</kbd>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cultural Nuance Pragmatics Tip */}
      {!isPending && culturalTip && (
        <div
          className={cn(
            "p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 transition-all duration-300",
            isBlurred && "filter blur-xs select-none pointer-events-none"
          )}
        >
          <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Mẹo văn hóa thực chiến Nhật Bản:</span>
            <p className="leading-relaxed">{culturalTip}</p>
          </div>
        </div>
      )}

      {/* Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-border">
        {isPending ? (
          <div className="w-full flex items-center justify-between text-xs text-muted-foreground p-2 rounded-xl bg-muted/30 border border-border/50">
            <span className="flex items-center gap-1.5 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Phản xạ câu hoàn chỉnh bằng tiếng Nhật hoặc gõ phím ở Cột 3</span>
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    soundFX.playFurin();
                    onRetry();
                  }}
                  className="text-xs font-bold gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
                  title="Luyện tập lại tình huống này (Phím R)"
                >
                  <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                  <span>Thử lại</span>
                  <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground font-bold ml-1">R</kbd>
                </Button>
              )}

              {onAskCoach && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    soundFX.playFurin();
                    if (onCancelAutoNext) onCancelAutoNext();
                    onAskCoach(`Hãy giải thích cách đối đáp tự nhiên và lịch sự hơn cho tình huống "${canonical}".`);
                  }}
                  className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span>Hỏi Sensei</span>
                </Button>
              )}
            </div>

            {onNext && (
              <Button
                variant="akane"
                size="sm"
                onClick={() => {
                  soundFX.playSuikinkutsu();
                  onNext();
                }}
                className="text-xs font-bold gap-1.5 shadow-md ml-auto cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Tình huống tiếp theo</span>
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/20 text-white font-bold ml-1">Enter</kbd>
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
