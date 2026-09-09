"use client";

import React, { useMemo, useState } from "react";
import {
  Heart,
  BookOpen,
  SlidersHorizontal,
  X,
  Languages,
  Subtitles,
} from "lucide-react";
import { TranscriptSegment, RubyChunk, ExtractedVocabulary } from "@/types/shadowing";
import { cn } from "@/lib/utils";

export interface CoroSubtitleBarProps {
  segment: TranscriptSegment | null;
  currentPlaybackTime: number;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  onSeekToTime?: (time: number) => void;
  onPlaySegment?: () => void;
  className?: string;
}

const KANJI_REGEX = /[\u4E00-\u9FAF\u3400-\u4DBF]/;

/**
 * Parses raw text and vocabulary into structured Ruby chunks when pre-parsed ruby is unavailable.
 */
function alignClientRuby(text: string, vocabulary?: ExtractedVocabulary[]): RubyChunk[] {
  if (!text) return [];
  if (!KANJI_REGEX.test(text)) {
    // Split by spaces or punctuation if non-kanji
    const words = text.split(/(\s+|[、。！？])/).filter(Boolean);
    return words.map((w) => ({ text: w, reading: null }));
  }

  const knownVocab = (vocabulary || [])
    .filter((v) => v.word && v.reading && KANJI_REGEX.test(v.word))
    .sort((a, b) => b.word.length - a.word.length);

  const chunks: RubyChunk[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    let matched = false;

    for (const v of knownVocab) {
      if (remaining.startsWith(v.word)) {
        chunks.push({
          text: v.word,
          reading: v.reading,
        });
        remaining = remaining.slice(v.word.length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      const nextChar = remaining[0];
      if (chunks.length > 0 && !chunks[chunks.length - 1].reading && !KANJI_REGEX.test(nextChar)) {
        chunks[chunks.length - 1].text += nextChar;
      } else {
        chunks.push({
          text: nextChar,
          reading: null,
        });
      }
      remaining = remaining.slice(1);
    }
  }

  return chunks;
}

export function CoroSubtitleBar({
  segment,
  currentPlaybackTime,
  isBookmarked = false,
  onToggleBookmark,
  onSeekToTime,
  onPlaySegment,
  className,
}: CoroSubtitleBarProps) {
  const [showJapanese, setShowJapanese] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [showFurigana, setShowFurigana] = useState(true);
  const [showVocabDrawer, setShowVocabDrawer] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Compute ruby chunks
  const chunks = useMemo<RubyChunk[]>(() => {
    if (!segment) return [];
    if (segment.ruby && segment.ruby.length > 0) {
      return segment.ruby;
    }
    return alignClientRuby(segment.text, segment.vocabulary);
  }, [segment]);

  // Compute active word/chunk index for real-time karaoke highlight
  const activeChunkIndex = useMemo(() => {
    if (!segment || chunks.length === 0) return -1;
    const duration = Math.max(0.2, segment.end_time - segment.start_time);
    const elapsed = currentPlaybackTime - segment.start_time;

    // Only highlight when current time is strictly within the segment
    if (elapsed < -0.1 || elapsed > duration + 0.1) return -1;

    const clampedElapsed = Math.max(0, Math.min(duration, elapsed));
    const totalChars = chunks.reduce((sum, c) => sum + Math.max(1, c.text.length), 0);
    const charProgress = (clampedElapsed / duration) * totalChars;

    let accumulated = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunkLen = Math.max(1, chunks[i].text.length);
      if (charProgress >= accumulated && charProgress < accumulated + chunkLen) {
        return i;
      }
      accumulated += chunkLen;
    }
    return chunks.length - 1;
  }, [segment, chunks, currentPlaybackTime]);

  const handleChunkClick = (index: number) => {
    if (!segment || !onSeekToTime || chunks.length === 0) return;
    const duration = Math.max(0.2, segment.end_time - segment.start_time);
    const totalChars = chunks.reduce((sum, c) => sum + Math.max(1, c.text.length), 0);
    let accumulated = 0;
    for (let i = 0; i < index; i++) {
      accumulated += Math.max(1, chunks[i].text.length);
    }
    const targetTime = segment.start_time + (accumulated / totalChars) * duration;
    onSeekToTime(targetTime);
  };

  if (isCollapsed) {
    return (
      <div className="flex items-center justify-end px-2">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition"
        >
          Hiển thị phụ đề & Karaoke
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm px-4 py-3 sm:px-5 sm:py-3 flex flex-col justify-between items-center h-[154px] min-h-[154px] max-h-[154px] text-center overflow-hidden relative transition-all",
        className
      )}
    >
      {/* ── Center Content: Locked Slots for Dark Pill & Translation ── */}
      <div className="w-full flex-1 flex flex-col items-center justify-center min-h-0">
        {/* Slot 1: Japanese Capsule Pill (Fixed height container) */}
        <div className="min-h-[52px] w-full flex items-center justify-center">
          {showJapanese && (
            <div className="inline-flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 px-4 py-1.5 rounded-2xl bg-[#2f3542] dark:bg-[#1e232a] text-white shadow-md max-w-full transition-all">
              {segment ? (
                chunks.map((chunk, idx) => {
                  const isActive = idx === activeChunkIndex;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleChunkClick(idx)}
                      className={cn(
                        "rounded px-1.5 py-0.5 transition-all duration-150 cursor-pointer select-none flex flex-col items-center justify-end leading-none",
                        isActive
                          ? "border border-emerald-400 bg-emerald-500/25 text-emerald-300 shadow-sm"
                          : "border border-transparent text-white/90 hover:text-white hover:bg-white/10"
                      )}
                      title={`Nhấp để phát từ "${chunk.text}"`}
                    >
                      {/* Tier 1: Furigana — Always reserves fixed height so baseline is locked */}
                      <span
                        className={cn(
                          "text-[10px] sm:text-[11px] leading-none select-none h-3 flex items-center justify-center font-normal mb-0.5",
                          chunk.reading && showFurigana ? "text-zinc-300" : "invisible"
                        )}
                      >
                        {chunk.reading || "\u00A0"}
                      </span>
                      {/* Tier 2: Main base text — Aligns on exact same horizontal line */}
                      <span className="font-jp text-sm sm:text-base font-bold leading-none">
                        {chunk.text}
                      </span>
                    </div>
                  );
                })
              ) : (
                <span className="text-xs text-zinc-400 italic px-2 self-center">
                  Chọn một câu thoại trong danh sách
                </span>
              )}
            </div>
          )}
        </div>

        {/* Slot 2: Vietnamese Translation (Fixed height container) */}
        <div className="min-h-[34px] w-full flex items-center justify-center px-2 mt-1">
          {showTranslation && (
            <p className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-100 max-w-2xl text-center leading-snug line-clamp-2">
              {segment ? segment.vietnamese_translation || segment.translation || "" : ""}
            </p>
          )}
        </div>

        {/* Absolute Vocabulary overlay drawer if opened */}
        {showVocabDrawer && segment?.vocabulary && segment.vocabulary.length > 0 && (
          <div className="absolute inset-0 bg-white/98 dark:bg-zinc-900/98 backdrop-blur-xs p-3.5 rounded-2xl flex flex-col z-20 overflow-y-auto animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-700">
              <div className="font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 text-xs">
                <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
                <span>Từ vựng quan trọng trong câu:</span>
              </div>
              <button
                type="button"
                onClick={() => setShowVocabDrawer(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 text-left">
              {segment.vocabulary.map((v, i) => (
                <div
                  key={i}
                  className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex flex-col"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-xs text-foreground">{v.word}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{v.reading}</span>
                  </div>
                  <span className="text-zinc-600 dark:text-zinc-400 text-[10px] mt-0.5">
                    {v.meaning}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Controls Bar (Corodomo style) ── */}
      <div className="w-full flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/80 text-xs shrink-0 mt-auto">
        {/* Left: Toggles */}
        <div className="flex items-center gap-2">
          {/* Phụ đề Toggle */}
          <button
            type="button"
            onClick={() => setShowJapanese((v) => !v)}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all",
              showJapanese
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200"
            )}
            title="Bật/tắt phụ đề tiếng Nhật"
          >
            <Subtitles className="h-3.5 w-3.5" />
            <span>Phụ đề</span>
          </button>

          {/* Bản dịch Toggle */}
          <button
            type="button"
            onClick={() => setShowTranslation((v) => !v)}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all",
              showTranslation
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200"
            )}
            title="Bật/tắt bản dịch tiếng Việt"
          >
            <Languages className="h-3.5 w-3.5" />
            <span>Bản dịch</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Bookmark */}
          {onToggleBookmark && (
            <button
              type="button"
              onClick={onToggleBookmark}
              className={cn(
                "p-1.5 rounded-lg transition hover:bg-zinc-100 dark:hover:bg-zinc-800",
                isBookmarked
                  ? "text-rose-500 hover:text-rose-600"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              )}
              title={isBookmarked ? "Bỏ lưu câu này" : "Lưu câu yêu thích"}
            >
              <Heart className={cn("h-4 w-4", isBookmarked && "fill-current")} />
            </button>
          )}

          {/* Vocabulary List Toggle */}
          {segment?.vocabulary && segment.vocabulary.length > 0 && (
            <button
              type="button"
              onClick={() => setShowVocabDrawer((v) => !v)}
              className={cn(
                "p-1.5 rounded-lg transition hover:bg-zinc-100 dark:hover:bg-zinc-800",
                showVocabDrawer
                  ? "text-emerald-500"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              )}
              title="Xem từ vựng trong câu"
            >
              <BookOpen className="h-4 w-4" />
            </button>
          )}

          {/* Furigana Settings Toggle */}
          <button
            type="button"
            onClick={() => setShowFurigana((v) => !v)}
            className={cn(
              "p-1.5 rounded-lg transition hover:bg-zinc-100 dark:hover:bg-zinc-800",
              showFurigana
                ? "text-emerald-500"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            )}
            title={showFurigana ? "Tắt phiên âm Furigana" : "Bật phiên âm Furigana"}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>

          {/* Close/Dismiss */}
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            title="Thu gọn phụ đề"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
