"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { immersionApi } from "@/lib/api";
import { ReadingHistoryGrouped, ReadingHistoryItem } from "@/lib/types";
import { History, ArrowLeft, Clock, CheckCircle2, BookOpen, ChevronRight } from "lucide-react";

export default function ReadingHistoryPage() {
  const [history, setHistory] = useState<ReadingHistoryGrouped | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const res = await immersionApi.getReadingHistory();
        setHistory(res);
      } catch (err) {
        console.error("Failed to load reading history:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadHistory();
  }, []);

  const renderSection = (title: string, items?: ReadingHistoryItem[]) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-wider text-sumi-400 font-mono mb-3">
          {title} ({items.length})
        </h2>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <Link
              key={`${item.content_id}-${idx}`}
              href={`/immersion/content/${item.content_id}`}
              className="group p-4 rounded-2xl bg-sumi-900/60 border border-sumi-800/80 hover:border-sumi-700 hover:bg-sumi-900 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-sumi-400 font-medium truncate">
                    {item.source_name}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sumi-800 text-sumi-300 border border-sumi-700">
                    JLPT {item.estimated_jlpt}
                  </span>
                  {item.completed && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Đã đọc xong
                    </span>
                  )}
                </div>

                <h3 className="text-base font-semibold text-white group-hover:text-torii-300 transition-colors font-serif leading-snug">
                  {item.title}
                </h3>
              </div>

              {/* Progress & Time */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <div className="text-xs font-semibold text-sumi-200 font-mono">
                    {item.progress_percent}% hoàn thành
                  </div>
                  <div className="text-[11px] text-sumi-500 font-mono flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(item.read_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-sumi-800 text-sumi-400 group-hover:text-white group-hover:bg-torii-500 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  const hasAnyItems =
    history &&
    ((history.today?.length || 0) > 0 ||
      (history.yesterday?.length || 0) > 0 ||
      (history.this_week?.length || 0) > 0 ||
      (history.older?.length || 0) > 0);

  return (
    <div className="min-h-screen bg-sumi-950 text-sumi-100 flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Header Bar */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/immersion"
            className="p-2 rounded-xl bg-sumi-900 border border-sumi-800 text-sumi-400 hover:text-white hover:bg-sumi-850 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-sky-400" />
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                Lịch Sử Đọc Bài
              </h1>
            </div>
            <p className="text-xs text-sumi-400 mt-0.5">
              Nhật ký các bài đọc bạn đã mở và tiến độ hoàn thành theo thời gian.
            </p>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="h-20 rounded-2xl bg-sumi-900/40 border border-sumi-800/40 animate-pulse" />
            ))}
          </div>
        ) : !hasAnyItems ? (
          <div className="text-center py-20 px-4 rounded-3xl bg-sumi-900/30 border border-sumi-850">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto mb-4">
              <History className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Chưa có lịch sử đọc</h3>
            <p className="text-xs text-sumi-400 max-w-sm mx-auto mb-6">
              Bắt đầu đọc các bài báo hoặc bài đăng từ Immersion Feed, các phiên đọc của bạn sẽ được tự động lưu lại đây.
            </p>
            <Link
              href="/immersion"
              className="px-5 py-2.5 rounded-xl bg-torii-500 hover:bg-torii-600 text-white text-xs font-semibold shadow-lg transition-all"
            >
              Mở Immersion Feed ngay &rarr;
            </Link>
          </div>
        ) : (
          <div>
            {renderSection("Hôm nay", history?.today)}
            {renderSection("Hôm qua", history?.yesterday)}
            {renderSection("Tuần này", history?.this_week)}
            {renderSection("Cũ hơn", history?.older)}
          </div>
        )}
      </main>
    </div>
  );
}
