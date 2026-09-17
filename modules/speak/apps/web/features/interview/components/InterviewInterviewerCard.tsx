"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  User,
  Info,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { ExerciseSourceBadge } from "@/components/ui/exercise-source-badge";
import { cn } from "@/lib/utils";
import type { InterviewQuestion } from "../types/interview";

interface InterviewInterviewerCardProps {
  question: InterviewQuestion;
  isPlayingVoice: boolean;
  onPlayVoice: () => void;
  onStopVoice: () => void;
  isLoading?: boolean;
}

export function InterviewInterviewerCard({
  question,
  isPlayingVoice,
  onPlayVoice,
  onStopVoice,
  isLoading = false,
}: InterviewInterviewerCardProps) {
  const [showMeaning, setShowMeaning] = useState(false);

  return (
    <div className="rounded-2xl border border-border/80 bg-card/70 p-5 md:p-6 shadow-xs backdrop-blur-xs space-y-4 relative overflow-hidden">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-2xs">
            <User className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">
                {question.interviewer_name}
              </span>
              <Badge variant="outline" className="text-[10px] px-2 py-0">
                {question.interviewer_title}
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span>Phỏng vấn viên AI</span>
              <span>•</span>
              <span className="capitalize text-primary">
                {question.interviewer_style}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="text-xs px-2.5 py-0.5 font-bold"
          >
            Câu {question.turn_index} / {question.total_turns}
          </Badge>
          <ExerciseSourceBadge source={(question.source as any) || "ai"} />
        </div>
      </div>

      {/* Main Question Speech Bubble */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 md:p-5 space-y-3 relative">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1">
            <span className="text-[11px] font-bold text-primary tracking-wider uppercase">
              Câu Hỏi Phỏng Vấn (質問)
            </span>
            <div className="text-base md:text-lg font-semibold text-foreground leading-relaxed">
              <UniversalFurigana
                text={question.question_ja}
                className="text-foreground font-medium"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={isPlayingVoice ? onStopVoice : onPlayVoice}
            disabled={isLoading}
            className={cn(
              "shrink-0 p-2.5 rounded-xl border transition-all cursor-pointer shadow-xs",
              isPlayingVoice
                ? "bg-primary text-primary-foreground border-primary animate-pulse"
                : "bg-background hover:bg-muted border-border text-foreground hover:text-primary"
            )}
            title={
              isPlayingVoice
                ? "Dừng phát âm"
                : "Phát lại giọng đọc phỏng vấn viên"
            }
          >
            {isPlayingVoice ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Vietnamese Translation Toggle */}
        <div className="pt-2 border-t border-border/40 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowMeaning((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
          >
            {showMeaning ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                <span>Ẩn bản dịch tiếng Việt</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                <span>Xem dịch nghĩa câu hỏi</span>
              </>
            )}
          </button>
        </div>

        {showMeaning && (
          <div className="p-3 rounded-lg bg-background/80 border border-border/50 text-xs text-muted-foreground leading-relaxed animate-in fade-in duration-200">
            {question.question_vi}
          </div>
        )}
      </div>

      {/* Hiring Manager Intent / Purpose */}
      {question.intent_explanation_vi && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/50 text-xs text-muted-foreground">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-foreground">
              Mục đích nhà tuyển dụng:
            </span>
            <p className="leading-relaxed">{question.intent_explanation_vi}</p>
          </div>
        </div>
      )}
    </div>
  );
}
