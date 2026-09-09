"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  Radio,
  Rss,
  FileCode,
  Globe,
  Layers,
  ArrowRight,
  X,
  Loader2,
} from "lucide-react";
import { immersionApi } from "@/lib/api";
import { AutoDetectResponse, AutoDetectFeedItem, STANDARD_CAPABILITIES } from "@/lib/types";

interface AutoDetectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyDetected: (detected: {
    name: string;
    base_url: string;
    feed_url?: string;
    connector_type: string;
    source_type: string;
    description?: string;
    icon_url?: string;
    content_roles: string[];
    categories: string[];
    capabilities: Record<string, string>;
  }) => void;
}

export const AutoDetectModal: React.FC<AutoDetectModalProps> = ({
  isOpen,
  onClose,
  onApplyDetected,
}) => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AutoDetectResponse | null>(null);
  const [selectedFeed, setSelectedFeed] = useState<string>("");

  if (!isOpen) return null;

  const handleDetect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await immersionApi.detectSource(url.trim());
      setResult(res);
      if (res.detected_feeds && res.detected_feeds.length > 0) {
        setSelectedFeed(res.detected_feeds[0].url);
      }
    } catch (err: any) {
      setError(err.message || "Không thể phân tích URL này. Vui lòng kiểm tra lại kết nối mạng.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;

    onApplyDetected({
      name: result.site_title || "New Source",
      base_url: result.target_url,
      feed_url: selectedFeed || (result.detected_feeds?.[0]?.url) || (result.detected_sitemaps?.[0]),
      connector_type: result.recommended_connector || "RSS",
      source_type: "NEWS",
      description: result.site_description || "",
      icon_url: result.site_icon || "",
      content_roles: result.suggested_learning_roles || ["NEWS"],
      categories: result.suggested_categories || ["News"],
      capabilities: result.capabilities || {},
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden transition-all my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">Smart Source Auto-Detector</h3>
              <p className="text-xs text-slate-400">
                Nhập bất kỳ URL tiếng Nhật nào để tự động phát hiện chuẩn Connector, RSS, Atom, Sitemap
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <form onSubmit={handleDetect} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Website hoặc Feed URL
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="https://www3.nhk.or.jp/news/ hoặc https://qiita.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !url.trim()}
                className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 whitespace-nowrap"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang quét...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Phân tích
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Site Overview */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {result.site_icon ? (
                    <img
                      src={result.site_icon}
                      alt="Icon"
                      className="w-10 h-10 rounded-lg object-contain bg-slate-900 border border-slate-800 p-1 mt-0.5"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                      <Globe className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-white text-sm">
                      {result.site_title || "Phát hiện trang web"}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                      {result.site_description || result.target_url}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Khuyên dùng: {result.recommended_connector}
                  </span>
                </div>
              </div>

              {/* Detected Feeds */}
              {result.detected_feeds && result.detected_feeds.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <Rss className="w-3.5 h-3.5 text-amber-400" />
                    Phát hiện {result.detected_feeds.length} Feed URL:
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {result.detected_feeds.map((feed, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          selectedFeed === feed.url
                            ? "border-indigo-500/50 bg-indigo-500/10 text-white"
                            : "border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <input
                            type="radio"
                            name="selectedFeed"
                            checked={selectedFeed === feed.url}
                            onChange={() => setSelectedFeed(feed.url)}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-mono truncate">{feed.url}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] uppercase font-bold text-slate-400 ml-2">
                          {feed.connector || feed.type}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Detected Sitemaps */}
              {result.detected_sitemaps && result.detected_sitemaps.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <FileCode className="w-3.5 h-3.5 text-blue-400" />
                    Phát hiện Sitemap XML:
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 text-xs text-slate-300 font-mono break-all">
                    {result.detected_sitemaps[0]}
                  </div>
                </div>
              )}

              {/* Roles & Categories Suggestions */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Learning Roles gợi ý
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.suggested_learning_roles.map((role, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Chủ đề & Thể loại
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.suggested_categories.map((cat, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Capabilities Snapshot */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5 text-violet-400" />
                  Đặc tính & Khả năng hỗ trợ (Capabilities):
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(result.capabilities || {}).slice(0, 6).map(([key, status]) => {
                    const meta = STANDARD_CAPABILITIES[key];
                    const isAvailable = status === "AVAILABLE";
                    const isPartial = status === "PARTIAL";
                    return (
                      <div
                        key={key}
                        className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                          isAvailable
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                            : isPartial
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                            : "bg-slate-900 border-slate-800 text-slate-500"
                        }`}
                      >
                        <span className="truncate">{meta?.label || key}</span>
                        <span className="text-[10px] font-bold uppercase shrink-0 ml-1">
                          {status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Hủy bỏ
          </button>

          {result && (
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all"
            >
              Áp dụng cấu hình này
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
