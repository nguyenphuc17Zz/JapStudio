"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { FeedCard } from "@/components/reader/FeedCard";
import { ContinueReadingShelf } from "@/components/reader/ContinueReadingShelf";
import { immersionApi } from "@/lib/api";
import { FeedItem, ContentSource } from "@/lib/types";
import {
  BookOpen,
  Newspaper,
  MessageCircle,
  Sparkles,
  Search,
  Flame,
  Bookmark,
  History,
  RotateCw,
  Compass,
  Globe,
  Shuffle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------
type TabId = "ALL" | "NEWS" | "SOCIAL" | "BLOGS";

const TABS: { id: TabId; label: string; subLabel: string; icon: React.ReactNode }[] = [
  { id: "ALL", label: "Tất cả", subLabel: "すべて", icon: <Compass className="w-4 h-4" /> },
  { id: "NEWS", label: "Tin tức", subLabel: "ニュース", icon: <Newspaper className="w-4 h-4" /> },
  { id: "SOCIAL", label: "Mạng xã hội", subLabel: "SNS", icon: <MessageCircle className="w-4 h-4" /> },
  { id: "BLOGS", label: "Blog & Bài viết", subLabel: "ブログ", icon: <BookOpen className="w-4 h-4" /> },
];

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------
export default function ImmersionFeedPage() {
  const [activeTab, setActiveTab] = useState<TabId>("ALL");
  const [selectedJlpt, setSelectedJlpt] = useState<string>("ALL");
  const [selectedSourceId, setSelectedSourceId] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // Random seed — new seed on every mount (F5) to ensure fresh shuffle
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1000000));

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [continueItems, setContinueItems] = useState<FeedItem[]>([]);
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [tabCounts, setTabCounts] = useState<Record<TabId, number>>({ ALL: 0, NEWS: 0, SOCIAL: 0, BLOGS: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingMoreRef = useRef(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load sources for the source filter dropdown
  useEffect(() => {
    immersionApi.getSources({ status: "ACTIVE" }).then((res) => {
      if (Array.isArray(res)) setSources(res);
    }).catch(() => {});
  }, []);

  const loadFeed = useCallback(async (opts: { isRefresh?: boolean; newSeed?: number } = {}) => {
    const { isRefresh = false, newSeed } = opts;
    const activeSeed = newSeed ?? seed;

    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [feedRes, continueRes] = await Promise.all([
        immersionApi.getFeed({
          tab: activeTab,
          target_jlpt: selectedJlpt,
          source_id: selectedSourceId,
          sort_by: "random",
          seed: activeSeed,
          search: debouncedSearch,
          page: 1,
          page_size: 24,
        }),
        immersionApi.getContinueReading(4),
      ]);

      setFeedItems(feedRes.items || []);
      setTotalCount(feedRes.total || 0);
      setTabCounts((prev) => ({ ...prev, [activeTab]: feedRes.total || 0 }));
      setHasNext(feedRes.has_next);
      setPage(1);
      setContinueItems(continueRes || []);
    } catch (err) {
      console.error("Failed to load immersion feed:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab, selectedJlpt, selectedSourceId, debouncedSearch, seed]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleLoadMore = useCallback(async () => {
    if (!hasNext || isLoadingMoreRef.current) return;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    const nextPage = page + 1;
    try {
      const feedRes = await immersionApi.getFeed({
        tab: activeTab,
        target_jlpt: selectedJlpt,
        source_id: selectedSourceId,
        sort_by: "random",
        seed, // keep same seed for stable pagination
        search: debouncedSearch,
        page: nextPage,
        page_size: 24,
      });

      setFeedItems((prev) => [...prev, ...(feedRes.items || [])]);
      setPage(nextPage);
      setHasNext(feedRes.has_next);
    } catch (err) {
      console.error("Failed to load more items:", err);
    } finally {
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  }, [hasNext, page, activeTab, selectedJlpt, selectedSourceId, debouncedSearch, seed]);

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadMore]);

  const handleShuffle = () => {
    const newSeed = Math.floor(Math.random() * 1000000);
    setSeed(newSeed);
    loadFeed({ isRefresh: true, newSeed });
  };

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setPage(1);
    const newSeed = Math.floor(Math.random() * 1000000);
    setSeed(newSeed);
  };

  const handleSaveToggle = (contentId: number, isSaved: boolean) => {
    setFeedItems((prev) =>
      prev.map((item) =>
        item.content_id === contentId ? { ...item, is_saved: isSaved } : item
      )
    );
  };

  return (
    <div className="min-h-screen bg-sumi-950 text-sumi-100 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner Section */}
        <section className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-sumi-900/95 via-torii-500/5 dark:via-torii-950/30 to-sumi-900/95 border border-sumi-800 shadow-sm dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-torii-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="p-1.5 rounded-lg bg-torii-500/15 text-torii-500 border border-torii-500/30">
                  <Flame className="w-4 h-4" />
                </span>
                <span className="text-xs uppercase font-mono tracking-wider font-semibold text-torii-500">
                  Authentic Japanese Daily Feed
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Đắm Chìm Ngôn Ngữ Nhật Bản
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-sumi-400 mt-1 max-w-2xl leading-relaxed font-medium">
                Đọc tin tức thật, bài đăng mạng xã hội và góc nhìn văn hóa mỗi ngày với Furigana tương tác, tra từ ngữ cảnh và AI phân tích sắc thái câu.
              </p>
            </div>

            {/* Right quick stats / actions */}
            <div className="flex items-center gap-3">
              <Link
                href="/immersion/saved"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-sumi-850 hover:bg-slate-100 dark:hover:bg-sumi-800 text-slate-800 dark:text-sumi-200 border border-slate-200 dark:border-sumi-750 text-xs font-semibold transition-all hover:scale-105 shadow-sm"
              >
                <Bookmark className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Đã lưu</span>
              </Link>
              <Link
                href="/immersion/history"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-sumi-850 hover:bg-slate-100 dark:hover:bg-sumi-800 text-slate-800 dark:text-sumi-200 border border-slate-200 dark:border-sumi-750 text-xs font-semibold transition-all hover:scale-105 shadow-sm"
              >
                <History className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Lịch sử</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Continue Reading Shelf (if user has reading in progress) */}
        <ContinueReadingShelf items={continueItems} />

        {/* ------------------------------------------------------------------ */}
        {/* Minimalist Underline Tabs                                           */}
        {/* ------------------------------------------------------------------ */}
        <div className="mb-6">
          <div className="flex items-end gap-0 border-b border-sumi-800/80 relative">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = tab.id === activeTab ? totalCount : (tabCounts[tab.id] || 0);
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`group relative flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-sumi-200"
                  }`}
                >
                  {/* Icon */}
                  <span className={`transition-colors duration-200 ${isActive ? "text-torii-600 dark:text-torii-400" : "text-slate-500 group-hover:text-slate-700 dark:text-sumi-600 dark:group-hover:text-sumi-400"}`}>
                    {tab.icon}
                  </span>

                  {/* Label */}
                  <span className="flex flex-col items-start leading-none gap-0.5">
                    <span>{tab.label}</span>
                    <span className={`text-[9px] font-mono tracking-wider transition-colors ${isActive ? "text-torii-600 dark:text-torii-500/80" : "text-slate-500 group-hover:text-slate-700 dark:text-sumi-700 dark:group-hover:text-sumi-600"}`}>
                      {tab.subLabel}
                    </span>
                  </span>

                  {/* Count Badge */}
                  {isActive && count > 0 && (
                    <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-torii-100 dark:bg-torii-500/20 text-torii-700 dark:text-torii-400 border border-torii-200 dark:border-torii-500/30 font-mono">
                      {count > 999 ? "999+" : count}
                    </span>
                  )}

                  {/* Active Underline Bar */}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-torii-500 rounded-t-full shadow-[0_0_8px_rgba(230,57,70,0.8)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Filters Toolbar: JLPT + Source + Shuffle + Refresh                 */}
        {/* ------------------------------------------------------------------ */}
        <div className="space-y-3 mb-8">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* JLPT Filter */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-sumi-900/80 border border-slate-200 dark:border-sumi-800 rounded-xl px-2.5 py-1.5 text-xs shadow-sm">
                <span className="text-slate-500 dark:text-sumi-500 text-[11px] font-mono">JLPT:</span>
                <select
                  value={selectedJlpt}
                  onChange={(e) => setSelectedJlpt(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-sumi-200 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-white dark:bg-sumi-900">Tất cả cấp độ</option>
                  <option value="N5" className="bg-white dark:bg-sumi-900">N5 (Sơ cấp 1)</option>
                  <option value="N4" className="bg-white dark:bg-sumi-900">N4 (Sơ cấp 2)</option>
                  <option value="N3" className="bg-white dark:bg-sumi-900">N3 (Trung cấp)</option>
                  <option value="N2" className="bg-white dark:bg-sumi-900">N2 (Cao cấp)</option>
                  <option value="N1" className="bg-white dark:bg-sumi-900">N1 (Bản xứ)</option>
                </select>
              </div>

              {/* Source Filter */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-sumi-900/80 border border-slate-200 dark:border-sumi-800 rounded-xl px-2.5 py-1.5 text-xs shadow-sm">
                <Globe className="w-3 h-3 text-slate-500 dark:text-sumi-500" />
                <select
                  value={selectedSourceId ?? ""}
                  onChange={(e) => setSelectedSourceId(e.target.value ? Number(e.target.value) : undefined)}
                  className="bg-transparent text-slate-800 dark:text-sumi-200 font-semibold focus:outline-none cursor-pointer max-w-[140px]"
                >
                  <option value="" className="bg-white dark:bg-sumi-900">Tất cả nguồn</option>
                  {sources.map((src) => (
                    <option key={src.id} value={src.id} className="bg-white dark:bg-sumi-900">
                      {src.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right: Shuffle + Refresh */}
            <div className="flex items-center gap-2">
              {/* Tổng số bài */}
              {!isLoading && totalCount > 0 && (
                <span className="text-[11px] text-slate-500 dark:text-sumi-500 font-mono hidden sm:block">
                  {totalCount} bài đọc
                </span>
              )}

              {/* Shuffle button */}
              <button
                onClick={handleShuffle}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-sumi-900/80 border border-slate-200 dark:border-sumi-800 text-slate-700 dark:text-sumi-400 hover:text-amber-800 dark:hover:text-kintsugi-300 hover:bg-slate-100 dark:hover:bg-sumi-850 hover:border-amber-300 dark:hover:border-kintsugi-700/40 transition-all text-xs font-semibold shadow-sm"
                title="Xáo trộn bài đọc ngẫu nhiên"
              >
                <Shuffle className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Xáo trộn</span>
              </button>

              {/* Refresh button */}
              <button
                onClick={() => loadFeed({ isRefresh: true })}
                disabled={isRefreshing}
                className="p-2 rounded-xl bg-white dark:bg-sumi-900/80 border border-slate-200 dark:border-sumi-800 text-slate-700 dark:text-sumi-400 hover:text-slate-900 dark:hover:text-sumi-200 hover:bg-slate-100 dark:hover:bg-sumi-850 transition-colors shadow-sm"
                title="Làm mới feed"
              >
                <RotateCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-torii-500 dark:text-torii-400" : ""}`} />
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-sumi-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tiêu đề, từ khóa, hoặc chủ đề tiếng Nhật..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-sumi-900/60 border border-slate-200 dark:border-sumi-800/80 focus:border-torii-500/50 focus:bg-white text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-sumi-500 transition-all outline-none font-medium shadow-sm"
            />
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Feed Grid                                                           */}
        {/* ------------------------------------------------------------------ */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="h-64 rounded-2xl bg-sumi-900/40 border border-sumi-800/40 animate-pulse p-5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="h-4 w-24 bg-sumi-800 rounded" />
                  <div className="h-6 w-5/6 bg-sumi-800 rounded" />
                  <div className="h-12 w-full bg-sumi-800/60 rounded" />
                </div>
                <div className="h-4 w-1/3 bg-sumi-800 rounded" />
              </div>
            ))}
          </div>
        ) : feedItems.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl bg-sumi-900/30 border border-sumi-850">
            <div className="w-14 h-14 rounded-2xl bg-torii-500/10 text-torii-400 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Chưa tìm thấy bài đọc phù hợp</h3>
            <p className="text-xs text-sumi-400 max-w-md mx-auto mb-5 leading-relaxed">
              Hãy thử chọn tab khác, đổi cấp độ JLPT hoặc chạy Ingestion để nạp thêm nội dung mới từ các nguồn đang hoạt động.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/ingestion"
                className="px-4 py-2 rounded-xl bg-torii-500 hover:bg-torii-600 text-white text-xs font-semibold transition-all shadow-[0_0_15px_rgba(230,57,70,0.3)]"
              >
                Xem Pipeline Ingestion
              </Link>
              <Link
                href="/sources"
                className="px-4 py-2 rounded-xl bg-sumi-800 hover:bg-sumi-750 text-sumi-200 text-xs font-semibold transition-colors"
              >
                Quản lý nguồn tin
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
              {feedItems.map((item) => (
                <FeedCard key={item.content_id} item={item} onSaveToggle={handleSaveToggle} />
              ))}
            </div>

            {/* Infinite Scroll Sentinel */}
            <div ref={sentinelRef} className="flex justify-center py-6">
              {isLoadingMore && (
                <div className="flex items-center gap-3 text-sumi-400 text-xs font-mono">
                  <div className="w-4 h-4 rounded-full border-2 border-torii-500/40 border-t-torii-400 animate-spin" />
                  <span>Đang tải thêm bài đọc...</span>
                </div>
              )}
              {!hasNext && !isLoadingMore && feedItems.length > 0 && (
                <p className="text-xs text-sumi-600 font-mono">
                  ✨ Bạn đã xem hết tất cả bài đọc trong mục này
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
