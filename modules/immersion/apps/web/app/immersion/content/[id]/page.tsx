"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { immersionApi } from "@/lib/api";
import {
  ReaderContent,
  AnnotatedSentence,
  ContentVocabulary,
  ContentGrammar,
  FeedItem,
  FuriganaMode,
  ReadingMode,
  ChallengeMode,
  ReadingCheckpoint,
  ContextGuessResponse,
  ResumeCheckpoint,
  AIProviderMeta,
  AIModelMeta,
  ActiveAIModel,
} from "@/lib/types";
import { getUserPreferences, saveUserPreferences } from "@/lib/userSession";
import { InteractiveSentence } from "@/components/reader/InteractiveSentence";
import { LearningPanel } from "@/components/reader/LearningPanel";
import { VocabDetailModal } from "@/components/reader/VocabDetailModal";
import { GrammarDetailModal } from "@/components/reader/GrammarDetailModal";
import { SentenceActionSheet } from "@/components/reader/SentenceActionSheet";
import { SelectionLookupBubble } from "@/components/reader/SelectionLookupBubble";
import { SelectionLookupModal, LookupRequest } from "@/components/reader/SelectionLookupModal";
import { RelatedRail } from "@/components/reader/RelatedRail";
import { ContextGuessModal } from "@/components/reader/ContextGuessModal";
import { ReadingCheckpointCard } from "@/components/reader/ReadingCheckpointCard";
import { SentenceStructureModal } from "@/components/reader/SentenceStructureModal";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { notify } from "@/components/ui";
import {
  ArrowLeft,
  Bookmark,
  ExternalLink,
  Clock,
  Sparkles,
  Languages,
  Eye,
  Type,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Brain,
  BookOpen,
  Award,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  Check,
  Volume2,
  Search,
  X,
} from "lucide-react";

