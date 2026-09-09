import React, { useState, useEffect } from "react";
import { PresetCategoryGroup, PresetSourceItem } from "@/lib/types";
import { immersionApi } from "@/lib/api";
import { Sparkles, Check, CheckSquare, Square, X, ArrowRight, Shield } from "lucide-react";
import { notify } from "@/components/ui";
import { CategoryPill } from "../ui/CategoryPill";

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstalled: () => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({ isOpen, onClose, onInstalled }) => {
  const [groups, setGroups] = useState<PresetCategoryGroup[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installResult, setInstallResult] = useState<{ installed: number; skipped: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPresets();
      setInstallResult(null);
    }
  }, [isOpen]);

  const loadPresets = async () => {
    try {
      setIsLoading(true);
      const data = await immersionApi.getPresets();
      setGroups(data);
      // Pre-select all unique keys by default
      const allKeys = Array.from(
        new Set(data.flatMap((g) => g.items.map((item) => item.key)))
      );
      setSelectedKeys(allKeys);
    } catch (err) {
      console.error("Failed to load presets:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectAll = () => {
    const allKeys = Array.from(
      new Set(groups.flatMap((g) => g.items.map((item) => item.key)))
    );
    setSelectedKeys(allKeys);
  };

  const deselectAll = () => {
    setSelectedKeys([]);
  };

  const handleInstall = async () => {
    if (selectedKeys.length === 0) return;
    const installToast = notify.loading(`Đang cài đặt ${selectedKeys.length} nguồn dữ liệu mẫu...`);
    try {
      setIsInstalling(true);
      const res = await immersionApi.installPresets(selectedKeys);
      setInstallResult({
        installed: res.installed_count,
        skipped: res.skipped_count,
      });
      const msg = res.installed_count > 0
        ? `Đã cài đặt thành công ${res.installed_count} nguồn mẫu!${res.skipped_count > 0 ? ` (Bỏ qua ${res.skipped_count} nguồn đã có)` : ""}`
        : `Tất cả ${res.skipped_count} nguồn mẫu đã được cài đặt trước đó.`;
      notify.update(installToast, {
        type: "success",
        message: msg,
        duration: 4500,
      });
      onInstalled();
    } catch (err: any) {
      notify.update(installToast, {
        type: "error",
        message: `Lỗi cài đặt presets: ${err.message}`,
        duration: 5000,
      });
    } finally {
      setIsInstalling(false);
    }
  };

  if (!isOpen) return null;

  const filteredGroups =
    activeTab === "all" ? groups : groups.filter((g) => g.category === activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white dark:bg-sumi-900 border border-slate-200 dark:border-sumi-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-sumi-800 bg-slate-50 dark:bg-sumi-950/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-kintsugi-500/15 border border-kintsugi-500/30 text-kintsugi-500 dark:text-kintsugi-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Kho nguồn Preset tiếng Nhật</h3>
              <p className="text-xs text-slate-500 dark:text-sumi-400 font-medium">Chọn và cài đặt sẵn các nguồn tiếng Nhật chất lượng cao</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 dark:text-sumi-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-sumi-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs & Actions */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-sumi-800 bg-slate-50 dark:bg-sumi-950/40 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "all"
                  ? "bg-torii-500 text-white"
                  : "text-slate-500 dark:text-sumi-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-sumi-800"
              }`}
            >
              Tất cả ({groups.reduce((acc, g) => acc + g.items.length, 0)})
            </button>
            {groups.map((g) => (
              <button
                key={g.category}
                onClick={() => setActiveTab(g.category)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === g.category
                    ? "bg-torii-500 text-white"
                    : "text-slate-500 dark:text-sumi-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-sumi-800"
                }`}
              >
                {g.label} ({g.items.length})
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={selectAll}
              className="text-slate-500 dark:text-sumi-400 hover:text-slate-900 dark:hover:text-sumi-200 transition-colors font-semibold"
            >
              Chọn tất cả
            </button>
            <span className="text-slate-300 dark:text-sumi-700">|</span>
            <button
              onClick={deselectAll}
              className="text-slate-500 dark:text-sumi-400 hover:text-slate-900 dark:hover:text-sumi-200 transition-colors font-semibold"
            >
              Bỏ chọn
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {installResult && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold">Kết quả cài đặt: </span>
                Đã thêm mới {installResult.installed} nguồn (bỏ qua {installResult.skipped} nguồn đã có).
              </div>
              <button
                onClick={onClose}
                className="px-3 py-1 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
              >
                Về danh sách nguồn
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 border-2 border-torii-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.category} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-sumi-100">{group.label}</h4>
                    <p className="text-xs text-slate-500 dark:text-sumi-400 font-medium">{group.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.items.map((item) => {
                    const isSelected = selectedKeys.includes(item.key);
                    return (
                      <div
                        key={item.key}
                        onClick={() => toggleKey(item.key)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-torii-50 dark:bg-sumi-800/80 border-torii-500/50 shadow-[0_0_15px_rgba(230,57,70,0.15)]"
                            : "bg-white dark:bg-sumi-950/40 border-slate-200 dark:border-sumi-800 hover:border-slate-300 dark:hover:border-sumi-700"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 text-torii-400">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-torii-500 dark:text-torii-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 dark:text-sumi-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                                {item.name}
                              </span>
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-sumi-800 text-slate-500 dark:text-sumi-300 border border-slate-200 dark:border-sumi-700">
                                {item.source_type}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-sumi-400 line-clamp-2 leading-relaxed font-medium">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-sumi-800 bg-slate-50 dark:bg-sumi-950/70 shrink-0">
          <div className="text-xs text-slate-500 dark:text-sumi-400 font-semibold">
            Đã chọn: <span className="font-bold text-slate-900 dark:text-white">{selectedKeys.length}</span> nguồn
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-sumi-300 hover:bg-slate-100 dark:hover:bg-sumi-800 transition-colors"
            >
              Hủy
            </button>
            <button
              disabled={selectedKeys.length === 0 || isInstalling}
              onClick={handleInstall}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-torii-500 hover:bg-torii-600 disabled:opacity-50 text-white shadow-[0_0_15px_rgba(230,57,70,0.3)] transition-all"
            >
              {isInstalling ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang cài đặt...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Cài đặt {selectedKeys.length} nguồn</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
