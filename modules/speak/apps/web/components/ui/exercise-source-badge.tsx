"use client";

import React from "react";
import { Sparkles, Database } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExerciseSourceBadgeProps {
  source?: "ai" | "smart_cache_pool" | "gemini_ai" | "sqlite" | "bank" | string;
  isFallback?: boolean;
  className?: string;
}

export function ExerciseSourceBadge({ source, className }: ExerciseSourceBadgeProps) {
  const isFromDB = source === "smart_cache_pool" || source === "sqlite" || source === "database" || source === "bank";

  if (isFromDB) {
    return (
      <span
        title="Nội dung được lấy từ Cơ sở Dữ liệu SQLite (Kho bài tập đã lưu)"
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-2xs select-none transition-all animate-in fade-in duration-200",
          className
        )}
      >
        <Database className="h-3 w-3 shrink-0 text-cyan-500 animate-pulse" />
        <span>💾 Từ Kho SQLite</span>
      </span>
    );
  }

  return (
    <span
      title="Nội dung được AI (Gemini) sinh trực tiếp theo thời gian thực"
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-2xs select-none transition-all animate-in fade-in duration-200",
        className
      )}
    >
      <Sparkles className="h-3 w-3 shrink-0 text-emerald-500 animate-spin-slow" />
      <span>✨ AI Vừa Tạo</span>
    </span>
  );
}
