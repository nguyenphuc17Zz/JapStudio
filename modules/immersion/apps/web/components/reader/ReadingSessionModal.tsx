"use client";

import React, { useState, useEffect } from "react";
import { ReadingSessionSummary } from "@/lib/types";
import { immersionApi } from "@/lib/api";
import {
  X,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  ArrowRight,
} from "lucide-react";

interface ReadingSessionModalProps {
  contentId: number;
  isOpen: boolean;
  onClose: () => void;
}

export const ReadingSessionModal: React.FC<ReadingSessionModalProps> = ({
  contentId,
  isOpen,
  onClose,
}) => {
  const [summary, setSummary] = useState<ReadingSessionSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    immersionApi
      .getSessionSummary(contentId)
      .then((res) => setSummary(res))
      .catch((err) => console.error("Failed to load session summary:", err))
      .finally(() => setLoading(false));
  }, [contentId, isOpen]);

  if (!isOpen) return null;

  const getSignalBadge = (sig: "strong" | "medium" | "needs_review") => {
    switch (sig) {
      case "strong":
        return "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 font-semibold";
      case "medium":
        return "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-800 font-semibold";
      case "needs_review":
        return "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-400 border-rose-300 dark:border-rose-800 font-semibold";
      default:
        return "bg-sumi-100 dark:bg-sumi-800 text-sumi-700 dark:text-sumi-300 border-sumi-300 dark:border-sumi-700 font-semibold";
    }
  };

  const getSignalLabel = (sig: "strong" | "medium" | "needs_review") => {
    switch (sig) {
      case "strong":
        return "Nắm vững";
      case "medium":
        return "Tương đối";
      case "needs_review":
        return "Cần xem lại";
      default:
        return "Tốt";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-2xl bg-sumi-900 border border-sumi-700 shadow-2xl p-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-torii-500/10 rounded-full blur-3xl -mr-10 -mt-10" />

        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-torii-100 dark:bg-torii-500/20 text-torii-600 dark:text-torii-400 border border-torii-200 dark:border-torii-500/30">
              <Award className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-torii-600 dark:text-torii-400">
                Nhật ký đọc hiểu
              </span>
              <h3 className="text-lg font-bold text-sumi-900 dark:text-white font-serif tracking-wide">
                Tổng kết phiên đọc
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-sumi-400 hover:text-sumi-900 dark:hover:text-white hover:bg-sumi-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-sumi-400">
            Đang tổng hợp tín hiệu đọc hiểu...
          </div>
        ) : summary ? (
          <div className="space-y-4 text-xs">
            {/* Meta Stats Bar */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-sumi-950/70 border border-sumi-800 text-center font-mono">
              <div>
                <span className="text-[10px] text-sumi-500 block">Tiến độ</span>
                <span className="text-sm font-bold text-torii-600 dark:text-torii-400">{summary.progress_percent}%</span>
              </div>
              <div>
                <span className="text-[10px] text-sumi-500 block">Thời gian</span>
                <span className="text-sm font-bold text-sumi-800 dark:text-sumi-200">
                  {Math.round(summary.time_spent_seconds / 60)} phút
                </span>
              </div>
              <div>
                <span className="text-[10px] text-sumi-500 block">Tương tác</span>
                <span className="text-sm font-bold text-sky-600 dark:text-sky-400">{summary.interactions_count}</span>
              </div>
            </div>

            {/* Comprehension Signals */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-sumi-600 dark:text-sumi-400 block mb-2 font-mono">
                Tín hiệu hiểu bài (Comprehension Signals):
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-sumi-850/80 border border-sumi-750 flex items-center justify-between">
                  <span className="text-sumi-700 dark:text-sumi-300 font-medium">Từ vựng ngữ cảnh</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getSignalBadge(summary.signals.vocabulary_signal)}`}>
                    {getSignalLabel(summary.signals.vocabulary_signal)}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-sumi-850/80 border border-sumi-750 flex items-center justify-between">
                  <span className="text-sumi-700 dark:text-sumi-300 font-medium">Ý chính đoạn văn</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getSignalBadge(summary.signals.main_idea_signal)}`}>
                    {getSignalLabel(summary.signals.main_idea_signal)}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-sumi-850/80 border border-sumi-750 flex items-center justify-between">
                  <span className="text-sumi-700 dark:text-sumi-300 font-medium">Cấu trúc ngữ pháp</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getSignalBadge(summary.signals.grammar_signal)}`}>
                    {getSignalLabel(summary.signals.grammar_signal)}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-sumi-850/80 border border-sumi-750 flex items-center justify-between">
                  <span className="text-sumi-700 dark:text-sumi-300 font-medium">Suy luận sắc thái</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getSignalBadge(summary.signals.inference_signal)}`}>
                    {getSignalLabel(summary.signals.inference_signal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Struggled items if any */}
            {summary.struggled_items?.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 shadow-sm">
                <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-400 font-semibold mb-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Điểm cần lưu ý thêm:</span>
                </div>
                <ul className="space-y-1 text-amber-900 dark:text-amber-200/90 list-disc list-inside text-[11px]">
                  {summary.struggled_items.slice(0, 4).map((item, idx) => (
                    <li key={idx} className="font-serif">
                      {item.target} ({item.result})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-torii-500 hover:bg-torii-600 text-white text-xs font-semibold shadow-lg transition-all"
              >
                Đã ghi nhận, hoàn tất
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
