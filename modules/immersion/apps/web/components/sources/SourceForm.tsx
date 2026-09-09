"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { immersionApi } from "@/lib/api";
import {
  SourceType,
  ConnectorType,
  AuthType,
  ContentSource,
  STANDARD_CAPABILITIES,
  CapabilityStatus,
} from "@/lib/types";
import {
  Save,
  Zap,
  Shield,
  Key,
  Globe,
  Sliders,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  Compass,
} from "lucide-react";
import { notify } from "@/components/ui";
import { TestConnectionModal } from "./TestConnectionModal";

interface SourceFormProps {
  initialData?: ContentSource;
  prefillData?: Partial<ContentSource>;
  isEdit?: boolean;
}

const AVAILABLE_ROLES = [
  "LEARNER",
  "NEWS",
  "FORMAL",
  "TECHNICAL",
  "CASUAL",
  "CULTURE",
  "BUSINESS",
  "SLANG",
  "TUTORIAL",
  "OPINION",
  "TRAVEL",
  "FOOD",
];

const AVAILABLE_CATEGORIES = [
  "News",
  "Technology",
  "Social",
  "Culture",
  "Society",
  "Learners",
  "Programming",
  "AI",
  "Gaming",
  "Anime",
  "Food",
  "Travel",
];

export const SourceForm: React.FC<SourceFormProps> = ({
  initialData,
  prefillData,
  isEdit = false,
}) => {
  const router = useRouter();

  const data = initialData || prefillData;

  // Basic info
  const [name, setName] = useState(data?.name || "");
  const [sourceType, setSourceType] = useState<SourceType>(data?.source_type || "NEWS");
  const [connectorType, setConnectorType] = useState<ConnectorType>(
    data?.connector_type || (data?.source_type ? (data.source_type.toUpperCase() as ConnectorType) : "RSS")
  );
  const [baseUrl, setBaseUrl] = useState(data?.base_url || "");
  const [feedUrl, setFeedUrl] = useState(data?.feed_url || "");
  const [canonicalUrl, setCanonicalUrl] = useState(data?.canonical_url || "");
  const [description, setDescription] = useState(data?.description || "");
  const [syncInterval, setSyncInterval] = useState<number>(data?.sync_interval_minutes || 60);
  const [priority, setPriority] = useState<number>(data?.priority || 5);

  // Categorization & Roles
  const [contentRoles, setContentRoles] = useState<string[]>(
    data?.content_roles || ["NEWS", "FORMAL"]
  );
  const [categories, setCategories] = useState<string[]>(
    data?.categories || [data?.category || "News"]
  );

  // Dynamic config & headers
  const [configJsonStr, setConfigJsonStr] = useState(
    data?.config_json ? JSON.stringify(data.config_json, null, 2) : "{}"
  );
  const [headersJsonStr, setHeadersJsonStr] = useState(
    data?.headers_json ? JSON.stringify(data.headers_json, null, 2) : "{}"
  );

  // Fallback chain
  const [fallbackChain, setFallbackChain] = useState<string[]>(data?.fallback_chain || []);

  // Capabilities Matrix
  const [capabilities, setCapabilities] = useState<Record<string, CapabilityStatus>>(
    data?.capabilities || {}
  );

  // Credentials
  const [authType, setAuthType] = useState<AuthType>(data?.credential?.auth_type || "none");
  const [secret, setSecret] = useState("");
  const [keyName, setKeyName] = useState(data?.credential?.key_name || "Authorization");
  const [credentialRef, setCredentialRef] = useState(data?.credential_reference || "");
  const [showSecret, setShowSecret] = useState(false);

  // Status & UI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Test Modal
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  // Magic Auto-Detect & Single URL state
  const [detectUrl, setDetectUrl] = useState(data?.base_url || "");
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedBadge, setDetectedBadge] = useState<string | null>(null);

  // Collapsible Advanced Settings (Collapsed by default when creating new source)
  const [showAdvanced, setShowAdvanced] = useState(isEdit ? true : false);

  // Update fields if prefillData changes
  useEffect(() => {
    if (prefillData) {
      if (prefillData.name) setName(prefillData.name);
      if (prefillData.base_url) {
        setBaseUrl(prefillData.base_url);
        setDetectUrl(prefillData.base_url);
      }
      if (prefillData.feed_url) setFeedUrl(prefillData.feed_url);
      if (prefillData.connector_type) setConnectorType(prefillData.connector_type);
      if (prefillData.source_type) setSourceType(prefillData.source_type);
      if (prefillData.description) setDescription(prefillData.description);
      if (prefillData.content_roles) setContentRoles(prefillData.content_roles);
      if (prefillData.categories) setCategories(prefillData.categories);
      if (prefillData.capabilities) setCapabilities(prefillData.capabilities);
    }
  }, [prefillData]);

  const toggleRole = (role: string) => {
    if (contentRoles.includes(role)) {
      setContentRoles(contentRoles.filter((r) => r !== role));
    } else {
      setContentRoles([...contentRoles, role]);
    }
  };

  const toggleCategory = (cat: string) => {
    if (categories.includes(cat)) {
      setCategories(categories.filter((c) => c !== cat));
    } else {
      setCategories([...categories, cat]);
    }
  };

  const toggleFallback = (conn: string) => {
    if (fallbackChain.includes(conn)) {
      setFallbackChain(fallbackChain.filter((c) => c !== conn));
    } else {
      setFallbackChain([...fallbackChain, conn]);
    }
  };

  const handleAutoDetect = async (urlOverride?: string) => {
    const urlToProbe = (urlOverride || detectUrl || baseUrl || feedUrl).trim();
    if (!urlToProbe) {
      notify.warning("Vui lòng dán link trang web để hệ thống tự động nhận diện.");
      return;
    }
    setIsDetecting(true);
    setDetectedBadge(null);
    const toastId = notify.loading("Đang phân tích trang web & tìm kiếm kênh tin...");
    try {
      const res = await immersionApi.detectSource(urlToProbe);
      if (res.site_title) setName(res.site_title);
      if (res.recommended_connector) setConnectorType(res.recommended_connector as ConnectorType);
      if (res.url) {
        setBaseUrl(res.url);
        setDetectUrl(res.url);
      }
      if (res.detected_feeds && res.detected_feeds.length > 0) {
        setFeedUrl(res.detected_feeds[0].url);
      } else {
        setFeedUrl("");
      }
      if (res.site_description) setDescription(res.site_description);
      if (res.suggested_categories && res.suggested_categories.length > 0) {
        setCategories(res.suggested_categories);
      }
      if (res.suggested_learning_roles && res.suggested_learning_roles.length > 0) {
        setContentRoles(res.suggested_learning_roles);
      }
      if (res.capabilities && Object.keys(res.capabilities).length > 0) {
        setCapabilities((prev) => ({ ...prev, ...res.capabilities }));
      }

      const detectedType = res.recommended_connector;
      setDetectedBadge(detectedType);
      notify.update(toastId, {
        type: "success",
        message: `✨ Đã tự động nhận diện: [${detectedType}] cho "${res.site_title || urlToProbe}". Toàn bộ thông tin đã được điền sẵn!`,
        duration: 4000,
      });
    } catch (err: any) {
      notify.update(toastId, {
        type: "error",
        message: `Không thể tự động nhận diện: ${err.message}`,
        duration: 5000,
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleTestAdHoc = async () => {
    try {
      setIsTesting(true);
      setErrorMessage(null);
      setIsTestModalOpen(true);

      let parsedConfig = {};
      let parsedHeaders = {};
      try {
        parsedConfig = JSON.parse(configJsonStr || "{}");
      } catch (err) {
        throw new Error("Config JSON không đúng định dạng.");
      }

      try {
        parsedHeaders = JSON.parse(headersJsonStr || "{}");
      } catch (err) {
        throw new Error("Custom Headers JSON không đúng định dạng.");
      }

      const testPayload = {
        name: name || "Test Source",
        connector_type: connectorType,
        source_type: sourceType,
        feed_url: feedUrl.trim() || undefined,
        base_url: (baseUrl || detectUrl).trim() || undefined,
        config_json: parsedConfig,
        headers_json: parsedHeaders,
        credential:
          authType !== "none" && secret
            ? { auth_type: authType, secret, key_name: keyName }
            : undefined,
      };

      const result = await immersionApi.testAdHoc(testPayload);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        success: false,
        http_status: 500,
        message: err.message || "Kiểm tra kết nối thất bại",
        error_details: err.stack,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let finalBaseUrl = (baseUrl || detectUrl).trim();
      let finalName = name.trim();

      // If user hasn't named the source, auto-derive from hostname
      if (!finalName && finalBaseUrl) {
        try {
          const parsed = new URL(finalBaseUrl);
          finalName = parsed.hostname.replace("www.", "");
        } catch {
          finalName = finalBaseUrl;
        }
      }

      if (!finalName) {
        throw new Error("Vui lòng nhập tên nguồn hoặc dán đường dẫn trang web.");
      }

      if (!finalBaseUrl && !feedUrl) {
        throw new Error("Vui lòng cung cấp đường dẫn trang web (URL).");
      }

      // If connector is RSS/ATOM but feedUrl is missing, gracefully fallback to WEB scraper
      let finalConnectorType = connectorType;
      if ((connectorType === "RSS" || connectorType === "ATOM") && !feedUrl.trim()) {
        finalConnectorType = "WEB";
      }

      let parsedConfig = {};
      let parsedHeaders = {};
      try {
        parsedConfig = JSON.parse(configJsonStr || "{}");
      } catch (err) {
        throw new Error("Cấu hình Config JSON không đúng định dạng JSON");
      }

      try {
        parsedHeaders = JSON.parse(headersJsonStr || "{}");
      } catch (err) {
        throw new Error("Cấu hình Custom Headers không đúng định dạng JSON");
      }

      const payload: any = {
        name: finalName,
        source_type: sourceType,
        connector_type: finalConnectorType,
        base_url: finalBaseUrl || undefined,
        feed_url: feedUrl.trim() || undefined,
        canonical_url: canonicalUrl.trim() || undefined,
        description: description.trim() || undefined,
        sync_interval_minutes: Number(syncInterval),
        priority: Number(priority),
        content_roles: contentRoles,
        categories: categories,
        config_json: parsedConfig,
        headers_json: parsedHeaders,
        fallback_chain: fallbackChain,
        capabilities: capabilities,
      };

      if (authType !== "none" && secret) {
        payload.credential = {
          auth_type: authType,
          secret: secret || undefined,
          key_name: keyName || undefined,
        };
      }

      if (isEdit && initialData) {
        await immersionApi.updateSource(initialData.id, payload);
        notify.success(`Đã cập nhật cấu hình cho nguồn "${finalName}"`);
        router.push(`/sources/${initialData.id}`);
      } else {
        const created = await immersionApi.createSource(payload);
        notify.success(`Đã tạo thành công nguồn học tập "${finalName}"!`);
        router.push(`/sources/${created.id}`);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getConnectorBadgeInfo = (type: ConnectorType) => {
    switch (type) {
      case "RSS":
        return {
          title: "Kênh tin tự động (RSS Feed)",
          desc: "Được cập nhật tự động nhanh nhất từ feed XML của website.",
          color: "bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/30",
          icon: "⚡",
        };
      case "ATOM":
        return {
          title: "Kênh bài viết kỹ thuật (Atom Feed)",
          desc: "Định dạng chuyên dùng cho blog công nghệ và bài viết dài.",
          color: "bg-blue-100 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-500/30",
          icon: "📡",
        };
      case "WEB":
        return {
          title: "Đọc trực tiếp từ trang web (Web Scraper)",
          desc: "Hệ thống tự động trích xuất nội dung trực tiếp từ trang web này.",
          color: "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30",
          icon: "🌐",
        };
      default:
        return {
          title: `Loại kết nối: ${type}`,
          desc: "Đang sử dụng cấu hình chuyên sâu.",
          color: "bg-purple-100 dark:bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-500/30",
          icon: "🔌",
        };
    }
  };

  const connectorBadge = getConnectorBadgeInfo(connectorType);

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 🌟 PRIMARY MAGIC INPUT: Single-URL Setup for Low-Tech Users */}
        {!isEdit && (
          <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-torii-500/10 via-indigo-100/70 to-purple-100/70 dark:from-torii-500/15 dark:via-indigo-900/30 dark:to-purple-950/40 border border-indigo-200 dark:border-indigo-500/40 shadow-xl space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Sparkles className="w-5 h-5 text-amber-500 dark:text-amber-400 animate-pulse" />
                <h3 className="text-slate-900 dark:text-white font-bold text-lg sm:text-xl">
                  Thêm nguồn học tiếng Nhật từ liên kết web
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 uppercase tracking-wider">
                  Chỉ cần 1 URL duy nhất
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Bạn chỉ cần dán đường dẫn trang web muốn đọc hoặc học tiếng Nhật (ví dụ:{" "}
                <button
                  type="button"
                  onClick={() => {
                    setDetectUrl("https://zenn.dev");
                    setBaseUrl("https://zenn.dev");
                    handleAutoDetect("https://zenn.dev");
                  }}
                  className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-white underline font-mono text-xs"
                >
                  zenn.dev
                </button>
                ,{" "}
                <button
                  type="button"
                  onClick={() => {
                    setDetectUrl("https://mainichi.jp");
                    setBaseUrl("https://mainichi.jp");
                    handleAutoDetect("https://mainichi.jp");
                  }}
                  className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-white underline font-mono text-xs"
                >
                  mainichi.jp
                </button>
                ,{" "}
                <button
                  type="button"
                  onClick={() => {
                    setDetectUrl("https://magazine.tabelog.com");
                    setBaseUrl("https://magazine.tabelog.com");
                    handleAutoDetect("https://magazine.tabelog.com");
                  }}
                  className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-white underline font-mono text-xs"
                >
                  magazine.tabelog.com
                </button>
                ). Hệ thống sẽ tự động quét, đặt tên, chọn kiểu lấy tin tối ưu và điền mọi thông số cho bạn!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="relative flex-1">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                <input
                  type="url"
                  required
                  value={detectUrl || baseUrl}
                  onChange={(e) => {
                    setDetectUrl(e.target.value);
                    setBaseUrl(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAutoDetect();
                    }
                  }}
                  placeholder="Dán đường dẫn trang web tại đây (e.g. https://zenn.dev, https://nhk.or.jp)..."
                  className="glass-input w-full pl-12 pr-4 py-3.5 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500/50 shadow-inner"
                />
              </div>
              <button
                type="button"
                onClick={() => handleAutoDetect()}
                disabled={isDetecting || !(detectUrl || baseUrl)}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-torii-500 to-indigo-600 hover:from-torii-600 hover:to-indigo-700 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {isDetecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang quét trang web...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>✨ Tự động nhận diện</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 📋 LIVE SOURCE CARD PREVIEW & ESSENTIAL CUSTOMIZATION */}
        <div className="glass-panel rounded-2xl p-6 sm:p-7 space-y-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
              <Compass className="w-5 h-5 text-torii-400" />
              <span>Thông tin nguồn học tập</span>
            </div>
            {/* Auto-detected badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${connectorBadge.color}`}>
              <span>{connectorBadge.icon}</span>
              <span>{connectorBadge.title}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Tên nguồn hiển thị <span className="text-torii-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. NHK News Web Easy, Zenn Trending..."
                className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Tên hiển thị trên danh sách bài đọc immersion của bạn.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Đường dẫn trang web (Base URL) <span className="text-torii-400">*</span>
              </label>
              <input
                type="url"
                required
                value={baseUrl || detectUrl}
                onChange={(e) => {
                  setBaseUrl(e.target.value);
                  setDetectUrl(e.target.value);
                }}
                placeholder="https://example.com"
                className="glass-input w-full px-4 py-2.5 rounded-xl text-sm font-mono text-xs"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Trang chủ web dùng để mở bài viết gốc và cào nội dung.
              </p>
            </div>
          </div>

          {/* Learning Roles Multi-select pills */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Vai trò ngôn ngữ cho người học (Learning Roles)
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Chọn phong cách văn phong</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_ROLES.map((role) => {
                const isSelected = contentRoles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-torii-600 text-white shadow-sm shadow-torii-600/30"
                        : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Categories Multi-select */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Chủ đề & Lĩnh vực (Categories)
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Chọn lĩnh vực quan tâm</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_CATEGORIES.map((cat) => {
                const isSelected = categories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-violet-600 text-white shadow-sm shadow-violet-600/30"
                        : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Mô tả tóm tắt</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Giới thiệu văn phong, độ khó từ vựng tiếng Nhật, nguồn đối tượng..."
              className="glass-input w-full px-4 py-2 rounded-xl text-sm resize-none"
            />
          </div>

          {/* Quick Add CTA Bar for Low-Tech Users */}
          {!isEdit && (
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-indigo-700 dark:text-indigo-300">Đã sẵn sàng!</span> Nhấn nút bên cạnh để thêm nguồn và bắt đầu nạp bài học ngay lập tức.
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !(baseUrl || detectUrl)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>🚀 Thêm nguồn học tập này</span>
              </button>
            </div>
          )}
        </div>

        {/* ⚙️ ADVANCED TECHNICAL SETTINGS ACCORDION (COLLAPSIBLE) */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/50">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full p-4 sm:p-5 text-left hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <div>
                <span className="font-semibold text-slate-900 dark:text-white text-sm">
                  ⚙️ Cấu hình kỹ thuật nâng cao
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tùy chỉnh thủ công Loại Connector, Feed URL, JSON Headers, Fallback Chain và Credentials
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>{showAdvanced ? "Thu gọn" : "Mở rộng"}</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showAdvanced && (
            <div className="p-6 pt-2 space-y-6 border-t border-slate-200 dark:border-slate-800">
              {/* Connector and URLs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Loại Connector (Kỹ thuật) <span className="text-torii-400">*</span>
                  </label>
                  <select
                    value={connectorType}
                    onChange={(e) => setConnectorType(e.target.value as ConnectorType)}
                    className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-900"
                  >
                    <optgroup label="✨ Production Ready Connectors">
                      <option value="RSS">RSS 2.0 / RDF Feed (Kênh tin cập nhật tự động)</option>
                      <option value="ATOM">Atom 1.0 Feed (Blog kỹ thuật, Qiita)</option>
                      <option value="WEB">Web Scraper (Bóc tách từ trang web thông thường)</option>
                      <option value="REST_API">Generic REST JSON API (Dành cho nhà phát triển)</option>
                      <option value="SITEMAP">Sitemap XML / News Index</option>
                    </optgroup>
                    <optgroup label="🔒 Platform Skeletons (Cần API Key)">
                      <option value="REDDIT">Reddit Connector (Cần API Script)</option>
                      <option value="X">X / Twitter API (Cần Bearer Token)</option>
                      <option value="THREADS">Threads Connector (Cần Meta Token)</option>
                      <option value="GRAPHQL">GraphQL Endpoint</option>
                      <option value="CUSTOM">Custom Script</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Định dạng nguồn (Source Type)
                  </label>
                  <select
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value as SourceType)}
                    className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-900"
                  >
                    <option value="NEWS">Báo chí & Thời sự (NEWS)</option>
                    <option value="BLOG">Blog & Tạp chí trực tuyến (BLOG)</option>
                    <option value="SOCIAL">Mạng xã hội & Thảo luận (SOCIAL)</option>
                    <option value="FORUM">Diễn đàn & Hỏi đáp (FORUM)</option>
                    <option value="WEB">Trang web tổng hợp (WEB)</option>
                    <option value="OTHER">Nguồn đặc thù khác (OTHER)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Chu kỳ quét định kỳ
                  </label>
                  <select
                    value={syncInterval}
                    onChange={(e) => setSyncInterval(Number(e.target.value))}
                    className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-900"
                  >
                    <option value={15}>Mỗi 15 phút</option>
                    <option value={30}>Mỗi 30 phút</option>
                    <option value={60}>Mỗi 1 giờ (Chuẩn)</option>
                    <option value={120}>Mỗi 2 giờ</option>
                    <option value={240}>Mỗi 4 giờ</option>
                    <option value={720}>Mỗi 12 giờ</option>
                    <option value={1440}>Mỗi 24 giờ</option>
                  </select>
                </div>
              </div>

              {/* Feed URL & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Feed URL / API Endpoint (Nếu có)
                  </label>
                  <input
                    type="url"
                    value={feedUrl}
                    onChange={(e) => setFeedUrl(e.target.value)}
                    placeholder="https://example.com/rss.xml hoặc /api/articles"
                    className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm font-mono text-xs"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Để trống nếu dùng Web Scraper trực tiếp từ Base Web URL.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Độ ưu tiên nạp nội dung: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{priority}/10</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-3"
                  />
                </div>
              </div>

              {/* Fallback Chain Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Fallback Chain (Chuỗi dự phòng khi connector chính gặp sự cố)
                </label>
                <div className="flex flex-wrap gap-2">
                  {["REST_API", "RSS", "ATOM", "SITEMAP", "WEB"].map((fb) => {
                    if (fb === connectorType) return null;
                    const isSelected = fallbackChain.includes(fb);
                    return (
                      <button
                        key={fb}
                        type="button"
                        onClick={() => toggleFallback(fb)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                          isSelected
                            ? "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40"
                            : "bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}
                      >
                        + {fb}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* JSON Config & Headers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Config JSON (Tham số riêng của connector)
                  </label>
                  <textarea
                    rows={3}
                    value={configJsonStr}
                    onChange={(e) => setConfigJsonStr(e.target.value)}
                    placeholder='{"items_path": "articles", "title_path": "title"}'
                    className="glass-input w-full p-3 rounded-xl font-mono text-xs resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Custom Headers JSON (User-Agent, Cookie, Referer...)
                  </label>
                  <textarea
                    rows={3}
                    value={headersJsonStr}
                    onChange={(e) => setHeadersJsonStr(e.target.value)}
                    placeholder='{"User-Agent": "JapStudio/2.0"}'
                    className="glass-input w-full p-3 rounded-xl font-mono text-xs resize-none"
                  />
                </div>
              </div>

              {/* Authentication & Credential Reference */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                    <Key className="w-4 h-4 text-emerald-400" />
                    <span>Xác thực & Bảo mật (Credentials)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Mã hóa AES-Fernet</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Loại xác thực</label>
                    <select
                      value={authType}
                      onChange={(e) => setAuthType(e.target.value as AuthType)}
                      className="glass-input w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                    >
                      <option value="none">Không xác thực (Công khai)</option>
                      <option value="api_key">API Key Header</option>
                      <option value="bearer_token">Bearer Token (OAuth2)</option>
                      <option value="basic_auth">Basic Auth</option>
                    </select>
                  </div>

                  {authType !== "none" && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Tên Header / Param
                        </label>
                        <input
                          type="text"
                          value={keyName}
                          onChange={(e) => setKeyName(e.target.value)}
                          placeholder="e.g. X-API-Key hoặc Authorization"
                          className="glass-input w-full px-3.5 py-2 rounded-xl text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Khóa bí mật (Secret Value)
                        </label>
                        <div className="relative">
                          <input
                            type={showSecret ? "text" : "password"}
                            value={secret}
                            onChange={(e) => setSecret(e.target.value)}
                            placeholder={
                              initialData?.credential?.masked_secret
                                ? `Hiện tại: ${initialData.credential.masked_secret}`
                                : "Nhập token bí mật..."
                            }
                            className="glass-input w-full px-3.5 py-2 pr-10 rounded-xl text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecret(!showSecret)}
                            className="absolute right-3 top-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                          >
                            {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 🚀 FORM FOOTER ACTIONS */}
        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            Quay lại
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isTesting || (!feedUrl && !baseUrl && !detectUrl)}
              onClick={handleTestAdHoc}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-amber-700 dark:text-kintsugi-400 border border-slate-300 dark:border-slate-700 transition-all"
            >
              <Zap className="w-4 h-4" />
              <span>Kiểm tra kết nối</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-600/30 transition-all"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isEdit ? "Cập nhật cấu hình" : "Lưu nguồn mới"}</span>
            </button>
          </div>
        </div>
      </form>

      <TestConnectionModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        sourceName={name || feedUrl || baseUrl || detectUrl || "Cấu hình thử nghiệm"}
        result={testResult}
        isLoading={isTesting}
      />
    </>
  );
};
