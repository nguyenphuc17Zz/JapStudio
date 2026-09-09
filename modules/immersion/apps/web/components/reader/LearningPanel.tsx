"use client";

import React, { useState } from "react";
import {
  ReaderContent,
  ContentVocabulary,
  ContentGrammar,
  AnnotatedSentence,
  AICompanionQueryResponse,
  ActiveAIModel,
} from "@/lib/types";
import { immersionApi } from "@/lib/api";
import {
  Sparkles,
  BookA,
  Layers,
  ChevronRight,
  ChevronLeft,
  Bot,
  Send,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Zap,
  X,
  Search,
} from "lucide-react";

import { notify, MarkdownRenderer } from "@/components/ui";

interface LearningPanelProps {
  content: ReaderContent;
  activeSentence?: AnnotatedSentence | null;
  onClearActiveSentence?: () => void;
  onSelectVocab: (vocab: ContentVocabulary) => void;
  onSelectGrammar: (grammar: ContentGrammar) => void;
  isOpen: boolean;
  onToggle: () => void;
  activeAI?: ActiveAIModel | null;
  onRefetch?: () => Promise<void>;
  isRefetching?: boolean;
  onEnrich?: () => Promise<void>;
  isEnriching?: boolean;
  enrichError?: string | null;
  onFindExpressions?: () => Promise<void>;
  isFindingExpressions?: boolean;
}

