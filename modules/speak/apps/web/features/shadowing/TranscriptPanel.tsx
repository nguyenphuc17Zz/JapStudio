"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  Search,
  Star,
  Play,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { TranscriptSegment } from "@/types/shadowing";
import { FuriganaRubyText } from "@/components/japanese/FuriganaRubyText";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";

export interface TranscriptPanelProps {
  segments: TranscriptSegment[];
  currentPlaybackTime: number;
  selectedSegmentId?: string;
  recommendedSegmentIds?: Set<string>;
  bookmarkedSegmentIds?: Set<string>;
  onToggleBookmark?: (segmentId: string) => void;
  segmentScores?: Record<string, number>;
  onSelectSegment: (segment: TranscriptSegment) => void;
  onSeek: (seconds: number) => void;
}

type FilterTab = "all" | "bookmarked" | "weak";

export function TranscriptPanel({
  segments,
  currentPlaybackTime,
  selectedSegmentId,
  bookmarkedSegmentIds = new Set(),
  onToggleBookmark,
  segmentScores = {},
  onSelectSegment,
  onSeek,
}: TranscriptPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastScrolledIdRef = useRef<string | null>(null);

  // Binary search for currently playing segment
  const playingSegment = useMemo(() => {
    if (!segments || segments.length === 0) return null;
    let low = 0;
    let high = segments.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      const s = segments[mid];
      if (currentPlaybackTime < s.start_time) high = mid - 1;
      else if (currentPlaybackTime > s.end_time) low = mid + 1;
      else return s;
    }
    return null;
  }, [segments, currentPlaybackTime]);

  const playingSegmentId = playingSegment?.id;
  const activeTargetId = playingSegmentId || selectedSegmentId;

  // Auto-scroll to active segment
  useEffect(() => {
    if (!autoScrollEnabled || isAutoScrollPaused || !activeTargetId) return;
    if (lastScrolledIdRef.current === activeTargetId) return;

    const container = containerRef.current;
    const targetEl = itemRefs.current.get(activeTargetId);

    if (container && targetEl) {
      lastScrolledIdRef.current = activeTargetId;
      const scrollToY =
        targetEl.offsetTop - container.clientHeight / 2 + targetEl.offsetHeight / 2;
      container.scrollTo({ top: Math.max(0, scrollToY), behavior: "smooth" });
    }
  }, [activeTargetId, autoScrollEnabled, isAutoScrollPaused]);

  const filteredSegments = useMemo(() => {
    let list = segments;
    if (activeTab === "bookmarked") {
      list = list.filter((s) => bookmarkedSegmentIds.has(s.id));
    } else if (activeTab === "weak") {
      list = list.filter((s) => {
        const score = segmentScores[s.id];
        return score !== undefined && score < 80;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.text.toLowerCase().includes(q) ||
          (s.vietnamese_translation && s.vietnamese_translation.toLowerCase().includes(q))
      );
    }
    return list;
  }, [segments, activeTab, bookmarkedSegmentIds, segmentScores, searchQuery]);

  const bookmarkedCount = bookmarkedSegmentIds.size;
  const weakCount = useMemo(
    () => Object.values(segmentScores).filter((sc) => sc < 80).length,
    [segmentScores]
  );

  const handleUserScroll = useCallback(() => {
    if (!isAutoScrollPaused && autoScrollEnabled) setIsAutoScrollPaused(true);
  }, [isAutoScrollPaused, autoScrollEnabled]);

  const setItemRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
  }, []);

  const handleSegmentClick = useCallback(
    (segment: TranscriptSegment) => {
      soundFX.playFurin();
      setIsAutoScrollPaused(false);
      lastScrolledIdRef.current = null;
      onSelectSegment(segment);
      onSeek(segment.start_time);
    },
    [onSelectSegment, onSeek]
  );

  return (
    <div className="flex flex-col rounded-2xl border border-border/80 bg-card/95 shadow-xs overflow-hidden relative h-full">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-border/50 space-y-2 bg-muted/10 shrink-0">
        {/* Title + auto-scroll */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-foreground">
              Lời Thoại
            </h3>
            <span className="text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded-lg">
              {segments.length} câu
            </span>
          </div>

          {/* Auto-scroll toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !autoScrollEnabled;
              setAutoScrollEnabled(next);
              if (next) {
                setIsAutoScrollPaused(false);
                lastScrolledIdRef.current = null;
              }
            }}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer",
              autoScrollEnabled
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-muted border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                autoScrollEnabled ? "bg-primary animate-pulse" : "bg-muted-foreground"
              )}
            />
            {autoScrollEnabled ? "Cuộn: Bật" : "Cuộn: Tắt"}
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-muted border border-border/60">
          {(
          [
            { key: "all" as FilterTab, label: `Tất cả (${segments.length})` },
            {
              key: "bookmarked" as FilterTab,
              label: `★ (${bookmarkedCount})`,
              hide: bookmarkedCount === 0,
            },
            {
              key: "weak" as FilterTab,
              label: `⚡ Yếu (${weakCount})`,
              hide: weakCount === 0,
            },
          ] as { key: FilterTab; label: string; hide?: boolean }[]
        )
          .filter((t) => !t.hide)
            .map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  soundFX.playFurin();
                  setActiveTab(tab.key);
                }}
                className={cn(
                  "flex-1 py-1 rounded-lg text-[10px] font-bold transition-all text-center",
                  activeTab === tab.key
                    ? "bg-card text-foreground border border-border shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm câu thoại..."
            className="w-full bg-background border border-border rounded-xl pl-7 pr-3 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Segments list */}
      <div
        ref={containerRef}
        onWheel={handleUserScroll}
        onTouchMove={handleUserScroll}
        className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0 scrollbar-thin"
      >
        {filteredSegments.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
            <p>Không tìm thấy câu thoại nào.</p>
            {activeTab !== "all" && (
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className="text-primary font-bold hover:underline"
              >
                Xem tất cả
              </button>
            )}
          </div>
        ) : (
          filteredSegments.map((segment, idx) => {
            const isSelected = selectedSegmentId === segment.id;
            const isPlayingNow = playingSegmentId === segment.id;
            const isBookmarked = bookmarkedSegmentIds.has(segment.id);
            const score = segmentScores[segment.id];

            return (
              <TranscriptRow
                key={segment.id}
                segment={segment}
                index={idx}
                isSelected={isSelected}
                isPlayingNow={isPlayingNow}
                isBookmarked={isBookmarked}
                score={score}
                setItemRef={setItemRef}
                onClick={handleSegmentClick}
                onToggleBookmark={onToggleBookmark}
              />
            );
          })
        )}
      </div>

      {/* Resume auto-scroll button */}
      {autoScrollEnabled && isAutoScrollPaused && playingSegment && (
        <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-auto z-20">
          <button
            type="button"
            onClick={() => {
              soundFX.playFurin();
              setIsAutoScrollPaused(false);
              lastScrolledIdRef.current = null;
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold shadow-lg hover:bg-primary/90 transition-all ring-2 ring-primary/30 active:scale-95 animate-in fade-in slide-in-from-bottom-2"
          >
            <Play className="h-3 w-3 fill-current" />
            Tiếp tục cuộn
          </button>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────
// Transcript Row (Corodomo minimal style)
// ──────────────────────────────────────────

interface TranscriptRowProps {
  segment: TranscriptSegment;
  index: number;
  isSelected: boolean;
  isPlayingNow: boolean;
  isBookmarked: boolean;
  score?: number;
  setItemRef: (id: string, el: HTMLDivElement | null) => void;
  onClick: (segment: TranscriptSegment) => void;
  onToggleBookmark?: (segmentId: string) => void;
}

const TranscriptRow = React.memo(function TranscriptRow({
  segment,
  index,
  isSelected,
  isPlayingNow,
  isBookmarked,
  score,
  setItemRef,
  onClick,
  onToggleBookmark,
}: TranscriptRowProps) {
  return (
    <div
      ref={(el) => setItemRef(segment.id, el)}
      onClick={() => onClick(segment)}
      className={cn(
        "group relative p-2.5 rounded-xl border transition-all duration-150 cursor-pointer",
        isSelected
          ? "border-primary/50 bg-primary/8 shadow-xs ring-1 ring-primary/20"
          : isPlayingNow
          ? "border-emerald-500/40 bg-emerald-500/8 ring-1 ring-emerald-500/20"
          : "border-transparent hover:border-border hover:bg-muted/30"
      )}
    >
      {/* Top row: index, timestamp, score, bookmark */}
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1.5">
          {/* Playing indicator */}
          {isPlayingNow ? (
            <span className="flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute h-2 w-2 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          ) : (
            <span className="text-[10px] font-mono text-muted-foreground/60 w-4 text-right shrink-0">
              {(index + 1).toString().padStart(2, "0")}
            </span>
          )}
          <span className="text-[10px] font-mono text-primary/70">{formatTime(segment.start_time)}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Score badge */}
          {score !== undefined && (
            <span
              className={cn(
                "text-[9px] px-1.5 py-0.5 rounded-md font-bold font-mono",
                score >= 80
                  ? "bg-emerald-500/15 text-emerald-600"
                  : "bg-rose-500/15 text-rose-500"
              )}
            >
              {score}
            </span>
          )}

          {/* Bookmark */}
          {onToggleBookmark && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                soundFX.playSuikinkutsu();
                onToggleBookmark(segment.id);
              }}
              className={cn(
                "p-0.5 rounded transition-colors",
                isBookmarked
                  ? "text-amber-400"
                  : "text-muted-foreground/30 hover:text-muted-foreground opacity-0 group-hover:opacity-100"
              )}
            >
              <Star className={cn("h-3 w-3", isBookmarked && "fill-current")} />
            </button>
          )}
        </div>
      </div>

      {/* Japanese text */}
      <div className="text-[13px] font-bold font-jp text-foreground leading-snug">
        <FuriganaRubyText
          text={segment.text}
          reading={segment.reading}
          ruby={segment.ruby}
          vocabulary={segment.vocabulary}
          displayMode="kanji_reading"
        />
      </div>

      {/* Vietnamese translation */}
      {segment.vietnamese_translation && (
        <p className="mt-0.5 text-[10px] text-muted-foreground leading-snug truncate">
          {segment.vietnamese_translation}
        </p>
      )}
    </div>
  );
});

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
