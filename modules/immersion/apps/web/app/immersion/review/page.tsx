"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Repeat,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  BookOpen,
  Library,
  Flame,
  Clock,
  BrainCircuit,
  Zap,
  Volume2,
  SkipForward,
  EyeOff,
  Layers,
  Link2,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  ReviewSessionData,
  ReviewCardItem,
  SubmitReviewAnswerResponse,
  DueBreakdown,
  SrsPreference,
  ReviewForecast,
} from "@/lib/types";
import { notify } from "@/components/ui";

const SESSION_SIZES = [5, 12, 20, 30];
const RETENTION_OPTIONS = [0.8, 0.85, 0.9, 0.95];

const TYPE_META: Record<string, { label: string; short: string; icon: React.ReactNode; color: string }> = {
  VOCABULARY: {
    label: "Từ vựng",
    short: "Từ",
    icon: <BookOpen className="w-3.5 h-3.5" />,
    color: "text-sky-400",
  },
  EXPRESSION: {
    label: "Cụm từ",
    short: "Cụm",
    icon: <Link2 className="w-3.5 h-3.5" />,
    color: "text-emerald-400",
  },
  GRAMMAR: {
    label: "Ngữ pháp",
    short: "NP",
    icon: <Layers className="w-3.5 h-3.5" />,
    color: "text-pink-400",
  },
};

const REVIEW_TYPE_LABEL: Record<string, string> = {
  CONTEXT_MEANING: "Nghĩa ngữ cảnh",
  RECALL: "Điền khuyết",
  USAGE: "Hoàn cảnh dùng",
  FORMATION: "Công thức",
};

function formatInterval(days?: number): string {
  if (days === undefined || days === null) return "—";
  if (days <= 0) return "hôm nay";
  if (days === 1) return "1 ngày";
  if (days < 30) return `${days} ngày`;
  if (days < 365) return `~${Math.round(days / 30)} tháng`;
  return `~${Math.round((days / 365) * 10) / 10} năm`;
}

