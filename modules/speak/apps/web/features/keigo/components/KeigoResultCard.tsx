"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Trophy,
  RotateCcw,
  ArrowRight,
  Volume2,
  Play,
  Pause,
  Mic,
  Crown,
  AlertTriangle,
  MessageSquare,
  BookOpen,
  Sparkles,
  ShieldCheck,
  Lightbulb,
  ShieldAlert,
  AlertCircle,
  Scale,
} from "lucide-react";
import type { KeigoResult, KeigoExercise } from "../services/keigo-api";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";

interface Props {
  result: KeigoResult | null;
  exercise?: KeigoExercise | null;
  isPending?: boolean;
  liveTranscript?: string;
  onNext?: () => void;
  onRetry?: () => void;
  onAskCoach?: (prompt: string) => void;
  onCancelAutoNext?: () => void;
  className?: string;
}

export function KeigoResultCard({
  result,
  exercise,
  isPending = false,
  liveTranscript = "",
  onNext,
  onRetry,
  onAskCoach,
  onCancelAutoNext,
  className,
}: Props) {
  const [isUserAudioPlaying, setIsUserAudioPlaying] = useState(false);
  const [userAudioCurrentTime, setUserAudioCurrentTime] = useState(0);
  const [userAudioDuration, setUserAudioDuration] = useState(0);
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);

  const userAudioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayModelTTSRef = useRef<(() => void) | null>(null);

  // Keyboard shortcut listener:
  // - A: play model audio
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (e.key.toLowerCase() === "a" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        e.stopImmediatePropagation();
        handlePlayModelTTSRef.current?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setIsUserAudioPlaying(false);
    setUserAudioCurrentTime(0);
    setUserAudioDuration(0);
  }, [result]);

  if (!result && !exercise) return null;

  const isPerfect = result?.isPerfect ?? false;
  const isTimeout = result?.timedOut ?? false;
  const isCorrect = result?.success ?? false;
  const latency = result?.reactionLatencyMs;
  const timerLimit = result?.timerLimitMs || 5000;
  const latencyRatio = latency != null ? Math.min(1, latency / timerLimit) : 1;

  const canonical =
    result?.canonicalAnswer ||
    exercise?.canonical ||
    (exercise?.target_patterns && exercise.target_patterns.length > 0 ? exercise.target_patterns[0] : "") ||
    "";

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
  }, [result?.exerciseId, canonical, isPending]);

  const variants =
    result?.acceptableVariants ||
    exercise?.acceptableVariants ||
    (exercise?.extra_metadata?.keigo_config?.acceptable_variants as string[]) ||
    [];

  const anatomy = result?.anatomy || exercise?.anatomy || exercise?.extra_metadata?.keigo_config?.anatomy;
  const hintLevel = result?.hintLevel ?? 0;

  const togglePlayUserAudio = () => {
    onCancelAutoNext?.();
    if (!userAudioRef.current || !result?.userAudioUrl) return;

    if (isUserAudioPlaying) {
      userAudioRef.current.pause();
      setIsUserAudioPlaying(false);
    } else {
      stopWebSpeech();
      setIsTTSPlaying(false);
      userAudioRef.current
        .play()
        .then(() => setIsUserAudioPlaying(true))
        .catch(() => setIsUserAudioPlaying(false));
    }
  };

  const handlePlayModelTTS = () => {
    onCancelAutoNext?.();
    if (!canonical) return;

    if (isUserAudioPlaying && userAudioRef.current) {
      userAudioRef.current.pause();
      setIsUserAudioPlaying(false);
    }

    if (isTTSPlaying) {
      stopWebSpeech();
      setIsTTSPlaying(false);
      return;
    }

    setIsTTSPlaying(true);
    speakJapaneseText(canonical, {
      rate: 0.95,
      onEnd: () => setIsTTSPlaying(false),
      onError: () => setIsTTSPlaying(false),
    });
  };
  handlePlayModelTTSRef.current = handlePlayModelTTS;

  const formatAudioTime = (seconds: number) => {
    const s = Math.floor(seconds % 60);
    const m = Math.floor(seconds / 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const statusConfig = isPending
    ? {
        label: "ĐÁP ÁN MẪU & CHỈ TIÊU",
        icon: <Sparkles className="h-4 w-4 text-primary animate-pulse" />,
        badgeClass: "bg-primary/10 text-primary border-primary/20",
        borderClass: "border-primary/30 bg-primary/5",
        scoreColor: "text-primary",
      }
    : isTimeout
    ? {
        label: "HẾT GIỜ (TIME'S UP)",
        icon: <Clock className="h-4 w-4" />,
        badgeClass: "bg-muted text-muted-foreground border-border",
        borderClass: "border-border/80 bg-muted/20",
        scoreColor: "text-muted-foreground",
      }
    : isPerfect
    ? {
        label: "HOÀN HẢO (PERFECT KEIGO)",
        icon: <Trophy className="h-4 w-4 text-amber-300" />,
        badgeClass: "bg-amber-500 text-sumi-950 font-black border-amber-400 shadow-md shadow-amber-500/20",
        borderClass: "border-amber-500/40 bg-amber-500/8 dark:bg-amber-950/20",
        scoreColor: "text-amber-600 dark:text-amber-400",
      }
    : isCorrect
    ? {
        label: "CHÍNH XÁC (CORRECT)",
        icon: <CheckCircle2 className="h-4 w-4" />,
        badgeClass: "bg-emerald-600 text-white font-bold border-emerald-500",
        borderClass: "border-emerald-500/30 bg-emerald-500/8 dark:bg-emerald-950/20",
        scoreColor: "text-emerald-600 dark:text-emerald-400",
      }
    : {
        label: "CẦN CỐ GẮNG (TRY AGAIN)",
        icon: <XCircle className="h-4 w-4" />,
        badgeClass: "bg-rose-600 text-white font-bold border-rose-500",
        borderClass: "border-rose-500/30 bg-rose-500/8 dark:bg-rose-950/20",
        scoreColor: "text-rose-600 dark:text-rose-400",
      };

  return (
    <div
      className={cn(
        "rounded-3xl border p-3.5 sm:p-4 space-y-2.5 shadow-lg transition-all animate-in fade-in zoom-in-95 duration-200 washi-texture",
        statusConfig.borderClass,
        className
      )}
    >
      {result?.userAudioUrl && (
        <audio
          ref={userAudioRef}
          src={result.userAudioUrl}
          onLoadedMetadata={() => {
            if (userAudioRef.current) setUserAudioDuration(userAudioRef.current.duration || 0);
          }}
          onTimeUpdate={() => {
            if (userAudioRef.current) setUserAudioCurrentTime(userAudioRef.current.currentTime || 0);
          }}
          onEnded={() => {
            setIsUserAudioPlaying(false);
            setUserAudioCurrentTime(0);
          }}
          onError={() => setIsUserAudioPlaying(false)}
        />
      )}

      {/* 1. Status, Score, Latency & Hint Independence Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs whitespace-nowrap shrink-0",
              statusConfig.badgeClass
            )}
          >
            {statusConfig.icon}
            <span>{statusConfig.label}</span>
          </span>

          {!isPending && result?.score != null && (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-black border shadow-2xs whitespace-nowrap shrink-0",
                statusConfig.badgeClass
              )}
            >
              <span>{result.score.toFixed(0)}</span>
              <span className="text-[10px] font-normal opacity-80">/100</span>
            </span>
          )}

          {result?.doubleKeigo && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap shrink-0">
              <AlertTriangle className="h-3 w-3" />
              <span>Lặp Kính Ngữ</span>
            </span>
          )}

          {exercise?.frequencyRank && (
            <Badge
              variant="outline"
              size="sm"
              className="font-mono font-bold text-[9px] py-0.5 px-2 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 whitespace-nowrap shrink-0"
            >
              BCCWJ #{exercise.frequencyRank} • Tier {exercise.frequencyTier || 1}
            </Badge>
          )}

          {!isPending && (
            hintLevel === 0 ? (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 whitespace-nowrap shrink-0">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Độc lập 100%</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 whitespace-nowrap shrink-0">
                <Lightbulb className="h-3.5 w-3.5 fill-current" />
                <span>Dùng gợi ý Cấp {hintLevel}</span>
              </span>
            )
          )}
        </div>

        {latency != null ? (
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-foreground whitespace-nowrap shrink-0">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span>Phản xạ: {Math.round(latency)}ms</span>
            <span className="text-muted-foreground font-normal">/ {timerLimit > 0 ? `${timerLimit / 1000}s` : "∞"}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground whitespace-nowrap shrink-0">
            <Clock className="h-3.5 w-3.5" />
            <span>Mục tiêu: ≤ {timerLimit > 0 ? `${timerLimit / 1000}s` : "5s"}</span>
          </div>
        )}
      </div>

      {/* Latency Speed Bar */}
      {latency != null && (
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/50">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              latencyRatio < 0.5
                ? "bg-emerald-500"
                : latencyRatio < 0.75
                ? "bg-amber-500"
                : "bg-rose-500"
            )}
            style={{ width: `${latencyRatio * 100}%` }}
          />
        </div>
      )}

      {/* 2. DUAL CORE COMPARISON */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* CARD A: Your Voice */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border/60">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <Mic className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{isPending ? "Giọng của bạn (Live)" : "Bạn đã nói"}</span>
              </span>
              {(result?.transcript || liveTranscript) && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono font-bold whitespace-nowrap shrink-0">
                  STT ja-JP
                </span>
              )}
            </div>

            <div className="rounded-xl bg-muted/40 dark:bg-black/25 p-3 border border-border/60 min-h-[3.5rem] flex items-center justify-center text-center shadow-inner">
              {result?.transcript ? (
                <span className="text-base sm:text-lg font-black font-jp text-foreground tracking-wide leading-snug">
                  <UniversalFurigana text={result.transcript} fontSize="normal" />
                </span>
              ) : isPending ? (
                liveTranscript ? (
                  <span className="text-base sm:text-lg font-black font-jp text-foreground tracking-wide leading-snug">
                    <UniversalFurigana text={liveTranscript} fontSize="normal" />
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground italic font-sans font-medium flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                    Đang lắng nghe giọng của bạn...
                  </span>
                )
              ) : (
                <span className="text-xs text-muted-foreground italic font-sans">
                  {isTimeout ? "Không nhận diện được giọng nói (Hết giờ)" : "Không có âm thanh thu âm"}
                </span>
              )}
            </div>
          </div>

          {result?.userAudioUrl ? (
            <div className="p-2.5 px-3 rounded-xl bg-muted/50 border border-border/70 flex items-center justify-between gap-3 shadow-xs">
              <button
                type="button"
                onClick={togglePlayUserAudio}
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center transition-all shadow-xs shrink-0 cursor-pointer",
                  isUserAudioPlaying
                    ? "bg-primary text-primary-foreground animate-pulse ring-2 ring-primary/30"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                )}
                title="Nghe lại giọng của bạn"
              >
                {isUserAudioPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
              </button>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground font-bold">
                  <span>{isUserAudioPlaying ? "Đang phát lại..." : "Bản thu âm của bạn"}</span>
                  <span>
                    {formatAudioTime(userAudioCurrentTime)} / {formatAudioTime(userAudioDuration || 0)}
                  </span>
                </div>
                <div className="flex items-center gap-1 h-2">
                  <div className="flex-1 h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-100"
                      style={{
                        width: `${userAudioDuration ? (userAudioCurrentTime / userAudioDuration) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-muted/20 border border-dashed border-border/70 text-[11px] text-muted-foreground text-center italic">
              {isPending ? "Mic đang kích hoạt ở bảng điều khiển" : "Không có bản ghi âm cho câu này"}
            </div>
          )}
        </div>

        {/* CARD B: Model Answer */}
        <div className="p-4 rounded-2xl bg-primary/[0.03] dark:bg-primary/[0.06] border border-primary/25 shadow-xs space-y-3 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-primary/20">
              <span className="text-[11px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>Đáp án Kính ngữ chuẩn</span>
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {canonical && (
                  <button
                    type="button"
                    onClick={handlePlayModelTTS}
                    className="p-1 px-2.5 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 shrink-0 shadow-2xs transition-colors flex items-center gap-1.5 text-[11px] font-bold cursor-pointer whitespace-nowrap"
                    title="Nghe phát âm chuẩn của câu mẫu (Phím A)"
                  >
                    <Volume2 className={cn("h-3.5 w-3.5 shrink-0", isTTSPlaying && "animate-bounce")} />
                    <span>{isTTSPlaying ? "Đang đọc..." : "Nghe mẫu"}</span>
                    <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-primary/15 border border-primary/25 text-primary font-bold ml-0.5">A</kbd>
                  </button>
                )}
              </div>
            </div>

            <div className="relative min-h-[3.5rem]">
              <div className="rounded-xl bg-card/70 dark:bg-black/25 p-3.5 border border-border/70 text-center shadow-xs flex flex-col items-center justify-center min-h-[3.5rem]">
                {canonical ? (
                  <div className="text-xl sm:text-2xl font-black font-jp text-primary tracking-tight leading-snug">
                    <UniversalFurigana text={canonical} fontSize="xl" />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic font-sans font-normal">
                    Chưa có đáp án mẫu
                  </span>
                )}
              </div>
            </div>
          </div>

          {variants.length > 1 && (
            <div
              className="text-[10px] text-muted-foreground text-center pt-0.5 font-jp whitespace-nowrap"
              title={variants.join(" / ")}
            >
              +{variants.length - 1} cách nói khác
            </div>
          )}
        </div>
      </div>

      {/* 4. KEIGO ANATOMY BREAKDOWN (Giải phẫu Kính ngữ - Only Shown on Evaluation) */}
      {!isPending && anatomy && (
        <div
          className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-2.5 transition-all duration-300"
        >
          <div className="flex items-center justify-between text-xs font-bold text-foreground">
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span>Phân Tích Giải Phẫu Cấu Trúc (Keigo Anatomy)</span>
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-mono">Chuẩn ngữ pháp</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-card border border-border/70 space-y-0.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Động từ gốc:</span>
              <div className="font-bold font-jp text-foreground">
                <UniversalFurigana text={anatomy.rootVerb || "—"} fontSize="sm" />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-card border border-border/70 space-y-0.5">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Cấu trúc áp dụng:</span>
              <div className="font-bold font-jp text-primary">
                <UniversalFurigana text={anatomy.formula || "—"} fontSize="sm" />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-card border border-border/70 space-y-0.5">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Nguyên tắc:</span>
              <div className="font-medium text-foreground">{anatomy.rationale || "—"}</div>
            </div>
          </div>

          {anatomy.pitfallWarning && (
            <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 flex items-center gap-1.5 font-medium">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span>{anatomy.pitfallWarning}</span>
            </div>
          )}
        </div>
      )}

      {/* 4.5 PRAGMATICS & SOCIAL POLITENESS MATRIX (Only Shown on Evaluation) */}
      {!isPending && result?.pragmatics && (
        <div
          className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3"
        >
          <div className="flex items-center justify-between text-xs font-bold text-foreground">
            <span className="flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5 text-primary" />
              <span>Ma Trận Lịch Sự & Ngữ Dụng Xã Hội (Politeness Matrix)</span>
            </span>
            {result.pragmatics.politeness_matrix && (
              <span className="text-[10px] font-mono text-muted-foreground uppercase">
                Trọng số W: {result.pragmatics.politeness_matrix.total_weight_W} ({result.pragmatics.politeness_matrix.required_formality})
              </span>
            )}
          </div>

          {/* Politeness Matrix HUD */}
          {result.pragmatics.politeness_matrix && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2 rounded-xl bg-card border border-border/60 flex flex-col">
                <span className="text-[10px] text-muted-foreground font-sans">Quyền lực (P)</span>
                <span className="font-bold text-foreground">{result.pragmatics.politeness_matrix.power_distance_P} / 5.0</span>
              </div>
              <div className="p-2 rounded-xl bg-card border border-border/60 flex flex-col">
                <span className="text-[10px] text-muted-foreground font-sans">Khoảng cách (D)</span>
                <span className="font-bold text-foreground">{result.pragmatics.politeness_matrix.social_distance_D} / 5.0</span>
              </div>
              <div className="p-2 rounded-xl bg-card border border-border/60 flex flex-col">
                <span className="text-[10px] text-muted-foreground font-sans">Độ áp đặt (R)</span>
                <span className="font-bold text-foreground">{result.pragmatics.politeness_matrix.ranking_of_imposition_R} / 5.0</span>
              </div>
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 flex flex-col">
                <span className="text-[10px] text-primary font-sans font-bold">Chuẩn đề xuất</span>
                <span className="font-bold text-primary uppercase text-[11px] truncate">{result.pragmatics.politeness_matrix.required_formality}</span>
              </div>
            </div>
          )}

          {/* Wakimae In-Group Humbling Violation Alert */}
          {result.pragmatics.wakimae?.is_violation && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-700 dark:text-rose-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>Vi phạm Kính ngữ Tương đối (相対敬語 - Wakimae)</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-800 dark:text-rose-200">
                {result.pragmatics.wakimae.pedagogical_advice || result.pragmatics.wakimae.reason}
              </p>
            </div>
          )}

          {/* Baito Keigo Alert */}
          {result.pragmatics.baito_keigo?.found && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Cảnh báo: Baito Keigo (バイト敬語 / Manual Keigo)</span>
              </div>
              {result.pragmatics.baito_keigo.issues?.map((issue, idx) => (
                <div key={idx} className="text-[11px] pl-5 space-y-0.5 border-l-2 border-amber-500/40">
                  <div className="font-semibold text-foreground">
                    Cụm từ phát hiện: <span className="font-jp text-rose-600 dark:text-rose-400">「{issue.offending_phrase}」</span>
                  </div>
                  <div className="text-muted-foreground">{issue.suggestion}</div>
                </div>
              ))}
            </div>
          )}

          {/* Cushion Words Badge */}
          {result.pragmatics.cushion_words?.found && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Từ đệm lịch sự (クッション言葉):</span>
                <span className="font-jp text-emerald-800 dark:text-emerald-200 font-black">
                  {result.pragmatics.cushion_words.detected_phrases?.join("、 ")}
                </span>
              </div>
              {result.pragmatics.cushion_words.bonus_applied && (
                <Badge variant="matcha" size="sm" className="text-[10px]">
                  + Điểm tinh tế
                </Badge>
              )}
            </div>
          )}

          {/* Double Keigo Alert (Detailed) */}
          {result.doubleKeigo?.is_double_keigo && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>Lặp kính ngữ (二重敬語): {result.doubleKeigo.rule || "Trùng lặp yếu tố tôn kính"}</span>
              </div>
              {result.doubleKeigo.recommendation && (
                <p className="text-[11px] text-muted-foreground pl-5 font-jp">
                  {result.doubleKeigo.recommendation}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. Bottom Action Controls */}
      <div className="pt-2 flex flex-wrap items-center gap-2">
        {isPending ? (
          <div className="w-full flex items-center justify-between text-xs text-muted-foreground p-2 rounded-xl bg-muted/30 border border-border/50">
            <span className="flex items-center gap-1.5 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Nói câu hoàn chỉnh bằng kính ngữ hoặc gõ phím ở Cột 3</span>
            </span>
          </div>
        ) : (
          <>
            {onNext && (
              <Button size="sm" variant="akane" onClick={onNext} className="flex-1 gap-1.5 font-bold min-w-[130px] whitespace-nowrap shrink-0">
                <span>Câu tiếp theo</span>
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/20 text-white font-bold ml-1">Enter</kbd>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Button>
            )}

            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5 font-bold whitespace-nowrap shrink-0">
                <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                <span>Thử lại</span>
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground font-bold ml-1">R</kbd>
              </Button>
            )}

            {onAskCoach && canonical && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  onAskCoach(`Giải thích ngắn gọn sắc thái và cách dùng kính ngữ trong câu: "${canonical}"`)
                }
                className="gap-1.5 text-xs text-primary font-bold ml-auto whitespace-nowrap shrink-0"
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span>Hỏi Sensei</span>
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
