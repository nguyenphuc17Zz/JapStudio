"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useAI } from "@/hooks/use-ai";
import { useProviders } from "@/hooks/use-providers";
import { aiApi } from "@/services/ai-api";
import { saveLobbyPreferences } from "@/features/speaking/services/lobby-preferences";
import { ModelMetadata, ProviderDetail } from "@/types/provider";
import { Badge } from "@/components/ui/badge";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Zap,
  Cpu,
  Layers,
  Crown,
  ChevronDown,
  Check,
  Search,
  Settings,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface ProviderVisual {
  id: string;
  name: string;
  shortName: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
}

const PROVIDER_VISUALS: Record<string, ProviderVisual> = {
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    shortName: "Gemini",
    icon: Sparkles,
    colorClass: "text-blue-500 dark:text-blue-400",
    bgClass: "bg-blue-500/10 border-blue-500/20",
  },
  groq: {
    id: "groq",
    name: "Groq LPU",
    shortName: "Groq",
    icon: Zap,
    colorClass: "text-amber-500 dark:text-amber-400",
    bgClass: "bg-amber-500/10 border-amber-500/20",
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    shortName: "OpenRouter",
    icon: Layers,
    colorClass: "text-indigo-500 dark:text-indigo-400",
    bgClass: "bg-indigo-500/10 border-indigo-500/20",
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    shortName: "OpenAI",
    icon: Cpu,
    colorClass: "text-emerald-500 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10 border-emerald-500/20",
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic Claude",
    shortName: "Claude",
    icon: Crown,
    colorClass: "text-orange-500 dark:text-orange-400",
    bgClass: "bg-orange-500/10 border-orange-500/20",
  },
};

function formatShortModelName(modelId: string): string {
  if (!modelId) return "AI Model";
  // Clean prefix if any
  const cleaned = modelId.replace(/^(google\/|meta-llama\/|anthropic\/|openai\/)/i, "");
  // Trim long suffix like -preview-02-05, -versatile
  if (cleaned.length <= 18) return cleaned;
  return cleaned.slice(0, 16) + "…";
}

