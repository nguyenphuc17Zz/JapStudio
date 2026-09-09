"use client";
import React, { useEffect, useState, useRef } from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";

type Toast = { id: number; message: string; type: "error" | "success" | "info" | "warning" };

export function GlobalToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(1);
  const lastSeenRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      const { message, type } = ce.detail || {};
      if (!message) return;
      const key = `${type || "error"}:${String(message)}`;
      const now = Date.now();
      const last = lastSeenRef.current.get(key) || 0;
      if (now - last < 2000) return; // dedup 2s
      lastSeenRef.current.set(key, now);
      const id = idRef.current++;
      const isError = (type || "error") === "error";
      setToasts((prev) => {
        const next = [...prev, { id, message: String(message), type: type || "error" }];
        // cap at 3 toasts
        return next.length > 3 ? next.slice(next.length - 3) : next;
      });
      // Allow 5s for error messages, 4s for warnings, 3.5s for normal toasts
      const duration = isError ? 5500 : type === "warning" ? 4000 : 3500;
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
    };
    window.addEventListener("app-toast" as any, handler as any);
    return () => window.removeEventListener("app-toast" as any, handler as any);
  }, []);

  if (!toasts.length) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2.5 max-w-[400px] w-[calc(100vw-2rem)] pointer-events-none" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.type === "error" ? "alert" : "status"}
          aria-live={t.type === "error" ? "assertive" : "polite"}
          className={`pointer-events-auto rounded-xl border shadow-xl px-4 py-3 text-xs sm:text-sm flex items-start gap-2.5 backdrop-blur-md transition-all animate-in fade-in-0 slide-in-from-top-2 duration-200 ${
            t.type === "error"
              ? "bg-red-50/95 border-red-200 text-red-900 dark:bg-red-950/90 dark:border-red-800/80 dark:text-red-200 shadow-red-900/10"
              : t.type === "success"
                ? "bg-emerald-50/95 border-emerald-200 text-emerald-900 dark:bg-emerald-950/90 dark:border-emerald-800/80 dark:text-emerald-200 shadow-emerald-900/10"
                : t.type === "warning"
                  ? "bg-amber-50/95 border-amber-200 text-amber-900 dark:bg-amber-950/90 dark:border-amber-800/80 dark:text-amber-200 shadow-amber-900/10"
                  : "bg-card/95 border-border text-foreground dark:bg-card/90 dark:border-border shadow-black/20"
          }`}
        >
          {t.type === "error" ? (
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
          ) : t.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : t.type === "warning" ? (
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          ) : (
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
          )}
          <span className="flex-1 leading-relaxed font-medium">{t.message}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="text-xs opacity-60 hover:opacity-100 p-0.5 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors shrink-0"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
