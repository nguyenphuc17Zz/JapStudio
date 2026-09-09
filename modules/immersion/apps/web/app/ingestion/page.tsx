"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { immersionApi } from "@/lib/api";
import {
  IngestionJob,
  IngestionStats,
  ContentSource,
} from "@/lib/types";
import { JobDetailModal } from "@/components/ingestion/JobDetailModal";
import { notify, confirmDialog } from "@/components/ui";
import {
  Sparkles,
  RefreshCw,
  Database,
  Layers,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Play,
  RotateCcw,
  Ban,
  ChevronRight,
  Filter,
  Eye,
  FileText,
} from "lucide-react";

export default function IngestionDashboardPage() {
  const [stats, setStats] = useState<IngestionStats | null>(null);
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSourceId, setSelectedSourceId] = useState<number | "all">("all");
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(10); // 0, 5, 10 seconds
  const [page, setPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);

  // Modal State
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Quick manual sync state
  const [manualSyncSourceId, setManualSyncSourceId] = useState<number | "">("");
  const [isTriggeringSync, setIsTriggeringSync] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [statsData, jobsData, sourcesData] = await Promise.all([
        immersionApi.getIngestionStats(),
        immersionApi.getIngestionJobs({
          status: statusFilter !== "all" ? statusFilter : undefined,
          source_id: selectedSourceId !== "all" ? Number(selectedSourceId) : undefined,
          page,
          page_size: 15,
        }),
        immersionApi.getSources({ status: "active" }),
      ]);

      setStats(statsData);
      setJobs(jobsData.items);
      setTotalJobs(jobsData.total);
      setSources(sourcesData);
    } catch (err) {
      console.error("Failed to load ingestion data:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [statusFilter, selectedSourceId, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      loadData();
    }, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, loadData]);

  const handleManualSync = async () => {
    if (!manualSyncSourceId) return;
    const sourceId = Number(manualSyncSourceId);
    const syncToast = notify.loading(`Đang tạo Ingestion Job cho nguồn #${sourceId}...`);
    try {
      setIsTriggeringSync(true);
      // Enqueue a REAL ingestion job (persists canonical_contents for /immersion feed).
      const res = await immersionApi.syncSource(sourceId, true);
      if (!res.success || !res.job_id) {
        notify.update(syncToast, {
          type: "error",
          message: `Lỗi đồng bộ: ${res.message}`,
          duration: 5000,
        });
        return;
      }
      notify.update(syncToast, {
        type: "info",
        message: `Đã tạo Job #${res.job_id}, đang xử lý...`,
        duration: 3000,
      });
      setManualSyncSourceId("");
      await loadData();
      const job = await immersionApi.pollIngestionJob(res.job_id);
      if (job.status === "SUCCESS" || job.status === "PARTIAL_SUCCESS") {
        notify.success(
          `Job #${job.id} xong: +${job.items_created} bài mới (dup ${job.items_duplicate}, reject ${job.items_rejected}).`
        );
      } else if (job.status !== "QUEUED" && job.status !== "RUNNING") {
        notify.update(syncToast, {
          type: "error",
          message: `Job #${job.id} ${job.status}: ${job.error_summary || res.message}`,
          duration: 6000,
        });
      }
      await loadData();
    } catch (err: any) {
      notify.update(syncToast, {
        type: "error",
        message: `Thất bại: ${err.message}`,
        duration: 5000,
      });
    } finally {
      setIsTriggeringSync(false);
    }
  };

  const handleCancelJob = async (jobId: number) => {
    const confirmed = await confirmDialog({
      title: "Xác nhận hủy tác vụ",
      message: `Bạn có chắc muốn hủy bỏ Ingestion Job #${jobId}? Tác vụ đang chạy sẽ bị dừng lại.`,
      variant: "warning",
      confirmText: "Hủy bỏ Job",
    });
    if (!confirmed) return;

    try {
      await immersionApi.cancelJob(jobId);
      notify.info(`Đã gửi lệnh hủy bỏ Ingestion Job #${jobId}.`);
      await loadData();
    } catch (err: any) {
      notify.error(`Lỗi: ${err.message}`);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            <CheckCircle className="w-3 h-3" /> SUCCESS
          </span>
        );
      case "RUNNING":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-torii-300 bg-torii-500/15 border border-torii-500/30 px-2 py-0.5 rounded-full animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" /> RUNNING
          </span>
        );
      case "QUEUED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-sumi-300 bg-sumi-800 border border-sumi-700 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3 text-sumi-400" /> QUEUED
          </span>
        );
      case "PARTIAL_SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" /> PARTIAL
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-full">
            <XCircle className="w-3 h-3" /> FAILED
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-sumi-400 bg-sumi-900 border border-sumi-800 px-2 py-0.5 rounded-full">
            <Ban className="w-3 h-3" /> CANCELLED
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-mono text-sumi-300 bg-sumi-800 px-2 py-0.5 rounded">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-sumi-950 text-sumi-100">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Header Banner */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-sumi-800 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-torii-400 bg-torii-500/15 px-2.5 py-0.5 rounded-full border border-torii-500/30">
                  Engine Core &bull; Phase 2
                </span>
                <span className="text-xs font-mono text-sumi-500">Autonomous Ingestion Pipeline</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
                <span>Giám sát Content Ingestion</span>
                <Sparkles className="w-6 h-6 text-kintsugi-400" />
              </h1>
              <p className="text-xs text-sumi-400 max-w-2xl leading-relaxed">
                Tự động quét và thu thập bài đọc tiếng Nhật từ các nguồn dữ liệu, bóc tách chuẩn hóa, khử trùng lặp và lưu thành bản ghi chuẩn cho Content Intelligence.
              </p>
            </div>

            {/* Quick Trigger & Auto Refresh */}
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              {/* Auto Refresh Selector */}
              <div className="flex items-center gap-1.5 bg-sumi-900/80 p-1.5 rounded-xl border border-sumi-800 text-xs">
                <Clock className="w-3.5 h-3.5 text-sumi-400 ml-1" />
                <span className="text-sumi-400 text-[11px]">Tự làm mới:</span>
                <select
                  value={autoRefreshInterval}
                  onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                  className="bg-sumi-800 text-sumi-200 text-xs rounded-lg px-2 py-1 outline-none border border-sumi-700 cursor-pointer font-mono"
                >
                  <option value={0}>Tắt</option>
                  <option value={5}>5s</option>
                  <option value={10}>10s</option>
                  <option value={30}>30s</option>
                </select>
                <button
                  onClick={loadData}
                  disabled={isRefreshing}
                  className="p-1 rounded-lg text-sumi-400 hover:text-white hover:bg-sumi-800 transition-colors"
                  title="Làm mới ngay"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                </button>
              </div>

              {/* Manual Run Selector */}
              <div className="flex items-center gap-2">
                <select
                  value={manualSyncSourceId}
                  onChange={(e) => setManualSyncSourceId(e.target.value ? Number(e.target.value) : "")}
                  className="bg-sumi-900 border border-sumi-800 rounded-xl px-3 py-2 text-xs text-sumi-200 outline-none max-w-[180px] truncate"
                >
                  <option value="">Chọn nguồn để chạy...</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.connector_type || s.source_type})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleManualSync}
                  disabled={!manualSyncSourceId || isTriggeringSync}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-torii-500 hover:bg-torii-600 disabled:opacity-40 text-white shadow-lg transition-all"
                >
                  <Play className={`w-3.5 h-3.5 ${isTriggeringSync ? "animate-spin" : ""}`} />
                  <span>Run Now</span>
                </button>
              </div>
            </div>
          </div>

          {/* 7 KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-4 border-t border-sumi-800/80">
            <div className="bg-sumi-950/60 p-3 rounded-2xl border border-sumi-850 space-y-1">
              <span className="text-[10px] text-sumi-500 uppercase font-semibold block">Jobs hôm nay</span>
              <span className="text-xl font-bold font-mono text-white">
                {stats?.jobs_today || 0}
              </span>
            </div>

            <div className="bg-sumi-950/60 p-3 rounded-2xl border border-sumi-850 space-y-1">
              <span className="text-[10px] text-sumi-500 uppercase font-semibold block">Đã quét về</span>
              <span className="text-xl font-bold font-mono text-torii-400">
                {stats?.items_fetched || 0}
              </span>
            </div>

            <div className="bg-sumi-950/60 p-3 rounded-2xl border border-sumi-850 space-y-1">
              <span className="text-[10px] text-sumi-500 uppercase font-semibold block">Tạo bài mới</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                +{stats?.items_created || 0}
              </span>
            </div>

            <div className="bg-sumi-950/60 p-3 rounded-2xl border border-sumi-850 space-y-1">
              <span className="text-[10px] text-sumi-500 uppercase font-semibold block">Cập nhật nội dung</span>
              <span className="text-xl font-bold font-mono text-blue-400">
                {stats?.items_updated || 0}
              </span>
            </div>

            <div className="bg-sumi-950/60 p-3 rounded-2xl border border-sumi-850 space-y-1">
              <span className="text-[10px] text-sumi-500 uppercase font-semibold block">Khử trùng (Dupes)</span>
              <span className="text-xl font-bold font-mono text-kintsugi-400">
                {stats?.items_duplicate || 0}
              </span>
            </div>

            <div className="bg-sumi-950/60 p-3 rounded-2xl border border-sumi-850 space-y-1">
              <span className="text-[10px] text-sumi-500 uppercase font-semibold block">Loại bỏ (Reject)</span>
              <span className="text-xl font-bold font-mono text-amber-400">
                {stats?.items_rejected || 0}
              </span>
            </div>

            <div className="bg-sumi-950/60 p-3 rounded-2xl border border-sumi-850 space-y-1">
              <span className="text-[10px] text-sumi-500 uppercase font-semibold block">Thời lượng TB</span>
              <span className="text-xl font-bold font-mono text-sumi-300">
                {stats?.avg_duration_ms ? `${stats.avg_duration_ms}ms` : "-"}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="glass-panel rounded-2xl p-4 border border-sumi-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            {["all", "SUCCESS", "RUNNING", "QUEUED", "PARTIAL_SUCCESS", "FAILED"].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                  statusFilter === st
                    ? "bg-torii-500 text-white shadow-md"
                    : "bg-sumi-900 text-sumi-400 hover:text-sumi-200 hover:bg-sumi-800"
                }`}
              >
                {st === "all" ? "Tất cả trạng thái" : st}
              </button>
            ))}
          </div>

          {/* Filter by Source */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-sumi-400 shrink-0" />
            <select
              value={selectedSourceId}
              onChange={(e) => {
                setSelectedSourceId(e.target.value === "all" ? "all" : Number(e.target.value));
                setPage(1);
              }}
              className="bg-sumi-900 border border-sumi-800 text-xs rounded-xl px-3 py-1.5 text-sumi-200 outline-none"
            >
              <option value="all">Tất cả nguồn ({sources.length})</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Jobs Table */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-sumi-800">
          <div className="p-4 border-b border-sumi-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-torii-400" />
              <span>Danh sách các phiên Ingestion ({totalJobs})</span>
            </h2>
            <span className="text-xs text-sumi-500 font-mono">Trang {page}</span>
          </div>

          {isLoading ? (
            <div className="py-20 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-torii-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-12 text-center text-xs text-sumi-400 space-y-2">
              <p>Chưa có phiên Ingestion nào theo điều kiện lọc này.</p>
              <p className="text-sumi-500 text-[11px]">
                Hãy nhấn "Run Now" hoặc chờ chu kỳ Scheduler tự động kích hoạt.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-sumi-950/80 text-sumi-400 font-semibold border-b border-sumi-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Job ID</th>
                    <th className="py-3 px-3">Tên nguồn</th>
                    <th className="py-3 px-3">Loại Job</th>
                    <th className="py-3 px-3">Trạng thái</th>
                    <th className="py-3 px-3">Bắt đầu / Thời lượng</th>
                    <th className="py-3 px-3 text-center">Fetched</th>
                    <th className="py-3 px-3 text-center">New</th>
                    <th className="py-3 px-3 text-center">Dupes</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sumi-800/60 font-mono text-[11px]">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-sumi-800/30 transition-colors">
                      <td className="py-3 px-4 text-sumi-400 font-bold">
                        #{job.id}
                      </td>

                      <td className="py-3 px-3 font-sans">
                        <div className="space-y-0.5">
                          <Link
                            href={`/sources/${job.source_id}`}
                            className="font-bold text-white hover:text-torii-400 transition-colors text-xs line-clamp-1"
                          >
                            {job.source_name || `Source #${job.source_id}`}
                          </Link>
                          <span className="text-[10px] font-mono text-sumi-500 px-1.5 py-0.2 rounded bg-sumi-850 border border-sumi-800">
                            {job.connector_type || "CONNECTOR"}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-sumi-800 text-sumi-300 border border-sumi-700">
                          {job.job_type}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {statusBadge(job.status)}
                      </td>

                      <td className="py-3 px-3 text-sumi-300">
                        <span className="block text-[11px]">
                          {job.started_at ? new Date(job.started_at).toLocaleTimeString() : "-"}
                        </span>
                        <span className="text-[10px] text-sumi-500 block">
                          {job.duration_ms ? `${Math.round(job.duration_ms)}ms` : "-"}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-white">
                        {job.items_fetched}
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-emerald-400">
                        {job.items_created > 0 ? `+${job.items_created}` : 0}
                      </td>

                      <td className="py-3 px-3 text-center text-kintsugi-300">
                        {job.items_duplicate}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {job.status === "QUEUED" && (
                            <button
                              onClick={() => handleCancelJob(job.id)}
                              className="p-1.5 rounded-lg text-sumi-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Hủy job này"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSelectedJobId(job.id);
                              setIsDetailOpen(true);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-sumi-300 bg-sumi-800 hover:bg-sumi-700 hover:text-white transition-all font-sans"
                          >
                            <Eye className="w-3 h-3 text-torii-400" />
                            <span>Chi tiết</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalJobs > 15 && (
            <div className="p-4 border-t border-sumi-800 flex items-center justify-between text-xs">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg bg-sumi-800 text-sumi-300 disabled:opacity-40 hover:text-white"
              >
                Trang trước
              </button>
              <span className="text-sumi-400 font-mono">Trang {page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={jobs.length < 15}
                className="px-3 py-1.5 rounded-lg bg-sumi-800 text-sumi-300 disabled:opacity-40 hover:text-white"
              >
                Trang kế tiếp
              </button>
            </div>
          )}
        </div>
      </main>

      <JobDetailModal
        jobId={selectedJobId}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onJobRetried={loadData}
      />
    </div>
  );
}
