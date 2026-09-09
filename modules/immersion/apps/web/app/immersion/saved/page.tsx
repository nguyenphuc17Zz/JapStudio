"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { FeedCard } from "@/components/reader/FeedCard";
import { immersionApi } from "@/lib/api";
import { FeedItem } from "@/lib/types";
import { Bookmark, ArrowLeft, RotateCw, BookOpen } from "lucide-react";

export default function SavedContentPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadSaved = async () => {
    setIsLoading(true);
    try {
      const res = await immersionApi.getSavedContent(1, 50);
      setItems(res.items || []);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.error("Failed to load saved items:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSaved();
  }, []);

  const handleSaveToggle = (contentId: number, isSaved: boolean) => {
    if (!isSaved) {
      // Remove from saved list
      setItems((prev) => prev.filter((item) => item.content_id !== contentId));
      setTotalCount((prev) => Math.max(0, prev - 1));
    }
  };

  return (
    <div className="min-h-screen bg-sumi-950 text-sumi-100 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Link
              href="/immersion"
              className="p-2 rounded-xl bg-sumi-900 border border-sumi-800 text-sumi-400 hover:text-white hover:bg-sumi-850 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-amber-400 fill-amber-400" />
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  Bài Đọc Đã Lưu
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                  {totalCount} bài
                </span>
              </div>
              <p className="text-xs text-sumi-400 mt-0.5">
                Danh sách các bài báo, câu chuyện và bài đăng bạn đã lưu lại để đọc sau.
              </p>
            </div>
          </div>
        </div>

        {/* Content list */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="h-56 rounded-2xl bg-sumi-900/40 border border-sumi-800/40 animate-pulse p-5"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 px-4 rounded-3xl bg-sumi-900/30 border border-sumi-850">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-4">
              <Bookmark className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Chưa có bài đọc nào được lưu</h3>
            <p className="text-xs text-sumi-400 max-w-sm mx-auto mb-6">
              Khi duyệt Immersion Feed, bạn có thể nhấn biểu tượng bookmark để lưu bài đọc vào đây.
            </p>
            <Link
              href="/immersion"
              className="px-5 py-2.5 rounded-xl bg-torii-500 hover:bg-torii-600 text-white text-xs font-semibold shadow-lg transition-all"
            >
              Khám phá Immersion Feed &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((item) => (
              <FeedCard key={item.content_id} item={item} onSaveToggle={handleSaveToggle} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
