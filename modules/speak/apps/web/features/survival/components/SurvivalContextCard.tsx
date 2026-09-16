"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import {
  Volume2,
  Copy,
  Check,
  Lightbulb,
  Layers,
  Quote,
  Sparkles,
} from "lucide-react";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { speakJapaneseText } from "@/features/speaking/services/web-speech";
import type { CircumlocutionTask, SurvivalScenarioTask } from "../types/survival";

interface SurvivalContextCardProps {
  mode: "circumlocution" | "scenarios";
  circumTask: CircumlocutionTask | null;
  scenarioTask: SurvivalScenarioTask | null;
  currentHintTier: number;
  onSelectHintTier: (tier: number) => void;
}

export function SurvivalContextCard({
  mode,
  circumTask,
  scenarioTask,
  currentHintTier,
  onSelectHintTier,
}: SurvivalContextCardProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      toast.success("Đã sao chép vào clipboard");
      setTimeout(() => setCopiedText(null), 1500);
    } catch {
      toast.error("Không thể sao chép");
    }
  };

  const handlePlayAudio = (text: string) => {
    speakJapaneseText(text);
  };

  const currentTask = mode === "circumlocution" ? circumTask : scenarioTask;
  const tierHints = currentTask?.tier_hints || [];
  const vocabItems = currentTask?.suggested_vocabulary || [];

  return (
    <Card className="rounded-2xl border border-border/70 bg-card/90 shadow-xs flex flex-col h-full overflow-hidden">
      <CardContent className="p-3.5 md:p-4 flex flex-col h-full space-y-2.5 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Layers className="size-3.5 text-primary" />
            <span className="font-bold text-xs text-foreground">Dàn giáo & Gợi ý cấp tiến</span>
          </div>
          <div className="flex items-center gap-1.5">
            {(() => {
              const source = currentTask?.source || (currentTask?.id.includes("_ai_") ? "ai" : "bank");
              if (source === "ai") {
                return (
                  <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0 h-4 rounded-full gap-0.5 font-semibold">
                    <Sparkles className="size-2 text-emerald-500" />
                    <span>AI Gợi ý</span>
                  </Badge>
                );
              }
              if (source === "mock") {
                return (
                  <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0 h-4 rounded-full font-semibold">
                    <span>Mock</span>
                  </Badge>
                );
              }
              return (
                <Badge variant="outline" className="text-[9px] border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0 h-4 rounded-full font-semibold">
                  <span>Từ ngân hàng (DB)</span>
                </Badge>
              );
            })()}
            <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.2 border-border/60">
              Tier {currentHintTier} / 4
            </Badge>
          </div>
        </div>

        {/* Scrollable Context Deck */}
        <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
          {/* 5-Tier Scaffolding Ladder */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Bậc thang gợi ý (Scaffolding Tiers)</span>
              <span className="text-[9px] text-muted-foreground font-normal">chọn để mở gợi ý</span>
            </div>

            <div className="space-y-1">
              {tierHints.map((hint) => {
                const isActive = currentHintTier === hint.tier;
                const isUnlocked = currentHintTier >= hint.tier;

                return (
                  <div
                    key={hint.tier}
                    onClick={() => onSelectHintTier(hint.tier)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer text-xs ${
                      isActive
                        ? "border-primary/60 bg-primary/10 shadow-2xs"
                        : isUnlocked
                        ? "border-border/60 bg-muted/20 hover:bg-muted/30"
                        : "border-border/30 bg-muted/10 opacity-65 hover:opacity-85"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          className={`size-4 p-0 flex items-center justify-center text-[9px] rounded-full font-mono shrink-0 ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {hint.tier}
                        </Badge>
                        <span className={isActive ? "text-primary font-bold" : "text-foreground"}>
                          {hint.title}
                        </span>
                      </div>

                      {hint.penalty_weight && hint.penalty_weight > 0 ? (
                        <span className="text-[9px] text-muted-foreground font-mono">
                          -{Math.round(hint.penalty_weight * 100)}%
                        </span>
                      ) : null}
                    </div>

                    {isUnlocked && (
                      <div className="mt-1 text-muted-foreground leading-relaxed pl-5 border-l border-primary/40 ml-2 text-[11px]">
                        {hint.content}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Suggested Vocabulary Bank — 2-Column Grid */}
          {vocabItems.length > 0 && (
            <div className="pt-2 border-t border-border/40 space-y-1.5">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Lightbulb className="size-3 text-amber-500" />
                <span>Từ vựng cứu cánh (Suggested Vocabulary):</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {vocabItems.map((vocab, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl border border-border/50 bg-muted/20 flex items-center justify-between text-xs gap-1"
                  >
                    <div className="space-y-0.5 overflow-hidden">
                      <div className="font-bold text-foreground text-[11px] truncate">
                        <UniversalFurigana
                          text={vocab.term}
                          ruby={vocab.reading ? [{ text: vocab.term, reading: vocab.reading }] : null}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {vocab.meaning_vi}
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 rounded-full text-muted-foreground hover:text-foreground"
                        onClick={() => handlePlayAudio(vocab.term)}
                        title="Phát âm"
                      >
                        <Volume2 className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 rounded-full text-muted-foreground hover:text-foreground"
                        onClick={() => handleCopy(vocab.term)}
                        title="Sao chép"
                      >
                        {copiedText === vocab.term ? (
                          <Check className="size-3 text-emerald-500" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample Expressions */}
          {mode === "circumlocution" && circumTask?.sample_explanations && circumTask.sample_explanations.length > 0 && (
            <div className="pt-2 border-t border-border/40 space-y-1">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Quote className="size-3 text-primary" />
                <span>Câu diễn giải mẫu bản xứ:</span>
              </div>
              <div className="space-y-1">
                {circumTask.sample_explanations.map((exp, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-primary/5 border border-primary/20 text-[11px] flex items-center justify-between gap-2"
                  >
                    <span className="text-foreground/90 font-medium leading-relaxed">{exp}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 rounded-full shrink-0"
                      onClick={() => handlePlayAudio(exp)}
                      title="Nghe phát âm"
                    >
                      <Volume2 className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