export const LearningPanel: React.FC<LearningPanelProps> = ({
  content,
  activeSentence,
  onClearActiveSentence,
  onSelectVocab,
  onSelectGrammar,
  isOpen,
  onToggle,
  activeAI,
  onRefetch,
  isRefetching,
  onEnrich,
  isEnriching,
  enrichError,
  onFindExpressions,
  isFindingExpressions,
}) => {
  const [activeTab, setActiveTab] = useState<"summary" | "vocab" | "grammar" | "companion">("summary");

  // AI Companion state
  const [customQuestion, setCustomQuestion] = useState<string>("");
  const [querying, setQuerying] = useState<boolean>(false);
  const [depth, setDepth] = useState<"quick" | "standard" | "deep">("standard");
  const [companionAnswer, setCompanionAnswer] = useState<AICompanionQueryResponse | null>(null);
  const [companionError, setCompanionError] = useState<string | null>(null);

  // AI Summarize state (Summary tab)
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [aiSummary, setAiSummary] = useState<AICompanionQueryResponse | null>(null);
  const [summaryDepth, setSummaryDepth] = useState<"quick" | "standard" | "deep">("standard");
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Filter for Vocab & Grammar lists
  const [vocabSearch, setVocabSearch] = useState<string>("");
  const [grammarSearch, setGrammarSearch] = useState<string>("");

  const handleAskCompanion = async (type: string, custom?: string) => {
    if (querying) return;
    setQuerying(true);
    setCompanionError(null);
    const activeModelParam = activeAI ? `${activeAI.provider}:${activeAI.model}` : undefined;
    try {
      const res = await immersionApi.askAICompanion(content.content_id, {
        sentence_index: activeSentence?.sentence_index,
        question_type: type,
        custom_query: custom || customQuestion,
        depth,
        language: "vi",
        model_provider: activeModelParam,
      });
      setCompanionAnswer(res);
      if (custom) setCustomQuestion("");
    } catch (err: any) {
      console.error("AI Companion query error:", err);
      const msg = err?.message || `Không thể kết nối AI (${activeAI?.providerDisplay || "AI"} - ${activeAI?.model || "model"}). Vui lòng đổi model trên Header hoặc thử lại.`;
      setCompanionError(msg);
      notify.error(msg);
    } finally {
      setQuerying(false);
    }
  };

  const handleAISummarize = async () => {
    if (isSummarizing) return;
    setIsSummarizing(true);
    setSummaryError(null);
    const activeModelParam = activeAI ? `${activeAI.provider}:${activeAI.model}` : undefined;
    try {
      const res = await immersionApi.askAICompanion(content.content_id, {
        question_type: "SUMMARIZE",
        depth: summaryDepth,
        language: "vi",
        model_provider: activeModelParam,
      });
      setAiSummary(res);
    } catch (err: any) {
      console.error("AI Summarize error:", err);
      const msg = err?.message || `Không thể kết nối AI (${activeAI?.providerDisplay || "AI"} - ${activeAI?.model || "model"}) để tạo tóm tắt.`;
      setSummaryError(msg);
      notify.error(msg);
    } finally {
      setIsSummarizing(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-4 top-20 z-30 p-2.5 rounded-xl bg-sumi-900/90 hover:bg-sumi-850 text-sumi-300 hover:text-white border border-sumi-750 shadow-2xl backdrop-blur-md flex items-center gap-2 transition-all hover:scale-105"
        title="Mở bảng hỗ trợ học"
      >
        <ChevronLeft className="w-4 h-4 text-torii-400" />
        <span className="text-xs font-semibold">Góc học tập</span>
        {activeSentence && (
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        )}
      </button>
    );
  }

  const filteredVocab = (content.all_vocabularies || []).filter(
    (v) =>
      v.surface_form.toLowerCase().includes(vocabSearch.toLowerCase()) ||
      (v.reading && v.reading.toLowerCase().includes(vocabSearch.toLowerCase())) ||
      v.meaning_in_context.toLowerCase().includes(vocabSearch.toLowerCase())
  );

  const filteredGrammar = (content.all_grammars || []).filter(
    (g) =>
      g.pattern.toLowerCase().includes(grammarSearch.toLowerCase()) ||
      g.meaning_in_context.toLowerCase().includes(grammarSearch.toLowerCase())
  );

  // Background AI enrichment indicator (auto-fires on article open).
  const enrichingBadge = isEnriching ? (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-semibold">
      <RotateCw className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
      <span>AI đang bổ sung — xong sẽ tự hiện.</span>
    </div>
  ) : null;

  return (
    <aside className="w-80 lg:w-96 flex-shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] flex flex-col bg-sumi-950/95 backdrop-blur-xl border-l border-sumi-800/80 z-20 not-prose font-sans">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-sumi-800/80 bg-sumi-950/70 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-kintsugi-500/20 text-kintsugi-400 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-sumi-200 truncate">
            Góc học tập thông minh
          </span>
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-sumi-400 hover:text-white hover:bg-sumi-800 transition-colors"
          title="Thu gọn bảng"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="grid grid-cols-4 border-b border-sumi-800/60 bg-sumi-900/50 px-1 pt-1 text-[11px] font-medium flex-shrink-0">
        <button
          onClick={() => setActiveTab("summary")}
          className={`py-2 px-1 border-b-2 text-center transition-colors truncate ${
            activeTab === "summary"
              ? "text-torii-400 border-torii-500 font-bold"
              : "text-sumi-400 border-transparent hover:text-sumi-200"
          }`}
        >
          Tóm tắt
        </button>
        <button
          onClick={() => setActiveTab("vocab")}
          className={`py-2 px-1 border-b-2 text-center transition-colors truncate ${
            activeTab === "vocab"
              ? "text-sky-400 border-sky-500 font-bold"
              : "text-sumi-400 border-transparent hover:text-sumi-200"
          }`}
        >
          Từ vựng ({content.all_vocabularies?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("grammar")}
          className={`py-2 px-1 border-b-2 text-center transition-colors truncate ${
            activeTab === "grammar"
              ? "text-pink-400 border-pink-500 font-bold"
              : "text-sumi-400 border-transparent hover:text-sumi-200"
          }`}
        >
          Ngữ pháp ({content.all_grammars?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("companion")}
          className={`py-2 px-1 border-b-2 text-center transition-colors flex items-center justify-center gap-1 truncate ${
            activeTab === "companion"
              ? "text-amber-400 border-amber-500 font-bold"
              : "text-sumi-400 border-transparent hover:text-sumi-200"
          }`}
        >
          <Bot className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">Trợ lý AI</span>
        </button>
      </div>

      {/* Tab Body with slim scrollbar */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* SUMMARY TAB */}
        {activeTab === "summary" && (
          <div className="space-y-4 text-xs">
            {enrichingBadge}
            {content.summaries?.micro && (
              <div className="p-3.5 rounded-xl bg-white dark:bg-sumi-900/70 border border-slate-200 dark:border-sumi-800 space-y-1 shadow-sm">
                <span className="text-[10px] uppercase font-mono text-torii-600 dark:text-torii-400 font-bold block">
                  1-Dòng tóm tắt (Micro):
                </span>
                <div className="text-slate-900 dark:text-white font-semibold leading-relaxed">
                  <MarkdownRenderer content={content.summaries.micro} />
                </div>
              </div>
            )}

            {content.summaries?.short && (
              <div className="p-3.5 rounded-xl bg-white dark:bg-sumi-900/70 border border-slate-200 dark:border-sumi-800 space-y-1 shadow-sm">
                <span className="text-[10px] uppercase font-mono text-slate-500 dark:text-sumi-400 font-bold block">
                  Ý chính (Short summary):
                </span>
                <div className="text-slate-800 dark:text-sumi-300 leading-relaxed font-medium">
                  <MarkdownRenderer content={content.summaries.short} />
                </div>
              </div>
            )}

            {content.summaries?.detailed && content.summaries.detailed.length > 0 && (
              <div className="p-3.5 rounded-xl bg-white dark:bg-sumi-900/70 border border-slate-200 dark:border-sumi-800 space-y-2 shadow-sm">
                <span className="text-[10px] uppercase font-mono text-slate-500 dark:text-sumi-400 font-bold block">
                  Các điểm chính:
                </span>
                <ul className="space-y-1.5 list-disc list-inside text-slate-800 dark:text-sumi-300 leading-relaxed font-medium">
                  {content.summaries.detailed.map((bullet, idx) => (
                    <li key={idx}><MarkdownRenderer content={bullet} /></li>
                  ))}
                </ul>
              </div>
            )}

            {content.difficulty_reasons?.length > 0 && (
              <div className="p-3.5 rounded-xl bg-white dark:bg-sumi-900/40 border border-slate-200 dark:border-sumi-850 space-y-1 shadow-sm">
                <span className="text-[10px] uppercase font-mono text-slate-500 dark:text-sumi-500 font-bold block">
                  Độ khó ước tính: JLPT {content.estimated_jlpt}
                </span>
                <ul className="space-y-1 text-slate-700 dark:text-sumi-400 list-disc list-inside text-[11px] font-medium">
                  {content.difficulty_reasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── AI On-demand Summary ───────────────────────────────────── */}
            <div className="pt-1">
              <div className="border-t border-sumi-800/60 pt-3">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] uppercase font-mono text-amber-700 dark:text-kintsugi-400 font-bold flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" /> Phân tích & tóm tắt AI:
                    </span>
                    {activeAI && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-mono font-medium">
                        {activeAI.modelName || activeAI.model}
                      </span>
                    )}
                  </div>
                  {/* Depth selector */}
                  <div className="flex items-center p-0.5 rounded-lg bg-sumi-900 border border-sumi-800">
                    {(["quick", "standard", "deep"] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setSummaryDepth(d)}
                        className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                          summaryDepth === d ? "bg-amber-500 text-slate-950 font-bold" : "text-sumi-600 dark:text-sumi-400 hover:text-sumi-900 dark:hover:text-white"
                        }`}
                      >
                        {d === "quick" ? "Nhanh" : d === "standard" ? "Chuẩn" : "Sâu"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Loading state */}
                {isSummarizing && (
                  <div className="p-4 rounded-xl bg-sumi-900/40 border border-sumi-800 text-center text-xs text-sumi-400 animate-pulse">
                    <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600 dark:text-kintsugi-400" />
                    AI đang đọc và tổng hợp nội dung bài viết...
                  </div>
                )}

                {/* Error state */}
                {summaryError && !isSummarizing && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-800 dark:text-rose-300 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                      <span>{summaryError}</span>
                    </div>
                    <button
                      onClick={handleAISummarize}
                      className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-500/20 hover:bg-rose-200 dark:hover:bg-rose-500/30 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <RotateCw className="w-3 h-3" /> Thử lại
                    </button>
                  </div>
                )}

                {/* Result */}
                {aiSummary && !isSummarizing && (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 space-y-2.5 animate-in fade-in duration-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-950 dark:text-amber-300 text-xs font-mono">
                        {aiSummary.answer_title}
                      </span>
                      <span className="text-[10px] text-amber-800 dark:text-amber-400 font-mono flex items-center gap-1 font-medium">
                        {aiSummary.cached && <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                        {aiSummary.cached ? "Cached" : (aiSummary.model_name || aiSummary.model_provider || "AI")}
                      </span>
                    </div>

                    <div className="text-slate-900 dark:text-zinc-100 leading-relaxed text-xs font-medium">
                      <MarkdownRenderer content={aiSummary.answer_markdown} />
                    </div>

                    {aiSummary.key_takeaways?.length > 0 && (
                      <div className="pt-2 border-t border-amber-200 dark:border-amber-500/20">
                        <span className="text-[10px] text-amber-950 dark:text-amber-300 uppercase font-mono font-bold block mb-1">
                          📚 Điểm ngôn ngữ then chốt:
                        </span>
                        <ul className="space-y-1 list-disc list-inside text-slate-800 dark:text-zinc-200 text-[11px] font-medium">
                          {aiSummary.key_takeaways.map((point, idx) => (
                            <li key={idx}><MarkdownRenderer content={point} /></li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="pt-1 flex items-center justify-between text-[10px]">
                      <button
                        onClick={() => setAiSummary(null)}
                        className="text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                      >
                        Đóng kết quả
                      </button>
                      <button
                        onClick={handleAISummarize}
                        className="text-amber-800 hover:text-amber-950 dark:text-amber-400 dark:hover:text-amber-300 flex items-center gap-1 font-semibold transition-colors"
                      >
                        <RotateCw className="w-3 h-3" /> Tạo lại
                      </button>
                    </div>
                  </div>
                )}

                {/* Trigger button (shown when no result yet) */}
                {!aiSummary && !isSummarizing && !summaryError && (
                  <button
                    onClick={handleAISummarize}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/40 hover:bg-amber-200 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-500/30 hover:border-amber-400 dark:hover:border-amber-400/50 text-amber-900 dark:text-amber-300 text-xs font-semibold transition-all group shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5 group-hover:scale-110 transition-transform text-amber-700 dark:text-amber-400" />
                    <span>Nhờ AI tóm tắt bài viết này</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VOCABULARY TAB */}
        {activeTab === "vocab" && (
          <div className="space-y-3">
            {enrichingBadge}
            {/* Search filter if items exist */}
            {(content.all_vocabularies?.length || 0) > 4 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-sumi-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={vocabSearch}
                  onChange={(e) => setVocabSearch(e.target.value)}
                  placeholder="Tìm từ vựng hoặc nghĩa..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-sumi-900 border border-slate-300 dark:border-sumi-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-sumi-500 outline-none focus:border-sky-500 font-medium"
                />
              </div>
            )}

            {/* Empty state with AI Enrichment trigger */}
            {(!content.all_vocabularies || content.all_vocabularies.length === 0) && (
              <div className="p-4 rounded-2xl bg-white dark:bg-sumi-900/50 border border-slate-200 dark:border-sumi-800 text-center space-y-3 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
                  <BookA className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Chưa có dữ liệu từ vựng
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-sumi-400 leading-relaxed font-medium">
                    Bài viết chưa được trích xuất từ vựng theo ngữ cảnh. Bấm nút bên dưới để AI phân tích bài đọc.
                  </p>
                </div>
                {enrichError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2 text-left">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                    <span className="leading-snug">{enrichError}</span>
                  </div>
                )}
                {(onEnrich || onRefetch) && (
                  <button
                    onClick={onEnrich || onRefetch}
                    disabled={isEnriching || isRefetching}
                    className="w-full px-3 py-2 rounded-xl bg-sky-100 dark:bg-sky-500/20 hover:bg-sky-200 dark:hover:bg-sky-500/30 border border-sky-300 dark:border-sky-500/40 text-sky-800 dark:text-sky-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-sm"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${(isEnriching || isRefetching) ? "animate-spin" : ""}`} />
                    <span>{isEnriching ? "Đang trích xuất từ vựng bằng AI..." : "Trích xuất từ vựng bằng AI"}</span>
                  </button>
                )}
                {onFindExpressions && (
                  <button
                    onClick={onFindExpressions}
                    disabled={isFindingExpressions || isEnriching}
                    className="w-full px-3 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-sm"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isFindingExpressions ? "animate-spin" : ""}`} />
                    <span>{isFindingExpressions ? "Đang tìm cụm từ..." : "Tìm cụm từ trong bài"}</span>
                  </button>
                )}
              </div>
            )}

            {/* Header action when vocabularies already exist */}
            {content.all_vocabularies && content.all_vocabularies.length > 0 && onEnrich && (
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-mono text-sumi-600 dark:text-sumi-400">
                  {content.all_vocabularies.length} từ vựng trọng tâm
                </span>
                <div className="flex items-center gap-2">
                  {onFindExpressions && (
                    <button
                      onClick={onFindExpressions}
                      disabled={isFindingExpressions || isEnriching}
                      className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1 transition-colors disabled:opacity-50"
                      title="Tìm cụm từ trong bài và lưu vào Thư viện"
                    >
                      <RotateCw className={`w-3 h-3 ${isFindingExpressions ? "animate-spin" : ""}`} />
                      <span>{isFindingExpressions ? "Đang tìm cụm..." : "Tìm cụm từ"}</span>
                    </button>
                  )}
                  <button
                    onClick={onEnrich}
                    disabled={isEnriching}
                    className="text-[11px] font-medium text-sky-700 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 flex items-center gap-1 transition-colors disabled:opacity-50"
                    title="Phân tích lại toàn bài bằng AI"
                  >
                    <RotateCw className={`w-3 h-3 ${isEnriching ? "animate-spin" : ""}`} />
                    <span>{isEnriching ? "Đang quét AI..." : "Phân tích lại AI"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Vocab list */}
            <div className="space-y-2">
              {filteredVocab.map((v) => {
                const exprCount = (content.all_expressions || []).filter((e) => {
                  const expr = (e.expression || "").replace(/\s+/g, "");
                  const forms = [v.surface_form, v.normalized_form]
                    .filter(Boolean)
                    .map((f) => (f || "").replace(/\s+/g, ""));
                  return forms.some((f) => f && (expr.includes(f) || f.includes(expr)));
                }).length;
                return (
                <div
                  key={v.id}
                  onClick={() => onSelectVocab(v)}
                  className="p-3 rounded-xl bg-white dark:bg-sumi-900/60 border border-slate-200 dark:border-sumi-800 hover:border-sky-500/50 hover:bg-slate-50 dark:hover:bg-sumi-850 cursor-pointer transition-all flex items-start justify-between gap-2.5 group shadow-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5 mb-0.5">
                      <span className="font-bold text-slate-900 dark:text-white text-sm font-serif group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors">
                        {v.surface_form}
                      </span>
                      {v.reading && (
                        <span className="text-[11px] text-slate-600 dark:text-sumi-400 font-mono">
                          【{v.reading}】
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-sky-800 dark:text-sky-200/90 line-clamp-1 leading-normal font-semibold">
                      {v.meaning_in_context}
                    </p>
                    {exprCount > 0 && (
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400/90 mt-0.5 font-medium">
                        📎 {exprCount} cụm trong bài — bấm để xem
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-[10px] text-amber-500 dark:text-amber-400 font-mono">
                      {"★".repeat(v.importance || 3)}
                    </span>
                    <span className="text-[10px] text-sumi-500 font-mono mt-1">
                      Mức độ: {v.difficulty || 3}/10
                    </span>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* GRAMMAR TAB */}
        {activeTab === "grammar" && (
          <div className="space-y-3">
            {enrichingBadge}
            {/* Search filter if items exist */}
            {(content.all_grammars?.length || 0) > 4 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-sumi-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={grammarSearch}
                  onChange={(e) => setGrammarSearch(e.target.value)}
                  placeholder="Tìm cấu trúc ngữ pháp..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-sumi-900 border border-slate-300 dark:border-sumi-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-sumi-500 outline-none focus:border-pink-500 font-medium"
                />
              </div>
            )}

            {/* Empty state with AI Enrichment trigger */}
            {(!content.all_grammars || content.all_grammars.length === 0) && (
              <div className="p-4 rounded-2xl bg-white dark:bg-sumi-900/50 border border-slate-200 dark:border-sumi-800 text-center space-y-3 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center mx-auto">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Chưa có dữ liệu ngữ pháp
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-sumi-400 leading-relaxed font-medium">
                    Bấm nút bên dưới để AI quét toàn bài và trích xuất các cấu trúc ngữ pháp trọng tâm.
                  </p>
                </div>
                {enrichError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2 text-left">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                    <span className="leading-snug">{enrichError}</span>
                  </div>
                )}
                {(onEnrich || onRefetch) && (
                  <button
                    onClick={onEnrich || onRefetch}
                    disabled={isEnriching || isRefetching}
                    className="w-full px-3 py-2 rounded-xl bg-pink-100 dark:bg-pink-500/20 hover:bg-pink-200 dark:hover:bg-pink-500/30 border border-pink-300 dark:border-pink-500/40 text-pink-800 dark:text-pink-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-sm"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${(isEnriching || isRefetching) ? "animate-spin" : ""}`} />
                    <span>{isEnriching ? "Đang quét ngữ pháp bằng AI..." : "Quét ngữ pháp bằng AI"}</span>
                  </button>
                )}
              </div>
            )}

            {/* Header action when grammars already exist */}
            {content.all_grammars && content.all_grammars.length > 0 && onEnrich && (
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-mono text-sumi-600 dark:text-sumi-400">
                  {content.all_grammars.length} mẫu ngữ pháp
                </span>
                <button
                  onClick={onEnrich}
                  disabled={isEnriching}
                  className="text-[11px] font-medium text-pink-700 dark:text-pink-400 hover:text-pink-800 dark:hover:text-pink-300 flex items-center gap-1 transition-colors disabled:opacity-50"
                  title="Phân tích lại toàn bài bằng AI"
                >
                  <RotateCw className={`w-3 h-3 ${isEnriching ? "animate-spin" : ""}`} />
                  <span>{isEnriching ? "Đang quét AI..." : "Phân tích lại AI"}</span>
                </button>
              </div>
            )}

            {/* Grammar list */}
            <div className="space-y-2">
              {filteredGrammar.map((g) => (
                <div
                  key={g.id}
                  onClick={() => onSelectGrammar(g)}
                  className="p-3 rounded-xl bg-white dark:bg-sumi-900/60 border border-slate-200 dark:border-sumi-800 hover:border-pink-500/50 hover:bg-slate-50 dark:hover:bg-sumi-850 cursor-pointer transition-all group shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-pink-700 dark:text-pink-300 text-sm font-mono group-hover:text-pink-800 dark:group-hover:text-pink-200 transition-colors">
                      {g.pattern}
                    </span>
                    {g.category && (
                      <span className="text-[10px] text-slate-700 dark:text-sumi-400 capitalize bg-slate-100 dark:bg-sumi-800 px-1.5 py-0.5 rounded font-semibold border border-slate-200 dark:border-sumi-700/60">
                        {g.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-800 dark:text-sumi-300 line-clamp-2 leading-relaxed font-medium">
                    {g.meaning_in_context}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI COMPANION TAB */}
        {activeTab === "companion" && (
          <div className="space-y-4 text-xs">
            {/* Active Context Banner */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-sumi-900/80 border border-slate-200 dark:border-sumi-800 relative shadow-sm">
              <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] uppercase font-mono text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5" />
                    {activeSentence ? `Ngữ cảnh: Câu #${activeSentence.sentence_index}` : "Ngữ cảnh: Toàn bộ bài đọc"}
                  </span>
                  {activeAI && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 font-mono font-medium">
                      {activeAI.model}
                    </span>
                  )}
                </div>
                {activeSentence && onClearActiveSentence && (
                  <button
                    onClick={onClearActiveSentence}
                    className="text-[10px] text-slate-500 hover:text-slate-900 dark:text-sumi-400 dark:hover:text-white flex items-center gap-0.5 hover:underline font-medium"
                    title="Bỏ chọn câu để hỏi về toàn bài"
                  >
                    <X className="w-3 h-3" />
                    <span>Toàn bài</span>
                  </button>
                )}
              </div>

              <p className="text-slate-900 dark:text-white font-serif line-clamp-2 leading-relaxed font-semibold">
                {activeSentence ? activeSentence.text : content.title}
              </p>

              {!activeSentence && (
                <p className="text-[11px] text-slate-600 dark:text-sumi-400 mt-1 italic font-medium">
                  Mẹo: Nhấn vào bất kỳ câu nào trong bài đọc để hỏi sâu về ngữ pháp hoặc sắc thái câu đó.
                </p>
              )}
            </div>

            {/* Depth Selector */}
            <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-sumi-400 font-medium">
              <span>Độ chi tiết câu trả lời:</span>
              <div className="flex items-center p-0.5 rounded-lg bg-white dark:bg-sumi-900 border border-slate-300 dark:border-sumi-800">
                <button
                  onClick={() => setDepth("quick")}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                    depth === "quick" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-600 dark:text-sumi-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Nhanh
                </button>
                <button
                  onClick={() => setDepth("standard")}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                    depth === "standard" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-600 dark:text-sumi-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Chuẩn
                </button>
                <button
                  onClick={() => setDepth("deep")}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                    depth === "deep" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-600 dark:text-sumi-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Chuyên sâu
                </button>
              </div>
            </div>

            {/* Quick Action Chips */}
            <div>
              <span className="text-slate-600 dark:text-sumi-400 text-[11px] font-semibold block mb-2">
                {activeSentence ? "Hỏi nhanh về câu đang chọn:" : "Hỏi nhanh về bài viết:"}
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {activeSentence ? (
                  <>
                    <button
                      onClick={() => handleAskCompanion("WHAT_MEANS")}
                      disabled={querying}
                      className="p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 hover:border-amber-400 text-left text-[11px] text-slate-800 hover:text-slate-950 dark:bg-sumi-900/80 dark:hover:bg-sumi-850 dark:border-sumi-800 dark:hover:border-amber-500/40 dark:text-sumi-200 dark:hover:text-white transition-all disabled:opacity-50 font-medium shadow-sm"
                    >
                      📖 Nghĩa câu này là gì?
                    </button>
                    <button
                      onClick={() => handleAskCompanion("WHY_GRAMMAR")}
                      disabled={querying}
                      className="p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 hover:border-amber-400 text-left text-[11px] text-slate-800 hover:text-slate-950 dark:bg-sumi-900/80 dark:hover:bg-sumi-850 dark:border-sumi-800 dark:hover:border-amber-500/40 dark:text-sumi-200 dark:hover:text-white transition-all disabled:opacity-50 font-medium shadow-sm"
                    >
                      💡 Phân tích ngữ pháp
                    </button>
                    <button
                      onClick={() => handleAskCompanion("SIMPLIFY")}
                      disabled={querying}
                      className="p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 hover:border-amber-400 text-left text-[11px] text-slate-800 hover:text-slate-950 dark:bg-sumi-900/80 dark:hover:bg-sumi-850 dark:border-sumi-800 dark:hover:border-amber-500/40 dark:text-sumi-200 dark:hover:text-white transition-all disabled:opacity-50 font-medium shadow-sm"
                    >
                      ✨ Đơn giản hóa câu
                    </button>
                    <button
                      onClick={() => handleAskCompanion("EXPLAIN_NUANCE")}
                      disabled={querying}
                      className="p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 hover:border-amber-400 text-left text-[11px] text-slate-800 hover:text-slate-950 dark:bg-sumi-900/80 dark:hover:bg-sumi-850 dark:border-sumi-800 dark:hover:border-amber-500/40 dark:text-sumi-200 dark:hover:text-white transition-all disabled:opacity-50 font-medium shadow-sm"
                    >
                      🎭 Phân tích sắc thái
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleAskCompanion("SUMMARIZE")}
                      disabled={querying}
                      className="p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 hover:border-amber-400 text-left text-[11px] text-slate-800 hover:text-slate-950 dark:bg-sumi-900/80 dark:hover:bg-sumi-850 dark:border-sumi-800 dark:hover:border-amber-500/40 dark:text-sumi-200 dark:hover:text-white transition-all disabled:opacity-50 font-medium shadow-sm"
                    >
                      📑 Tóm tắt nội dung chính
                    </button>
                    <button
                      onClick={() => handleAskCompanion("WHY_GRAMMAR")}
                      disabled={querying}
                      className="p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 hover:border-amber-400 text-left text-[11px] text-slate-800 hover:text-slate-950 dark:bg-sumi-900/80 dark:hover:bg-sumi-850 dark:border-sumi-800 dark:hover:border-amber-500/40 dark:text-sumi-200 dark:hover:text-white transition-all disabled:opacity-50 font-medium shadow-sm"
                    >
                      💡 Điểm ngữ pháp nổi bật
                    </button>
                    <button
                      onClick={() => handleAskCompanion("WHAT_MEANS")}
                      disabled={querying}
                      className="p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 hover:border-amber-400 text-left text-[11px] text-slate-800 hover:text-slate-950 dark:bg-sumi-900/80 dark:hover:bg-sumi-850 dark:border-sumi-800 dark:hover:border-amber-500/40 dark:text-sumi-200 dark:hover:text-white transition-all disabled:opacity-50 font-medium shadow-sm"
                    >
                      🎯 Từ vựng khó & lưu ý
                    </button>
                    <button
                      onClick={() => handleAskCompanion("EXPLAIN_NUANCE")}
                      disabled={querying}
                      className="p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 hover:border-amber-400 text-left text-[11px] text-slate-800 hover:text-slate-950 dark:bg-sumi-900/80 dark:hover:bg-sumi-850 dark:border-sumi-800 dark:hover:border-amber-500/40 dark:text-sumi-200 dark:hover:text-white transition-all disabled:opacity-50 font-medium shadow-sm"
                    >
                      🎭 Phong cách & văn phong
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Custom Query Input */}
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && customQuestion.trim() && handleAskCompanion("CUSTOM", customQuestion)}
                placeholder={activeSentence ? "Đặt câu hỏi về câu đang chọn..." : "Đặt câu hỏi về bài đọc..."}
                className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-sumi-900 border border-slate-300 dark:border-sumi-800 focus:border-amber-500 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-sumi-500 outline-none font-medium"
              />
              <button
                onClick={() => customQuestion.trim() && handleAskCompanion("CUSTOM", customQuestion)}
                disabled={querying || !customQuestion.trim()}
                className="p-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 transition-all shadow-sm"
                title="Gửi câu hỏi"
              >
                {querying ? <RotateCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>

            {/* Querying Indicator */}
            {querying && (
              <div className="p-4 rounded-xl bg-sumi-900/40 border border-sumi-800 text-center text-xs text-sumi-600 dark:text-sumi-400 animate-pulse">
                <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600 dark:text-amber-400" />
                Trợ lý AI đang phân tích ngữ cảnh bài đọc...
              </div>
            )}

            {/* Error Message */}
            {companionError && !querying && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-800 dark:text-rose-200 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                  <span>{companionError}</span>
                </div>
                <button
                  onClick={() => handleAskCompanion("WHAT_MEANS")}
                  className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-500/20 hover:bg-rose-200 dark:hover:bg-rose-500/30 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 text-[11px] font-semibold flex items-center gap-1 shadow-sm"
                >
                  <RotateCw className="w-3 h-3" /> Thử lại câu hỏi
                </button>
              </div>
            )}

            {/* AI Companion Answer View */}
            {companionAnswer && !querying && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-sumi-900/80 border border-amber-200 dark:border-amber-500/40 space-y-3 animate-in fade-in duration-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 dark:text-amber-300 text-xs font-mono">
                    {companionAnswer.answer_title}
                  </span>
                  {companionAnswer.cached ? (
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Cached (0 token)
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-800 dark:text-amber-400/80 font-mono font-medium">
                      {companionAnswer.model_name || companionAnswer.model_provider || "AI"}
                    </span>
                  )}
                </div>

                <div className="text-slate-800 dark:text-sumi-200 leading-relaxed text-xs font-medium">
                  <MarkdownRenderer content={companionAnswer.answer_markdown} />
                </div>

                {companionAnswer.key_takeaways?.length > 0 && (
                  <div className="pt-2 border-t border-amber-200 dark:border-sumi-800/80">
                    <span className="text-[10px] text-amber-900 dark:text-sumi-400 uppercase font-mono font-bold block mb-1">
                      Điểm cốt lõi cần nhớ:
                    </span>
                    <ul className="space-y-1 list-disc list-inside text-slate-800 dark:text-sumi-300 text-[11px] font-medium">
                      {companionAnswer.key_takeaways.map((point, idx) => (
                        <li key={idx}><MarkdownRenderer content={point} /></li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-1 flex items-center justify-between text-[10px]">
                  <button
                    onClick={() => setCompanionAnswer(null)}
                    className="text-sumi-500 hover:text-sumi-800 dark:hover:text-sumi-300 transition-colors"
                  >
                    Xóa câu trả lời
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

