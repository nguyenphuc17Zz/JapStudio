"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Volume2,
  RotateCcw,
  ArrowRight,
  ThumbsUp,
  Brain,
  Gauge,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import type { BuilderResult } from "../services/builder-api";

export interface BuilderFeedbackCardProps {
  result: BuilderResult;
  onRetry: () => void;
  onContinue: () => void;
  className?: string;
}

export function BuilderFeedbackCard({
  result,
  onRetry,
  onContinue,
  className,
}: BuilderFeedbackCardProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const betterVersion = result.betterVersion || result.canonical || "";
  const betterVersionVi = result.betterVersionVi || result.canonicalVi || "";
  const isSuccess = result.success;

  const handlePlayModelAudio = () => {
    if (!betterVersion) return;
    try {
      stopWebSpeech();
      setIsPlayingAudio(true);
      speakJapaneseText(betterVersion, {
        rate: 0.92,
        onEnd: () => setIsPlayingAudio(false),
        onError: () => setIsPlayingAudio(false),
      });
      setTimeout(() => setIsPlayingAudio(false), 3500);
    } catch {
      setIsPlayingAudio(false);
    }
  };

  // Keyboard shortcut listener: Space to retry, Enter to continue
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (e.code === "Enter") {
        e.preventDefault();
        soundFX.playSuikinkutsu();
        onContinue();
      } else if (e.code === "Space") {
        e.preventDefault();
        soundFX.playTaiko();
        onRetry();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onRetry, onContinue]);

  return (
    <div
      className={cn(
        "h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl p-3.5 sm:p-4 shadow-lg overflow-hidden animate-in fade-in-0 slide-in-from-bottom-2 duration-200 gap-2.5",
        className
      )}
    >
      {/* Top Header: Overall Score & Mini Metric Badges */}
      <div className="flex flex-col gap-2 border-b border-border/50 pb-2.5 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30"
            >
              <Brain className="size-3 mr-1 text-purple-500" />
              AI Đánh Giá
            </Badge>

            {result.reactionLatencyMs !== null && result.reactionLatencyMs !== undefined && (
              <Badge
                variant="outline"
                className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30"
              >
                <Gauge className="size-3 mr-1" />
                {(result.reactionLatencyMs / 1000).toFixed(1)}s phản xạ
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] text-muted-foreground font-medium">Tổng:</span>
            <span
              className={cn(
                "font-mono font-bold text-base sm:text-lg",
                isSuccess ? "text-emerald-500" : "text-amber-500"
              )}
            >
              {Math.round(result.score)}/100
            </span>
          </div>
        </div>

        {/* Dimension Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full border",
              result.meaningScore >= 70
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
            )}
          >
            <CheckCircle2 className="size-3 mr-1" />
            Ý nghĩa: {Math.round(result.meaningScore)}%
          </Badge>

          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full border",
              result.grammarScore >= 70
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
            )}
          >
            Ngữ pháp: {Math.round(result.grammarScore)}%
          </Badge>

          <Badge
            variant="outline"
            className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30"
          >
            <Sparkles className="size-3 mr-1" />
            Tự nhiên: {Math.round(result.naturalnessScore)}%
          </Badge>
        </div>
      </div>

      {/* Middle Section: User Speech vs Native Better Version */}
      <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5 min-h-0">
        {/* User Spoken */}
        <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Bạn đã nói:
          </span>
          <p className="font-jp text-xs sm:text-sm font-semibold text-foreground select-text cursor-text">
            {result.transcript ? (
              <UniversalFurigana text={result.transcript} fontSize="sm" />
            ) : (
              <span className="italic text-muted-foreground">(Không ghi nhận giọng nói)</span>
            )}
          </p>
        </div>

        {/* Better Native Model */}
        {betterVersion && (
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/25 space-y-1 relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                <Sparkles className="size-3" />
                <span>Phiên bản bản xứ nói hay hơn:</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePlayModelAudio}
                className="size-7 p-0 rounded-xl text-primary hover:bg-primary/20 cursor-pointer shrink-0"
                title="Nghe phát âm chuẩn người bản xứ"
              >
                <Volume2 className={cn("size-3.5", isPlayingAudio && "animate-pulse scale-110")} />
              </Button>
            </div>
            <p className="font-jp text-xs sm:text-sm font-bold text-foreground select-text cursor-text leading-snug">
              <UniversalFurigana text={betterVersion} fontSize="sm" />
            </p>
            {betterVersionVi && (
              <p className="text-[11px] text-muted-foreground pt-0.5 italic">
                "{betterVersionVi}"
              </p>
            )}
          </div>
        )}

        {/* Actionable Error Corrections (if any) */}
        {result.errors && result.errors.length > 0 && (
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <AlertTriangle className="size-3" />
              <span>Cần lưu ý:</span>
            </span>
            <div className="space-y-1">
              {result.errors.slice(0, 2).map((err, i) => (
                <div key={i} className="text-xs text-foreground flex flex-wrap items-center gap-1">
                  <span className="line-through text-red-500 font-jp font-semibold">"{err.userText}"</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-jp font-bold">"{err.correction}"</span>
                  <span className="text-muted-foreground text-[11px]">({err.explanation})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Praise Points */}
        {result.praisePoints && result.praisePoints.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 pt-0.5">
            <ThumbsUp className="size-3 shrink-0" />
            <span>{result.praisePoints[0]}</span>
          </div>
        )}

        {/* Feedback text fallback if not perfect */}
        {result.feedback && (!result.praisePoints || result.praisePoints.length === 0) && (
          <div className="text-[11px] text-muted-foreground leading-relaxed p-2 rounded-xl bg-muted/20 border border-border/50">
            {result.feedback}
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="pt-2.5 border-t border-border/50 flex items-center justify-between gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="h-9 px-3.5 rounded-xl font-semibold gap-1.5 border-border/80 text-xs hover:bg-muted"
        >
          <RotateCcw className="size-3.5" />
          <span>Nói lại [Space]</span>
        </Button>

        <Button
          size="sm"
          onClick={onContinue}
          className="h-9 px-4 rounded-xl font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/20 text-xs"
        >
          <span>Bài tiếp theo [Enter]</span>
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
