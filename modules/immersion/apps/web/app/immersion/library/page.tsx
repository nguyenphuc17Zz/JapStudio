"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Library,
  BookOpen,
  Search,
  Filter,
  Sparkles,
  ChevronRight,
  ArrowRight,
  ExternalLink,
  Trash2,
  CheckCircle2,
  EyeOff,
  Flame,
  Clock,
  Layers,
  Link2,
  Repeat,
  Quote,
  X,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  UserVocabularyItem,
  VocabularyDetailItem,
  UserExpressionItem,
  UserGrammarItem,
  UserSavedSentenceItem,
  FuriganaToken,
} from "@/lib/types";
import { notify, confirmDialog } from "@/components/ui";
import { ExpressionDetailModal } from "@/components/reader/ExpressionDetailModal";

const PAGE_SIZE = 24;

function useDebouncedValue<T>(value: T, delay: number = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function PersonalLibraryPage() {
  const [activeTab, setActiveTab] = useState<"vocab" | "expressions" | "grammar" | "sentences">("vocab");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vocabulary Tab State
  const [vocabList, setVocabList] = useState<UserVocabularyItem[]>([]);
  const [vocabTotal, setVocabTotal] = useState(0);
  const [vocabStatusFilter, setVocabStatusFilter] = useState("ALL");
  const [vocabSearch, setVocabSearch] = useState("");
  const vocabSearchDebounced = useDebouncedValue(vocabSearch);
  const [vocabPage, setVocabPage] = useState(1);
  const [vocabHasMore, setVocabHasMore] = useState(false);
  const [selectedVocabDetail, setSelectedVocabDetail] = useState<VocabularyDetailItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);

  // Expressions Tab State
  const [expressions, setExpressions] = useState<UserExpressionItem[]>([]);
  const [expressionsTotal, setExpressionsTotal] = useState(0);
  const [exprSearch, setExprSearch] = useState("");
  const exprSearchDebounced = useDebouncedValue(exprSearch);
  const [exprType, setExprType] = useState("ALL");
  const [exprPage, setExprPage] = useState(1);
  const [exprHasMore, setExprHasMore] = useState(false);
  const [selectedExpression, setSelectedExpression] = useState<UserExpressionItem | null>(null);

  // Grammar Tab State
  const [grammarItems, setGrammarItems] = useState<UserGrammarItem[]>([]);
  const [grammarTotal, setGrammarTotal] = useState(0);
  const [grammarSearch, setGrammarSearch] = useState("");
  const grammarSearchDebounced = useDebouncedValue(grammarSearch);
  const [grammarConfidence, setGrammarConfidence] = useState("ALL");
  const [grammarPage, setGrammarPage] = useState(1);
  const [grammarHasMore, setGrammarHasMore] = useState(false);
  const [expandedGrammarId, setExpandedGrammarId] = useState<number | null>(null);
  const [enrichingGrammarId, setEnrichingGrammarId] = useState<number | null>(null);

  // Shared "loading more" flag for infinite scroll appends
  const [loadingMore, setLoadingMore] = useState(false);
  const listEndRef = React.useRef<HTMLDivElement | null>(null);

  const hasGrammarDetail = (g: UserGrammarItem) =>
    Boolean((g.formation || "").trim() || (g.usage_context || "").trim() || (g.examples?.length || 0) > 0);

  // Saved Sentences Tab State
  const [savedSentences, setSavedSentences] = useState<UserSavedSentenceItem[]>([]);
  const [sentencesTotal, setSentencesTotal] = useState(0);
  const [sentSearch, setSentSearch] = useState("");
  const sentSearchDebounced = useDebouncedValue(sentSearch);
  const [sentReason, setSentReason] = useState("ALL");
  const [sentPage, setSentPage] = useState(1);
  const [sentHasMore, setSentHasMore] = useState(false);

  // Tab totals for all 4 tabs on first open (list APIs only count the active tab)
  const [tabCounts, setTabCounts] = useState<{
    vocab: number;
    expressions: number;
    grammar: number;
    sentences: number;
  } | null>(null);

  // Furigana for saved sentences (independent 3-state toggle, default always-on)
  const [libFuriganaMode, setLibFuriganaMode] = useState<"always" | "hover" | "off">("always");
  const [furiganaMap, setFuriganaMap] = useState<Record<number, FuriganaToken[]>>({});

  // Renders a saved Japanese sentence with ruby furigana when tokens are
  // available; falls back to plain text (e.g. furigana API offline).
  const renderSavedSentence = (s: UserSavedSentenceItem) => {
    const tokens = furiganaMap[s.id];
    if (!tokens || tokens.length === 0) {
      return <>{s.sentence_text}</>;
    }
    return (
      <>
        {tokens.map((t, idx) =>
          t.reading ? (
            <ruby key={idx}>
              {t.text}
              <rt>{t.reading}</rt>
            </ruby>
          ) : (
            <span key={idx}>{t.text}</span>
          )
        )}
      </>
    );
  };

  const savedSentenceFuriganaClass =
    libFuriganaMode === "always"
      ? "furigana-mode-always"
      : libFuriganaMode === "hover"
        ? "furigana-mode-hover"
        : "furigana-mode-off";

  // On-demand AI enrichment for patterns saved before detail existed.
  const handleEnrichGrammar = async (grammarId: number) => {
    if (enrichingGrammarId) return;
    try {
      setEnrichingGrammarId(grammarId);
      const updated = await api.enrichGrammarDetail(grammarId);
      setGrammarItems((prev) => prev.map((g) => (g.id === grammarId ? updated : g)));
      notify.success("Đã bổ sung công thức, hoàn cảnh và ví dụ!");
    } catch (err: any) {
      notify.error(err?.message || "Không thể bổ sung AI lúc này. Hãy thử lại sau.");
    } finally {
      setEnrichingGrammarId(null);
    }
  };

  // Load Data per tab with paging (page 1 replaces, later pages append)
  const loadVocab = async (page: number = 1, append: boolean = false) => {
    try {
      if (append) setLoadingMore(true);
      else { setLoading(true); setError(null); }
      const res = await api.getVocabularyList({
        status: vocabStatusFilter,
        search: vocabSearchDebounced,
        page,
        limit: PAGE_SIZE,
      });
      setVocabList((prev) => (append ? [...prev, ...res.items] : res.items));
      setVocabTotal(res.total);
      setVocabPage(page);
      setVocabHasMore(page * PAGE_SIZE < res.total);
    } catch (err: any) {
      if (!append) setError(err?.message || "Không thể tải danh sách từ vựng.");
      else notify.error(err?.message || "Không thể tải thêm từ vựng.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadExpressions = async (page: number = 1, append: boolean = false) => {
    try {
      if (append) setLoadingMore(true);
      else { setLoading(true); setError(null); }
      const res = await api.getExpressionsList({
        page,
        limit: PAGE_SIZE,
        search: exprSearchDebounced,
        type: exprType,
      });
      setExpressions((prev) => (append ? [...prev, ...res.items] : res.items));
      setExpressionsTotal(res.total);
      setExprPage(page);
      setExprHasMore(page * PAGE_SIZE < res.total);
    } catch (err: any) {
      if (!append) setError(err?.message || "Không thể tải danh sách cụm từ.");
      else notify.error(err?.message || "Không thể tải thêm cụm từ.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadGrammar = async (page: number = 1, append: boolean = false) => {
    try {
      if (append) setLoadingMore(true);
      else { setLoading(true); setError(null); }
      const res = await api.getGrammarList({
        page,
        limit: PAGE_SIZE,
        search: grammarSearchDebounced,
        confidence: grammarConfidence,
      });
      setGrammarItems((prev) => (append ? [...prev, ...res.items] : res.items));
      setGrammarTotal(res.total);
      setGrammarPage(page);
      setGrammarHasMore(page * PAGE_SIZE < res.total);
    } catch (err: any) {
      if (!append) setError(err?.message || "Không thể tải danh sách ngữ pháp.");
      else notify.error(err?.message || "Không thể tải thêm ngữ pháp.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchSentenceFurigana = (items: UserSavedSentenceItem[]) => {
    // Batch furigana for newly loaded sentences (1 local call, no AI).
    const texts = items
      .filter((s) => s.sentence_text && s.sentence_text.trim().length > 0)
      .map((s) => ({ key: String(s.id), text: s.sentence_text }));
    if (texts.length === 0) return;
    api.generateFuriganaBatch(texts)
      .then((furi) => {
        setFuriganaMap((prev) => {
          const next = { ...prev };
          for (const item of furi.items || []) {
            next[Number(item.key)] = item.tokens || [];
          }
          return next;
        });
      })
      .catch(() => {
        // Silent: sentences fall back to plain text.
      });
  };

  const loadSentences = async (page: number = 1, append: boolean = false) => {
    try {
      if (append) setLoadingMore(true);
      else { setLoading(true); setError(null); }
      const res = await api.getSavedSentences({
        page,
        limit: PAGE_SIZE,
        search: sentSearchDebounced,
        reason: sentReason,
      });
      setSavedSentences((prev) => (append ? [...prev, ...res.items] : res.items));
      setSentencesTotal(res.total);
      setSentPage(page);
      setSentHasMore(page * PAGE_SIZE < res.total);
      fetchSentenceFurigana(res.items);
    } catch (err: any) {
      if (!append) setError(err?.message || "Không thể tải danh sách câu văn đã lưu.");
      else notify.error(err?.message || "Không thể tải thêm câu văn.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Load all 4 tab totals once on first open (each list API only counts its own tab)
  useEffect(() => {
    api.getKnowledgeStats()
      .then((stats) => {
        setTabCounts({
          vocab: stats.total_vocabulary,
          expressions: stats.total_expressions,
          grammar: stats.total_grammar,
          sentences: stats.saved_sentences_count,
        });
      })
      .catch(() => {
        // Silent: tab labels fall back to per-tab loaded totals.
      });
  }, []);

  // Reload page 1 whenever the active tab or its search/filter changes
  useEffect(() => {
    if (activeTab === "vocab") loadVocab(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, vocabStatusFilter, vocabSearchDebounced]);

  useEffect(() => {
    if (activeTab === "expressions") loadExpressions(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, exprSearchDebounced, exprType]);

  useEffect(() => {
    if (activeTab === "grammar") loadGrammar(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, grammarSearchDebounced, grammarConfidence]);

  useEffect(() => {
    if (activeTab === "sentences") loadSentences(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, sentSearchDebounced, sentReason]);

  // Infinite scroll: when the sentinel scrolls into view, fetch the next page
  useEffect(() => {
    const el = listEndRef.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || loading || loadingMore) return;
        if (activeTab === "vocab" && vocabHasMore) loadVocab(vocabPage + 1, true);
        else if (activeTab === "expressions" && exprHasMore) loadExpressions(exprPage + 1, true);
        else if (activeTab === "grammar" && grammarHasMore) loadGrammar(grammarPage + 1, true);
        else if (activeTab === "sentences" && sentHasMore) loadSentences(sentPage + 1, true);
      },
      { rootMargin: "400px" }
    );
    ob.observe(el);
    return () => ob.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, loading, loadingMore, vocabHasMore, vocabPage, exprHasMore, exprPage, grammarHasMore, grammarPage, sentHasMore, sentPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "vocab") loadVocab(1, false);
    else if (activeTab === "expressions") loadExpressions(1, false);
    else if (activeTab === "grammar") loadGrammar(1, false);
    else if (activeTab === "sentences") loadSentences(1, false);
  };

  const openVocabDetail = async (vocabId: number) => {
    try {
      setDetailLoading(true);
      const detail = await api.getVocabularyDetail(vocabId);
      setSelectedVocabDetail(detail);
    } catch (err: any) {
      notify.error(err?.message || "Không thể tải chi tiết từ vựng");
    } finally {
      setDetailLoading(false);
    }
  };

  // Related term drill-down: related_terms are plain strings, so resolve
  // the term to a library id via search, preferring an exact term match.
  const openRelatedTerm = async (term: string) => {
    const q = term.trim();
    if (!q) return;
    try {
      setDetailLoading(true);
      const res = await api.getVocabularyList({ search: q, limit: 10 });
      const exact =
        res.items.find((it) => it.term === q || it.normalized_form === q) ||
        res.items[0];
      if (!exact) {
        notify.error(`Chưa có từ "${q}" trong Thư viện.`);
        return;
      }
      const detail = await api.getVocabularyDetail(exact.id);
      setSelectedVocabDetail(detail);
    } catch (err: any) {
      notify.error(err?.message || "Không thể mở từ liên quan");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateStatus = async (vocabId: number, status: string) => {
    try {
      await api.updateKnowledgeItemStatus("VOCABULARY", vocabId, status);
      if (selectedVocabDetail && selectedVocabDetail.id === vocabId) {
        setSelectedVocabDetail({ ...selectedVocabDetail, status: status as any });
      }
      notify.success("Đã cập nhật trạng thái học tập!");
      loadVocab(1, false);
    } catch (err: any) {
      notify.error(err?.message || "Không thể cập nhật trạng thái");
    }
  };

  // On-demand AI enrichment for words saved before this feature (or when
  // AI failed at save time). Refreshes the open detail in place.
  const handleEnrichDetail = async () => {
    if (!selectedVocabDetail || isEnriching) return;
    try {
      setIsEnriching(true);
      const detail = await api.enrichVocabularyDetail(selectedVocabDetail.id);
      setSelectedVocabDetail(detail);
      notify.success("Đã bổ sung sắc thái, ví dụ và từ gần nghĩa!");
    } catch (err: any) {
      notify.error(err?.message || "Không thể bổ sung AI lúc này. Hãy thử lại sau.");
    } finally {
      setIsEnriching(false);
    }
  };

  const hasAiDetail = (d: VocabularyDetailItem) =>
    Boolean((d.nuance || "").trim() || (d.examples?.length || 0) > 0 || (d.alternatives?.length || 0) > 0);

  const handleDeleteSentence = async (sentenceId: number) => {
    const confirmed = await confirmDialog({
      title: "Xác nhận xóa câu văn",
      message: "Bạn có chắc chắn muốn xóa câu văn này khỏi thư viện cá nhân?",
      variant: "danger",
      confirmText: "Xóa câu",
    });
    if (!confirmed) return;

    try {
      await api.deleteSavedSentence(sentenceId);
      setSavedSentences((prev) => prev.filter((s) => s.id !== sentenceId));
      setSentencesTotal((prev) => Math.max(0, prev - 1));
      notify.success("Đã xóa câu văn khỏi thư viện!");
    } catch (err: any) {
      notify.error(err?.message || "Không thể xóa câu văn");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "MASTERED":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Thành thạo</span>;
      case "FAMILIAR":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">Quen thuộc</span>;
      case "LEARNING":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">Đang học</span>;
      case "IGNORED":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sumi-800 text-sumi-400 border border-sumi-700">Đã ẩn</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-torii-500/20 text-torii-300 border border-torii-500/30">Mới gặp</span>;
    }
  };

  return (
    <div className="min-h-screen bg-sumi-950 text-sumi-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sumi-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 flex items-center justify-center">
                <Library className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Thư Viện Tri Thức Cá Nhân
                </h1>
                <p className="text-sm text-sumi-400">
                  Tập hợp từ vựng, collocation, ngữ pháp và câu văn gắn liền với bài đọc thực tế
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Furigana mode for saved sentences (Luôn / Hover / Tắt) */}
            <div
              className="flex items-center p-0.5 rounded-xl bg-sumi-900 border border-sumi-800"
              title="Chế độ furigana cho câu văn đã lưu"
            >
              {([
                { value: "always", label: "Luôn" },
                { value: "hover", label: "Hover" },
                { value: "off", label: "Tắt" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setLibFuriganaMode(opt.value)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors ${
                    libFuriganaMode === opt.value
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "text-sumi-400 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Link
              href="/immersion/review"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
            >
              <Repeat className="w-4 h-4" />
              Ôn tập Spaced Review
            </Link>
            <Link
              href="/immersion/knowledge"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium bg-sumi-900 hover:bg-sumi-800 text-sumi-300 hover:text-white border border-sumi-800 transition-colors"
            >
              Xem Dashboard
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-sumi-800/60 pb-2">
          <button
            onClick={() => setActiveTab("vocab")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "vocab"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-sumi-400 hover:text-white hover:bg-sumi-900"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Từ vựng ({tabCounts?.vocab ?? vocabTotal})
          </button>

          <button
            onClick={() => setActiveTab("expressions")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "expressions"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-sumi-400 hover:text-white hover:bg-sumi-900"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Cụm từ & Collocations ({tabCounts?.expressions ?? expressionsTotal})
          </button>

          <button
            onClick={() => setActiveTab("grammar")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "grammar"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-sumi-400 hover:text-white hover:bg-sumi-900"
            }`}
          >
            <Layers className="w-4 h-4" />
            Ngữ pháp ({tabCounts?.grammar ?? grammarTotal})
          </button>

          <button
            onClick={() => setActiveTab("sentences")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "sentences"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-sumi-400 hover:text-white hover:bg-sumi-900"
            }`}
          >
            <Quote className="w-4 h-4" />
            Câu văn đã lưu ({tabCounts?.sentences ?? sentencesTotal})
          </button>
        </div>

        {/* TAB 1: VOCABULARY */}
        {activeTab === "vocab" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-sumi-900/60 p-3 rounded-xl border border-sumi-800">
              <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sumi-400" />
                <input
                  type="text"
                  value={vocabSearch}
                  onChange={(e) => setVocabSearch(e.target.value)}
                  placeholder="Tìm kiếm theo từ vựng, furigana hoặc nghĩa tiếng Việt..."
                  className="w-full bg-sumi-950 border border-sumi-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-sumi-100 placeholder:text-sumi-500 focus:outline-none focus:border-amber-500/50"
                />
              </form>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-sumi-400 whitespace-nowrap">Trạng thái:</span>
                <select
                  value={vocabStatusFilter}
                  onChange={(e) => setVocabStatusFilter(e.target.value)}
                  className="bg-sumi-950 border border-sumi-800 rounded-lg px-2.5 py-1.5 text-xs text-sumi-200 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="LEARNING">Đang học</option>
                  <option value="FAMILIAR">Quen thuộc</option>
                  <option value="MASTERED">Thành thạo</option>
                  <option value="SEEN">Mới gặp</option>
                  <option value="IGNORED">Đã ẩn</option>
                </select>
                <button
                  onClick={() => loadVocab(1, false)}
                  className="p-1.5 rounded-lg bg-sumi-800 hover:bg-sumi-700 text-sumi-300 hover:text-white transition-colors"
                  title="Làm mới"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Vocab Grid / Table */}
            {loading ? (
              <div className="text-center py-16 text-sumi-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                Đang tải dữ liệu từ vựng...
              </div>
            ) : vocabList.length === 0 ? (
              <div className="text-center py-16 bg-sumi-900/30 rounded-2xl border border-sumi-800/60">
                <BookOpen className="w-10 h-10 text-sumi-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-white">Chưa có từ vựng nào</h3>
                <p className="text-xs text-sumi-400 mt-1 max-w-md mx-auto">
                  Khi bạn đọc bài trong Immersion Feed, tra từ hoặc làm bài quiz, từ mới sẽ tự động được thu nạp vào đây.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {vocabList.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => openVocabDetail(item.id)}
                    className="p-4 rounded-xl bg-sumi-900/70 hover:bg-sumi-900 border border-sumi-800/80 hover:border-amber-500/40 transition-all cursor-pointer group space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs text-amber-400/90 font-mono">{item.reading}</div>
                        <div className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                          {item.term}
                        </div>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>

                    <p className="text-xs text-sumi-300 line-clamp-2 leading-relaxed">
                      {item.meaning}
                    </p>

                    {/* Mastery Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-sumi-400">
                        <span>Độ thành thạo</span>
                        <span className="font-mono text-amber-400 font-semibold">{Math.round(item.mastery_score)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-sumi-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(5, item.mastery_score))}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-sumi-400 pt-1 border-t border-sumi-800/50">
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-400" />
                        Gặp {item.encounter_count} lần
                      </span>
                      <span className="text-sumi-400 group-hover:text-amber-400 transition-colors flex items-center gap-0.5 text-[10px]">
                        Xem chi tiết <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Infinite scroll sentinel */}
            <div ref={listEndRef} className="h-1" />
            {loadingMore && activeTab === "vocab" && (
              <div className="text-center py-4 text-sumi-400 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-amber-400" />
                Đang tải thêm...
              </div>
            )}
            {!loading && !vocabHasMore && vocabList.length > 0 && (
              <p className="text-center text-[11px] text-sumi-600 pb-2">
                Đã hiện tất cả {vocabTotal} từ vựng
              </p>
            )}
          </div>
        )}

        {/* TAB 2: EXPRESSIONS */}
        {activeTab === "expressions" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-sumi-900/60 p-3 rounded-xl border border-sumi-800">
              <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sumi-400" />
                <input
                  type="text"
                  value={exprSearch}
                  onChange={(e) => setExprSearch(e.target.value)}
                  placeholder="Tìm cụm từ, cách đọc hoặc nghĩa..."
                  className="w-full bg-sumi-950 border border-sumi-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-sumi-100 placeholder:text-sumi-500 focus:outline-none focus:border-amber-500/50"
                />
              </form>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-sumi-400 whitespace-nowrap">Loại:</span>
                <select
                  value={exprType}
                  onChange={(e) => setExprType(e.target.value)}
                  className="bg-sumi-950 border border-sumi-800 rounded-lg px-2.5 py-1.5 text-xs text-sumi-200 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="ALL">Tất cả loại</option>
                  <option value="COLLOCATION">Collocation</option>
                  <option value="IDIOM">Thành ngữ</option>
                  <option value="SLANG">Lóng</option>
                  <option value="FORMAL_PATTERN">Mẫu trang trọng</option>
                </select>
                <button
                  onClick={() => loadExpressions(1, false)}
                  className="p-1.5 rounded-lg bg-sumi-800 hover:bg-sumi-700 text-sumi-300 hover:text-white transition-colors"
                  title="Làm mới"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-16 text-sumi-400">Đang tải cụm từ...</div>
            ) : expressions.length === 0 ? (
              <div className="text-center py-16 bg-sumi-900/30 rounded-2xl border border-sumi-800/60">
                <Sparkles className="w-10 h-10 text-sumi-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-white">Chưa có collocation nào</h3>
                <p className="text-xs text-sumi-400 mt-1">Các cụm đi liền và thành ngữ sẽ xuất hiện khi bạn đọc các bài báo thực tế.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {expressions.map((expr) => (
                  <div
                    key={expr.id}
                    onClick={() => setSelectedExpression(expr)}
                    className="p-4 rounded-xl bg-sumi-900/70 hover:bg-sumi-900 border border-sumi-800/80 hover:border-amber-500/40 transition-all cursor-pointer group space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {expr.reading && <div className="text-xs text-amber-400/90 font-mono">【{expr.reading}】</div>}
                        <div className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors font-serif">
                          {expr.expression}
                        </div>
                      </div>
                      {getStatusBadge(expr.status)}
                    </div>

                    <p className="text-xs text-sumi-300 line-clamp-2 leading-relaxed">
                      {expr.meaning}
                    </p>

                    {/* Mastery Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-sumi-400">
                        <span>Độ thành thạo</span>
                        <span className="font-mono text-amber-400 font-semibold">{Math.round(expr.mastery_score)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-sumi-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(5, expr.mastery_score))}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-sumi-400 pt-1 border-t border-sumi-800/50">
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-400" />
                        Gặp {expr.encounter_count} lần
                      </span>
                      <span className="text-sumi-400 group-hover:text-amber-400 transition-colors flex items-center gap-0.5 text-[10px]">
                        Xem chi tiết <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Infinite scroll sentinel */}
            <div ref={listEndRef} className="h-1" />
            {loadingMore && activeTab === "expressions" && (
              <div className="text-center py-4 text-sumi-400 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-amber-400" />
                Đang tải thêm...
              </div>
            )}
            {!loading && !exprHasMore && expressions.length > 0 && (
              <p className="text-center text-[11px] text-sumi-600 pb-2">
                Đã hiện tất cả {expressionsTotal} cụm từ
              </p>
            )}
          </div>
        )}

        {/* TAB 3: GRAMMAR */}
        {activeTab === "grammar" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-sumi-900/60 p-3 rounded-xl border border-sumi-800">
              <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sumi-400" />
                <input
                  type="text"
                  value={grammarSearch}
                  onChange={(e) => setGrammarSearch(e.target.value)}
                  placeholder="Tìm mẫu ngữ pháp hoặc nghĩa..."
                  className="w-full bg-sumi-950 border border-sumi-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-sumi-100 placeholder:text-sumi-500 focus:outline-none focus:border-amber-500/50"
                />
              </form>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-sumi-400 whitespace-nowrap">Độ tin cậy:</span>
                <select
                  value={grammarConfidence}
                  onChange={(e) => setGrammarConfidence(e.target.value)}
                  className="bg-sumi-950 border border-sumi-800 rounded-lg px-2.5 py-1.5 text-xs text-sumi-200 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="ALL">Tất cả</option>
                  <option value="HIGH">Tin cậy cao</option>
                  <option value="MEDIUM">Trung bình</option>
                  <option value="LOW">Thấp</option>
                </select>
                <button
                  onClick={() => loadGrammar(1, false)}
                  className="p-1.5 rounded-lg bg-sumi-800 hover:bg-sumi-700 text-sumi-300 hover:text-white transition-colors"
                  title="Làm mới"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-16 text-sumi-400">Đang tải ngữ pháp...</div>
            ) : grammarItems.length === 0 ? (
              <div className="text-center py-16 bg-sumi-900/30 rounded-2xl border border-sumi-800/60">
                <Layers className="w-10 h-10 text-sumi-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-white">Chưa có mẫu ngữ pháp nào</h3>
                <p className="text-xs text-sumi-400 mt-1">Các cấu trúc ngữ pháp được ghi nhận khi bạn giải thích câu và làm quiz.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {grammarItems.map((g) => {
                  const expanded = expandedGrammarId === g.id;
                  const enriching = enrichingGrammarId === g.id;
                  return (
                  <div key={g.id} className="p-4 rounded-xl bg-sumi-900/70 hover:bg-sumi-900 border border-sumi-800/80 hover:border-amber-500/40 transition-all group space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors font-serif">
                        {g.pattern}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold flex-shrink-0 ${
                        g.confidence === "HIGH" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}>
                        {g.confidence === "HIGH" ? "Tin cậy cao" : "Đang củng cố"}
                      </span>
                    </div>

                    <p className="text-xs text-sumi-300 line-clamp-2 leading-relaxed">
                      {g.meaning}
                    </p>

                    {/* Mastery Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-sumi-400">
                        <span>Độ thành thạo</span>
                        <span className="font-mono text-amber-400 font-semibold">{Math.round(g.mastery_score)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-sumi-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(5, g.mastery_score))}%` }}
                        />
                      </div>
                    </div>

                    {/* Full AI detail (formation, usage, examples) */}
                    {expanded && (
                      <div className="space-y-2 pt-1">
                        {g.formation && (
                          <div className="p-2.5 rounded-lg bg-pink-500/5 border border-pink-500/20">
                            <div className="text-[10px] font-semibold text-pink-300 mb-0.5">Công thức cấu tạo</div>
                            <p className="text-xs text-white font-mono leading-relaxed">{g.formation}</p>
                          </div>
                        )}
                        {g.usage_context && (
                          <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                            <div className="text-[10px] font-semibold text-amber-300 mb-0.5">Hoàn cảnh sử dụng</div>
                            <p className="text-[11px] text-sumi-300 leading-relaxed">{g.usage_context}</p>
                          </div>
                        )}
                        {g.examples && g.examples.length > 0 && (
                          <div className="space-y-1.5">
                            {g.examples.map((ex, idx) => (
                              <div key={idx} className="p-2.5 rounded-lg bg-sumi-950 border border-sumi-800/80">
                                <p className="text-xs text-white font-serif leading-relaxed">{ex.sentence_ja}</p>
                                {ex.sentence_vi && (
                                  <p className="text-[10px] text-sumi-400 mt-0.5">{ex.sentence_vi}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {!hasGrammarDetail(g) && (
                          <button
                            onClick={() => handleEnrichGrammar(g.id)}
                            disabled={enriching}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 dark:bg-amber-950/40 hover:bg-amber-200 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-300 text-[11px] font-semibold transition-all disabled:opacity-50"
                          >
                            <Sparkles className={`w-3.5 h-3.5 ${enriching ? "animate-spin" : ""}`} />
                            <span>{enriching ? "AI đang bổ sung..." : "Bổ sung công thức, hoàn cảnh & ví dụ bằng AI"}</span>
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-sumi-400 pt-1 border-t border-sumi-800/50">
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-400" />
                        Gặp {g.encounter_count} · <span className="text-emerald-400">Đúng {g.correct_count}</span> · <span className="text-torii-400">Sai {g.incorrect_count}</span>
                      </span>
                      <button
                        onClick={() => setExpandedGrammarId(expanded ? null : g.id)}
                        className="text-sumi-400 group-hover:text-amber-400 transition-colors flex items-center gap-0.5 text-[10px]"
                      >
                        {expanded ? "Thu gọn" : "Xem thêm"} <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? "-rotate-90" : ""}`} />
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
            {/* Infinite scroll sentinel */}
            <div ref={listEndRef} className="h-1" />
            {loadingMore && activeTab === "grammar" && (
              <div className="text-center py-4 text-sumi-400 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-amber-400" />
                Đang tải thêm...
              </div>
            )}
            {!loading && !grammarHasMore && grammarItems.length > 0 && (
              <p className="text-center text-[11px] text-sumi-600 pb-2">
                Đã hiện tất cả {grammarTotal} mẫu ngữ pháp
              </p>
            )}
          </div>
        )}

        {/* TAB 4: SAVED SENTENCES */}
        {activeTab === "sentences" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-sumi-900/60 p-3 rounded-xl border border-sumi-800">
              <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sumi-400" />
                <input
                  type="text"
                  value={sentSearch}
                  onChange={(e) => setSentSearch(e.target.value)}
                  placeholder="Tìm trong câu văn hoặc bản dịch..."
                  className="w-full bg-sumi-950 border border-sumi-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-sumi-100 placeholder:text-sumi-500 focus:outline-none focus:border-amber-500/50"
                />
              </form>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-sumi-400 whitespace-nowrap">Lý do:</span>
                <select
                  value={sentReason}
                  onChange={(e) => setSentReason(e.target.value)}
                  className="bg-sumi-950 border border-sumi-800 rounded-lg px-2.5 py-1.5 text-xs text-sumi-200 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="ALL">Tất cả</option>
                  <option value="MEMORABLE">Đáng nhớ</option>
                  <option value="GOOD_EXPRESSION">Diễn đạt hay</option>
                  <option value="GOOD_GRAMMAR">Ngữ pháp hay</option>
                  <option value="USEFUL_VOCABULARY">Từ vựng hữu ích</option>
                  <option value="NATURAL_JAPANESE">Tự nhiên</option>
                </select>
                <button
                  onClick={() => loadSentences(1, false)}
                  className="p-1.5 rounded-lg bg-sumi-800 hover:bg-sumi-700 text-sumi-300 hover:text-white transition-colors"
                  title="Làm mới"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-16 text-sumi-400">Đang tải câu văn đã lưu...</div>
            ) : savedSentences.length === 0 ? (
              <div className="text-center py-16 bg-sumi-900/30 rounded-2xl border border-sumi-800/60">
                <Quote className="w-10 h-10 text-sumi-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-white">Chưa có câu văn tâm đắc nào</h3>
                <p className="text-xs text-sumi-400 mt-1">Trong lúc đọc bài, bấm biểu tượng lưu câu để lưu lại các cách diễn đạt mẫu mực.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedSentences.map((s) => (
                  <div key={s.id} className="p-4 rounded-xl bg-sumi-900/70 border border-sumi-800/80 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className={`text-sm font-medium text-white leading-relaxed font-serif ${savedSentenceFuriganaClass}`}>
                          {renderSavedSentence(s)}
                        </div>
                        {s.translation_text && (
                          <div className="text-xs text-sumi-300 leading-relaxed">
                            {s.translation_text}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteSentence(s.id)}
                        className="p-1.5 rounded-lg text-sumi-400 hover:text-torii-400 hover:bg-torii-500/10 transition-colors"
                        title="Xóa câu văn"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-sumi-400 pt-2 border-t border-sumi-800/50">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-sumi-800 text-sumi-300 font-mono text-[10px]">
                          {s.reason}
                        </span>
                        {s.notes && <span className="italic text-sumi-400">Ghi chú: {s.notes}</span>}
                      </div>
                      {s.content_title && (
                        <span className="text-torii-400/90 truncate max-w-xs">
                          Nguồn: {s.content_title}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Infinite scroll sentinel */}
            <div ref={listEndRef} className="h-1" />
            {loadingMore && activeTab === "sentences" && (
              <div className="text-center py-4 text-sumi-400 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-amber-400" />
                Đang tải thêm...
              </div>
            )}
            {!loading && !sentHasMore && savedSentences.length > 0 && (
              <p className="text-center text-[11px] text-sumi-600 pb-2">
                Đã hiện tất cả {sentencesTotal} câu văn
              </p>
            )}
          </div>
        )}

        {/* EXPRESSION DETAIL MODAL */}
        <ExpressionDetailModal
          item={selectedExpression}
          onClose={() => setSelectedExpression(null)}
          onUpdated={(updated) => {
            setSelectedExpression(updated);
            setExpressions((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
          }}
        />

        {/* VOCABULARY DETAIL MODAL — structured like the lookup modal (Tra từ):
            header → reading + meaning + badges → collocation → related terms
            → mastery → FSRS → status actions. No reading-context block. */}
        {selectedVocabDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
            <div className="bg-sumi-900 border border-sumi-700 rounded-2xl max-w-xl md:max-w-2xl w-full p-4 sm:p-5 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setSelectedVocabDetail(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-sumi-400 hover:text-white hover:bg-sumi-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="flex items-start gap-2 pr-8">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0">
                  <BookOpen className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <span className="text-xs uppercase font-mono tracking-wider text-amber-400 font-semibold">
                    Từ vựng trong Thư viện
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white font-serif tracking-wide break-words">
                    {selectedVocabDetail.term}
                  </h2>
                  {selectedVocabDetail.reading && (
                    <div className="text-sm text-sky-300 font-medium">【{selectedVocabDetail.reading}】</div>
                  )}
                </div>
              </div>

              {/* Meaning + badges */}
              <div className="p-3 rounded-xl bg-sumi-950/70 border border-sumi-800">
                <p className="text-base font-bold text-white leading-snug">{selectedVocabDetail.meaning}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {selectedVocabDetail.part_of_speech && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                      {selectedVocabDetail.part_of_speech}
                    </span>
                  )}
                  {selectedVocabDetail.jlpt_level && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      {selectedVocabDetail.jlpt_level}
                    </span>
                  )}
                  {getStatusBadge(selectedVocabDetail.status)}
                </div>
              </div>

              {/* Backfill button for words saved before AI detail existed */}
              {!hasAiDetail(selectedVocabDetail) && (
                <button
                  onClick={handleEnrichDetail}
                  disabled={isEnriching}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/40 hover:bg-amber-200 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs font-semibold transition-all disabled:opacity-50 shadow-sm"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isEnriching ? "animate-spin" : ""}`} />
                  <span>{isEnriching ? "AI đang bổ sung chi tiết..." : "Bổ sung sắc thái, ví dụ & từ gần nghĩa bằng AI"}</span>
                </button>
              )}

              {/* Nuance — same block style as the lookup modal */}
              {selectedVocabDetail.nuance && (
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-center gap-1.5 text-amber-300 text-xs font-semibold mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Sắc thái sử dụng</span>
                  </div>
                  <p className="text-xs text-sumi-300 leading-relaxed">{selectedVocabDetail.nuance}</p>
                </div>
              )}

              {/* Collocations — same block style as the lookup modal */}
              {selectedVocabDetail.collocations && selectedVocabDetail.collocations.length > 0 && (
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-semibold mb-1.5">
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Cụm chuẩn người bản xứ</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedVocabDetail.collocations.map((c, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg text-xs bg-sumi-800 text-emerald-200 border border-sumi-700 font-medium">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Real examples — same layout as the lookup modal */}
              {selectedVocabDetail.examples && selectedVocabDetail.examples.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-sumi-300 text-xs font-semibold mb-2">
                    <BookOpen className="w-3.5 h-3.5 text-sumi-400" />
                    <span>Ví dụ thực tế ({selectedVocabDetail.examples.length})</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {selectedVocabDetail.examples.map((ex, idx) => (
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

              {/* Near-synonyms with differences — tappable to drill into that word */}
              {selectedVocabDetail.alternatives && selectedVocabDetail.alternatives.length > 0 ? (
                <div>
                  <div className="text-xs font-semibold text-sumi-300 mb-2">
                    Từ gần nghĩa — bấm để xem tiếp:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedVocabDetail.alternatives.map((alt, idx) => (
                      <button
                        key={idx}
                        onClick={() => openRelatedTerm(alt.expression)}
                        disabled={detailLoading}
                        className="p-2.5 rounded-xl bg-sumi-950 border border-sumi-800 hover:border-amber-500/50 text-left transition-all group disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-sm font-bold text-white font-serif truncate">
                            {alt.expression}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-sumi-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                        </div>
                        {alt.reading && (
                          <div className="text-[11px] text-sumi-400">【{alt.reading}】</div>
                        )}
                        {alt.meaning_vi && (
                          <div className="text-xs text-sky-300 truncate">{alt.meaning_vi}</div>
                        )}
                        {alt.difference && (
                          <div className="text-[11px] text-sumi-500 line-clamp-2 mt-0.5">
                            ≠ {alt.difference}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                selectedVocabDetail.related_terms && selectedVocabDetail.related_terms.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-sumi-300 mb-2">
                      Từ liên quan — bấm để xem tiếp:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedVocabDetail.related_terms.map((t, idx) => (
                        <button
                          key={idx}
                          onClick={() => openRelatedTerm(t)}
                          disabled={detailLoading}
                          className="p-2.5 rounded-xl bg-sumi-950 border border-sumi-800 hover:border-amber-500/50 text-left transition-all group disabled:opacity-50"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm font-bold text-white font-serif truncate">
                              {t}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-sumi-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              )}

              {/* Mastery Breakdown (compact) */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-sumi-950/80 rounded-xl border border-sumi-800/80">
                <div className="text-center space-y-0.5">
                  <div className="text-[10px] text-sumi-400 uppercase tracking-wider font-semibold">Mastery</div>
                  <div className="text-lg font-bold text-amber-400 font-mono">
                    {Math.round(selectedVocabDetail.mastery_score)}%
                  </div>
                </div>
                <div className="text-center space-y-0.5 border-x border-sumi-800">
                  <div className="text-[10px] text-sumi-400 uppercase tracking-wider font-semibold">Nhận diện</div>
                  <div className="text-lg font-bold text-blue-400 font-mono">
                    {Math.round(selectedVocabDetail.recognition_score)}%
                  </div>
                </div>
                <div className="text-center space-y-0.5">
                  <div className="text-[10px] text-sumi-400 uppercase tracking-wider font-semibold">Gợi nhớ</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono">
                    {Math.round(selectedVocabDetail.recall_score)}%
                  </div>
                </div>
              </div>

              {/* Spaced Review State (compact) */}
              {selectedVocabDetail.review_state && (
                <div className="p-3 bg-sumi-950/50 rounded-xl border border-sumi-800/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-sumi-300">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <Repeat className="w-3.5 h-3.5" /> FSRS Memory Model
                    </span>
                    <span className="font-mono text-sumi-400">Due: {new Date(selectedVocabDetail.review_state.next_review_at).toLocaleDateString()}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-sumi-900/60 p-1.5 rounded">
                      <span className="text-[10px] text-sumi-400 block">Độ bền (S)</span>
                      <span className="font-mono font-bold text-white">{selectedVocabDetail.review_state.stability}d</span>
                    </div>
                    <div className="bg-sumi-900/60 p-1.5 rounded">
                      <span className="text-[10px] text-sumi-400 block">Độ khó (D)</span>
                      <span className="font-mono font-bold text-white">{selectedVocabDetail.review_state.difficulty}</span>
                    </div>
                    <div className="bg-sumi-900/60 p-1.5 rounded">
                      <span className="text-[10px] text-sumi-400 block">Số lần ôn</span>
                      <span className="font-mono font-bold text-white">{selectedVocabDetail.review_state.reps}</span>
                    </div>
                    <div className="bg-sumi-900/60 p-1.5 rounded">
                      <span className="text-[10px] text-sumi-400 block">Quên</span>
                      <span className="font-mono font-bold text-torii-400">{selectedVocabDetail.review_state.lapses}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-sumi-800">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedVocabDetail.id, "MASTERED")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Đánh dấu đã thuộc
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedVocabDetail.id, "IGNORED")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-sumi-800 hover:bg-sumi-700 text-sumi-300 transition-colors"
                  >
                    <EyeOff className="w-3.5 h-3.5" /> Ẩn từ này
                  </button>
                </div>
                <button
                  onClick={() => setSelectedVocabDetail(null)}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-sumi-800 text-sumi-200 hover:text-white transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
