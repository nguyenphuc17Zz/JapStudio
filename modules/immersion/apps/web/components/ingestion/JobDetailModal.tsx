import React, { useState, useEffect } from "react";
import { IngestionJob, IngestionItemLog } from "@/lib/types";
import { immersionApi } from "@/lib/api";
import { notify } from "@/components/ui";
import {
  X,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Layers,
  ArrowRight,
  Database,
  FileText,
  ShieldAlert,
} from "lucide-react";

interface JobDetailModalProps {
  jobId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onJobRetried?: () => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  jobId,
  isOpen,
  onClose,
  onJobRetried,
}) => {
  const [job, setJob] = useState<IngestionJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (isOpen && jobId) {
      loadDetail();
    } else {
      setJob(null);
    }
  }, [isOpen, jobId]);

  const loadDetail = async () => {
    if (!jobId) return;
    try {
      setIsLoading(true);
      const res = await immersionApi.getJobDetail(jobId);
      setJob(res);
    } catch (err) {
      console.error("Failed to load job detail:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!job) return;
    try {
      setIsRetrying(true);
      await immersionApi.retryJob(job.id);
      notify.success(`Đã đưa job #${job.id} vào hàng đợi để thử lại!`);
      if (onJobRetried) onJobRetried();
      await loadDetail();
    } catch (err: any) {
      notify.error(`Lỗi retry: ${err.message}`);
    } finally {
      setIsRetrying(false);
    }
  };

  if (!isOpen || !jobId) return null;

  const statusColors: Record<string, string> = {
    SUCCESS: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    PARTIAL_SUCCESS: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    RUNNING: "text-torii-400 bg-torii-500/10 border-torii-500/30",
    QUEUED: "text-sumi-300 bg-sumi-800 border-sumi-700",
    FAILED: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    CANCELLED: "text-sumi-400 bg-sumi-900 border-sumi-800",
  };

  const itemStatusBadge = (status: string) => {
    switch (status) {
      case "CREATED":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">CREATED</span>;
      case "UPDATED":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/40">UPDATED</span>;
      case "DUPLICATE":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sumi-800 text-sumi-400 border border-sumi-700">DUPLICATE</span>;
      case "REJECTED":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">REJECTED</span>;
      case "FAILED":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/40">FAILED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sumi-800 text-sumi-300">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-sumi-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-sumi-900 border border-sumi-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-sumi-800/80 flex items-start justify-between gap-4 bg-sumi-950/40">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono font-bold text-sumi-400">JOB #{jobId}</span>
              {job && (
                <>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-torii-500/15 text-torii-300 border border-torii-500/30">
                    {job.connector_type || "CONNECTOR"}
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sumi-800 text-sumi-300 border border-sumi-700">
                    {job.job_type}
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${statusColors[job.status] || "text-sumi-300"}`}>
                    {job.status}
                  </span>
                </>
              )}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {job?.source_name ? `Nguồn: ${job.source_name}` : "Chi tiết phiên Ingestion"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {job && (job.status === "FAILED" || job.status === "CANCELLED") && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-torii-500 hover:bg-torii-600 disabled:opacity-50 text-white shadow-md transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                <span>Thử lại (Retry)</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-sumi-400 hover:text-white hover:bg-sumi-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-20 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-torii-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !job ? (
            <div className="py-12 text-center text-xs text-sumi-400">Không tìm thấy thông tin job này.</div>
          ) : (
            <>
              {/* Timeline Flow */}
              <div className="bg-sumi-950/70 p-5 rounded-2xl border border-sumi-800/80 space-y-3">
                <span className="text-[11px] font-semibold text-sumi-400 uppercase tracking-wider block">
                  Tiến trình Ingestion (Pipeline Stages)
                </span>
                <div className="flex items-center justify-between gap-1 overflow-x-auto text-xs py-2 no-scrollbar">
                  <div className="flex flex-col items-center min-w-[90px] text-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mb-1">
                      <Clock className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-white text-[11px]">Queued</span>
                    <span className="text-[9px] text-sumi-500 font-mono">
                      {job.created_at ? new Date(job.created_at).toLocaleTimeString() : "-"}
                    </span>
                  </div>

                  <ArrowRight className="w-4 h-4 text-sumi-600 shrink-0" />

                  <div className="flex flex-col items-center min-w-[90px] text-center">
                    <div className="w-8 h-8 rounded-full bg-torii-500/20 text-torii-300 border border-torii-500/40 flex items-center justify-center mb-1">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-white text-[11px]">Worker Start</span>
                    <span className="text-[9px] text-sumi-500 font-mono">
                      {job.started_at ? new Date(job.started_at).toLocaleTimeString() : "-"}
                    </span>
                  </div>

                  <ArrowRight className="w-4 h-4 text-sumi-600 shrink-0" />

                  <div className="flex flex-col items-center min-w-[90px] text-center">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center mb-1">
                      <Database className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-white text-[11px]">Fetched</span>
                    <span className="text-[10px] text-blue-300 font-mono font-bold">
                      {job.items_fetched} items
                    </span>
                  </div>

                  <ArrowRight className="w-4 h-4 text-sumi-600 shrink-0" />

                  <div className="flex flex-col items-center min-w-[90px] text-center">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center mb-1">
                      <Layers className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-white text-[11px]">Normalized</span>
                    <span className="text-[10px] text-purple-300 font-mono font-bold">
                      {job.items_normalized}
                    </span>
                  </div>

                  <ArrowRight className="w-4 h-4 text-sumi-600 shrink-0" />

                  <div className="flex flex-col items-center min-w-[90px] text-center">
                    <div className="w-8 h-8 rounded-full bg-kintsugi-500/20 text-kintsugi-400 border border-kintsugi-500/40 flex items-center justify-center mb-1">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-white text-[11px]">Deduplicated</span>
                    <span className="text-[10px] text-kintsugi-300 font-mono font-bold">
                      {job.items_duplicate} dupes
                    </span>
                  </div>

                  <ArrowRight className="w-4 h-4 text-sumi-600 shrink-0" />

                  <div className="flex flex-col items-center min-w-[90px] text-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                      job.status === "SUCCESS"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : job.status === "FAILED"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    }`}>
                      {job.status === "SUCCESS" ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                    </div>
                    <span className="font-semibold text-white text-[11px]">Persisted</span>
                    <span className="text-[10px] text-emerald-300 font-mono font-bold">
                      +{job.items_created} new
                    </span>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-sumi-950/60 border border-sumi-800">
                  <span className="text-[10px] text-sumi-500 font-sans block">Bài lấy về (Fetched)</span>
                  <span className="text-xl font-bold text-white">{job.items_fetched}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-sumi-950/60 border border-sumi-800">
                  <span className="text-[10px] text-sumi-500 font-sans block">Tạo mới (Created)</span>
                  <span className="text-xl font-bold text-emerald-400">+{job.items_created}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-sumi-950/60 border border-sumi-800">
                  <span className="text-[10px] text-sumi-500 font-sans block">Cập nhật (Updated)</span>
                  <span className="text-xl font-bold text-blue-400">{job.items_updated}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-sumi-950/60 border border-sumi-800">
                  <span className="text-[10px] text-sumi-500 font-sans block">Trùng lặp (Duplicates)</span>
                  <span className="text-xl font-bold text-sumi-400">{job.items_duplicate}</span>
                </div>
              </div>

              {/* Error Detail Banner if Failed */}
              {job.error_summary && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-rose-400">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Lỗi thực thi Ingestion ({job.error_type || "transient"} error)</span>
                  </div>
                  <div className="font-mono bg-sumi-950/80 p-3 rounded-xl border border-rose-500/20 whitespace-pre-wrap">
                    {job.error_summary}
                  </div>
                  {job.retry_count > 0 && (
                    <span className="text-[11px] text-rose-400 block font-sans">
                      Đã thử lại {job.retry_count}/{job.max_retries} lần.
                    </span>
                  )}
                </div>
              )}

              {/* Item-Level Audit Logs Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-sumi-200 uppercase tracking-wider">
                    Nhật ký xử lý từng bài (Item-Level Logs — {job.item_logs?.length || 0})
                  </h3>
                </div>

                {!job.item_logs || job.item_logs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-sumi-500 bg-sumi-950/40 rounded-xl border border-sumi-800">
                    Chưa có nhật ký item chi tiết trong phiên này.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-sumi-800/80">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-sumi-950 text-sumi-400 font-semibold border-b border-sumi-800 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Trạng thái</th>
                          <th className="py-2.5 px-3">External ID</th>
                          <th className="py-2.5 px-3">Canonical URL</th>
                          <th className="py-2.5 px-3">Lý do / Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sumi-800/60 font-mono text-[11px]">
                        {job.item_logs.map((log) => (
                          <tr key={log.id} className="hover:bg-sumi-800/30">
                            <td className="py-2.5 px-3">
                              {itemStatusBadge(log.status)}
                            </td>
                            <td className="py-2.5 px-3 text-sumi-300">
                              {log.external_id || "-"}
                            </td>
                            <td className="py-2.5 px-3 text-sumi-300 truncate max-w-xs font-sans">
                              {log.url ? (
                                <a
                                  href={log.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:text-torii-400 flex items-center gap-1"
                                >
                                  <span className="truncate">{log.url}</span>
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-sumi-400 font-sans text-xs">
                              {log.reason || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
