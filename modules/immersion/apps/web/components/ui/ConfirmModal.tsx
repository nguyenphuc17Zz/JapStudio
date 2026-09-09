"use client";

import React, { useEffect, useCallback } from "react";
import { AlertTriangle, AlertCircle, HelpCircle, Loader2 } from "lucide-react";
import { useNotification } from "./NotificationContext";

export function ConfirmModal() {
  const { confirmState, handleConfirmDecision } = useNotification();
  const { isOpen, options, isLoading } = confirmState;

  const onCancel = useCallback(() => {
    if (isLoading) return;
    handleConfirmDecision(false);
  }, [isLoading, handleConfirmDecision]);

  const onConfirm = useCallback(() => {
    if (isLoading) return;
    handleConfirmDecision(true);
  }, [isLoading, handleConfirmDecision]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen || !options) return null;

  const variant = options.variant || "default";

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          iconContainer: "bg-torii-500/15 border-torii-500/30 text-torii-400 shadow-[0_0_25px_rgba(230,57,70,0.35)]",
          icon: <AlertTriangle className="w-6 h-6 animate-pulse" />,
          glow: "bg-torii-500/10",
          confirmBtn: "bg-torii-500 hover:bg-torii-600 text-white shadow-[0_0_15px_rgba(230,57,70,0.4)] hover:shadow-[0_0_20px_rgba(230,57,70,0.6)]",
        };
      case "warning":
        return {
          iconContainer: "bg-kintsugi-500/15 border-kintsugi-500/30 text-kintsugi-400 shadow-[0_0_25px_rgba(212,175,55,0.3)]",
          icon: <AlertCircle className="w-6 h-6" />,
          glow: "bg-kintsugi-500/10",
          confirmBtn: "bg-kintsugi-500 hover:bg-kintsugi-400 text-sumi-950 shadow-[0_0_15px_rgba(212,175,55,0.3)]",
        };
      case "default":
      default:
        return {
          iconContainer: "bg-sky-500/15 border-sky-500/30 text-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.3)]",
          icon: <HelpCircle className="w-6 h-6" />,
          glow: "bg-sky-500/10",
          confirmBtn: "bg-kintsugi-500 hover:bg-kintsugi-400 text-sumi-950 shadow-[0_0_15px_rgba(212,175,55,0.3)]",
        };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-sumi-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative max-w-md w-full rounded-2xl bg-white dark:bg-sumi-900 border border-slate-200 dark:border-sumi-750 shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Ambient Glow */}
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none ${vStyles.glow}`} />

        <div className="flex flex-col items-center text-center space-y-3.5">
          {/* Glowing Icon Container */}
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all ${vStyles.iconContainer}`}
          >
            {vStyles.icon}
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {options.title}
            </h3>
            <div className="text-xs text-slate-600 dark:text-sumi-300 leading-relaxed max-w-sm">
              {options.message}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3 w-full pt-3 border-t border-slate-200 dark:border-sumi-800">
            <button
              type="button"
              disabled={isLoading}
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-sumi-850 hover:bg-slate-200 dark:hover:bg-sumi-800 text-slate-700 dark:text-sumi-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-sumi-750 text-xs font-semibold transition-all disabled:opacity-50"
            >
              {options.cancelText || "Hủy bỏ"}
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 ${vStyles.confirmBtn}`}
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>
                {isLoading
                  ? "Đang xử lý..."
                  : options.confirmText || (variant === "danger" ? "Đồng ý xóa" : "Xác nhận")}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
