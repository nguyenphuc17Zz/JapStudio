"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { immersionApi } from "@/lib/api";
import { ContentSource, SourceStats, TestConnectionResponse } from "@/lib/types";
import { parseUtcDate } from "@/lib/date";
import { Header } from "@/components/layout/Header";
import { SourceCard } from "@/components/sources/SourceCard";
import { SourceTable } from "@/components/sources/SourceTable";
import { PresetsModal } from "@/components/sources/PresetsModal";
import { ImportExportModal } from "@/components/sources/ImportExportModal";
import { TestConnectionModal } from "@/components/sources/TestConnectionModal";
import { AutoDetectModal } from "@/components/sources/AutoDetectModal";
import { notify, confirmDialog } from "@/components/ui";
import {
  Database,
  Plus,
  Sparkles,
  Search,
  LayoutGrid,
  List,
  RefreshCw,
  Activity,
  CheckCircle2,
  AlertOctagon,
  FileCheck,
  CheckCheck,
  PauseCircle,
  PlayCircle,
  Trash2,
  Wand2,
  ArrowUpDown,
} from "lucide-react";

type SortOption = "sync_desc" | "created_desc" | "created_asc" | "items_desc" | "name_asc";

export default function SourcesDashboardPage() {
  const router = useRouter();
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [stats, setStats] = useState<SourceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedConnector, setSelectedConnector] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedHealth, setSelectedHealth] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("sync_desc");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkExecuting, setIsBulkExecuting] = useState(false);

  // Modals state
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isAutoDetectOpen, setIsAutoDetectOpen] = useState(false);
  const [testTarget, setTestTarget] = useState<ContentSource | null>(null);
  const [testResult, setTestResult] = useState<TestConnectionResponse | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [sourcesData, statsData] = await Promise.all([
        immersionApi.getSources({
          category: selectedCategory,
          connector_type: selectedConnector,
          learning_role: selectedRole,
          health_status: selectedHealth,
          search: searchQuery,
        }),
        immersionApi.getSourceStats(),
      ]);
      setSources(sourcesData);
      setStats(statsData);
    } catch (err) {
      console.error("Failed to load sources:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, selectedConnector, selectedRole, selectedHealth, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Memoized sorted sources
  const sortedSources = useMemo(() => {
    return [...sources].sort((a, b) => {
      if (sortBy === "sync_desc") {
        const dateA = parseUtcDate(a.last_synced_at || a.last_sync_at);
        const dateB = parseUtcDate(b.last_synced_at || b.last_sync_at);
        const timeA = dateA ? dateA.getTime() : 0;
        const timeB = dateB ? dateB.getTime() : 0;
        if (timeA !== timeB) return timeB - timeA;
        const createdA = parseUtcDate(a.created_at)?.getTime() ?? 0;
        const createdB = parseUtcDate(b.created_at)?.getTime() ?? 0;
        return createdB - createdA;
      }
      if (sortBy === "created_desc") {
        const createdA = parseUtcDate(a.created_at)?.getTime() ?? 0;
        const createdB = parseUtcDate(b.created_at)?.getTime() ?? 0;
        return createdB - createdA;
      }
      if (sortBy === "created_asc") {
        const createdA = parseUtcDate(a.created_at)?.getTime() ?? 0;
        const createdB = parseUtcDate(b.created_at)?.getTime() ?? 0;
        return createdA - createdB;
      }
      if (sortBy === "items_desc") {
        return (b.items_total_count || 0) - (a.items_total_count || 0);
      }
      if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name, "ja");
      }
      return 0;
    });
  }, [sources, sortBy]);

  // Bulk selection helpers
  const toggleSelectId = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === sources.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sources.map((s) => s.id));
    }
  };

  const handleBulkAction = async (action: "activate" | "pause" | "delete") => {
    if (selectedIds.length === 0) return;
    if (action === "delete") {
      const confirmed = await confirmDialog({
        title: "Xác nhận xóa hàng loạt",
        message: `Bạn có chắc muốn xóa vĩnh viễn ${selectedIds.length} nguồn đã chọn? Thao tác này không thể hoàn tác.`,
        variant: "danger",
        confirmText: "Xóa các nguồn",
      });
      if (!confirmed) return;
    }

    try {
      setIsBulkExecuting(true);
      await immersionApi.bulkAction(selectedIds, action);
      setSelectedIds([]);
      notify.success(`Đã thực hiện thao tác "${action}" cho ${selectedIds.length} nguồn!`);
      await loadData();
    } catch (err: any) {
      notify.error(`Lỗi thực hiện bulk action: ${err.message}`);
    } finally {
      setIsBulkExecuting(false);
    }
  };

  // Card & Table Actions
  const handleTestConnection = async (source: ContentSource) => {
    setTestTarget(source);
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await immersionApi.testConnection(source.id);
      setTestResult(res);
      await loadData();
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

  const handleSyncSource = async (source: ContentSource) => {
    const syncToast = notify.loading(`Đang ingest nguồn "${source.name}"...`);
    try {
      // Enqueue a REAL ingestion job (persists canonical_contents for /immersion feed).
      const res = await immersionApi.syncSource(source.id, true);
      if (!res.success || !res.job_id) {
        notify.update(syncToast, {
          type: "error",
          message: `Lỗi đồng bộ "${source.name}": ${res.message}`,
          duration: 5000,
        });
        await loadData();
        return;
      }
      notify.update(syncToast, {
        type: "info",
        message: `Đã tạo Ingestion Job #${res.job_id} cho "${source.name}", đang xử lý...`,
        duration: 3000,
      });
      const job = await immersionApi.pollIngestionJob(res.job_id);
      if (job.status === "SUCCESS" || job.status === "PARTIAL_SUCCESS") {
        notify.success(
          `Ingest xong "${source.name}": +${job.items_created} bài mới (dup ${job.items_duplicate}, reject ${job.items_rejected}). Xem ở /ingestion job #${job.id}.`
        );
      } else if (job.status === "QUEUED" || job.status === "RUNNING") {
        notify.update(syncToast, {
          type: "info",
          message: `Job #${job.id} vẫn đang ${job.status}, xem tiến trình ở /ingestion.`,
          duration: 5000,
        });
      } else {
        notify.update(syncToast, {
          type: "error",
          message: `Ingest thất bại "${source.name}" (job #${job.id}): ${job.error_summary || res.message}`,
          duration: 6000,
        });
      }
      await loadData();
    } catch (err: any) {
      notify.update(syncToast, {
        type: "error",
        message: `Đồng bộ thất bại: ${err.message}`,
        duration: 5000,
      });
    }
  };

  const handleDeleteSource = async (source: ContentSource) => {
    const confirmed = await confirmDialog({
      title: "Xác nhận xóa nguồn tin",
      message: `Bạn có chắc muốn xóa nguồn "${source.name}"? Dữ liệu log liên quan cũng sẽ bị xóa.`,
      variant: "danger",
      confirmText: "Xóa nguồn",
    });
    if (!confirmed) return;

    try {
      await immersionApi.deleteSource(source.id);
      notify.success(`Đã xóa nguồn "${source.name}" thành công!`);
      await loadData();
    } catch (err: any) {
      notify.error(`Lỗi xóa nguồn: ${err.message}`);
    }
  };

  const handleToggleStatus = async (source: ContentSource) => {
    const nextStatus = source.status === "active" ? "paused" : "active";
    try {
      await immersionApi.updateSource(source.id, { status: nextStatus });
      notify.success(`Đã ${nextStatus === "active" ? "kích hoạt" : "tạm dừng"} nguồn "${source.name}"!`);
      await loadData();
    } catch (err: any) {
      notify.error(`Lỗi cập nhật trạng thái: ${err.message}`);
    }
  };

  const handleApplyDetected = (detected: any) => {
    // Navigate to /sources/new with detected params or open form
    router.push(`/sources/new`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-sumi-950 text-sumi-100">
      <Header
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenImportExport={() => setIsImportExportOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Hero / Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
                Phase 1 Universal Content Source Infrastructure
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span className="text-xs text-slate-500 dark:text-sumi-400 font-medium">Decoupled Connector Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
              Quản lý Nguồn Nội Dung (Source Manager)
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-sumi-400 mt-1 max-w-2xl font-medium">
              Trung tâm quản lý nguồn dữ liệu tiếng Nhật tự động: RSS/Atom, REST/JSON API, Sitemap XML, và Web Scraper với chuẩn hóa 12 Capabilities.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setIsAutoDetectOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-500/15 hover:bg-indigo-200 dark:hover:bg-indigo-500/25 border border-indigo-300 dark:border-indigo-500/30 transition-all shadow-sm"
            >
              <Wand2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Auto-Detect Wizard</span>
            </button>

            <button
              onClick={() => setIsPresetsOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-amber-900 dark:text-kintsugi-300 bg-amber-100 dark:bg-kintsugi-500/15 hover:bg-amber-200 dark:hover:bg-kintsugi-500/25 border border-amber-300 dark:border-kintsugi-500/30 transition-all shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-700 dark:text-kintsugi-400" />
              <span>Kho Preset (1-Click)</span>
            </button>

            <Link
              href="/sources/new"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-torii-500 hover:bg-torii-600 text-white shadow-[0_0_20px_rgba(230,57,70,0.35)] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm nguồn mới</span>
            </Link>
          </div>
        </div>

        {/* Aggregate KPI Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="glass-panel rounded-2xl p-4 border border-slate-200 dark:border-sumi-800 flex items-center gap-3.5 bg-white dark:bg-transparent shadow-sm">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-sumi-800 text-slate-600 dark:text-sumi-300">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 dark:text-sumi-400 block font-semibold">Tổng nguồn</span>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                {stats?.total_sources ?? 0}
              </span>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-4 border border-slate-200 dark:border-sumi-800 flex items-center gap-3.5 bg-white dark:bg-transparent shadow-sm">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 dark:text-sumi-400 block font-semibold">Đang hoạt động</span>
              <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                {stats?.active_sources ?? 0}
              </span>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-4 border border-slate-200 dark:border-sumi-800 flex items-center gap-3.5 bg-white dark:bg-transparent shadow-sm">
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 dark:text-sumi-400 block font-semibold">Khỏe mạnh (Healthy)</span>
              <span className="text-xl font-extrabold text-blue-700 dark:text-blue-400 font-mono">
                {stats?.healthy_sources ?? 0}
              </span>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-4 border border-slate-200 dark:border-sumi-800 flex items-center gap-3.5 bg-white dark:bg-transparent shadow-sm">
            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 dark:text-sumi-400 block font-semibold">Cảnh báo / Lỗi</span>
              <span className="text-xl font-extrabold text-rose-700 dark:text-rose-400 font-mono">
                {stats?.error_sources ?? 0}
              </span>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-4 border border-slate-200 dark:border-sumi-800 flex items-center gap-3.5 col-span-2 sm:col-span-1 bg-white dark:bg-transparent shadow-sm">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-kintsugi-500/15 text-amber-700 dark:text-kintsugi-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 dark:text-sumi-400 block font-semibold">Tổng bài hôm nay / Tổng</span>
              <span className="text-xl font-extrabold text-amber-800 dark:text-kintsugi-400 font-mono">
                {stats?.items_today ?? 0} <span className="text-xs text-slate-500 dark:text-sumi-400">/ {stats?.total_items ?? 0}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Multi-Dimensional Filter Toolbar */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-200 dark:border-sumi-800 bg-white dark:bg-transparent space-y-4 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-sumi-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên nguồn, URL, mô tả..."
                className="glass-input w-full pl-10 pr-4 py-2 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-sumi-500 font-medium"
              />
            </div>

            {/* Dropdowns & View Toggle */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <select
                value={selectedConnector}
                onChange={(e) => setSelectedConnector(e.target.value)}
                className="glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-sumi-900 text-slate-900 dark:text-sumi-100 border border-slate-200 dark:border-sumi-800 font-medium"
              >
                <option value="all">Tất cả Connectors</option>
                <option value="RSS">RSS 2.0</option>
                <option value="ATOM">Atom 1.0</option>
                <option value="REST_API">Generic REST API</option>
                <option value="SITEMAP">Sitemap XML</option>
                <option value="WEB">Generic Web (HTML)</option>
                <option value="REDDIT">Reddit</option>
                <option value="X">X / Twitter</option>
                <option value="THREADS">Threads</option>
              </select>

              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-sumi-900 text-slate-900 dark:text-sumi-100 border border-slate-200 dark:border-sumi-800 font-medium"
              >
                <option value="all">Tất cả Learning Roles</option>
                <option value="LEARNER">Người học (Learner)</option>
                <option value="NEWS">Tin tức (News)</option>
                <option value="FORMAL">Chuẩn mực (Formal)</option>
                <option value="TECHNICAL">Kỹ thuật (Technical)</option>
                <option value="CASUAL">Đời thường (Casual)</option>
                <option value="CULTURE">Văn hóa (Culture)</option>
                <option value="BUSINESS">Kinh doanh (Business)</option>
                <option value="SLANG">Tiếng lóng / Slang</option>
              </select>

              <select
                value={selectedHealth}
                onChange={(e) => setSelectedHealth(e.target.value)}
                className="glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-sumi-900 text-slate-900 dark:text-sumi-100 border border-slate-200 dark:border-sumi-800 font-medium"
              >
                <option value="all">Tất cả sức khỏe</option>
                <option value="healthy">Healthy</option>
                <option value="warning">Warning / Degraded</option>
                <option value="error">Error / Down</option>
              </select>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-sumi-900 border border-slate-200 dark:border-sumi-700/60 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-sumi-300 shadow-sm">
                <ArrowUpDown className="w-3.5 h-3.5 text-torii-500 dark:text-torii-400 shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent text-xs text-slate-900 dark:text-sumi-200 focus:outline-none cursor-pointer pr-1 font-semibold"
                  title="Sắp xếp danh sách nguồn"
                >
                  <option value="sync_desc" className="bg-white dark:bg-sumi-900 text-slate-900 dark:text-white">Mới đồng bộ nhất</option>
                  <option value="created_desc" className="bg-white dark:bg-sumi-900 text-slate-900 dark:text-white">Mới thêm gần đây</option>
                  <option value="created_asc" className="bg-white dark:bg-sumi-900 text-slate-900 dark:text-white">Cũ nhất</option>
                  <option value="items_desc" className="bg-white dark:bg-sumi-900 text-slate-900 dark:text-white">Nhiều bài nhất</option>
                  <option value="name_asc" className="bg-white dark:bg-sumi-900 text-slate-900 dark:text-white">Tên (A-Z)</option>
                </select>
              </div>

              <div className="flex items-center bg-white dark:bg-sumi-900 border border-slate-200 dark:border-sumi-700/60 rounded-xl p-0.5 shadow-sm">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === "grid" ? "bg-slate-200 dark:bg-sumi-800 text-slate-900 dark:text-white" : "text-slate-500 dark:text-sumi-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  title="Xem dạng thẻ (Grid)"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === "table" ? "bg-slate-200 dark:bg-sumi-800 text-slate-900 dark:text-white" : "text-slate-500 dark:text-sumi-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  title="Xem dạng bảng (Table)">
                  <List className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => loadData()}
                className="p-2 rounded-xl bg-slate-100 dark:bg-sumi-800 hover:bg-slate-200 dark:hover:bg-sumi-700 text-slate-600 dark:text-sumi-300 hover:text-slate-900 dark:hover:text-white transition-colors border border-slate-200 dark:border-sumi-700"
                title="Tải lại danh sách"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pt-1 border-t border-slate-200 dark:border-sumi-800/60 text-xs">
            <span className="text-[11px] text-slate-500 dark:text-sumi-500 shrink-0 font-semibold">Chủ đề:</span>
            {[
              { id: "all", label: "Tất cả" },
              { id: "News", label: "Tin tức" },
              { id: "Technology", label: "Công nghệ" },
              { id: "Social", label: "Cộng đồng" },
              { id: "Culture", label: "Văn hóa" },
              { id: "Learners", label: "Cho người học" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-lg transition-all font-medium whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? "bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                    : "bg-slate-100 dark:bg-sumi-900/60 text-slate-600 dark:text-sumi-400 hover:text-slate-900 dark:hover:text-sumi-100 hover:bg-slate-200 dark:hover:bg-sumi-800/80 border border-slate-200 dark:border-sumi-800"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Action Bar (Visible when items are selected) */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-torii-500/10 border border-torii-500/30 text-xs animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCheck className="w-4 h-4 text-torii-400" />
              <span className="font-semibold text-slate-900 dark:text-white">
                Đã chọn <span className="text-torii-500 dark:text-torii-400">{selectedIds.length}</span> nguồn
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={isBulkExecuting}
                onClick={() => handleBulkAction("activate")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-sumi-800 hover:bg-slate-200 dark:hover:bg-sumi-700 text-emerald-700 dark:text-emerald-400 transition-colors border border-slate-200 dark:border-sumi-700 font-semibold"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>Kích hoạt</span>
              </button>

              <button
                disabled={isBulkExecuting}
                onClick={() => handleBulkAction("pause")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-sumi-800 hover:bg-slate-200 dark:hover:bg-sumi-700 text-amber-700 dark:text-amber-400 transition-colors border border-slate-200 dark:border-sumi-700 font-semibold"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Tạm dừng</span>
              </button>

              <button
                disabled={isBulkExecuting}
                onClick={() => handleBulkAction("delete")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-500/20 hover:bg-rose-200 dark:hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 transition-colors border border-rose-300 dark:border-rose-500/30 font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa</span>
              </button>

              <button
                onClick={() => setSelectedIds([])}
                className="text-slate-500 dark:text-sumi-400 hover:text-slate-900 dark:hover:text-white px-2 py-1 font-medium"
              >
                Hủy chọn
              </button>
            </div>
          </div>
        )}

        {/* Source Cards / Table */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500 dark:text-sumi-400 font-medium">Đang tải danh sách nguồn dữ liệu...</p>
          </div>
        ) : sources.length === 0 ? (
          /* Empty State */
          <div className="glass-panel rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4 border border-slate-200 dark:border-sumi-800 bg-white dark:bg-transparent shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
              <Database className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Chưa có nguồn nội dung nào</h3>
            <p className="text-xs text-slate-500 dark:text-sumi-400 leading-relaxed font-medium">
              Bạn có thể sử dụng Auto-Detect Wizard để tự động quét bất kỳ URL tiếng Nhật nào, hoặc cài đặt nhanh các nguồn tin chuẩn (NHK, Qiita, Note...) từ Kho Preset.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsAutoDetectOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-indigo-300 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 transition-all"
              >
                <Wand2 className="w-4 h-4" />
                <span>Auto-Detect Wizard</span>
              </button>
              <button
                onClick={() => setIsPresetsOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-kintsugi-400 bg-kintsugi-500/10 hover:bg-kintsugi-500/20 border border-kintsugi-500/30 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Kho Preset</span>
              </button>
            </div>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedSources.map((source) => (
              <SourceCard
                key={source.id}
                source={source}
                isSelected={selectedIds.includes(source.id)}
                onToggleSelect={() => toggleSelectId(source.id)}
                onTestConnection={handleTestConnection}
                onSync={handleSyncSource}
                onDelete={handleDeleteSource}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </div>
        ) : (
          <SourceTable
            sources={sortedSources}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelectId}
            onSelectAll={handleSelectAll}
            onTestConnection={handleTestConnection}
            onSync={handleSyncSource}
            onDelete={handleDeleteSource}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </main>

      {/* Modals */}
      <AutoDetectModal
        isOpen={isAutoDetectOpen}
        onClose={() => setIsAutoDetectOpen(false)}
        onApplyDetected={handleApplyDetected}
      />

      <PresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        onInstalled={loadData}
      />

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        onImported={loadData}
      />

      <TestConnectionModal
        isOpen={Boolean(testTarget)}
        onClose={() => setTestTarget(null)}
        sourceName={testTarget?.name || ""}
        result={testResult}
        isLoading={isTesting}
      />
    </div>
  );
}
