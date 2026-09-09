"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { FeedItem } from "@/lib/types";
import { immersionApi } from "@/lib/api";
import { formatRelativeTime } from "@/lib/date";
import {
  Clock,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface RelatedRailProps {
  items: FeedItem[];
}

const jlptStyle = (jlpt: string) => {
  switch ((jlpt || "").toUpperCase()) {
    case "N5":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "N4":
      return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
    case "N3":
      return "bg-sky-500/15 text-sky-300 border-sky-500/30";
    case "N2":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "N1":
    case "N1+":
      return "bg-rose-500/15 text-rose-300 border-rose-500/30";
    default:
      return "bg-sumi-800 text-sumi-300 border-sumi-700";
  }
};

const RelatedRailCard: React.FC<{ item: FeedItem }> = ({ item }) => {
  const [isSaved, setIsSaved] = useState(item.is_saved);
  const [saving, setSaving] = useState(false);
  const coverUrl = item.image_url || item.images?.[0]?.url;

  const toggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (saving) return;
    const next = !isSaved;
    setIsSaved(next);
    setSaving(true);
    try {
      await immersionApi.toggleSaveContent(item.content_id, next);
    } catch {
      setIsSaved(!next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="group relative flex flex-col shrink-0 w-[270px] sm:w-[300px] snap-start rounded-2xl bg-white dark:bg-sumi-900/70 border border-slate-200 dark:border-sumi-800/80 hover:border-torii-500/40 transition-all duration-300 shadow-sm hover:shadow-lg overflow-hidden">
      {coverUrl && (
        <Link
          href={`/immersion/content/${item.content_id}`}
          className="block h-32 overflow-hidden relative"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt={item.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <span
            className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono backdrop-blur-sm bg-black/50 ${jlptStyle(
              item.estimated_jlpt
            )}`}
          >
            {item.estimated_jlpt}
          </span>
        </Link>
      )}

      <div className="flex flex-col flex-1 p-4">
        {/* Match reason chips */}
        {(item.match_reasons?.length || 0) > 0 && (
          <div className="flex flex-wrap items-center gap-1 mb-2">
            <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-400 flex-shrink-0" />
            {item.match_reasons!.slice(0, 2).map((reason, idx) => (
              <span
                key={idx}
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 truncate max-w-full"
                title={reason}
              >
                {reason}
              </span>
            ))}
          </div>
        )}

        <Link
          href={`/immersion/content/${item.content_id}`}
          className="block group-hover:text-torii-600 dark:group-hover:text-torii-400 transition-colors"
        >
          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 mb-1">
            {item.title}
          </h4>
        </Link>
        <p className="text-[11px] text-slate-500 dark:text-sumi-500 font-mono mb-2 truncate">
          {item.source_name}
          {item.published_at ? ` • ${formatRelativeTime(item.published_at)}` : ""}
        </p>

        {item.progress_percent > 0 && (
          <div className="mb-2">
            <div className="w-full h-1 rounded-full bg-slate-200 dark:bg-sumi-800 overflow-hidden">
              <div
                className="h-full bg-torii-500 rounded-full"
                style={{ width: `${item.progress_percent}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-auto pt-2 border-t border-slate-100 dark:border-sumi-800/60 flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1 text-slate-500 dark:text-sumi-400 font-mono">
            <Clock className="w-3 h-3" />~{item.reading_time_minutes} phút
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleSave}
              title={isSaved ? "Bỏ lưu" : "Lưu bài đọc"}
              className={`p-1.5 rounded-lg border transition-all ${
                isSaved
                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40"
                  : "text-slate-400 dark:text-sumi-500 border-slate-200 dark:border-sumi-800 hover:text-slate-800 dark:hover:text-sumi-200"
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-amber-500 dark:fill-amber-400" : ""}`} />
            </button>
            <Link
              href={`/immersion/content/${item.content_id}`}
              className="flex items-center gap-0.5 font-semibold text-torii-600 dark:text-torii-400 hover:underline"
            >
              <span>{item.progress_percent > 0 ? "Đọc tiếp" : "Đọc"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};

export const RelatedRail: React.FC<RelatedRailProps> = ({ items }) => {
  const railRef = useRef<HTMLDivElement | null>(null);

  if (!items || items.length === 0) return null;

  const scrollBy = (dir: 1 | -1) => {
    railRef.current?.scrollBy({ left: dir * 640, behavior: "smooth" });
  };

  return (
    <div className="mt-14 pt-8 border-t border-sumi-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-sumi-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-torii-400" />
          Gợi ý đọc tiếp cho bạn
        </h3>
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={() => scrollBy(-1)}
            className="p-1.5 rounded-lg bg-white dark:bg-sumi-900 border border-slate-300 dark:border-sumi-800 text-slate-600 dark:text-sumi-300 hover:text-slate-950 dark:hover:text-white transition-colors"
            title="Cuộn sang trái"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scrollBy(1)}
            className="p-1.5 rounded-lg bg-white dark:bg-sumi-900 border border-slate-300 dark:border-sumi-800 text-slate-600 dark:text-sumi-300 hover:text-slate-950 dark:hover:text-white transition-colors"
            title="Cuộn sang phải"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-thin"
      >
        {items.map((item) => (
          <RelatedRailCard key={item.content_id} item={item} />
        ))}
      </div>
    </div>
  );
};
