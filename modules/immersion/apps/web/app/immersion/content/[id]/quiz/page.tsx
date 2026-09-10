"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Lightbulb,
  BookOpen,
  RotateCcw,
  Sparkles,
  Award,
  ChevronRight,
  ChevronDown,
  Search,
  X,
  Check,
  Eye,
  AlertTriangle,
  Brain,
  Layers,
  PanelLeft,
  FileText,
  ListChecks,
} from "lucide-react";
import { api, immersionApi } from "@/lib/api";
import { notify, MarkdownRenderer } from "@/components/ui";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { ArticlePane } from "@/components/quiz/ArticlePane";
import {
  ReadingQuiz,
  QuizQuestionClient,
  QuizAttempt,
  SubmitAnswerResponse,
  CompleteQuizResponse,
  ReaderContent,
  AIProviderMeta,
  AIModelMeta,
  ActiveAIModel,
  AdaptiveNext,
} from "@/lib/types";

export default function QuizPage() {
  const params = useParams();
  const contentId = Number(params.id);

  // Loading & State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<ReadingQuiz | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);

  // Chế độ làm bài: đề chuẩn (toàn bộ câu) hoặc thích ứng CAT (từng câu).
  const [quizMode, setQuizMode] = useState<"static" | "adaptive">("static");
  const [adaptiveTheta, setAdaptiveTheta] = useState(0);
  const [adaptiveSe, setAdaptiveSe] = useState(1);
  const [adaptiveStopReason, setAdaptiveStopReason] = useState<string | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);

  // Đề bài (mới): fetch song song, lỗi không chặn quiz
  const [article, setArticle] = useState<ReaderContent | null>(null);
  const [articleLoading, setArticleLoading] = useState(true);
  const [articleError, setArticleError] = useState<string | null>(null);

  // Layout state
  const [mobileTab, setMobileTab] = useState<"article" | "question">("question");
  const [showArticle, setShowArticle] = useState(true);

  // Active AI state & Popover
  const [activeAI, setActiveAI] = useState<ActiveAIModel | null>(null);
  const activeAIRef = useRef(activeAI);
  useEffect(() => {
    activeAIRef.current = activeAI;
  }, [activeAI]);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiSearchQuery, setAiSearchQuery] = useState("");
  const [aiProviders, setAiProviders] = useState<AIProviderMeta[]>([]);
  const [aiModels, setAiModels] = useState<AIModelMeta[]>([]);
  const [aiLoadingList, setAiLoadingList] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Fetch active AI on mount
  useEffect(() => {
    api.getActiveAIModel()
      .then((ai) => {
        if (ai) setActiveAI(ai);
      })
      .catch(() => {});
  }, []);

  // Question navigation & interaction
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<"HIGH" | "MEDIUM" | "LOW">("HIGH");
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHintModal, setShowHintModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<SubmitAnswerResponse | null>(null);
  const [showSourceSentence, setShowSourceSentence] = useState(false);

  // Mode & Language Preferences
  const [showVietnamese, setShowVietnamese] = useState(true);
  const [startTime, setStartTime] = useState<number>(Date.now());

  // Completed results view
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState<CompleteQuizResponse | null>(null);

  const fetchArticle = useCallback(async () => {
    try {
      setArticleLoading(true);
      setArticleError(null);
      const art = await immersionApi.getReaderContent(contentId);
      setArticle(art);
    } catch (err: any) {
      setArticle(null);
      setArticleError(err?.message || "Không tải được đề bài.");
    } finally {
      setArticleLoading(false);
    }
  }, [contentId]);

  // Fetch quiz + đề bài song song (giữ nguyên contract BE)
  const initQuiz = useCallback(async (force = false, customModelParam?: string) => {
    try {
      setLoading(true);
      setError(null);
      const chosenModelParam = customModelParam ?? (activeAIRef.current ? `${activeAIRef.current.provider}:${activeAIRef.current.model}` : undefined);

      setArticleLoading(true);
      const [q, art] = await Promise.all([
        api.getOrCreateQuiz(contentId, force, chosenModelParam),
        immersionApi.getReaderContent(contentId).catch((err: any) => {
          setArticleError(err?.message || "Không tải được đề bài.");
          return null;
        }),
      ]);
      setQuiz(q);
      if (art) {
        setArticle(art);
        setArticleError(null);
      } else {
        setArticle((prev) => prev);
      }
      setArticleLoading(false);

      // Start or resume attempt (giữ nguyên mode RELAXED như cũ)
      const att = await api.startQuizAttempt(q.id, "RELAXED");
      setAttempt(att);
      setStartTime(Date.now());
      setCurrentIndex(0);
      setSelectedOptionId(null);
      setLastFeedback(null);
      setIsCompleted(false);
      setResult(null);
    } catch (err: any) {
      const errMsg = err?.message || "Không thể tải bài kiểm tra. Vui lòng thử lại sau.";
      setError(errMsg);
      setArticleLoading(false);
      notify.error(errMsg);
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    if (contentId) {
      initQuiz();
    }
  }, [contentId, initQuiz]);

  // Chế độ thích ứng CAT: mở attempt ADAPTIVE rồi lấy từng câu theo năng lực.
  const initAdaptiveQuiz = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setAdaptiveTheta(0);
      setAdaptiveSe(1);
      setAdaptiveStopReason(null);
      const [q, art] = await Promise.all([
        api.getOrCreateQuiz(contentId, false, undefined),
        immersionApi.getReaderContent(contentId).catch((err: any) => {
          setArticleError(err?.message || "Không tải được đề bài.");
          return null;
        }),
      ]);
      if (art) {
        setArticle(art);
        setArticleError(null);
      }
      setArticleLoading(false);
      const att = await api.startAdaptiveAttempt(q.id);
      setAttempt(att);
      const nxt: AdaptiveNext = await api.nextAdaptiveQuestion(att.id);
      if (nxt.done || !nxt.question) {
        setError("Chưa có câu hỏi thích ứng nào. Hãy thử đề chuẩn.");
        return;
      }
      setAdaptiveTheta(nxt.theta);
      setAdaptiveSe(nxt.se);
      setQuiz({ ...q, questions: [nxt.question], question_count: 1 });
      setStartTime(Date.now());
      setCurrentIndex(0);
      setSelectedOptionId(null);
      setLastFeedback(null);
      setIsCompleted(false);
      setResult(null);
    } catch (err: any) {
      const errMsg = err?.message || "Không thể bắt đầu chế độ thích ứng.";
      setError(errMsg);
      setArticleLoading(false);
      notify.error(errMsg);
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  const handleModeSwitch = (mode: "static" | "adaptive") => {
    if (mode === quizMode) return;
    setQuizMode(mode);
    setQuiz(null);
    setAttempt(null);
    if (mode === "adaptive") initAdaptiveQuiz();
    else initQuiz();
  };

  // Model selection handler
  const handleSelectModel = async (providerName: string, modelId: string) => {
    setAiSaving(true);
    setAiError(null);
    try {
      await api.selectAIModel(providerName, modelId);
      const refreshed = await api.getActiveAIModel();
      if (refreshed) {
        setActiveAI(refreshed);
        setAiOpen(false);
        setAiSearchQuery("");
        const newParam = `${refreshed.provider}:${refreshed.model}`;
        if (error || !quiz) {
          notify.info(`Đang tạo bài kiểm tra bằng ${refreshed.providerDisplay} · ${refreshed.model}...`);
          initQuiz(true, newParam);
        } else {
          notify.success(`Đã chuyển AI sang ${refreshed.providerDisplay} · ${refreshed.model}`);
        }
      }
    } catch (err: any) {
      const errMsg = err?.message || "Đổi model thất bại.";
      setAiError(errMsg);
      notify.error(errMsg);
    } finally {
      setAiSaving(false);
    }
  };

  // Render AI Model Selector Popover
  const renderAISelector = (align: "left" | "right" = "right") => {
    if (!activeAI) return null;
    return (
      <div className="relative">
        <button
          onClick={() => {
            setAiOpen((v) => !v);
            setAiError(null);
            if (aiProviders.length === 0 && !aiLoadingList) {
              setAiLoadingList(true);
              Promise.all([api.getAIProviders(), api.getAIModels()])
                .then(([provs, models]) => {
                  setAiProviders(provs || []);
                  setAiModels(models || []);
                })
                .catch(() => {})
                .finally(() => setAiLoadingList(false));
            }
          }}
          title="AI đang dùng cho bài kiểm tra. Bấm để đổi model."
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sumi-900 border border-sumi-800 text-sumi-300 hover:text-sumi-100 hover:border-indigo-500/50 transition-all text-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
          <span className="text-xs font-mono font-medium truncate max-w-[130px]">
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
            <div
              className={`absolute ${
                align === "left" ? "left-0" : "right-0"
              } top-full mt-2 z-50 w-80 max-h-96 flex flex-col rounded-xl bg-sumi-900 border border-sumi-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left`}
            >
              <div className="p-2 border-b border-sumi-800 space-y-1.5 bg-sumi-850/60">
                <div className="px-1 text-[10px] font-mono uppercase tracking-wider text-sumi-400 font-bold">
                  Đổi AI (áp dụng toàn bộ tính năng)
                </div>
                {/* Search model input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-sumi-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={aiSearchQuery}
                    onChange={(e) => setAiSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm mô hình (vd: flash, llama)..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-sumi-950 border border-sumi-800 text-xs text-sumi-100 placeholder:text-sumi-500 outline-none focus:border-indigo-500 font-medium"
                  />
                  {aiSearchQuery && (
                    <button
                      onClick={() => setAiSearchQuery("")}
                      className="absolute right-2 top-2 text-sumi-400 hover:text-sumi-200 p-0.5"
                      title="Xóa tìm kiếm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-2 space-y-2 overflow-y-auto flex-1 max-h-64">
                {aiLoadingList && (
                  <div className="px-2 py-4 text-xs text-sumi-400 text-center">Đang tải danh sách model...</div>
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
                      <div className="py-6 text-center text-xs text-sumi-400">
                        Không tìm thấy model nào phù hợp.
                      </div>
                    );
                  }

                  return aiProviders.filter((p) => p.name !== "mock").map((p) => {
                    const pModels = filtered.filter((m) => m.provider.toLowerCase() === p.name.toLowerCase());
                    if (pModels.length === 0) return null;

                    return (
                      <div key={p.name} className="space-y-0.5">
                        <div className="px-2 py-1 text-[11px] font-bold text-sumi-300 flex items-center justify-between">
                          <span>{p.display_name}</span>
                          {!p.configured && p.requires_key && (
                            <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400">(chưa có key)</span>
                          )}
                        </div>
                        {pModels.map((m) => {
                          const isActive =
                            activeAI.provider.toLowerCase() === p.name.toLowerCase() &&
                            activeAI.model === m.id;
                          return (
                            <button
                              key={m.id}
                              disabled={aiSaving}
                              onClick={() => handleSelectModel(p.name, m.id)}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors disabled:opacity-50 ${
                                isActive
                                  ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 font-semibold"
                                  : "text-sumi-300 hover:bg-sumi-850"
                              }`}
                            >
                              {isActive && <Check className="w-3.5 h-3.5 flex-shrink-0 text-indigo-500 dark:text-indigo-400" />}
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

              <div className="p-2 border-t border-sumi-800 bg-sumi-850/40">
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
    );
  };

  const currentQuestion: QuizQuestionClient | undefined = quiz?.questions[currentIndex];

  // Handle Option selection
  const handleSelectOption = (optId: number) => {
    if (lastFeedback) return; // Answer locked after submit
    setSelectedOptionId(optId);
  };

  // Keyboard shortcut listener (1-4 / A-D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentQuestion || lastFeedback || submitting) return;
      const key = e.key.toUpperCase();
      const options = currentQuestion.options;

      let targetIdx = -1;
      if (["1", "A"].includes(key) && options.length > 0) targetIdx = 0;
      else if (["2", "B"].includes(key) && options.length > 1) targetIdx = 1;
      else if (["3", "C"].includes(key) && options.length > 2) targetIdx = 2;
      else if (["4", "D"].includes(key) && options.length > 3) targetIdx = 3;

      if (targetIdx >= 0) {
        setSelectedOptionId(options[targetIdx].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentQuestion, lastFeedback, submitting]);

  // Submit single answer (giữ nguyên contract BE)
  const handleSubmitAnswer = async () => {
    if (!attempt || !currentQuestion || selectedOptionId === null || submitting) return;
    try {
      setSubmitting(true);
      const responseTime = Date.now() - startTime;
      const fb = await api.submitQuizAnswer(attempt.id, {
        question_id: currentQuestion.id,
        selected_option_id: selectedOptionId,
        confidence,
        response_time_ms: responseTime,
        hints_used: hintsUsed,
      });
      setLastFeedback(fb);
    } catch (err: any) {
      notify.error(err?.message || "Lỗi khi nộp câu trả lời.");
    } finally {
      setSubmitting(false);
    }
  };

  // Next question or finalize (adaptive: fetch next CAT question on demand)
  const handleNextOrFinish = async () => {
    if (!quiz || !attempt) return;
    if (quizMode === "adaptive" && currentIndex >= quiz.questions.length - 1 && !adaptiveStopReason) {
      try {
        setLoadingNext(true);
        const nxt: AdaptiveNext = await api.nextAdaptiveQuestion(attempt.id);
        setAdaptiveTheta(nxt.theta);
        setAdaptiveSe(nxt.se);
        if (nxt.done || !nxt.question) {
          setAdaptiveStopReason(nxt.stop_reason || "ALL_ANSWERED");
        } else {
          setQuiz((prev) =>
            prev ? { ...prev, questions: [...prev.questions, nxt.question!], question_count: prev.questions.length + 1 } : prev
          );
          setCurrentIndex((prev) => prev + 1);
          setSelectedOptionId(null);
          setLastFeedback(null);
          setHintsUsed(0);
          setShowSourceSentence(false);
          setStartTime(Date.now());
          return;
        }
      } catch (err: any) {
        notify.error(err?.message || "Không lấy được câu tiếp theo.");
        return;
      } finally {
        setLoadingNext(false);
      }
    } else if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOptionId(null);
      setLastFeedback(null);
      setHintsUsed(0);
      setShowSourceSentence(false);
      setStartTime(Date.now());
      return;
    }
    // Finish quiz
    try {
      setLoading(true);
      const res = await api.completeQuizAttempt(attempt.id);
      setResult(res);
      setIsCompleted(true);
      notify.success(
        quizMode === "adaptive" && adaptiveStopReason === "SE_THRESHOLD"
          ? "Đã đủ chính xác — kết thúc sớm bài thích ứng!"
          : "Bạn đã hoàn thành bài kiểm tra đọc hiểu!"
      );
    } catch (err: any) {
      notify.error(err?.message || "Lỗi khi hoàn tất bài kiểm tra.");
    } finally {
      setLoading(false);
    }
  };

  // Skill badge color helper (đủ 2 variant light/dark)
  const getSkillBadge = (skill: string) => {
    switch (skill) {
      case "DETAIL":
        return { label: "Chi tiết", color: "bg-blue-100 dark:bg-blue-500/10 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-500/30" };
      case "MAIN_IDEA":
        return { label: "Ý chính", color: "bg-purple-100 dark:bg-purple-500/10 text-purple-800 dark:text-purple-400 border-purple-300 dark:border-purple-500/30" };
      case "INFERENCE":
        return { label: "Suy luận", color: "bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-500/30" };
      case "VOCABULARY":
        return { label: "Từ vựng ngữ cảnh", color: "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30" };
      case "GRAMMAR":
        return { label: "Ngữ pháp", color: "bg-indigo-100 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-400 border-indigo-300 dark:border-indigo-500/30" };
      default:
        return { label: skill, color: "bg-sumi-850 text-sumi-300 border-sumi-800" };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-sumi-950 flex flex-col items-center justify-center p-6 text-sumi-100">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-ping" />
          <div className="w-16 h-16 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin flex items-center justify-center">
            <Brain className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
          </div>
        </div>
        <p className="text-sumi-200 font-medium text-lg">AI đang chuẩn bị bộ câu hỏi đọc hiểu...</p>
        <p className="text-sumi-400 text-sm mt-1">Trích xuất dẫn chứng, tải đề bài và cân chỉnh độ khó</p>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-sumi-950 flex flex-col items-center justify-center p-6 text-sumi-100">
        <div className="p-6 bg-sumi-900 border border-rose-300 dark:border-rose-500/30 rounded-2xl max-w-lg w-full text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-rose-500 dark:text-rose-400 mx-auto" />
          <div>
            <h2 className="text-lg font-semibold text-sumi-100">Không thể tải bài kiểm tra</h2>
            {activeAI && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full bg-sumi-850 border border-sumi-800 text-xs font-mono text-sumi-300">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                Model thất bại: <span className="text-rose-600 dark:text-rose-400 font-semibold">{activeAI.providerDisplay} · {activeAI.modelName || activeAI.model}</span>
              </div>
            )}
            <p className="text-sumi-400 text-sm mt-3 leading-relaxed break-words">{error}</p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={() => initQuiz(true)}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition shadow-lg shadow-indigo-600/20"
            >
              Thử lại với AI
            </button>
            <div className="w-full sm:w-auto flex justify-center">
              {renderAISelector("left")}
            </div>
            <Link
              href={`/immersion/content/${contentId}`}
              className="w-full sm:w-auto px-4 py-2 bg-sumi-850 hover:bg-sumi-800 text-sumi-200 border border-sumi-800 rounded-xl text-sm font-medium transition"
            >
              Trở về bài đọc
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Post-Quiz Assessment Dashboard View
  // ---------------------------------------------------------------------------
  if (isCompleted && result) {
    return (
      <div className="min-h-screen bg-sumi-950 text-sumi-100 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Award className="w-4 h-4" /> Báo cáo Đọc Hiểu Hoàn Tất
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-sumi-100 sm:text-4xl">
              Kết Quả Đánh Giá Đọc Hiểu
            </h1>
            <div className="text-sumi-300 text-sm max-w-lg mx-auto">
              <MarkdownRenderer content={result.ai_summary_feedback} />
            </div>
          </div>

          {/* Primary Score Banner */}
          <div className="bg-sumi-900 border border-sumi-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center divide-x divide-sumi-800">
              <div className="space-y-1">
                <span className="text-xs text-sumi-400 uppercase tracking-wider">Điểm số</span>
                <div className="text-3xl sm:text-4xl font-extrabold text-sumi-100">
                  {result.score_percentage}%
                </div>
                <span className="text-xs text-sumi-400">{result.score}/{result.max_score} điểm</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-sumi-400 uppercase tracking-wider">Độ chính xác</span>
                <div className="text-3xl sm:text-4xl font-extrabold text-emerald-700 dark:text-emerald-400">
                  {result.correct_count}/{result.question_count}
                </div>
                <span className="text-xs text-sumi-400">câu trả lời đúng</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-sumi-400 uppercase tracking-wider">Thời gian</span>
                <div className="text-3xl sm:text-4xl font-extrabold text-sumi-200">
                  {result.total_time_seconds ? `${Math.round(result.total_time_seconds / 60)}m` : "< 1m"}
                </div>
                <span className="text-xs text-sumi-400">tổng thời gian</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-sumi-400 uppercase tracking-wider">Tự tin đúng</span>
                <div className="text-3xl sm:text-4xl font-extrabold text-indigo-700 dark:text-indigo-400">
                  {result.confidence_pattern.CONFIDENT_CORRECT}
                </div>
                <span className="text-xs text-sumi-400">nắm chắc cốt lõi</span>
              </div>
            </div>
          </div>

          {/* Skill Radar / Breakdown */}
          <div className="bg-sumi-900 border border-sumi-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-sumi-200 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                Phân Tích Năng Lực Đọc Hiểu Theo Kỹ Năng
              </h2>
              <span className="text-xs text-sumi-400">Mục tiêu {">="} 80%</span>
            </div>

            <div className="space-y-3 pt-2">
              {Object.entries(result.skill_scores).map(([skill, score]) => {
                const badge = getSkillBadge(skill);
                return (
                  <div key={skill} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-sumi-200">{badge.label}</span>
                      <span className={score >= 80 ? "text-emerald-700 dark:text-emerald-400" : score >= 50 ? "text-amber-700 dark:text-amber-400" : "text-rose-700 dark:text-rose-400"}>
                        {score}%
                      </span>
                    </div>
                    <div className="w-full bg-sumi-850 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${Math.max(score, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Metacognition & Misconceptions Insights */}
          {result.confidence_pattern.CONFIDENT_WRONG > 0 && (
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-400 font-semibold text-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                Điểm Mù Nhận Thức (Confident Wrong Detected)
              </div>
              <p className="text-xs text-sumi-200 leading-relaxed">
                Bạn đã trả lời với độ tự tin cao ở {result.confidence_pattern.CONFIDENT_WRONG} câu nhưng lại chọn đáp án chưa chính xác.
                Đây là hiện tượng thường gặp khi độc giả gặp bẫy ngữ pháp (như phủ định một phần) hoặc suy luận thêm dựa trên giả định cá nhân thay vì căn cứ bài viết.
              </p>
              <div className="space-y-2 pt-1">
                {result.misconceptions.map((m, idx) => (
                  <div key={idx} className="bg-sumi-900 p-3 rounded-xl border border-rose-200 dark:border-rose-500/20 text-xs text-sumi-200">
                    <div className="font-medium text-rose-700 dark:text-rose-300 mb-1">{m.prompt}</div>
                    <div className="text-sumi-400">{m.issue}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phase 3 Bridges: Vocabulary & Grammar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vocabulary Bridge */}
            {result.vocabulary_bridge.length > 0 && (
              <div className="bg-sumi-900 border border-sumi-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-sumi-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Từ Vựng Cần Ôn Tập
                  </h3>
                  <span className="text-xs text-sumi-400">Trọng tâm bài</span>
                </div>
                <div className="space-y-2">
                  {result.vocabulary_bridge.map((v, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-sumi-850 border border-sumi-800 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sumi-200 text-sm">{v.surface_form}</span>
                          <span className="text-xs text-sumi-400">({v.reading})</span>
                          {v.jlpt_level && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sumi-800 text-sumi-300 font-mono">
                              {v.jlpt_level}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-sumi-400 mt-0.5">{v.meaning}</p>
                      </div>
                      <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">Ưu tiên {v.priority_score}★</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grammar Bridge */}
            {result.grammar_bridge.length > 0 && (
              <div className="bg-sumi-900 border border-sumi-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-sumi-200 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                    Cấu Trúc Ngữ Pháp Trọng Điểm
                  </h3>
                  <span className="text-xs text-sumi-400">Mẫu câu cốt lõi</span>
                </div>
                <div className="space-y-2">
                  {result.grammar_bridge.map((g, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-sumi-850 border border-sumi-800">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-indigo-700 dark:text-indigo-300 text-sm font-japanese">{g.pattern}</span>
                        {g.jlpt_level && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sumi-800 text-sumi-300 font-mono">
                            {g.jlpt_level}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-sumi-400 mt-0.5">{g.meaning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Question-by-Question Review */}
          <div className="bg-sumi-900 border border-sumi-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-sumi-200">
              Chi Tiết Từng Câu Hỏi ({result.answers_review.length})
            </h3>
            <div className="space-y-4">
              {result.answers_review.map((item, idx) => {
                const badge = getSkillBadge(item.skill_type);
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border ${
                      item.is_correct
                        ? "bg-sumi-900 border-emerald-300 dark:border-emerald-500/30"
                        : "bg-sumi-900 border-rose-300 dark:border-rose-500/30"
                    } space-y-2.5`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {item.is_correct ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                        )}
                        <span className="text-xs font-semibold text-sumi-200">Câu {idx + 1}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>
                      <span className="text-xs text-sumi-400 font-mono">+{item.points_earned}đ</span>
                    </div>

                    <p className="text-sm font-medium text-sumi-100">{item.prompt}</p>
                    {item.prompt_vi && (
                      <p className="text-xs text-sumi-400 italic">{item.prompt_vi}</p>
                    )}

                    {/* Explanation */}
                    <div className="p-3 bg-sumi-850 rounded-lg text-xs text-sumi-200 space-y-1 border border-sumi-800">
                      <div className="font-semibold text-sumi-300 flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Giải thích sư phạm:
                      </div>
                      <div className="font-japanese leading-relaxed">
                        <MarkdownRenderer content={item.explanation} />
                      </div>
                      {item.explanation_vi && (
                        <div className="text-sumi-400 italic leading-relaxed pt-1 border-t border-sumi-800">
                          <MarkdownRenderer content={item.explanation_vi} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => initQuiz(false)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              <RotateCcw className="w-4 h-4" /> Làm lại bài kiểm tra (Retake)
            </button>
            <Link
              href={`/immersion/content/${contentId}`}
              className="px-6 py-3 bg-sumi-850 hover:bg-sumi-800 text-sumi-200 border border-sumi-800 rounded-xl font-medium text-sm transition flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" /> Quay về bài đọc
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Active Test-Taking Mode View (2-pane: đề bài + câu hỏi)
  // ---------------------------------------------------------------------------
  if (!currentQuestion) {
    return null;
  }

  const skillInfo = getSkillBadge(currentQuestion.skill_type);
  const progressPct = Math.round(((currentIndex + 1) / quiz.questions.length) * 100);

  const questionPanel = (
    <div className="rounded-2xl bg-sumi-900 border border-sumi-800 p-4 sm:p-6 space-y-5">
      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${skillInfo.color}`}>
          {skillInfo.label}
        </span>
        <span className="text-xs px-2.5 py-1 rounded-full bg-sumi-850 border border-sumi-800 text-sumi-300">
          {currentQuestion.difficulty}
        </span>
        <span className="text-xs text-sumi-400 ml-auto flex items-center gap-1 font-mono">
          +{currentQuestion.points} điểm
        </span>
      </div>

      {/* Prompt Card */}
      <div className="space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold text-sumi-100 tracking-tight leading-relaxed font-japanese">
          {currentQuestion.prompt}
        </h2>
        {showVietnamese && currentQuestion.prompt_vi && (
          <p className="text-sm text-sumi-400 font-sans italic">
            {currentQuestion.prompt_vi}
          </p>
        )}
      </div>

      {/* Options List */}
      <div className="space-y-3 pt-1">
        {currentQuestion.options.map((opt, idx) => {
          const isSelected = selectedOptionId === opt.id;
          const letter = String.fromCharCode(65 + idx); // A, B, C, D

          let cardStyles = "bg-sumi-850/60 border-sumi-800 hover:border-sumi-700 hover:bg-sumi-850";
          if (isSelected) {
            cardStyles = "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500";
          }

          // Post-submission feedback styling (đủ contrast 2 theme)
          if (lastFeedback) {
            if (opt.id === lastFeedback.correct_option_id) {
              cardStyles = "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500";
            } else if (isSelected && !lastFeedback.is_correct) {
              cardStyles = "bg-rose-50 dark:bg-rose-500/10 border-rose-500 text-rose-900 dark:text-rose-200 ring-1 ring-rose-500";
            } else {
              cardStyles = "opacity-50 bg-sumi-850/50 border-sumi-800";
            }
          }

          return (
            <button
              key={opt.id}
              disabled={lastFeedback !== null}
              onClick={() => handleSelectOption(opt.id)}
              className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${cardStyles}`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 transition-colors ${
                  lastFeedback && opt.id === lastFeedback.correct_option_id
                    ? "bg-emerald-500 text-white"
                    : isSelected
                      ? "bg-indigo-600 text-white"
                      : "bg-sumi-800 text-sumi-300"
                }`}
              >
                {letter}
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                <div className="text-sm sm:text-base font-medium leading-snug font-japanese text-sumi-100">
                  {opt.text}
                </div>
                {showVietnamese && opt.text_vi && (
                  <div className="text-xs text-sumi-400 italic">
                    {opt.text_vi}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Confidence & Hints Row (Before Submit) */}
      {!lastFeedback && (
        <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Confidence selector */}
          <div className="flex items-center gap-2 text-xs text-sumi-400 flex-wrap">
            <span>Độ tự tin:</span>
            <div className="flex items-center gap-1 bg-sumi-850 border border-sumi-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setConfidence("HIGH")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  confidence === "HIGH" ? "bg-indigo-600 text-white font-medium" : "text-sumi-400 hover:text-sumi-200"
                }`}
              >
                😊 Chắc chắn
              </button>
              <button
                type="button"
                onClick={() => setConfidence("MEDIUM")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  confidence === "MEDIUM" ? "bg-indigo-600 text-white font-medium" : "text-sumi-400 hover:text-sumi-200"
                }`}
              >
                🤔 Tương đối
              </button>
              <button
                type="button"
                onClick={() => setConfidence("LOW")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  confidence === "LOW" ? "bg-indigo-600 text-white font-medium" : "text-sumi-400 hover:text-sumi-200"
                }`}
              >
                😅 Đoán
              </button>
            </div>
          </div>

          {/* Hint Trigger */}
          {currentQuestion.hints && currentQuestion.hints.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setHintsUsed((prev) => Math.min(prev + 1, currentQuestion.hints.length));
                setShowHintModal(true);
              }}
              className="text-xs text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 flex items-center gap-1.5 transition font-medium"
            >
              <Lightbulb className="w-4 h-4" />
              {hintsUsed === 0 ? "Xem Gợi ý" : `Gợi ý (${hintsUsed}/${currentQuestion.hints.length})`}
            </button>
          )}
        </div>
      )}

      {/* Hint box */}
      {showHintModal && currentQuestion.hints && hintsUsed > 0 && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-4 rounded-2xl space-y-2 text-xs">
          <div className="flex items-center justify-between text-amber-800 dark:text-amber-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4" /> Gợi ý nấc {hintsUsed}
            </span>
            <button onClick={() => setShowHintModal(false)} className="text-sumi-400 hover:text-sumi-200">
              Đóng
            </button>
          </div>
          <p className="text-sumi-200">{currentQuestion.hints[hintsUsed - 1]}</p>
          {hintsUsed < currentQuestion.hints.length && (
            <button
              onClick={() => setHintsUsed((prev) => prev + 1)}
              className="text-[11px] text-amber-700 dark:text-amber-400 underline pt-1 block"
            >
              Mở thêm gợi ý tiếp theo (-2 điểm)
            </button>
          )}
        </div>
      )}

      {/* Immediate Feedback Card */}
      {lastFeedback && (
        <div
          className={`p-5 rounded-2xl border space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
            lastFeedback.is_correct
              ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/40"
              : "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {lastFeedback.is_correct ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              )}
              <div>
                <h4 className={`text-base font-bold ${lastFeedback.is_correct ? "text-emerald-800 dark:text-emerald-300" : "text-rose-800 dark:text-rose-300"}`}>
                  {lastFeedback.is_correct ? "Chính xác! (正解)" : "Chưa chính xác (不正解)"}
                </h4>
                <span className="text-xs text-sumi-400">
                  {lastFeedback.is_correct
                    ? `+${lastFeedback.points_earned} điểm vào kết quả đọc hiểu`
                    : "Hãy xem phân tích sư phạm bên dưới và đối chiếu đề bài bên trái"}
                </span>
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className="bg-sumi-900 p-3.5 rounded-xl border border-sumi-800 text-xs text-sumi-200 space-y-1.5">
            <div className="font-semibold text-sumi-300 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Căn cứ bài viết:
            </div>
            <div className="leading-relaxed">
              <MarkdownRenderer content={lastFeedback.explanation} />
            </div>
            {showVietnamese && lastFeedback.explanation_vi && (
              <div className="text-sumi-400 italic pt-1 border-t border-sumi-800">
                <MarkdownRenderer content={lastFeedback.explanation_vi} />
              </div>
            )}
          </div>

          {/* Misconception Advice */}
          {lastFeedback.misconception_feedback && (
            <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 p-2.5 rounded-xl border border-amber-200 dark:border-amber-500/20">
              <MarkdownRenderer content={`💡 ${lastFeedback.misconception_feedback}`} />
            </div>
          )}

          {/* Source Sentence Jump */}
          {lastFeedback.source_sentence && (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  setShowSourceSentence((prev) => !prev);
                  // Trên mobile tự nhảy sang tab đề bài để thấy highlight
                  setMobileTab("article");
                }}
                className="text-xs text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                <Eye className="w-3.5 h-3.5" />
                {showSourceSentence ? "Ẩn câu gốc trong bài" : "Xem câu gốc (đã highlight trong đề bài)"}
              </button>
              {showSourceSentence && (
                <div className="p-3 bg-sumi-850 rounded-xl text-xs text-sumi-200 font-japanese border border-sumi-800">
                  &ldquo;{lastFeedback.source_sentence}&rdquo;
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-sumi-950 text-sumi-100 flex flex-col justify-between">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-20 bg-sumi-950/90 backdrop-blur-md border-b border-sumi-800 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href={`/immersion/content/${contentId}`}
              className="flex items-center gap-1.5 text-xs text-sumi-400 hover:text-sumi-200 transition flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Thoát Quiz</span><span className="sm:hidden">Thoát</span>
            </Link>
            <button
              onClick={() => setShowArticle((v) => !v)}
              title={showArticle ? "Ẩn đề bài" : "Hiện đề bài"}
              className={`hidden lg:flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs transition ${
                showArticle
                  ? "bg-indigo-100 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/30"
                  : "bg-sumi-900 text-sumi-400 border-sumi-800"
              }`}
            >
              <PanelLeft className="w-3.5 h-3.5" /> Đề bài
            </button>
          </div>

          {/* Progress Bar & Indicators */}
          <div className="flex-1 max-w-xs text-center">
            <div className="flex justify-between text-xs font-semibold text-sumi-400 mb-1">
              <span>Câu {currentIndex + 1} / {quiz.questions.length}</span>
              {quizMode === "adaptive" ? (
                <span className="font-mono text-indigo-400" title="Năng lực ước lượng (θ) — càng cao càng giỏi">
                  θ {adaptiveTheta >= 0 ? "+" : ""}{adaptiveTheta.toFixed(2)}
                </span>
              ) : (
                <span>{progressPct}%</span>
              )}
            </div>
            <div className="w-full bg-sumi-850 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 p-0.5 rounded-lg bg-sumi-900 border border-sumi-800" title="Đề chuẩn: toàn bộ câu hỏi. Thích ứng: câu hỏi theo trình độ, dừng sớm khi đủ chính xác.">
              {(["static", "adaptive"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => handleModeSwitch(m)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    quizMode === m
                      ? "bg-indigo-500 text-white"
                      : "text-sumi-400 hover:text-sumi-100"
                  }`}
                >
                  {m === "static" ? "Đề chuẩn" : "Thích ứng"}
                </button>
              ))}
            </div>
            <ThemeSwitcher compact />
            {renderAISelector("right")}
            <button
              onClick={() => setShowVietnamese((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                showVietnamese
                  ? "bg-indigo-100 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/30"
                  : "bg-sumi-900 text-sumi-400 border-sumi-800"
              }`}
            >
              {showVietnamese ? "🇻🇳 Song ngữ" : "🇯🇵 Chỉ JP"}
            </button>
          </div>
        </div>

        {/* Mobile tabs: Đề bài / Câu hỏi */}
        <div className="lg:hidden max-w-6xl mx-auto mt-2.5 flex items-center gap-1 p-1 rounded-xl bg-sumi-900 border border-sumi-800">
          <button
            onClick={() => setMobileTab("article")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition ${
              mobileTab === "article"
                ? "bg-sumi-850 text-sumi-100 border border-sumi-800"
                : "text-sumi-400"
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Đề bài
          </button>
          <button
            onClick={() => setMobileTab("question")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition ${
              mobileTab === "question"
                ? "bg-sumi-850 text-sumi-100 border border-sumi-800"
                : "text-sumi-400"
            }`}
          >
            <ListChecks className="w-3.5 h-3.5" /> Câu {currentIndex + 1}/{quiz.questions.length}
          </button>
        </div>
      </header>

      {/* Main 2-pane Stage */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className={showArticle ? "grid grid-cols-1 lg:grid-cols-[400px_minmax(0,1fr)] gap-5 items-start" : "grid grid-cols-1 gap-5 items-start"}>
          {/* Article pane: desktop luôn hiện (nếu showArticle), mobile theo tab */}
          <div className={`${showArticle ? "" : "hidden"} ${mobileTab === "article" ? "" : "hidden"} lg:block`}>
            <div className="lg:sticky lg:top-32">
              <ArticlePane
                article={article}
                loading={articleLoading}
                error={articleError}
                contentId={contentId}
                showVietnamese={showVietnamese}
                highlightText={lastFeedback?.source_sentence ?? null}
                highlightId={lastFeedback?.source_sentence_id ?? currentQuestion.source_sentence_id ?? null}
                onRetry={fetchArticle}
              />
            </div>
          </div>

          {/* Question pane: mobile theo tab */}
          <div className={mobileTab === "question" ? "" : "hidden lg:block"}>
            {questionPanel}
          </div>
        </div>
      </main>

      {/* Bottom Sticky Action Bar */}
      <footer className="sticky bottom-0 z-20 bg-sumi-950/95 backdrop-blur-md border-t border-sumi-800 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="text-xs text-sumi-400 hidden sm:block">
            Phím tắt: <kbd className="px-1.5 py-0.5 bg-sumi-850 rounded text-sumi-300 font-mono border border-sumi-800">1-4</kbd> hoặc <kbd className="px-1.5 py-0.5 bg-sumi-850 rounded text-sumi-300 font-mono border border-sumi-800">A-D</kbd>
          </div>

          {!lastFeedback ? (
            <button
              disabled={selectedOptionId === null || submitting}
              onClick={handleSubmitAnswer}
              className={`ml-auto px-6 py-2.5 rounded-xl font-medium text-sm transition flex items-center gap-2 shadow-lg ${
                selectedOptionId === null || submitting
                  ? "bg-sumi-850 text-sumi-500 cursor-not-allowed border border-sumi-800"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
              }`}
            >
              {submitting ? "Đang chấm điểm..." : "Kiểm tra đáp án"}
            </button>
          ) : (
            <button
              onClick={handleNextOrFinish}
              disabled={loadingNext}
              className="ml-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl font-medium text-sm transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {loadingNext ? (
                <>Đang chọn câu tiếp theo...</>
              ) : currentIndex < quiz.questions.length - 1 ||
                (quizMode === "adaptive" && !adaptiveStopReason) ? (
                <>Câu tiếp theo <ChevronRight className="w-4 h-4" /></>
              ) : (
                <>Xem Báo Cáo Kết Quả <Award className="w-4 h-4" /></>
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
