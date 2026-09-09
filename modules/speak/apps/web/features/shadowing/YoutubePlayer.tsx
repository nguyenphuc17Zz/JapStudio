"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { TranscriptSegment, RubyChunk } from "@/types/shadowing";
import { cn } from "@/lib/utils";

interface YoutubePlayerProps {
  videoId: string;
  onTimeUpdate?: (currentTime: number) => void;
  loopRange?: { start: number; end: number } | null;
  loopGap?: number;
  pauseAtTime?: number | null;
  onPauseAtTimeReached?: () => void;
  playbackSpeed?: number;
  autoPlay?: boolean;
  // Subtitle overlay (Corodomo style)
  subtitleSegment?: TranscriptSegment | null;
  currentPlaybackTime?: number;
  showSubtitleOverlay?: boolean;
  subtitleDisplayMode?: "bilingual" | "japanese_reading" | "hidden";
}

export interface YoutubePlayerRef {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  setSpeed: (speed: number) => void;
  getCurrentTime: () => number;
}

// Render inline furigana (simplified — no external dep)
function SubtitleText({
  segment,
  currentTime,
  displayMode,
}: {
  segment: TranscriptSegment;
  currentTime: number;
  displayMode: "bilingual" | "japanese_reading" | "hidden";
}) {
  if (displayMode === "hidden") return null;

  const duration = Math.max(0.1, segment.end_time - segment.start_time);
  const elapsed = Math.max(0, Math.min(duration, currentTime - segment.start_time));
  const progress = elapsed / duration;

  const ruby = segment.ruby;
  const showReading = displayMode === "bilingual" || displayMode === "japanese_reading";

  return (
    <div className="text-center space-y-1.5 px-2">
      {/* Japanese text with furigana or progress highlight */}
      {ruby && ruby.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-x-0.5 gap-y-1">
          {ruby.map((chunk: RubyChunk, i: number) => (
            <ruby key={i} className="text-xl sm:text-2xl font-black text-white drop-shadow-lg leading-snug font-jp">
              {chunk.text}
              {showReading && chunk.reading && (
                <rt className="text-[10px] font-medium text-white/80">{chunk.reading}</rt>
              )}
            </ruby>
          ))}
        </div>
      ) : (
        <div className="relative inline-block">
          <span className="text-xl sm:text-2xl font-black text-white/40 drop-shadow-lg font-jp">
            {segment.text}
          </span>
          <span
            className="absolute inset-0 text-xl sm:text-2xl font-black text-white drop-shadow-lg font-jp overflow-hidden whitespace-nowrap"
            style={{ width: `${progress * 100}%` }}
          >
            {segment.text}
          </span>
        </div>
      )}

      {/* Vietnamese translation */}
      {displayMode === "bilingual" && segment.vietnamese_translation && (
        <p className="text-xs sm:text-sm text-white/80 font-medium drop-shadow">
          {segment.vietnamese_translation}
        </p>
      )}
    </div>
  );
}

