"use client";

import React, { useEffect, useRef, useState } from "react";
import { ContentGrammar, GrammarLookupResponse } from "@/lib/types";
import { api } from "@/lib/api";
import { notify } from "@/components/ui";
import { X, BookmarkCheck, BookmarkPlus, Check, Layers, Sparkles, AlertCircle, RotateCw, BookOpen } from "lucide-react";

interface GrammarDetailModalProps {
  grammar: ContentGrammar | null;
  onClose: () => void;
  contentId?: number;
  sentenceText?: string | null;
  sourceName?: string;
  modelProvider?: string;
}

export const GrammarDetailModal: React.FC<GrammarDetailModalProps> = ({
  grammar,
  onClose,
  contentId,
  sentenceText,
  sourceName,
  modelProvider,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const encounteredRef = useRef<Set<string>>(new Set());

  // On-demand full AI analysis (formation, usage, examples)
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<GrammarLookupResponse | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Silent ENCOUNTERED log, deduplicated per (content, grammar) in page session.
  useEffect(() => {
    if (!grammar || !contentId) return;
    const key = `${contentId}:g:${grammar.id}`;
    if (encounteredRef.current.has(key)) return;
    encounteredRef.current.add(key);
    setIsSaved(false);
    setAnalysis(null);
    setAnalyzeError(null);
    api.ingestLearningEvent({
      event_type: "ENCOUNTERED",
      item_type: "GRAMMAR",
      term: grammar.pattern,
      meaning: grammar.meaning_in_context,
      content_id: contentId,
      sentence_text: sentenceText || undefined,
      source_name: sourceName,
    }).catch(() => {
      // Silent: knowledge logging must never interrupt reading.
    });
  }, [grammar?.id, contentId]);

  if (!grammar) return null;

  const handleAnalyze = async () => {
    if (analyzing || !contentId) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await api.lookupGrammar({
        pattern: grammar.pattern,
        context: sentenceText ? sentenceText.slice(0, 200) : undefined,
        content_id: contentId,
        model_provider: modelProvider,
        detail: "full",
      });
      setAnalysis(res);
    } catch (err: any) {
      const msg = err?.message || "Không thể phân tích mẫu ngữ pháp lúc này.";
      setAnalyzeError(msg);
      notify.error(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (isSaving || isSaved || !contentId) return;
    setIsSaving(true);
    try {
      const res = await api.ingestLearningEvent({
        event_type: "WORD_SAVED",
        item_type: "GRAMMAR",
        term: grammar.pattern,
        meaning: (analysis?.meaning || grammar.meaning_in_context),
        content_id: contentId,
        sentence_text: sentenceText || undefined,
        source_name: sourceName,
        // Full AI detail when already analyzed — otherwise the backend
        // enriches on save so every path stores complete data.
        formation: analysis?.formation || undefined,
        usage_context: analysis?.usage_context || undefined,
        examples: (analysis?.examples || []).map((e) => ({
          sentence_ja: e.sentence_ja,
          sentence_vi: e.sentence_vi,
        })),
      });
      setIsSaved(true);
      if (res.ai_enriched) {
        notify.success("Đã lưu mẫu ngữ pháp kèm công thức, hoàn cảnh và ví dụ!");
      } else {
        notify.success("Đã lưu mẫu ngữ pháp vào Thư viện Tri thức!");
      }
    } catch (err: any) {
      notify.error(err?.message || "Không thể lưu vào Thư viện");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-sumi-900 border border-sumi-700 shadow-2xl p-4 sm:p-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl -mr-10 -mt-10" />

        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 flex-shrink-0">
              <Layers className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <span className="text-xs uppercase font-mono tracking-wider text-pink-400 font-semibold">
                Mẫu ngữ pháp
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-sumi-100 dark:text-white font-serif tracking-wide mt-0.5 break-words">
                {grammar.pattern}
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

        {/* Meaning + category side-by-side on desktop to cut vertical scroll */}
        <div className="grid gap-3 md:grid-cols-5 mb-4">
          {/* Meaning in context */}
          <div className="md:col-span-3 p-3 rounded-xl bg-sumi-950/70 border border-sumi-800">
            <span className="text-[11px] text-sumi-400 font-mono block mb-1">
              Ý nghĩa & Sắc thái:
            </span>
            <p className="text-base font-semibold text-pink-700 dark:text-pink-200 leading-snug">
              {grammar.meaning_in_context}
            </p>
          </div>

          {/* Category info */}
          {grammar.category && (
            <div className="md:col-span-2 p-2.5 rounded-lg bg-sumi-800/40 border border-sumi-800 text-xs flex items-center gap-2 self-start">
              <BookmarkCheck className="w-4 h-4 text-sumi-400 flex-shrink-0" />
              <span className="text-sumi-300">Phân loại: <strong className="text-sumi-100 dark:text-white capitalize">{grammar.category}</strong></span>
            </div>
          )}
        </div>

        {/* Full AI analysis: formation, usage situations, real examples */}
        {analyzeError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-snug flex-1">{analyzeError}</span>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="self-end px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-500/20 hover:bg-rose-200 dark:hover:bg-rose-500/30 border border-rose-300 dark:border-rose-500/40 text-[11px] font-semibold flex items-center gap-1 transition-colors"
            >
              <RotateCw className="w-3 h-3" /> Thử lại
            </button>
          </div>
        )}

        {analysis ? (
          <div className="mb-4 space-y-3">
            {analysis.formation && (
              <div className="p-3 rounded-xl bg-pink-500/5 border border-pink-500/20">
                <div className="text-[11px] font-semibold text-pink-300 mb-1">Công thức cấu tạo</div>
                <p className="text-sm text-white font-mono leading-relaxed">{analysis.formation}</p>
              </div>
            )}
            {analysis.usage_context && (
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <div className="text-[11px] font-semibold text-amber-300 mb-1">Hoàn cảnh sử dụng</div>
                <p className="text-xs text-sumi-300 leading-relaxed">{analysis.usage_context}</p>
              </div>
            )}
            {analysis.examples?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-sumi-300 text-xs font-semibold mb-2">
                  <BookOpen className="w-3.5 h-3.5 text-sumi-400" />
                  <span>Ví dụ thực tế ({analysis.examples.length})</span>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {analysis.examples.map((ex, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-sumi-950 border border-sumi-800/80 space-y-1">
                      <p className="text-sm text-white font-serif leading-relaxed">{ex.sentence_ja}</p>
                      {ex.sentence_vi && (
                        <p className="text-[11px] text-sumi-400">{ex.sentence_vi}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          contentId && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="mb-4 w-full py-2.5 px-3 rounded-lg bg-pink-100 dark:bg-pink-950/40 hover:bg-pink-200 dark:hover:bg-pink-900/50 text-pink-900 dark:text-pink-300 border border-pink-300 dark:border-pink-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{analyzing ? "AI đang phân tích mẫu câu..." : "Phân tích đầy đủ bằng AI (công thức, hoàn cảnh, ví dụ)"}</span>
            </button>
          )
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2">
          {contentId && (
            <button
              onClick={handleSave}
              disabled={isSaving || isSaved}
              className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:bg-emerald-500/20 disabled:text-emerald-300 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
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
          )}
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
