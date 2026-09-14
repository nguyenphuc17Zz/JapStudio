"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useProviders } from "@/hooks/use-providers";
import { useAI } from "@/hooks/use-ai";
import { useAIUsage } from "@/hooks/use-ai-usage";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect, SearchableOption } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import {
  Key,
  ShieldCheck,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Eye,
  EyeOff,
  Cpu,
  Sparkles,
  Zap,
  BarChart3,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Activity,
  AlertCircle,
  Loader2,
  Volume2,
} from "lucide-react";
import { ProviderDetail, ModelMetadata } from "@/types/provider";
import { ProviderHealth } from "@/types/ai";
import { aiApi } from "@/services/ai-api";



export function ProviderSettingsSection() {
  const {
    providers,
    loading: loadingProviders,
    actionLoading,
    saveOrUpdateCredential,
    deleteCredential,
    refetch: refetchProviders,
  } = useProviders();

  const {
    healthList,
    routingPolicy,
    testingProvider,
    refreshingModels,
    testConnection,
    updateRouting,
    refreshModels,
  } = useAI();

  const { usageSummary } = useAIUsage();

  const [selectedProvider, setSelectedProvider] = useState<ProviderDetail | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, ProviderHealth>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showUsage, setShowUsage] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Modal post-save state
  const [modalSaved, setModalSaved] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalTesting, setModalTesting] = useState(false);
  const [modalTestStatus, setModalTestStatus] = useState<ProviderHealth | null>(null);
  const [modalSyncing, setModalSyncing] = useState(false);
  const [modalSyncMsg, setModalSyncMsg] = useState<string | null>(null);

  const keyFormatWarning = useMemo(() => {
    const val = apiKeyInput.trim();
    if (!val || !selectedProvider) return null;
    if (selectedProvider.id === "gemini") {
      if (val.startsWith("gsk_")) {
        return "⚠️ Bạn đang nhập API Key của Groq (bắt đầu bằng 'gsk_'). Google Gemini yêu cầu API Key từ Google AI Studio (thường bắt đầu bằng 'AIzaSy...').";
      }
      if (val.startsWith("sk-or-")) {
        return "⚠️ Bạn đang nhập API Key của OpenRouter (bắt đầu bằng 'sk-or-'). Google Gemini yêu cầu API Key từ Google AI Studio (bắt đầu bằng 'AIzaSy...').";
      }
      if (val.startsWith("sk-")) {
        return "⚠️ Đây là API Key của OpenAI (bắt đầu bằng 'sk-'). Google Gemini yêu cầu API Key từ Google AI Studio (bắt đầu bằng 'AIzaSy...').";
      }
    }
    if (selectedProvider.id === "groq") {
      if (val.startsWith("AIzaSy")) {
        return "⚠️ Bạn đang nhập API Key của Google Gemini. Groq yêu cầu key bắt đầu bằng 'gsk_' từ Groq Console.";
      }
      if (val.startsWith("sk-or-")) {
        return "⚠️ Bạn đang nhập API Key của OpenRouter. Groq yêu cầu key bắt đầu bằng 'gsk_' từ Groq Console.";
      }
    }
    if (selectedProvider.id === "openrouter") {
      if (val.startsWith("AIzaSy") || val.startsWith("gsk_")) {
        return "⚠️ Khóa API của OpenRouter thường bắt đầu bằng 'sk-or-v1-'.";
      }
    }
    return null;
  }, [apiKeyInput, selectedProvider]);

  const handleOpenConfig = (provider: ProviderDetail) => {
    setSelectedProvider(provider);
    setApiKeyInput("");
    setShowKey(false);
    setModalSaved(false);
    setModalError(null);
    setModalTestStatus(null);
    setModalSyncMsg(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedProvider || !apiKeyInput.trim()) return;
    setModalError(null);

    const res = await saveOrUpdateCredential(
      selectedProvider.id,
      apiKeyInput.trim(),
      selectedProvider.credential?.id
    );

    if (!res.success) {
      setModalError(res.error || "Không thể lưu API Key. Vui lòng kiểm tra lại định dạng.");
      return;
    }

    setModalSaved(true);
    setFeedbackMsg(`Đã lưu key ${selectedProvider.display_name} an toàn (AES-256).`);
    await refetchProviders();
  };

  const handleModalTest = async () => {
    if (!selectedProvider) return;
    setModalTesting(true);
    setModalError(null);
    try {
      const res = await testConnection(selectedProvider.id);
      if (res) {
        setModalTestStatus(res);
        setTestResult((prev) => ({ ...prev, [selectedProvider.id]: res }));
        if (res.status === "unavailable" && res.error_message) {
          setModalError(res.error_message);
        }
      }
    } catch (e: any) {
      setModalError(e.message || "Kiểm tra kết nối thất bại");
    } finally {
      setModalTesting(false);
    }
  };

  const handleModalSync = async () => {
    if (!selectedProvider) return;
    setModalSyncing(true);
    setModalError(null);
    setModalSyncMsg(null);
    try {
      const updated = await aiApi.refreshModels(selectedProvider.id);
      await refetchProviders();
      await fetchAllModels();
      if (updated && updated.length > 0) {
        setModalSyncMsg(`Đã đồng bộ thành công ${updated.length} mô hình từ ${selectedProvider.display_name}.`);
      } else {
        setModalSyncMsg(`Đã đồng bộ thành công danh sách mô hình từ ${selectedProvider.display_name}.`);
      }
    } catch (e: any) {
      setModalError(e.message || "Không thể tải danh sách model từ nhà cung cấp");
    } finally {
      setModalSyncing(false);
    }
  };

  const handleDelete = async (credentialId: string) => {
    if (confirm("Bạn có chắc muốn xóa API key này?")) {
      await deleteCredential(credentialId);
      await refreshModels();
      await refetchProviders();
      setMenuOpenId(null);
      setFeedbackMsg("Đã xóa key.");
    }
  };

  const handleTestConnection = async (providerId: string) => {
    const res = await testConnection(providerId);
    if (res) setTestResult((prev) => ({ ...prev, [providerId]: res }));
    setMenuOpenId(null);
  };

  const handleSyncAllModels = async (providerId?: string) => {
    const updated = await refreshModels(providerId);
    await refetchProviders();
    if (updated.length > 0) {
      setFeedbackMsg(`Đã đồng bộ ${updated.length} models.`);
    } else {
      setFeedbackMsg("Đã đồng bộ — không có model mới.");
    }
  };

  const handleApplyModel = async (providerId: string, modelId: string) => {
    await updateRouting({
      routing_mode: "manual",
      preferred_provider: providerId,
      default_model: modelId,
    });
    setFeedbackMsg(`Đã chọn ${modelId} (${providerId.toUpperCase()}) — áp dụng cho toàn hệ thống.`);
  };

  const getHealth = (providerId: string): ProviderHealth | undefined =>
    testResult[providerId] || healthList.find((h) => h.provider_id === providerId);

  const configuredCount = providers.filter((p) => p.is_configured).length;
  const primaryId = routingPolicy?.preferred_provider || "gemini";

  // Dynamic models fetched directly from API
  const [apiModels, setApiModels] = useState<ModelMetadata[]>([]);
  const [allApiModels, setAllApiModels] = useState<ModelMetadata[]>([]);
  const [loadingApiModels, setLoadingApiModels] = useState(false);
  const [syncingCurrentProvider, setSyncingCurrentProvider] = useState(false);

  const fetchProviderModels = useCallback(async (providerId: string, forceRefresh: boolean = false) => {
    setLoadingApiModels(true);
    try {
      const data = await aiApi.listModels(providerId, forceRefresh);
      if (data && data.length > 0) {
        setApiModels(data);
      }
    } catch (e) {
      console.warn("Failed to load models for provider from API:", e);
    } finally {
      setLoadingApiModels(false);
    }
  }, []);

  const fetchAllModels = useCallback(async () => {
    try {
      const data = await aiApi.listModels();
      if (data && data.length > 0) {
        setAllApiModels(data);
      }
    } catch (e) {
      console.warn("Failed to load all models from API:", e);
    }
  }, []);

  useEffect(() => {
    const pId = routingPolicy?.preferred_provider || "gemini";
    fetchProviderModels(pId);
    fetchAllModels();
  }, [routingPolicy?.preferred_provider, fetchProviderModels, fetchAllModels]);

  const handleSyncCurrentProviderModels = async () => {
    const pId = routingPolicy?.preferred_provider || "gemini";
    setSyncingCurrentProvider(true);
    try {
      const updated = await aiApi.refreshModels(pId);
      if (updated && updated.length > 0) {
        setApiModels(updated);
        setFeedbackMsg(`Đã nạp ${updated.length} mô hình động từ API của ${pId.toUpperCase()}.`);
      }
      await fetchAllModels();
      await refetchProviders();
    } catch (e: any) {
      setFeedbackMsg(`Lỗi đồng bộ model: ${e.message}`);
    } finally {
      setSyncingCurrentProvider(false);
    }
  };


  // Build model options for SearchableSelect (Default Model)
  const activeModels = apiModels.length > 0
    ? apiModels
    : (providers.find((p) => p.id === (routingPolicy?.preferred_provider || "gemini"))?.models || []);

  const modelSelectOptions = useMemo<SearchableOption[]>(() => {
    return activeModels.map((m) => {
      const badges: string[] = [];
      if (m.is_recommended) badges.push("Khuyên dùng");
      if (m.context_window) {
        badges.push(
          m.context_window >= 1_000_000
            ? `${(m.context_window / 1_000_000).toFixed(0)}M ctx`
            : `${Math.round(m.context_window / 1000)}k ctx`
        );
      }
      return {
        value: m.id,
        label: m.display_name || m.id,
        description: m.id !== m.display_name ? m.id : undefined,
        badge: badges.join(" · "),
      };
    });
  }, [activeModels]);


  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center text-primary shrink-0">
            <Cpu className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Mô hình AI & Nhà cung cấp
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quản lý API Key, kiểm tra độ trễ và điều hướng mô hình thông minh.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-muted border border-border text-muted-foreground font-medium">
            <span className={`h-2 w-2 rounded-full ${configuredCount > 0 ? "bg-emerald-500" : "bg-muted-foreground"}`} />
            {configuredCount}/{providers.length} nhà cung cấp
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSyncAllModels()}
            isLoading={refreshingModels}
            className="h-8 text-xs font-medium"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${refreshingModels ? "animate-spin" : ""}`} />
            Đồng bộ model
          </Button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            {feedbackMsg}
          </span>
          <button onClick={() => setFeedbackMsg(null)} className="text-xs font-bold px-1.5 hover:opacity-70">
            ✕
          </button>
        </div>
      )}

      {/* Routing & Default Model Card */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-md bg-primary/10 border border-primary/15 flex items-center justify-center text-primary">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Điều hướng & Mô hình mặc định
              </h3>
              <p className="text-[11px] text-muted-foreground">Áp dụng tức thì cho mọi hội thoại, AI Coach và bài kiểm tra</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Chế độ:</span>
            <button
              onClick={() => updateRouting({ routing_mode: routingPolicy?.routing_mode === "auto" ? "manual" : "auto" })}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                routingPolicy?.routing_mode === "auto"
                  ? "bg-foreground text-background border-foreground shadow-xs"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {routingPolicy?.routing_mode === "manual" ? "Thủ công" : "Tự động (Auto)"}
            </button>
            <span className="text-muted-foreground ml-2">Fallback:</span>
            <button
              onClick={() => updateRouting({ fallback_enabled: !routingPolicy?.fallback_enabled })}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                routingPolicy?.fallback_enabled
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {routingPolicy?.fallback_enabled ? "Bật" : "Tắt"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Nhà cung cấp chính</span>
            <select
              value={routingPolicy?.preferred_provider || "gemini"}
              onChange={(e) => {
                const newProv = e.target.value;
                const provObj = providers.find((p) => p.id === newProv);
                const firstModel = provObj?.models[0]?.id || "";
                updateRouting({ routing_mode: "manual", preferred_provider: newProv, default_model: firstModel || routingPolicy?.default_model });
                if (firstModel) setFeedbackMsg(`Đã chuyển sang ${newProv.toUpperCase()} — ${firstModel}`);
              }}
              className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {providers.length > 0 ? (
                providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name} {p.is_configured ? "✓ (Đã có key)" : "· Chưa có key"}
                  </option>
                ))
              ) : (
                <>
                  <option value="gemini">Google Gemini</option>
                  <option value="groq">Groq</option>
                  <option value="openrouter">OpenRouter</option>
                </>
              )}
            </select>
          </label>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Mô hình đang dùng</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncCurrentProviderModels}
                  disabled={syncingCurrentProvider || loadingApiModels}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Tải lại danh sách model trực tiếp từ API"
                >
                  <RefreshCw className={`h-3 w-3 ${syncingCurrentProvider || loadingApiModels ? "animate-spin" : ""}`} />
                  {syncingCurrentProvider ? "Đang tải..." : "Tải từ API"}
                </button>
                <span className="text-[10px] text-muted-foreground">· Toàn hệ thống</span>
              </div>
            </div>
            <SearchableSelect
              value={routingPolicy?.default_model || ""}
              onChange={(newModel) =>
                handleApplyModel(routingPolicy?.preferred_provider || "gemini", newModel)
              }
              options={modelSelectOptions}
              placeholder="Chọn mô hình AI..."
              searchPlaceholder="Tìm kiếm model (ví dụ: gemini-2.5, gpt-4o, llama-3...)"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>
            Thứ tự dự phòng (Fallback): <span className="font-mono text-foreground font-semibold">Gemini → Groq → OpenRouter</span> khi gặp sự cố mạng hoặc hạn mức.
          </span>
        </div>
      </div>


      {/* Thống kê — accordion gọn */}
      {usageSummary && (
        <Card className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
          <button
            onClick={() => setShowUsage(!showUsage)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <BarChart3 className="h-4 w-4 text-muted-foreground" /> Thống kê sử dụng
              <span className="text-xs font-normal text-muted-foreground">
                · {usageSummary.total_requests.toLocaleString()} requests · {usageSummary.total_tokens.toLocaleString()} tokens
              </span>
            </span>
            {showUsage ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {showUsage && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 pt-0">
              <span className="p-3 rounded-xl bg-muted border border-border block">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Activity className="h-3 w-3" /> Requests
                </span>
                <span className="text-lg font-bold font-mono text-foreground">{usageSummary.total_requests.toLocaleString()}</span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                  {usageSummary.successful_requests} ok · {usageSummary.failed_requests} lỗi
                </span>
              </span>
              <span className="p-3 rounded-xl bg-muted border border-border block">
                <span className="text-xs text-muted-foreground">Tokens</span>
                <span className="text-lg font-bold font-mono text-foreground block">{usageSummary.total_tokens.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">
                  {usageSummary.total_input_tokens.toLocaleString()} in / {usageSummary.total_output_tokens.toLocaleString()} out
                </span>
              </span>
              <span className="p-3 rounded-xl bg-muted border border-border block">
                <span className="text-xs text-muted-foreground">Độ trễ TB</span>
                <span className="text-lg font-bold font-mono text-foreground block">{usageSummary.avg_latency_ms} ms</span>
                <span className="text-xs text-muted-foreground">Turnaround</span>
              </span>
              <span className="p-3 rounded-xl bg-muted border border-border block">
                <span className="text-xs text-muted-foreground">Chế độ</span>
                <span className="text-lg font-bold font-mono text-foreground block uppercase">{routingPolicy?.routing_mode || "auto"}</span>
                <span className="text-xs text-muted-foreground">Fallback {routingPolicy?.fallback_enabled ? "bật" : "tắt"}</span>
              </span>
            </div>
          )}
        </Card>
      )}

      {/* Provider list — compact */}
      {loadingProviders ? (
        <div className="p-10 text-center text-sm text-muted-foreground">Đang tải nhà cung cấp…</div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground px-1">Nhà cung cấp ({providers.length})</h3>
          {providers.map((p) => {
            const health = getHealth(p.id);
            const isPrimary = primaryId === p.id;
            const isExpanded = expandedId === p.id;
            const isTesting = testingProvider === p.id;
            const ctxLabel = (ctx?: number) =>
              !ctx ? "" : ctx >= 1_000_000 ? `${(ctx / 1_000_000).toFixed(0)}M` : `${Math.round(ctx / 1000)}k`;

            return (
              <div
                key={p.id}
                className={cn(
                  "rounded-xl border bg-card overflow-hidden transition-all",
                  isPrimary ? "border-primary/40 ring-1 ring-primary/20" : "border-border hover:border-foreground/20"
                )}
              >
                {/* Compact row */}
                <div className="flex items-center gap-3 p-3 sm:p-4">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    className="flex-1 min-w-0 flex items-center gap-3 text-left"
                  >
                    <span className="h-9 w-9 rounded-lg bg-muted border border-border flex items-center justify-center text-foreground font-bold text-xs shrink-0">
                      {p.display_name.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-foreground truncate">{p.display_name}</span>
                        {isPrimary && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 font-semibold">
                            Đang dùng
                          </span>
                        )}
                        {!p.is_configured ? (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">Chưa có key</span>
                        ) : health?.status === "healthy" ? (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:text-emerald-400 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Sẵn sàng{health.latency_ms ? ` (${health.latency_ms}ms)` : ""}
                          </span>
                        ) : health?.status === "degraded" ? (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 border border-amber-500/20 dark:text-amber-400">Phản hồi chậm</span>
                        ) : health?.status === "unavailable" ? (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20">Lỗi</span>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">Chưa kiểm tra</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground truncate block mt-0.5">
                        {p.is_configured ? `${p.credential?.masked_secret} · ${p.models.length} mô hình khả dụng` : p.description}
                      </span>
                      {health?.status === "unavailable" && health.error_message && (
                        <p className="text-[11px] text-destructive mt-1 flex items-center gap-1 font-medium">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{health.error_message}</span>
                        </p>
                      )}
                    </span>
                    <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  </button>

                  {/* Primary CTA */}
                  <Button
                    variant={p.is_configured ? "outline" : "primary"}
                    size="sm"
                    onClick={() => handleOpenConfig(p)}
                    className="shrink-0 h-8 text-xs font-medium"
                  >
                    <Key className="h-3.5 w-3.5 mr-1" />
                    <span>{p.is_configured ? "Đổi key" : "Thêm key"}</span>
                  </Button>

                  {/* Kebab menu */}
                  <span className="relative shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMenuOpenId(menuOpenId === p.id ? null : p.id)} aria-label="Thêm hành động">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    {menuOpenId === p.id && (
                      <span className="absolute right-0 top-9 z-20 w-48 rounded-xl border border-border bg-card shadow-lg overflow-hidden flex flex-col py-1">
                        {p.is_configured && (
                          <button
                            onClick={() => handleTestConnection(p.id)}
                            disabled={isTesting}
                            className="px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${isTesting ? "animate-spin" : ""}`} /> Kiểm tra kết nối
                          </button>
                        )}
                        <button onClick={() => handleSyncAllModels(p.id)} className="px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2">
                          <RefreshCw className="h-3.5 w-3.5" /> Đồng bộ model
                        </button>
                        {p.credential && (
                          <button onClick={() => handleDelete(p.credential!.id)} className="px-3 py-2 text-sm text-left hover:bg-muted text-destructive flex items-center gap-2">
                            <Trash2 className="h-3.5 w-3.5" /> Xóa key
                          </button>
                        )}
                        {p.documentation_url && (
                          <a href={p.documentation_url} target="_blank" rel="noreferrer" className="px-3 py-2 text-sm hover:bg-muted flex items-center gap-2" onClick={() => setMenuOpenId(null)}>
                            <ExternalLink className="h-3.5 w-3.5" /> Tài liệu
                          </a>
                        )}
                      </span>
                    )}
                  </span>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-3 sm:px-4 pb-4 pt-3 space-y-3 border-t border-border bg-muted/20">
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                    {p.credential && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">API Key lưu trữ:</span>
                        <code className="px-2 py-0.5 rounded bg-background border border-border font-mono text-xs">{p.credential.masked_secret}</code>
                      </div>
                    )}
                    <label className="block space-y-1.5">
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-primary" /> Chọn model ưu tiên cho nhà cung cấp này ({p.models.length})
                      </span>
                      <select
                        value={isPrimary ? (routingPolicy?.default_model || p.default_model) : p.default_model}
                        onChange={(e) => handleApplyModel(p.id, e.target.value)}
                        className="w-full h-9 bg-background border border-border rounded-lg px-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                      >
                        {p.models.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.id}
                            {m.is_recommended ? " ★ (Khuyên dùng)" : ""} {m.context_window ? `· ${ctxLabel(m.context_window)} context` : ""}{" "}
                            {isPrimary && routingPolicy?.default_model === m.id ? "· ĐANG DÙNG" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    {health?.error_message && (
                      <span className="block p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">{health.error_message}</span>
                    )}
                    {/* Action buttons inside expanded view */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {p.is_configured && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(p.id)}
                          disabled={isTesting}
                          className="text-xs h-8 gap-1.5"
                        >
                          <Zap className="h-3.5 w-3.5 text-primary" />
                          <span>Kiểm tra kết nối</span>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncAllModels(p.id)}
                        disabled={refreshingModels}
                        className="text-xs h-8 gap-1.5"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 text-primary ${refreshingModels ? "animate-spin" : ""}`} />
                        <span>Tải lại model</span>
                      </Button>
                      {p.documentation_url && (
                        <a href={p.documentation_url} target="_blank" rel="noreferrer">
                          <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5">
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Tài liệu API</span>
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* API Key Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Cấu hình API Key — ${selectedProvider?.display_name || ""}`}
        description={
          modalSaved
            ? "Khóa API đã được lưu an toàn với mã hóa AES-256."
            : "Key được mã hóa bảo mật AES-256 trước khi lưu vào cơ sở dữ liệu cục bộ."
        }
      >
        <div className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          {!modalSaved ? (
            <>
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    label="API Key"
                    placeholder={
                      selectedProvider?.id === "gemini"
                        ? "AIzaSy..."
                        : selectedProvider?.id === "groq"
                        ? "gsk_..."
                        : "sk-..."
                    }
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    helperText={
                      selectedProvider?.id === "gemini" ? (
                        <span>
                          Lấy Google Gemini API Key miễn phí tại{" "}
                          <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline font-medium"
                          >
                            Google AI Studio (aistudio.google.com)
                          </a>
                          . Khóa bắt đầu bằng <code className="px-1 py-0.5 rounded bg-muted font-mono text-[11px]">AIzaSy...</code>
                        </span>
                      ) : selectedProvider?.documentation_url ? (
                        <span>
                          Lấy API key tại{" "}
                          <a
                            href={selectedProvider.documentation_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline"
                          >
                            trang quản trị {selectedProvider.display_name}
                          </a>
                          .
                        </span>
                      ) : (
                        "Lấy API key từ nhà cung cấp dịch vụ."
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-[32px] p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                    aria-label={showKey ? "Ẩn key" : "Hiện key"}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {keyFormatWarning && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2 animate-in fade-in">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                    <span>{keyFormatWarning}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={actionLoading}
                >
                  Hủy
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  isLoading={actionLoading}
                  disabled={!apiKeyInput.trim()}
                >
                  <ShieldCheck className="h-4 w-4 mr-1" /> Lưu an toàn
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4 animate-in fade-in">
              {/* Success Notification */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Đã lưu API Key {selectedProvider?.display_name} thành công!</span>
                </div>
                <p className="text-[11px] text-muted-foreground pl-6">
                  Key đã được mã hóa AES-256 cục bộ. Bạn có thể kiểm tra kết nối mạng và tải danh sách model mới nhất bên dưới:
                </p>
              </div>

              {/* Action Buttons: Check Connection & Fetch Models */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleModalTest}
                  isLoading={modalTesting}
                  className="h-10 text-xs font-medium gap-2 justify-center border-primary/20 hover:border-primary/50 hover:bg-primary/5"
                >
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Kiểm tra kết nối</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleModalSync}
                  isLoading={modalSyncing}
                  className="h-10 text-xs font-medium gap-2 justify-center border-primary/20 hover:border-primary/50 hover:bg-primary/5"
                >
                  <RefreshCw className={`h-4 w-4 text-primary ${modalSyncing ? "animate-spin" : ""}`} />
                  <span>Tải danh sách model</span>
                </Button>
              </div>

              {/* Test Result Feedback */}
              {modalTestStatus && (
                <div
                  className={cn(
                    "p-3 rounded-lg border text-xs flex items-center justify-between gap-2 animate-in fade-in",
                    modalTestStatus.status === "healthy"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : modalTestStatus.status === "degraded"
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                      : "bg-destructive/10 border-destructive/20 text-destructive"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        modalTestStatus.status === "healthy"
                          ? "bg-emerald-500 animate-pulse"
                          : modalTestStatus.status === "degraded"
                          ? "bg-amber-500"
                          : "bg-destructive"
                      )}
                    />
                    <span className="font-semibold">
                      {modalTestStatus.status === "healthy"
                        ? "Kết nối ổn định"
                        : modalTestStatus.status === "degraded"
                        ? "Phản hồi chậm"
                        : "Lỗi kết nối"}
                    </span>
                    {modalTestStatus.latency_ms && (
                      <span className="text-[11px] font-mono opacity-80">
                        ({modalTestStatus.latency_ms}ms)
                      </span>
                    )}
                  </div>
                  {modalTestStatus.error_message && (
                    <span className="text-[11px] truncate max-w-[200px]">
                      {modalTestStatus.error_message}
                    </span>
                  )}
                </div>
              )}

              {/* Sync Result Feedback */}
              {modalSyncMsg && (
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{modalSyncMsg}</span>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setModalSaved(false);
                    setApiKeyInput("");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Nhập lại key khác
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs font-semibold px-4"
                >
                  Hoàn tất & Đóng
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
