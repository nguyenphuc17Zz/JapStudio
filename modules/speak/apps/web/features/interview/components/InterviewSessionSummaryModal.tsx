"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  LayoutDashboard,
  Sparkles,
  ArrowRight,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  FinalReportResponse,
  InterviewTurnRecord,
} from "../types/interview";

interface InterviewSessionSummaryModalProps {
  report: FinalReportResponse | null;
  turnHistory: InterviewTurnRecord[];
  role: string;
  onRestart: () => void;
  isLoading?: boolean;
}

export function InterviewSessionSummaryModal({
  report,
  turnHistory,
  role,
  onRestart,
  isLoading = false,
}: InterviewSessionSummaryModalProps) {
  if (!report) return null;

  const isNaitei = report.decision_badge === "naitei";
  const isPassed = report.decision_badge === "passed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-border/80 bg-card p-6 md:p-8 shadow-2xl space-y-6">
        {/* Result Header */}
        <div className="text-center space-y-3">
          <div
            className={cn(
              "h-16 w-16 mx-auto rounded-2xl flex items-center justify-center shadow-lg",
              isNaitei
                ? "bg-amber-500/20 border-2 border-amber-500/40 text-amber-500"
                : isPassed
                ? "bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-500"
                : "bg-blue-500/20 border-2 border-blue-500/40 text-blue-500"
            )}
          >
            {isNaitei ? (
              <Trophy className="h-8 w-8" />
            ) : isPassed ? (
              <Award className="h-8 w-8" />
            ) : (
              <Sparkles className="h-8 w-8" />
            )}
          </div>

          <div className="space-y-1">
            <span className="text-xs uppercase font-bold tracking-widest text-muted-foreground">
              Kết Quả Phỏng Vấn Tuyển Dụng
            </span>
            <h2 className="text-2xl font-black text-foreground">
              {report.decision}
            </h2>
            <p className="text-xs text-muted-foreground">
              Vị trí ứng tuyển:{" "}
              <span className="font-semibold text-foreground">{role}</span>
            </p>
          </div>
        </div>

        {/* Score Metrics Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-center space-y-0.5">
            <span className="text-[11px] font-bold text-primary uppercase">
              Điểm Tổng
            </span>
            <div className="text-xl font-black text-foreground">
              {report.overall_score}/100
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center space-y-0.5">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase">
              PREP Logic
            </span>
            <div className="text-xl font-black text-foreground">
              {report.average_prep_score}/100
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/20 text-center space-y-0.5">
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase">
              Kính Ngữ Keigo
            </span>
            <div className="text-xl font-black text-foreground">
              {report.average_keigo_score}/100
            </div>
          </div>
        </div>

        {/* Summary Feedback & Interviewer Comment */}
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-1.5 text-xs text-muted-foreground">
            <span className="font-bold text-foreground">Đánh giá chung:</span>
            <p className="leading-relaxed">{report.summary_feedback_vi}</p>
          </div>

          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5 text-xs text-muted-foreground">
            <span className="font-bold text-primary">
              Nhận xét từ người phỏng vấn:
            </span>
            <p className="leading-relaxed italic">
              "{report.interviewer_comment_vi}"
            </p>
          </div>
        </div>

        {/* Key Recommendations */}
        {report.key_recommendations_vi &&
          report.key_recommendations_vi.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                Bí Quyết Nâng Cao Cho Lần Sau:
              </span>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {report.key_recommendations_vi.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        {/* Action Buttons */}
        <div className="pt-4 border-t border-border/60 flex items-center justify-between gap-3">
          <Link href="/dashboard" className="w-1/2">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl gap-2 text-xs font-bold"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Về Trang Chủ</span>
            </Button>
          </Link>
          <Button
            type="button"
            onClick={onRestart}
            className="w-1/2 rounded-xl gap-2 text-xs font-bold shadow-md"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Phỏng Vấn Lại (もう一度)</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
