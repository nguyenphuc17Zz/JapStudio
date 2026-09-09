"use client";

import React, { useState, useEffect } from "react";
import { SentenceDecomposition } from "@/lib/types";
import { immersionApi } from "@/lib/api";
import { X, Layers, Sparkles, BookOpen } from "lucide-react";

interface SentenceStructureModalProps {
  contentId: number;
  sentenceIndex: number | null;
  onClose: () => void;
}

export const SentenceStructureModal: React.FC<SentenceStructureModalProps> = ({
  contentId,
  sentenceIndex,
  onClose,
}) => {
  const [data, setData] = useState<SentenceDecomposition | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!sentenceIndex) return;
    setLoading(true);
    immersionApi
      .decomposeSentence(contentId, sentenceIndex)
      .then((res) => setData(res))
      .catch((err) => console.error("Failed to decompose sentence:", err))
      .finally(() => setLoading(false));
  }, [contentId, sentenceIndex]);

  if (!sentenceIndex) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl bg-sumi-900 border border-sumi-700 shadow-2xl p-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-pink-600 dark:text-pink-400">
                Phân rã ngữ pháp câu #{sentenceIndex}
              </span>
              <h3 className="text-lg font-bold text-sumi-900 dark:text-white font-serif tracking-wide">
                Cấu trúc câu tiếng Nhật
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-sumi-400 hover:text-sumi-900 dark:hover:text-white hover:bg-sumi-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-sumi-400">
            Đang phân tích cấu trúc ngữ pháp...
          </div>
        ) : data ? (
          <div className="space-y-4 text-xs">
            {/* Syntax Pattern Badge */}
            <div className="p-3.5 rounded-xl bg-sumi-950/70 border border-sumi-800">
              <span className="text-[10px] text-sumi-400 font-mono block mb-1">
                Mô hình cú pháp:
              </span>
              <p className="text-sm font-bold text-pink-700 dark:text-pink-300 font-mono">
                {data.syntax_pattern}
              </p>
            </div>

            {/* Components visual breakdown */}
            <div>
              <span className="text-sumi-700 dark:text-sumi-300 font-semibold block mb-2">
                Các thành phần cú pháp:
              </span>
              <div className="space-y-2">
                {data.components.map((comp, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-sumi-850/80 border border-sumi-750 flex items-center justify-between gap-3"
                  >
                    <span className="font-serif text-base font-bold text-sumi-900 dark:text-white">
                      {comp.text}
                    </span>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-pink-700 dark:text-pink-300 block">
                        {comp.role_vi}
                      </span>
                      <span className="text-[10px] text-sumi-500 font-mono">
                        {comp.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pedagogical Explanation */}
            {data.explanation && (
              <div className="p-3 rounded-xl bg-sumi-950/50 border border-sumi-850 text-sumi-300 leading-relaxed">
                {data.explanation}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-sumi-800 hover:bg-sumi-700 text-sumi-200 text-xs font-semibold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
