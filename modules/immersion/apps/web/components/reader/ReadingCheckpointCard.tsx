"use client";

import React, { useState } from "react";
import { ReadingCheckpoint, CheckpointOption } from "@/lib/types";
import { immersionApi } from "@/lib/api";
import { MarkdownRenderer } from "@/components/ui";
import {
  Compass,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  RotateCw,
} from "lucide-react";

interface ReadingCheckpointCardProps {
  contentId: number;
  checkpoint: ReadingCheckpoint;
  onCheckpointsUpdated?: (newCheckpoints: ReadingCheckpoint[]) => void;
}

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];

export const ReadingCheckpointCard: React.FC<ReadingCheckpointCardProps> = ({
  contentId,
  checkpoint,
  onCheckpointsUpdated,
}) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(Boolean(checkpoint.completed));
  const [result, setResult] = useState<{ is_correct: boolean; explanation: string } | null>(
    checkpoint.completed
      ? {
          is_correct: checkpoint.user_result === "CORRECT",
          explanation: checkpoint.explanation || "",
        }
      : null
  );

  const isCorrupted =
    !checkpoint.options ||
    checkpoint.options.length < 2 ||
    checkpoint.options.some((o) => !o.text || !o.text.trim());

  const handleRegenerate = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isRegenerating || submitting) return;
    setIsRegenerating(true);
    try {
      const newCps = await immersionApi.regenerateCheckpoints(contentId);
      if (onCheckpointsUpdated) {
        onCheckpointsUpdated(newCps);
      }
      setSelectedId(null);
      setResult(null);
      setIsCollapsed(false);
    } catch (err) {
      console.error("Failed to regenerate checkpoints:", err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSelect = async (opt: CheckpointOption) => {
    if (submitting || result || isRegenerating) return;
    setSelectedId(opt.id);
    setSubmitting(true);
    try {
      const res = await immersionApi.submitCheckpoint(contentId, checkpoint.id, opt.id);
      setResult({
        is_correct: res.is_correct,
        explanation: res.explanation,
      });
    } catch (err) {
      console.error("Failed to submit checkpoint answer:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const getCheckpointTitle = (type: string) => {
    switch (type) {
      case "MAIN_IDEA":
        return "Nắm bắt ý chính";
      case "AUTHOR_INTENTION":
        return "Ý định của tác giả";
      case "PREDICT_NEXT":
        return "Dự đoán phần tiếp theo";
      default:
        return "Điểm kiểm tra đọc hiểu";
    }
  };

  return (
    <div
      className="not-prose font-sans text-sm my-6 rounded-2xl bg-gradient-to-br from-sumi-900/95 via-sumi-900/90 to-sumi-950/95 border border-torii-500/30 shadow-[0_8px_30px_rgba(0,0,0,0.45)] overflow-hidden transition-all"
      style={{ lineHeight: "1.5", fontSize: "14px" }}
    >
      {/* Card Header */}
      <div className="px-5 py-3.5 bg-sumi-950/60 border-b border-sumi-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="p-1.5 rounded-lg bg-torii-100 dark:bg-torii-500/20 text-torii-600 dark:text-torii-400 border border-torii-200 dark:border-torii-500/30 flex-shrink-0">
            <Compass className="w-4 h-4" />
          </span>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-torii-600 dark:text-torii-400">
              Checkpoint #{checkpoint.section_index}
            </span>
            <span className="text-xs text-sumi-400 font-medium hidden sm:inline">•</span>
            <span className="text-xs text-sumi-700 dark:text-sumi-300 font-medium truncate">
              {getCheckpointTitle(checkpoint.checkpoint_type)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {result && (
            <span
              className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                result.is_correct
                  ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/80"
                  : "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/80"
              }`}
            >
              {result.is_correct ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Chính xác</span>
                </>
              ) : (
                <>
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Đã xem giải thích</span>
                </>
              )}
            </span>
          )}

          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="p-1.5 rounded-lg text-sumi-500 hover:text-torii-600 dark:text-sumi-400 dark:hover:text-torii-300 hover:bg-sumi-800/60 transition-colors flex items-center gap-1 text-xs disabled:opacity-50"
            title="Làm mới câu hỏi Checkpoint bằng AI"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin text-torii-600 dark:text-torii-400" : ""}`} />
            <span className="text-[11px] hidden sm:inline">
              {isRegenerating ? "Đang tạo lại..." : "Làm mới"}
            </span>
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-sumi-500 hover:text-sumi-900 dark:text-sumi-400 dark:hover:text-white hover:bg-sumi-800/60 transition-colors flex items-center gap-1 text-xs"
            title={isCollapsed ? "Mở rộng câu hỏi" : "Thu gọn"}
          >
            <span className="text-[11px] hidden sm:inline">
              {isCollapsed ? "Mở rộng" : "Thu gọn"}
            </span>
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="p-5 space-y-4">
          {isCorrupted ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/40 text-xs sm:text-sm space-y-3">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                  Câu hỏi checkpoint này đang thiếu nội dung lựa chọn hoặc dữ liệu chưa được cập nhật đầy đủ.
                </p>
              </div>
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="px-3.5 py-2 rounded-xl bg-torii-100 dark:bg-torii-500/20 hover:bg-torii-200 dark:hover:bg-torii-500/30 border border-torii-300 dark:border-torii-500/40 text-torii-800 dark:text-torii-200 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin text-torii-600 dark:text-torii-400" : ""}`} />
                <span>{isRegenerating ? "AI đang tạo lại câu hỏi..." : "Tạo lại câu hỏi bằng AI ngay"}</span>
              </button>
            </div>
          ) : (
            <>
              {/* Question Text */}
              <div className="flex items-start gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-torii-100 dark:bg-torii-500/15 text-torii-700 dark:text-torii-300 text-[11px] font-bold font-mono uppercase tracking-wide border border-torii-200 dark:border-torii-500/25 mt-0.5 flex-shrink-0">
                  Câu hỏi
                </span>
                <p className="text-sm sm:text-base font-medium text-sumi-900 dark:text-white leading-relaxed">
                  {checkpoint.question_text}
                </p>
              </div>

          {/* Options List */}
          <div className="space-y-2.5 pt-1">
            {checkpoint.options.map((opt, idx) => {
              const label = OPTION_LABELS[idx] || `${idx + 1}`;
              const isUserChoice = selectedId === opt.id;

              let cardStyle =
                "bg-sumi-850/80 hover:bg-sumi-800 border-sumi-750/80 text-sumi-800 dark:text-sumi-200 hover:border-torii-500/40 hover:text-sumi-950 dark:hover:text-sumi-100";
              let badgeStyle = "bg-sumi-200 dark:bg-sumi-800 text-sumi-800 dark:text-sumi-300 border-sumi-300 dark:border-sumi-700 font-semibold";

              if (result) {
                if (opt.is_correct) {
                  cardStyle =
                    "bg-emerald-100/80 dark:bg-emerald-950/70 border-emerald-400 dark:border-emerald-600/90 text-emerald-900 dark:text-emerald-100 ring-1 ring-emerald-500/40 shadow-sm";
                  badgeStyle = "bg-emerald-600 dark:bg-emerald-800 text-white border-emerald-500 font-bold";
                } else if (isUserChoice && !result.is_correct) {
                  cardStyle =
                    "bg-rose-100/80 dark:bg-rose-950/70 border-rose-400 dark:border-rose-600/90 text-rose-900 dark:text-rose-100 ring-1 ring-rose-500/40";
                  badgeStyle = "bg-rose-600 dark:bg-rose-800 text-white border-rose-500 font-bold";
                } else {
                  cardStyle = "bg-sumi-950/40 border-sumi-850 text-sumi-500 opacity-60";
                  badgeStyle = "bg-sumi-100 dark:bg-sumi-900 text-sumi-500 dark:text-sumi-600 border-sumi-300 dark:border-sumi-800";
                }
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt)}
                  disabled={Boolean(result) || submitting}
                  className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-start justify-between gap-3 group relative overflow-hidden ${cardStyle}`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold font-mono border flex-shrink-0 transition-colors ${badgeStyle}`}
                    >
                      {label}
                    </span>
                    <span className="leading-relaxed font-normal pt-0.5">
                      {opt.text}
                    </span>
                  </div>

                  {result && opt.is_correct && (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex-shrink-0 pt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Đáp án đúng</span>
                    </span>
                  )}
                  {result && isUserChoice && !result.is_correct && (
                    <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 text-xs font-semibold flex-shrink-0 pt-0.5">
                      <XCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">Lựa chọn của bạn</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Submitting indicator */}
          {submitting && (
            <div className="flex items-center justify-center gap-2 py-2 text-xs text-torii-600 dark:text-torii-300 font-medium">
              <RotateCw className="w-3.5 h-3.5 animate-spin text-torii-500 dark:text-torii-400" />
              <span>Đang kiểm tra đáp án...</span>
            </div>
          )}

          {/* Explanation Banner */}
          {result && (
            <div
              className={`p-4 rounded-xl border text-xs sm:text-sm leading-relaxed animate-in fade-in duration-200 mt-3 shadow-sm ${
                result.is_correct
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-100"
                  : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/70 text-amber-900 dark:text-amber-100"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 font-bold">
                <span className="flex items-center gap-1.5 font-mono text-xs">
                  {result.is_correct ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-800 dark:text-emerald-300 font-semibold">Giải thích chi tiết:</span>
                    </>
                  ) : (
                    <>
                      <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-amber-800 dark:text-amber-300 font-semibold">Gợi ý phân tích & giải thích:</span>
                    </>
                  )}
                </span>
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="text-[11px] font-medium text-sumi-600 hover:text-sumi-900 dark:text-sumi-300 dark:hover:text-white flex items-center gap-1 hover:underline"
                >
                  <span>Tiếp tục đọc</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="text-sumi-800 dark:text-sumi-200 leading-relaxed pt-1">
                <MarkdownRenderer content={result.explanation} />
              </div>
            </div>
          )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

