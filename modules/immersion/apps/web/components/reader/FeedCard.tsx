"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FeedItem } from "@/lib/types";
import { immersionApi } from "@/lib/api";
import { formatRelativeTime } from "@/lib/date";
import { Clock, Bookmark, Sparkles, ExternalLink, MessageCircle, Newspaper, BookOpen, Share2 } from "lucide-react";

interface FeedCardProps {
  item: FeedItem;
  onSaveToggle?: (contentId: number, isSaved: boolean) => void;
}

export const FeedCard: React.FC<FeedCardProps> = ({ item, onSaveToggle }) => {
  const [isSaved, setIsSaved] = useState(item.is_saved);
  const [saving, setSaving] = useState(false);

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (saving) return;

    const nextState = !isSaved;
    setIsSaved(nextState);
    setSaving(true);
    try {
      await immersionApi.toggleSaveContent(item.content_id, nextState);
      if (onSaveToggle) {
        onSaveToggle(item.content_id, nextState);
      }
    } catch (err) {
      console.error("Failed to toggle save:", err);
      setIsSaved(!nextState); // Rollback
    } finally {
      setSaving(false);
    }
  };

  const getJlptBadgeColor = (jlpt: string) => {
    switch (jlpt.toUpperCase()) {
      case "N5":
        return "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border-emerald-300/80 dark:border-emerald-800/60";
      case "N4":
        return "bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-400 border-cyan-300/80 dark:border-cyan-800/60";
      case "N3":
        return "bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-400 border-sky-300/80 dark:border-sky-800/60";
      case "N2":
        return "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border-amber-300/80 dark:border-amber-800/60";
      case "N1":
      case "N1+":
        return "bg-rose-100 dark:bg-torii-950/80 text-rose-700 dark:text-torii-400 border-rose-300/80 dark:border-torii-800/60";
      default:
        return "bg-sumi-800 text-sumi-300 border-sumi-700";
    }
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType.toUpperCase()) {
      case "SOCIAL":
        return <MessageCircle className="w-3.5 h-3.5 text-sky-400" />;
      case "NEWS":
        return <Newspaper className="w-3.5 h-3.5 text-torii-400" />;
      case "BLOG":
        return <BookOpen className="w-3.5 h-3.5 text-kintsugi-400" />;
      default:
        return <BookOpen className="w-3.5 h-3.5 text-sumi-400" />;
    }
  };

  const isSocial = item.source_type?.toUpperCase() === "SOCIAL";
  const coverUrl = item.image_url || item.images?.[0]?.url;
  const inlineCount = item.images_count ?? item.images?.length ?? 0;

  return (
    <article className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-sumi-900/60 border border-slate-200 dark:border-sumi-800/80 hover:border-slate-300 dark:hover:border-sumi-700/90 hover:bg-slate-50 dark:hover:bg-sumi-900/90 transition-all duration-300 shadow-sm hover:shadow-md">
      {coverUrl && (
        <Link
          href={`/immersion/content/${item.content_id}`}
          className="block -mx-5 -mt-5 mb-4 overflow-hidden rounded-t-2xl relative"
        >
          {/* Hotlinked original cover image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt={item.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
            className="w-full h-40 object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
          {inlineCount > 1 && (
            <span className="absolute bottom-2 right-2 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white border border-white/20">
              {inlineCount} ảnh
            </span>
          )}
        </Link>
      )}
      <div>
        {/* Top Header: Source info + JLPT + Bookmark */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-sumi-800/80 border border-slate-200 dark:border-sumi-700/60">
              {getSourceIcon(item.source_type)}
            </span>
            <div className="truncate">
              <span className="text-xs font-semibold text-slate-800 dark:text-sumi-200 truncate block">
                {item.source_name}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-sumi-500 font-mono block">
                {item.source_type.toLowerCase()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border font-mono ${getJlptBadgeColor(
                item.estimated_jlpt
              )}`}
            >
              {item.estimated_jlpt}
            </span>

            {item.canonical_url && (
              <a
                href={item.canonical_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title={`Xem bài viết gốc trên ${item.source_name || "nguồn"}`}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-sumi-800 text-slate-500 dark:text-sumi-500 hover:text-torii-600 dark:hover:text-torii-400 hover:border-torii-500/40 hover:bg-torii-50 dark:hover:bg-torii-950/30 transition-all flex items-center justify-center"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              onClick={handleSaveToggle}
              title={isSaved ? "Bỏ lưu bài đọc" : "Lưu vào danh sách đọc"}
              className={`p-1.5 rounded-lg border transition-all ${
                isSaved
                  ? "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-500/40 hover:bg-amber-200 dark:hover:bg-amber-500/30"
                  : "text-slate-500 dark:text-sumi-400 border-slate-200 dark:border-sumi-800 hover:text-slate-900 dark:hover:text-sumi-200 hover:bg-slate-100 dark:hover:bg-sumi-800/60"
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? "fill-amber-500 dark:fill-amber-400 text-amber-600 dark:text-amber-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Content Title */}
        <Link href={`/immersion/content/${item.content_id}`} className="block group-hover:text-torii-600 dark:group-hover:text-torii-500 transition-colors">
          <h3
            className={`tracking-tight text-slate-900 dark:text-white mb-2 leading-relaxed ${
              isSocial ? "text-base italic font-medium" : "text-lg font-bold"
            }`}
          >
            {item.title}
          </h3>

          {/* Excerpt */}
          {item.excerpt && (
            <p className="text-xs text-slate-600 dark:text-sumi-400 line-clamp-3 leading-relaxed mb-3 font-medium">
              {item.excerpt}
            </p>
          )}
        </Link>

        {/* Topics / Tags */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-sumi-800/90 text-slate-700 dark:text-sumi-300 border border-slate-200 dark:border-sumi-750">
            #{item.primary_topic}
          </span>
          {item.secondary_topics?.slice(0, 2).map((t, idx) => (
            <span
              key={idx}
              className="text-[10px] text-slate-600 dark:text-sumi-500 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-sumi-950/40 border border-slate-200 dark:border-sumi-850 font-medium"
            >
              #{t}
            </span>
          ))}
        </div>
      </div>

      {/* Card Footer: Reading time, Progress, Action */}
      <div className="pt-3 border-t border-slate-200 dark:border-sumi-800/60">
        {item.progress_percent > 0 && (
          <div className="mb-2.5">
            <div className="flex items-center justify-between text-[10px] text-sumi-600 dark:text-sumi-400 mb-1 font-mono">
              <span>Tiến độ đọc</span>
              <span className="text-torii-600 dark:text-torii-400 font-semibold">{item.progress_percent}%</span>
            </div>
            <div className="w-full h-1 rounded-full bg-sumi-200 dark:bg-sumi-800 overflow-hidden">
              <div
                className="h-full bg-torii-500 rounded-full transition-all duration-300"
                style={{ width: `${item.progress_percent}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-sumi-600 dark:text-sumi-400">
          <div className="flex items-center gap-1.5 font-mono">
            <Clock className="w-3.5 h-3.5 text-sumi-500" />
            <span>
              {item.published_at ? `${formatRelativeTime(item.published_at)} • ` : ""}~{item.reading_time_minutes} phút
            </span>
          </div>

          <Link
            href={`/immersion/content/${item.content_id}`}
            className="flex items-center gap-1 font-semibold text-torii-600 dark:text-torii-400 group-hover:text-torii-700 dark:group-hover:text-torii-300 hover:underline transition-colors"
          >
            <span>{item.progress_percent > 0 ? "Đọc tiếp" : "Bắt đầu đọc"}</span>
            <span className="text-xs">&rarr;</span>
          </Link>
        </div>
      </div>
    </article>
  );
};
