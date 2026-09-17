"use client";

import React, { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Zap,
  Volume2,
  ChevronDown,
  Copy,
  Check,
  BookOpen,
} from "lucide-react";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { BuilderExercise } from "../services/builder-api";

interface BuilderContextCardProps {
  exercise: BuilderExercise | null;
  currentHintTier?: 1 | 2 | 3 | 4;
  onSelectHintTier?: (tier: 1 | 2 | 3 | 4) => void;
}

export function BuilderContextCard({
  exercise,
  currentHintTier = 1,
  onSelectHintTier,
}: BuilderContextCardProps) {
  const [isPlayingFullSentence, setIsPlayingFullSentence] = useState(false);
  const [isHintsExpanded, setIsHintsExpanded] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  if (!exercise) return null;

  // Resolve full model sentence for audio and reference
  const fullModelSentence = (exercise.canonical || exercise.template || "").replace(/_{2,}/g, "、").trim();

  const handlePlayFullSentence = () => {
    if (!fullModelSentence) return;
    try {
      stopWebSpeech();
      setIsPlayingFullSentence(true);
      speakJapaneseText(fullModelSentence, {
        rate: 0.92,
        onEnd: () => setIsPlayingFullSentence(false),
        onError: () => setIsPlayingFullSentence(false),
      });
      setTimeout(() => setIsPlayingFullSentence(false), 3500);
    } catch {
      setIsPlayingFullSentence(false);
    }
  };

  const hints = exercise.hints && exercise.hints.length > 0 ? exercise.hints : [
    { tier: 1 as const, title: "Hướng tư duy ngữ pháp", content: `Trọng tâm: ${exercise.focusSkill}. Hãy chia đúng thể để kết nối các vế câu.` },
    { tier: 2 as const, title: "Gợi ý trợ từ / từ nối", content: `Chú ý trợ từ nối và thể chia phù hợp cho ${exercise.focusSkill}.` },
    { tier: 3 as const, title: "Khung sườn cấu trúc", content: exercise.template || (exercise.keywords || []).join(" … ") },
    { tier: 4 as const, title: "Câu mẫu hoàn chỉnh", content: exercise.canonical || "" },
  ];

  return (
    <div className="h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl shadow-lg p-3.5 sm:p-4 overflow-hidden gap-2.5">
      {/* Header Meta Row */}
      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="size-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
            2. Khung Câu & Gợi Ý Nấc Thang
          </span>
        </div>

        <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-700 dark:text-amber-300">
          Nấc thang T1-T4
        </Badge>
      </div>

      {/* Scrollable Body with Zero-scroll ergonomics */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 min-h-0">
        {/* Scaffold Layer: Controlled */}
        {exercise.controlLevel === "controlled" && exercise.template && (
          <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                <Sparkles className="size-3" />
                <span>Khung cấu trúc mẫu:</span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {fullModelSentence && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(fullModelSentence, "scaffold-sentence")}
                      className="size-7 p-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 shrink-0"
                      title="Sao chép câu hoàn chỉnh"
                    >
                      {copiedId === "scaffold-sentence" ? (
                        <Check className="size-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handlePlayFullSentence}
                      className="h-6 px-2 text-[10px] font-semibold gap-1 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-all shrink-0"
                      title="Nghe câu mẫu hoàn chỉnh"
                    >
                      <Volume2 className={cn("size-3", isPlayingFullSentence && "animate-pulse scale-110")} />
                      <span>{isPlayingFullSentence ? "Đang đọc..." : "Nghe câu"}</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
            <p className="font-jp text-sm sm:text-base font-bold text-foreground tracking-wide select-text cursor-text leading-relaxed">
              {exercise.template}
            </p>
          </div>
        )}

        {/* Scaffold Layer: Semi-Controlled */}
        {exercise.controlLevel === "semi_controlled" && exercise.keywords && exercise.keywords.length > 0 && (
          <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <Zap className="size-3" />
                <span>Từ khóa bắt buộc lồng ghép:</span>
              </span>
              {fullModelSentence && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(fullModelSentence, "scaffold-semi")}
                    className="size-7 p-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 shrink-0"
                    title="Sao chép câu mẫu"
                  >
                    {copiedId === "scaffold-semi" ? (
                      <Check className="size-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handlePlayFullSentence}
                    className="h-6 px-2 text-[10px] font-semibold gap-1 rounded-lg border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 transition-all shrink-0"
                    title="Nghe phát âm câu mẫu"
                  >
                    <Volume2 className="size-3" />
                    <span>Nghe mẫu</span>
                  </Button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {exercise.keywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-xl bg-background border border-amber-500/30 text-foreground font-jp text-xs font-semibold shadow-2xs select-text"
                >
                  <UniversalFurigana text={kw} fontSize="sm" />
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Scaffold Layer: Free */}
        {exercise.controlLevel === "free" && (
          <div className="p-2.5 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-2 text-xs text-primary shadow-2xs">
            <div className="flex items-center gap-2">
              <Sparkles className="size-3.5 shrink-0 text-amber-500" />
              <span className="font-semibold text-foreground text-xs">
                Phản xạ tự do: Bật ra 1-2 câu trọn vẹn theo văn cảnh!
              </span>
            </div>
            {fullModelSentence && (
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(fullModelSentence, "scaffold-free")}
                  className="size-7 p-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 shrink-0"
                  title="Sao chép câu gợi ý"
                >
                  {copiedId === "scaffold-free" ? (
                    <Check className="size-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handlePlayFullSentence}
                  className="h-6 px-2 text-[10px] font-semibold gap-1 rounded-lg border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10 transition-all shrink-0"
                  title="Nghe câu mẫu"
                >
                  <Volume2 className="size-3" />
                  <span>Nghe câu</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 4-Tier Progressive Scaffolding Hints */}
        {hints.length > 0 && (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-2.5 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                <Sparkles className="size-3 text-amber-500" />
                <span>Gợi ý nấc thang (T1 - T4):</span>
              </div>
              <button
                type="button"
                onClick={() => setIsHintsExpanded(!isHintsExpanded)}
                className="text-[10px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>{isHintsExpanded ? "Thu gọn" : "Mở rộng"}</span>
                <ChevronDown className={cn("size-3 transition-transform duration-200", isHintsExpanded && "rotate-180")} />
              </button>
            </div>

            {isHintsExpanded && (
              <div className="space-y-1.5 pt-0.5 animate-in fade-in-0 duration-150">
                {hints
                  .filter((h) => h.tier >= 1 && h.tier <= 4)
                  .map((h) => {
                    const tierStyles = [
                      { badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30", border: "border-sky-500/20 bg-card/90" },
                      { badge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30", border: "border-indigo-500/20 bg-card/90" },
                      { badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30", border: "border-amber-500/20 bg-card/90" },
                      { badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", border: "border-emerald-500/20 bg-card/90" },
                    ];
                    const style = tierStyles[h.tier - 1] || tierStyles[0];
                    const isFullSentenceTier = h.tier === 3 || h.tier === 4;

                    return (
                      <div key={h.tier} className={cn("p-2 rounded-xl border shadow-2xs space-y-0.5", style.border)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={cn("px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border", style.badge)}>
                              T{h.tier}
                            </span>
                            <span className="text-[11px] font-bold text-foreground">{h.title}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            {h.content && (
                              <button
                                type="button"
                                onClick={() => handleCopy(h.content, `hint-${h.tier}`)}
                                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/60 cursor-pointer transition-colors"
                                title="Sao chép nội dung gợi ý"
                              >
                                {copiedId === `hint-${h.tier}` ? (
                                  <Check className="size-3 text-emerald-500" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                              </button>
                            )}
                            {isFullSentenceTier && fullModelSentence && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handlePlayFullSentence}
                                className="h-5 px-1.5 text-[9px] gap-1 rounded-md border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 shrink-0 font-semibold cursor-pointer"
                                title="Nghe câu mẫu"
                              >
                                <Volume2 className="size-2.5" />
                                <span>Nghe</span>
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="font-jp text-xs font-medium text-foreground/90 pl-0.5 leading-snug select-text cursor-text">
                          {h.tier === 4 ? (
                            <UniversalFurigana text={h.content} fontSize="sm" />
                          ) : (
                            <span>{h.content}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground shrink-0 font-mono">
        <span className="flex items-center gap-1">
          <BookOpen className="size-3 text-amber-500" />
          <span>Khung mẫu & Nấc thang phản xạ</span>
        </span>
        <span>Nấc gợi ý: T{currentHintTier}/4</span>
      </div>
    </div>
  );
}
