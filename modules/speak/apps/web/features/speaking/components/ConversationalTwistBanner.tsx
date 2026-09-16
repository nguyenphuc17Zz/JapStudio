"use client";

import React, { useState } from "react";
import { ConversationalTwist } from "../services/discourse-engine";
import { AlertTriangle, ChevronDown, ChevronUp, Lightbulb, Zap, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversationalTwistBannerProps {
  twist: ConversationalTwist | null;
  className?: string;
  onDismiss?: () => void;
}

export function ConversationalTwistBanner({
  twist,
  className,
  onDismiss,
}: ConversationalTwistBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!twist) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border transition-all animate-in fade-in slide-in-from-top-2 duration-300 backdrop-blur-xl shadow-lg",
        twist.severity === "high"
          ? "bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-amber-950/20"
          : "bg-blue-500/10 border-blue-500/30 text-blue-300 shadow-blue-950/20",
        className
      )}
    >
      <div className="p-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className={cn(
              "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs mt-0.5",
              twist.severity === "high"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
            )}
          >
            <Zap className="h-4 w-4 animate-pulse" />
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-extrabold text-foreground tracking-tight">
                {twist.titleVi}
              </span>
              <span
                className={cn(
                  "text-[10px] font-mono px-1.5 py-0.2 rounded-full border uppercase tracking-wider font-bold",
                  twist.severity === "high"
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                    : "bg-blue-500/20 border-blue-500/40 text-blue-400"
                )}
              >
                {twist.severity === "high" ? "Ưu tiên cao" : "Thử thách phản xạ"}
              </span>
            </div>

            <p className="text-xs text-muted-foreground font-jp leading-snug">
              「{twist.descriptionJa}」
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
            title={isExpanded ? "Thu gọn" : "Mở rộng"}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
              title="Ẩn biến cố"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-white/10 space-y-2 text-xs">
          <p className="text-foreground leading-relaxed">
            {twist.descriptionVi}
          </p>

          <div className="p-2 rounded-xl bg-background/60 border border-border/60 flex items-start gap-2 text-[11px] text-foreground">
            <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-primary mr-1">Chiến thuật ứng phó:</span>
              <span className="text-muted-foreground">{twist.suggestedTacticVi}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
