import React from "react";
import { TestConnectionResponse } from "@/lib/types";
import { CheckCircle, XCircle, Clock, ExternalLink, X, AlertTriangle } from "lucide-react";

interface TestConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceName: string;
  result: TestConnectionResponse | null;
  isLoading?: boolean;
}

export const TestConnectionModal: React.FC<TestConnectionModalProps> = ({
  isOpen,
  onClose,
  sourceName,
  result,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-sumi-900 border border-slate-200 dark:border-sumi-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-sumi-800 bg-slate-50 dark:bg-sumi-950/60">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Kiểm tra kết nối (Test Connection)</h3>
            <p className="text-xs text-slate-500 dark:text-sumi-400 mt-0.5 font-mono font-semibold">{sourceName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 dark:text-sumi-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-sumi-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-2 border-torii-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500 dark:text-sumi-300 font-medium">Đang gửi yêu cầu & kiểm tra SSRF an toàn...</p>
            </div>
          ) : result ? (
            <>
              {/* Status Banner */}
              <div
                className={`flex items-start gap-3.5 p-4 rounded-xl border ${
                  result.success
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-sm font-semibold">
                    {result.success ? "Kết nối thành công!" : "Kết nối thất bại"}
                  </h4>
                  <p className="text-xs mt-1 opacity-90">{result.message}</p>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-sumi-950/50 border border-slate-200 dark:border-sumi-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-sumi-400 font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    Độ trễ phản hồi
                  </div>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
                    {result.response_time_ms} ms
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-sumi-950/50 border border-slate-200 dark:border-sumi-800">
                  <div className="text-xs text-slate-500 dark:text-sumi-400 font-semibold">Mã trạng thái HTTP</div>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
                    {result.status_code || "N/A"}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-sumi-950/50 border border-slate-200 dark:border-sumi-800 col-span-2 sm:col-span-1">
                  <div className="text-xs text-slate-500 dark:text-sumi-400 font-semibold">Số mục tìm thấy</div>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
                    {result.sample_items_count} items
                  </div>
                </div>
              </div>

              {/* Error Details if any */}
              {result.error_details && (
                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/40 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-rose-400 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Chi tiết lỗi:
                  </div>
                  <pre className="font-mono text-sumi-300 whitespace-pre-wrap overflow-x-auto max-h-32 p-2 bg-sumi-950/70 rounded">
                    {result.error_details}
                  </pre>
                </div>
              )}

              {/* Sample Data Preview */}
              {result.sample_preview && result.sample_preview.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-sumi-400">
                    Xem trước dữ liệu nhận được ({result.sample_preview.length} mẫu):
                  </div>
                  <div className="space-y-2">
                    {result.sample_preview.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-sumi-950/40 border border-slate-200 dark:border-sumi-800 text-xs space-y-1"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-slate-900 dark:text-sumi-100">{item.title || item.page_title || JSON.stringify(item)}</span>
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-torii-500 dark:text-torii-400 hover:text-torii-600 dark:hover:text-torii-300 inline-flex items-center gap-1 shrink-0"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        {item.summary_snippet && (
                          <p className="text-slate-500 dark:text-sumi-400 line-clamp-2 font-medium">{item.summary_snippet}</p>
                        )}
                        {item.published_at && (
                          <span className="text-[10px] text-slate-400 dark:text-sumi-500 font-mono">{item.published_at}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-slate-200 dark:border-sumi-800 bg-slate-50 dark:bg-sumi-950/60">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-sumi-200 bg-slate-100 dark:bg-sumi-800 hover:bg-slate-200 dark:hover:bg-sumi-700 transition-colors border border-slate-200 dark:border-sumi-700"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
