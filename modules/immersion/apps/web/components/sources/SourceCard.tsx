import React, { useState } from "react";
import Link from "next/link";
import { ContentSource } from "@/lib/types";
import { formatRelativeTime } from "@/lib/date";
import { StatusBadge } from "../ui/StatusBadge";
import { HealthBadge } from "../ui/HealthBadge";
import { CategoryPill } from "../ui/CategoryPill";
import {
  RefreshCw,
  Zap,
  Clock,
  FileText,
  AlertTriangle,
  MoreVertical,
  Trash2,
  Edit,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

interface SourceCardProps {
  source: ContentSource;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onTestConnection: (source: ContentSource) => void;
  onSync: (source: ContentSource) => void;
  onDelete: (source: ContentSource) => void;
  onToggleStatus: (source: ContentSource) => void;
}

export const SourceCard: React.FC<SourceCardProps> = ({
  source,
  isSelected,
  onToggleSelect,
  onTestConnection,
  onSync,
  onDelete,
  onToggleStatus,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSyncing(true);
    try {
      await onSync(source);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div
      className={`glass-panel glass-panel-hover rounded-2xl p-5 relative overflow-hidden border transition-all duration-300 flex flex-col justify-between ${
        isSelected
          ? "border-torii-500/60 bg-torii-50 dark:bg-sumi-850/90 shadow-[0_0_20px_rgba(230,57,70,0.2)]"
          : "border-slate-200 dark:border-sumi-700/60 bg-white dark:bg-sumi-900/60"
      }`}
    >
      {/* Top Bar: Selection, Type, Status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="w-4 h-4 rounded border-sumi-600 bg-sumi-800 text-torii-500 focus:ring-torii-500/20 cursor-pointer"
            />
          )}
          <CategoryPill category={source.category} />
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-torii-500/15 text-torii-600 dark:text-torii-300 border border-torii-500/30">
            {source.connector_type || source.source_type}
          </span>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-sumi-800/80 text-slate-500 dark:text-sumi-400 border border-slate-200 dark:border-sumi-700">
            {source.source_type}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <HealthBadge status={source.health_status} />
          <button
            onClick={() => onToggleStatus(source)}
            title={source.status === "active" ? "Nhấn để tạm dừng" : "Nhấn để kích hoạt"}
          >
            <StatusBadge status={source.status} size="sm" />
          </button>
        </div>
      </div>

      {/* Main Info */}
      <div className="space-y-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/sources/${source.id}`}
            className="group/title flex-1 font-bold text-base text-slate-900 dark:text-white hover:text-torii-500 dark:hover:text-torii-400 transition-colors line-clamp-1"
          >
            {source.name}
          </Link>
          {source.base_url && (
            <a
              href={source.base_url}
              target="_blank"
              rel="noreferrer"
              title="Mở website gốc"
              className="text-slate-400 dark:text-sumi-500 hover:text-slate-700 dark:hover:text-sumi-300 p-1 rounded transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        <p className="text-xs text-slate-500 dark:text-sumi-400 line-clamp-2 leading-relaxed min-h-[32px] font-medium">
          {source.description || "Chưa có mô tả cho nguồn này."}
        </p>

        {/* Content Roles Chips */}
        {source.content_roles && source.content_roles.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {source.content_roles.slice(0, 3).map((role) => (
              <span
                key={role}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-sumi-800/90 text-amber-700 dark:text-kintsugi-300 border border-slate-200 dark:border-sumi-700/80"
              >
                {role}
              </span>
            ))}
          </div>
        )}

        {/* Warning banner if error */}
        {source.last_error_message && (
          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-center gap-1.5 line-clamp-1">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
            <span className="truncate">{source.last_error_message}</span>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 py-3 my-3 border-y border-slate-200 dark:border-sumi-800/80 text-xs">
        <div>
          <span className="text-[10px] text-slate-400 dark:text-sumi-500 block font-semibold">Chu kỳ / Ưu tiên</span>
          <span className="font-mono text-slate-700 dark:text-sumi-200 font-semibold">
            {source.sync_interval_minutes}m <span className="text-amber-600 dark:text-kintsugi-400 font-bold ml-1 text-[10px]">P{source.priority ?? 5}</span>
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 dark:text-sumi-500 block font-semibold">Đồng bộ gần nhất</span>
          <span className="font-semibold text-slate-700 dark:text-sumi-200 truncate block">
            {formatRelativeTime(source.last_synced_at)}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 dark:text-sumi-500 block font-semibold">Tổng mục</span>
          <span className="font-mono text-torii-600 dark:text-torii-400 font-bold">
            {source.items_total_count || 0}
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onTestConnection(source)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-sumi-300 bg-slate-100 dark:bg-sumi-800/80 hover:bg-slate-200 dark:hover:bg-sumi-700 hover:text-slate-900 dark:hover:text-white transition-colors border border-slate-200 dark:border-sumi-700"
            title="Kiểm tra endpoint & độ trễ"
          >
            <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-kintsugi-400" />
            <span>Test</span>
          </button>

          <button
            onClick={handleSyncClick}
            disabled={isSyncing}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-sumi-300 bg-slate-100 dark:bg-sumi-800/80 hover:bg-slate-200 dark:hover:bg-sumi-700 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 transition-colors border border-slate-200 dark:border-sumi-700"
            title="Đồng bộ thủ công ngay"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-torii-500 dark:text-torii-400 ${isSyncing ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onDelete(source)}
            className="p-1.5 rounded-lg text-slate-400 dark:text-sumi-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
            title="Xóa nguồn này"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <Link
            href={`/sources/${source.id}`}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-torii-500/20 hover:bg-torii-500 border border-torii-500/30 transition-all group/btn"
          >
            <span>Chi tiết</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
};
