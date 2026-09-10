"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BookOpen,
  Search,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Clock,
  Link2,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  TopicDetailResponse,
  TopicTimelineResponse,
  TopicArticleItem,
  RabbitHoleResponse,
} from "@/lib/types";

type SourceFilter = "ALL" | "NEWS" | "SOCIAL" | "BLOG";

const SOURCE_FILTERS: { id: SourceFilter; label: string }[] = [
  { id: "ALL", label: "Tất cả" },
  { id: "NEWS", label: "Báo chí" },
  { id: "SOCIAL", label: "Mạng xã hội" },
  { id: "BLOG", label: "Blog" },
];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function TopicReadingPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [detail, setDetail] = useState<TopicDetailResponse | null>(null);
  const [timeline, setTimeline] = useState<TopicTimelineResponse | null>(null);
  const [rabbitHole, setRabbitHole] = useState<RabbitHoleResponse | null>(null);

  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [d, t] = await Promise.all([
          api.getTopicDetail(slug),
          api.getTopicTimeline(slug),
        ]);
        if (cancelled) return;
        setDetail(d);
        setTimeline(t);
        if (d.topic?.id) {
          try {
            const rh = await api.getRabbitHole("TOPIC", d.topic.id);
            if (!cancelled) setRabbitHole(rh);
          } catch {
            // Chủ đề liên quan là phụ — lỗi thì bỏ qua.
          }
        }
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "Không thể tải thông tin chủ đề.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const articles = useMemo(() => {
    const events = timeline?.events || [];
    const q = search.trim().toLowerCase();
    return events.filter((ev) => {
      if (sourceFilter !== "ALL" && ev.source_type !== sourceFilter) return false;
      if (
        q &&
        !ev.title.toLowerCase().includes(q) &&
        !(ev.excerpt || "").toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [timeline, sourceFilter, search]);

  if (loading) {
    return (
      <div className="min-h-screen bg-sumi-950 text-sumi-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-orange-400" />
          <p className="text-sm text-sumi-400">Đang tải các bài viết...</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-sumi-950 text-sumi-100 py-12 px-4">
        <div className="max-w-xl mx-auto p-6 rounded-2xl bg-sumi-900 border border-sumi-800 text-center space-y-4">
          <h2 className="text-lg font-bold text-white">Không tìm thấy chủ đề</h2>
          <p className="text-xs text-sumi-400">{error || "Chủ đề này chưa có đủ bài viết."}</p>
          <Link
            href="/immersion/explore"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-orange-500 text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Quay về Khám phá
          </Link>
        </div>
      </div>
    );
  }

  const { topic } = detail;
  const sourceCount = Object.keys(detail.sources_breakdown || {}).length;
  const featured: TopicArticleItem | null =
    detail.representative_news ||
    detail.representative_blog ||
    detail.representative_social ||
    null;
  const related = (rabbitHole?.related_nodes || []).slice(0, 6);

  return (
    <div className="min-h-screen bg-sumi-950 text-sumi-100 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-sumi-400">
          <Link href="/immersion/explore" className="hover:text-white transition-colors">
            Khám phá
          </Link>
          <span>/</span>
          <span className="text-white font-medium truncate">{topic.name}</span>
        </div>

        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {topic.name}
          </h1>
          {topic.description && (
            <p className="text-sm text-sumi-300 max-w-3xl leading-relaxed">
              {topic.description}
            </p>
          )}
          <p className="text-xs text-sumi-400 font-mono">
            {detail.total_articles} bài viết
            {sourceCount > 0 && ` • ${sourceCount} nguồn`}
          </p>
        </div>

        {/* Đọc bài nổi bật */}
        {featured && (
          <Link
            href={`/immersion/content/${featured.content_id}`}
            className="block p-6 rounded-2xl bg-gradient-to-r from-orange-500/15 via-sumi-900 to-sumi-900 border border-orange-500/30 hover:border-orange-500/60 transition-all group space-y-2"
          >
            <span className="text-[10px] font-mono uppercase tracking-wider text-orange-400 font-bold">
              Bài nổi bật — đọc ngay
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-white group-hover:text-orange-200 transition-colors leading-snug">
              {featured.title}
            </h2>
            {featured.excerpt && (
              <p className="text-xs text-sumi-300 line-clamp-2 leading-relaxed">
                {featured.excerpt}
              </p>
            )}
            <span className="flex items-center gap-1.5 text-xs font-semibold text-orange-300 pt-1">
              <BookOpen className="w-3.5 h-3.5" />
              {featured.source_name}
              {featured.reading_time_minutes > 0 &&
                ` • ~${featured.reading_time_minutes} phút đọc`}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
        )}

        {/* Danh sách bài viết */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-orange-400" />
            <h3 className="text-base font-bold text-white">
              Tất cả bài viết ({articles.length})
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-sumi-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm bài viết trong chủ đề..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-sumi-900 border border-sumi-800 text-sm text-white placeholder:text-sumi-500 outline-none focus:border-orange-500/60"
              />
            </div>
            <div className="flex items-center gap-1 p-1 bg-sumi-900 border border-sumi-800 rounded-xl self-start">
              {SOURCE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSourceFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    sourceFilter === f.id
                      ? "bg-orange-500 text-white"
                      : "text-sumi-400 hover:text-white hover:bg-sumi-800/60"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {articles.length === 0 ? (
            <p className="text-sm text-sumi-400 py-8 text-center">
              Không có bài viết nào khớp. Thử từ khóa khác hoặc chọn nhóm nguồn khác.
            </p>
          ) : (
            <div className="divide-y divide-sumi-800/60 rounded-2xl bg-sumi-900/60 border border-sumi-800 px-5">
              {articles.map((ev) => (
                <div key={ev.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sumi-800 text-sumi-300">
                        {ev.source_name}
                      </span>
                      <span className="font-mono text-sumi-500 text-[11px] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(ev.timestamp)}
                      </span>
                    </div>
                    <Link
                      href={`/immersion/content/${ev.content_id}`}
                      className="text-sm font-semibold text-white hover:text-orange-300 transition-colors block leading-snug"
                    >
                      {ev.title}
                    </Link>
                    {ev.excerpt && (
                      <p className="text-xs text-sumi-400 line-clamp-1">{ev.excerpt}</p>
                    )}
                  </div>
                  <Link
                    href={`/immersion/content/${ev.content_id}`}
                    className="flex-shrink-0 text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 font-semibold pt-1"
                  >
                    Đọc <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Từ vựng trọng tâm */}
        {detail.recurring_vocabulary && detail.recurring_vocabulary.length > 0 && (
          <div className="p-6 rounded-2xl bg-sumi-900/80 border border-sumi-800 space-y-4">
            <h3 className="text-base font-bold text-white tracking-tight">
              Từ vựng hay gặp trong chủ đề
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {detail.recurring_vocabulary.map((vocab, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-sumi-950/80 border border-sumi-800/80 space-y-1"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold text-white">{vocab.term}</span>
                    {vocab.reading && (
                      <span className="text-xs text-amber-400 font-mono truncate">
                        [{vocab.reading}]
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-sumi-300">{vocab.meaning}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chủ đề liên quan */}
        {related.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-sumi-400" />
              Chủ đề liên quan
            </h3>
            <div className="flex flex-wrap gap-2">
              {related.map((node) => (
                <Link
                  key={node.id}
                  href={`/immersion/topics/${node.slug || node.id}`}
                  className="px-3.5 py-2 rounded-xl bg-sumi-900 border border-sumi-800 hover:border-orange-500/40 text-xs font-semibold text-sumi-200 hover:text-orange-200 transition-all"
                >
                  {node.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
