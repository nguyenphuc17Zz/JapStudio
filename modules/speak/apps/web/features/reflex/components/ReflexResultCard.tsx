"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Trophy,
  RotateCcw,
  ArrowRight,
  Sparkles,
  Sliders,
  Volume2,
  Play,
  Pause,
  Mic,
  Check,
  Crown,
  Eye,
  EyeOff,
} from "lucide-react";
import type { ReflexResult, ReflexExercise } from "../services/reflex-api";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { formatJapaneseConjugationTarget } from "./ReflexPromptCard";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";

interface Props {
  result: ReflexResult | null;
  exercise?: ReflexExercise | null;
  isPending?: boolean;
  liveTranscript?: string;
  onNext?: () => void;
  onSkip?: () => void;
  onRetry?: () => void;
  onSlowMode?: () => void;
  onCancelAutoNext?: () => void;
  className?: string;
}

export function ReflexResultCard({
  result,
  exercise,
  isPending = false,
  liveTranscript = "",
  onNext,
  onSkip,
  onRetry,
  onSlowMode,
  onCancelAutoNext,
  className,
}: Props) {
  const [isUserAudioPlaying, setIsUserAudioPlaying] = useState(false);
  const [userAudioCurrentTime, setUserAudioCurrentTime] = useState(0);
  const [userAudioDuration, setUserAudioDuration] = useState(0);
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  const userAudioRef = useRef<HTMLAudioElement | null>(null);

  // Reset revealed state on new exercise
  useEffect(() => {
    setIsRevealed(false);
  }, [exercise?.id]);

  const handlePlayModelTTSRef = useRef<(() => void) | null>(null);

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
        handlePlayModelTTSRef.current?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPending]);

  // Sync user audio duration and state
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
  const timerLimit = result?.timerLimitMs || 3000;
  const latencyRatio = latency != null ? Math.min(1, latency / timerLimit) : 1;
  const isBlurred = isPending && !isRevealed;

  // Resolve Canonical Answer & Vocabulary Context
  const isVocab = exercise?.exercise_type === "reflex_vocabulary" || result?.direction !== undefined;
  const isKeigoVocab = exercise?.exercise_type === "reflex_keigo_vocab";
  const rc = exercise?.extra_metadata?.reflex_config || {};
  const vocabDirection = result?.direction || rc.direction || "ja_to_vi";
  const promptText = result?.promptText || rc.prompt || exercise?.prompt || "";
  const wordReading = result?.promptReading || rc.word_reading || rc.prompt_reading || "";
  const wordMeaningVi = result?.promptTranslation || rc.word_meaning_vi || rc.prompt_translation || "";
  const vocabCollocationJa = result?.collocationJa || rc.collocation_ja || exercise?.collocationJa || "";
  const vocabCollocationVi = result?.collocationVi || rc.collocation_vi || exercise?.collocationVi || "";
  const vocabExampleJa = result?.exampleJa || rc.example_ja || exercise?.exampleJa || "";
  const vocabExampleVi = result?.exampleVi || rc.example_vi || exercise?.exampleVi || "";
  const vocabTypeLabel = result?.wordTypeLabel || rc.word_type_label || exercise?.wordTypeLabel || "";

  const keigoTargetType = result?.targetType || rc.target_type || "sonkeigo";
  const keigoTargetLabel = result?.targetLabel || rc.target_label_vi || "Kính ngữ";
  const tripletSonkeigo = result?.tripletSonkeigo || rc.triplet_sonkeigo || "";
  const tripletKenjougo = result?.tripletKenjougo || rc.triplet_kenjougo || "";
  const explanationVi = result?.explanationVi || rc.explanation_vi || "";
  const keigoFormula = rc.formula || exercise?.formula || "";
  const keigoExampleJa = rc.example_ja || exercise?.exampleJa || result?.exampleJa || "";
  const keigoExampleVi = rc.example_vi || exercise?.exampleVi || result?.exampleVi || "";
  const keigoSubjectHint = rc.subject_hint_vi || exercise?.subjectHintVi || "";
  const isTransformation = exercise?.exercise_type === "reflex_transformation" || rc.sub_mode === "reflex_transformation";
  const transformSource = exercise?.source || rc.source || promptText || "";
  const transformTargetLabel = exercise?.targetLabel || rc.target_label || rc.targetLabel || exercise?.task || rc.task || "";
  const transformFormula = exercise?.formula || rc.formula || "";
  const transformGrammarNote = exercise?.grammarNote || rc.grammar_note || rc.grammarNote || "";

  const isContext = exercise?.exercise_type === "reflex_context" || rc.sub_mode === "reflex_context";
  const contextRole = exercise?.role || rc.role || rc.relationship || exercise?.relationship || "Đối phương";
  const contextSpeakerJa = exercise?.speakerJa || rc.speaker_ja || promptText || "";
  const contextSpeakerVi = exercise?.speakerVi || rc.speaker_vi || "";
  const contextIntent = exercise?.intent || rc.intent || "";
  const contextCulturalNote = exercise?.culturalNote || rc.cultural_note || rc.culturalNote || "";

  const isQna = exercise?.exercise_type === "reflex_qna" || rc.sub_mode === "reflex_qna";
  const multiAnswers =
    exercise?.multiAnswers ||
    rc.multi_answers ||
    rc.multiAnswers ||
    (exercise as any)?.multi_answers ||
    (exercise as any)?.multiAnswers ||
    (result as any)?.multiAnswers ||
    (result as any)?.extra_metadata?.reflex_config?.multi_answers ||
    null;

  const canonical =
    result?.canonicalAnswer ||
    exercise?.canonical ||
    rc.canonical ||
    rc.expected ||
    rc.target ||
    (exercise?.target_patterns && exercise.target_patterns.length > 0 ? exercise.target_patterns[0] : "") ||
    "";

  const vocabWord = rc.word || exercise?.word || canonical || "";

  const effectiveMultiAnswers =
    multiAnswers ||
    ((isQna || isContext) && canonical
      ? {
          positive: { ja: canonical, vi: isContext ? "Nhận lời / Khẳng định chuẩn mực" : "Trả lời khẳng định / Tích cực" },
          negative: { ja: "いいえ、実はあまり...", vi: isContext ? "Từ chối khéo / Đàm phán" : "Khéo léo từ chối / Khác biệt" },
          extended: { ja: `${canonical}。`, vi: isContext ? "Mở rộng thêm giải pháp" : "Mở rộng thêm cảm xúc / Lý do" },
        }
      : null);

  // TTS ALWAYS speaks the MODEL ANSWER (canonical), NEVER the question (promptText)!
  const ttsText = canonical;

  // Auto-play model answer TTS when result is first shown (only if submitted and not pending)
  useEffect(() => {
    if (isPending || !ttsText || !result) return;

    setIsTTSPlaying(true);
    const timer = setTimeout(() => {
      speakJapaneseText(ttsText, {
        rate: 0.95,
        onEnd: () => setIsTTSPlaying(false),
        onError: () => setIsTTSPlaying(false),
      });
    }, 200);

    return () => {
      clearTimeout(timer);
      stopWebSpeech();
    };
  }, [ttsText, isPending, result]);

  // Resolve acceptable variants
  const variants =
    result?.acceptableVariants ||
    exercise?.acceptableVariants ||
    (exercise?.extra_metadata?.reflex_config?.acceptable_variants as string[]) ||
    [];

  const rawTarget = result?.targetForm || exercise?.extra_metadata?.reflex_config?.conjugation_target || "";
  const targetLabel = formatJapaneseConjugationTarget(rawTarget);

  // User Audio Playback toggle
  const togglePlayUserAudio = () => {
    onCancelAutoNext?.();
    if (!userAudioRef.current || !result?.userAudioUrl) return;

    if (isUserAudioPlaying) {
      userAudioRef.current.pause();
      setIsUserAudioPlaying(false);
    } else {
      stopWebSpeech();
      setIsTTSPlaying(false);
      userAudioRef.current.play().then(() => {
        setIsUserAudioPlaying(true);
      }).catch((e) => {
        console.warn("[ReflexResultCard] Audio play error:", e);
      });
    }
  };

  // Play Model Answer TTS
  const handlePlayModelTTS = () => {
    onCancelAutoNext?.();
    if (!ttsText) return;

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
    speakJapaneseText(ttsText, {
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

  // Status configuration
  const statusConfig = isPending
    ? {
        label: "ĐÁP ÁN MẪU & CHỈ TIÊU",
        icon: <Sparkles className="h-4 w-4 text-primary animate-pulse" />,
        badgeClass: "bg-primary/10 text-primary font-bold border-primary/30",
        borderClass: "border-border/80 bg-card/90 dark:bg-[#111622]/90",
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
        label: "HOÀN HẢO (PERFECT REFLEX)",
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
        "rounded-3xl border p-3.5 sm:p-4 shadow-lg transition-all animate-in fade-in zoom-in-95 duration-200 washi-texture h-full flex flex-col justify-between overflow-y-auto space-y-2.5",
        statusConfig.borderClass,
        className
      )}
    >
      {/* Hidden HTML5 audio element for User voice playback */}
      {result?.userAudioUrl && (
        <audio
          ref={userAudioRef}
          src={result.userAudioUrl}
          onLoadedMetadata={() => {
            if (userAudioRef.current) {
              setUserAudioDuration(userAudioRef.current.duration || 0);
            }
          }}
          onTimeUpdate={() => {
            if (userAudioRef.current) {
              setUserAudioCurrentTime(userAudioRef.current.currentTime || 0);
            }
          }}
          onEnded={() => {
            setIsUserAudioPlaying(false);
            setUserAudioCurrentTime(0);
          }}
          onError={() => setIsUserAudioPlaying(false)}
        />
      )}

      {/* 1. Status, Score & Latency Header */}
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
        </div>

        {isPending ? (
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-muted-foreground whitespace-nowrap shrink-0">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>Chờ câu trả lời...</span>
          </div>
        ) : latency != null ? (
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-foreground whitespace-nowrap shrink-0">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span>Phản xạ: {Math.round(latency)}ms</span>
            <span className="text-muted-foreground font-normal">/ {timerLimit > 0 ? `${timerLimit / 1000}s` : "∞"}</span>
          </div>
        ) : null}
      </div>

      {/* Latency Speed Bar Indicator */}
      {!isPending && latency != null && (
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

      {/* 3. DUAL CORE COMPARISON: User Voice Audio vs Model Answer (Đáp Án Mẫu) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* CARD A: Bản Thu Âm & Giọng Của Bạn */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border/60">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <Mic className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{isPending ? "Giọng của bạn (Live)" : "Bạn đã nói"}</span>
              </span>
              {!isPending && result?.isWhisperRescued ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold flex items-center gap-1 whitespace-nowrap shrink-0">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>Whisper AI cứu</span>
                </span>
              ) : (!isPending && result?.transcript) || liveTranscript ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono font-bold whitespace-nowrap shrink-0">
                  STT ja-JP
                </span>
              ) : null}
            </div>

            <div className="rounded-xl bg-muted/40 dark:bg-black/25 p-3 border border-border/60 min-h-[3.5rem] flex items-center justify-center text-center shadow-inner">
              {isPending ? (
                liveTranscript ? (
                  <span className="text-base sm:text-lg font-black font-jp text-foreground tracking-wide leading-snug">
                    <UniversalFurigana text={liveTranscript} fontSize="normal" />
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground italic font-sans font-medium flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary animate-ping shrink-0" />
                    Đang lắng nghe giọng bạn nói...
                  </span>
                )
              ) : result?.transcript ? (
                <span className="text-base sm:text-lg font-black font-jp text-foreground tracking-wide leading-snug">
                  <UniversalFurigana text={result.transcript} fontSize="normal" />
                </span>
              ) : (
                <span className="text-xs text-muted-foreground italic font-sans">
                  {isTimeout ? "Không ghi nhận giọng nói (Hết giờ)" : "Không có âm thanh thu âm"}
                </span>
              )}
            </div>
          </div>

          {/* User Audio Player Widget */}
          {!isPending && result?.userAudioUrl ? (
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
                title={isUserAudioPlaying ? "Tạm dừng audio của bạn" : "Nghe lại giọng nói của bạn"}
              >
                {isUserAudioPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                )}
              </button>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground font-bold">
                  <span>{isUserAudioPlaying ? "Đang phát giọng bạn..." : "Bản thu âm của bạn"}</span>
                  <span>
                    {formatAudioTime(userAudioCurrentTime)} / {formatAudioTime(userAudioDuration || 0)}
                  </span>
                </div>

                {/* Animated Waveform / Progress Slider */}
                <div className="flex items-center gap-1 h-2">
                  <div className="flex-1 h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-100"
                      style={{
                        width: userAudioDuration > 0
                          ? `${(userAudioCurrentTime / userAudioDuration) * 100}%`
                          : "0%",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : isPending ? (
            <div className="p-2 rounded-xl bg-muted/20 border border-dashed border-border/70 text-[11px] text-muted-foreground text-center italic">
              Bản ghi âm giọng bạn sẽ hiển thị tại đây sau khi nộp
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-muted/20 border border-dashed border-border/70 text-[11px] text-muted-foreground text-center italic">
              Không có file ghi âm cho câu này
            </div>
          )}
        </div>

        {/* CARD B: Đáp Án Chuẩn Mẫu (Model Answer & Native TTS) */}
        <div className="p-4 rounded-2xl bg-primary/[0.03] dark:bg-primary/[0.06] border border-primary/25 shadow-xs space-y-3 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-primary/20">
              <span className="text-[11px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <Check className="h-3.5 w-3.5 stroke-[3] shrink-0" />
                <span>Đáp án chuẩn</span>
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {isPending && (
                  <button
                    type="button"
                    onClick={() => setIsRevealed((v) => !v)}
                    className="text-[10px] px-2.5 py-0.5 rounded-full bg-card/80 border border-primary/30 text-primary font-bold hover:bg-primary/10 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
                    title={isRevealed ? "Làm mờ đáp án (Phím V)" : "Xem trước đáp án mẫu (Phím V)"}
                  >
                    {isRevealed ? (
                      <>
                        <EyeOff className="h-3 w-3 shrink-0" />
                        <span>Làm mờ</span>
                        <kbd className="text-[9px] font-mono px-1 rounded bg-primary/10 border border-primary/25 font-bold">V</kbd>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3 shrink-0" />
                        <span>Xem trước</span>
                        <kbd className="text-[9px] font-mono px-1 rounded bg-primary/10 border border-primary/25 font-bold">V</kbd>
                      </>
                    )}
                  </button>
                )}
                {ttsText && (
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

            {targetLabel && (
              <div className="pt-0.5">
                <span className="text-[10px] font-bold tracking-wide bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20 whitespace-nowrap inline-flex items-center gap-1">
                  <Zap className="h-2.5 w-2.5" />
                  <span>{targetLabel}</span>
                </span>
              </div>
            )}

            {/* Model Answers Wrapped in Blur/Reveal Container */}
            <div className={cn("relative transition-all duration-300", isBlurred && "filter blur-sm select-none pointer-events-none")}>
              {/* 1. SPEED Q&A & CONTEXTUAL REACTION: 3-Way Multi-Angle Model Answers */}
              {(isQna || isContext) && effectiveMultiAnswers ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>{isContext ? "3 Hướng Phản Hồi Thực Tế (Multi-Angle):" : "3 Hướng Trả Lời Đa Chiều (Multi-Angle):"}</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-semibold">Bấm 🔈 để Shadowing</span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {/* Positive / Direct Answer */}
                  {effectiveMultiAnswers.positive && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start justify-between gap-2 text-left shadow-2xs">
                      <div className="space-y-0.5 min-w-0">
                        <span className="inline-block text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                          {isContext ? "🟢 Nhận lời / Khẳng định chuẩn mực" : "🟢 Khẳng định / Tích cực (Positive)"}
                        </span>
                        <p className="text-xs md:text-sm font-bold font-jp text-foreground leading-snug">
                          <UniversalFurigana text={effectiveMultiAnswers.positive.ja} fontSize="normal" />
                        </p>
                        {effectiveMultiAnswers.positive.vi && (
                          <p className="text-[11px] text-muted-foreground">
                            {effectiveMultiAnswers.positive.vi}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => speakJapaneseText(effectiveMultiAnswers.positive.ja, { rate: 0.95 })}
                        className="p-1.5 rounded-lg bg-card border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 shrink-0 shadow-2xs transition-colors"
                        title="Nghe câu trả lời khẳng định"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Negative / Polite Refusal / Negotiation */}
                  {(effectiveMultiAnswers.negative || (effectiveMultiAnswers as any).negotiation) && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start justify-between gap-2 text-left shadow-2xs">
                      <div className="space-y-0.5 min-w-0">
                        <span className="inline-block text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300">
                          {isContext ? "🟡 Từ chối khéo / Đàm phán lùi hạn" : "🔴 Phủ định / Khéo léo từ chối (Refusal)"}
                        </span>
                        <p className="text-xs md:text-sm font-bold font-jp text-foreground leading-snug">
                          <UniversalFurigana text={(effectiveMultiAnswers as any).negotiation?.ja || effectiveMultiAnswers.negative?.ja} fontSize="normal" />
                        </p>
                        {((effectiveMultiAnswers as any).negotiation?.vi || effectiveMultiAnswers.negative?.vi) && (
                          <p className="text-[11px] text-muted-foreground">
                            {(effectiveMultiAnswers as any).negotiation?.vi || effectiveMultiAnswers.negative?.vi}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => speakJapaneseText((effectiveMultiAnswers as any).negotiation?.ja || effectiveMultiAnswers.negative?.ja, { rate: 0.95 })}
                        className="p-1.5 rounded-lg bg-card border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 shrink-0 shadow-2xs transition-colors"
                        title="Nghe câu trả lời từ chối/đàm phán"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Extended / Reason */}
                  {effectiveMultiAnswers.extended && (
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-start justify-between gap-2 text-left shadow-2xs">
                      <div className="space-y-0.5 min-w-0">
                        <span className="inline-block text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                          {isContext ? "🔵 Mở rộng / Báo cáo giải trình" : "🔵 Mở rộng tự nhiên / Thêm lý do (Extended)"}
                        </span>
                        <p className="text-xs md:text-sm font-bold font-jp text-foreground leading-snug">
                          <UniversalFurigana text={effectiveMultiAnswers.extended.ja} fontSize="normal" />
                        </p>
                        {effectiveMultiAnswers.extended.vi && (
                          <p className="text-[11px] text-muted-foreground">
                            {effectiveMultiAnswers.extended.vi}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => speakJapaneseText(effectiveMultiAnswers.extended.ja, { rate: 0.95 })}
                        className="p-1.5 rounded-lg bg-card border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 shrink-0 shadow-2xs transition-colors"
                        title="Nghe câu trả lời mở rộng"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Cultural Nuance Takeaway */}
                {isContext && contextCulturalNote && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left shadow-2xs space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1">
                      💡 Bí quyết ứng xử văn hóa Nhật:
                    </span>
                    <p className="text-[11px] font-medium text-amber-900 dark:text-amber-200 leading-relaxed">
                      {contextCulturalNote}
                    </p>
                  </div>
                )}
              </div>
            ) : isKeigoVocab ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${
                      keigoTargetType === "sonkeigo"
                        ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400"
                        : keigoTargetType === "kenjougo"
                        ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                        : "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    }`}>
                      {keigoTargetLabel}
                    </span>
                    {rc.jlpt_level && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                        JLPT {rc.jlpt_level}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => speakJapaneseText(canonical, { rate: 0.95 })}
                    className="p-1.5 rounded-lg bg-card border border-border/80 text-foreground hover:bg-muted shrink-0 shadow-2xs transition-colors flex items-center gap-1 text-[11px] font-bold"
                    title="Nghe phát âm từ kính ngữ"
                  >
                    <Volume2 className="h-3.5 w-3.5 text-primary" />
                    <span>Nghe từ</span>
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-card border border-border/80 space-y-2 shadow-2xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl md:text-2xl font-black font-jp text-primary leading-tight">
                      <UniversalFurigana text={canonical || "—"} fontSize="xl" />
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 flex-wrap">
                    <span>Từ gốc (Plain Form):</span>
                    <span className="font-bold text-foreground font-jp">
                      <UniversalFurigana text={promptText} fontSize="sm" />
                    </span>
                    {wordMeaningVi && (
                      <span>• Ý nghĩa: <strong className="text-foreground">{wordMeaningVi}</strong></span>
                    )}
                  </div>

                  {keigoFormula && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-muted/60 border border-border/60 text-[11px] font-mono text-muted-foreground">
                      <span className="font-sans font-bold text-amber-600 dark:text-amber-400 text-[10px]">Công thức:</span>
                      <span className="font-bold font-jp text-foreground">
                        <UniversalFurigana text={keigoFormula} fontSize="sm" />
                      </span>
                    </div>
                  )}
                </div>

                {/* 3-Way Triplet Comparison */}
                {(tripletSonkeigo || tripletKenjougo) && (
                  <div className="p-2.5 rounded-2xl bg-card border border-border/80 grid grid-cols-2 gap-2 text-xs shadow-2xs">
                    <div className="space-y-0.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        👑 Tôn kính (Sếp / Khách)
                      </span>
                      <p className="font-bold font-jp text-foreground">
                        {tripletSonkeigo ? <UniversalFurigana text={tripletSonkeigo} fontSize="sm" /> : "—"}
                      </p>
                    </div>
                    <div className="space-y-0.5 p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                      <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                        🙇 Khiêm nhường (Bản thân)
                      </span>
                      <p className="font-bold font-jp text-foreground">
                        {tripletKenjougo ? <UniversalFurigana text={tripletKenjougo} fontSize="sm" /> : "—"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Business Example Sentence with Native TTS Shadowing */}
                {keigoExampleJa && (
                  <div className="p-3 rounded-2xl bg-muted/40 border border-border/80 space-y-1.5 text-left shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        💬 Câu ví dụ giao tiếp công sở:
                      </span>
                      <button
                        type="button"
                        onClick={() => speakJapaneseText(keigoExampleJa, { rate: 0.95 })}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-card border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 text-[10px] font-bold shadow-2xs transition-colors"
                        title="Nghe câu ví dụ để Shadowing"
                      >
                        <Volume2 className="h-3 w-3" />
                        <span>Shadowing</span>
                      </button>
                    </div>
                    <p className="text-xs md:text-sm font-bold font-jp text-foreground leading-snug">
                      <UniversalFurigana text={keigoExampleJa} fontSize="normal" />
                    </p>
                    {keigoExampleVi && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {keigoExampleVi}
                      </p>
                    )}
                  </div>
                )}

                {explanationVi && (
                  <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl">
                    💡 {explanationVi}
                  </p>
                )}
              </div>
            ) : isVocab ? (
              <div className="space-y-3">
                {/* Header: Word + Furigana reading + Word Type + Audio */}
                <div className="p-3 rounded-2xl bg-card border border-border/80 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xl md:text-2xl font-black font-jp text-primary leading-tight">
                        <UniversalFurigana text={canonical || vocabWord || "—"} fontSize="xl" />
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {((exercise as any)?.rank || rc.rank) && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 shadow-2xs">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          Top #{(exercise as any)?.rank || rc.rank}
                        </span>
                      )}
                      {((exercise as any)?.tier || rc.tier) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          Tier {(exercise as any)?.tier || rc.tier}
                        </span>
                      )}
                      {vocabTypeLabel && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                          {vocabTypeLabel}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => speakJapaneseText(canonical || vocabWord, { rate: 0.95 })}
                        className="p-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/30 transition-colors shadow-2xs"
                        title="Nghe phát âm từ vựng"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 flex-wrap">
                    <span>Nghĩa tiếng Việt:</span>
                    <span className="font-bold text-foreground">
                      {wordMeaningVi ? wordMeaningVi : <UniversalFurigana text={promptText} fontSize="sm" />}
                    </span>
                  </div>

                  {/* Collocation Blueprint */}
                  {vocabCollocationJa && (
                    <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap text-xs">
                        <span className="text-[10px] font-extrabold uppercase text-violet-600 dark:text-violet-400">
                          🔗 Cụm Collocation:
                        </span>
                        <span className="font-bold font-jp text-foreground">
                          <UniversalFurigana text={vocabCollocationJa} fontSize="sm" />
                        </span>
                        {vocabCollocationVi && (
                          <span className="text-muted-foreground">({vocabCollocationVi})</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => speakJapaneseText(vocabCollocationJa, { rate: 0.95 })}
                        className="p-1 rounded-md bg-card border border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 shrink-0"
                        title="Nghe cụm collocation"
                      >
                        <Volume2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Example Sentence with Native TTS Shadowing */}
                {vocabExampleJa && (
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/70 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-primary" />
                        Câu ví dụ đàm thoại thực tế:
                      </span>
                      <button
                        type="button"
                        onClick={() => speakJapaneseText(vocabExampleJa, { rate: 0.95 })}
                        className="px-2 py-0.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[10px] font-bold flex items-center gap-1 transition-colors"
                        title="Nghe câu ví dụ để Shadowing"
                      >
                        <Volume2 className="h-3 w-3" />
                        Shadowing
                      </button>
                    </div>
                    <p className="text-sm font-bold font-jp text-foreground leading-relaxed">
                      <UniversalFurigana text={vocabExampleJa} fontSize="normal" />
                    </p>
                    {vocabExampleVi && (
                      <p className="text-xs text-muted-foreground font-medium">
                        {vocabExampleVi}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : isTransformation ? (
              <div className="space-y-2">
                {/* Visual Before -> After Diff Box */}
                <div className="p-3 rounded-2xl bg-card border border-border/80 space-y-2 shadow-2xs">
                  {/* Before */}
                  <div className="flex items-start gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-[10px] uppercase shrink-0 mt-0.5">
                      🔻 Câu gốc
                    </span>
                    <span className="font-bold font-jp text-muted-foreground text-sm leading-relaxed">
                      <UniversalFurigana text={transformSource || promptText} fontSize="normal" />
                    </span>
                  </div>

                  {/* After */}
                  <div className="flex items-start gap-2 text-xs pt-1 border-t border-border/50">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase shrink-0 mt-0.5">
                      🟢 Sau biến đổi
                    </span>
                    <span className="font-black font-jp text-primary text-base leading-relaxed">
                      <UniversalFurigana text={canonical || "—"} fontSize="normal" />
                    </span>
                  </div>
                </div>

                {/* Target & Formula badge if present */}
                {(transformTargetLabel || transformFormula) && (
                  <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    {transformTargetLabel && (
                      <span className="px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/25 text-primary font-bold text-[11px]">
                        ⚡ {transformTargetLabel}
                      </span>
                    )}
                    {transformFormula && (
                      <span className="px-2 py-0.5 rounded-lg bg-muted text-muted-foreground font-mono text-[11px]">
                        💡 {transformFormula}
                      </span>
                    )}
                  </div>
                )}

                {/* Grammar Note Takeaway */}
                {transformGrammarNote && (
                  <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl leading-relaxed">
                    💡 <strong>Điểm ngữ pháp:</strong> {transformGrammarNote}
                  </p>
                )}
              </div>
            ) : (
              /* Standard Big Japanese Canonical Text */
              <div className="rounded-xl bg-card/70 dark:bg-black/25 p-3.5 border border-border/70 text-center shadow-xs flex flex-col items-center justify-center min-h-[3.75rem]">
                <div className="text-2xl sm:text-3xl font-black font-jp text-primary tracking-tight leading-snug">
                  <UniversalFurigana text={canonical || "—"} fontSize="xl" />
                </div>
              </div>
            )}

            {/* Acceptable Variants if any */}
            {variants.length > 0 && variants[0] !== canonical && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-muted-foreground font-semibold">Các cách khác:</span>
                {variants.map((v, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-card border border-border text-xs font-bold font-jp text-foreground shadow-2xs"
                  >
                    <UniversalFurigana text={v} fontSize="sm" />
                  </span>
                ))}
              </div>
            )}
            </div>

            {isBlurred && (
              <div className="p-2 rounded-xl bg-primary/10 border border-dashed border-primary/30 text-center">
                <button
                  type="button"
                  onClick={() => setIsRevealed(true)}
                  className="text-xs font-bold text-primary inline-flex items-center gap-1.5 hover:underline cursor-pointer whitespace-nowrap"
                >
                  <Eye className="h-3.5 w-3.5 shrink-0" />
                  <span>Đáp án đang làm mờ — Bấm để xem trước</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. 6-Dimension Assessment Pills (Only Shown on Evaluation) */}
      {!isPending && result?.assessment && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span className="whitespace-nowrap">Phân tích 6 chiều (ReflexAssessment)</span>
          </span>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { label: "Accuracy", score: result?.assessment?.accuracy?.score ?? (isPending ? 90 : result?.score ?? 85), color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Reaction", score: result?.assessment?.reaction?.score ?? (isPending ? 85 : 70), color: "text-amber-600 dark:text-amber-400" },
              { label: "Context", score: result?.assessment?.context_fit?.score ?? (isPending ? 88 : 70), color: "text-sky-600 dark:text-sky-400" },
              { label: "Natural", score: result?.assessment?.naturalness?.score ?? (isPending ? 85 : 70), color: "text-purple-600 dark:text-purple-400" },
              { label: "Fluency", score: result?.assessment?.fluency?.score ?? (isPending ? 85 : 70), color: "text-indigo-600 dark:text-indigo-400" },
              { label: "Complete", score: result?.assessment?.completeness?.score ?? (isPending ? 90 : 85), color: "text-teal-600 dark:text-teal-400" },
            ].map((dim) => (
              <div
                key={dim.label}
                className="p-2 rounded-xl bg-card border border-border/80 text-center shadow-xs"
              >
                <div className="text-[10px] font-bold tracking-tight text-muted-foreground whitespace-nowrap">{dim.label}</div>
                <div className={cn("text-xs font-black font-mono mt-0.5 whitespace-nowrap", dim.color)}>
                  {Math.round(dim.score)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Action Buttons Strip */}
      {!isPending && result ? (
        <div className="flex items-center gap-2 pt-1 shrink-0 overflow-x-auto">
          <Button
            size="md"
            variant="akane"
            className="flex-1 font-black text-xs sm:text-sm h-10 rounded-xl gap-1.5 shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-blue-600 via-primary to-indigo-600 text-white cursor-pointer ring-2 ring-primary/25 whitespace-nowrap shrink-0"
            onClick={() => {
              stopWebSpeech();
              onNext?.();
            }}
          >
            <span>Câu Tiếp Theo</span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/20 text-white font-bold">Space / ↵</kbd>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Button>

          <Button
            size="md"
            variant="outline"
            className="h-10 px-3 rounded-xl gap-1.5 font-bold text-xs border-border cursor-pointer whitespace-nowrap shrink-0"
            onClick={() => {
              stopWebSpeech();
              onRetry?.();
            }}
            title="Luyện tập lại câu này (Phím R)"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            <span>Làm lại</span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground font-bold ml-0.5">R</kbd>
          </Button>

          <Button
            size="md"
            variant="outline"
            className="h-10 px-3 rounded-xl gap-1.5 font-bold text-xs border-primary/30 text-primary hover:bg-primary/10 cursor-pointer whitespace-nowrap shrink-0"
            onClick={handlePlayModelTTS}
            title="Nghe lại phát âm mẫu (Phím A)"
          >
            <Volume2 className={cn("h-3.5 w-3.5 text-primary shrink-0", isTTSPlaying && "animate-bounce")} />
            <span>{isTTSPlaying ? "Đang đọc..." : "Nghe mẫu"}</span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 border border-primary/25 text-primary font-bold ml-0.5">A</kbd>
          </Button>

          {isTimeout && (
            <Button
              size="md"
              variant="ghost"
              className="h-10 px-2.5 rounded-xl text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 gap-1 font-bold text-xs cursor-pointer whitespace-nowrap shrink-0"
              onClick={() => {
                stopWebSpeech();
                onSlowMode?.();
              }}
            >
              <Sliders className="h-3.5 w-3.5 shrink-0" />
              <span>Giảm độ khó</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs text-muted-foreground p-2 rounded-xl bg-muted/30 border border-border/60 shrink-0 gap-2">
          <span className="flex items-center gap-1.5 font-medium text-[11px] whitespace-nowrap overflow-hidden text-ellipsis">
            <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>Nói xong hãy bấm <strong>Nộp câu</strong> hoặc phím <strong>Enter</strong> ở cột Mic</span>
          </span>
          {onSkip && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 rounded-lg text-[11px] font-bold border-border text-foreground hover:bg-muted cursor-pointer shrink-0 whitespace-nowrap gap-1"
              onClick={onSkip}
              title="Bỏ qua và chuyển sang bài tiếp theo không cần nộp bài (Phím →)"
            >
              <span>Qua bài</span>
              <ArrowRight className="h-3 w-3 text-primary" />
              <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-muted border border-border text-muted-foreground font-bold">→</kbd>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

