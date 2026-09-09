"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { immersionApi } from "@/lib/api";
import {
  ContentSource,
  ActivityLog,
  TestConnectionResponse,
  STANDARD_CAPABILITIES,
  CapabilityStatus,
  IngestionJob,
} from "@/lib/types";
import { formatDateTime } from "@/lib/date";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { CategoryPill } from "@/components/ui/CategoryPill";
import { notify, confirmDialog } from "@/components/ui";
import { SourceForm } from "@/components/sources/SourceForm";
import { TestConnectionModal } from "@/components/sources/TestConnectionModal";
import { JobDetailModal } from "@/components/ingestion/JobDetailModal";
import {
  ChevronLeft,
  Zap,
  RefreshCw,
  Trash2,
  Clock,
  FileText,
  Activity,
  Code,
  Edit,
  ExternalLink,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Layers,
  Settings,
  HeartPulse,
  BarChart3,
  Database,
  Copy,
  Check,
  Lock,
  Sliders,
  Sparkles,
  Save,
  HelpCircle,
} from "lucide-react";

type TabKey =
  | "overview"
  | "connection"
  | "config"
  | "capabilities"
  | "fetch"
  | "health"
  | "stats"
  | "logs"
  | "ingestion"
  | "edit";

export default function SourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sourceId = Number(params?.id);

  const [source, setSource] = useState<ContentSource | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [ingestionHistory, setIngestionHistory] = useState<IngestionJob[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Job Detail Modal State
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [isJobDetailOpen, setIsJobDetailOpen] = useState(false);

  // Capabilities editable state
  const [capabilitiesState, setCapabilitiesState] = useState<Record<string, CapabilityStatus>>({});
  const [isSavingCapabilities, setIsSavingCapabilities] = useState(false);
  const [capabilitiesSavedSuccess, setCapabilitiesSavedSuccess] = useState(false);

  // Test Modal
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResponse | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  const loadSourceData = useCallback(async () => {
    if (!sourceId) return;
    try {
      setIsLoading(true);
      const [sourceData, logsData, historyData] = await Promise.all([
        immersionApi.getSource(sourceId),
        immersionApi.getSourceLogs(sourceId),
        immersionApi.getSourceIngestionHistory(sourceId).catch(() => []),
      ]);
      setSource(sourceData);
      setLogs(logsData);
      setIngestionHistory(historyData);
      setCapabilitiesState(sourceData.capabilities || {});
    } catch (err) {
      console.error("Failed to load source details:", err);
    } finally {
      setIsLoading(false);
    }
  }, [sourceId]);

  useEffect(() => {
    loadSourceData();
  }, [loadSourceData]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(label);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleTest = async () => {
    if (!source) return;
    setIsTesting(true);
    setIsTestModalOpen(true);
    try {
      const res = await immersionApi.testConnection(source.id);
      setTestResult(res);
      await loadSourceData();
    } catch (err: any) {
      setTestResult({
        success: false,
        response_time_ms: 0,
        message: err.message,
        error_details: err.message,
        sample_items_count: 0,
        sample_preview: [],
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSync = async () => {
    if (!source) return;
    const syncToast = notify.loading(`Đang ingest nguồn "${source.name}"...`);
    try {
      setIsSyncing(true);
      // Enqueue a REAL ingestion job (persists canonical_contents for /immersion feed).
      const res = await immersionApi.syncSource(source.id, true);
      if (!res.success || !res.job_id) {
        notify.update(syncToast, {
          type: "error",
          message: `Lỗi đồng bộ: ${res.message}`,
          duration: 5000,
        });
        await loadSourceData();
        return;
      }
      notify.update(syncToast, {
        type: "info",
        message: `Đã tạo Ingestion Job #${res.job_id}, đang xử lý...`,
        duration: 3000,
      });
      const job = await immersionApi.pollIngestionJob(res.job_id);
      if (job.status === "SUCCESS" || job.status === "PARTIAL_SUCCESS") {
        notify.success(
          `Ingest xong: +${job.items_created} bài mới (dup ${job.items_duplicate}, reject ${job.items_rejected}).`
        );
      } else if (job.status === "QUEUED" || job.status === "RUNNING") {
        notify.update(syncToast, {
          type: "info",
          message: `Job #${job.id} vẫn đang ${job.status}, xem ở tab Lịch sử Ingestion.`,
          duration: 5000,
        });
      } else {
        notify.update(syncToast, {
          type: "error",
          message: `Ingest thất bại (job #${job.id}): ${job.error_summary || res.message}`,
          duration: 6000,
        });
      }
      await loadSourceData();
    } catch (err: any) {
      notify.update(syncToast, {
        type: "error",
        message: `Đồng bộ thất bại: ${err.message}`,
        duration: 5000,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!source) return;
    const confirmed = await confirmDialog({
      title: "Xác nhận xóa nguồn tin",
      message: `Bạn có chắc muốn xóa nguồn "${source.name}"? Dữ liệu lịch sử ingest và log liên quan sẽ bị xóa vĩnh viễn.`,
      variant: "danger",
      confirmText: "Xóa nguồn",
    });
    if (!confirmed) return;
    try {
      await immersionApi.deleteSource(source.id);
      notify.success(`Đã xóa nguồn "${source.name}" thành công!`);
      router.push("/sources");
    } catch (err: any) {
      notify.error(`Lỗi xóa: ${err.message}`);
    }
  };

  const handleCapabilityChange = (key: string, newStatus: CapabilityStatus) => {
    setCapabilitiesState((prev) => ({
      ...prev,
      [key]: newStatus,
    }));
  };

  const handleSaveCapabilities = async () => {
    if (!source) return;
    try {
      setIsSavingCapabilities(true);
      const updated = await immersionApi.updateCapabilities(source.id, capabilitiesState);
      setSource(updated);
      setCapabilitiesSavedSuccess(true);
      notify.success("Đã cập nhật ma trận khả năng thành công!");
      setTimeout(() => setCapabilitiesSavedSuccess(false), 3000);
    } catch (err: any) {
      notify.error(`Lỗi lưu ma trận khả năng: ${err.message}`);
    } finally {
      setIsSavingCapabilities(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-sumi-950 text-sumi-100">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-torii-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!source) {
    return (
      <div className="min-h-screen flex flex-col bg-sumi-950 text-sumi-100">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center space-y-3">
          <p className="text-sm text-sumi-400">Không tìm thấy nguồn dữ liệu này.</p>
          <Link href="/sources" className="text-xs text-torii-400 hover:underline">
            Quay lại danh sách nguồn
          </Link>
        </div>
      </div>
    );
  }

  const isSkeletonConnector = ["REDDIT", "X", "THREADS", "GRAPHQL", "CUSTOM"].includes(
    (source.connector_type || "").toUpperCase()
  );

  const capabilityStatusColors: Record<CapabilityStatus, string> = {
    AVAILABLE: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    PARTIAL: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    NOT_CONFIGURED: "bg-sumi-800 text-sumi-400 border-sumi-700",
    UNSUPPORTED: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    UNKNOWN: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  };

  const tabs: { key: TabKey; label: string; icon: any; count?: number }[] = [
    { key: "overview", label: "Tổng quan", icon: Layers },
    { key: "connection", label: "Kết nối", icon: Zap },
    { key: "config", label: "Cấu hình", icon: Code },
    { key: "capabilities", label: "Ma trận tính năng", icon: Sparkles },
    { key: "fetch", label: "Cài đặt thu thập", icon: Sliders },
    { key: "health", label: "Sức khỏe & Chẩn đoán", icon: HeartPulse },
    { key: "stats", label: "Thống kê", icon: BarChart3 },
    { key: "logs", label: "Nhật ký kiểm toán", icon: Activity, count: logs.length },
    { key: "ingestion", label: "Lịch sử Ingestion", icon: Database, count: ingestionHistory.length },
    { key: "edit", label: "Chỉnh sửa", icon: Edit },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-sumi-950 text-sumi-100">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-sumi-400">
          <Link href="/sources" className="hover:text-white flex items-center gap-1 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <span>Danh sách nguồn</span>
          </Link>
          <span>/</span>
          <span className="text-sumi-200 font-medium">{source.name}</span>
        </div>

        {/* Source Header Banner */}
        <div className="glass-panel rounded-2xl p-6 border border-sumi-800 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <CategoryPill category={source.category || (source.categories && source.categories[0]) || "general"} />
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-torii-500/20 text-torii-300 border border-torii-500/40">
                  {source.connector_type || source.source_type}
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-sumi-800 text-sumi-300 border border-sumi-700">
                  {source.source_type}
                </span>
                <HealthBadge status={source.health_status} />
                <StatusBadge status={source.status} />
                {source.is_syncing && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-kintsugi-400 bg-kintsugi-500/15 border border-kintsugi-500/30 px-2 py-0.5 rounded-full animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Đang đồng bộ...
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <span>{source.name}</span>
                {source.base_url && (
                  <a
                    href={source.base_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sumi-500 hover:text-sumi-300 transition-colors"
                    title="Mở URL gốc"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                )}
              </h1>

              <div className="flex items-center gap-2 flex-wrap text-xs text-sumi-400">
                {source.content_roles && source.content_roles.length > 0 && (
                  <div className="flex items-center gap-1 mr-2">
                    <span className="text-sumi-500 text-[11px]">Vai trò học tập:</span>
                    {source.content_roles.map((role) => (
                      <span
                        key={role}
                        className="text-[10px] font-medium px-2 py-0.5 rounded bg-sumi-800/80 text-kintsugi-300 border border-sumi-700"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                )}
                <span className="text-sumi-500 font-mono text-[11px]">
                  ID: #{source.id} &bull; slug: {source.slug}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={handleTest}
                disabled={isTesting}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-sumi-800 hover:bg-sumi-700 text-kintsugi-400 border border-sumi-700 transition-all active:scale-95"
              >
                <Zap className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`} />
                <span>Test Connection</span>
              </button>

              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-torii-500 hover:bg-torii-600 disabled:opacity-50 text-white shadow-[0_0_15px_rgba(230,57,70,0.3)] transition-all active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>Đồng bộ ngay</span>
              </button>

              <button
                onClick={() => setActiveTab("edit")}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-sumi-850 hover:bg-sumi-800 text-sumi-300 border border-sumi-700 transition-all"
                title="Chỉnh sửa cấu hình"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Sửa</span>
              </button>

              <button
                onClick={handleDelete}
                className="p-2 rounded-xl text-sumi-400 hover:text-rose-400 hover:bg-rose-500/10 border border-sumi-800 transition-colors"
                title="Xóa nguồn này"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-sumi-800/80 text-xs">
            <div className="bg-sumi-950/60 p-3 rounded-xl border border-sumi-850">
              <span className="text-[10px] text-sumi-500 block">Tổng bài đã lưu</span>
              <span className="text-lg font-bold font-mono text-torii-400">
                {source.items_total_count || source.items_fetched_total || 0}
              </span>
            </div>

            <div className="bg-sumi-950/60 p-3 rounded-xl border border-sumi-850">
              <span className="text-[10px] text-sumi-500 block">Thu thập hôm nay</span>
              <span className="text-lg font-bold font-mono text-kintsugi-400">
                {source.items_fetched_today || 0}
              </span>
            </div>

            <div className="bg-sumi-950/60 p-3 rounded-xl border border-sumi-850">
              <span className="text-[10px] text-sumi-500 block">Chu kỳ đồng bộ</span>
              <span className="text-lg font-bold font-mono text-sumi-200">
                {source.sync_interval_minutes}m
              </span>
            </div>

            <div className="bg-sumi-950/60 p-3 rounded-xl border border-sumi-850">
              <span className="text-[10px] text-sumi-500 block">Độ ưu tiên (Priority)</span>
              <span className="text-lg font-bold font-mono text-emerald-400">
                P{source.priority ?? 5} / 10
              </span>
            </div>
          </div>
        </div>

        {/* 8-Tab Console Navigation */}
        <div className="flex border-b border-sumi-800 text-xs font-semibold overflow-x-auto no-scrollbar gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-torii-500 text-white font-bold bg-torii-500/5"
                    : "border-transparent text-sumi-400 hover:text-sumi-200 hover:border-sumi-700"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-torii-400" : ""}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-sumi-800 text-sumi-300 font-mono">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Information Card */}
              <div className="glass-panel rounded-2xl p-5 border border-sumi-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-torii-400" />
                  <span>Thông tin cơ bản nguồn dữ liệu</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-sumi-500 text-[11px] block">Mô tả:</span>
                    <p className="text-sumi-300 mt-0.5 leading-relaxed">
                      {source.description || "Chưa có mô tả cho nguồn này."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-sumi-800/60">
                    <div>
                      <span className="text-sumi-500 text-[11px] block">Connector Type:</span>
                      <span className="font-mono font-bold text-white">
                        {source.connector_type || source.source_type}
                      </span>
                    </div>
                    <div>
                      <span className="text-sumi-500 text-[11px] block">Chuyên mục chính:</span>
                      <span className="font-sans font-medium text-white capitalize">
                        {source.category || "General"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-sumi-800/60 space-y-2">
                    <span className="text-sumi-500 text-[11px] block">Địa chỉ URLs:</span>
                    {source.feed_url && (
                      <div className="flex items-center justify-between bg-sumi-950 p-2 rounded-lg font-mono text-[11px] text-sumi-300">
                        <span className="truncate mr-2 font-medium text-torii-300">Feed: {source.feed_url}</span>
                        <button
                          onClick={() => copyToClipboard(source.feed_url!, "feed")}
                          className="text-sumi-500 hover:text-white shrink-0 p-1"
                          title="Sao chép"
                        >
                          {copiedUrl === "feed" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                    {source.base_url && (
                      <div className="flex items-center justify-between bg-sumi-950 p-2 rounded-lg font-mono text-[11px] text-sumi-300">
                        <span className="truncate mr-2">Base: {source.base_url}</span>
                        <button
                          onClick={() => copyToClipboard(source.base_url!, "base")}
                          className="text-sumi-500 hover:text-white shrink-0 p-1"
                          title="Sao chép"
                        >
                          {copiedUrl === "base" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status & Sync Snapshot Card */}
              <div className="glass-panel rounded-2xl p-5 border border-sumi-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-emerald-400" />
                  <span>Trạng thái hoạt động & Sức khỏe</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-sumi-800/60">
                    <span className="text-sumi-400">Trạng thái hệ thống:</span>
                    <StatusBadge status={source.status} />
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-sumi-800/60">
                    <span className="text-sumi-400">Sức khỏe kết nối:</span>
                    <HealthBadge status={source.health_status} />
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-sumi-800/60">
                    <span className="text-sumi-400">Lần đồng bộ thành công gần nhất:</span>
                    <span className="font-mono text-sumi-300">
                      {source.last_successful_sync_at
                        ? formatDateTime(source.last_successful_sync_at)
                        : "Chưa từng thành công"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-sumi-800/60">
                    <span className="text-sumi-400">Lần đồng bộ gần nhất:</span>
                    <span className="font-mono text-sumi-300">
                      {source.last_synced_at || source.last_sync_at
                        ? formatDateTime(source.last_synced_at || source.last_sync_at)
                        : "Chưa đồng bộ"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sumi-400">Số lần lỗi liên tiếp:</span>
                    <span
                      className={`font-mono font-bold ${
                        source.consecutive_failure_count > 0 ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {source.consecutive_failure_count}
                    </span>
                  </div>

                  {source.last_error_message && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                      <div>
                        <strong className="block text-rose-400">Lỗi ghi nhận gần nhất:</strong>
                        <span>{source.last_error_message}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Connection */}
        {activeTab === "connection" && (
          <div className="glass-panel rounded-2xl p-6 border border-sumi-800 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-kintsugi-400" />
                  <span>Chi tiết kết nối mạng & Endpoint</span>
                </h3>
                <p className="text-xs text-sumi-400 mt-1">
                  Kiểm tra URL đích, connector handler đang đảm nhận và chẩn đoán đường truyền.
                </p>
              </div>

              <button
                onClick={handleTest}
                disabled={isTesting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-torii-500 hover:bg-torii-600 text-white shadow-lg transition-all"
              >
                <Zap className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`} />
                <span>Kiểm tra kết nối trực tiếp (Live Test)</span>
              </button>
            </div>

            {isSkeletonConnector && (
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-start gap-3">
                <Shield className="w-5 h-5 shrink-0 text-indigo-400 mt-0.5" />
                <div>
                  <strong className="block text-indigo-200 font-semibold mb-1">
                    Connector Skeleton Khung Nền tảng (Platform Skeleton)
                  </strong>
                  Nguồn này sử dụng connector chuẩn hóa cho nền tảng mạng xã hội/GraphQL. Trong Phase 1, khung connector trả về mã <code>NOT_CONFIGURED</code> để giữ an toàn kiến trúc chờ cấu hình Token/API Key ở Phase 2.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-sumi-950/60 p-4 rounded-xl border border-sumi-800 space-y-2">
                <span className="text-xs text-sumi-400 font-semibold block">Feed / API Endpoint URL</span>
                <div className="flex items-center gap-2 font-mono text-xs text-torii-300 bg-sumi-900 p-2.5 rounded-lg border border-sumi-800 break-all">
                  <span className="flex-1">{source.feed_url || "Chưa thiết lập feed URL"}</span>
                  {source.feed_url && (
                    <button
                      onClick={() => copyToClipboard(source.feed_url!, "tab_feed")}
                      className="text-sumi-400 hover:text-white p-1"
                      title="Sao chép"
                    >
                      {copiedUrl === "tab_feed" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-sumi-950/60 p-4 rounded-xl border border-sumi-800 space-y-2">
                <span className="text-xs text-sumi-400 font-semibold block">Base / Website Homepage URL</span>
                <div className="flex items-center gap-2 font-mono text-xs text-sumi-200 bg-sumi-900 p-2.5 rounded-lg border border-sumi-800 break-all">
                  <span className="flex-1">{source.base_url || "Chưa thiết lập base URL"}</span>
                  {source.base_url && (
                    <button
                      onClick={() => copyToClipboard(source.base_url!, "tab_base")}
                      className="text-sumi-400 hover:text-white p-1"
                      title="Sao chép"
                    >
                      {copiedUrl === "tab_base" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-sumi-950/40 p-4 rounded-xl border border-sumi-800/80 space-y-3">
              <h4 className="text-xs font-semibold text-sumi-300 uppercase tracking-wider">
                Thông số đường truyền mạng gần nhất
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-sumi-500 text-[10px] block">Connector thực thi:</span>
                  <span className="font-mono font-bold text-white">{source.connector_type || source.source_type}</span>
                </div>
                <div>
                  <span className="text-sumi-500 text-[10px] block">Độ trễ phản hồi:</span>
                  <span className="font-mono text-kintsugi-400 font-bold">
                    {source.last_sync_duration_ms ? `${source.last_sync_duration_ms}ms` : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-sumi-500 text-[10px] block">Bảo vệ SSRF:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" /> Bật (Active)
                  </span>
                </div>
                <div>
                  <span className="text-sumi-500 text-[10px] block">External ID:</span>
                  <span className="font-mono text-sumi-300 truncate block">
                    {source.external_identifier || "None"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Configuration */}
        {activeTab === "config" && (
          <div className="glass-panel rounded-2xl p-6 border border-sumi-800 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Code className="w-4 h-4 text-torii-400" />
                <span>Cấu hình Connector & Tham số giao thức</span>
              </h3>
              <p className="text-xs text-sumi-400 mt-1">
                JSON cấu hình chuyên biệt, bộ HTTP Headers tùy biến và quản lý chứng thực đã mã hóa.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Connector Config JSON */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-sumi-300 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-kintsugi-400" />
                  <span>Connector Config (config_json)</span>
                </span>
                <pre className="font-mono text-xs text-sumi-300 whitespace-pre-wrap overflow-x-auto bg-sumi-950 p-4 rounded-xl border border-sumi-800 max-h-96">
                  {JSON.stringify(source.config_json || {}, null, 2)}
                </pre>
              </div>

              {/* Headers JSON */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-sumi-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-torii-400" />
                  <span>Custom HTTP Headers (headers_json)</span>
                </span>
                <pre className="font-mono text-xs text-sumi-300 whitespace-pre-wrap overflow-x-auto bg-sumi-950 p-4 rounded-xl border border-sumi-800 max-h-96">
                  {JSON.stringify(source.headers_json || {}, null, 2)}
                </pre>
              </div>
            </div>

            {/* Credential Security Box */}
            <div className="p-4 rounded-xl bg-sumi-950/80 border border-sumi-800 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-white flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Bảo mật chứng thực (Credentials Storage)</span>
                </span>
                <p className="text-xs text-sumi-400">
                  {source.credential_reference
                    ? `Nguồn này đang gắn khoá chứng thực bí mật (Ref: ${source.credential_reference})`
                    : "Nguồn này hoạt động ở chế độ Public / Không yêu cầu mã khóa bảo mật."}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Fernet AES-256 Symmetric
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Capabilities Matrix */}
        {activeTab === "capabilities" && (
          <div className="glass-panel rounded-2xl p-6 border border-sumi-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-kintsugi-400" />
                  <span>Ma trận 12 Khả năng Chuẩn hóa (Capabilities Matrix)</span>
                </h3>
                <p className="text-xs text-sumi-400 mt-1">
                  Đánh giá và cấu hình khả năng trích xuất nội dung tiếng Nhật để Content Engine điều phối.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {capabilitiesSavedSuccess && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold animate-pulse">
                    <CheckCircle className="w-3.5 h-3.5" /> Đã lưu thành công!
                  </span>
                )}
                <button
                  onClick={handleSaveCapabilities}
                  disabled={isSavingCapabilities}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-torii-500 hover:bg-torii-600 disabled:opacity-50 text-white shadow-lg transition-all"
                >
                  <Save className={`w-3.5 h-3.5 ${isSavingCapabilities ? "animate-spin" : ""}`} />
                  <span>Lưu thay đổi ma trận</span>
                </button>
              </div>
            </div>

            {/* 12 Standard Capabilities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(STANDARD_CAPABILITIES).map(([capKey, capMeta]) => {
                const currentStatus: CapabilityStatus =
                  capabilitiesState[capKey] ||
                  (source.capabilities && source.capabilities[capKey]) ||
                  "UNKNOWN";

                return (
                  <div
                    key={capKey}
                    className="p-4 rounded-xl bg-sumi-950/70 border border-sumi-800 hover:border-sumi-700 transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-white">
                          {capMeta.label}
                        </span>
                        <code className="text-[10px] text-sumi-500 font-mono">
                          {capKey}
                        </code>
                      </div>
                      <p className="text-[11px] text-sumi-400 leading-relaxed min-h-[32px]">
                        {capMeta.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-sumi-800/60 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-sumi-500 uppercase tracking-wider font-medium">
                        Trạng thái:
                      </span>
                      <select
                        value={currentStatus}
                        onChange={(e) =>
                          handleCapabilityChange(capKey, e.target.value as CapabilityStatus)
                        }
                        className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg border cursor-pointer outline-none transition-colors ${capabilityStatusColors[currentStatus]}`}
                      >
                        <option value="AVAILABLE" className="bg-sumi-900 text-emerald-400">
                          AVAILABLE
                        </option>
                        <option value="PARTIAL" className="bg-sumi-900 text-amber-400">
                          PARTIAL
                        </option>
                        <option value="NOT_CONFIGURED" className="bg-sumi-900 text-sumi-300">
                          NOT_CONFIGURED
                        </option>
                        <option value="UNSUPPORTED" className="bg-sumi-900 text-rose-400">
                          UNSUPPORTED
                        </option>
                        <option value="UNKNOWN" className="bg-sumi-900 text-indigo-400">
                          UNKNOWN
                        </option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 5: Fetch Settings */}
        {activeTab === "fetch" && (
          <div className="glass-panel rounded-2xl p-6 border border-sumi-800 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-torii-400" />
                <span>Cài đặt Thu thập & Chuỗi Dự phòng (Fallback Chain)</span>
              </h3>
              <p className="text-xs text-sumi-400 mt-1">
                Chu kỳ định thời polling, độ ưu tiên hàng đợi và chiến lược tự động chuyển sang connector thay thế.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-sumi-950/60 p-4 rounded-xl border border-sumi-800 space-y-1">
                <span className="text-xs text-sumi-500 font-medium">Chu kỳ quét (Polling Interval)</span>
                <div className="text-2xl font-black font-mono text-white">
                  {source.sync_interval_minutes} <span className="text-xs font-normal text-sumi-400">phút/lần</span>
                </div>
              </div>

              <div className="bg-sumi-950/60 p-4 rounded-xl border border-sumi-800 space-y-1">
                <span className="text-xs text-sumi-500 font-medium">Mức độ ưu tiên (Priority)</span>
                <div className="text-2xl font-black font-mono text-torii-400">
                  {source.priority ?? 5} <span className="text-xs font-normal text-sumi-400">/ 10</span>
                </div>
              </div>

              <div className="bg-sumi-950/60 p-4 rounded-xl border border-sumi-800 space-y-1">
                <span className="text-xs text-sumi-500 font-medium">Concurrency Lock</span>
                <div className="text-sm font-semibold font-mono text-emerald-400 mt-1 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  {source.is_syncing ? "Đang khóa (Lock Active)" : "Sẵn sàng (Idle)"}
                </div>
              </div>
            </div>

            {/* Fallback Chain Details */}
            <div className="p-4 rounded-xl bg-sumi-950/60 border border-sumi-800 space-y-3">
              <span className="text-xs font-semibold text-sumi-300 block">
                Chuỗi thực thi dự phòng (Fallback Execution Chain)
              </span>
              {source.fallback_chain && source.fallback_chain.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-torii-500/20 text-torii-300 border border-torii-500/40">
                    1. {source.connector_type || source.source_type} (Primary)
                  </span>
                  {source.fallback_chain.map((fb, idx) => (
                    <React.Fragment key={fb}>
                      <span className="text-sumi-500 text-xs">&rarr;</span>
                      <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-sumi-800 text-sumi-200 border border-sumi-700">
                        {idx + 2}. {fb} (Fallback)
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-sumi-500 italic">
                  Chưa thiết lập chuỗi fallback. Khi primary connector thất bại, yêu cầu sẽ ghi nhận lỗi ngay lập tức.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tab 6: Health & Diagnostics */}
        {activeTab === "health" && (
          <div className="glass-panel rounded-2xl p-6 border border-sumi-800 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-emerald-400" />
                  <span>Sức khỏe & Chẩn đoán Lỗi Hệ thống</span>
                </h3>
                <p className="text-xs text-sumi-400 mt-1">
                  Đánh giá tính sẵn sàng của endpoint, kiểm tra lỗi HTTP gần nhất và kích hoạt chẩn đoán.
                </p>
              </div>

              <button
                onClick={handleTest}
                disabled={isTesting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-sumi-800 hover:bg-sumi-700 text-kintsugi-400 border border-sumi-700 transition-all"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Chạy kiểm tra chẩn đoán lại</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-sumi-950/70 border border-sumi-800 space-y-2">
                <span className="text-xs text-sumi-500 font-medium">Trạng thái sức khỏe</span>
                <div>
                  <HealthBadge status={source.health_status} />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-sumi-950/70 border border-sumi-800 space-y-2">
                <span className="text-xs text-sumi-500 font-medium">Số lần thất bại liên tiếp</span>
                <span
                  className={`text-xl font-bold font-mono block ${
                    source.consecutive_failure_count > 0 ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {source.consecutive_failure_count}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-sumi-950/70 border border-sumi-800 space-y-2">
                <span className="text-xs text-sumi-500 font-medium">Thời gian kiểm tra cuối</span>
                <span className="text-xs font-mono text-sumi-300 block">
                  {source.last_synced_at
                    ? formatDateTime(source.last_synced_at)
                    : "Chưa có dữ liệu"}
                </span>
              </div>
            </div>

            {source.last_error_message ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Chi tiết lỗi gần nhất đã ghi nhận</span>
                </div>
                <div className="font-mono bg-sumi-950/80 p-3 rounded-lg border border-rose-500/20 whitespace-pre-wrap">
                  {source.last_error_message}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Nguồn hoạt động ổn định, không có thông báo lỗi tồn đọng.</span>
              </div>
            )}
          </div>
        )}

        {/* Tab 7: Statistics */}
        {activeTab === "stats" && (
          <div className="glass-panel rounded-2xl p-6 border border-sumi-800 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-torii-400" />
                <span>Thống kê Sản lượng & Tỷ lệ Thành công</span>
              </h3>
              <p className="text-xs text-sumi-400 mt-1">
                Tổng bài đọc tiếng Nhật đã nạp vào kho, bài nhận hôm nay và thời gian phản hồi.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-sumi-950/70 border border-sumi-800 space-y-1">
                <span className="text-[11px] text-sumi-500 font-medium">Tổng bài nạp (Lifetime)</span>
                <span className="text-2xl font-black font-mono text-torii-400 block">
                  {source.items_total_count || source.items_fetched_total || 0}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-sumi-950/70 border border-sumi-800 space-y-1">
                <span className="text-[11px] text-sumi-500 font-medium">Bài nạp hôm nay (Today)</span>
                <span className="text-2xl font-black font-mono text-kintsugi-400 block">
                  {source.items_fetched_today || 0}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-sumi-950/70 border border-sumi-800 space-y-1">
                <span className="text-[11px] text-sumi-500 font-medium">Thời lượng sync lần cuối</span>
                <span className="text-2xl font-black font-mono text-sumi-200 block">
                  {source.last_sync_duration_ms ? `${source.last_sync_duration_ms}ms` : "-"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-sumi-950/70 border border-sumi-800 space-y-1">
                <span className="text-[11px] text-sumi-500 font-medium">Tổng lượt logs kiểm toán</span>
                <span className="text-2xl font-black font-mono text-emerald-400 block">
                  {logs.length}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 8: Activity Logs */}
        {activeTab === "logs" && (
          <div className="glass-panel rounded-2xl overflow-hidden border border-sumi-800 space-y-4 p-4">
            <div className="flex items-center justify-between flex-wrap gap-2 px-2 pt-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-torii-400" />
                  <span>Lịch sử hoạt động & Kiểm toán (Activity Logs - {logs.length})</span>
                </h3>
                <p className="text-xs text-sumi-400 mt-0.5">
                  Lưu vết chi tiết có UUID request_id, độ trễ và số lượng bài nạp mỗi phiên.
                </p>
              </div>
            </div>

            {logs.length === 0 ? (
              <div className="p-12 text-center text-xs text-sumi-400">
                Chưa có nhật ký hoạt động nào. Hãy nhấn "Test Connection" hoặc "Đồng bộ ngay".
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-sumi-800/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-sumi-950/90 text-sumi-400 font-semibold border-b border-sumi-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-3">Thời gian</th>
                      <th className="py-3 px-3">Request ID</th>
                      <th className="py-3 px-3">Hành động</th>
                      <th className="py-3 px-3">Connector</th>
                      <th className="py-3 px-3">Trạng thái</th>
                      <th className="py-3 px-3">Mã HTTP</th>
                      <th className="py-3 px-3">Độ trễ</th>
                      <th className="py-3 px-3">Số bài</th>
                      <th className="py-3 px-4">Thông điệp chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sumi-800/60 font-mono">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-sumi-800/30">
                        <td className="py-3 px-3 text-sumi-400 text-[11px] whitespace-nowrap">
                          {new Date(log.created_at).toLocaleTimeString()}{" "}
                          <span className="text-[10px] text-sumi-500">
                            {new Date(log.created_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {log.request_id ? (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded bg-sumi-800 text-sumi-300 cursor-pointer hover:text-white"
                              title={log.request_id}
                              onClick={() => copyToClipboard(log.request_id!, "req_" + log.id)}
                            >
                              {copiedUrl === "req_" + log.id ? (
                                "Copied!"
                              ) : (
                                `${log.request_id.slice(0, 8)}...`
                              )}
                            </span>
                          ) : (
                            <span className="text-sumi-600">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-sumi-200 font-sans font-medium whitespace-nowrap">
                          {log.event_type || log.action || "sync"}
                        </td>
                        <td className="py-3 px-3 text-sumi-400 text-[11px]">
                          {log.connector_type || "-"}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-sans ${
                              log.status === "success" || log.status === "SUCCESS"
                                ? "text-emerald-400"
                                : log.status === "warning" || log.status === "WARNING"
                                ? "text-amber-400"
                                : "text-rose-400"
                            }`}
                          >
                            {log.status === "success" || log.status === "SUCCESS" ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-sumi-300">
                          {log.status_code || "-"}
                        </td>
                        <td className="py-3 px-3 text-sumi-300">
                          {log.duration_ms || log.response_time_ms ? `${log.duration_ms || log.response_time_ms}ms` : "-"}
                        </td>
                        <td className="py-3 px-3 text-torii-400 font-bold">
                          {log.items_count ?? log.items_fetched ?? 0}
                        </td>
                        <td className="py-3 px-4 text-sumi-300 font-sans text-xs truncate max-w-sm">
                          {log.message || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 9: Ingestion History */}
        {activeTab === "ingestion" && (
          <div className="glass-panel rounded-2xl overflow-hidden border border-sumi-800 space-y-4 p-4">
            <div className="flex items-center justify-between flex-wrap gap-2 px-2 pt-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-torii-400" />
                  <span>Lịch sử các phiên Ingestion ({ingestionHistory.length})</span>
                </h3>
                <p className="text-xs text-sumi-400 mt-0.5">
                  Theo dõi kết quả lấy bài, số bài tạo mới, cập nhật và lọc trùng lặp tự động.
                </p>
              </div>

              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-torii-500 hover:bg-torii-600 disabled:opacity-50 text-white shadow-md transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>Chạy Ingestion ngay</span>
              </button>
            </div>

            {ingestionHistory.length === 0 ? (
              <div className="p-12 text-center text-xs text-sumi-400 space-y-2">
                <p>Chưa có phiên Ingestion nào được ghi nhận cho nguồn này.</p>
                <p className="text-sumi-500 text-[11px]">Nhấn "Chạy Ingestion ngay" hoặc "Đồng bộ ngay" để kích hoạt pipeline.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-sumi-800/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-sumi-950/90 text-sumi-400 font-semibold border-b border-sumi-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-3">Job ID</th>
                      <th className="py-3 px-3">Loại</th>
                      <th className="py-3 px-3">Trạng thái</th>
                      <th className="py-3 px-3">Thời gian / Thời lượng</th>
                      <th className="py-3 px-3 text-center">Quét về</th>
                      <th className="py-3 px-3 text-center">Tạo mới</th>
                      <th className="py-3 px-3 text-center">Cập nhật</th>
                      <th className="py-3 px-3 text-center">Trùng lặp</th>
                      <th className="py-3 px-3 text-center">Loại bỏ</th>
                      <th className="py-3 px-4 text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sumi-800/60 font-mono text-[11px]">
                    {ingestionHistory.map((j) => (
                      <tr key={j.id} className="hover:bg-sumi-800/30">
                        <td className="py-3 px-3 font-bold text-sumi-400">
                          #{j.id}
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sumi-800 text-sumi-300 border border-sumi-700">
                            {j.job_type}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-sans ${
                              j.status === "SUCCESS"
                                ? "text-emerald-400"
                                : j.status === "RUNNING"
                                ? "text-torii-300 animate-pulse"
                                : j.status === "PARTIAL_SUCCESS"
                                ? "text-amber-400"
                                : "text-rose-400"
                            }`}
                          >
                            {j.status === "SUCCESS" ? (
                              <CheckCircle className="w-3.5 h-3.5" />
                            ) : j.status === "RUNNING" ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            {j.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-sumi-300">
                          <span>{new Date(j.created_at).toLocaleTimeString()}</span>{" "}
                          <span className="text-[10px] text-sumi-500">
                            {j.duration_ms ? `(${Math.round(j.duration_ms)}ms)` : ""}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center text-white font-bold">
                          {j.items_fetched}
                        </td>
                        <td className="py-3 px-3 text-center text-emerald-400 font-bold">
                          {j.items_created > 0 ? `+${j.items_created}` : 0}
                        </td>
                        <td className="py-3 px-3 text-center text-blue-400">
                          {j.items_updated}
                        </td>
                        <td className="py-3 px-3 text-center text-kintsugi-300">
                          {j.items_duplicate}
                        </td>
                        <td className="py-3 px-3 text-center text-amber-400">
                          {j.items_rejected}
                        </td>
                        <td className="py-3 px-4 text-right font-sans">
                          <button
                            onClick={() => {
                              setSelectedJobId(j.id);
                              setIsJobDetailOpen(true);
                            }}
                            className="px-2 py-1 rounded bg-sumi-800 hover:bg-sumi-700 text-sumi-200 text-xs"
                          >
                            Xem
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 10: Edit Configuration */}
        {activeTab === "edit" && (
          <div className="pt-2">
            <SourceForm initialData={source} isEdit={true} />
          </div>
        )}
      </main>

      <TestConnectionModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        sourceName={source.name}
        result={testResult}
        isLoading={isTesting}
      />

      <JobDetailModal
        jobId={selectedJobId}
        isOpen={isJobDetailOpen}
        onClose={() => setIsJobDetailOpen(false)}
        onJobRetried={loadSourceData}
      />
    </div>
  );
}