export default function SmartReaderPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = Number(params.id);

  const [content, setContent] = useState<ReaderContent | null>(null);
  const [relatedItems, setRelatedItems] = useState<FeedItem[]>([]);
  const [activeAI, setActiveAI] = useState<ActiveAIModel | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiSearchQuery, setAiSearchQuery] = useState("");
  const [aiProviders, setAiProviders] = useState<AIProviderMeta[]>([]);
  const [aiModels, setAiModels] = useState<AIModelMeta[]>([]);
  const [aiLoadingList, setAiLoadingList] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [checkpoints, setCheckpoints] = useState<ReadingCheckpoint[]>([]);
  const [isGeneratingCheckpoints, setIsGeneratingCheckpoints] = useState(false);
  const [checkpointError, setCheckpointError] = useState<string | null>(null);
  const [resumePoint, setResumePoint] = useState<ResumeCheckpoint | null>(null);
  const [isResumeDismissed, setIsResumeDismissed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [refetchMessage, setRefetchMessage] = useState<string | null>(null);

  // User reading preferences
  const [fontSize, setFontSize] = useState<number>(19);
  const [furiganaMode, setFuriganaMode] = useState<FuriganaMode>("always");
  const [readingMode, setReadingMode] = useState<ReadingMode>("natural");
  const [challengeMode, setChallengeMode] = useState<ChallengeMode>("deep_read");
  const [showTranslation, setShowTranslation] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);

  // Active interactive states
  const [activeSentence, setActiveSentence] = useState<AnnotatedSentence | null>(null);
  const [selectedVocab, setSelectedVocab] = useState<ContentVocabulary | null>(null);
  const [selectedGrammar, setSelectedGrammar] = useState<ContentGrammar | null>(null);
  const [selectionLookup, setSelectionLookup] = useState<LookupRequest | null>(null);
  // Sentence text owning the current lookup (Tra từ) — used as modal context
  // WITHOUT opening SentenceActionSheet (sheet opens only via "Xem câu").
  const [lookupSentenceText, setLookupSentenceText] = useState<string | null>(null);

  // Scope ref for the free-selection lookup bubble (article column only)
  const articleRef = useRef<HTMLElement | null>(null);

  // Phase 5 Modals
  const [activeContextGuess, setActiveContextGuess] = useState<ContextGuessResponse | null>(null);
  const [decomposingSentenceIndex, setDecomposingSentenceIndex] = useState<number | null>(null);

  // Reading progress tracking
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const maxProgressRef = useRef<number>(0);

  // On-demand full AI enrichment state (manual button only — no auto-run).
  const [isEnriching, setIsEnriching] = useState<boolean>(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);

  // Initialize preferences + active AI badge (non-blocking)
  useEffect(() => {
    const prefs = getUserPreferences();
    setFontSize(prefs.fontSize || 19);
    setFuriganaMode(prefs.furiganaMode || "always");
    setReadingMode(prefs.readingMode || "natural");
    setChallengeMode(prefs.challengeMode || "deep_read");
    setShowTranslation(prefs.showTranslation || false);
    immersionApi.getActiveAIModel().then((ai) => {
      if (ai) setActiveAI(ai);
    }).catch(() => {});
  }, []);

  // Fetch article reader content immediately (< 1-2s), then lazily load auxiliary items.
  // Enrichment runs ONLY via the manual button — never automatically on open.
  const loadContent = useCallback(async () => {
    if (!contentId) return;
    setIsLoading(true);
    try {
      // 1. Fetch main article content first to unblock UI immediately.
      // Pure DB read (no AI) — web text shows as soon as it arrives.
      const data = await immersionApi.getReaderContent(contentId);
      setContent(data);
      setIsSaved(data.is_saved);
      setProgressPercent(data.progress_percent || 0);
      maxProgressRef.current = data.progress_percent || 0;
      setIsLoading(false); // Render reader view immediately!

      // 2. Auxiliary data loaded in background without blocking reader
      immersionApi.getRelatedContent(contentId, 6)
        .then((related) => setRelatedItems(related || []))
        .catch((e) => console.warn("Related content notice:", e));

      immersionApi.getResumeCheckpoint(contentId)
        .then((resume) => setResumePoint(resume))
        .catch((e) => console.warn("Resume point notice:", e));

      const activeModelParam = activeAI ? `${activeAI.provider}:${activeAI.model}` : undefined;
      immersionApi.getCheckpoints(contentId, false, activeModelParam)
        .then((cps) => {
          setCheckpoints(cps || []);
          setCheckpointError(null);
        })
        .catch((e) => {
          console.warn("Checkpoints notice:", e);
          if (e?.message && (e.message.includes("AI") || e.message.includes("Lỗi"))) {
            setCheckpointError(e.message);
          }
        });
      return data;
    } catch (err) {
      console.error("Failed to load reader content:", err);
      setIsLoading(false);
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, activeAI]);

  // Manual collocation finder: scans the article's stored expressions and
  // saves them into the library (reuses the idempotent auto-collect API).
  // Never runs automatically — only when the user presses the button.
  const [isFindingExpressions, setIsFindingExpressions] = useState(false);
  const handleFindExpressions = useCallback(async () => {
    if (!contentId || isFindingExpressions) return;
    setIsFindingExpressions(true);
    try {
      const res = await immersionApi.autoCollectExpressions(contentId);
      if (res.saved > 0) {
        notify.success(`Đã lưu ${res.saved} cụm từ trong bài vào Thư viện!`);
      } else {
        notify.success("Bài này không có cụm từ đáng học.");
      }
    } catch (err: any) {
      console.warn("Find expressions notice:", err);
      notify.error(err?.message || "Không thể tìm cụm từ lúc này.");
    } finally {
      setIsFindingExpressions(false);
    }
  }, [contentId, isFindingExpressions]);

  // On-demand explicit generation/regeneration of checkpoints using active header model
  const handleGenerateCheckpoints = async (force: boolean = false) => {
    if (!contentId || isGeneratingCheckpoints) return;
    setIsGeneratingCheckpoints(true);
    setCheckpointError(null);
    try {
      const activeModelParam = activeAI ? `${activeAI.provider}:${activeAI.model}` : undefined;
      const cps = await immersionApi.getCheckpoints(contentId, force, activeModelParam);
      setCheckpoints(cps || []);
      notify.success("Đã tạo câu hỏi kiểm tra đọc hiểu thành công!");
    } catch (err: any) {
      console.error("Failed to generate checkpoints:", err);
      const msg = err?.message || `Không thể tạo điểm dừng đọc hiểu bằng AI (${activeAI?.providerDisplay || "AI"} - ${activeAI?.model || "model"}).`;
      setCheckpointError(msg);
      notify.error(msg);
    } finally {
      setIsGeneratingCheckpoints(false);
    }
  };

  // On-demand deep refetch full article content from target source
  const handleRefetch = async () => {
    if (!contentId || isRefetching) return;
    setIsRefetching(true);
    setRefetchMessage(null);
    try {
      const refreshed = await immersionApi.refetchContent(contentId);
      setContent(refreshed);
      setRefetchMessage("Đã cào và cập nhật toàn bộ bài viết chi tiết thành công!");
      setTimeout(() => setRefetchMessage(null), 4000);
      const activeModelParam = activeAI ? `${activeAI.provider}:${activeAI.model}` : undefined;
      immersionApi.getCheckpoints(contentId, true, activeModelParam).then(setCheckpoints).catch(() => {});
    } catch (err: any) {
      console.error("Failed to refetch content:", err);
      setRefetchMessage(err.message || "Không thể cào lại nội dung từ nguồn gốc.");
      setTimeout(() => setRefetchMessage(null), 5000);
    } finally {
      setIsRefetching(false);
    }
  };

  // On-demand full AI enrichment (extract vocabulary, grammar, summary, furigana).
  // Manual button is the ONLY trigger — nothing auto-runs on article open.
  const handleEnrich = async () => {
    if (!contentId || isEnriching) return;
    setIsEnriching(true);
    setEnrichError(null);
    setRefetchMessage("Đang kích hoạt AI trích xuất từ vựng, ngữ pháp & phân tích bài viết...");
    try {
      await immersionApi.reEnrichContent(contentId, {
        task: "FULL_ENRICHMENT",
        force: true,
        model_provider: activeAI?.provider,
        model_name: activeAI?.model,
      });
      await loadContent();
      try {
        const activeModelParam = activeAI ? `${activeAI.provider}:${activeAI.model}` : undefined;
        const cps = await immersionApi.getCheckpoints(contentId, true, activeModelParam);
        setCheckpoints(cps);
      } catch (cpErr) {
        console.warn("Checkpoint refresh notice:", cpErr);
      }
      setRefetchMessage("Đã trích xuất toàn bộ từ vựng, ngữ pháp và phân tích AI thành công!");
      setTimeout(() => setRefetchMessage(null), 4000);
    } catch (err: any) {
      console.error("Failed to re-enrich content:", err);
      const msg = err.message || "Lỗi khi trích xuất dữ liệu bằng AI.";
      setEnrichError(msg);
      setRefetchMessage(msg);
      notify.error(msg);
      setTimeout(() => setRefetchMessage(null), 6000);
    } finally {
      setIsEnriching(false);
    }
  };

  useEffect(() => {
    loadContent();
    startTimeRef.current = Date.now();
  }, [loadContent]);

  // Scroll listener for reading progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;

      const current = Math.min(100, Math.max(0, Math.round((scrollY / docHeight) * 100)));
      if (current > maxProgressRef.current) {
        maxProgressRef.current = current;
        setProgressPercent(current);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Debounced progress sync to API
  useEffect(() => {
    if (!contentId || progressPercent <= 0) return;
    const timeout = setTimeout(() => {
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
      immersionApi.updateReadingProgress(contentId, {
        progress_percent: progressPercent,
        last_sentence_index: activeSentence?.sentence_index || 1,
        time_spent_seconds: timeSpent,
        completed: progressPercent >= 90,
      }).catch((err) => console.error("Progress sync error:", err));
    }, 2000);

    return () => clearTimeout(timeout);
  }, [contentId, progressPercent, activeSentence]);

  // Preferences change handlers
  const handleFuriganaChange = (mode: FuriganaMode) => {
    setFuriganaMode(mode);
    saveUserPreferences({ furiganaMode: mode });
  };

  const handleChallengeModeToggle = () => {
    const nextMode: ChallengeMode = challengeMode === "deep_read" ? "relaxed" : "deep_read";
    setChallengeMode(nextMode);
    saveUserPreferences({ challengeMode: nextMode });

    if (nextMode === "deep_read") {
      setShowTranslation(false);
      setFuriganaMode("hover");
    } else {
      setFuriganaMode("always");
    }
  };

  const handleTranslationToggle = () => {
    const next = !showTranslation;
    setShowTranslation(next);
    saveUserPreferences({ showTranslation: next });
  };

  const handleFontSizeChange = (delta: number) => {
    setFontSize((prev) => {
      const next = Math.max(14, Math.min(34, prev + delta));
      // Persist outside the updater (updaters must stay pure; React may
      // double-invoke them in StrictMode, which previously broke this control).
      queueMicrotask(() => saveUserPreferences({ fontSize: next }));
      return next;
    });
  };

  const handleFontSizeReset = () => {
    setFontSize(19);
    saveUserPreferences({ fontSize: 19 });
  };

  const handleSaveToggle = async () => {
    if (!content) return;
    const next = !isSaved;
    setIsSaved(next);
    try {
      await immersionApi.toggleSaveContent(content.content_id, next);
    } catch (err) {
      console.error("Save toggle error:", err);
      setIsSaved(!next);
    }
  };
  // When user clicks a vocabulary token
  const handleVocabClick = async (vocab: ContentVocabulary) => {
    if (challengeMode === "deep_read") {
      // In Deep Read mode: Open 3-Stage Context Guessing first!
      try {
        const guess = await immersionApi.getContextGuess(
          contentId,
          vocab.id,
          activeSentence?.sentence_index
        );
        setActiveContextGuess(guess);
      } catch {
        // Fallback to direct modal
        setSelectedVocab(vocab);
      }
    } else {
      setSelectedVocab(vocab);
    }
  };

  // When user taps the free-selection bubble: match enrichment first (0 tokens),
  // fall back to AI lookup only when the text is not in the analyzed vocab/grammar.
  // NOTE: "Tra từ" must NEVER open SentenceActionSheet — only "Xem câu" does that
  // via handleOpenSentenceFromSelection below. We only stash the owner sentence
  // text for modal context (ENCOUNTERED logging / AI prompt).
  const handleSelectionLookup = (query: string, context: string) => {
    if (!content) return;
    const q = query.replace(/\s+/g, "").trim();

    let matchedSentence = content.sentences?.find((s) => s.text.replace(/\s+/g, "").includes(q)) || null;

    const allVocab = (content.sentences || []).flatMap((s) =>
      (s.vocabularies || []).map((v) => ({ v, s }))
    );
    const vocabHit = allVocab.find(
      ({ v }) => v.surface_form.replace(/\s+/g, "") === q || v.normalized_form.replace(/\s+/g, "") === q
    );
    if (vocabHit) {
      const ownerSentence =
        content.sentences?.find((s) => s.id === vocabHit.v.source_sentence_id) ||
        matchedSentence;
      setLookupSentenceText(ownerSentence?.text ?? matchedSentence?.text ?? context ?? null);
      setSelectedVocab(vocabHit.v);
      return;
    }

    const allGrammar = (content.sentences || []).flatMap((s) =>
      (s.grammars || []).map((g) => ({ g, s }))
    );
    const grammarHit = allGrammar.find(({ g }) => g.pattern.replace(/\s+/g, "") === q);
    if (grammarHit) {
      const ownerSentence = matchedSentence || grammarHit.s;
      setLookupSentenceText(ownerSentence?.text ?? context ?? null);
      setSelectedGrammar(grammarHit.g);
      return;
    }

    setLookupSentenceText(matchedSentence?.text ?? context ?? null);
    // Ngữ cảnh tối thiểu cho tra nhanh: ưu tiên câu chứa từ (~200 ký tự),
    // không gửi cả block/bài báo → lookup quick trả nghĩa trong 1-2s.
    const minimalContext = (matchedSentence?.text || context || "").slice(0, 200);
    setSelectionLookup({ query: query.trim(), context: minimalContext });
  };

  // Bubble action 2: open the SentenceActionSheet of the sentence owning the selection.
  // Verifies the found sentence actually contains the selected text (normalized);
  // falls back to text search so a stale/wrong sheet is never opened.
  const handleOpenSentenceFromSelection = (sentenceIndex: number | null, query: string) => {
    if (!content || sentenceIndex == null) return;
    const norm = (t: string) => t.replace(/\s+/g, "");
    const q = norm(query);
    const sentences = content.sentences || [];
    let target = sentences.find((s) => s.sentence_index === sentenceIndex);
    if (!target || !norm(target.text).includes(q)) {
      target = sentences.find((s) => norm(s.text).includes(q));
    }
    if (target) setActiveSentence(target);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sumi-950 flex flex-col items-center justify-center p-6 text-sumi-400">
        <RotateCw className="w-8 h-8 animate-spin text-torii-500 mb-3" />
        <p className="text-sm font-medium">Đang tải và chuẩn bị bài đọc thông minh...</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-sumi-950 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Không tìm thấy nội dung bài đọc</h2>
        <p className="text-xs text-sumi-400 mb-4">Bài đọc có thể đã bị gỡ hoặc chưa hoàn thành phân tích AI.</p>
        <Link
          href="/immersion"
          className="px-4 py-2 rounded-xl bg-torii-500 text-white text-xs font-semibold"
        >
          Quay lại Immersion Feed
        </Link>
      </div>
    );
  }

  const furiganaClass =
    furiganaMode === "always"
      ? "furigana-mode-always"
      : furiganaMode === "hover"
      ? "furigana-mode-hover"
      : "furigana-mode-off";

  return (
    <div className="min-h-screen bg-sumi-950 text-sumi-100 flex flex-col">
      {/* Top Sticky Toolbar */}
      <header className="sticky top-0 z-40 bg-sumi-950/90 backdrop-blur-xl border-b border-sumi-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 gap-3">
          {/* Left: Back + Attribution */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/immersion"
              className="p-2 rounded-xl bg-sumi-900 border border-sumi-800 text-sumi-400 hover:text-white hover:bg-sumi-850 transition-colors flex-shrink-0"
              title="Về danh sách bài đọc"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="truncate hidden sm:block">
              <span className="text-xs font-semibold text-sumi-200 truncate block">
                {content.source_name}
              </span>
              <span className="text-[10px] text-sumi-500 block truncate max-w-[200px]">
                {content.title}
              </span>
            </div>
          </div>

          {/* Center: Controls (Challenge Mode, Furigana, Translation, Font Size) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Challenge Mode Switch (Relaxed vs Deep Read) */}
            <button
              onClick={handleChallengeModeToggle}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                challengeMode === "deep_read"
                  ? "bg-amber-950/70 text-amber-300 border-amber-600/70 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                  : "bg-sumi-900 text-sumi-300 border-sumi-800 hover:text-white"
              }`}
              title={
                challengeMode === "deep_read"
                  ? "Đang ở chế độ Đọc Sâu: ẩn dịch, kích hoạt đoán nghĩa và checkpoints"
                  : "Đang ở chế độ Thư Giãn: đọc tự nhiên, mở từ điển trực tiếp"
              }
            >
              {challengeMode === "deep_read" ? (
                <>
                  <Brain className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Đọc Sâu</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">Thư Giãn</span>
                </>
              )}
            </button>

            {/* Furigana Mode Selector */}
            <div className="flex items-center p-0.5 rounded-lg bg-sumi-900 border border-sumi-800 text-xs">
              <button
                onClick={() => handleFuriganaChange("always")}
                className={`px-2 py-1 rounded font-medium text-[11px] transition-colors ${
                  furiganaMode === "always"
                    ? "bg-torii-500 text-white font-bold"
                    : "text-sumi-400 hover:text-sumi-200"
                }`}
                title="Luôn hiển thị Furigana phiên âm"
              >
                Furigana
              </button>
              <button
                onClick={() => handleFuriganaChange("hover")}
                className={`px-2 py-1 rounded font-medium text-[11px] transition-colors ${
                  furiganaMode === "hover"
                    ? "bg-torii-500 text-white font-bold"
                    : "text-sumi-400 hover:text-sumi-200"
                }`}
                title="Chỉ hiện Furigana khi rê chuột hoặc chạm"
              >
                Hover
              </button>
              <button
                onClick={() => handleFuriganaChange("off")}
                className={`px-2 py-1 rounded font-medium text-[11px] transition-colors ${
                  furiganaMode === "off"
                    ? "bg-torii-500 text-white font-bold"
                    : "text-sumi-400 hover:text-sumi-200"
                }`}
                title="Tắt toàn bộ Furigana"
              >
                Tắt
              </button>
            </div>

            {/* Translation Toggle */}
            <button
              onClick={handleTranslationToggle}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                showTranslation
                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700/60 font-semibold"
                  : "bg-white dark:bg-sumi-900 text-slate-700 dark:text-sumi-400 border-slate-300 dark:border-sumi-800 hover:text-slate-900 dark:hover:text-sumi-200"
              }`}
              title="Bật/Tắt dịch câu song ngữ"
            >
              <Languages className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Song ngữ</span>
            </button>

            {/* Font Size Adjuster */}
            <div className="hidden lg:flex items-center p-0.5 rounded-lg bg-white dark:bg-sumi-900 border border-slate-300 dark:border-sumi-800 text-xs">
              <button
                onClick={() => handleFontSizeChange(-1)}
                className="px-2 py-1 text-slate-700 dark:text-sumi-400 hover:text-slate-950 dark:hover:text-white font-serif disabled:opacity-40"
                disabled={fontSize <= 14}
                title="Giảm cỡ chữ"
                aria-label="Giảm cỡ chữ"
              >
                A-
              </button>
              <button
                onClick={handleFontSizeReset}
                className="px-1 text-[10px] text-slate-600 dark:text-sumi-500 font-mono hover:text-slate-950 dark:hover:text-white"
                title="Đặt lại cỡ chữ mặc định (19px)"
              >
                {fontSize}px
              </button>
              <button
                onClick={() => handleFontSizeChange(1)}
                className="px-2 py-1 text-slate-700 dark:text-sumi-400 hover:text-slate-950 dark:hover:text-white font-serif disabled:opacity-40"
                disabled={fontSize >= 34}
                title="Tăng cỡ chữ"
                aria-label="Tăng cỡ chữ"
              >
                A+
              </button>
            </div>
          </div>

          {/* Right: Save & Toggle Panel */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Active AI provider + model quick-switch */}
            {activeAI && (
              <div className="hidden md:block relative">
                <button
                  onClick={() => {
                    setAiOpen((v) => !v);
                    setAiError(null);
                    if (aiProviders.length === 0 && !aiLoadingList) {
                      setAiLoadingList(true);
                      Promise.all([immersionApi.getAIProviders(), immersionApi.getAIModels()])
                        .then(([provs, models]) => {
                          setAiProviders(provs || []);
                          setAiModels(models || []);
                        })
                        .catch(() => {})
                        .finally(() => setAiLoadingList(false));
                    }
                  }}
                  title="AI đang dùng cho dịch, giải thích câu và quiz. Bấm để đổi model ngay tại đây."
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-sumi-900 border border-slate-300 dark:border-sumi-800 text-slate-700 dark:text-sumi-400 hover:text-slate-950 dark:hover:text-white hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all max-w-[220px]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                  <span className="text-[10px] font-mono font-semibold truncate">
                    {aiSaving ? "Đang đổi..." : `${activeAI.providerDisplay} · ${activeAI.modelName || activeAI.model}`}
                  </span>
                  <ChevronDown className="w-3 h-3 flex-shrink-0 opacity-70" />
                </button>

                {aiOpen && (
                  <>
                    <button
                      aria-label="Đóng chọn AI"
                      className="fixed inset-0 z-40 cursor-default bg-transparent border-0 p-0"
                      onClick={() => {
                        setAiOpen(false);
                        setAiSearchQuery("");
                      }}
                    />
                    <div className="absolute right-0 top-full mt-2 z-50 w-80 max-h-96 flex flex-col rounded-xl bg-white dark:bg-sumi-900 border border-slate-200 dark:border-sumi-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      <div className="p-2 border-b border-slate-200 dark:border-sumi-800 space-y-1.5 bg-slate-50/70 dark:bg-sumi-950/60">
                        <div className="px-1 text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-sumi-400 font-bold">
                          Đổi AI (áp dụng toàn bộ tính năng)
                        </div>
                        {/* Search model input */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-sumi-500 absolute left-2.5 top-2.5" />
                          <input
                            type="text"
                            value={aiSearchQuery}
                            onChange={(e) => setAiSearchQuery(e.target.value)}
                            placeholder="Tìm kiếm mô hình (vd: flash, llama)..."
                            className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-white dark:bg-sumi-850 border border-slate-300 dark:border-sumi-750 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-sumi-500 outline-none focus:border-indigo-500 font-medium"
                          />
                          {aiSearchQuery && (
                            <button
                              onClick={() => setAiSearchQuery("")}
                              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
                              title="Xóa tìm kiếm"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-2 space-y-2 overflow-y-auto flex-1 max-h-64">
                        {aiLoadingList && (
                          <div className="px-2 py-4 text-xs text-slate-500 dark:text-sumi-400 text-center">Đang tải danh sách model...</div>
                        )}
                        {!aiLoadingList && (() => {
                          const query = aiSearchQuery.toLowerCase().trim();
                          const filtered = aiModels.filter((m) => {
                            if (!query) return true;
                            return (
                              (m.name && m.name.toLowerCase().includes(query)) ||
                              m.id.toLowerCase().includes(query) ||
                              m.provider.toLowerCase().includes(query)
                            );
                          });

                          if (filtered.length === 0) {
                            return (
                              <div className="py-6 text-center text-xs text-slate-500 dark:text-sumi-400">
                                Không tìm thấy model nào phù hợp.
                              </div>
                            );
                          }

                          return aiProviders.filter((p) => p.name !== "mock").map((p) => {
                            const pModels = filtered.filter((m) => m.provider.toLowerCase() === p.name.toLowerCase());
                            if (pModels.length === 0) return null;

                            return (
                              <div key={p.name} className="space-y-0.5">
                                <div className="px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-sumi-300 flex items-center justify-between">
                                  <span>{p.display_name}</span>
                                  {!p.configured && p.requires_key && (
                                    <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400">(chưa có key)</span>
                                  )}
                                </div>
                                {pModels.map((m) => {
                                  const isActive = activeAI.provider.toLowerCase() === p.name.toLowerCase()
                                    && activeAI.model === m.id;
                                  return (
                                    <button
                                      key={m.id}
                                      disabled={aiSaving}
                                      onClick={async () => {
                                        setAiSaving(true);
                                        setAiError(null);
                                        try {
                                          await immersionApi.selectAIModel(p.name, m.id);
                                          const refreshed = await immersionApi.getActiveAIModel();
                                          if (refreshed) setActiveAI(refreshed);
                                          setAiOpen(false);
                                          setAiSearchQuery("");
                                        } catch (err: any) {
                                          setAiError(err?.message || "Đổi model thất bại.");
                                        } finally {
                                          setAiSaving(false);
                                        }
                                      }}
                                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors disabled:opacity-50 ${
                                        isActive
                                          ? "bg-indigo-100 dark:bg-indigo-500/15 text-indigo-900 dark:text-indigo-200 font-semibold"
                                          : "text-slate-700 dark:text-sumi-300 hover:bg-slate-100 dark:hover:bg-sumi-800"
                                      }`}
                                    >
                                      {isActive && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                                      <span className="font-mono truncate">{m.name || m.id}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          });
                        })()}

                        {aiError && (
                          <div className="px-2 py-1.5 text-[11px] text-rose-600 dark:text-rose-400">{aiError}</div>
                        )}
                      </div>

                      <div className="p-2 border-t border-slate-200 dark:border-sumi-800 bg-slate-50/50 dark:bg-sumi-950/40">
                        <Link
                          href="/enrichment"
                          className="block px-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                          onClick={() => {
                            setAiOpen(false);
                            setAiSearchQuery("");
                          }}
                        >
                          Mở trang Cài đặt AI →
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Quick Theme Switcher */}
            <ThemeSwitcher compact />

            <button
              onClick={handleSaveToggle}
              className={`p-2 rounded-xl border transition-all ${
                isSaved
                  ? "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-500/40"
                  : "bg-white dark:bg-sumi-900 text-slate-700 dark:text-sumi-400 border-slate-300 dark:border-sumi-800 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-sumi-850"
              }`}
              title={isSaved ? "Bỏ lưu bài này" : "Lưu vào bài đọc yêu thích"}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? "fill-amber-500 dark:fill-amber-400 text-amber-600 dark:text-amber-400" : ""}`} />
            </button>

            <button
              onClick={() => setIsPanelOpen(!isPanelOpen)}
              className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all ${
                isPanelOpen
                  ? "bg-amber-100 dark:bg-kintsugi-500/20 text-amber-800 dark:text-kintsugi-300 border-amber-300 dark:border-kintsugi-500/40 font-semibold"
                  : "bg-white dark:bg-sumi-900 text-slate-700 dark:text-sumi-400 border-slate-300 dark:border-sumi-800 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-sumi-850"
              }`}
              title="Bật/Tắt bảng học tập & Trợ lý AI"
            >
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-kintsugi-400" />
              <span className="hidden sm:inline">Góc học tập</span>
            </button>
          </div>
        </div>

        {/* Persistent Reading Progress Bar */}
        <div className="w-full h-1 bg-sumi-900 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-torii-500 to-amber-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* Main Body: Center Zen Reader + Right Collapsible Learning Panel */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto overflow-hidden">
        {/* CENTER ZEN READER COLUMN */}
        <main ref={articleRef} className="flex-1 overflow-y-auto px-4 sm:px-8 py-10 max-w-3xl mx-auto w-full">
          {/* Weak-point resume banner */}
          {resumePoint?.has_unclear_sentence && !isResumeDismissed && (
            <div className="mb-6 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/40 flex items-center justify-between gap-3 animate-in fade-in duration-200 shadow-sm">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <span className="text-xs text-amber-900 dark:text-amber-200 truncate font-medium">
                  {resumePoint.message}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    const target = content.sentences.find(
                      (s) => s.sentence_index === resumePoint.unclear_sentence_index
                    );
                    if (target) setActiveSentence(target);
                    setIsResumeDismissed(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-bold transition-colors shadow-sm"
                >
                  Xem lại câu
                </button>
                <button
                  onClick={() => setIsResumeDismissed(true)}
                  className="text-xs text-amber-700 hover:text-amber-900 dark:text-sumi-400 dark:hover:text-white"
                >
                  Bỏ qua
                </button>
              </div>
            </div>
          )}

          {/* Article Meta Bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-sumi-400 mb-4 pb-3 border-b border-slate-200 dark:border-sumi-800/60 font-mono">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-sumi-500" />
              ~{content.reading_time_minutes} phút đọc
            </span>
            {content.author && <span>&bull; Tác giả: {content.author}</span>}
            {content.published_at && (
              <span>&bull; {new Date(content.published_at).toLocaleDateString("ja-JP")}</span>
            )}
            <div className="ml-auto flex items-center gap-2">
              {content.source_url && (
                <button
                  onClick={handleRefetch}
                  disabled={isRefetching}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-sumi-900 border border-slate-300 dark:border-sumi-800 text-slate-800 dark:text-sumi-300 hover:text-torii-600 dark:hover:text-torii-400 hover:border-torii-500/40 hover:bg-torii-50 dark:hover:bg-torii-950/30 transition-all group disabled:opacity-50 font-medium"
                  title="Truy cập URL gốc để bóc tách lại toàn bộ bài viết chi tiết và phân tích câu"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin text-torii-500 dark:text-torii-400" : "group-hover:rotate-180 transition-transform"}`} />
                  <span className="text-[11px] font-medium">{isRefetching ? "Đang cào lại..." : "Cào lại nội dung"}</span>
                </button>
              )}
              {content.source_url && (
                <a
                  href={content.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-sumi-900 border border-slate-300 dark:border-sumi-800 text-slate-800 dark:text-sumi-400 hover:text-torii-600 dark:hover:text-torii-400 hover:border-torii-500/40 hover:bg-torii-50 dark:hover:bg-torii-950/30 transition-all group font-medium"
                  title={`Đọc bài viết gốc trên ${content.source_name}`}
                >
                  <ExternalLink className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-medium">Xem bài viết gốc</span>
                </a>
              )}
            </div>
          </div>

          {/* Article Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif text-slate-900 dark:text-white tracking-wide leading-snug mb-6">
            {content.title}
          </h1>

          {/* Cover image (hotlinked original) */}
          {(content.image_url || content.images?.[0]?.url) && (
            <figure className="mb-8 overflow-hidden rounded-2xl border border-slate-200 dark:border-sumi-800 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={content.image_url || content.images?.[0]?.url}
                alt={content.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).closest("figure")?.remove();
                }}
                className="w-full max-h-[420px] object-cover"
              />
              {(content.images?.[0]?.caption || content.images?.[0]?.credit) && (
                <figcaption className="px-4 py-2.5 text-[11px] text-slate-600 dark:text-sumi-400 leading-relaxed bg-slate-50 dark:bg-sumi-900/60">
                  {content.images?.[0]?.caption}
                  {content.images?.[0]?.credit && (
                    <span className="block text-[10px] font-mono opacity-80">{content.images?.[0]?.credit}</span>
                  )}
                </figcaption>
              )}
            </figure>
          )}

          {/* Native Audio Player (e.g. NHK News Web Easy Audio) */}
          {content.audio_url && (
            <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-torii-500/10 via-amber-500/10 to-indigo-500/10 border border-torii-200/60 dark:border-torii-800/40 backdrop-blur-sm shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-torii-500/20 text-torii-600 dark:text-torii-400 flex items-center justify-center flex-shrink-0">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 dark:text-sumi-200 truncate">
                    Phát âm bản ngữ (Native Audio)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-sumi-400 truncate">
                    Nghe phát thanh viên Nhật Bản đọc bài viết
                  </div>
                </div>
              </div>
              <audio
                controls
                preload="metadata"
                className="w-full sm:w-72 h-9 rounded-lg flex-shrink-0"
                src={content.audio_url}
              >
                Trình duyệt của bạn không hỗ trợ phát audio.
              </audio>
            </div>
          )}

          {/* Feedback Toast Notification */}
          {refetchMessage && (
            <div className="mb-6 p-3 rounded-xl bg-torii-50 dark:bg-torii-950/40 border border-torii-200 dark:border-torii-500/40 text-xs text-torii-800 dark:text-torii-300 flex items-center gap-2 font-medium shadow-sm">
              <Sparkles className="w-4 h-4 text-torii-600 dark:text-torii-400 flex-shrink-0" />
              <span>{refetchMessage}</span>
            </div>
          )}

          {/* Smart Alert Banner if article is suspiciously short */}
          {content.source_url && (content.sentences?.length <= 1 || (content.content?.length || 0) < 300) && (
            <div className="mb-8 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 flex items-start gap-3 shadow-sm">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300 block mb-1">
                  Bài viết này có thể chỉ mới lưu đoạn mô tả ngắn từ trang chủ
                </span>
                <p className="text-xs text-slate-700 dark:text-sumi-300 leading-relaxed mb-3">
                  Nội dung hiện tại chỉ có {content.content?.length || 0} ký tự ({content.sentences?.length || 0} câu). Bạn có thể yêu cầu hệ thống truy cập URL gốc để cào lại toàn bộ bài viết chi tiết và tự động phân tích câu.
                </p>
                <button
                  onClick={handleRefetch}
                  disabled={isRefetching}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-sm"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin text-amber-600 dark:text-amber-300" : ""}`} />
                  <span>{isRefetching ? "Đang cào dữ liệu từ nguồn gốc..." : "Cào lại toàn bộ bài viết ngay"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Micro Summary Box if available */}
          {content.summaries?.micro && (
            <div className="mb-8 p-4 rounded-2xl bg-torii-50 dark:bg-torii-950/20 border border-torii-200 dark:border-torii-500/30 flex items-start gap-3 shadow-sm">
              <Sparkles className="w-5 h-5 text-torii-600 dark:text-torii-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-torii-700 dark:text-torii-400 font-mono block mb-0.5">
                  Tóm tắt nhanh
                </span>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                  {content.summaries.micro}
                </p>
              </div>
            </div>
          )}

          {/* Main Reading Text with Furigana, Sentences & Section Checkpoints */}
          <div
            className={`japanese-reader-content ${furiganaClass} space-y-5 leading-loose text-sumi-100 pt-2`}
            style={{ fontSize: `${fontSize}px`, lineHeight: "2.6" }}
          >
            {content.sentences?.length > 0 ? (
              <div className="space-y-4">
                {(() => {
                  const coverUrl = content.image_url || content.images?.[0]?.url;
                  const inlineImgs = (content.images || []).filter((im) => im.url !== coverUrl);
                  const total = content.sentences.length;
                  // Evenly interleave inline images across sentences (hotlink, no text mutation)
                  const slotFor = (idx: number) => {
                    if (inlineImgs.length === 0) return -1;
                    const step = Math.max(3, Math.floor(total / (inlineImgs.length + 1)));
                    if ((idx + 1) % step !== 0) return -1;
                    const k = Math.floor((idx + 1) / step) - 1;
                    return k >= 0 && k < inlineImgs.length ? k : -1;
                  };
                  return content.sentences.map((s, idx) => {
                    const matchingCheckpoint = checkpoints.find(
                      (cp) => cp.sentence_range_end === s.sentence_index
                    );
                    const imgIdx = slotFor(idx);
                    const inline = imgIdx >= 0 ? inlineImgs[imgIdx] : null;

                    return (
                      <React.Fragment key={s.id}>
                        <InteractiveSentence
                          sentence={s}
                          isActive={activeSentence?.id === s.id}
                          furiganaMode={furiganaMode}
                          showTranslation={showTranslation}
                          onSentenceClick={(sentence) => {
                            // Drag-selecting text also fires click on mouseup:
                            // let the lookup bubble own that gesture instead.
                            const sel = window.getSelection();
                            if (sel && !sel.isCollapsed && sel.toString().trim().length >= 2) return;
                            setActiveSentence(sentence);
                          }}
                          onVocabClick={handleVocabClick}
                          onGrammarClick={(grammar) => setSelectedGrammar(grammar)}
                        />

                        {inline && (
                          <figure className="my-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-sumi-800 shadow-sm">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={inline.url}
                              alt={inline.caption || `Ảnh minh họa ${imgIdx + 1}`}
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLImageElement).closest("figure")?.remove();
                              }}
                              className="w-full max-h-[420px] object-cover"
                            />
                            {(inline.caption || inline.credit) && (
                              <figcaption className="px-4 py-2.5 text-[11px] text-slate-600 dark:text-sumi-400 leading-relaxed bg-slate-50 dark:bg-sumi-900/60">
                                {inline.caption}
                                {inline.credit && (
                                  <span className="block text-[10px] font-mono opacity-80">{inline.credit}</span>
                                )}
                              </figcaption>
                            )}
                          </figure>
                        )}

                        {/* Embedded Reading Checkpoint if reached */}
                        {matchingCheckpoint && (
                          <ReadingCheckpointCard
                            contentId={contentId}
                            checkpoint={matchingCheckpoint}
                            onCheckpointsUpdated={(newCps) => setCheckpoints(newCps)}
                          />
                        )}
                      </React.Fragment>
                    );
                  });
                })()}
              </div>
            ) : (
              <p className="text-base text-sumi-300 whitespace-pre-line leading-loose">
                {content.content || content.excerpt}
              </p>
            )}
          </div>

          {/* Article End Divider & Progress Celebration */}
          <div className="mt-14 pt-8 border-t border-sumi-800 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-sumi-900 dark:text-white mb-1">
              Bạn đã hoàn thành bài đọc này!
            </h3>
            <p className="text-xs text-sumi-600 dark:text-sumi-400 max-w-sm mb-4">
              Nội dung đã được ghi nhận vào lịch sử đọc. Hãy làm bài kiểm tra đọc hiểu bên dưới hoặc khám phá các bài liên quan.
            </p>

            {/* Checkpoint Error Inline Banner */}
            {checkpointError && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50/95 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs w-full max-w-xl text-left shadow-sm animate-in fade-in">
                <div className="space-y-1 flex-1">
                  <div className="font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                    <span>Lỗi AI tạo Checkpoints ({activeAI?.providerDisplay || "AI"} · {activeAI?.modelName || activeAI?.model || "Model"})</span>
                  </div>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300/90 leading-relaxed">
                    {checkpointError}
                  </p>
                  <p className="text-[10px] text-sumi-500 italic">
                    💡 Hãy đổi sang model khác trên thanh Header phía trên nếu model này vượt quota hoặc bị từ chối.
                  </p>
                </div>
                <button
                  onClick={() => handleGenerateCheckpoints(true)}
                  disabled={isGeneratingCheckpoints}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 flex-shrink-0 text-xs self-end sm:self-center"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isGeneratingCheckpoints ? "animate-spin" : ""}`} />
                  <span>{isGeneratingCheckpoints ? "Đang gọi AI..." : "Thử lại"}</span>
                </button>
              </div>
            )}

            {/* Checkpoint banner if empty and article long enough */}
            {checkpoints.length === 0 && !checkpointError && (content.sentences?.length || 0) >= 4 && (
              <div className="mb-6 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-dashed border-indigo-200 dark:border-indigo-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs w-full max-w-xl text-left">
                <div className="space-y-0.5">
                  <div className="font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                    <Brain className="w-4 h-4 text-indigo-500" />
                    <span>Chưa có câu hỏi kiểm tra giữa bài (Checkpoints)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-400">
                    Tạo các điểm dừng đọc hiểu dọc bài viết bằng model đang chọn trên Header ({activeAI?.modelName || activeAI?.model || "AI"}).
                  </p>
                </div>
                <button
                  onClick={() => handleGenerateCheckpoints(false)}
                  disabled={isGeneratingCheckpoints}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 flex-shrink-0"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isGeneratingCheckpoints ? "animate-spin" : ""}`} />
                  <span>{isGeneratingCheckpoints ? "Đang tạo AI..." : "Tạo Checkpoints"}</span>
                </button>
              </div>
            )}

            {/* Phase 6: Reading Comprehension Quiz Card */}
            <div className="w-full my-6 p-6 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/90 dark:from-indigo-950/40 dark:via-zinc-900/80 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-500/40 shadow-md relative overflow-hidden text-left">
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 text-[11px] font-semibold border border-indigo-200 dark:border-indigo-500/30">
                    <Brain className="w-3.5 h-3.5" /> Kiểm tra đọc hiểu AI
                  </div>
                  <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Bạn đã thực sự nắm chắc nội dung bài viết này?
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-zinc-400 max-w-md">
                    Thử thách với bộ câu hỏi đọc hiểu bám sát bài đọc: kiểm tra ý chính, chi tiết, suy luận và từ vựng/ngữ pháp theo ngữ cảnh.
                  </p>
                </div>
                <Link
                  href={`/immersion/content/${contentId}/quiz`}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/25 flex-shrink-0"
                >
                  <Brain className="w-4 h-4" />
                  <span>Bắt đầu Quiz</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Prev / Next Navigation */}
            <div className="flex items-center gap-3">
              {content.prev_content_id && (
                <Link
                  href={`/immersion/content/${content.prev_content_id}`}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white dark:bg-sumi-900 hover:bg-slate-100 dark:hover:bg-sumi-850 border border-slate-300 dark:border-sumi-800 text-xs font-medium text-slate-800 dark:text-sumi-300 hover:text-slate-950 dark:hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Bài trước</span>
                </Link>
              )}
              {content.next_content_id && (
                <Link
                  href={`/immersion/content/${content.next_content_id}`}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-torii-500 hover:bg-torii-600 text-xs font-semibold text-white transition-all shadow-[0_0_15px_rgba(230,57,70,0.3)]"
                >
                  <span>Bài kế tiếp</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>

          {/* Related Articles Rail (hybrid-ranked with match reasons) */}
          <RelatedRail items={relatedItems} />
        </main>

        {/* RIGHT COLLAPSIBLE LEARNING PANEL (Tab 1: Tóm tắt, Tab 2: Từ vựng, Tab 3: Ngữ pháp, Tab 4: Trợ lý AI) */}
        <LearningPanel
          content={content}
          activeSentence={activeSentence}
          onClearActiveSentence={() => setActiveSentence(null)}
          onSelectVocab={(vocab) => setSelectedVocab(vocab)}
          onSelectGrammar={(grammar) => setSelectedGrammar(grammar)}
          isOpen={isPanelOpen}
          onToggle={() => setIsPanelOpen(!isPanelOpen)}
          onRefetch={handleRefetch}
          isRefetching={isRefetching}
          onEnrich={handleEnrich}
          isEnriching={isEnriching}
          enrichError={enrichError}
          onFindExpressions={handleFindExpressions}
          isFindingExpressions={isFindingExpressions}
          activeAI={activeAI}
        />
      </div>

      {/* MODALS & BOTTOM SHEETS */}
      <VocabDetailModal
        vocab={selectedVocab}
        onClose={() => {
          setSelectedVocab(null);
          setLookupSentenceText(null);
        }}
        contentId={content.content_id}
        sentenceText={activeSentence?.text ?? lookupSentenceText}
        sourceName={content.source_name}
        expressions={
          selectedVocab
            ? (content.all_expressions || []).filter((e) => {
                const forms = [selectedVocab.surface_form, selectedVocab.normalized_form]
                  .filter(Boolean)
                  .map((f) => f.replace(/\s+/g, ""));
                const expr = (e.expression || "").replace(/\s+/g, "");
                return forms.some((f) => f && (expr.includes(f) || f.includes(expr)));
              })
            : []
        }
      />

      <GrammarDetailModal
        grammar={selectedGrammar}
        onClose={() => {
          setSelectedGrammar(null);
          setLookupSentenceText(null);
        }}
        contentId={content.content_id}
        sentenceText={activeSentence?.text ?? lookupSentenceText}
        sourceName={content.source_name}
        modelProvider={activeAI ? `${activeAI.provider}:${activeAI.model}` : undefined}
      />

      <SentenceActionSheet
        contentId={content.content_id}
        sentence={activeSentence}
        onClose={() => setActiveSentence(null)}
        onSelectVocab={(vocab) => setSelectedVocab(vocab)}
        onSelectGrammar={(grammar) => setSelectedGrammar(grammar)}
        onDecomposeSentence={(sentenceIndex) => setDecomposingSentenceIndex(sentenceIndex)}
        onLookupExpression={(expression, sentenceText) => handleSelectionLookup(expression, sentenceText)}
        activeAI={activeAI}
      />

      {/* Phase 5 Context Guessing Modal (3-stage progressive reveal) */}
      <ContextGuessModal
        contentId={content.content_id}
        guessData={activeContextGuess}
        onClose={() => setActiveContextGuess(null)}
      />

      {/* Phase 5 Sentence Structure Decomposition Modal */}
      <SentenceStructureModal
        contentId={content.content_id}
        sentenceIndex={decomposingSentenceIndex}
        onClose={() => setDecomposingSentenceIndex(null)}
      />

      {/* Free-selection lookup: floating bubble scoped to the article column */}
      <SelectionLookupBubble
        scopeRef={articleRef}
        onLookup={handleSelectionLookup}
        onOpenSentence={handleOpenSentenceFromSelection}
      />

      {/* AI fallback modal (only when the selection is not in analyzed vocab/grammar) */}
      <SelectionLookupModal
        request={selectionLookup}
        contentId={content.content_id}
        sourceName={content.source_name}
        modelProvider={activeAI ? `${activeAI.provider}:${activeAI.model}` : undefined}
        onClose={() => {
          setSelectionLookup(null);
          setLookupSentenceText(null);
        }}
      />
    </div>
  );
}
