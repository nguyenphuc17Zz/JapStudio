"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  RotateCcw,
  ArrowRight,
  Volume2,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  X,
} from "lucide-react";
import { PracticeAttemptFeedback } from "@/types/shadowing";
import { soundFX } from "@/lib/sound-fx";
import {
  claimSpeechOutput,
  releaseSpeechOutput,
  type SpeechOutputOwner,
} from "@/features/audio/services/speech-playback-coordinator";
import { cn } from "@/lib/utils";

export interface CoroScoreCardProps {
  feedback: PracticeAttemptFeedback;
  targetSentence?: string;
  onRetry?: () => void;
  onNext?: () => void;
  onPlayReference?: () => void;
  onDismiss?: () => void;
}

export function CoroScoreCard({
  feedback,
  targetSentence,
  onRetry,
  onNext,
  onPlayReference,
  onDismiss,
}: CoroScoreCardProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const score = feedback.score ?? 0;

  // Play user recording
  const handlePlayUserAudio = () => {
    if (!feedback.user_audio_url) return;

    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlayingAudio(false);
      return;
    }

    const audio = new Audio(feedback.user_audio_url);
    audioRef.current = audio;
    // Single-flight: cut any other speech before playing this recording.
    const owner: SpeechOutputOwner = {
      stop: () => {
        try {
          audio.pause();
        } catch {}
        setIsPlayingAudio(false);
      },
    };
    claimSpeechOutput(owner);
    audio.onended = () => {
      releaseSpeechOutput(owner);
      setIsPlayingAudio(false);
    };
    audio.onerror = () => {
      releaseSpeechOutput(owner);
      setIsPlayingAudio(false);
    };
    audio.play().catch(() => {
      releaseSpeechOutput(owner);
      setIsPlayingAudio(false);
    });
    setIsPlayingAudio(true);
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Score color thresholds
  const getScoreConfig = (s: number) => {
    if (s >= 85) return { color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30", label: "素晴らしい！", emoji: "🌟" };
    if (s >= 70) return { color: "text-sky-500", bg: "bg-sky-500/10 border-sky-500/30", label: "よくできた！", emoji: "👍" };
    if (s >= 50) return { color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30", label: "もう少し！", emoji: "💪" };
    return { color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/30", label: "頑張れ！", emoji: "🔥" };
  };

  const config = getScoreConfig(score);

  // Simple word diff display
  const renderDiff = () => {
    const tokens = feedback.diff_tokens ?? feedback.metrics?.diff_tokens;
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 text-xs font-jp leading-relaxed">
        {tokens.map((token: any, i: number) => {
          const type: string = token.type ?? (token.is_match ? "match" : token.is_missing ? "missing" : "extra");
          return (
            <span
              key={i}
              className={cn(
                "px-1 py-0.5 rounded font-medium",
                type === "match"
                  ? "text-foreground"
                  : type === "missing"
                  ? "bg-rose-500/20 text-rose-500 line-through"
                  : type === "extra"
                  ? "bg-amber-500/20 text-amber-500"
                  : type === "substitution"
                  ? "bg-amber-500/20 text-amber-500"
                  : "text-muted-foreground"
              )}
            >
              {token.word ?? token.text ?? ""}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 space-y-3 animate-in slide-in-from-bottom-3 fade-in duration-300",
        config.bg
      )}
    >
      {/* Header Row: Score + Dismiss */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Score Circle */}
          <div
            className={cn(
              "h-14 w-14 rounded-full flex flex-col items-center justify-center border-2 shrink-0",
              score >= 85
                ? "border-emerald-500/60 bg-emerald-500/10"
                : score >= 70
                ? "border-sky-500/60 bg-sky-500/10"
                : score >= 50
                ? "border-amber-500/60 bg-amber-500/10"
                : "border-rose-500/60 bg-rose-500/10"
            )}
          >
            <span className={cn("text-lg font-black leading-none", config.color)}>{score}</span>
            <span className="text-[9px] text-muted-foreground font-medium">điểm</span>
          </div>

          {/* Label + sub scores */}
          <div className="space-y-0.5">
            <p className="text-sm font-black text-foreground">
              {config.emoji} {config.label}
            </p>
            <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
              {feedback.pronunciation_score > 0 && (
                <span>Phát âm: <strong className="text-foreground">{feedback.pronunciation_score}</strong></span>
              )}
              {feedback.timing_score > 0 && (
                <span>Nhịp điệu: <strong className="text-foreground">{feedback.timing_score}</strong></span>
              )}
              {feedback.accuracy_score > 0 && (
                <span>Chính xác: <strong className="text-foreground">{feedback.accuracy_score}</strong></span>
              )}
            </div>
          </div>
        </div>

        {/* Dismiss */}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="h-7 w-7 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Word Diff */}
      {renderDiff() && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
            So sánh từng chữ
          </p>
          <div className="p-2 rounded-xl bg-background/60 border border-border/60">
            {renderDiff()}
          </div>
        </div>
      )}

      {/* Feedback text (short) */}
      {feedback.feedback && (
        <p className="text-xs text-muted-foreground leading-relaxed italic border-l-2 border-primary/30 pl-2.5">
          {feedback.feedback.length > 120 ? feedback.feedback.slice(0, 120) + "…" : feedback.feedback}
        </p>
      )}

      {/* Top issues (compact) */}
      {feedback.top_issues && feedback.top_issues.length > 0 && (
        <div className="space-y-1">
          {feedback.top_issues.slice(0, 2).map((issue, i) => (
            <div
              key={i}
              className="flex items-start gap-1.5 p-1.5 rounded-lg bg-background/50 border border-border/50"
            >
              <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-foreground">{issue.title}</p>
                <p className="text-[10px] text-muted-foreground leading-snug">{issue.practice_tip}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mastery progress indicator */}
      {feedback.mastery_delta !== undefined && feedback.mastery_delta > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold">
          <TrendingUp className="h-3 w-3" />
          <span>Mastery tăng +{feedback.mastery_delta}%</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        {/* Play user audio */}
        {feedback.user_audio_url && (
          <button
            type="button"
            onClick={handlePlayUserAudio}
            className="h-8 w-8 rounded-xl border border-border bg-muted/60 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all"
            title="Nghe lại giọng mình"
          >
            {isPlayingAudio ? <Pause className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        )}

        {/* Play reference */}
        {onPlayReference && (
          <button
            type="button"
            onClick={() => {
              soundFX.playFurin();
              onPlayReference();
            }}
            className="h-8 w-8 rounded-xl border border-border bg-muted/60 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all"
            title="Nghe lại câu mẫu"
          >
            <Play className="h-3.5 w-3.5" />
          </button>
        )}

        <div className="flex-1" />

        {/* Retry */}
        {onRetry && (
          <button
            type="button"
            onClick={() => {
              soundFX.playFurin();
              onRetry();
            }}
            className="h-8 px-3 rounded-xl border border-border bg-muted/60 text-muted-foreground hover:text-foreground text-[11px] font-bold flex items-center gap-1.5 transition-all"
          >
            <RotateCcw className="h-3 w-3" />
            Thử lại
          </button>
        )}

        {/* Next */}
        {onNext && (
          <button
            type="button"
            onClick={() => {
              soundFX.playTaiko();
              onNext();
            }}
            className="h-8 px-4 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold flex items-center gap-1.5 hover:bg-primary/90 transition-all shadow-xs"
          >
            <span>Tiếp theo</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
