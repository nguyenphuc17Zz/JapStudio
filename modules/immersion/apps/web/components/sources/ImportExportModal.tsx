import React, { useState } from "react";
import { immersionApi } from "@/lib/api";
import { Download, Upload, Copy, Check, X, FileText, AlertCircle } from "lucide-react";
import { notify } from "@/components/ui";

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  onImported,
}) => {
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [exportJson, setExportJson] = useState<string>("");
  const [importJson, setImportJson] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ count: number; errors: string[] } | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setIsLoading(true);
      const data = await immersionApi.exportSources();
      const formatted = JSON.stringify(data, null, 2);
      setExportJson(formatted);
      notify.success("Đã xuất cấu hình nguồn thành công!");
    } catch (err: any) {
      notify.error(`Lỗi xuất dữ liệu: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadFile = () => {
    if (!exportJson) return;
    const blob = new Blob([exportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `japimmersion-sources-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyClipboard = async () => {
    if (!exportJson) return;
    await navigator.clipboard.writeText(exportJson);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleImport = async () => {
    if (!importJson.trim()) return;
    try {
      setIsLoading(true);
      setImportResult(null);
      const parsed = JSON.parse(importJson);
      const res = await immersionApi.importSources(parsed);
      setImportResult({ count: res.imported_count, errors: res.errors || [] });
      notify.success(`Đã nhập thành công ${res.imported_count} nguồn!`);
      onImported();
    } catch (err: any) {
      notify.error(`Lỗi nhập dữ liệu: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportJson(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-sumi-900 border border-sumi-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sumi-800 bg-sumi-950/70 shrink-0">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-torii-400" />
            <h3 className="text-base font-bold text-white">Import / Export Nguồn dữ liệu</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-sumi-400 hover:text-white hover:bg-sumi-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-sumi-800 bg-sumi-950/40 px-6 shrink-0">
          <button
            onClick={() => {
              setActiveTab("export");
              if (!exportJson) handleExport();
            }}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "export"
                ? "border-torii-500 text-white"
                : "border-transparent text-sumi-400 hover:text-sumi-200"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Xuất cấu hình (Export JSON)
          </button>
          <button
            onClick={() => setActiveTab("import")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "import"
                ? "border-torii-500 text-white"
                : "border-transparent text-sumi-400 hover:text-sumi-200"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Nhập cấu hình (Import JSON)
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === "export" ? (
            <div className="space-y-4">
              <p className="text-xs text-sumi-300">
                Xuất danh sách các nguồn nội dung và cấu hình sang file định dạng JSON (thông tin bí mật như API key đã được lọc an toàn).
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadFile}
                  disabled={!exportJson || isLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-torii-500 hover:bg-torii-600 disabled:opacity-50 text-white shadow-lg transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Tải file .JSON về máy
                </button>

                <button
                  onClick={handleCopyClipboard}
                  disabled={!exportJson || isLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-sumi-800 hover:bg-sumi-700 disabled:opacity-50 text-sumi-200 transition-colors border border-sumi-700"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopied ? "Đã chép!" : "Sao chép JSON"}
                </button>
              </div>

              <textarea
                readOnly
                value={exportJson}
                placeholder="Đang tải dữ liệu..."
                className="w-full h-64 p-3 rounded-xl bg-sumi-950/60 border border-sumi-800 font-mono text-xs text-sumi-300 resize-none focus:outline-none"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-sumi-300">
                Chọn file JSON cấu hình đã sao lưu hoặc dán trực tiếp nội dung JSON vào ô bên dưới:
              </p>

              <div>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-sumi-800 hover:bg-sumi-700 text-sumi-200 border border-sumi-700 cursor-pointer transition-colors">
                  <FileText className="w-3.5 h-3.5" />
                  Chọn file từ máy tính
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='{"sources": [{"name": "Sample News", "source_type": "rss", "feed_url": "..."}]}'
                className="w-full h-56 p-3 rounded-xl bg-sumi-950/60 border border-sumi-800 font-mono text-xs text-sumi-200 resize-none focus:outline-none focus:border-torii-500"
              />

              {importResult && (
                <div className="p-4 rounded-xl bg-sumi-950/80 border border-sumi-800 text-xs space-y-2">
                  <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    Đã nhập thành công {importResult.count} nguồn!
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="text-rose-400 space-y-1">
                      <div className="font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Có lỗi xảy ra:
                      </div>
                      <ul className="list-disc pl-4 text-sumi-400 space-y-0.5">
                        {importResult.errors.map((e, idx) => (
                          <li key={idx}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleImport}
                  disabled={!importJson.trim() || isLoading}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-torii-500 hover:bg-torii-600 disabled:opacity-50 text-white shadow-lg transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isLoading ? "Đang xử lý..." : "Tiến hành Nhập (Import)"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-sumi-800 bg-sumi-950/70 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-sumi-300 bg-sumi-800 hover:bg-sumi-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
