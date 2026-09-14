"use client";

import React from "react";
import { Sparkles, Database, Box } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExerciseSourceBadgeProps {
  source?: "ai" | "smart_cache_pool" | "template_fallback" | string;
  isFallback?: boolean;
  className?: string;
}

export function ExerciseSourceBadge({ source, isFallback, className }: ExerciseSourceBadgeProps) {
  if (source === "smart_cache_pool") {
    return (
      <span
        title="Bài tập được lấy từ Ngân hàng Database thông minh"
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25 select-none transition-all animate-in fade-in duration-200",
          className
        )}
      >
        <Database className="h-2.5 w-2.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
        <span>Ngân hàng DB</span>
      </span>
    );
  }

  if (source === "template_fallback") {
    return (
      <span
        title="Bài tập từ bộ mẫu dự phòng an toàn (khi AI và Database đều trống)"
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 select-none transition-all animate-in fade-in duration-200",
          className
        )}
      >
        <Box className="h-2.5 w-2.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>Mẫu dự phòng</span>
      </span>
    );
  }

  return (
    <span
      title="Bài tập được sinh trực tiếp bằng AI"
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 select-none transition-all animate-in fade-in duration-200",
        className
      )}
    >
      <Sparkles className="h-2.5 w-2.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <span>AI Realtime</span>
    </span>
  );
}
