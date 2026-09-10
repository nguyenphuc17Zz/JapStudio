"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { SelectionLookupResponse } from "@/lib/types";
import { immersionApi } from "@/lib/api";
import { notify } from "@/components/ui";
import {
  X,
  Search,
  BookmarkPlus,
  Check,
  RotateCw,
  Sparkles,
  Volume2,
  Copy,
  Lightbulb,
  Link2,
  BookOpen,
  ArrowRight,
} from "lucide-react";

export interface LookupRequest {
  query: string;
  context: string;
}

interface SelectionLookupModalProps {
  request: LookupRequest | null;
  contentId: number;
  sourceName?: string;
  modelProvider?: string;
  onClose: () => void;
}

export const SelectionLookupModal: React.FC<SelectionLookupModalProps> = ({
  request,
  contentId,
  sourceName,
  modelProvider,
  onClose,
}) => {
  const [activeQuery, setActiveQuery] = useState<string>("");
  const [result, setResult] = useState<SelectionLookupResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Tăng mỗi lần tra mới — response stale (tra liên tiếp / đóng modal) bị bỏ qua.
  const requestSeq = useRef(0);

  // Tra nhanh hiện nghĩa ngay, rồi auto lấy chi tiết full nền và merge.
  const fetchLookup = useCallback(
    (query: string, context: string) => {
      const seq = ++requestSeq.current;
      const trimmedContext = context ? context.slice(0, 200) : undefined;
      setActiveQuery(query);
      setResult(null);
      setError(null);
      setIsSaved(false);
      setIsLoading(true);
      setIsDetailLoading(false);
      immersionApi
        .lookupSelection({
          query,
          context: trimmedContext,
          content_id: contentId,
          model_provider: modelProvider,
          detail: "quick",
        })
        .then((quickRes) => {
          if (requestSeq.current !== seq) return;
          setResult(quickRes);
          setIsLoading(false);
          // Auto full nền: giữ nghĩa quick,เติม chi tiết khi xong.
          setIsDetailLoading(true);
          immersionApi
            .lookupSelection({
              query,
              context: trimmedContext,
              content_id: contentId,
              model_provider: modelProvider,
              detail: "full",
            })
            .then((fullRes) => {
              if (requestSeq.current !== seq) return;
              setResult(fullRes);
            })
            .catch(() => {
              // Giữ kết quả quick, fail silently (không nút).
            })
            .finally(() => {
              if (requestSeq.current === seq) setIsDetailLoading(false);
            });
        })
        .catch((err: any) => {
          if (requestSeq.current !== seq) return;
          setResult(null);
          setError(err?.message || "Không thể tra từ lúc này.");
          setIsLoading(false);
        });
    },
    [contentId, modelProvider]
  );

  useEffect(() => {
    if (!request) {
      // Modal đóng: hủy mọi response đang bay.
      requestSeq.current += 1;
      return;
    }
    fetchLookup(request.query, request.context);
  }, [request?.query, request?.context, fetchLookup]);

  useEffect(() => {
    if (!request) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    }
  }, [request]);

  if (!request) return null;

  const handleSave = async () => {
    if (!result || isSaving || isSaved) return;
    setIsSaving(true);
    try {
      const res = await immersionApi.ingestLearningEvent({
        event_type: "WORD_SAVED",
        item_type: "VOCABULARY",
        term: result.query,
        reading: result.reading,
        meaning: result.meaning_vi,
        part_of_speech: result.part_of_speech,
        content_id: contentId,
        sentence_text: request.context || undefined,
        source_name: sourceName,
        // Full AI detail already on hand — stored without an extra AI call
        nuance: result.nuance || undefined,
        collocation: result.collocation || undefined,
        jlpt_level: result.jlpt_level || undefined,
        examples: (result.examples || []).map((e) => ({
          sentence_ja: e.sentence_ja,
          sentence_vi: e.sentence_vi,
        })),
        alternatives: (result.alternatives || []).map((a) => ({
          expression: a.expression,
          reading: a.reading,
          meaning_vi: a.meaning_vi,
          difference: a.difference,
        })),
      });
      setIsSaved(true);
      if (res.ai_enriched) {
        notify.success("Đã lưu từ kèm sắc thái, cụm chuẩn, ví dụ và từ gần nghĩa!");
      } else {
        notify.success("Đã lưu từ vào Thư viện Tri thức!");
      }
    } catch (err: any) {
      notify.error(err?.message || "Không thể lưu từ vào Thư viện");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSpeak = (text: string) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) {
        notify.error("Trình duyệt không hỗ trợ phát âm.");
        return;
      }
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "ja-JP";
      utter.rate = 0.9;
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      synth.speak(utter);
    } catch {
      setIsSpeaking(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify.success("Đã chép vào clipboard!");
    } catch {
      notify.error("Không thể chép.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-sumi-900 border border-sumi-700 shadow-2xl p-4 sm:p-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-torii-500/10 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-2 rounded-xl bg-torii-500/10 text-torii-400 border border-torii-500/20 flex-shrink-0">
              <Search className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <span className="text-xs uppercase font-mono tracking-wider text-torii-400 font-semibold">
                Tra từ bôi đen
              </span>
              <h3 className="text-3xl font-bold text-white font-serif tracking-wide truncate">
                {activeQuery || request.query}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-sumi-400 hover:text-sumi-100 hover:bg-sumi-800 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Context sentence */}
        {request.context && (
          <div className="mb-4 p-3 rounded-xl bg-sumi-950/70 border border-sumi-800">
            <span className="text-[10px] text-sumi-400 font-mono block mb-1">
              Câu chứa từ trong bài đọc:
            </span>
            <p className="text-sm text-sumi-200 font-serif leading-relaxed line-clamp-3">
              {request.context}
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="py-10 text-center text-sumi-400 text-sm">
            <RotateCw className="w-7 h-7 animate-spin mx-auto mb-2 text-torii-400" />
            Đang tra nghĩa nhanh...
          </div>
        ) : error && !result ? (
          <div className="p-4 rounded-xl bg-torii-500/10 border border-torii-500/30 text-torii-300 text-xs space-y-3">
            <p>{error}</p>
            <button
              onClick={() => fetchLookup(request.query, request.context)}
              className="px-3 py-1.5 rounded-lg bg-torii-500/20 hover:bg-torii-500/30 text-torii-200 text-xs font-semibold flex items-center gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" /> Thử lại
            </button>
          </div>
        ) : result ? (
          <div className="space-y-4">
            {/* Reading + meaning + badges */}
            <div className="p-4 rounded-xl bg-sumi-950/70 border border-sumi-800">
              <div className="text-lg text-sky-300 font-medium mb-0.5">【{result.reading}】</div>
              <p className="text-xl font-bold text-white leading-snug">{result.meaning_vi}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                {result.part_of_speech && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                    {result.part_of_speech}
                  </span>
                )}
                {result.jlpt_level && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {result.jlpt_level}
                  </span>
                )}
              </div>
            </div>

            {/* Nuance + collocation side-by-side on desktop to cut vertical scroll */}
            <div className="grid gap-3 md:grid-cols-2">
              {result.nuance && (
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-center gap-1.5 text-amber-300 text-xs font-semibold mb-1">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Sắc thái sử dụng</span>
                  </div>
                  <p className="text-xs text-sumi-300 leading-relaxed">{result.nuance}</p>
                </div>
              )}

              {result.collocation && (
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-semibold mb-1">
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Cụm chuẩn người bản xứ</span>
                  </div>
                  <p className="text-sm text-emerald-200 font-medium">{result.collocation}</p>
                </div>
              )}
            </div>

            {/* Examples with TTS — 2 columns on desktop to cut vertical scroll */}
            {result.examples?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-sumi-300 text-xs font-semibold mb-2">
                  <BookOpen className="w-3.5 h-3.5 text-sumi-400" />
                  <span>Ví dụ thực tế ({result.examples.length})</span>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {result.examples.map((ex, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-sumi-950 border border-sumi-800/80 space-y-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-white font-serif leading-relaxed flex-1">
                          {ex.sentence_ja}
                        </p>
                        <button
                          onClick={() => handleSpeak(ex.sentence_ja)}
                          title="Nghe phát âm"
                          className="p-1.5 rounded-lg text-sumi-400 hover:text-sky-300 hover:bg-sky-500/10 transition-colors flex-shrink-0"
                        >
                          <Volume2 className={`w-4 h-4 ${isSpeaking ? "animate-pulse" : ""}`} />
                        </button>
                      </div>
                      {ex.sentence_vi && (
                        <p className="text-[11px] text-sumi-400">{ex.sentence_vi}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alternatives: tap to look up that word instead */}
            {result.alternatives?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-sumi-300 mb-2">
                  Từ gần nghĩa — bấm để tra tiếp:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.alternatives.map((alt, idx) => (
                    <button
                      key={idx}
                      onClick={() => fetchLookup(alt.expression, request.context)}
                      className="p-2.5 rounded-xl bg-sumi-950 border border-sumi-800 hover:border-torii-500/50 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-bold text-white font-serif truncate">
                          {alt.expression}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-sumi-500 group-hover:text-torii-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                      </div>
                      {alt.reading && (
                        <div className="text-[11px] text-sumi-400">【{alt.reading}】</div>
                      )}
                      <div className="text-xs text-sky-300 truncate">{alt.meaning_vi}</div>
                      {alt.difference && (
                        <div className="text-[11px] text-sumi-500 line-clamp-2 mt-0.5">
                          ≠ {alt.difference}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Chi tiết full đang tải nền: hint nhẹ, không nút bấm */}
            {isDetailLoading && (
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-sumi-500 font-mono py-1">
                <RotateCw className="w-3 h-3 animate-spin text-torii-400" />
                <span>Đang tải chi tiết AI...</span>
              </div>
            )}
          </div>
        ) : null}

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-sumi-800/60">
          {result && (
            <>
              <button
                onClick={() => handleSpeak(result.query)}
                title="Phát âm từ"
                className="p-2 rounded-xl bg-sumi-800 hover:bg-sumi-700 text-sumi-300 hover:text-white transition-colors"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleCopy(`${result.query}【${result.reading}】: ${result.meaning_vi}`)}
                title="Chép nghĩa"
                className="p-2 rounded-xl bg-sumi-800 hover:bg-sumi-700 text-sumi-300 hover:text-white transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || isSaved}
                className="px-4 py-2 rounded-xl bg-torii-500 hover:bg-torii-600 disabled:bg-emerald-500/20 disabled:text-emerald-300 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                {isSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Đã lưu vào Thư viện
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-3.5 h-3.5" /> {isSaving ? "Đang lưu..." : "Lưu vào Thư viện"}
                  </>
                )}
              </button>
            </>
          )}
          <div className="flex items-center gap-1 text-[10px] text-sumi-500 font-mono mr-auto">
            <Sparkles className="w-3 h-3" />
            {result?.model_name || "AI"}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-sumi-800 hover:bg-sumi-700 text-sumi-200 text-xs font-semibold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
