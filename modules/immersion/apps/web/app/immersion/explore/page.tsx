"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Compass,
  Flame,
  TrendingUp,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  ExternalLink,
  BookOpen,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  Zap,
  Globe2,
} from "lucide-react";
import { api } from "@/lib/api";
import { ExplorePageResponse, TrendingTopicItem } from "@/lib/types";

export default function ExploreJapanPage() {
  const [data, setData] = useState<ExplorePageResponse | null>(null);
  const [timeWindow, setTimeWindow] = useState<string>("24h");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isClustering, setIsClustering] = useState<boolean>(false);

  const fetchExploreData = async (window: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getExplorePage(window);
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Không thể tải dữ liệu xu hướng Nhật Bản.");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoCluster = async () => {
    try {
      setIsClustering(true);
      await api.autoClusterTopics();
      await fetchExploreData(timeWindow);
    } catch (err: any) {
      setError(err?.message || "Lỗi khi chạy gom cụm chủ đề.");
    } finally {
      setIsClustering(false);
    }
  };

  useEffect(() => {
    fetchExploreData(timeWindow);
  }, [timeWindow]);

  const renderFlames = (count: number) => {
    return (
      <span className="inline-flex items-center text-orange-400" title={`Độ nóng: ${count}/5 ngọn lửa`}>
        {"🔥".repeat(count)}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PEAK":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-torii-500/20 text-torii-300 border border-torii-500/30">Đỉnh điểm (Peak)</span>;
      case "RISING":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">Đang tăng (Rising)</span>;
      case "COOLING":
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-sumi-800 text-sumi-400 border border-sumi-700">Hạ nhiệt</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">Mới nổi (Emerging)</span>;
    }
  };

  return (
    <div className="min-h-screen bg-sumi-950 text-sumi-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header with Title & Time Window Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sumi-800/80 pb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500/20 to-torii-500/20 border border-orange-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.15)]">
              <Compass className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Khám Phá Xu Hướng Nhật Bản
                </h1>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-orange-950 text-orange-400 border border-orange-800/60">
                  Multi-Source Discovery
                </span>
              </div>
              <p className="text-xs text-sumi-400 mt-0.5">
                Những chủ đề nóng nhất đang diễn ra tại Nhật, đối chiếu qua góc nhìn Báo chí, Blog và Mạng xã hội
              </p>
            </div>
          </div>

          {/* Action & Time Window Switcher */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleAutoCluster}
              disabled={isClustering}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/20 disabled:opacity-50 transition-all cursor-pointer"
              title="Quét toàn bộ bài viết đã sync và gom lại theo cụm chủ đề"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isClustering ? "animate-spin" : ""}`} />
              {isClustering ? "Đang gom cụm..." : "Làm mới xu hướng AI"}
            </button>

            <div className="flex items-center gap-1.5 p-1 bg-sumi-900 border border-sumi-800 rounded-xl">
              {[
                { id: "24h", label: "24 giờ" },
                { id: "3d", label: "3 ngày" },
                { id: "7d", label: "7 ngày" },
                { id: "30d", label: "30 ngày" },
              ].map((tw) => (
                <button
                  key={tw.id}
                  onClick={() => setTimeWindow(tw.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    timeWindow === tw.id
                      ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                      : "text-sumi-400 hover:text-white hover:bg-sumi-800/60"
                  }`}
                >
                  {tw.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-24 text-sumi-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-orange-400" />
            <p className="text-sm">Đang phân tích các cụm chủ đề đa nguồn từ Nhật Bản...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-torii-500/10 border border-torii-500/30 text-torii-300 text-sm">
            {error}
          </div>
        ) : data && (data.trending_today.length === 0 || data.trending_today.every((t) => t.article_count === 0)) ? (
          <div className="text-center py-24 space-y-4 rounded-2xl bg-sumi-900/60 border border-sumi-800">
            <Compass className="w-10 h-10 mx-auto text-sumi-500" />
            <h2 className="text-lg font-bold text-white">Chưa có xu hướng trong {timeWindow}</h2>
            <p className="text-sm text-sumi-400 max-w-md mx-auto leading-relaxed">
              {data.trending_today.length === 0
                ? "Không có bài viết nào trong khoảng thời gian này. Hãy thử chọn khoảng thời gian dài hơn (7d / 30d), hoặc sync thêm nguồn RSS rồi bấm “Làm mới xu hướng AI”."
                : "Đã có cụm chủ đề nhưng chưa có bài viết nào được liên kết. Hãy vào trang Nguồn để sync nội dung, sau đó bấm “Làm mới xu hướng AI”."}
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/sources"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-sumi-800 hover:bg-sumi-700 text-white border border-sumi-700 transition-colors"
              >
                <Globe2 className="w-3.5 h-3.5" />
                Quản lý nguồn sync
              </Link>
              <button
                onClick={handleAutoCluster}
                disabled={isClustering}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white disabled:opacity-50 transition-all cursor-pointer"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isClustering ? "animate-spin" : ""}`} />
                {isClustering ? "Đang gom cụm..." : "Làm mới xu hướng AI"}
              </button>
            </div>
          </div>
        ) : data ? (
          <>
            {/* SECTION 1: 🔥 今日、日本で話題 (Trending Today) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    今日、日本で話題 (Chủ đề Nổi Bật Hôm Nay)
                  </h2>
                </div>
                <span className="text-xs text-sumi-400 font-mono">
                  {data.total_active_topics} chủ đề •{" "}
                  {data.trending_today.reduce((sum, t) => sum + t.article_count, 0)} bài viết trong {timeWindow}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.trending_today.map((item, idx) => (
                  <Link
                    key={item.id}
                    href={`/immersion/topics/${item.slug}`}
                    className="p-5 rounded-2xl bg-sumi-900/80 hover:bg-sumi-900 border border-sumi-800/80 hover:border-orange-500/40 transition-all hover:scale-[1.01] group space-y-3 shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-sumi-800 text-orange-400 font-bold font-mono text-xs flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <h3 className="text-base font-bold text-white group-hover:text-orange-300 transition-colors line-clamp-1">
                          {item.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderFlames(item.fire_count)}
                        {getStatusBadge(item.status)}
                      </div>
                    </div>

                    <p className="text-xs text-sumi-300 line-clamp-2 leading-relaxed">
                      {item.summary}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-sumi-800/60 text-[11px] text-sumi-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-mono text-sumi-300">
                          <BookOpen className="w-3.5 h-3.5 text-orange-400" />
                          {item.article_count} bài viết
                        </span>
                        <span className="flex items-center gap-1 font-mono text-emerald-400">
                          <TrendingUp className="w-3.5 h-3.5" />
                          +{Math.round(item.momentum_score)}%
                        </span>
                      </div>

                      {/* Source types pills */}
                      <div className="flex items-center gap-1">
                        {item.source_types.map((st, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-sumi-800 text-sumi-300 border border-sumi-700"
                          >
                            {st}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* SECTION 2: Gaining Attention & Rabbit Hole Starters */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Gaining Attention */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">Chủ đề Đang Tăng Tốc (Gaining Attention)</h3>
                </div>

                <div className="space-y-2.5">
                  {data.gaining_attention.map((item) => (
                    <Link
                      key={item.id}
                      href={`/immersion/topics/${item.slug}`}
                      className="p-3.5 rounded-xl bg-sumi-900/60 hover:bg-sumi-900 border border-sumi-800/80 flex items-center justify-between gap-3 group transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-white group-hover:text-orange-300 transition-colors">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-sumi-400 line-clamp-1">{item.summary}</div>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          +{Math.round(item.momentum_score)}% velocity
                        </span>
                        <span className="block text-[10px] text-sumi-500 font-mono">
                          Score: {Math.round(item.trend_score)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Right Col: Rabbit Hole Starters */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-sumi-900/90 to-sumi-950 border border-sumi-800 space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h3 className="text-base font-bold text-white">Rabbit Hole (Đào Sâu)</h3>
                </div>
                <p className="text-xs text-sumi-400 leading-relaxed">
                  Nhảy từ chủ đề này sang chủ đề liên quan để khám phá mạng lưới từ vựng và sự kiện liên kết.
                </p>

                <div className="space-y-2">
                  {data.rabbit_hole_starters.map((starter) => (
                    <Link
                      key={starter.id}
                      href={`/immersion/topics/${starter.slug}`}
                      className="p-3 rounded-xl bg-sumi-950/80 hover:bg-orange-500/10 border border-sumi-800/80 hover:border-orange-500/30 block group transition-all"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-orange-300">
                        <span>{starter.title}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-sumi-500 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <span className="text-[10px] text-orange-400 font-mono mt-0.5 block">
                        {starter.relation_hint}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* SECTION 3: Explore by Category */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Khám phá theo Danh mục Chuyên biệt</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.categories.map((cat) => (
                  <div
                    key={cat.category}
                    className="p-4 rounded-xl bg-sumi-900/60 border border-sumi-800 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">{cat.title}</h4>
                      <p className="text-[11px] text-sumi-400">{cat.description}</p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-sumi-800/50">
                      {cat.topics.length > 0 ? (
                        cat.topics.map((t) => (
                          <Link
                            key={t.id}
                            href={`/immersion/topics/${t.slug}`}
                            className="block text-xs text-sumi-300 hover:text-orange-400 truncate transition-colors py-0.5"
                          >
                            • {t.name}
                          </Link>
                        ))
                      ) : (
                        <span className="text-xs text-sumi-500 italic">Đang cập nhật thêm bài viết...</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