export const YoutubePlayer = React.forwardRef<YoutubePlayerRef, YoutubePlayerProps>(
  (
    {
      videoId,
      onTimeUpdate,
      loopRange,
      loopGap = 0,
      pauseAtTime = null,
      onPauseAtTimeReached,
      playbackSpeed = 1.0,
      autoPlay = false,
      subtitleSegment = null,
      currentPlaybackTime = 0,
      showSubtitleOverlay = false,
      subtitleDisplayMode = "bilingual",
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerInstanceRef = useRef<any>(null);
    const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isPausingForGapRef = useRef(false);
    const pauseTriggeredRef = useRef(false);

    const [isReady, setIsReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Expose imperative player handles
    React.useImperativeHandle(ref, () => ({
      play: () => {
        pauseTriggeredRef.current = false;
        if (playerInstanceRef.current?.playVideo) {
          playerInstanceRef.current.playVideo();
        }
      },
      pause: () => {
        if (playerInstanceRef.current?.pauseVideo) {
          playerInstanceRef.current.pauseVideo();
        }
      },
      seekTo: (seconds: number) => {
        pauseTriggeredRef.current = false;
        if (playerInstanceRef.current?.seekTo) {
          playerInstanceRef.current.seekTo(seconds, true);
        }
      },
      setSpeed: (speed: number) => {
        if (playerInstanceRef.current?.setPlaybackRate) {
          playerInstanceRef.current.setPlaybackRate(speed);
        }
      },
      getCurrentTime: () => {
        return playerInstanceRef.current?.getCurrentTime
          ? playerInstanceRef.current.getCurrentTime()
          : 0;
      },
    }));

    useEffect(() => {
      if (!window.YT) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const initPlayer = () => {
        if (!containerRef.current || !window.YT || !window.YT.Player) return;

        try {
          playerInstanceRef.current = new window.YT.Player(containerRef.current, {
            videoId,
            playerVars: {
              autoplay: autoPlay ? 1 : 0,
              controls: 1,
              modestbranding: 1,
              rel: 0,
              playsinline: 1,
              enablejsapi: 1,
              origin: typeof window !== "undefined" ? window.location.origin : "",
            },
            events: {
              onReady: (event: any) => {
                setIsReady(true);
                event.target.setPlaybackRate(playbackSpeed);
                if (autoPlay) event.target.playVideo();
              },
              onStateChange: (event: any) => {
                const playing = event.data === 1;
                setIsPlaying(playing);
                if (playing) pauseTriggeredRef.current = false;
              },
              onError: (error: any) => {
                console.warn("[YoutubePlayer] Player error:", error);
                setHasError(true);
              },
            },
          });
        } catch (e) {
          console.warn("[YoutubePlayer] Initialization error:", e);
          setHasError(true);
        }
      };

      if (window.YT && window.YT.Player) {
        initPlayer();
      } else {
        window.onYouTubeIframeAPIReady = initPlayer;
      }

      return () => {
        if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
        if (playerInstanceRef.current?.destroy) {
          try {
            playerInstanceRef.current.destroy();
          } catch (e) {}
        }
      };
    }, [videoId]);

    // Reset pauseTriggeredRef when pauseAtTime changes
    useEffect(() => {
      pauseTriggeredRef.current = false;
    }, [pauseAtTime]);

    // Track playback time & handle exact pause & A-B looping
    useEffect(() => {
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);

      if (isPlaying && playerInstanceRef.current) {
        timeIntervalRef.current = setInterval(() => {
          try {
            const current = playerInstanceRef.current.getCurrentTime();
            if (typeof current === "number") {
              onTimeUpdate?.(current);

              // Pause-At-Time enforcement
              if (
                pauseAtTime !== null &&
                pauseAtTime !== undefined &&
                !pauseTriggeredRef.current &&
                current >= pauseAtTime - 0.08
              ) {
                pauseTriggeredRef.current = true;
                playerInstanceRef.current.pauseVideo();
                onPauseAtTimeReached?.();
              }

              // A-B Loop enforcement
              if (loopRange && loopRange.end > loopRange.start && !isPausingForGapRef.current) {
                if (current >= loopRange.end) {
                  if (loopGap && loopGap > 0) {
                    isPausingForGapRef.current = true;
                    playerInstanceRef.current.pauseVideo();
                    playerInstanceRef.current.seekTo(loopRange.start, true);
                    setTimeout(() => {
                      if (playerInstanceRef.current) {
                        playerInstanceRef.current.playVideo();
                      }
                      isPausingForGapRef.current = false;
                    }, loopGap * 1000);
                  } else {
                    playerInstanceRef.current.seekTo(loopRange.start, true);
                  }
                }
              }
            }
          } catch (e) {}
        }, 50);
      }

      return () => {
        if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
      };
    }, [isPlaying, loopRange, loopGap, pauseAtTime, onPauseAtTimeReached, onTimeUpdate]);

    // Update speed when prop changes
    useEffect(() => {
      if (playerInstanceRef.current?.setPlaybackRate) {
        playerInstanceRef.current.setPlaybackRate(playbackSpeed);
      }
    }, [playbackSpeed]);

    // Is subtitle segment active for current time?
    const subtitleIsActive =
      showSubtitleOverlay &&
      subtitleSegment !== null &&
      subtitleDisplayMode !== "hidden" &&
      currentPlaybackTime >= subtitleSegment.start_time - 0.2 &&
      currentPlaybackTime <= subtitleSegment.end_time + 0.3;

    return (
      <div className="relative w-full aspect-video max-h-[min(50vh,480px)] rounded-2xl overflow-hidden bg-black border border-border/60 shadow-xl mx-auto">
        {/* YouTube iframe container */}
        <div ref={containerRef} className="w-full h-full" />

        {/* Error state */}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-background/90 text-center space-y-2">
            <AlertCircle className="h-8 w-8 text-rose-400" />
            <p className="text-sm font-semibold text-foreground">Không thể tải YouTube Player</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Video có thể bị hạn chế phát nhúng. Bạn vẫn có thể luyện tập qua transcript.
            </p>
          </div>
        )}

        {/* ✨ Corodomo-style Subtitle Overlay */}
        {subtitleIsActive && subtitleSegment && (
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 px-4 pb-3 pt-6 pointer-events-none",
              "bg-gradient-to-t from-black/75 via-black/40 to-transparent"
            )}
          >
            <SubtitleText
              segment={subtitleSegment}
              currentTime={currentPlaybackTime}
              displayMode={subtitleDisplayMode}
            />
          </div>
        )}
      </div>
    );
  }
);

YoutubePlayer.displayName = "YoutubePlayer";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}
