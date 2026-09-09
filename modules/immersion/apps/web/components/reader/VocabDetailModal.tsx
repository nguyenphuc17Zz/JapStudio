"use client";

import React, { useEffect, useRef, useState } from "react";
import { ContentVocabulary, ContentExpression } from "@/lib/types";
import { api } from "@/lib/api";
import { notify } from "@/components/ui";
import { X, Sparkles, BookA, Tag, Award, BookmarkPlus, Check, Link2 } from "lucide-react";

interface VocabDetailModalProps {
  vocab: ContentVocabulary | null;
  onClose: () => void;
  contentId?: number;
  sentenceText?: string | null;
  sourceName?: string;
  /** In-article collocations containing this word (0 tokens, from enrichment). */
  expressions?: ContentExpression[];
}

export const VocabDetailModal: React.FC<VocabDetailModalProps> = ({
  vocab,
  onClose,
  contentId,
  sentenceText,
  sourceName,
  expressions,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const encounteredRef = useRef<Set<string>>(new Set());

  // Silent ENCOUNTERED log: opening the modal means the user met this word.
  // Deduplicated per (content, vocab) within the page session.
  useEffect(() => {
    if (!vocab || !contentId) return;
    const key = `${contentId}:${vocab.id}`;
    if (encounteredRef.current.has(key)) return;
    encounteredRef.current.add(key);
    setIsSaved(false);
    api.ingestLearningEvent({
      event_type: "ENCOUNTERED",
      item_type: "VOCABULARY",
      term: vocab.surface_form,
      normalized_form: vocab.normalized_form,
      reading: vocab.reading,
      meaning: vocab.meaning_in_context,
      part_of_speech: vocab.part_of_speech,
      content_id: contentId,
      sentence_text: sentenceText || undefined,
      source_name: sourceName,
      learning_priority: vocab.learning_priority,
    }).catch(() => {
      // Silent: knowledge logging must never interrupt reading.
    });
  }, [vocab?.id, contentId]);

  if (!vocab) return null;

  const handleSave = async () => {
    if (isSaving || isSaved || !contentId) return;
    setIsSaving(true);
    try {
      const res = await api.ingestLearningEvent({
        event_type: "WORD_SAVED",
        item_type: "VOCABULARY",
        term: vocab.surface_form,
        normalized_form: vocab.normalized_form,
        reading: vocab.reading,
        meaning: vocab.meaning_in_context,
        part_of_speech: vocab.part_of_speech,
        content_id: contentId,
        sentence_text: sentenceText || undefined,
        source_name: sourceName,
        learning_priority: vocab.learning_priority,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-sumi-900 border border-sumi-700 shadow-2xl p-4 sm:p-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl -mr-10 -mt-10" />

        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex-shrink-0">
              <BookA className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <span className="text-xs uppercase font-mono tracking-wider text-sky-400 font-semibold">
                Từ vựng trong ngữ cảnh
              </span>
              <div className="flex items-baseline gap-2 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-bold text-sumi-100 dark:text-white font-serif tracking-wide">
                  {vocab.surface_form}
                </h3>
                {vocab.reading && vocab.reading !== vocab.surface_form && (
                  <span className="text-sm text-sumi-400 font-sans">
                    【{vocab.reading}】
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-sumi-400 hover:text-sumi-100 hover:bg-sumi-800 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Meaning + attributes side-by-side on desktop to cut vertical scroll */}
        <div className="grid gap-3 md:grid-cols-5 mb-4">
          {/* Meaning in context */}
          <div className="md:col-span-3 p-3 rounded-xl bg-sumi-950/70 border border-sumi-800">
            <span className="text-[11px] text-sumi-400 font-mono block mb-1">
              Ý nghĩa trong bài đọc:
            </span>
            <p className="text-base font-semibold text-emerald-700 dark:text-emerald-300 leading-snug">
              {vocab.meaning_in_context}
            </p>
          </div>

          {/* Badges / Attributes */}
          <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-1 gap-2 text-xs content-start">
            <div className="p-2.5 rounded-lg bg-sumi-800/40 border border-sumi-800 flex items-center gap-2">
              <Tag className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-sumi-400 block font-mono">Từ loại</span>
                <span className="text-sumi-200 font-medium capitalize truncate block">{vocab.part_of_speech || "N/A"}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-sumi-800/40 border border-sumi-800 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-sumi-400 block font-mono">Độ quan trọng</span>
                <span className="text-sumi-200 font-medium truncate block">{"★".repeat(vocab.importance || 3)} ({vocab.importance}/5)</span>
              </div>
            </div>
          </div>
        </div>

        {/* In-article collocations containing this word (no extra AI call) */}
        {expressions && expressions.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-semibold mb-1.5">
              <Link2 className="w-3.5 h-3.5" />
              <span>Cụm trong bài chứa từ này ({expressions.length})</span>
            </div>
            <div className="space-y-1.5">
              {expressions.slice(0, 4).map((e) => (
                <div key={e.id} className="text-xs leading-relaxed">
                  <span className="font-bold text-white font-serif">{e.expression}</span>
                  {e.reading && <span className="text-sumi-400">【{e.reading}】</span>}
                  <span className="text-emerald-200/90"> — {e.meaning_in_context}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2">
          {contentId && (
            <button
              onClick={handleSave}
              disabled={isSaving || isSaved}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:bg-emerald-500/20 disabled:text-emerald-300 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
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