export default function SpacedReviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<DueBreakdown | null>(null);
  const [sessionSize, setSessionSize] = useState(12);
  const [sessionType, setSessionType] = useState("ALL");
  const [prefs, setPrefs] = useState<SrsPreference | null>(null);
  const [forecast, setForecast] = useState<ReviewForecast | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Session State (queue-based: Again requeues to the end)
  const [session, setSession] = useState<ReviewSessionData | null>(null);
  const [queue, setQueue] = useState<ReviewCardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [lastRatingResult, setLastRatingResult] = useState<SubmitReviewAnswerResponse | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [leechCount, setLeechCount] = useState(0);
  const [correctFirstTry, setCorrectFirstTry] = useState(0);
  const [totalRated, setTotalRated] = useState(0);
  const [seenInSession, setSeenInSession] = useState<Set<string>>(new Set());
  const sessionStartRef = useRef<number>(Date.now());
  const [elapsedSec, setElapsedSec] = useState(0);

  const [ratingsCount, setRatingsCount] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });

  const checkDueAndInit = async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, p, fc] = await Promise.all([
        api.getDueBreakdown(),
        api.getReviewPreferences().catch(() => null),
        api.getReviewForecast(14).catch(() => null),
      ]);
      setBreakdown(res);
      if (p) setPrefs(p);
      if (fc) setForecast(fc);
    } catch (err: any) {
      setError(err?.message || "Không thể kiểm tra số lượng thẻ cần ôn.");
    } finally {
      setLoading(false);
    }
  };

  const handleRetentionChange = async (value: number) => {
    if (savingPrefs) return;
    setSavingPrefs(true);
    try {
      const updated = await api.updateReviewPreferences({ request_retention: value });
      setPrefs(updated);
      api.getReviewForecast(14).then(setForecast).catch(() => {});
      notify.success(`Mức nhớ mục tiêu: ${Math.round(value * 100)}%`);
    } catch (err: any) {
      notify.error(err?.message || "Không thể lưu cài đặt.");
    } finally {
      setSavingPrefs(false);
    }
  };

  useEffect(() => {
    checkDueAndInit();
  }, []);

  const handleStartSession = async () => {
    try {
      setLoading(true);
      setError(null);
      const sess = await api.startReviewSession(sessionSize, sessionType);
      if (!sess.cards || sess.cards.length === 0) {
        setError("Chưa có thẻ nào để ôn. Hãy lưu từ vựng, cụm từ hoặc ngữ pháp vào Thư viện trước.");
        return;
      }
      setSession(sess);
      setQueue(sess.cards);
      setCurrentIndex(0);
      setIsRevealed(false);
      setSelectedOptionId(null);
      setLastRatingResult(null);
      setSessionCompleted(false);
      setLeechCount(0);
      setCorrectFirstTry(0);
      setTotalRated(0);
      setSeenInSession(new Set());
      setRatingsCount({ 1: 0, 2: 0, 3: 0, 4: 0 });
      sessionStartRef.current = Date.now();
      setElapsedSec(0);
    } catch (err: any) {
      const msg = err?.message || "Không thể khởi tạo phiên ôn tập.";
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const currentCard: ReviewCardItem | null =
    queue.length > currentIndex ? queue[currentIndex] : null;
  const cardKey = (c: ReviewCardItem) => `${c.item_type}:${c.item_id}:${c.review_type}`;

  const handleOptionSelect = (optionId: number) => {
    if (isRevealed) return;
    setSelectedOptionId(optionId);
    setIsRevealed(true);
  };

  const handleReveal = () => {
    setIsRevealed(true);
  };

  const speak = (text: string) => {
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
      synth.speak(utter);
    } catch {
      /* silent */
    }
  };

  const advance = (requeueCurrent: boolean) => {
    if (requeueCurrent && currentCard) {
      setQueue((prev) => [...prev, currentCard]);
    }
    if (currentIndex + 1 < queue.length + (requeueCurrent ? 1 : 0)) {
      setCurrentIndex((prev) => prev + 1);
      setIsRevealed(false);
      setSelectedOptionId(null);
      setLastRatingResult(null);
    } else {
      finishSession();
    }
    setSubmittingRating(false);
  };

  const finishSession = async () => {
    setSessionCompleted(true);
    notify.success("Chúc mừng! Bạn đã hoàn thành phiên ôn tập!");
    if (session) {
      setElapsedSec(Math.round((Date.now() - sessionStartRef.current) / 1000));
      try {
        await api.finishReviewSession(session.session_id, {
          items_completed: totalRated + 1,
          ratings: Object.fromEntries(Object.entries(ratingsCount).map(([k, v]) => [k, v])),
        });
      } catch {
        // Silent: local stats already shown; persistence is best-effort.
      }
      checkDueAndInit();
    }
  };

  const handleRate = async (rating: number) => {
    if (!session || !currentCard || submittingRating) return;
    try {
      setSubmittingRating(true);
      const chosen = selectedOptionId
        ? currentCard.options.find((o) => o.id === selectedOptionId)
        : undefined;
      const isCorrect = chosen ? chosen.is_correct : rating >= 3;

      const res = await api.submitReviewRating(session.session_id, {
        item_id: currentCard.item_id,
        item_type: currentCard.item_type,
        rating,
        answer_was_correct: isCorrect,
      });

      setLastRatingResult(res);
      setTotalRated((n) => n + 1);
      setRatingsCount((prev) => ({ ...prev, [rating]: (prev[rating] || 0) + 1 }));
      const key = cardKey(currentCard);
      if (isCorrect && !seenInSession.has(key)) {
        setCorrectFirstTry((n) => n + 1);
      }
      setSeenInSession((prev) => new Set(prev).add(key));
      if (res.leech_suspended) {
        setLeechCount((n) => n + 1);
        notify.error("Thẻ này quên quá nhiều lần — đã tạm treo khỏi hàng đợi SRS.");
      }

      // Next card after short feedback pause (Again requeues to the end)
      setTimeout(() => {
        advance(rating === 1);
      }, 650);
    } catch (err: any) {
      notify.error(err?.message || "Không thể gửi đánh giá ôn tập");
      setSubmittingRating(false);
    }
  };

  const handleSkip = () => {
    if (!currentCard || submittingRating) return;
    advance(false);
  };

  const handleSuspend = async () => {
    if (!currentCard || submittingRating) return;
    try {
      await api.suspendReviewItem(currentCard.item_type, currentCard.item_id);
      notify.success("Đã tạm ẩn thẻ này khỏi hàng đợi SRS.");
      advance(false);
    } catch (err: any) {
      notify.error(err?.message || "Không thể tạm ẩn thẻ");
    }
  };

  // Keyboard Shortcuts (Space reveal, 1-4 rate, S skip)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (sessionCompleted || !session || !currentCard || submittingRating) return;
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.code === "Space" && !isRevealed) {
        e.preventDefault();
        handleReveal();
      } else if (isRevealed) {
        if (e.key === "1") handleRate(1);
        else if (e.key === "2") handleRate(2);
        else if (e.key === "3") handleRate(3);
        else if (e.key === "4") handleRate(4);
      } else if (e.key === "s" || e.key === "S") {
        handleSkip();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionCompleted, session, currentCard, isRevealed, submittingRating, selectedOptionId]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const seenCount = Math.max(1, seenInSession.size);
  const accuracy = totalRated > 0 ? Math.round((correctFirstTry / seenCount) * 100) : 0;
  const preview = currentCard?.interval_preview || {};

  return (
    <div className="min-h-screen bg-sumi-950 text-sumi-100 flex flex-col justify-between py-6">
      <div className="max-w-4xl mx-auto px-4 w-full flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-sumi-800/80 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Repeat className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                FSRS Spaced Review Studio
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                  SRS 2.0
                </span>
              </h1>
              <p className="text-xs text-sumi-400">Ôn từ vựng, cụm từ và ngữ pháp theo trí nhớ ngắt quãng</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/immersion/library"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-sumi-900 hover:bg-sumi-800 text-sumi-300 hover:text-white border border-sumi-800 transition-colors"
            >
              <Library className="w-3.5 h-3.5" /> Thư viện
            </Link>
          </div>
        </div>

        {/* State 1: Setup */}
        {!session && !loading && (
          <div className="my-auto text-center max-w-lg mx-auto space-y-6 py-12">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-3xl bg-emerald-500/20 blur-xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-3xl bg-sumi-900 border border-emerald-500/40 flex items-center justify-center shadow-xl">
                <BrainCircuit className="w-10 h-10 text-emerald-400" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Sẵn sàng ôn tập hôm nay?</h2>
              <p className="text-sm text-sumi-300 leading-relaxed">
                Thẻ quá hạn ôn trước, thẻ mới mỗi phiên tối đa 5. Thẻ bấm Quên sẽ quay lại cuối hàng.
              </p>
            </div>

            {/* Due breakdown */}
            <div className="p-4 rounded-xl bg-sumi-900/60 border border-sumi-800 grid grid-cols-4 gap-2 text-center">
              <div>
                <span className="text-[10px] text-sumi-400 block font-semibold uppercase">Đến hạn</span>
                <span className="text-2xl font-bold text-emerald-400 font-mono">{breakdown?.total ?? 0}</span>
              </div>
              <div>
                <span className="text-[10px] text-sky-400 block font-semibold uppercase">Từ vựng</span>
                <span className="text-2xl font-bold text-white font-mono">{breakdown?.vocabulary ?? 0}</span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-400 block font-semibold uppercase">Cụm từ</span>
                <span className="text-2xl font-bold text-white font-mono">{breakdown?.expression ?? 0}</span>
              </div>
              <div>
                <span className="text-[10px] text-pink-400 block font-semibold uppercase">Ngữ pháp</span>
                <span className="text-2xl font-bold text-white font-mono">{breakdown?.grammar ?? 0}</span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-torii-500/10 border border-torii-500/30 text-torii-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Session options */}
            <div className="p-4 rounded-xl bg-sumi-900/60 border border-sumi-800 space-y-3 text-left">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-sumi-300 font-semibold">Số thẻ mỗi phiên</span>
                <div className="flex items-center gap-1.5">
                  {SESSION_SIZES.map((n) => (
                    <button
                      key={n}
                      onClick={() => setSessionSize(n)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                        sessionSize === n
                          ? "bg-emerald-500 text-slate-950 font-bold"
                          : "bg-sumi-800 text-sumi-300 hover:text-white"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-sumi-300 font-semibold">Loại thẻ</span>
                <div className="flex items-center gap-1.5">
                  {[
                    { v: "ALL", label: "Tất cả" },
                    { v: "VOCABULARY", label: "Từ" },
                    { v: "EXPRESSION", label: "Cụm" },
                    { v: "GRAMMAR", label: "NP" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      onClick={() => setSessionType(o.v)}
                      className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                        sessionType === o.v
                          ? "bg-emerald-500 text-slate-950 font-bold"
                          : "bg-sumi-800 text-sumi-300 hover:text-white"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-sumi-300 font-semibold">Mức nhớ mục tiêu</span>
                <div className="flex items-center gap-1.5">
                  {RETENTION_OPTIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => handleRetentionChange(r)}
                      disabled={savingPrefs}
                      title={r === 0.8 ? "Ít bài ôn hơn, quên nhiều hơn" : r === 0.95 ? "Nhớ kỹ hơn, nhiều bài ôn hơn" : "Cân bằng"}
                      className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors disabled:opacity-50 ${
                        (prefs?.request_retention ?? 0.9) === r
                          ? "bg-emerald-500 text-slate-950 font-bold"
                          : "bg-sumi-800 text-sumi-300 hover:text-white"
                      }`}
                    >
                      {Math.round(r * 100)}%
                    </button>
                  ))}
                </div>
              </div>
              {forecast && forecast.days.length > 0 && (
                <div className="pt-3 border-t border-sumi-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-sumi-300 font-semibold">Tải ôn 14 ngày tới</span>
                    {forecast.retention_30d > 0 && (
                      <span className="text-[11px] text-sumi-400 font-mono">
                        Nhớ thực tế 30 ngày: {Math.round(forecast.retention_30d * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-end gap-1 h-12">
                    {forecast.days.map((d) => {
                      const max = Math.max(1, ...forecast.days.map((x) => x.due_count));
                      return (
                        <div
                          key={d.date}
                          title={`${d.date.slice(5)}: ${d.due_count} thẻ`}
                          className="flex-1 rounded-sm bg-emerald-500/70 min-h-[3px]"
                          style={{ height: `${Math.max(8, Math.round((d.due_count / max) * 100))}%` }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleStartSession}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Zap className="w-5 h-5" />
              Bắt đầu phiên ôn tập
            </button>
          </div>
        )}

        {/* State 2: Session Completed */}
        {sessionCompleted && (
          <div className="my-auto text-center max-w-md mx-auto space-y-6 py-12">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Tuyệt vời! Đã hoàn thành phiên ôn</h2>
              <p className="text-xs text-sumi-300">
                Đúng ngay lần đầu {correctFirstTry}/{Math.max(1, seenInSession.size)} thẻ ({accuracy}%)
                {elapsedSec > 0 && ` • ${Math.floor(elapsedSec / 60)}p${elapsedSec % 60}s`}
                {leechCount > 0 && ` • ${leechCount} thẻ bị treo (quên nhiều)`}
              </p>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-4 gap-2 p-3.5 bg-sumi-900/80 rounded-xl border border-sumi-800 text-center font-mono">
              <div className="bg-sumi-950 p-2 rounded-lg">
                <span className="text-[10px] text-torii-400 block">Again</span>
                <span className="text-base font-bold text-white">{ratingsCount[1]}</span>
              </div>
              <div className="bg-sumi-950 p-2 rounded-lg">
                <span className="text-[10px] text-amber-400 block">Hard</span>
                <span className="text-base font-bold text-white">{ratingsCount[2]}</span>
              </div>
              <div className="bg-sumi-950 p-2 rounded-lg">
                <span className="text-[10px] text-blue-400 block">Good</span>
                <span className="text-base font-bold text-white">{ratingsCount[3]}</span>
              </div>
              <div className="bg-sumi-950 p-2 rounded-lg">
                <span className="text-[10px] text-emerald-400 block">Easy</span>
                <span className="text-base font-bold text-white">{ratingsCount[4]}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleStartSession}
                className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
              >
                Ôn tiếp phiên khác
              </button>
              <Link
                href="/immersion/library"
                className="flex-1 py-3 px-4 rounded-xl text-sm font-medium bg-sumi-900 hover:bg-sumi-800 text-sumi-200 hover:text-white border border-sumi-800 transition-colors"
              >
                Vào Thư viện
              </Link>
            </div>
          </div>
        )}

        {/* State 3: Active Card Review */}
        {session && !sessionCompleted && currentCard && (
          <div className="flex-1 flex flex-col justify-between space-y-6">
            {/* Progress Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-sumi-400">
                <span className="font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Thẻ {Math.min(currentIndex + 1, queue.length)} / {queue.length}
                </span>
                <span className="font-mono flex items-center gap-1.5">
                  <span className={TYPE_META[currentCard.item_type]?.color || "text-sumi-400"}>
                    {TYPE_META[currentCard.item_type]?.label || currentCard.item_type}
                  </span>
                  <span>•</span>
                  <span>{REVIEW_TYPE_LABEL[currentCard.review_type] || currentCard.review_type}</span>
                </span>
              </div>
              <div className="h-1.5 w-full bg-sumi-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-300 rounded-full"
                  style={{ width: `${queue.length > 0 ? (Math.min(currentIndex + 1, queue.length) / queue.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Main Flashcard Body */}
            <div className="flex-1 bg-sumi-900/90 border border-sumi-800/90 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-2xl relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    {currentCard.prompt}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => speak(currentCard.correct_answer)}
                      title="Nghe phát âm đáp án"
                      className="p-1.5 rounded-lg text-sumi-400 hover:text-sky-300 hover:bg-sky-500/10 transition-colors"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono text-sumi-500">
                      S: {currentCard.stability}d | D: {currentCard.difficulty}
                    </span>
                  </div>
                </div>

                {/* Authentic Context Sentence */}
                {currentCard.context_sentence && (
                  <div className="p-4 sm:p-5 rounded-xl bg-sumi-950/80 border border-sumi-800/80 text-base sm:text-lg text-white leading-relaxed font-serif">
                    {currentCard.context_sentence}
                  </div>
                )}

                {/* Clue */}
                {currentCard.clue && (
                  <div className="text-xs text-sumi-400 italic">
                    💡 Gợi ý: {currentCard.clue}
                  </div>
                )}
              </div>

              {/* Options or Answer Area */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentCard.options.map((opt) => {
                    const isSelected = selectedOptionId === opt.id;
                    const showCorrect = isRevealed && opt.is_correct;
                    const showWrong = isRevealed && isSelected && !opt.is_correct;

                    return (
                      <button
                        key={opt.id}
                        disabled={isRevealed}
                        onClick={() => handleOptionSelect(opt.id)}
                        className={`p-3.5 rounded-xl text-left text-sm font-medium transition-all border ${
                          showCorrect
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold"
                            : showWrong
                            ? "bg-torii-500/20 border-torii-500 text-torii-300"
                            : isSelected
                            ? "bg-sumi-800 border-amber-500/60 text-white"
                            : "bg-sumi-950/60 hover:bg-sumi-800/80 border-sumi-800/80 text-sumi-200"
                        }`}
                      >
                        {opt.text}
                      </button>
                    );
                  })}
                </div>

                {/* Reveal Explanation if triggered */}
                {isRevealed && (
                  <div className="p-4 rounded-xl bg-sumi-950 border border-emerald-500/30 text-xs text-sumi-200 space-y-1.5 animate-fadeIn">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Đáp án chuẩn: {currentCard.correct_answer}
                    </div>
                    <p className="text-sumi-300 leading-relaxed">{currentCard.explanation}</p>
                  </div>
                )}
              </div>

              {/* Bottom Card Controls */}
              {!isRevealed ? (
                <div className="flex items-center justify-between gap-2 pt-4 border-t border-sumi-800/80">
                  <span className="text-[11px] text-sumi-500 hidden sm:inline">Space lật thẻ • S bỏ qua</span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleSkip}
                      title="Bỏ qua thẻ này (S)"
                      className="px-4 py-2.5 rounded-xl text-xs font-medium bg-sumi-800 hover:bg-sumi-700 text-sumi-300 transition-colors flex items-center gap-1.5"
                    >
                      <SkipForward className="w-3.5 h-3.5" /> Bỏ qua
                    </button>
                    <button
                      onClick={handleReveal}
                      className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-semibold bg-sumi-800 hover:bg-sumi-700 text-white transition-colors"
                    >
                      Xem đáp án & Đánh giá
                    </button>
                  </div>
                </div>
              ) : (
                /* FSRS 4-Tier Rating Buttons with REAL preview intervals */
                <div className="space-y-2 pt-4 border-t border-sumi-800/80">
                  <div className="flex items-center justify-between text-[11px] text-sumi-400 mb-1">
                    <span>Bạn nhớ thẻ này như thế nào? (Bấm 1 - 4)</span>
                    <div className="flex items-center gap-2">
                      {lastRatingResult && (
                        <span className="font-mono text-emerald-400 font-semibold animate-pulse">
                          +{lastRatingResult.scheduled_days} ngày tiếp theo
                        </span>
                      )}
                      <button
                        onClick={handleSuspend}
                        title="Tạm ẩn thẻ này khỏi SRS"
                        className="flex items-center gap-1 text-sumi-500 hover:text-torii-400 transition-colors"
                      >
                        <EyeOff className="w-3.5 h-3.5" /> Tạm ẩn
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      disabled={submittingRating}
                      onClick={() => handleRate(1)}
                      className="p-2.5 rounded-xl text-center bg-torii-500/15 hover:bg-torii-500/25 border border-torii-500/40 text-torii-300 transition-all hover:scale-[1.02] group"
                    >
                      <div className="text-[10px] font-mono text-torii-400/80">[1] Quên (Again)</div>
                      <div className="text-xs font-bold mt-0.5">{formatInterval(preview.again)} • quay lại</div>
                    </button>

                    <button
                      disabled={submittingRating}
                      onClick={() => handleRate(2)}
                      className="p-2.5 rounded-xl text-center bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 transition-all hover:scale-[1.02] group"
                    >
                      <div className="text-[10px] font-mono text-amber-400/80">[2] Khó (Hard)</div>
                      <div className="text-xs font-bold mt-0.5">{formatInterval(preview.hard)}</div>
                    </button>

                    <button
                      disabled={submittingRating}
                      onClick={() => handleRate(3)}
                      className="p-2.5 rounded-xl text-center bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-300 transition-all hover:scale-[1.02] group"
                    >
                      <div className="text-[10px] font-mono text-blue-400/80">[3] Tốt (Good)</div>
                      <div className="text-xs font-bold mt-0.5">{formatInterval(preview.good)}</div>
                    </button>

                    <button
                      disabled={submittingRating}
                      onClick={() => handleRate(4)}
                      className="p-2.5 rounded-xl text-center bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 transition-all hover:scale-[1.02] group"
                    >
                      <div className="text-[10px] font-mono text-emerald-400/80">[4] Rất dễ (Easy)</div>
                      <div className="text-xs font-bold mt-0.5">{formatInterval(preview.easy)}</div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading / Error */}
        {loading && !session && (
          <div className="my-auto text-center py-16 text-sumi-400">
            <RotateCcw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
            Đang chuẩn bị...
          </div>
        )}
        {error && !session && (
          <div className="my-auto text-center max-w-md mx-auto py-12">
            <div className="p-4 rounded-xl bg-torii-500/10 border border-torii-500/30 text-torii-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <Link
              href="/immersion/library"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-sumi-900 hover:bg-sumi-800 text-sumi-200 border border-sumi-800 transition-colors"
            >
              <Flame className="w-3.5 h-3.5" /> Vào Thư viện lưu thêm thẻ
            </Link>
          </div>
        )}

        {/* Bottom meta */}
        <div className="pt-6 flex items-center justify-center gap-4 text-[11px] text-sumi-600">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> Space lật thẻ • 1-4 đánh giá • S bỏ qua
          </span>
        </div>
      </div>
    </div>
  );
}