export function GlobalAIQuickSettings() {
  const { routingPolicy, updateRouting } = useAI();
  const { providers, loading: loadingProviders } = useProviders();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [applyingModelId, setApplyingModelId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Active settings from routing policy or fallback
  const activeProviderId = routingPolicy?.preferred_provider?.toLowerCase() || "gemini";
  const activeModelId = routingPolicy?.default_model || "gemini-1.5-flash";

  // Tab currently selected inside the Popover
  const [selectedTabProvider, setSelectedTabProvider] = useState<string>(activeProviderId);

  // Sync selected tab with active provider on open
  useEffect(() => {
    if (isOpen) {
      setSelectedTabProvider(activeProviderId);
      setSearchQuery("");
    }
  }, [isOpen, activeProviderId]);

  // Close popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Model list for the selected tab provider
  const [tabModels, setTabModels] = useState<ModelMetadata[]>([]);
  const [loadingTabModels, setLoadingTabModels] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadModels() {
      // First check if provider in useProviders has models
      const matched = providers.find((p) => p.id === selectedTabProvider);
      if (matched && matched.models && matched.models.length > 0) {
        setTabModels(matched.models);
        return;
      }

      setLoadingTabModels(true);
      try {
        const list = await aiApi.listModels(selectedTabProvider);
        if (!cancelled && list) {
          setTabModels(list);
        }
      } catch (err) {
        console.warn(`[GlobalAIQuickSettings] Failed to fetch models for ${selectedTabProvider}:`, err);
      } finally {
        if (!cancelled) setLoadingTabModels(false);
      }
    }

    if (isOpen) {
      loadModels();
    }

    return () => {
      cancelled = true;
    };
  }, [selectedTabProvider, isOpen, providers]);

  // Filter models based on search query
  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return tabModels;
    const q = searchQuery.toLowerCase().trim();
    return tabModels.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        (m.display_name && m.display_name.toLowerCase().includes(q))
    );
  }, [tabModels, searchQuery]);

  // Provider configuration status
  const isSelectedProviderConfigured = useMemo(() => {
    const p = providers.find((it) => it.id === selectedTabProvider);
    return p ? p.is_configured : false;
  }, [providers, selectedTabProvider]);

  const activeProviderVisual = PROVIDER_VISUALS[activeProviderId] || {
    id: activeProviderId,
    name: activeProviderId.toUpperCase(),
    shortName: activeProviderId.toUpperCase(),
    icon: Sparkles,
    colorClass: "text-primary",
    bgClass: "bg-primary/10 border-primary/20",
  };
  const ActiveIcon = activeProviderVisual.icon;

  // Handle Apply Model globally
  const handleSelectModel = async (providerId: string, modelId: string) => {
    try {
      setApplyingModelId(modelId);
      soundFX.playTaiko();

      // 1. Update Backend Routing Policy (forced manual mode for full project enforcement)
      await updateRouting({
        routing_mode: "manual",
        preferred_provider: providerId,
        default_model: modelId,
      });

      // 2. Sync with Session Lobby preferences
      saveLobbyPreferences({
        ai_provider: providerId,
        ai_model: modelId,
      });

      // 3. Dispatch global event for instant reactivity across all open views
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("speaking_ai_routing_changed", {
            detail: {
              routing_mode: "manual",
              preferred_provider: providerId,
              default_model: modelId,
            },
          })
        );
      }

      setToastMessage(`Đã kích hoạt ${formatShortModelName(modelId)} toàn hệ thống`);
      setTimeout(() => setToastMessage(null), 3500);
      setIsOpen(false);
    } catch (err: any) {
      console.error("[GlobalAIQuickSettings] Failed to apply model:", err);
    } finally {
      setApplyingModelId(null);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* ── TopNav Pill Trigger Button ──────────────────────── */}
      <button
        type="button"
        onClick={() => {
          soundFX.playFurin();
          setIsOpen((prev) => !prev);
        }}
        className={cn(
          "h-8 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs group select-none",
          isOpen
            ? "bg-primary text-primary-foreground border-primary shadow-xs"
            : "bg-card/90 border-border/80 text-foreground hover:border-primary/40 hover:bg-card"
        )}
        title={`Mô hình AI: ${activeModelId} (${activeProviderVisual.name})`}
      >
        <span
          className={cn(
            "flex items-center justify-center p-0.5 rounded-md transition-colors",
            isOpen ? "text-primary-foreground" : activeProviderVisual.colorClass
          )}
        >
          <ActiveIcon className="h-3.5 w-3.5" />
        </span>

        {/* Short model name & provider */}
        <span className="hidden sm:flex items-center gap-1 font-mono tracking-tight text-[11px]">
          <span className="text-muted-foreground font-normal group-hover:text-foreground">
            {activeProviderVisual.shortName}:
          </span>
          <span className="font-bold text-foreground truncate max-w-[100px] md:max-w-[130px]">
            {formatShortModelName(activeModelId)}
          </span>
        </span>

        {/* Mobile short view */}
        <span className="sm:hidden font-mono text-[11px] font-bold">
          {activeProviderVisual.shortName}
        </span>

        <ChevronDown
          className={cn(
            "h-3 w-3 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180 text-primary-foreground"
          )}
        />
      </button>

      {/* ── Popover Studio Dropdown ─────────────────────────── */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[340px] sm:w-[380px] p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xl washi-texture space-y-3 animate-in fade-in zoom-in-95 backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Cpu className="h-3.5 w-3.5" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  Mô hình AI Toàn Cục
                  <Badge variant="matcha" size="sm" className="text-[9px] py-0 px-1.5 font-bold">
                    Manual
                  </Badge>
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  Đổi model áp dụng cứng cho toàn bộ tính năng
                </p>
              </div>
            </div>

            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="h-7 w-7 rounded-lg bg-muted/60 hover:bg-muted border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              title="Đi tới Cài đặt AI & API Key"
            >
              <Settings className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Provider Tabs */}
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border/60 overflow-x-auto no-scrollbar">
            {Object.values(PROVIDER_VISUALS).map((p) => {
              const Icon = p.icon;
              const isSelected = selectedTabProvider === p.id;
              const provData = providers.find((it) => it.id === p.id);
              const isConfigured = provData ? provData.is_configured : p.id === "gemini";

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedTabProvider(p.id);
                    soundFX.playFurin();
                  }}
                  className={cn(
                    "flex-1 min-w-[58px] py-1.5 px-2 rounded-lg text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all relative",
                    isSelected
                      ? "bg-card text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                  )}
                >
                  <span className="flex items-center gap-1">
                    <Icon className={cn("h-3 w-3", isSelected ? p.colorClass : "opacity-70")} />
                    <span className="truncate">{p.shortName}</span>
                  </span>
                  {/* Status Indicator dot */}
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      isConfigured ? "bg-emerald-500 shadow-2xs shadow-emerald-500/50" : "bg-muted-foreground/40"
                    )}
                    title={isConfigured ? "Đã cấu hình API Key" : "Chưa có API Key"}
                  />
                </button>
              );
            })}
          </div>

          {/* Warning if provider is not configured */}
          {!isSelectedProviderConfigured && selectedTabProvider !== "gemini" && (
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>Chưa cài API Key cho {selectedTabProvider.toUpperCase()}</span>
              </span>
              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className="underline font-bold text-[10px] shrink-0"
              >
                Nhập key
              </Link>
            </div>
          )}

          {/* Search Models Input */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Tìm model ${selectedTabProvider.toUpperCase()}...`}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-muted/40 border border-border/80 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:bg-background transition-all"
            />
          </div>

          {/* Models List */}
          <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
            {loadingTabModels ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Đang tải danh sách model...</span>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-xs">
                Không tìm thấy model nào phù hợp
              </div>
            ) : (
              filteredModels.map((m) => {
                const isCurrentActive =
                  activeProviderId === selectedTabProvider && activeModelId === m.id;
                const isApplying = applyingModelId === m.id;

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectModel(selectedTabProvider, m.id)}
                    disabled={isApplying}
                    className={cn(
                      "w-full text-left p-2 rounded-xl text-xs flex items-center justify-between gap-2 border transition-all",
                      isCurrentActive
                        ? "bg-primary/10 border-primary/30 text-primary font-bold shadow-2xs"
                        : "border-border/40 hover:bg-muted/60 text-foreground hover:border-border"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-medium truncate">
                          {m.display_name || m.id}
                        </span>
                        {m.is_recommended && (
                          <Badge variant="matcha" size="sm" className="text-[9px] py-0 px-1 font-bold">
                            Khuyên dùng
                          </Badge>
                        )}
                        {m.context_window && (
                          <span className="text-[9px] text-muted-foreground/80 font-mono">
                            {m.context_window >= 1_000_000
                              ? `${(m.context_window / 1_000_000).toFixed(0)}M`
                              : `${Math.round(m.context_window / 1000)}k`}
                          </span>
                        )}
                      </div>
                      {m.display_name && m.display_name !== m.id && (
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          {m.id}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {isApplying ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : isCurrentActive ? (
                        <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              <span>Định tuyến Manual (Ưu tiên tuyệt đối)</span>
            </span>
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="text-primary hover:underline font-bold flex items-center gap-0.5"
            >
              <span>Chi tiết</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Ephemeral Feedback Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-3.5 py-2 rounded-xl bg-foreground text-background text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
