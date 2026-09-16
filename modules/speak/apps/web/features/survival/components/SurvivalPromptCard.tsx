"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import {
  ShieldAlert,
  AlertTriangle,
  Volume2,
  Sparkles,
  Ban,
  Clock,
  Tag,
  ArrowRight,
  Flame,
  Compass,
  Lightbulb,
  Layers,
} from "lucide-react";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { speakJapaneseText } from "@/features/speaking/services/web-speech";
import type { CircumlocutionTask, SurvivalScenarioTask } from "../types/survival";

interface SurvivalPromptCardProps {
  mode: "circumlocution" | "scenarios";
  circumTask: CircumlocutionTask | null;
  scenarioTask: SurvivalScenarioTask | null;
  countdownSeconds: number;
  isCountingDown: boolean;
  onRegenerateAI?: () => void;
  isRegeneratingAI?: boolean;
  onNextTask?: () => void;
  streak?: number;
}

export function SurvivalPromptCard({
  mode,
  circumTask,
  scenarioTask,
  countdownSeconds,
  isCountingDown,
  onRegenerateAI,
  isRegeneratingAI = false,
  onNextTask,
  streak = 0,
}: SurvivalPromptCardProps) {
  const handlePlayAudio = (text: string) => {
    speakJapaneseText(text);
  };

  return (
    <Card className="rounded-2xl border border-border/70 bg-card/90 shadow-xs flex flex-col h-full overflow-hidden">
      <CardContent className="p-3.5 md:p-4 flex flex-col h-full justify-between space-y-2.5 overflow-hidden">
        {/* Top Mini Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {mode === "circumlocution" ? (
              <Badge className="bg-primary/15 text-primary border border-primary/25 font-mono text-[11px] font-bold gap-1 px-2.5 py-0.5 rounded-full">
                <ShieldAlert className="size-3" />
                <span>Taboo Gym • 言い換え</span>
              </Badge>
            ) : (
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono text-[11px] font-bold gap-1 px-2.5 py-0.5 rounded-full">
                <AlertTriangle className="size-3" />
                <span>Scenario • トラブル脱出</span>
              </Badge>
            )}

            <Badge variant="outline" className="text-[10px] font-mono border-border/60 text-muted-foreground px-2 py-0.5">
              <Tag className="size-2.5 mr-1" />
              {mode === "circumlocution"
                ? circumTask?.category || "Đời sống"
                : scenarioTask?.context_title_vi || "Công sở"}
            </Badge>

            {/* Data Source Provenance Badge (EnglishSpeaking pattern) */}
            {(() => {
              const currentTask = mode === "circumlocution" ? circumTask : scenarioTask;
              const source = currentTask?.source || (currentTask?.id.includes("_ai_") ? "ai" : "bank");
              if (source === "ai") {
                return (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-1 font-semibold rounded-full">
                    <Sparkles className="size-2.5 text-emerald-500" />
                    <span>AI Generated</span>
                  </Badge>
                );
              }
              if (source === "mock") {
                return (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 gap-1 font-semibold rounded-full">
                    <span>Mock / Dự phòng</span>
                  </Badge>
                );
              }
              return (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10 gap-1 font-semibold rounded-full">
                  <span>Từ ngân hàng (DB)</span>
                </Badge>
              );
            })()}

            {streak > 0 && (
              <Badge className="bg-orange-500/10 text-orange-500 border border-orange-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Flame className="size-3 fill-orange-500" />
                <span>Streak {streak}</span>
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {onRegenerateAI && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRegenerateAI}
                disabled={isRegeneratingAI}
                className="h-7 px-2.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 hover:border-amber-500/50 gap-1 rounded-lg transition-all font-semibold"
                title="Yêu cầu AI sinh thẻ bài tập mới"
              >
                <Sparkles className={`size-3 ${isRegeneratingAI ? "animate-spin text-amber-500" : "text-amber-500"}`} />
                <span>{isRegeneratingAI ? "Đang tạo..." : "AI Đổi bài"}</span>
              </Button>
            )}
            {onNextTask && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNextTask}
                className="h-7 px-2 text-[11px] gap-1 rounded-lg border-border/60"
              >
                <span>Bỏ qua</span>
                <ArrowRight className="size-2.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Content Body: Taboo Circumlocution */}
        {mode === "circumlocution" && circumTask && (
          <div className="flex-1 flex flex-col justify-between space-y-2 overflow-y-auto pr-1">
            {/* Target Word Hero Display */}
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-center space-y-1 relative">
              <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <span>Từ mục tiêu cần diễn giải</span>
                  {circumTask.id.startsWith("circ_ai_") && (
                    <Badge className="bg-primary/15 text-primary border border-primary/30 text-[9px] font-bold px-1.5 py-0 h-4.5 gap-0.5 rounded-full">
                      <Sparkles className="size-2.5" />
                      <span>AI</span>
                    </Badge>
                  )}
                </span>
                <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{circumTask.category}</span>
              </div>

              <div className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center justify-center gap-2 py-0.5">
                <UniversalFurigana
                  text={circumTask.target_word}
                  ruby={circumTask.reading_hiragana ? [{ text: circumTask.target_word, reading: circumTask.reading_hiragana }] : null}
                  fontSize="lg"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => handlePlayAudio(circumTask.target_word)}
                  title="Nghe phát âm"
                >
                  <Volume2 className="size-3.5" />
                </Button>
              </div>

              <div className="flex items-center justify-center gap-3 text-xs">
                <span className="font-bold text-amber-600 dark:text-amber-400">{circumTask.vietnamese_meaning}</span>
                <span className="text-muted-foreground font-mono text-[11px]">({circumTask.romaji})</span>
              </div>
            </div>

            {/* Genus & Differentia Info Bar */}
            <div className="px-3 py-1.5 rounded-lg bg-muted/20 border border-border/40 text-[11px] flex items-center justify-between gap-2">
              <span className="text-muted-foreground shrink-0 font-medium">Bản chất:</span>
              <span className="text-foreground/90 font-medium truncate text-right">{circumTask.genus} — {circumTask.differentia}</span>
            </div>

            {/* Semantic Anchors Pills */}
            {circumTask.semantic_anchors && circumTask.semantic_anchors.length > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-sky-500/5 border border-sky-500/20 text-xs space-y-1">
                <div className="flex items-center gap-1 text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                  <Lightbulb className="size-3" />
                  <span>Từ khóa gợi ý tư duy (Semantic Anchors - được phép dùng):</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {circumTask.semantic_anchors.map((anchor, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-300 font-bold text-[11px] border border-sky-500/20"
                    >
                      {anchor}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Taboo Forbidden Words Alert Banner */}
            <div className="p-2.5 rounded-xl border border-red-500/40 bg-red-500/10 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 dark:text-red-400">
                <Ban className="size-3.5 text-red-600 dark:text-red-400 shrink-0" />
                <span>CẤM DÙNG CÁC TỪ SAU (TABOO):</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {circumTask.forbidden_words.map((word, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-red-600 text-white shadow-2xs"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content Body: Survival Scenarios */}
        {mode === "scenarios" && scenarioTask && (
          <div className="flex-1 flex flex-col justify-between space-y-2 overflow-y-auto pr-1">
            {/* Problem Context */}
            <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 space-y-1">
              <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center justify-between">
                <span>Tình huống thực tế</span>
                <div className="flex items-center gap-1.5">
                  {scenarioTask.id.startsWith("scen_ai_") && (
                    <Badge className="bg-primary/15 text-primary border border-primary/30 text-[9px] font-bold px-1.5 py-0 h-4 gap-0.5 rounded-full">
                      <Sparkles className="size-2" />
                      <span>AI</span>
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] font-mono border-border/60">
                    {scenarioTask.relationship.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div className="text-xs text-foreground/90 font-medium leading-relaxed">
                {scenarioTask.problem_description_vi}
              </div>
            </div>

            {/* NPC Utterance Box */}
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5 relative">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                  <span>🗣️ Đối phương vừa nói:</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] gap-1 text-primary hover:text-primary rounded-md"
                  onClick={() => handlePlayAudio(scenarioTask.npc_utterance_ja)}
                >
                  <Volume2 className="size-3" />
                  <span>Nghe</span>
                </Button>
              </div>

              <div className="text-base sm:text-lg font-bold text-foreground py-0.5">
                <UniversalFurigana
                  text={scenarioTask.npc_utterance_ja}
                  ruby={scenarioTask.npc_utterance_reading ? [{ text: scenarioTask.npc_utterance_ja, reading: scenarioTask.npc_utterance_reading }] : null}
                />
              </div>
            </div>

            {/* Recommended Strategy Badge */}
            <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-xl bg-muted/40 border border-border/40">
              <span className="text-muted-foreground text-[11px]">Chiến lược khuyến nghị:</span>
              <Badge variant="outline" className="font-bold text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                {scenarioTask.recommended_strategy.replace("_", " ").toUpperCase()}
              </Badge>
            </div>
          </div>
        )}

        {/* Bottom Countdown & Hint Bar */}
        <div className="border-t border-border/40 pt-2 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
          <div className="flex items-center gap-1.5 font-medium">
            <Clock className={`size-3 ${isCountingDown ? "text-amber-500 animate-pulse" : ""}`} />
            <span>Phản xạ: </span>
            <span className="font-mono font-bold text-foreground text-xs">{countdownSeconds}s</span>
          </div>

          <div className="text-[10px] text-muted-foreground">
            Bấm Mic hoặc nhấn <kbd className="px-1 py-0.2 bg-muted rounded text-[9px] font-mono border">Space</kbd> để nói
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
