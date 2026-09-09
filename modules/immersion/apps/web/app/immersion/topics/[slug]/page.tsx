"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BookOpen,
  Compass,
  Layers,
  Flame,
  Clock,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Split,
  Calendar,
  Sparkles,
  Zap,
  RefreshCw,
  HelpCircle,
  Hash,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  TopicDetailResponse,
  TopicTimelineResponse,
  TopicSourceComparisonResponse,
  RabbitHoleResponse,
} from "@/lib/types";

export default function MultiSourceTopicPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [detail, setDetail] = useState<TopicDetailResponse | null>(null);
  const [timeline, setTimeline] = useState<TopicTimelineResponse | null>(null);
  const [comparison, setComparison] = useState<TopicSourceComparisonResponse | null>(null);
  const [rabbitHole, setRabbitHole] = useState<RabbitHoleResponse | null>(null);

  const [activeLens, setActiveLens] = useState<"ALL" | "NEWS" | "SOCIAL" | "BLOG" | "COMPARE" | "TIMELINE">("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTopicData = async () => {
    if (!slug) return;
    try {
      setLoading(true);
      setError(null);
      const [d, t, c] = await Promise.all([
        api.getTopicDetail(slug),
        api.getTopicTimeline(slug),
        api.getTopicComparison(slug),
      ]);
      setDetail(d);
      setTimeline(t);
      setComparison(c);

      // Fetch rabbit hole once topic id is known
      if (d.topic?.id) {
        const rh = await api.getRabbitHole("TOPIC", d.topic.id);
        setRabbitHole(rh);
      }
    } catch (err: any) {
      setError(err?.message || "Không thể tải thông tin chủ đề.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopicData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-sumi-950 text-sumi-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-orange-400" />
          <p className="text-sm text-sumi-400">Đang tổng hợp thông tin đa nguồn...</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-sumi-950 text-sumi-100 py-12 px-4">
        <div className="max-w-xl mx-auto p-6 rounded-2xl bg-sumi-900 border border-sumi-800 text-center space-y-4">
          <h2 className="text-lg font-bold text-white">Không tìm thấy chủ đề</h2>
          <p className="text-xs text-sumi-400">{error || "Chủ đề này chưa có đủ dữ liệu bài viết."}</p>
          <Link
            href="/immersion/explore"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-orange-500 text-white"
          >
            Quay về Khám phá
          </Link>
        </div>
      </div>
    );
  }

  const { topic, trending_info } = detail;

  return (
    <div className="min-h-screen bg-sumi-950 text-sumi-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-sumi-400">
          <Link href="/immersion/explore" className="hover:text-white transition-colors">
            Khám phá
          </Link>
          <span>/</span>
          <span className="capitalize">{topic.category}</span>
          <span>/</span>
          <span className="text-white font-medium truncate">{topic.name}</span>
        </div>

        {/* Topic Header Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-sumi-900 via-sumi-900/90 to-sumi-950 border border-sumi-800 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  {topic.category.toUpperCase()}
                </span>
                {trending_info && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-torii-500/20 text-torii-300 border border-torii-500/30">
                    🔥 Trend Score: {trending_info.trend_score}
                  </span>
                )}
                {topic.is_evergreen && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Chủ đề kinh điển (Evergreen)
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {topic.name}
              </h1>
              <p className="text-sm text-sumi-300 max-w-3xl leading-relaxed">
                {topic.description}
              </p>
            </div>

            {/* Diversity & Velocity Metrics Badge */}
            {trending_info && (
              <div className="p-4 rounded-2xl bg-sumi-950/80 border border-sumi-800/90 min-w-[200px] space-y-2 text-center">
                <div className="text-[10px] text-sumi-400 font-semibold uppercase tracking-wider">
                  Độ đa dạng nguồn tin
                </div>
                <div className="text-2xl font-bold font-mono text-cyan-400">
                  {trending_info.source_diversity_score}%
                </div>
                <div className="text-[11px] text-sumi-400">
                  {trending_info.source_types.join(" • ")}
                </div>
              </div>
            )}
          </div>

          {/* Keywords / Aliases Pills */}
          {topic.aliases && topic.aliases.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-sumi-800/60">
              <span className="text-xs text-sumi-400 mr-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" /> Biến thể & Từ khóa:
              </span>
              {topic.aliases.map((alias, i) => (
                <span key={i} className="px-2.5 py-1 rounded-lg text-xs bg-sumi-950 text-sumi-300 border border-sumi-800">
                  {alias}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Lens Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-sumi-800/80 pb-2 overflow-x-auto">
          {[
            { id: "ALL", label: "Tất cả nguồn" },
            { id: "COMPARE", label: "So sánh Đa Lăng Kính (Compare Lenses)" },
            { id: "TIMELINE", label: `Dòng thời gian (${detail.timeline_count})` },
            { id: "NEWS", label: "Báo chí (News)" },
            { id: "SOCIAL", label: "Mạng xã hội (Social)" },
            { id: "BLOG", label: "Bài phân tích (Blogs)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveLens(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeLens === tab.id
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                  : "text-sumi-400 hover:text-white hover:bg-sumi-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: COMPARE LENSES & REGISTER COMPARISON */}
        {(activeLens === "COMPARE" || activeLens === "ALL") && (
          <div className="space-y-6">
            {/* Signature Feature: Language Register Lens */}
            <div className="p-6 rounded-2xl bg-sumi-900/80 border border-sumi-800 space-y-5">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Cùng một chủ đề — Đa dạng tầng văn phong (Language Register Lens)
                  </h3>
                </div>
                <p className="text-xs text-sumi-400 mt-1">
                  Cách người Nhật sử dụng từ ngữ và ngữ pháp khác biệt tùy theo bối cảnh trang trọng, đời thường hoặc Internet
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {detail.register_comparison.map((rc, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-sumi-950/80 border border-sumi-800 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        rc.register === "FORMAL"
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          : rc.register === "CASUAL"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-pink-500/20 text-pink-300 border border-pink-500/30"
                      }`}>
                        {rc.label}
                      </span>
                      <div className="p-3 rounded-lg bg-sumi-900/90 text-sm font-serif text-white leading-relaxed">
                        "{rc.sample_sentence}"
                      </div>
                      <p className="text-xs text-sumi-300 leading-relaxed">{rc.nuance}</p>
                    </div>
                    <div className="text-[10px] text-sumi-500 font-mono pt-2 border-t border-sumi-800/50">
                      Nguồn: {rc.source_name}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Side-by-Side Source Lens Comparison */}
            {comparison && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl bg-sumi-900/70 border border-blue-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                    <BookOpen className="w-4 h-4" /> Báo chí chính thống (News)
                  </div>
                  <div className="space-y-1.5 text-xs text-sumi-300 leading-relaxed">
                    <p><strong>Trọng tâm:</strong> {comparison.news_lens.focus}</p>
                    <p><strong>Giọng điệu:</strong> {comparison.news_lens.tone}</p>
                    <p className="text-blue-300 font-medium pt-1">💡 {comparison.news_lens.key_takeaway}</p>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-sumi-900/70 border border-pink-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-pink-400 font-bold text-sm">
                    <MessageSquare className="w-4 h-4" /> Mạng xã hội (Social)
                  </div>
                  <div className="space-y-1.5 text-xs text-sumi-300 leading-relaxed">
                    <p><strong>Trọng tâm:</strong> {comparison.social_lens.focus}</p>
                    <p><strong>Giọng điệu:</strong> {comparison.social_lens.tone}</p>
                    <p className="text-pink-300 font-medium pt-1">💡 {comparison.social_lens.key_takeaway}</p>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-sumi-900/70 border border-amber-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Layers className="w-4 h-4" /> Blog & Góc nhìn sâu (Blogs)
                  </div>
                  <div className="space-y-1.5 text-xs text-sumi-300 leading-relaxed">
                    <p><strong>Trọng tâm:</strong> {comparison.blog_lens.focus}</p>
                    <p><strong>Giọng điệu:</strong> {comparison.blog_lens.tone}</p>
                    <p className="text-amber-300 font-medium pt-1">💡 {comparison.blog_lens.key_takeaway}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TIMELINE VIEW */}
        {(activeLens === "TIMELINE" || activeLens === "ALL") && timeline && timeline.events.length > 0 && (
          <div className="p-6 rounded-2xl bg-sumi-900/80 border border-sumi-800 space-y-5">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white tracking-tight">
                Dòng Thời Gian Diễn Biến (Multi-Source Timeline)
              </h3>
            </div>

            <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-sumi-800">
              {timeline.events.map((ev) => (
                <div key={ev.id} className="relative pl-8 space-y-1">
                  <span className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-orange-500 ring-4 ring-sumi-950" />
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-sumi-400">
                      {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(ev.timestamp).toLocaleDateString()}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sumi-800 text-sumi-300">
                      {ev.source_name}
                    </span>
                  </div>
                  <Link
                    href={`/immersion/content/${ev.content_id}`}
                    className="text-sm font-semibold text-white hover:text-orange-400 transition-colors block"
                  >
                    {ev.title}
                  </Link>
                  <p className="text-xs text-sumi-400 line-clamp-1">{ev.excerpt}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REPRESENTATIVE STORIES CARDS */}
        {(activeLens === "ALL" || activeLens === "NEWS" || activeLens === "SOCIAL" || activeLens === "BLOG") && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-orange-400" />
              {activeLens === "NEWS"
                ? "Bài Báo Chính Thống Tiêu Biểu"
                : activeLens === "SOCIAL"
                ? "Thảo Luận Mạng Xã Hội Tiêu Biểu"
                : activeLens === "BLOG"
                ? "Bài Viết Phân Tích & Blog Tiêu Biểu"
                : "Các Bài Báo & Thảo Luận Tiêu Biểu"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(activeLens === "ALL" || activeLens === "NEWS") && detail.representative_news && (
                <Link
                  href={`/immersion/content/${detail.representative_news.content_id}`}
                  className="p-5 rounded-xl bg-sumi-900/70 hover:bg-sumi-900 border border-sumi-800 hover:border-blue-500/40 transition-all space-y-3 group"
                >
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    BÁO CHÍ
                  </span>
                  <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-2">
                    {detail.representative_news.title}
                  </h4>
                  <p className="text-xs text-sumi-400 line-clamp-2">{detail.representative_news.excerpt}</p>
                  <div className="text-[10px] text-sumi-500 font-mono pt-2 border-t border-sumi-800/50">
                    {detail.representative_news.source_name}
                  </div>
                </Link>
              )}

              {(activeLens === "ALL" || activeLens === "SOCIAL") && detail.representative_social && (
                <Link
                  href={`/immersion/content/${detail.representative_social.content_id}`}
                  className="p-5 rounded-xl bg-sumi-900/70 hover:bg-sumi-900 border border-sumi-800 hover:border-pink-500/40 transition-all space-y-3 group"
                >
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                    MẠNG XÃ HỘI
                  </span>
                  <h4 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors line-clamp-2">
                    {detail.representative_social.title}
                  </h4>
                  <p className="text-xs text-sumi-400 line-clamp-2">{detail.representative_social.excerpt}</p>
                  <div className="text-[10px] text-sumi-500 font-mono pt-2 border-t border-sumi-800/50">
                    {detail.representative_social.source_name}
                  </div>
                </Link>
              )}

              {(activeLens === "ALL" || activeLens === "BLOG") && detail.representative_blog && (
                <Link
                  href={`/immersion/content/${detail.representative_blog.content_id}`}
                  className="p-5 rounded-xl bg-sumi-900/70 hover:bg-sumi-900 border border-sumi-800 hover:border-amber-500/40 transition-all space-y-3 group"
                >
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    BLOG & PHÂN TÍCH
                  </span>
                  <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                    {detail.representative_blog.title}
                  </h4>
                  <p className="text-xs text-sumi-400 line-clamp-2">{detail.representative_blog.excerpt}</p>
                  <div className="text-[10px] text-sumi-500 font-mono pt-2 border-t border-sumi-800/50">
                    {detail.representative_blog.source_name}
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* DEDICATED LENS ARTICLE LIST (When filtering by News, Social, or Blog) */}
        {(activeLens === "NEWS" || activeLens === "SOCIAL" || activeLens === "BLOG") && timeline && (
          <div className="p-6 rounded-2xl bg-sumi-900/80 border border-sumi-800 space-y-4">
            <h3 className="text-base font-bold text-white tracking-tight">
              Toàn bộ bài viết thuộc nhóm {activeLens === "NEWS" ? "Báo chí" : activeLens === "SOCIAL" ? "Mạng xã hội" : "Blog"} ({timeline.events.filter(e => e.source_type === activeLens).length})
            </h3>
            <div className="divide-y divide-sumi-800/60">
              {timeline.events.filter(e => e.source_type === activeLens).map((ev) => (
                <div key={ev.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sumi-800 text-sumi-300">
                        {ev.source_name}
                      </span>
                      <span className="font-mono text-sumi-500 text-[11px]">
                        {new Date(ev.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <Link
                      href={`/immersion/content/${ev.content_id}`}
                      className="text-sm font-semibold text-white hover:text-orange-400 transition-colors block"
                    >
                      {ev.title}
                    </Link>
                    <p className="text-xs text-sumi-400 line-clamp-1">{ev.excerpt}</p>
                  </div>
                  <Link
                    href={`/immersion/content/${ev.content_id}`}
                    className="flex-shrink-0 text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 font-semibold pt-1"
                  >
                    Đọc bài <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RECURRING VOCABULARY SECTION */}
        {detail.recurring_vocabulary && detail.recurring_vocabulary.length > 0 && (
          <div className="p-6 rounded-2xl bg-sumi-900/80 border border-sumi-800 space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white tracking-tight">
                Từ Vựng Trọng Tâm Của Chủ Đề (Key Topic Vocabulary)
              </h3>
            </div>
            <p className="text-xs text-sumi-400">
              Các thuật ngữ và từ vựng then chốt xuất hiện liên tục trong các bài báo và thảo luận thực tế:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
              {detail.recurring_vocabulary.map((vocab, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-sumi-950/80 border border-sumi-800/80 space-y-1"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold text-white">{vocab.term}</span>
                    {vocab.reading && (
                      <span className="text-xs text-amber-400 font-mono">[{vocab.reading}]</span>
                    )}
                  </div>
                  <p className="text-xs text-sumi-300">{vocab.meaning}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RABBIT HOLE NAVIGATION COMPONENT */}
        {rabbitHole && rabbitHole.related_nodes && rabbitHole.related_nodes.length > 0 && (
          <div className="p-6 rounded-2xl bg-sumi-900/90 border border-orange-500/30 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-400" />
              <h3 className="text-base font-bold text-white">
                🌀 Khám Phá Sâu Hơn (Rabbit Hole)
              </h3>
            </div>
            <p className="text-xs text-sumi-400">
              Nhảy tiếp sang các chủ đề liên đới trực tiếp để mở rộng vốn từ vựng và nắm bắt bối cảnh văn hóa liên quan:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
              {rabbitHole.related_nodes.map((node) => (
                <Link
                  key={node.id}
                  href={`/immersion/topics/${node.slug || node.id}`}
                  className="p-3.5 rounded-xl bg-sumi-950 hover:bg-orange-500/10 border border-sumi-800 hover:border-orange-500/30 group transition-all"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-orange-300">
                    <span className="truncate max-w-[80%]">{node.title}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-sumi-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <span className="text-[10px] text-orange-400 font-mono mt-1 block">
                    {node.relation_label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
