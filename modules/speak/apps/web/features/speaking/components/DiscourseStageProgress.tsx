"use client";

import React from "react";
import {
  DiscourseStage,
  DISCOURSE_STAGES_CONFIG,
} from "../services/discourse-engine";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiscourseStageProgressProps {
  currentStage: DiscourseStage;
  userTurnsCount: number;
  className?: string;
}

const STAGES_ORDER: DiscourseStage[] = [
  "rapport",
  "discovery",
  "twist_conflict",
  "negotiation",
  "resolution",
];

export function DiscourseStageProgress({
  currentStage,
  userTurnsCount,
  className,
}: DiscourseStageProgressProps) {
  const currentStageInfo = DISCOURSE_STAGES_CONFIG[currentStage];
  const currentIndex = STAGES_ORDER.indexOf(currentStage);

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-xl bg-card/60 border border-border/60 backdrop-blur-md text-xs",
        className
      )}
    >
      {/* Stages Pipeline */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-1 min-w-0 overflow-x-auto scrollbar-none">
        {STAGES_ORDER.map((stageKey, idx) => {
          const stageInfo = DISCOURSE_STAGES_CONFIG[stageKey];
          const isPassed = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div
              key={stageKey}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-medium transition-all shrink-0 select-none",
                isCurrent &&
                  "bg-primary/15 border-primary/40 text-primary font-bold shadow-xs shadow-primary/10 ring-1 ring-primary/20",
                isPassed &&
                  "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 opacity-90",
                !isCurrent &&
                  !isPassed &&
                  "bg-muted/30 border-border/40 text-muted-foreground opacity-50"
              )}
              title={`${stageInfo.labelJa} — ${stageInfo.descriptionVi}`}
            >
              <span className="text-[12px]">{stageInfo.icon}</span>
              <span className="truncate max-w-[65px] sm:max-w-none">
                {stageInfo.labelVi}
              </span>
              {isPassed && <Check className="h-3 w-3 text-emerald-400 ml-0.5" />}
              {isCurrent && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping ml-0.5" />
              )}
            </div>
          );
        })}
      </div>

      {/* Active Stage Indicator Badge */}
      <div className="hidden md:flex items-center gap-1.5 shrink-0 pl-2 border-l border-border/50 text-[11px]">
        <span className="text-muted-foreground font-jp">{currentStageInfo.labelJa}</span>
        <span className="px-1.5 py-0.2 rounded bg-muted text-[10px] font-mono text-muted-foreground">
          Lượt {userTurnsCount}
        </span>
      </div>
    </div>
  );
}
