"use client";

import React, { useState } from "react";
import { UserExpressionItem } from "@/lib/types";
import { api } from "@/lib/api";
import { notify } from "@/components/ui";
import {
  X,
  Sparkles,
  Link2,
  CheckCircle2,
  EyeOff,
  BookOpen,
} from "lucide-react";

interface ExpressionDetailModalProps {
  item: UserExpressionItem | null;
  onClose: () => void;
  onUpdated?: (updated: UserExpressionItem) => void;
}

const statusBadge = (status: string) => {
  switch (status) {
    case "MASTERED":
      return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Thành thạo</span>;
    case "FAMILIAR":
      return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">Quen thuộc</span>;
    case "LEARNING":
      return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">Đang học</span>;
    case "IGNORED":
      return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sumi-800 text-sumi-400 border border-sumi-700">Đã ẩn</span>;
    default:
      return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-torii-500/20 text-torii-300 border border-torii-500/30">Mới gặp</span>;
  }
};

export const ExpressionDetailModal: React.FC<ExpressionDetailModalProps> = ({
  item,
  onClose,
  onUpdated,
}) => {
  const [detail, setDetail] = useState<UserExpressionItem | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);

  // Show live-updated detail after backfill, fall back to the list item.
  const shown = detail && item && detail.id === item.id ? detail : item;
  if (!shown) return null;

  const hasAiDetail = Boolean(
    (shown.usage_context || "").trim() ||
      (shown.composition || "").trim() ||
      (shown.examples?.length || 0) > 0 ||
      (shown.alternatives?.length || 0) > 0
  );

  const handleEnrich = async () => {
    if (isEnriching) return;
    try {
      setIsEnriching(true);
      const updated = await api.enrichExpressionDetail(shown.id);
      setDetail(updated);
      onUpdated?.(updated);
      notify.success("Đã bổ sung hoàn cảnh, cấu tạo và ví dụ!");
    } catch (err: any) {
      notify.error(err?.message || "Không thể bổ sung AI lúc này. Hãy thử lại sau.");
    } finally {
      setIsEnriching(false);
    }
  };

  const handleStatus = async (next: string) => {
    try {
      await api.updateKnowledgeItemStatus("EXPRESSION", shown.id, next);
      const updated = { ...shown, status: next as UserExpressionItem["status"] };
      setDetail(updated);
      onUpdated?.(updated);
      notify.success("Đã cập nhật trạng thái học tập!");
    } catch (err: any) {
      notify.error(err?.message || "Không thể cập nhật trạng thái");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
      <div className="bg-sumi-900 border border-sumi-700 rounded-2xl max-w-xl md:max-w-2xl w-full p-4 sm:p-5 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-sumi-400 hover:text-white hover:bg-sumi-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-2 pr-8">
          <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
            <Link2 className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <span className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-semibold">
              Cụm từ trong Thư viện
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-serif tracking-wide break-words">
              {shown.expression}
            </h2>
            {shown.reading && (
              <div className="text-sm text-sky-300 font-medium">【{shown.reading}】</div>
            )}
          </div>
        </div>

        {/* Meaning + badges */}
        <div className="p-3 rounded-xl bg-sumi-950/70 border border-sumi-800">
          <p className="text-base font-bold text-white leading-snug">{shown.meaning}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {shown.type && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {shown.type}
              </span>
            )}
            {statusBadge(shown.status)}
          </div>
        </div>

        {/* Backfill button when AI detail is missing */}
        {!hasAiDetail && (
          <button
            onClick={handleEnrich}
            disabled={isEnriching}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/40 hover:bg-amber-200 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs font-semibold transition-all disabled:opacity-50 shadow-sm"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isEnriching ? "animate-spin" : ""}`} />
            <span>{isEnriching ? "AI đang bổ sung chi tiết..." : "Bổ sung hoàn cảnh, cấu tạo & ví dụ bằng AI"}</span>
          </button>
        )}

        {/* Composition */}
        {shown.composition && (
          <div className="p-3 rounded-xl bg-sky-500/5 border border-sky-500/20">
            <div className="text-[11px] font-semibold text-sky-300 mb-1">Cấu tạo cụm</div>
            <p className="text-xs text-sumi-200 leading-relaxed">{shown.composition}</p>
          </div>
        )}

        {/* Usage situations */}
        {shown.usage_context && (
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-1.5 text-amber-300 text-xs font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Hoàn cảnh sử dụng</span>
            </div>
            <p className="text-xs text-sumi-300 leading-relaxed">{shown.usage_context}</p>
          </div>
        )}

        {/* Real examples */}
        {shown.examples && shown.examples.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-sumi-300 text-xs font-semibold mb-2">
              <BookOpen className="w-3.5 h-3.5 text-sumi-400" />
              <span>Ví dụ thực tế ({shown.examples.length})</span>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {shown.examples.map((ex, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-sumi-950 border border-sumi-800/80 space-y-1">
                  <p className="text-sm text-white font-serif leading-relaxed">{ex.sentence_ja}</p>
                  {ex.sentence_vi && (
                    <p className="text-[11px] text-sumi-400">{ex.sentence_vi}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related expressions */}
        {shown.alternatives && shown.alternatives.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-sumi-300 mb-2">Cụm liên quan:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {shown.alternatives.map((alt, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-sumi-950 border border-sumi-800">
                  <div className="text-sm font-bold text-white font-serif truncate">{alt.expression}</div>
                  {alt.reading && <div className="text-[11px] text-sumi-400">【{alt.reading}】</div>}
                  {alt.meaning_vi && <div className="text-xs text-sky-300 truncate">{alt.meaning_vi}</div>}
                  {alt.difference && (
                    <div className="text-[11px] text-sumi-500 line-clamp-2 mt-0.5">≠ {alt.difference}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-sumi-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStatus("MASTERED")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Đánh dấu đã thuộc
            </button>
            <button
              onClick={() => handleStatus("IGNORED")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-sumi-800 hover:bg-sumi-700 text-sumi-300 transition-colors"
            >
              <EyeOff className="w-3.5 h-3.5" /> Ẩn cụm này
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-sumi-800 text-sumi-200 hover:text-white transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
