"use client";

import React, { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { isDark, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("h-8 w-8 rounded-lg border border-border/60 bg-muted/30 animate-pulse", className)} />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Chuyển sang giao diện Sáng" : "Chuyển sang giao diện Tối"}
      title={isDark ? "Giao diện: Đang bật Tối (Nhấp để chuyển Sáng)" : "Giao diện: Đang bật Sáng (Nhấp để chuyển Tối)"}
      className={cn(
        "h-8 w-8 rounded-lg border flex items-center justify-center transition-all duration-200 group relative",
        "border-border/80 bg-muted/40 hover:bg-card hover:border-primary/40 text-muted-foreground hover:text-foreground shadow-2xs",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className
      )}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
      ) : (
        <Moon className="h-4 w-4 text-slate-600 group-hover:-rotate-12 transition-transform duration-300" />
      )}
    </button>
  );
}

