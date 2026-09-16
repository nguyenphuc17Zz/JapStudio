"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Volume2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Ban,
  RotateCcw,
  Zap,
  Coffee,
  Briefcase,
  Lightbulb,
} from "lucide-react";
import { speakJapaneseText } from "@/features/speaking/services/web-speech";
import type { SurvivalEvaluationResult } from "../types/survival";

interface SurvivalFeedbackCardProps {
  evaluation: SurvivalEvaluationResult;
  onContinue: () => void;
  onRetry: () => void;
}

export function SurvivalFeedbackCard({
  evaluation,
  onContinue,
  onRetry,
}: SurvivalFeedbackCardProps) {
  const handlePlayAudio = (text: string) => {
    speakJapaneseText(text);
  };

  const sayItBetter = evaluation.say_it_better;
  const isFastPass = evaluation.is_fast_pass || evaluation.evaluation_source === "fast_pass";

  return (
    <Card className="rounded-2xl border border-border/70 bg-card/90 shadow-xs flex flex-col h-full overflow-hidden animate-in fade-in-0 duration-150">
      <CardContent className="p-3.5 md:p-4 flex flex-col justify-between h-full space-y-2.5 overflow-hidden">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border/40 pb-2 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full gap-1 ${
                evaluation.is_successful
                  ? "bg-emerald-600 text-white"
                  : "bg-amber-600 text-white"
              }`}
            >
              {evaluation.is_successful ? (
                <CheckCircle2 className="size-3" />
              ) : (
                <AlertCircle className="size-3" />
              )}
              <span>
                {evaluation.is_successful
                  ? `Thành công: ${evaluation.overall_score}/100`
                  : `Cần cải thiện: ${evaluation.overall_score}/100`}
              </span>
            </Badge>

            {isFastPass ? (
              <Badge
                variant="outline"
                className="text-[10px] font-bold border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full"
              >
                <Zap className="size-2.5 mr-0.5 fill-amber-500 text-amber-500" />
                Fast-Pass 0ms (Luật nội bộ)
              </Badge>
            ) : evaluation.evaluation_source === "ai_router" ? (
              <Badge
                variant="outline"
                className="text-[10px] font-semibold border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1"
              >
                <Sparkles className="size-2.5 text-emerald-500" />
                <span>AI Examiner</span>
              </Badge>
            ) : evaluation.evaluation_source === "mock" ? (
              <Badge
                variant="outline"
                className="text-[10px] font-semibold border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full"
              >
                <span>Mock / Dự phòng</span>
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] font-semibold border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full"
              >
                <span>Từ ngân hàng (DB)</span>
              </Badge>
            )}

            {evaluation.ttfw_ms && (
              <Badge variant="outline" className="text-[10px] font-mono border-border/60 text-muted-foreground px-2 py-0.5">
                <Clock className="size-2.5 mr-1" />
                TTFW {Math.round(evaluation.ttfw_ms)}ms
              </Badge>
            )}

            <Badge className="bg-primary/10 text-primary text-[10px] font-bold border border-primary/20 px-2 py-0.5">
              +{evaluation.xp_earned} XP
            </Badge>
          </div>
        </div>

        {/* Scrollable Evaluation Body */}
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {/* Taboo Violation Warning */}
          {evaluation.taboo_violated && (
            <div className="p-2 rounded-xl border border-red-500/50 bg-red-500/10 text-xs text-red-600 dark:text-red-400 space-y-0.5">
              <div className="font-bold flex items-center gap-1">
                <Ban className="size-3.5" />
                <span>Vi phạm từ cấm Taboo:</span>
                <span className="font-extrabold">{evaluation.violated_words.join(", ")}</span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                Hãy giải thích bản chất/công dụng mà không nhắc trực tiếp tên gọi.
              </div>
            </div>
          )}

          {/* AI Listener Guessing Outcome */}
          {evaluation.listener_guessed_correctly && (
            <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                <span>Người nghe đã đoán ra:</span>
                <span className="text-sm font-extrabold text-foreground ml-1">
                  「{evaluation.listener_guessed_word || "Từ mục tiêu"}」
                </span>
              </div>

              <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 font-mono shrink-0">
                Độ tự tin {Math.round(evaluation.listener_confidence * 100)}%
              </Badge>
            </div>
          )}

          {/* AI Coach Feedback Note */}
          <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 text-xs space-y-0.5">
            <div className="font-bold text-foreground flex items-center gap-1 text-[11px]">
              <Sparkles className="size-3 text-primary" />
              <span>Nhận xét của AI Coach:</span>
            </div>
            <div className="text-muted-foreground leading-relaxed text-[11px]">
              {evaluation.ai_feedback_vi}
            </div>
          </div>

          {/* Say It Better: Hiển thị song song cả 3 biến thể (Casual, Professional, Idiomatic) */}
          {sayItBetter && (
            <div className="space-y-1.5 pt-1 border-t border-border/40">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Lightbulb className="size-3 text-amber-500" />
                <span>3 Cách Diễn Đạt Tự Nhiên Hơn (Say It Better):</span>
              </div>

              <div className="space-y-1">
                {/* 1. Casual */}
                <div className="p-2 rounded-lg bg-muted/20 border border-border/50 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bold text-emerald-600 border-emerald-500/30 shrink-0">
                      <Coffee className="size-2.5 mr-0.5" />
                      Đời thường
                    </Badge>
                    <span className="text-foreground/90 font-medium text-[11px] truncate">{sayItBetter.casual}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 rounded-full shrink-0"
                    onClick={() => handlePlayAudio(sayItBetter.casual)}
                    title="Nghe"
                  >
                    <Volume2 className="size-3" />
                  </Button>
                </div>

                {/* 2. Professional / Keigo */}
                <div className="p-2 rounded-lg bg-muted/20 border border-border/50 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bold text-sky-600 border-sky-500/30 shrink-0">
                      <Briefcase className="size-2.5 mr-0.5" />
                      Lịch sự
                    </Badge>
                    <span className="text-foreground/90 font-medium text-[11px] truncate">{sayItBetter.professional}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 rounded-full shrink-0"
                    onClick={() => handlePlayAudio(sayItBetter.professional)}
                    title="Nghe"
                  >
                    <Volume2 className="size-3" />
                  </Button>
                </div>

                {/* 3. Idiomatic */}
                <div className="p-2 rounded-lg bg-muted/20 border border-border/50 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bold text-amber-600 border-amber-500/30 shrink-0">
                      <Sparkles className="size-2.5 mr-0.5" />
                      Khẩu ngữ
                    </Badge>
                    <span className="text-foreground/90 font-medium text-[11px] truncate">{sayItBetter.idiomatic}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 rounded-full shrink-0"
                    onClick={() => handlePlayAudio(sayItBetter.idiomatic)}
                    title="Nghe"
                  >
                    <Volume2 className="size-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="border-t border-border/40 pt-2 flex items-center justify-between gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={onRetry}
            className="flex-1 rounded-xl gap-1 text-xs h-8 border-border/60"
          >
            <RotateCcw className="size-3" />
            <span>Thử lại</span>
          </Button>

          <Button
            onClick={onContinue}
            className="flex-1 rounded-xl gap-1 text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xs"
          >
            <span>Tiếp tục</span>
            <ArrowRight className="size-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
