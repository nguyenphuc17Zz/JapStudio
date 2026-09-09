import React from "react";
import Link from "next/link";
import { ContentSource } from "@/lib/types";
import { formatRelativeTime } from "@/lib/date";
import { StatusBadge } from "../ui/StatusBadge";
import { HealthBadge } from "../ui/HealthBadge";
import { CategoryPill } from "../ui/CategoryPill";
import { Zap, RefreshCw, Trash2, ChevronRight, ExternalLink } from "lucide-react";

interface SourceTableProps {
  sources: ContentSource[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onSelectAll: () => void;
  onTestConnection: (source: ContentSource) => void;
  onSync: (source: ContentSource) => void;
  onDelete: (source: ContentSource) => void;
  onToggleStatus: (source: ContentSource) => void;
}

export const SourceTable: React.FC<SourceTableProps> = ({
  sources,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onTestConnection,
  onSync,
  onDelete,
  onToggleStatus,
}) => {
  const allSelected = sources.length > 0 && selectedIds.length === sources.length;

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200 dark:border-sumi-800 bg-white dark:bg-transparent shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-sumi-950/80 text-slate-500 dark:text-sumi-400 font-semibold border-b border-slate-200 dark:border-sumi-800 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-4 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                  className="w-4 h-4 rounded border-sumi-600 bg-sumi-800 text-torii-500 cursor-pointer"
                />
              </th>
              <th className="py-4 px-3">Tên nguồn & URL</th>
              <th className="py-4 px-3">Chuyên mục</th>
              <th className="py-4 px-3">Loại kết nối</th>
              <th className="py-4 px-3">Trạng thái sức khỏe</th>
              <th className="py-4 px-3">Hoạt động</th>
              <th className="py-4 px-3 text-right">Tổng bài</th>
              <th className="py-4 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-sumi-800/60 font-sans">
            {sources.map((source) => {
              const isSelected = selectedIds.includes(source.id);
              return (
                <tr
                  key={source.id}
                  className={`hover:bg-slate-50 dark:hover:bg-sumi-800/30 transition-colors ${
                    isSelected ? "bg-slate-100 dark:bg-sumi-800/40" : ""
                  }`}
                >
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(source.id)}
                      className="w-4 h-4 rounded border-sumi-600 bg-sumi-800 text-torii-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-4 px-3">
                    <div className="space-y-0.5">
                      <Link
                        href={`/sources/${source.id}`}
                        className="font-semibold text-slate-900 dark:text-white hover:text-torii-500 dark:hover:text-torii-400 transition-colors text-sm"
                      >
                        {source.name}
                      </Link>
                      <div className="text-[11px] text-slate-400 dark:text-sumi-500 font-mono flex items-center gap-1.5 truncate max-w-xs">
                        <span>{source.feed_url || source.base_url || "No URL"}</span>
                        {source.base_url && (
                          <a
                            href={source.base_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 dark:text-sumi-400 hover:text-slate-700 dark:hover:text-sumi-200"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      {source.content_roles && source.content_roles.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          {source.content_roles.slice(0, 2).map((role) => (
                            <span
                              key={role}
                              className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-sumi-800 text-amber-700 dark:text-kintsugi-300 border border-slate-200 dark:border-sumi-700/60"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-3">
                    <CategoryPill category={source.category} />
                  </td>
                  <td className="py-4 px-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-torii-500/15 text-torii-300 border border-torii-500/30">
                        {source.connector_type || source.source_type}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-3">
                    <HealthBadge status={source.health_status} />
                  </td>
                  <td className="py-4 px-3">
                    <button onClick={() => onToggleStatus(source)}>
                      <StatusBadge status={source.status} size="sm" />
                    </button>
                  </td>
                  <td className="py-4 px-3 text-right">
                    <span className="font-mono font-bold text-torii-600 dark:text-torii-400 block">
                      {source.items_total_count || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-sumi-500 font-sans block truncate max-w-[100px] ml-auto">
                      {formatRelativeTime(source.last_synced_at)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onTestConnection(source)}
                        className="p-1.5 rounded-lg text-slate-400 dark:text-sumi-400 hover:text-amber-600 dark:hover:text-kintsugi-400 hover:bg-slate-100 dark:hover:bg-sumi-800 transition-colors"
                        title="Kiểm tra kết nối"
                      >
                        <Zap className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onSync(source)}
                        className="p-1.5 rounded-lg text-slate-400 dark:text-sumi-400 hover:text-torii-600 dark:hover:text-torii-400 hover:bg-slate-100 dark:hover:bg-sumi-800 transition-colors"
                        title="Đồng bộ ngay"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(source)}
                        className="p-1.5 rounded-lg text-slate-400 dark:text-sumi-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        title="Xóa nguồn"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <Link
                        href={`/sources/${source.id}`}
                        className="p-1.5 rounded-lg text-slate-500 dark:text-sumi-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-torii-500/20 transition-colors"
                        title="Chi tiết"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
