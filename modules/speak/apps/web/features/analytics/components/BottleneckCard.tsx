"use client";

import React from "react";
import Link from "next/link";
import { BottleneckDTO } from "../types/analytics";
import { AlertCircle, Zap, ArrowRight, Activity } from "lucide-react";
import { ConfidenceBadge } from "./ConfidenceBadge";

interface BottleneckCardProps {
  bottleneck: BottleneckDTO;
}

export const BottleneckCard: React.FC<BottleneckCardProps> = ({ bottleneck }) => {
  return (
    <div className="relative overflow-hidden p-5 sm:p-6 rounded-2xl border border-amber-300/80 bg-gradient-to-b from-amber-50/70 via-card to-card dark:border-amber-500/30 dark:from-amber-950/20 dark:via-card/95 dark:to-card shadow-xs hover:shadow-md transition-all">
      {/* Decorative subtle ambient glow */}
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col gap-4 relative z-10">
        {/* Top Badges: Category & Confidence */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/50">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Điểm Nghẽn Cần Cải Thiện
          </span>
          {bottleneck.confidence && (
            <ConfidenceBadge confidence={bottleneck.confidence} />
          )}
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <h3 className="text-base sm:text-lg font-bold text-foreground font-jp flex items-center gap-2 leading-snug">
            <span className="p-1 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 shrink-0">
              <AlertCircle className="w-4 h-4" />
            </span>
            <span>{bottleneck.candidate}</span>
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {bottleneck.description}
          </p>
        </div>

        {/* Evidence Keys */}
        {bottleneck.evidence_keys && bottleneck.evidence_keys.length > 0 && (
          <div className="space-y-1.5 pt-0.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Activity className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              Dữ liệu dẫn chứng:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {bottleneck.evidence_keys.map((ev, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-muted/80 border border-border text-[11px] font-mono font-medium text-foreground"
                >
                  {ev}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Next Action Callout */}
        <div className="p-3.5 rounded-xl border border-amber-300/80 bg-amber-100/40 dark:border-amber-500/25 dark:bg-amber-950/30 space-y-2.5">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
              Gợi ý hành động tiếp theo:
            </span>
            <p className="text-xs sm:text-sm font-semibold text-foreground font-jp leading-snug">
              {bottleneck.suggested_focus || "10 phút hội thoại phản xạ tự do"}
            </p>
          </div>

          <Link href="/speaking" className="block">
            <button className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98]">
              <Zap className="w-4 h-4 fill-current" />
              <span>Luyện tập khắc phục ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};
