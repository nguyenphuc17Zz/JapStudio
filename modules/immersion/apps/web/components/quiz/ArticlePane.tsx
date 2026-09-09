"use client";

import React, { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { BookOpen, Clock, Signal, ExternalLink, Loader2, AlertTriangle } from "lucide-react";
import type { ReaderContent } from "@/lib/types";

interface ArticlePaneProps {
  article: ReaderContent | null;
  loading: boolean;
  error: string | null;
  contentId: number;
  showVietnamese: boolean;
  highlightText?: string | null;
  highlightId?: string | null;
  onRetry?: () => void;
}

function parseSentenceIndex(id: string | null | undefined): number | null {
  if (!id) return null;
  const s = id.trim();
  if (/^\d+$/.test(s)) return Number(s);
  const m = s.match(/^s_(\d+)$/i);
  if (m) return Number(m[1]);
  return null;
}

function norm(t: string): string {
  return t.replace(/\s+/g, "").slice(0, 120);
}

export const ArticlePane: React.FC<ArticlePaneProps> = ({
  article,
  loading,
  error,
  contentId,
  showVietnamese,
  highlightText,
  highlightId,
  onRetry,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const highlightIndex: number | null = useMemo(() => {
    if (!article?.sentences) return null;
    const byId = parseSentenceIndex(highlightId);
    if (byId !== null) {
      const found = article.sentences.find((s) => s.sentence_index === byId);
      if (found) return found.sentence_index;
    }
    if (highlightText) {
      const target = norm(highlightText);
      if (target.length >= 6) {
        const hit = article.sentences.find(
          (s) => norm(s.text).includes(target.slice(0, 40)) || target.includes(norm(s.text).slice(0, 40))
        );
        if (hit) return hit.sentence_index;
      }
    }
    return null;
  }, [article, highlightText, highlightId]);

  useEffect(() => {
    if (highlightIndex === null || !scrollRef.current) return;
    const el = scrollRef.current.querySelector<HTMLElement>(`[data-sentence-index="${highlightIndex}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightIndex, highlightText]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-sumi-900 border border-sumi-800 p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-sumi-200">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
          Đang tải đề bài...
        </div>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-4 rounded bg-sumi-850 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="rounded-2xl bg-sumi-900 border border-sumi-800 p-5 space-y-3 text-center">
        <AlertTriangle className="w-6 h-6 mx-auto text-amber-500" />
        <p className="text-sm font-medium text-sumi-200">Không tải được đề bài</p>
        <p className="text-xs text-sumi-400">{error ?? "Bài đọc có thể đã bị gỡ."}</p>
        <div className="flex items-center justify-center gap-2 pt-1">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1.5 rounded-lg bg-sumi-850 hover:bg-sumi-800 border border-sumi-800 text-xs font-medium text-sumi-200 transition"
            >
              Thử lại
            </button>
          )}
          <Link
            href={`/immersion/content/${contentId}`}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition"
          >
            Mở bài đọc
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-sumi-900 border border-sumi-800 overflow-hidden flex flex-col">
      <div className="p-4 sm:p-5 border-b border-sumi-800 space-y-2 bg-sumi-900">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sumi-400">
          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
          Đề bài · {article.source_name}
        </div>
        <h2 className="text-base sm:text-lg font-bold leading-snug text-sumi-100">{article.title}</h2>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-sumi-400">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sumi-850 border border-sumi-800">
            <Signal className="w-3 h-3" /> {article.estimated_jlpt || "N3"}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sumi-850 border border-sumi-800">
            <Clock className="w-3 h-3" /> {article.reading_time_minutes || 5} phút
          </span>
          <Link
            href={`/immersion/content/${contentId}`}
            className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            Mở full <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        {article.summaries?.micro && (
          <p className="text-xs leading-relaxed text-sumi-300 bg-sumi-850 border border-sumi-800 rounded-xl p-2.5">
            {article.summaries.micro}
          </p>
        )}
      </div>

      <div ref={scrollRef} className="p-4 sm:p-5 space-y-3 overflow-y-auto max-h-[55vh] lg:max-h-[calc(100vh-320px)]">
        {article.sentences && article.sentences.length > 0 ? (
          article.sentences.map((s) => {
            const isHit = highlightIndex !== null && s.sentence_index === highlightIndex;
            return (
              <div
                key={s.id ?? s.sentence_index}
                data-sentence-index={s.sentence_index}
                className={`rounded-xl border p-3 transition-colors scroll-mt-4 ${
                  isHit
                    ? "bg-amber-100 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40 ring-1 ring-amber-500/50"
                    : "bg-sumi-850/60 border-sumi-800"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold ${
                      isHit
                        ? "bg-amber-500 text-white"
                        : "bg-sumi-800 text-sumi-300"
                    }`}
                  >
                    {s.sentence_index}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-loose text-sumi-200 font-japanese">{s.text}</p>
                    {showVietnamese && s.translation_vi && (
                      <p className="text-xs italic mt-1 text-sumi-400">{s.translation_vi}</p>
                    )}
                    {isHit && (
                      <p className="mt-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                        ★ Câu dẫn chứng cho đáp án
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : article.content ? (
          <p className="text-sm leading-loose text-sumi-200 font-japanese whitespace-pre-wrap">{article.content}</p>
        ) : (
          <p className="text-xs text-sumi-400">Bài đọc chưa có câu đã tách.</p>
        )}
      </div>
    </div>
  );
};
