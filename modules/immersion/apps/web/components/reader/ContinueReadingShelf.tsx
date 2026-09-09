"use client";

import React from "react";
import Link from "next/link";
import { FeedItem } from "@/lib/types";
import { BookOpen, Play, ChevronRight, Clock } from "lucide-react";

interface ContinueReadingShelfProps {
  items: FeedItem[];
}

export const ContinueReadingShelf: React.FC<ContinueReadingShelfProps> = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <section className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-torii-500/10 via-sumi-900/80 to-sumi-900/60 dark:from-torii-950/40 dark:via-sumi-900/60 dark:to-sumi-900/40 border border-torii-500/20 backdrop-blur-md shadow-sm dark:shadow-none">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-torii-500/20 flex items-center justify-center text-torii-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-sumi-200">
            Tiếp tục đọc (Đang dở)
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-torii-500/20 text-torii-300 font-mono">
            {items.length} bài
          </span>
        </div>

        <Link
          href="/immersion/history"
          className="text-xs text-sumi-400 hover:text-torii-300 flex items-center gap-1 transition-colors"
        >
          <span>Xem lịch sử</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {items.map((item) => (
          <Link
            key={item.content_id}
            href={`/immersion/content/${item.content_id}`}
            className="group relative p-3.5 rounded-xl bg-sumi-950/60 border border-sumi-800/80 hover:border-torii-500/40 hover:bg-sumi-900/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-medium text-sumi-400 truncate">
                  {item.source_name}
                </span>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-sumi-800 text-sumi-300 border border-sumi-700">
                  {item.estimated_jlpt}
                </span>
              </div>

              <h4 className="text-sm font-medium text-sumi-100 group-hover:text-torii-300 transition-colors line-clamp-2 leading-snug mb-2">
                {item.title}
              </h4>
            </div>

            <div>
              <div className="flex items-center justify-between text-[10px] text-sumi-400 mb-1.5 font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sumi-500" />
                  ~{item.reading_time_minutes}m
                </span>
                <span className="text-torii-400 font-semibold">{item.progress_percent}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-sumi-800 overflow-hidden">
                <div
                  className="h-full bg-torii-500 rounded-full transition-all duration-300"
                  style={{ width: `${item.progress_percent}%` }}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
