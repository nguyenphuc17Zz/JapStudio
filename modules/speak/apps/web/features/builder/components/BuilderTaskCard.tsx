"use client";

import React, { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Target,
  Volume2,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Lightbulb,
  Layers,
  BookOpen,
} from "lucide-react";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { ExerciseSourceBadge } from "@/components/ui/exercise-source-badge";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { BuilderExercise, BuilderControlLevel } from "../services/builder-api";

interface BuilderTaskCardProps {
  exercise: BuilderExercise | null;
  currentTaskIndex: number;
  onNextTask?: () => void;
  isGeneratingNext?: boolean;
  onRegenerateWithAI?: () => void;
  isRegeneratingAI?: boolean;
  onPlayPrompt?: () => void;
  onInsertVocab?: (term: string) => void;
}

export function BuilderTaskCard({
  exercise,
  currentTaskIndex,
  onNextTask,
  isGeneratingNext = false,
  onRegenerateWithAI,
  isRegeneratingAI = false,
  onPlayPrompt,
  onInsertVocab,
}: BuilderTaskCardProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingTerm, setPlayingTerm] = useState<string | null>(null);

  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Đã sao chép: " + text);
      setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 1500);
    } catch {
      toast.error("Không thể sao chép. Vui lòng bôi đen chuột và nhấn Ctrl+C.");
    }
  }, []);

  const handlePlayVocab = (term: string) => {
    try {
      stopWebSpeech();
      setPlayingTerm(term);
      speakJapaneseText(term, {
        rate: 0.9,
        onEnd: () => setPlayingTerm(null),
        onError: () => setPlayingTerm(null),
      });
    } catch {
      setPlayingTerm(null);
    }
  };

  if (!exercise) return null;

  const getLevelBadge = (level: BuilderControlLevel) => {
    switch (level) {
      case "controlled":
        return {
          label: "Khung mẫu (Controlled)",
          color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        };
      case "semi_controlled":
        return {
          label: "Từ khóa (Semi-Controlled)",
          color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
        };
      case "free":
        return {
          label: "Tự do (Free)",
          color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
        };
      default:
        return {
          label: "Lắp ghép",
          color: "bg-primary/10 text-primary border-primary/30",
        };
    }
  };

  const levelInfo = getLevelBadge(exercise.controlLevel);
  const promptText = exercise.promptVi || exercise.situationVi || exercise.instructions || "Hãy xây một câu nói hoàn chỉnh";

  // Filter or build suggested vocabulary items
  const vocabItems = exercise.suggestedVocabulary && exercise.suggestedVocabulary.length > 0
    ? exercise.suggestedVocabulary
    : (exercise.keywords || []).map((k) => ({ term: k, reading: "", meaningVi: "" }));

  return (
    <div className="h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl shadow-lg p-3.5 sm:p-4 overflow-hidden gap-2.5">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="size-2 rounded-full bg-primary animate-pulse shrink-0" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
            1. Đề Bài & Tình Huống
          </span>
          <Badge variant="outline" className={cn("text-[10px] font-mono px-1.5 py-0 border", levelInfo.color)}>
            {levelInfo.label}
          </Badge>
          <ExerciseSourceBadge source={exercise.generationSource} isFallback={exercise.isFallback} />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onRegenerateWithAI && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRegenerateWithAI}
              disabled={isRegeneratingAI || isGeneratingNext}
              className="h-6 px-1.5 text-[10px] gap-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
              title="Yêu cầu AI đổi tình huống mới (Alt+R)"
            >
              <Sparkles className={cn("size-2.5 text-emerald-500", isRegeneratingAI && "animate-spin")} />
              <span className="hidden sm:inline">{isRegeneratingAI ? "Đang tạo..." : "Đổi câu AI"}</span>
            </Button>
          )}

          {onNextTask && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNextTask}
              disabled={isGeneratingNext}
              className="h-6 px-2 rounded-lg text-[10px] font-bold text-primary border-primary/30 hover:bg-primary/10 gap-1 shrink-0 cursor-pointer shadow-2xs"
              title="Đổi bài tiếp theo (Phím R)"
            >
              <span>Tiếp theo</span>
              <ArrowRight className="size-2.5" />
            </Button>
          )}

          <span className="text-[10px] font-mono text-muted-foreground ml-1">
            #{currentTaskIndex + 1}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 min-h-0">
        {/* Vietnamese Conversation Prompt */}
        <div className="p-3 rounded-2xl bg-muted/30 border border-border/70 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
              <Target className="size-3" />
              <span>Mục tiêu diễn đạt:</span>
            </span>
            <button
              type="button"
              onClick={() => handleCopy(promptText, "prompt-vi")}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/60 cursor-pointer transition-colors"
              title="Sao chép tình huống"
            >
              {copiedId === "prompt-vi" ? (
                <Check className="size-3 text-emerald-500" />
              ) : (
                <Copy className="size-3" />
              )}
            </button>
          </div>

          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground leading-snug select-text cursor-text">
            "{promptText}"
          </h2>

          {exercise.relation && (
            <div className="pt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground/80">Đối tượng:</span>
              <span>{exercise.relation === "business_polite" ? "Lịch sự trang trọng (Kính ngữ / Desu-Masu)" : "Bạn bè thân mật (Thể thông thường / Thân thiện)"}</span>
            </div>
          )}
        </div>

        {/* Source sentence or Starter (if available) */}
        {(exercise.sourceSentence || exercise.starter) && (
          <div className="p-2.5 rounded-2xl bg-card border border-border/80 text-xs flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-muted-foreground text-[10px] uppercase shrink-0">
                {exercise.starter ? "Gợi ý mở đầu:" : "Câu gốc:"}
              </span>
              <span className="font-jp text-primary font-bold truncate select-text cursor-text">
                <UniversalFurigana text={exercise.starter || exercise.sourceSentence || ""} fontSize="sm" />
              </span>
            </div>
            {onPlayPrompt && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onPlayPrompt}
                className="h-6 text-[10px] rounded-lg font-semibold gap-1 px-2 border border-border/60 hover:bg-primary/10 shrink-0"
                title="Nghe phát âm mở đầu"
              >
                <Volume2 className="size-3" />
                <span>Nghe</span>
              </Button>
            )}
          </div>
        )}

        {/* Suggested Vocabulary & Collocations Chips */}
        {vocabItems.length > 0 && (
          <div className="p-2.5 rounded-2xl bg-sky-500/5 border border-sky-500/20 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 flex items-center gap-1">
                <Lightbulb className="size-3 text-sky-500" />
                <span>Từ khóa & Cụm diễn đạt (Bấm để nghe hoặc chèn):</span>
              </span>
              <span className="text-[9px] text-muted-foreground font-mono">
                Click = Nghe & Chèn
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {vocabItems.map((vocab, idx) => (
                <div
                  key={idx}
                  className="group inline-flex items-center rounded-xl bg-card border border-sky-500/30 hover:border-sky-500/70 hover:bg-sky-500/10 transition-all text-xs font-medium text-foreground shadow-2xs overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => handlePlayVocab(vocab.term)}
                    className="p-1.5 text-sky-500 hover:text-sky-600 hover:bg-sky-500/15 transition-colors cursor-pointer"
                    title={`Nghe phát âm "${vocab.term}"`}
                  >
                    <Volume2 className={cn("size-3", playingTerm === vocab.term && "animate-bounce text-primary")} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onInsertVocab?.(vocab.term)}
                    className="px-2 py-1 flex items-center gap-1 text-left cursor-pointer hover:bg-sky-500/15 transition-colors"
                    title={`Chèn "${vocab.term}" vào câu đang ghép`}
                  >
                    <span className="font-bold font-jp text-foreground">
                      <UniversalFurigana text={vocab.term} fontSize="sm" />
                    </span>
                    {vocab.meaningVi && (
                      <span className="text-muted-foreground text-[10px] font-sans">
                        ({vocab.meaningVi})
                      </span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground shrink-0 font-mono">
        <div className="flex items-center gap-1.5">
          <BookOpen className="size-3 text-primary" />
          <span>Kỹ năng: <strong className="text-foreground">{exercise.focusSkill}</strong></span>
        </div>
        <span>Độ khó: {exercise.difficulty || "Normal"}</span>
      </div>
    </div>
  );
}
