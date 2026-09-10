"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Compass,
  Search,
  BookOpen,
  ArrowRight,
  Globe2,
  LayoutGrid,
} from "lucide-react";
import { api } from "@/lib/api";
import { TrendingTopicItem } from "@/lib/types";

type SortId = "hot" | "newest" | "articles";

const SORTS: { id: SortId; label: string }[] = [
  { id: "hot", label: "Nổi bật" },
  { id: "newest", label: "Mới nhất" },
  { id: "articles", label: "Nhiều bài viết" },
];

const TIME_WINDOWS = [
  { id: "24h", label: "Hôm nay" },
  { id: "7d", label: "7 ngày" },
  { id: "30d", label: "30 ngày" },
];

/** Map trạng thái kỹ thuật sang nhãn tiếng Việt dễ hiểu. */
function statusLabel(status: string): { text: string; className: string } {
  switch ((status || "").toUpperCase()) {
    case "PEAK":
    case "RISING":
      return {
        text: "Đang nóng",
        className: "bg-torii-500/15 text-torii-300 border-torii-500/30",
      };
    case "EMERGING":
      return {
        text: "Mới nổi",
        className: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      };
    case "COOLING":
    case "ENDED":
      return {
        text: "Hạ nhiệt",
        className: "bg-sumi-800 text-sumi-400 border-sumi-700",
      };
    case "EVERGREEN":
      return {
        text: "Ổn định",
        className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      };
    default:
      return {
        text: "Đang diễn ra",
        className: "bg-sumi-800 text-sumi-300 border-sumi-700",
      };
  }
}

export default function ExploreJapanPage() {
  const [topics, setTopics] = useState<TrendingTopicItem[]>([]);
  const [total, setTotal] = useState(0);
  const [timeWindow, setTimeWindow] = useState<string>("7d");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortId>("hot");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.getTrendingTopics(timeWindow, 50);
        if (cancelled) return;
        setTopics(res.items || []);
        setTotal(res.total ?? (res.items || []).length);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "Không thể tải chủ đề lúc này.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [timeWindow]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? topics.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            (t.summary || "").toLowerCase().includes(q)
        )
      : [...topics];
    switch (sort) {
      case "newest":
        filtered.sort((a, b) =>
          (b.last_activity_at || "").localeCompare(a.last_activity_at || "")
        );
        break;
      case "articles":
        filtered.sort((a, b) => (b.article_count || 0) - (a.article_count || 0));
        break;
      default:
        filtered.sort((a, b) => (b.trend_score || 0) - (a.trend_score || 0));
        break;
    }
    return filtered;
  }, [topics, search, sort]);

  return (
    <div className="min-h-screen bg-sumi-950 text-sumi-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3.5 pb-6 border-b border-sumi-800/80">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500/20 to-torii-500/20 border border-orange-500/30 flex items-center justify-center">
            <Compass className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Khám phá chủ đề
            </h1>
            <p className="text-xs text-sumi-400 mt-0.5">
              Chọn một chủ đề đang được bàn luận tại Nhật và đọc ngay
              {total > 0 && (
                <span className="font-mono"> • {total} chủ đề</span>
              )}
            </p>
          </div>
        </div>

        {/* Toolbar: tìm kiếm + khoảng thời gian + sắp xếp */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-sumi-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm chủ đề... (vd: 物価, 選挙, 観光)"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-sumi-900 border border-sumi-800 text-sm text-white placeholder:text-sumi-500 outline-none focus:border-orange-500/60"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 p-1 bg-sumi-900 border border-sumi-800 rounded-xl">
              {TIME_WINDOWS.map((tw) => (
                <button
                  key={tw.id}
                  onClick={() => setTimeWindow(tw.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    timeWindow === tw.id
                      ? "bg-orange-500 text-white"
                      : "text-sumi-400 hover:text-white hover:bg-sumi-800/60"
                  }`}
                >
                  {tw.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 p-1 bg-sumi-900 border border-sumi-800 rounded-xl">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    sort === s.id
                      ? "bg-sumi-700 text-white"
                      : "text-sumi-400 hover:text-white hover:bg-sumi-800/60"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="text-center py-24 text-sumi-400 space-y-3">
            <LayoutGrid className="w-8 h-8 animate-pulse mx-auto text-orange-400" />
            <p className="text-sm">Đang tải các chủ đề...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-torii-500/10 border border-torii-500/30 text-torii-300 text-sm">
            {error}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-24 space-y-4 rounded-2xl bg-sumi-900/60 border border-sumi-800">
            <Compass className="w-10 h-10 mx-auto text-sumi-500" />
            <h2 className="text-lg font-bold text-white">
              {search.trim()
                ? `Không tìm thấy chủ đề "${search.trim()}"`
                : "Chưa có chủ đề nào"}
            </h2>
            <p className="text-sm text-sumi-400 max-w-md mx-auto leading-relaxed">
              {search.trim()
                ? "Thử từ khóa khác hoặc chọn khoảng thời gian dài hơn."
                : "Hãy quay lại đọc các bài viết có sẵn, chủ đề mới sẽ hiện ở đây."}
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/immersion"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white transition-all"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Xem tất cả bài viết
              </Link>
              <Link
                href="/sources"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-sumi-800 hover:bg-sumi-700 text-white border border-sumi-700 transition-colors"
              >
                <Globe2 className="w-3.5 h-3.5" />
                Quản lý nguồn
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visible.map((item, idx) => {
              const badge = statusLabel(item.status);
              return (
                <Link
                  key={item.id}
                  href={`/immersion/topics/${item.slug}`}
                  className="p-5 rounded-2xl bg-sumi-900/80 hover:bg-sumi-900 border border-sumi-800/80 hover:border-orange-500/40 transition-all hover:scale-[1.01] group space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-sumi-800 text-orange-400 font-bold font-mono text-xs flex items-center justify-center flex-shrink-0">
                        #{idx + 1}
                      </span>
                      <h3 className="text-base font-bold text-white group-hover:text-orange-300 transition-colors line-clamp-1">
                        {item.name}
                      </h3>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${badge.className}`}
                    >
                      {badge.text}
                    </span>
                  </div>

                  <p className="text-xs text-sumi-300 line-clamp-2 leading-relaxed">
                    {item.summary}
                  </p>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-sumi-800/60">
                    <span className="flex items-center gap-1.5 text-[11px] text-sumi-400 font-mono">
                      <BookOpen className="w-3.5 h-3.5 text-orange-400" />
                      {item.article_count} bài viết
                    </span>
                    <span className="flex items-center gap-1 text-xs font-semibold text-orange-300">
                      Đọc ngay
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
