"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  X,
} from "lucide-react";
import { useNotification, ToastItemData } from "./NotificationContext";

function ToastItem({ toast }: { toast: ToastItemData }) {
  const { dismissToast } = useNotification();
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(toast.duration);

  useEffect(() => {
    if (toast.duration <= 0) return;

    let timerId: NodeJS.Timeout;
    const intervalMs = 25;

    const interval = setInterval(() => {
      if (isPaused) return;

      remainingTimeRef.current -= intervalMs;
      const pct = Math.max(0, (remainingTimeRef.current / toast.duration) * 100);
      setProgress(pct);

      if (remainingTimeRef.current <= 0) {
        clearInterval(interval);
        dismissToast(toast.id);
      }
    }, intervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [toast.id, toast.duration, isPaused, dismissToast]);

  const getTheme = () => {
    switch (toast.type) {
      case "success":
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />,
          cardBorder: "border-emerald-500/40 shadow-[0_12px_35px_rgba(16,185,129,0.18)] ring-1 ring-emerald-500/20",
          barColor: "bg-emerald-400",
          titleColor: "text-emerald-300",
          glow: "bg-emerald-500/10",
        };
      case "error":
        return {
          icon: <AlertCircle className="w-5 h-5 text-torii-400 flex-shrink-0 mt-0.5" />,
          cardBorder: "border-torii-500/50 shadow-[0_12px_35px_rgba(230,57,70,0.22)] ring-1 ring-torii-500/25",
          barColor: "bg-torii-500",
          titleColor: "text-torii-300",
          glow: "bg-torii-500/10",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-5 h-5 text-kintsugi-400 flex-shrink-0 mt-0.5" />,
          cardBorder: "border-kintsugi-500/45 shadow-[0_12px_35px_rgba(212,175,55,0.18)] ring-1 ring-kintsugi-500/20",
          barColor: "bg-kintsugi-400",
          titleColor: "text-kintsugi-300",
          glow: "bg-kintsugi-500/10",
        };
      case "loading":
        return {
          icon: <Loader2 className="w-5 h-5 text-kintsugi-400 flex-shrink-0 mt-0.5 animate-spin" />,
          cardBorder: "border-sumi-700 shadow-[0_12px_35px_rgba(212,175,55,0.12)] ring-1 ring-kintsugi-500/30",
          barColor: "bg-kintsugi-400",
          titleColor: "text-kintsugi-300",
          glow: "bg-kintsugi-500/10",
        };
      case "info":
      default:
        return {
          icon: <Info className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />,
          cardBorder: "border-sky-500/40 shadow-[0_12px_35px_rgba(56,189,248,0.18)] ring-1 ring-sky-500/20",
          barColor: "bg-sky-400",
          titleColor: "text-sky-300",
          glow: "bg-sky-500/10",
        };
    }
  };

  const theme = getTheme();

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl bg-sumi-900/95 backdrop-blur-xl border ${theme.cardBorder} p-3.5 transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-top-4`}
    >
      {/* Subtle background ambient glow */}
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none ${theme.glow}`} />

      <div className="relative flex items-start gap-3">
        {theme.icon}

        <div className="flex-1 min-w-0 pr-2">
          {toast.title && (
            <h4 className={`text-xs font-bold font-mono tracking-tight ${theme.titleColor} mb-0.5`}>
              {toast.title}
            </h4>
          )}
          <p className="text-xs text-sumi-100 font-medium leading-relaxed break-words">
            {toast.message}
          </p>

          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                dismissToast(toast.id);
              }}
              className="mt-2 text-xs font-semibold px-2.5 py-1 rounded-lg bg-sumi-800 hover:bg-sumi-750 text-white transition-colors"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => dismissToast(toast.id)}
          className="text-sumi-400 hover:text-white p-1 rounded-lg hover:bg-sumi-800/60 transition-colors flex-shrink-0"
          title="Đóng thông báo"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress Bar for Auto-dismiss */}
      {toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sumi-800/50">
          <div
            className={`h-full ${theme.barColor} transition-[width] duration-75 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useNotification();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="assertive"
      className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
