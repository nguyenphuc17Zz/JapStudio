"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Award,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Volume2,
  ThumbsUp,
  Lightbulb,
  Check,
} from "lucide-react";
import { speakJapaneseText } from "@/features/speaking/services/web-speech";
import { cn } from "@/lib/utils";
import type { InterviewCoachEvaluation } from "../types/interview";

interface InterviewCoachFeedbackCardProps {
  evaluation: InterviewCoachEvaluation;
  onNextQuestion: () => void;
  isLastTurn?: boolean;
}

export function InterviewCoachFeedbackCard({
  evaluation,
  onNextQuestion,
  isLastTurn = false,
}: InterviewCoachFeedbackCardProps) {
  const prep = evaluation.prep_breakdown;

  return (
    <div className="rounded-2xl border border-primary/30 bg-card/90 p-5 md:p-6 shadow-md backdrop-blur-md space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Header Score Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">
              Huấn Luyện Viên Đánh Giá & Sửa Lỗi Tức Thì
            </h3>
            <p className="text-xs text-muted-foreground">
              Phân tích cấu trúc PREP và chuẩn hóa Kính ngữ công sở
            </p>
          </div>
        </div>

        {/* Score Badges */}
        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/5 text-center">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">
              Điểm Tổng
            </div>
            <div className="text-base font-extrabold text-primary">
              {evaluation.overall_score}/100
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-center">
            <div className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold">
              PREP Logic
            </div>
            <div className="text-base font-extrabold text-blue-700 dark:text-blue-300">
              {evaluation.prep_score}/100
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-xl border border-purple-500/20 bg-purple-500/5 text-center">
            <div className="text-[10px] text-purple-600 dark:text-purple-400 uppercase font-bold">
              Kính Ngữ
            </div>
            <div className="text-base font-extrabold text-purple-700 dark:text-purple-300">
              {evaluation.keigo_score}/100
            </div>
          </div>
        </div>
      </div>

      {/* PREP Breakdown Meters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 text-center space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground">
            Point (Luận điểm)
          </span>
          <div className="text-sm font-bold text-foreground">
            {prep.point_score}%
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 text-center space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground">
            Reason (Lý do)
          </span>
          <div className="text-sm font-bold text-foreground">
            {prep.reason_score}%
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 text-center space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground">
            Example (Dẫn chứng)
          </span>
          <div className="text-sm font-bold text-foreground">
            {prep.example_score}%
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 text-center space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground">
            Summary (Tóm lại)
          </span>
          <div className="text-sm font-bold text-foreground">
            {prep.summary_score}%
          </div>
        </div>
      </div>

      {/* Coach Commentary */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
          <Lightbulb className="h-4 w-4" />
          <span>Lời Khuyên Của Huấn Luyện Viên:</span>
        </div>
        <p className="text-xs md:text-sm text-foreground leading-relaxed">
          {evaluation.coach_feedback_vi}
        </p>
      </div>

      {/* Keigo Corrections if any */}
      {evaluation.keigo_fixes && evaluation.keigo_fixes.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Sửa Lỗi Kính Ngữ & Từ Ngữ Công Sở:</span>
          </span>
          <div className="space-y-2">
            {evaluation.keigo_fixes.map((fix, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs space-y-1"
              >
                <div className="flex items-center gap-2">
                  <span className="line-through text-red-500 font-medium">
                    {fix.original_phrase}
                  </span>
                  <span>→</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {fix.corrected_phrase}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {fix.keigo_type}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {fix.explanation_vi}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Native Model Answer Rewrite */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
            <Award className="h-4 w-4" />
            <span>Bản Viết Lại Hoàn Hảo Chuẩn Bản Xứ (模範解答):</span>
          </span>
          <button
            type="button"
            onClick={() => speakJapaneseText(evaluation.native_model_answer)}
            className="p-1.5 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
            title="Nghe câu mẫu"
          >
            <Volume2 className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm font-semibold text-foreground leading-relaxed">
          {evaluation.native_model_answer}
        </p>
        <p className="text-xs text-muted-foreground border-t border-emerald-500/20 pt-2">
          {evaluation.native_model_vi}
        </p>
      </div>

      {/* Next Question CTA Button */}
      <div className="pt-2 flex justify-end">
        <Button
          type="button"
          onClick={onNextQuestion}
          size="lg"
          className="rounded-xl gap-2 font-bold px-6 shadow-md"
        >
          <span>
            {isLastTurn ? "Xem Báo Cáo Tuyển Dụng (結果発表)" : "Câu Hỏi Tiếp Theo (次へ進む)"}
          </span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
