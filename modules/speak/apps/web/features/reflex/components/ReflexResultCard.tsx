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
  Eye,
  EyeOff,
} from "lucide-react";
import type { ReflexResult, ReflexExercise } from "../services/reflex-api";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import {
  claimSpeechOutput,
  releaseSpeechOutput,
  type SpeechOutputOwner,
} from "@/features/audio/services/speech-playback-coordinator";
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
  const userAudioOwnerRef = useRef<SpeechOutputOwner | null>(null);

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
  const isBlurred = isPending && !isRevealed;

  // Resolve Canonical Answer & Vocabulary Context
  const isVocab = exercise?.exercise_type === "reflex_vocabulary" || result?.direction !== undefined;
  const isKeigoVocab = exercise?.exercise_type === "reflex_keigo_vocab";
  const rc = exercise?.extra_metadata?.reflex_config || {};
  const promptText = result?.promptText || rc.prompt || exercise?.prompt || "";
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
  const keigoFormula = rc.formula || exercise?.formula || "";
  const keigoExampleJa = rc.example_ja || exercise?.exampleJa || result?.exampleJa || "";
  const keigoExampleVi = rc.example_vi || exercise?.exampleVi || result?.exampleVi || "";

  const isTransformation = exercise?.exercise_type === "reflex_transformation" || rc.sub_mode === "reflex_transformation";
  const transformSource = exercise?.source || rc.source || promptText || "";
  const transformTargetLabel = exercise?.targetLabel || rc.target_label || rc.targetLabel || exercise?.task || rc.task || "";
  const transformFormula = exercise?.formula || rc.formula || "";
  const transformGrammarNote = exercise?.grammarNote || rc.grammar_note || rc.grammarNote || "";

  const isContext = exercise?.exercise_type === "reflex_context" || rc.sub_mode === "reflex_context";
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
      if (userAudioOwnerRef.current) {
        releaseSpeechOutput(userAudioOwnerRef.current);
        userAudioOwnerRef.current = null;
      }
      setIsUserAudioPlaying(false);
    } else {
      stopWebSpeech();
      setIsTTSPlaying(false);
      const el = userAudioRef.current;
      // Single-flight: cut any other speech before playing this recording.
      const owner: SpeechOutputOwner = {
        stop: () => {
          try {
            el.pause();
          } catch {}
          setIsUserAudioPlaying(false);
        },
      };
      userAudioOwnerRef.current = owner;
      claimSpeechOutput(owner);
      el.play().then(() => {
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
        "rounded-3xl border p-3 sm:p-3.5 shadow-lg transition-all animate-in fade-in zoom-in-95 duration-200 washi-texture h-full flex flex-col justify-between overflow-hidden gap-2",
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
            if (userAudioOwnerRef.current) {
              releaseSpeechOutput(userAudioOwnerRef.current);
              userAudioOwnerRef.current = null;
            }
            setIsUserAudioPlaying(false);
            setUserAudioCurrentTime(0);
          }}
          onError={() => setIsUserAudioPlaying(false)}
        />
      )}

      {/* 1. COMPACT STUDIO TOP BAR: Status, Score, Latency & Quick Actions */}
      <div className="flex items-center justify-between gap-2 shrink-0 pb-1 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-2xs whitespace-nowrap shrink-0",
              statusConfig.badgeClass
            )}
          >
            {statusConfig.icon}
            <span>{statusConfig.label}</span>
          </span>

          {!isPending && result?.score != null && (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-black border shadow-2xs whitespace-nowrap shrink-0",
                statusConfig.badgeClass
              )}
            >
              <span>{result.score.toFixed(0)}</span>
              <span className="text-[10px] font-normal opacity-80">/100</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isPending && latency != null ? (
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-muted/60 border border-border/60 shrink-0">
              <Zap className="h-3 w-3 text-amber-500" />
              <span>{Math.round(latency)}ms</span>
              <span className="text-muted-foreground font-normal text-[10px]">
                / {timerLimit > 0 ? `${timerLimit / 1000}s` : "∞"}
              </span>
            </div>
          ) : isPending ? (
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-muted-foreground px-2 py-0.5 rounded-full bg-muted/40 border border-border/40 shrink-0">
              <Clock className="h-3 w-3 text-primary animate-pulse" />
              <span>Chờ phản xạ...</span>
            </div>
          ) : null}

          {isPending && (
            <button
              type="button"
              onClick={() => setIsRevealed((v) => !v)}
              className="text-[10px] px-2 py-0.5 rounded-full bg-card/80 border border-primary/30 text-primary font-bold hover:bg-primary/10 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-2xs"
              title={isRevealed ? "Làm mờ đáp án (Phím V)" : "Xem trước đáp án mẫu (Phím V)"}
            >
              {isRevealed ? (
                <>
                  <EyeOff className="h-3 w-3 shrink-0" />
                  <span>Mờ</span>
                  <kbd className="text-[9px] font-mono px-1 rounded bg-primary/10 border border-primary/25 font-bold">V</kbd>
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3 shrink-0" />
                  <span>Xem</span>
                  <kbd className="text-[9px] font-mono px-1 rounded bg-primary/10 border border-primary/25 font-bold">V</kbd>
                </>
              )}
            </button>
          )}

          {ttsText && (
            <button
              type="button"
              onClick={handlePlayModelTTS}
              className="p-1 px-2 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 shrink-0 shadow-2xs transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer whitespace-nowrap"
              title="Nghe phát âm chuẩn của câu mẫu (Phím A)"
            >
              <Volume2 className={cn("h-3 w-3 shrink-0", isTTSPlaying && "animate-bounce")} />
              <span>{isTTSPlaying ? "Đang đọc..." : "Nghe mẫu"}</span>
              <kbd className="text-[9px] font-mono px-1 rounded bg-primary/15 border border-primary/25 text-primary font-bold ml-0.5">A</kbd>
            </button>
          )}
        </div>
      </div>

      {/* 2. USER VOICE STRIP: Compact Horizontal Banner */}
      <div className="px-3 py-2 rounded-2xl bg-card/90 dark:bg-black/30 border border-border/80 shadow-2xs flex items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="p-1 rounded-md bg-primary/10 text-primary">
            <Mic className="h-3.5 w-3.5" />
          </span>
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground hidden sm:inline">
            {isPending ? "Bạn nói" : "Bạn đã nói"}:
          </span>
        </div>

        <div className="flex-1 min-w-0 px-1 text-left">
          {isPending ? (
            liveTranscript ? (
              <span className="text-sm sm:text-base font-bold font-jp text-foreground block truncate">
                <UniversalFurigana text={liveTranscript} fontSize="sm" />
              </span>
            ) : (
              <span className="text-xs text-muted-foreground italic font-sans flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary animate-ping shrink-0" />
                Đang lắng nghe giọng bạn...
              </span>
            )
          ) : result?.transcript ? (
            <span className="text-sm sm:text-base font-bold font-jp text-foreground block truncate">
              <UniversalFurigana text={result.transcript} fontSize="sm" />
            </span>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              {isTimeout ? "Hết giờ (chưa ghi nhận âm thanh)" : "Không có âm thanh thu âm"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isPending && result?.isWhisperRescued ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold shrink-0">
              Whisper AI
            </span>
          ) : null}

          {!isPending && result?.userAudioUrl && (
            <div className="flex items-center gap-1.5 bg-muted/60 px-2 py-1 rounded-xl border border-border/60 shadow-2xs">
              <button
                type="button"
                onClick={togglePlayUserAudio}
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0",
                  isUserAudioPlaying
                    ? "bg-primary text-white animate-pulse ring-2 ring-primary/30"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                )}
                title={isUserAudioPlaying ? "Tạm dừng audio của bạn" : "Nghe lại giọng nói của bạn"}
              >
                {isUserAudioPlaying ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3 fill-current ml-0.5" />
                )}
              </button>
              <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                {formatAudioTime(userAudioCurrentTime)} / {formatAudioTime(userAudioDuration || 0)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. MODEL ANSWER DECK: Full Width, High-Density Zero-Scroll Studio Deck */}
      <div
        className={cn(
          "flex-1 min-h-0 flex flex-col justify-between rounded-2xl bg-primary/[0.02] dark:bg-primary/[0.04] border border-primary/20 p-2.5 sm:p-3 relative overflow-hidden transition-all duration-300",
          isBlurred && "filter blur-sm select-none pointer-events-none"
        )}
      >
        {/* SUB-MODE BRANCH 1: SPEED Q&A & CONTEXT (Compact 3-Row Multi-Angle List) */}
        {(isQna || isContext) && effectiveMultiAnswers ? (
          <div className="flex flex-col justify-between h-full gap-1.5">
            <div className="flex items-center justify-between pb-1 border-b border-primary/15">
              <span className="text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>{isContext ? "3 Hướng Phản Hồi Thực Tế:" : "3 Hướng Trả Lời Đa Chiều:"}</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold">Bấm 🔈 để Shadowing</span>
            </div>

            {/* Row 1: Positive */}
            {effectiveMultiAnswers.positive && (
              <div className="p-2 rounded-xl bg-emerald-500/8 hover:bg-emerald-500/12 border border-emerald-500/20 transition-all flex items-center justify-between gap-2 text-left shadow-2xs">
                <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shrink-0 self-start sm:self-auto">
                    {isContext ? "🟢 Khẳng định" : "🟢 Tích cực"}
                  </span>
                  <span className="text-xs sm:text-sm font-bold font-jp text-foreground truncate">
                    <UniversalFurigana text={effectiveMultiAnswers.positive.ja} fontSize="sm" />
                  </span>
                  {effectiveMultiAnswers.positive.vi && (
                    <span className="text-[11px] text-muted-foreground truncate shrink-0">
                      ({effectiveMultiAnswers.positive.vi})
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => speakJapaneseText(effectiveMultiAnswers.positive.ja, { rate: 0.95 })}
                  className="p-1 rounded-lg bg-card border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 shrink-0 shadow-2xs transition-colors cursor-pointer"
                  title="Nghe câu trả lời khẳng định"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Row 2: Negative / Refusal */}
            {(effectiveMultiAnswers.negative || (effectiveMultiAnswers as any).negotiation) && (
              <div className="p-2 rounded-xl bg-rose-500/8 hover:bg-rose-500/12 border border-rose-500/20 transition-all flex items-center justify-between gap-2 text-left shadow-2xs">
                <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 shrink-0 self-start sm:self-auto">
                    {isContext ? "🟡 Từ chối khéo" : "🔴 Phủ định"}
                  </span>
                  <span className="text-xs sm:text-sm font-bold font-jp text-foreground truncate">
                    <UniversalFurigana
                      text={(effectiveMultiAnswers as any).negotiation?.ja || effectiveMultiAnswers.negative?.ja}
                      fontSize="sm"
                    />
                  </span>
                  {((effectiveMultiAnswers as any).negotiation?.vi || effectiveMultiAnswers.negative?.vi) && (
                    <span className="text-[11px] text-muted-foreground truncate shrink-0">
                      ({(effectiveMultiAnswers as any).negotiation?.vi || effectiveMultiAnswers.negative?.vi})
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    speakJapaneseText(
                      (effectiveMultiAnswers as any).negotiation?.ja || effectiveMultiAnswers.negative?.ja,
                      { rate: 0.95 }
                    )
                  }
                  className="p-1 rounded-lg bg-card border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 shrink-0 shadow-2xs transition-colors cursor-pointer"
                  title="Nghe câu trả lời từ chối/đàm phán"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Row 3: Extended */}
            {effectiveMultiAnswers.extended && (
              <div className="p-2 rounded-xl bg-indigo-500/8 hover:bg-indigo-500/12 border border-indigo-500/20 transition-all flex items-center justify-between gap-2 text-left shadow-2xs">
                <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 shrink-0 self-start sm:self-auto">
                    {isContext ? "🔵 Mở rộng" : "🔵 Mở rộng lý do"}
                  </span>
                  <span className="text-xs sm:text-sm font-bold font-jp text-foreground truncate">
                    <UniversalFurigana text={effectiveMultiAnswers.extended.ja} fontSize="sm" />
                  </span>
                  {effectiveMultiAnswers.extended.vi && (
                    <span className="text-[11px] text-muted-foreground truncate shrink-0">
                      ({effectiveMultiAnswers.extended.vi})
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => speakJapaneseText(effectiveMultiAnswers.extended.ja, { rate: 0.95 })}
                  className="p-1 rounded-lg bg-card border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 shrink-0 shadow-2xs transition-colors cursor-pointer"
                  title="Nghe câu trả lời mở rộng"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Cultural Note Takeaway */}
            {isContext && contextCulturalNote && (
              <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-left text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-1.5 shrink-0">
                <span className="font-bold text-amber-600 dark:text-amber-400 shrink-0">💡 Văn hóa:</span>
                <span className="truncate">{contextCulturalNote}</span>
              </div>
            )}
          </div>
        ) : isKeigoVocab ? (
          /* SUB-MODE BRANCH 2: KEIGO WORD BLITZ */
          <div className="flex flex-col justify-between h-full gap-2 text-left">
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-primary/15 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                    keigoTargetType === "sonkeigo"
                      ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400"
                      : keigoTargetType === "kenjougo"
                      ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                      : "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {keigoTargetLabel}
                </span>
                {rc.jlpt_level && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                    JLPT {rc.jlpt_level}
                  </span>
                )}
                {keigoFormula && (
                  <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
                    • Công thức: <strong className="text-foreground">{keigoFormula}</strong>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => speakJapaneseText(canonical, { rate: 0.95 })}
                className="p-1 px-2 rounded-lg bg-card border border-border/80 text-foreground hover:bg-muted shrink-0 shadow-2xs transition-colors flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                title="Nghe từ kính ngữ"
              >
                <Volume2 className="h-3 w-3 text-primary" />
                <span>Nghe từ</span>
              </button>
            </div>

            {/* Triplet Grid (3 thể ngang hàng) */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-muted/40 border border-border/70 space-y-0.5">
                <span className="text-[9px] font-bold text-muted-foreground block">Từ gốc (Plain)</span>
                <p className="font-bold font-jp text-foreground text-sm truncate">
                  <UniversalFurigana text={promptText} fontSize="sm" />
                </p>
                {wordMeaningVi && <p className="text-[10px] text-muted-foreground truncate">{wordMeaningVi}</p>}
              </div>

              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-0.5">
                <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 block">
                  👑 Tôn kính (Sếp/Khách)
                </span>
                <p className="font-black font-jp text-amber-800 dark:text-amber-200 text-sm truncate">
                  {tripletSonkeigo ? <UniversalFurigana text={tripletSonkeigo} fontSize="sm" /> : canonical || "—"}
                </p>
              </div>

              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/25 space-y-0.5">
                <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300 block">
                  🙇 Khiêm nhường (Mình)
                </span>
                <p className="font-black font-jp text-indigo-800 dark:text-indigo-200 text-sm truncate">
                  {tripletKenjougo ? <UniversalFurigana text={tripletKenjougo} fontSize="sm" /> : "—"}
                </p>
              </div>
            </div>

            {/* Business Example Sentence with Native TTS */}
            {keigoExampleJa && (
              <div className="p-2 rounded-xl bg-muted/30 border border-border/70 flex items-center justify-between gap-2 shadow-2xs">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    <span>💬 Ví dụ công sở:</span>
                  </div>
                  <p className="text-xs font-bold font-jp text-foreground truncate">
                    <UniversalFurigana text={keigoExampleJa} fontSize="sm" />
                  </p>
                  {keigoExampleVi && (
                    <p className="text-[10px] text-muted-foreground truncate">{keigoExampleVi}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => speakJapaneseText(keigoExampleJa, { rate: 0.95 })}
                  className="px-2 py-1 rounded-lg bg-card border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 text-[10px] font-bold shadow-2xs transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                  title="Nghe câu ví dụ"
                >
                  <Volume2 className="h-3 w-3" />
                  <span>Shadowing</span>
                </button>
              </div>
            )}
          </div>
        ) : isVocab ? (
          /* SUB-MODE BRANCH 3: VOCABULARY RECALL */
          <div className="flex flex-col justify-between h-full gap-2 text-left">
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-primary/15">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg sm:text-xl font-black font-jp text-primary leading-tight">
                  <UniversalFurigana text={canonical || vocabWord || "—"} fontSize="lg" />
                </span>
                <span className="text-xs font-bold text-foreground">
                  = {wordMeaningVi ? wordMeaningVi : <UniversalFurigana text={promptText} fontSize="sm" />}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {((exercise as any)?.rank || rc.rank) && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 border border-amber-500/30">
                    Top #{(exercise as any)?.rank || rc.rank}
                  </span>
                )}
                {vocabTypeLabel && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600 border border-violet-500/20">
                    {vocabTypeLabel}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => speakJapaneseText(canonical || vocabWord, { rate: 0.95 })}
                  className="p-1 rounded-lg bg-card border border-border text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title="Nghe từ vựng"
                >
                  <Volume2 className="h-3.5 w-3.5 text-primary" />
                </button>
              </div>
            </div>

            {/* Collocation Strip */}
            {vocabCollocationJa && (
              <div className="p-2 rounded-xl bg-violet-500/8 border border-violet-500/20 flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs truncate">
                  <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 shrink-0">
                    🔗 Cụm Collocation:
                  </span>
                  <span className="font-bold font-jp text-foreground truncate">
                    <UniversalFurigana text={vocabCollocationJa} fontSize="sm" />
                  </span>
                  {vocabCollocationVi && (
                    <span className="text-muted-foreground truncate">({vocabCollocationVi})</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => speakJapaneseText(vocabCollocationJa, { rate: 0.95 })}
                  className="p-1 rounded-md bg-card border border-violet-500/30 text-violet-600 hover:bg-violet-500/20 shrink-0 cursor-pointer"
                  title="Nghe cụm collocation"
                >
                  <Volume2 className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Example sentence strip */}
            {vocabExampleJa && (
              <div className="p-2 rounded-xl bg-muted/30 border border-border/70 flex items-center justify-between gap-2 shadow-2xs">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground block">💬 Ví dụ thực tế:</span>
                  <p className="text-xs font-bold font-jp text-foreground truncate">
                    <UniversalFurigana text={vocabExampleJa} fontSize="sm" />
                  </p>
                  {vocabExampleVi && <p className="text-[10px] text-muted-foreground truncate">{vocabExampleVi}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => speakJapaneseText(vocabExampleJa, { rate: 0.95 })}
                  className="px-2 py-1 rounded-lg bg-card border border-primary/20 text-primary text-[10px] font-bold shrink-0 flex items-center gap-1 cursor-pointer"
                  title="Nghe ví dụ"
                >
                  <Volume2 className="h-3 w-3" />
                  <span>Shadowing</span>
                </button>
              </div>
            )}
          </div>
        ) : isTransformation ? (
          /* SUB-MODE BRANCH 4: SENTENCE TRANSFORMATION */
          <div className="flex flex-col justify-between h-full gap-2 text-left">
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-primary/15">
              <span className="text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" />
                <span>Biến Đổi Câu Chuẩn</span>
              </span>
              {(transformTargetLabel || transformFormula) && (
                <div className="flex items-center gap-1.5 text-xs">
                  {transformTargetLabel && (
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/25 text-primary font-bold text-[10px]">
                      {transformTargetLabel}
                    </span>
                  )}
                  {transformFormula && (
                    <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px]">
                      {transformFormula}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Before vs After Horizontal Flow */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-rose-500/8 border border-rose-500/20 space-y-1">
                <span className="text-[9px] font-bold uppercase text-rose-600 dark:text-rose-400 block">🔻 Câu gốc</span>
                <p className="font-bold font-jp text-foreground text-sm">
                  <UniversalFurigana text={transformSource || promptText} fontSize="sm" />
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20 space-y-1">
                <span className="text-[9px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block">🟢 Sau biến đổi</span>
                <p className="font-black font-jp text-primary text-sm">
                  <UniversalFurigana text={canonical || "—"} fontSize="sm" />
                </p>
              </div>
            </div>

            {transformGrammarNote && (
              <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-left text-[11px] text-amber-800 dark:text-amber-200 truncate">
                💡 <strong>Ngữ pháp:</strong> {transformGrammarNote}
              </div>
            )}
          </div>
        ) : (
          /* SUB-MODE BRANCH 5: STANDARD / CONJUGATION BLITZ */
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            {targetLabel && (
              <span className="text-[11px] font-bold px-3 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 inline-flex items-center gap-1">
                <Zap className="h-3 w-3" />
                <span>{targetLabel}</span>
              </span>
            )}

            <div className="text-2xl sm:text-3xl font-black font-jp text-primary tracking-tight leading-snug">
              <UniversalFurigana text={canonical || "—"} fontSize="xl" />
            </div>

            {variants.length > 0 && variants[0] !== canonical && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs">
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
        )}
      </div>

      {/* 4. COMPACT 6-DIMENSION ASSESSMENT STRIP (Single Line Ribbon) */}
      {!isPending && result?.assessment && (
        <div className="flex items-center justify-between gap-1 px-2.5 py-1 rounded-xl bg-card/80 dark:bg-black/30 border border-border/70 shadow-2xs shrink-0">
          {[
            {
              label: "Chuẩn xác",
              key: "accuracy",
              score: result?.assessment?.accuracy?.score ?? result?.score ?? 85,
              color: "text-emerald-600 dark:text-emerald-400",
            },
            {
              label: "Tốc độ",
              key: "reaction",
              score: result?.assessment?.reaction?.score ?? 70,
              color: "text-amber-600 dark:text-amber-400",
            },
            {
              label: "Ngữ cảnh",
              key: "context",
              score: result?.assessment?.context_fit?.score ?? 70,
              color: "text-sky-600 dark:text-sky-400",
            },
            {
              label: "Tự nhiên",
              key: "natural",
              score: result?.assessment?.naturalness?.score ?? 70,
              color: "text-purple-600 dark:text-purple-400",
            },
            {
              label: "Trôi chảy",
              key: "fluency",
              score: result?.assessment?.fluency?.score ?? 70,
              color: "text-indigo-600 dark:text-indigo-400",
            },
            {
              label: "Đầy đủ",
              key: "complete",
              score: result?.assessment?.completeness?.score ?? 85,
              color: "text-teal-600 dark:text-teal-400",
            },
          ].map((dim) => (
            <div key={dim.key} className="flex-1 flex items-center justify-center gap-1 min-w-0 text-[11px] font-bold">
              <span className="text-[10px] text-muted-foreground font-medium truncate">{dim.label}</span>
              <span className={cn("font-mono font-black", dim.color)}>{Math.round(dim.score)}</span>
            </div>
          ))}
        </div>
      )}

      {/* 5. PINNED ACTION FOOTER: Buttons are always visible at bottom */}
      {!isPending && result ? (
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
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
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/20 text-white font-bold">
              Space / ↵
            </kbd>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Button>

          <Button
            size="md"
            variant="outline"
            className="h-10 px-3 rounded-xl gap-1 font-bold text-xs border-border cursor-pointer whitespace-nowrap shrink-0"
            onClick={() => {
              stopWebSpeech();
              onRetry?.();
            }}
            title="Luyện tập lại câu này (Phím R)"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            <span>Làm lại</span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground font-bold ml-0.5">
              R
            </kbd>
          </Button>

          <Button
            size="md"
            variant="outline"
            className="h-10 px-3 rounded-xl gap-1 font-bold text-xs border-primary/30 text-primary hover:bg-primary/10 cursor-pointer whitespace-nowrap shrink-0"
            onClick={handlePlayModelTTS}
            title="Nghe lại phát âm mẫu (Phím A)"
          >
            <Volume2 className={cn("h-3.5 w-3.5 text-primary shrink-0", isTTSPlaying && "animate-bounce")} />
            <span>{isTTSPlaying ? "Đang đọc..." : "Nghe mẫu"}</span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 border border-primary/25 text-primary font-bold ml-0.5">
              A
            </kbd>
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
              <span>Giảm áp lực</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs text-muted-foreground p-2 rounded-xl bg-muted/30 border border-border/60 shrink-0 gap-2">
          <span className="flex items-center gap-1.5 font-medium text-[11px] whitespace-nowrap overflow-hidden text-ellipsis">
            <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>
              Nói xong hãy bấm <strong>Nộp câu</strong> hoặc phím <strong>Enter</strong> ở cột Mic
            </span>
          </span>
          {onSkip && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 rounded-lg text-[11px] font-bold border-border text-foreground hover:bg-muted cursor-pointer shrink-0 whitespace-nowrap gap-1"
              onClick={onSkip}
              title="Bỏ qua và chuyển sang bài tiếp theo (Phím →)"
            >
              <span>Qua bài</span>
              <ArrowRight className="h-3 w-3 text-primary" />
              <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-muted border border-border text-muted-foreground font-bold">
                →
              </kbd>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
