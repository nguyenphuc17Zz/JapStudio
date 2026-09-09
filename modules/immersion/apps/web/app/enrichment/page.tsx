"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BrainCircuit,
  Sparkles,
  Layers,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Coins,
  Cpu,
  Search,
  Filter,
  Eye,
  EyeOff,
  Key,
  ExternalLink,
  ShieldCheck,
  RotateCw,
  Server,
  Zap,
  X,
  Check,
  Power,
} from "lucide-react";
import { Header } from "../../components/layout/Header";
import { ContentEnrichmentModal } from "../../components/enrichment/ContentEnrichmentModal";
import {
  AIEnrichmentJob,
  EnrichmentStats,
  AIProviderMeta,
  AIModelMeta,
} from "../../lib/types";
import { api } from "../../lib/api";
import { notify, confirmDialog } from "@/components/ui";

export default function EnrichmentPage() {
  const [stats, setStats] = useState<EnrichmentStats | null>(null);
  const [jobs, setJobs] = useState<AIEnrichmentJob[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [providers, setProviders] = useState<AIProviderMeta[]>([]);
  const [models, setModels] = useState<AIModelMeta[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("gemini");

  // API Key Configuration & Testing State
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  const [isSavingKey, setIsSavingKey] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isFetchingModels, setIsFetchingModels] = useState<boolean>(false);
  const [modelSearchQuery, setModelSearchQuery] = useState<string>("");
  const [selectingModelId, setSelectingModelId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [autoRefreshSecs, setAutoRefreshSecs] = useState<number>(10);
  const [loading, setLoading] = useState(true);
  const [previewContentId, setPreviewContentId] = useState<number | null>(null);

  // Enrichment worker kill-switch
  const [workerEnabled, setWorkerEnabled] = useState<boolean | null>(null);
  const [isTogglingWorker, setIsTogglingWorker] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [statusFilter, providerFilter, page]);

  useEffect(() => {
    loadModelsForProvider(selectedProvider);
  }, [selectedProvider]);

  // Auto-refresh timer
  useEffect(() => {
    if (autoRefreshSecs <= 0) return;
    const interval = setInterval(() => {
      loadStatsAndJobsSilent();
    }, autoRefreshSecs * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshSecs, statusFilter, providerFilter, page]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, jobsRes, provsRes, workerRes] = await Promise.all([
        api.getEnrichmentStats(),
        api.getEnrichmentJobs({
          status: statusFilter,
          model_provider: providerFilter,
          page,
          limit: 15,
        }),
        api.getAIProviders(),
        api.getEnrichmentWorker().catch(() => null),
      ]);
      setStats(statsRes);
      setJobs(jobsRes.items);
      setTotalJobs(jobsRes.total);
      if (workerRes) setWorkerEnabled(workerRes.enabled);
      // Filter out mock provider from UI
      const filteredProvs = provsRes.filter((p) => p.name !== "mock");
      setProviders(filteredProvs);
      if (filteredProvs.length > 0 && !filteredProvs.some((p) => p.name === selectedProvider)) {
        setSelectedProvider(filteredProvs[0].name);
      }
    } catch (err) {
      console.error("Failed to load enrichment data", err);
    } finally {
      setLoading(false);
    }
  };

  const loadStatsAndJobsSilent = async () => {
    try {
      const [statsRes, jobsRes] = await Promise.all([
        api.getEnrichmentStats(),
        api.getEnrichmentJobs({
          status: statusFilter,
          model_provider: providerFilter,
          page,
          limit: 15,
        }),
      ]);
      setStats(statsRes);
      setJobs(jobsRes.items);
      setTotalJobs(jobsRes.total);
    } catch (err) {
      console.error("Silent refresh error", err);
    }
  };

  const handleToggleWorker = async () => {
    if (workerEnabled === null || isTogglingWorker) return;
    const next = !workerEnabled;
    const confirmed = await confirmDialog({
      title: next ? "Bật hàng đợi AI?" : "Tắt hàng đợi AI?",
      message: next
        ? "Worker sẽ tiếp tục xử lý các job đang chờ (tốn quota AI)."
        : "Worker sẽ dừng lấy job mới. Job đang chạy sẽ xong nốt, job chờ được giữ nguyên, không mất gì.",
      variant: next ? "default" : "warning",
      confirmText: next ? "Bật" : "Tắt",
    });
    if (!confirmed) return;
    setIsTogglingWorker(true);
    try {
      const res = await api.setEnrichmentWorker(next);
      setWorkerEnabled(res.enabled);
      notify.success(res.message);
    } catch (err: any) {
      notify.error(`Lỗi chuyển trạng thái worker: ${err.message}`);
    } finally {
      setIsTogglingWorker(false);
    }
  };

  const loadModelsForProvider = async (pName: string) => {
    setIsFetchingModels(true);
    try {
      const mList = await api.getAIModels(pName);
      setModels(mList);
    } catch (err) {
      console.error("Failed to load models for provider", pName, err);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSelectProvider = (provName: string) => {
    setSelectedProvider(provName);
    setApiKeyInput("");
    setTestStatus(null);
    setModelSearchQuery("");
  };

  const filteredModels = useMemo(() => {
    if (!modelSearchQuery.trim()) return models;
    const q = modelSearchQuery.toLowerCase().trim();
    return models.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
    );
  }, [models, modelSearchQuery]);

  const handleSelectModel = async (m: AIModelMeta) => {
    if (m.is_active || selectingModelId) return;
    setSelectingModelId(m.id);
    try {
      const res = await api.selectAIModel(m.provider, m.id);
      setModels((prev) =>
        prev.map((item) => ({
          ...item,
          is_active: item.id === m.id,
        }))
      );
      setTestStatus({
        success: true,
        message: `Đã kích hoạt model "${m.name}" (${m.provider.toUpperCase()}) làm model mặc định cho hệ thống!`,
      });
      notify.success(`Đã chọn model "${m.name}" làm mặc định cho hệ thống!`);
      setProviders((prev) =>
        prev.map((p) =>
          p.name === m.provider ? { ...p, default_model: m.id } : p
        )
      );
    } catch (err: any) {
      notify.error(`Lỗi kích hoạt model: ${err.message || "Unknown error"}`);
    } finally {
      setSelectingModelId(null);
    }
  };

  const handleTestKey = async () => {
    setIsTestingKey(true);
    setTestStatus(null);
    try {
      const res = await api.testAIProvider(selectedProvider, apiKeyInput);
      setTestStatus({ success: res.success, message: res.message });
      if (res.success && res.models && res.models.length > 0) {
        setModels(res.models);
      }
    } catch (err: any) {
      setTestStatus({
        success: false,
        message: err.message || "Lỗi kiểm tra kết nối tới AI Provider",
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleSaveAndActivateKey = async () => {
    if (!apiKeyInput.trim()) {
      setTestStatus({ success: false, message: "Vui lòng nhập API Key trước khi lưu." });
      return;
    }
    setIsSavingKey(true);
    setTestStatus(null);
    try {
      const res = await api.configureAIProvider(selectedProvider, apiKeyInput.trim());
      setTestStatus({ success: res.success, message: res.message });
      if (res.success) {
        setApiKeyInput("");
        const provsRes = await api.getAIProviders();
        setProviders(provsRes.filter((p) => p.name !== "mock"));
        if (res.models && res.models.length > 0) {
          setModels(res.models);
        } else {
          loadModelsForProvider(selectedProvider);
        }
      }
    } catch (err: any) {
      setTestStatus({ success: false, message: err.message || "Lỗi lưu cấu hình API Key" });
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleRetryJob = async (jobId: number) => {
    try {
      await api.retryEnrichmentJob(jobId);
      notify.success(`Đã đưa job #${jobId} vào hàng đợi xử lý lại!`);
      loadStatsAndJobsSilent();
    } catch (err: any) {
      notify.error(`Thử lại job thất bại: ${err.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "QUEUED":
        return (
          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
            <Clock className="w-3 h-3" />
            Đang chờ
          </span>
        );
      case "RUNNING":
        return (
          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Đang xử lý
          </span>
        );
      case "SUCCESS":
        return (
          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Thành công
          </span>
        );
      case "PARTIAL_SUCCESS":
        return (
          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium">
            <AlertTriangle className="w-3 h-3" />
            Một phần
          </span>
        );
      case "FAILED":
        return (
          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-torii-500/15 text-torii-300 border border-torii-500/30 font-medium">
            <XCircle className="w-3 h-3" />
            Thất bại
          </span>
        );
      default:
        return (
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-sumi-800 text-sumi-300 border border-sumi-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-sumi-950 text-sumi-100 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Title & Status */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-kintsugi-500 to-amber-600 flex items-center justify-center shadow-lg shadow-kintsugi-500/20">
                <BrainCircuit className="w-5 h-5 text-sumi-950 font-bold" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                AI Content Intelligence Engine
              </h1>
              <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-kintsugi-500/10 text-kintsugi-400 border border-kintsugi-500/30">
                Phase 3 Active
              </span>
            </div>
            <p className="text-xs text-sumi-400 mt-1 max-w-2xl">
              Xử lý nền phi đồng bộ: Trích xuất từ vựng theo ngữ cảnh, phân tích độ khó JLPT đa chiều, cấu trúc ngữ pháp, tóm tắt micro/short/detailed và đánh giá mức độ sẵn sàng học tập.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleWorker}
              disabled={workerEnabled === null || isTogglingWorker}
              title={workerEnabled ? "Tắt hàng đợi xử lý AI" : "Bật hàng đợi xử lý AI"}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 ${
                workerEnabled
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25"
                  : "bg-sumi-900 text-sumi-500 border-sumi-800 hover:text-sumi-300"
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{workerEnabled === null ? "..." : workerEnabled ? "Queue: BẬT" : "Queue: TẮT"}</span>
            </button>

            <div className="flex items-center gap-1 text-xs text-sumi-400 bg-sumi-900 border border-sumi-800 px-3 py-1.5 rounded-lg">
              <span>Tự động làm mới:</span>
              <select
                value={autoRefreshSecs}
                onChange={(e) => setAutoRefreshSecs(Number(e.target.value))}
                className="bg-transparent text-sumi-200 outline-none font-medium cursor-pointer"
              >
                <option value={0} className="bg-sumi-900">Tắt</option>
                <option value={5} className="bg-sumi-900">5 giây</option>
                <option value={10} className="bg-sumi-900">10 giây</option>
                <option value={30} className="bg-sumi-900">30 giây</option>
              </select>
            </div>

            <button
              onClick={() => loadAllData()}
              className="p-2 text-sumi-300 hover:text-white rounded-lg bg-sumi-900 border border-sumi-800 hover:bg-sumi-850 transition-colors"
              title="Làm mới ngay"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* 7 Telemetry KPI Cards */}
        {workerEnabled === false && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-xs text-amber-300">
            <Power className="w-4 h-4 flex-shrink-0" />
            <span>
              Hàng đợi AI đang <b>TẮT</b> — worker không lấy job mới (job đang chạy sẽ xong nốt, {stats?.queued ?? 0} job chờ được giữ nguyên). Bật lại bất cứ lúc nào bằng nút Queue phía trên.
            </span>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-4 rounded-xl bg-sumi-900/60 border border-sumi-800">
            <span className="text-[11px] text-sumi-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              Đang chờ (Queue)
            </span>
            <span className="text-2xl font-bold text-white mt-1.5 block">
              {stats?.queued ?? 0}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-sumi-900/60 border border-sumi-800">
            <span className="text-[11px] text-sumi-400 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              Đang chạy
            </span>
            <span className="text-2xl font-bold text-amber-300 mt-1.5 block">
              {stats?.processing ?? 0}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-sumi-900/60 border border-sumi-800">
            <span className="text-[11px] text-sumi-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Thành công
            </span>
            <span className="text-2xl font-bold text-emerald-400 mt-1.5 block">
              {stats?.success ?? 0}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-sumi-900/60 border border-sumi-800">
            <span className="text-[11px] text-sumi-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-purple-400" />
              Một phần
            </span>
            <span className="text-2xl font-bold text-purple-300 mt-1.5 block">
              {stats?.partial_success ?? 0}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-sumi-900/60 border border-sumi-800">
            <span className="text-[11px] text-sumi-400 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-torii-400" />
              Thất bại
            </span>
            <span className="text-2xl font-bold text-torii-300 mt-1.5 block">
              {stats?.failed ?? 0}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-sumi-900/60 border border-sumi-800">
            <span className="text-[11px] text-sumi-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Tokens hôm nay
            </span>
            <span className="text-2xl font-bold text-cyan-300 mt-1.5 block truncate">
              {((stats?.tokens_today ?? 0) / 1000).toFixed(1)}k
            </span>
          </div>

          <div className="p-4 rounded-xl bg-sumi-900/60 border border-sumi-800">
            <span className="text-[11px] text-sumi-400 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-kintsugi-400" />
              Ước tính chi phí
            </span>
            <span className="text-2xl font-bold text-kintsugi-300 mt-1.5 block truncate">
              ${stats?.estimated_cost_today_usd ?? 0}
            </span>
          </div>
        </div>

        {/* Dynamic Multi-Provider & Model Discovery Widget */}
        <div className="p-5 rounded-2xl bg-sumi-900/40 border border-sumi-800 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-sumi-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-kintsugi-400" />
                Bộ Điều Phối AI Providers & Khám Phá Model Động (Dynamic Model Discovery)
              </h3>
              <p className="text-xs text-sumi-400 mt-0.5">
                Cấu hình API Key, kiểm tra kết nối trực tiếp và đồng bộ danh sách models mới nhất từ nhà cung cấp.
              </p>
            </div>

            {/* Provider Selector Buttons */}
            <div className="flex items-center gap-1 bg-sumi-950 p-1 rounded-lg border border-sumi-800 text-xs">
              {providers.map((p) => (
                <button
                  key={p.name}
                  onClick={() => handleSelectProvider(p.name)}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    selectedProvider === p.name
                      ? "bg-kintsugi-500 text-sumi-950 font-bold shadow"
                      : "text-sumi-400 hover:text-white"
                  }`}
                >
                  {p.display_name.split(" ")[0]}
                  {p.configured && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block ml-1.5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* API Key Configuration Panel for Cloud Providers (Gemini / Groq) */}
          {(selectedProvider === "gemini" || selectedProvider === "groq") && (
            <div className="p-4 rounded-xl bg-sumi-950/80 border border-sumi-800/90 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-sumi-200">
                  <Key className="w-4 h-4 text-kintsugi-400" />
                  <span>
                    API Key cho {selectedProvider === "gemini" ? "Google AI Studio (Gemini)" : "Groq Cloud"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  {providers.find((p) => p.name === selectedProvider)?.has_key ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Đã kết nối: {providers.find((p) => p.name === selectedProvider)?.masked_key}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Chưa cấu hình API Key
                    </span>
                  )}
                </div>
              </div>

              {/* Input Form & Action Buttons */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
                <div className="flex-1 relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder={
                      selectedProvider === "gemini"
                        ? "Dán API Key Google AI Studio (bắt đầu bằng AIzaSy...)"
                        : "Dán API Key Groq Cloud (bắt đầu bằng gsk_...)"
                    }
                    className="w-full pl-3.5 pr-10 py-2 rounded-xl bg-sumi-900 border border-sumi-750 focus:border-kintsugi-500/80 text-xs text-white placeholder:text-sumi-500 outline-none font-mono transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sumi-400 hover:text-sumi-200"
                    title={showApiKey ? "Ẩn key" : "Hiện key"}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <button
                    type="button"
                    onClick={handleTestKey}
                    disabled={isTestingKey}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sumi-850 hover:bg-sumi-800 text-sumi-200 border border-sumi-750 text-xs font-semibold transition-all hover:scale-102 disabled:opacity-50"
                  >
                    <Zap className={`w-3.5 h-3.5 text-amber-400 ${isTestingKey ? "animate-spin" : ""}`} />
                    <span>{isTestingKey ? "Đang kiểm tra..." : "Kiểm tra kết nối"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAndActivateKey}
                    disabled={isSavingKey || !apiKeyInput.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-kintsugi-500 hover:bg-kintsugi-400 text-sumi-950 text-xs font-bold transition-all shadow-[0_0_12px_rgba(212,175,55,0.25)] hover:scale-102 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isSavingKey ? "animate-spin" : ""}`} />
                    <span>{isSavingKey ? "Đang lưu..." : "Lưu & Kích hoạt"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => loadModelsForProvider(selectedProvider)}
                    disabled={isFetchingModels}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sumi-900 hover:bg-sumi-850 text-sumi-300 hover:text-white border border-sumi-800 text-xs font-medium transition-colors"
                    title="Gọi API lấy danh sách model mới nhất"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isFetchingModels ? "animate-spin text-kintsugi-400" : ""}`} />
                    <span className="hidden sm:inline">Tải lại models</span>
                  </button>
                </div>
              </div>

              {/* Status Message / Notification */}
              {testStatus && (
                <div
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium border ${
                    testStatus.success
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-torii-500/10 border-torii-500/30 text-torii-300"
                  }`}
                >
                  {testStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-torii-400 flex-shrink-0" />
                  )}
                  <span>{testStatus.message}</span>
                </div>
              )}

              {/* Helper Links to get keys */}
              <div className="flex items-center gap-4 text-[11px] text-sumi-400 pt-1 border-t border-sumi-850">
                <span>Chưa có API key?</span>
                {selectedProvider === "gemini" && (
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-kintsugi-400 hover:underline hover:text-kintsugi-300"
                  >
                    <span>Lấy API Key Google AI Studio miễn phí</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {selectedProvider === "groq" && (
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-orange-400 hover:underline hover:text-orange-300"
                  >
                    <span>Lấy API Key Groq Cloud miễn phí</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Model Discovery List for Selected Provider */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-sumi-200">
                  Danh sách models khả dụng cho {selectedProvider.toUpperCase()}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-sumi-800 text-sumi-300">
                  {filteredModels.length} / {models.length}
                </span>
                {isFetchingModels && (
                  <span className="text-[11px] text-kintsugi-400 animate-pulse flex items-center gap-1 ml-1">
                    <RotateCw className="w-3 h-3 animate-spin" />
                    Đang đồng bộ...
                  </span>
                )}
              </div>

              {/* Instant Search Bar */}
              {models.length > 0 && (
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-sumi-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={modelSearchQuery}
                    onChange={(e) => setModelSearchQuery(e.target.value)}
                    placeholder="Tìm model (flash, 70b, pro)..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-sumi-900 border border-sumi-800 focus:border-kintsugi-500/80 text-xs text-white placeholder:text-sumi-500 outline-none transition-colors"
                  />
                  {modelSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setModelSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sumi-400 hover:text-white"
                      title="Xóa tìm kiếm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {models.length === 0 ? (
              <div className="p-8 rounded-xl bg-sumi-950/40 border border-dashed border-sumi-800 text-center space-y-2">
                <p className="text-xs text-sumi-400">Chưa có models nào được tải cho provider này.</p>
                <button
                  type="button"
                  onClick={() => loadModelsForProvider(selectedProvider)}
                  className="px-3.5 py-1.5 rounded-lg bg-sumi-800 hover:bg-sumi-750 text-white text-xs font-medium"
                >
                  Tải danh sách Model
                </button>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="p-8 rounded-xl bg-sumi-950/40 border border-dashed border-sumi-800 text-center space-y-2">
                <p className="text-xs text-sumi-400">
                  Không tìm thấy model nào khớp với &quot;<span className="text-white font-mono">{modelSearchQuery}</span>&quot;.
                </p>
                <button
                  type="button"
                  onClick={() => setModelSearchQuery("")}
                  className="px-3 py-1 rounded-lg bg-sumi-800 hover:bg-sumi-750 text-xs text-kintsugi-400 font-medium"
                >
                  Xóa bộ lọc tìm kiếm
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {filteredModels.map((m) => {
                  const isActive = m.is_active;
                  const isSelecting = selectingModelId === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => !isActive && handleSelectModel(m)}
                      className={`p-3.5 rounded-xl border space-y-2 transition-all cursor-pointer select-none ${
                        isActive
                          ? "border-emerald-500/80 bg-emerald-950/25 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40"
                          : "border-sumi-800 bg-sumi-950/60 hover:border-kintsugi-500/50 hover:bg-sumi-900/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-white font-mono truncate block" title={m.name}>
                            {m.name}
                          </span>
                          <span className="text-[10px] text-sumi-400 font-mono block truncate" title={m.id}>
                            {m.id}
                          </span>
                        </div>
                        {isActive ? (
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30 flex-shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            Đang kích hoạt
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectModel(m);
                            }}
                            disabled={isSelecting || selectingModelId !== null}
                            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-sumi-850 hover:bg-kintsugi-500 hover:text-sumi-950 text-sumi-200 border border-sumi-700 transition-all font-medium flex-shrink-0 disabled:opacity-50"
                          >
                            <Check className={`w-3 h-3 ${isSelecting ? "animate-spin" : ""}`} />
                            <span>{isSelecting ? "Đang chọn..." : "Chọn dùng"}</span>
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-sumi-400 line-clamp-2">{m.description || "Provider hosted model"}</p>
                      <div className="flex items-center justify-between text-[10px] text-sumi-400 pt-1.5 border-t border-sumi-850">
                        <span>Context: {((m.context_window || 32768) / 1024).toFixed(0)}k</span>
                        <span className="text-kintsugi-400 font-medium">Provider: {m.provider.toUpperCase()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Real-time Enrichment Jobs Table */}
        <div className="p-5 rounded-2xl bg-sumi-900/40 border border-sumi-800 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-kintsugi-400" />
              Hàng Đợi Xử Lý AI (Enrichment Queue) ({totalJobs})
            </h3>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-sumi-950 border border-sumi-800 rounded-lg px-2.5 py-1.5 text-sumi-200 outline-none"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="QUEUED">Đang chờ (Queued)</option>
                <option value="RUNNING">Đang xử lý (Running)</option>
                <option value="SUCCESS">Thành công (Success)</option>
                <option value="PARTIAL_SUCCESS">Một phần (Partial)</option>
                <option value="FAILED">Thất bại (Failed)</option>
              </select>

              <select
                value={providerFilter}
                onChange={(e) => {
                  setProviderFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-sumi-950 border border-sumi-800 rounded-lg px-2.5 py-1.5 text-sumi-200 outline-none"
              >
                <option value="all">Tất cả Provider</option>
                <option value="gemini">Gemini</option>
                <option value="groq">Groq</option>
                <option value="ollama">Ollama</option>
                <option value="mock">Mock AI</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-sumi-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-sumi-950/80 text-sumi-400 uppercase tracking-wider font-semibold border-b border-sumi-800">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Bài viết & Nguồn</th>
                  <th className="py-3 px-4">Model & Provider</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Thời gian / Độ trễ</th>
                  <th className="py-3 px-4">Tokens / Chi phí</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-sumi-800/60 bg-sumi-950/30">
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-sumi-400">
                      Không có AI job nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                )}

                {jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-sumi-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-sumi-400">#{j.id}</td>

                    <td className="py-3 px-4 max-w-xs">
                      <div
                        onClick={() => setPreviewContentId(j.content_id)}
                        className="font-medium text-white hover:text-kintsugi-400 cursor-pointer truncate"
                        title={j.content_title || `Content #${j.content_id}`}
                      >
                        {j.content_title || `Bài viết #${j.content_id}`}
                      </div>
                      <span className="text-[11px] text-sumi-400 block truncate">
                        {j.source_name || "Nguồn không xác định"}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono text-sumi-200 block">{j.model_name}</span>
                      <span className="text-[10px] text-kintsugi-400 uppercase font-semibold">
                        {j.model_provider}
                      </span>
                    </td>

                    <td className="py-3 px-4">{getStatusBadge(j.status)}</td>

                    <td className="py-3 px-4 text-sumi-300">
                      <span>{j.latency_ms ? `${j.latency_ms} ms` : "—"}</span>
                      <span className="text-[10px] text-sumi-400 block">
                        {new Date(j.created_at).toLocaleTimeString()}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-sumi-300">
                      <span>{j.input_tokens + j.output_tokens} tok</span>
                      <span className="text-[10px] text-kintsugi-400 block">
                        ${j.estimated_cost.toFixed(4)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewContentId(j.content_id)}
                          className="p-1.5 rounded-lg bg-sumi-800 hover:bg-sumi-700 text-sumi-200 hover:text-white transition-colors"
                          title="Xem Content Preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {(j.status === "FAILED" || j.status === "PARTIAL_SUCCESS") && (
                          <button
                            onClick={() => handleRetryJob(j.id)}
                            className="p-1.5 rounded-lg bg-torii-500/20 hover:bg-torii-500/30 text-torii-300 transition-colors"
                            title="Thử lại (Retry)"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Content Intelligence Preview Modal */}
      <ContentEnrichmentModal
        contentId={previewContentId}
        onClose={() => setPreviewContentId(null)}
      />
    </div>
  );
}
