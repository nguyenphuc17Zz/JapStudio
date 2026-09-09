"use client";

import React, { useState, useEffect } from "react";
import { AnnotatedSentence, SentenceExplanation, ContentVocabulary, ContentGrammar, ActiveAIModel } from "@/lib/types";
import { immersionApi } from "@/lib/api";
import {
  X,
  Languages,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Brain,
  Lightbulb,
  FileCheck2,
  ChevronRight,
  Info,
  AlertCircle,
  RotateCw,
  BookmarkPlus,
  Check,
  Link2,
} from "lucide-react";

import { notify, MarkdownRenderer } from "@/components/ui";

import { SentenceCheckBar } from "./SentenceCheckBar";

interface SentenceActionSheetProps {
  contentId: number;
  sentence: AnnotatedSentence | null;
  onClose: () => void;
  activeAI?: ActiveAIModel | null;
  onSelectVocab?: (vocab: any) => void;
  onSelectGrammar?: (grammar: any) => void;
  onDecomposeSentence?: (sentenceIndex: number) => void;
  onLookupExpression?: (expression: string, sentenceText: string) => void;
}

export const SentenceActionSheet: React.FC<SentenceActionSheetProps> = ({
  contentId,
  sentence,
  onClose,
  activeAI,
  onSelectVocab,
  onSelectGrammar,
  onDecomposeSentence,
  onLookupExpression,
}) => {
  const [translating, setTranslating] = useState(false);
  const [translationVi, setTranslationVi] = useState<string | null>(sentence?.translation_vi || null);
  const [isCachedTrans, setIsCachedTrans] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState<SentenceExplanation | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);

  const [isSavingSentence, setIsSavingSentence] = useState(false);
  const [isSentenceSaved, setIsSentenceSaved] = useState(false);

  // Inline per-row save state (vocab / grammar IDs already saved in this sheet)
  const [savedVocabIds, setSavedVocabIds] = useState<Set<number>>(new Set());
  const [savingVocabIds, setSavingVocabIds] = useState<Set<number>>(new Set());
  const [savedGrammarIds, setSavedGrammarIds] = useState<Set<number>>(new Set());
  const [savingGrammarIds, setSavingGrammarIds] = useState<Set<number>>(new Set());

  // Reset per-sentence state when the user opens a different sentence.
  // (The component instance is reused across sentences.)
  useEffect(() => {
    setIsSavingSentence(false);
    setIsSentenceSaved(false);
    setSavedVocabIds(new Set());
    setSavingVocabIds(new Set());
    setSavedGrammarIds(new Set());
    setSavingGrammarIds(new Set());
    setTranslationVi(sentence?.translation_vi || null);
    setIsCachedTrans(false);
    setTranslateError(null);
    setExplanation(null);
    setExplainError(null);
  }, [contentId, sentence?.sentence_index]);

  if (!sentence) return null;

  const handleTranslate = async () => {
    if (translating) return;
    setTranslating(true);
    setTranslateError(null);
    const activeModelParam = activeAI ? `${activeAI.provider}:${activeAI.model}` : undefined;
    try {
      const res = await immersionApi.translateContent(contentId, sentence.sentence_index, "vi", activeModelParam);
      setTranslationVi(res.translated_text);
      setIsCachedTrans(res.cached);
    } catch (err: any) {
      console.error("Translation error:", err);
      const msg = err?.message || `Lỗi kết nối AI (${activeAI?.providerDisplay || "AI"} - ${activeAI?.model || "model"}) để dịch câu.`;
      setTranslateError(msg);
      notify.error(msg);
    } finally {
      setTranslating(false);
    }
  };

  const handleExplain = async () => {
    if (explaining) return;
    setExplaining(true);
    setExplainError(null);
    const activeModelParam = activeAI ? `${activeAI.provider}:${activeAI.model}` : undefined;
    try {
      const res = await immersionApi.explainSentence(contentId, sentence.sentence_index, activeModelParam);
      setExplanation(res);
    } catch (err: any) {
      console.error("Sentence explanation error:", err);
      const msg = err?.message || `Lỗi kết nối AI (${activeAI?.providerDisplay || "AI"} - ${activeAI?.model || "model"}) để phân tích câu.`;
      setExplainError(msg);
      notify.error(msg);
    } finally {
      setExplaining(false);
    }
  };

  const handleSaveSentence = async () => {
    if (isSavingSentence || isSentenceSaved || !sentence) return;
    setIsSavingSentence(true);
    try {
      await immersionApi.saveSentence({
        content_id: contentId,
        sentence_text: sentence.text,
        translation_text: translationVi || undefined,
        reason: "MEMORABLE",
      });
      setIsSentenceSaved(true);
      notify.success("Đã lưu câu vào Thư viện Tri thức!");
    } catch (err: any) {
      notify.error(err?.message || "Không thể lưu câu vào Thư viện");
    } finally {
      setIsSavingSentence(false);
    }
  };

  // Inline save without opening the detail modal (stops at the row level).
  const handleInlineSaveVocab = async (v: ContentVocabulary) => {
    if (savingVocabIds.has(v.id) || savedVocabIds.has(v.id)) return;
    setSavingVocabIds((prev) => new Set(prev).add(v.id));
    try {
      const res = await immersionApi.ingestLearningEvent({
        event_type: "WORD_SAVED",
        item_type: "VOCABULARY",
        term: v.surface_form,
        normalized_form: v.normalized_form,
        reading: v.reading,
        meaning: v.meaning_in_context,
        part_of_speech: v.part_of_speech,
        content_id: contentId,
        sentence_text: sentence?.text,
        learning_priority: v.learning_priority,
      });
      setSavedVocabIds((prev) => new Set(prev).add(v.id));
      notify.success(
        res.ai_enriched
          ? `Đã lưu "${v.surface_form}" kèm chi tiết AI vào Thư viện!`
          : `Đã lưu "${v.surface_form}" vào Thư viện!`
      );
    } catch (err: any) {
      notify.error(err?.message || "Không thể lưu từ vào Thư viện");
    } finally {
      setSavingVocabIds((prev) => {
        const next = new Set(prev);
        next.delete(v.id);
        return next;
      });
    }
  };

  const handleInlineSaveGrammar = async (g: ContentGrammar) => {
    if (savingGrammarIds.has(g.id) || savedGrammarIds.has(g.id)) return;
    setSavingGrammarIds((prev) => new Set(prev).add(g.id));
    try {
      const res = await immersionApi.ingestLearningEvent({
        event_type: "WORD_SAVED",
        item_type: "GRAMMAR",
        term: g.pattern,
        meaning: g.meaning_in_context,
        content_id: contentId,
        sentence_text: sentence?.text,
      });
      setSavedGrammarIds((prev) => new Set(prev).add(g.id));
      notify.success(
        res.ai_enriched
          ? `Đã lưu mẫu "${g.pattern}" kèm chi tiết AI vào Thư viện!`
          : `Đã lưu mẫu "${g.pattern}" vào Thư viện!`
      );
    } catch (err: any) {
      notify.error(err?.message || "Không thể lưu vào Thư viện");
    } finally {
      setSavingGrammarIds((prev) => {
        const next = new Set(prev);
        next.delete(g.id);
        return next;
      });
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-sumi-950/95 backdrop-blur-2xl border-l border-sumi-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-250">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 border-b border-sumi-800 bg-sumi-900/60">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-torii-500/20 text-torii-400 border border-torii-500/30">
            Câu #{sentence.sentence_index}
          </span>
          {(sentence.vocabularies?.length > 0 || sentence.grammars?.length > 0) && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30">
              {sentence.vocabularies?.length || 0} từ · {sentence.grammars?.length || 0} ngữ pháp
            </span>
          )}
          {activeAI && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {activeAI.providerDisplay} · {activeAI.modelName || activeAI.model}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-sumi-400 hover:text-sumi-100 hover:bg-sumi-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Japanese Sentence */}
        <div className="p-4 rounded-xl bg-sumi-900/80 border border-sumi-750">
          <span className="text-[10px] uppercase font-mono tracking-wider text-sumi-400 block mb-1.5">
            Nguyên văn tiếng Nhật:
          </span>
          <p className="text-lg text-sumi-100 dark:text-white font-serif leading-relaxed tracking-wide mb-3">
            {sentence.text}
          </p>
          <SentenceCheckBar contentId={contentId} sentenceIndex={sentence.sentence_index} />
        </div>

        {/* Vocabularies inside this sentence (right under the sentence: no scrolling needed) */}
        {sentence.vocabularies?.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-sumi-300 block mb-2">
              Từ vựng trong câu ({sentence.vocabularies.length})
            </span>
            <div className="space-y-2">
              {sentence.vocabularies.map((v) => {
                const isSaved = savedVocabIds.has(v.id);
                const isSaving = savingVocabIds.has(v.id);
                return (
                  <div
                    key={v.id}
                    onClick={() => onSelectVocab && onSelectVocab(v)}
                    className="p-2.5 rounded-lg bg-sumi-900/60 border border-sumi-800 hover:border-sky-500/40 hover:bg-sumi-850 cursor-pointer transition-all flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-bold text-white text-sm font-serif">{v.surface_form}</span>
                        {v.reading && (
                          <span className="text-[11px] text-sumi-400">({v.reading})</span>
                        )}
                      </div>
                      <span className="text-xs text-sky-300 line-clamp-1">{v.meaning_in_context}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInlineSaveVocab(v);
                        }}
                        disabled={isSaving || isSaved}
                        title={isSaved ? "Đã lưu vào Thư viện" : "Lưu từ này vào Thư viện"}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isSaved
                            ? "text-emerald-400 bg-emerald-500/10"
                            : "text-sumi-500 hover:text-sky-300 hover:bg-sky-500/10"
                        }`}
                      >
                        {isSaved ? <Check className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
                      </button>
                      <ChevronRight className="w-4 h-4 text-sumi-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Grammars inside this sentence */}
        {sentence.grammars?.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-sumi-300 block mb-2">
              Ngữ pháp trong câu ({sentence.grammars.length})
            </span>
            <div className="space-y-2">
              {sentence.grammars.map((g) => {
                const isSaved = savedGrammarIds.has(g.id);
                const isSaving = savingGrammarIds.has(g.id);
                return (
                  <div
                    key={g.id}
                    onClick={() => onSelectGrammar && onSelectGrammar(g)}
                    className="p-2.5 rounded-lg bg-sumi-900/60 border border-sumi-800 hover:border-pink-500/40 hover:bg-sumi-850 cursor-pointer transition-all flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-pink-300 text-sm">{g.pattern}</span>
                      <span className="text-xs text-sumi-300 line-clamp-1 block">{g.meaning_in_context}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInlineSaveGrammar(g);
                        }}
                        disabled={isSaving || isSaved}
                        title={isSaved ? "Đã lưu vào Thư viện" : "Lưu mẫu này vào Thư viện"}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isSaved
                            ? "text-emerald-400 bg-emerald-500/10"
                            : "text-sumi-500 hover:text-pink-300 hover:bg-pink-500/10"
                        }`}
                      >
                        {isSaved ? <Check className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
                      </button>
                      <ChevronRight className="w-4 h-4 text-sumi-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Expressions / collocations inside this sentence (tap to look up) */}
        {sentence.expressions?.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-sumi-300 block mb-2">
              Cụm từ trong câu ({sentence.expressions.length})
            </span>
            <div className="space-y-2">
              {sentence.expressions.map((e) => (
                <div
                  key={e.id}
                  onClick={() => onLookupExpression && onLookupExpression(e.expression, sentence.text)}
                  className="p-2.5 rounded-lg bg-sumi-900/60 border border-sumi-800 hover:border-emerald-500/40 hover:bg-sumi-850 cursor-pointer transition-all flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="font-bold text-white text-sm font-serif truncate">{e.expression}</span>
                      {e.reading && (
                        <span className="text-[11px] text-sumi-400">({e.reading})</span>
                      )}
                    </div>
                    <span className="text-xs text-emerald-300/90 line-clamp-1">{e.meaning_in_context}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-sumi-500 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Intelligence Actions */}
        <div className="grid grid-cols-2 gap-2">
          {onDecomposeSentence && (
            <button
              onClick={() => onDecomposeSentence(sentence.sentence_index)}
              className="col-span-2 p-2.5 rounded-xl bg-pink-100/70 hover:bg-pink-200/80 dark:bg-pink-950/30 dark:hover:bg-pink-900/40 text-pink-700 dark:text-pink-300 border border-pink-300/60 dark:border-pink-800/50 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Phân rã ngữ pháp</span>
            </button>
          )}

          <button
            onClick={handleSaveSentence}
            disabled={isSavingSentence || isSentenceSaved}
            className="col-span-2 p-2.5 rounded-xl bg-sky-100/70 hover:bg-sky-200/80 dark:bg-sky-950/30 dark:hover:bg-sky-900/40 disabled:bg-emerald-500/10 disabled:text-emerald-400 text-sky-800 dark:text-sky-300 border border-sky-300/60 dark:border-sky-800/50 disabled:border-emerald-500/30 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
          >
            {isSentenceSaved ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Đã lưu câu vào Thư viện</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>{isSavingSentence ? "Đang lưu câu..." : "Lưu câu này vào Thư viện"}</span>
              </>
            )}
          </button>
        </div>

        {/* Translation Section */}
        <div className="p-4 rounded-xl bg-sumi-900/40 border border-sumi-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-sumi-300 flex items-center gap-1.5">
              <Languages className="w-4 h-4 text-emerald-400" />
              Bản dịch Tiếng Việt
            </span>
            {isCachedTrans && (
              <span className="text-[10px] text-emerald-400/80 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Cached (0 token)
              </span>
            )}
          </div>

          {translateError && (
            <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                <span className="leading-snug flex-1">{translateError}</span>
              </div>
              <button
                onClick={handleTranslate}
                disabled={translating}
                className="self-end px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-500/20 hover:bg-rose-200 dark:hover:bg-rose-500/30 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
              >
                <RotateCw className="w-3 h-3" /> Thử lại
              </button>
            </div>
          )}

          {translationVi ? (
            <p className="text-sm text-emerald-800 dark:text-emerald-300/90 leading-relaxed font-medium bg-emerald-50/80 dark:bg-sumi-950/60 p-3 rounded-lg border border-emerald-200 dark:border-sumi-850">
              {translationVi}
            </p>
          ) : (
            <button
              onClick={handleTranslate}
              disabled={translating}
              className="w-full py-2.5 px-3 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/60 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{translating ? "Đang dịch câu..." : "Dịch câu này sang Tiếng Việt"}</span>
            </button>
          )}
        </div>

        {/* AI Deep Explanation Section */}
        <div className="p-4 rounded-xl bg-sumi-900/40 border border-sumi-800">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-sumi-300 flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-amber-600 dark:text-kintsugi-400" />
              Phân tích ngữ cảnh & Sắc thái
            </span>
            {explanation?.cached && (
              <span className="text-[10px] text-amber-700 dark:text-kintsugi-400/80 font-mono flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3 h-3" /> AI Cached
              </span>
            )}
          </div>

          {explainError && (
            <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                <span className="leading-snug flex-1">{explainError}</span>
              </div>
              <button
                onClick={handleExplain}
                disabled={explaining}
                className="self-end px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-500/20 hover:bg-rose-200 dark:hover:bg-rose-500/30 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
              >
                <RotateCw className="w-3 h-3" /> Thử lại
              </button>
            </div>
          )}

          {explanation ? (
            <div className="space-y-3 text-xs bg-amber-50/70 dark:bg-sumi-950/60 p-3.5 rounded-lg border border-amber-200 dark:border-sumi-850 shadow-sm">
              <div>
                <span className="text-[10px] text-sumi-500 font-mono block">Dịch sát nghĩa (Literal):</span>
                <p className="text-sumi-700 dark:text-sumi-300 italic">{explanation.literal_translation}</p>
              </div>

              <div>
                <span className="text-[10px] text-sumi-500 font-mono block">Nghĩa tự nhiên (Natural):</span>
                <p className="text-emerald-800 dark:text-emerald-300 font-medium">{explanation.natural_meaning}</p>
              </div>

              <div>
                <span className="text-[10px] text-sumi-500 font-mono block">Sắc thái ngữ cảnh (Nuance):</span>
                <div className="text-amber-900 dark:text-amber-200/90 font-medium">
                  <MarkdownRenderer content={explanation.context_nuance} />
                </div>
              </div>

              {explanation.key_grammar_notes?.length > 0 && (
                <div>
                  <span className="text-[10px] text-sumi-500 font-mono block mb-1">Điểm ngữ pháp cần nhớ:</span>
                  <ul className="space-y-1 text-sumi-700 dark:text-sumi-300 list-disc list-inside">
                    {explanation.key_grammar_notes.map((note, idx) => (
                      <li key={idx} className="leading-snug">
                        <MarkdownRenderer content={note} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleExplain}
              disabled={explaining}
              className="w-full py-2.5 px-3 rounded-lg bg-amber-100 dark:bg-amber-950/40 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{explaining ? "AI đang phân tích..." : "AI giải thích cấu trúc & sắc thái câu"}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
