"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Youtube,
  Sparkles,
  AlertCircle,
  Keyboard,
  Eye,
  EyeOff,
  Languages,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CoroControls } from "@/features/shadowing/CoroControls";
import { CoroScoreCard } from "@/features/shadowing/CoroScoreCard";
import { CoroMicOverlay } from "@/features/shadowing/CoroMicOverlay";
import { CoroSubtitleBar } from "@/features/shadowing/CoroSubtitleBar";
import { TranscriptPanel } from "@/features/shadowing/TranscriptPanel";
import { YoutubePlayer, YoutubePlayerRef } from "@/features/shadowing/YoutubePlayer";
import { useShadowing } from "@/hooks/use-shadowing";
import { useFuriganaSettings } from "@/hooks/use-furigana-settings";
import { useShadowingKeybindings } from "@/hooks/use-system-keybindings";
import { soundFX } from "@/lib/sound-fx";
import { TranscriptSegment } from "@/types/shadowing";
import { cn } from "@/lib/utils";

type SubtitleMode = "bilingual" | "japanese_reading" | "hidden";

export default function ShadowingVideoStudioPage() {
  const params = useParams();
  const videoId = params.videoId as string;
  const playerRef = useRef<YoutubePlayerRef | null>(null);

  const { furiganaClass } = useFuriganaSettings();

  const {
    video,
    isLoading,
    error,
    currentPlaybackTime,
    setCurrentPlaybackTime,
    selectedSegment,
    setSelectedSegment,
    playbackSpeed,
    setPlaybackSpeed,
    shadowingMode,
    setShadowingMode,
    isLooping,
    practiceStep,
    pauseAtTime,
    setPauseAtTime,
    startGuidedPractice,
    handlePauseAtTimeReached,
    cancelPractice,
    loopRange,
    loopGap,
    toggleLoop,
    selectNextSegment,
    selectPrevSegment,
    startRecording,
    stopRecording,
    isRecording,
    isEvaluating,
    lastFeedback,
    evaluationError,
    clearEvaluationError,
    volumeLevel,
    liveTranscript,
    interimTranscript,
    bookmarkedSegmentIds,
    toggleBookmark,
    segmentScores,
    autoPilot,
    setAutoPilot,
    applyPedagogicalLevel,
  } = useShadowing(videoId);

  const [subtitleMode, setSubtitleMode] = useState<SubtitleMode>("bilingual");
  const [showHelpModal, setShowHelpModal] = useState(false);

  const { keybindings, matchesAction } = useShadowingKeybindings();

  // Active segment tracking playback time or selected with jitter prevention
  const lastActiveSegmentRef = useRef<TranscriptSegment | null>(null);

  const currentSegment = useMemo(() => {
    if (!video?.segments || video.segments.length === 0) return selectedSegment;
    const found = video.segments.find(
      (s) => currentPlaybackTime >= s.start_time - 0.05 && currentPlaybackTime <= s.end_time + 0.1
    );
    if (found) {
      lastActiveSegmentRef.current = found;
      return found;
    }
    // Keep last active segment during audio gaps between sentences
    if (lastActiveSegmentRef.current) {
      return lastActiveSegmentRef.current;
    }
    return selectedSegment;
  }, [video?.segments, currentPlaybackTime, selectedSegment]);

  // Cycle through subtitle display modes
  const cycleSubtitleMode = useCallback(() => {
    setSubtitleMode((m) =>
      m === "bilingual" ? "japanese_reading" : m === "japanese_reading" ? "hidden" : "bilingual"
    );
    soundFX.playFurin();
  }, []);

  // Unified trigger practice
  const handleTriggerPractice = useCallback(() => {
    if (isRecording) {
      soundFX.playTaiko();
      stopRecording();
      return;
    }
    soundFX.playTaiko();
    if (shadowingMode === "repeat") {
      if (practiceStep === "prompting") {
        playerRef.current?.pause();
        startRecording();
      } else {
        startGuidedPractice(playerRef.current || undefined);
      }
    } else if (shadowingMode === "listen_shadow") {
      startGuidedPractice(playerRef.current || undefined);
    } else {
      playerRef.current?.pause();
      startRecording();
    }
  }, [isRecording, stopRecording, shadowingMode, practiceStep, startRecording, startGuidedPractice]);

  const handlePlaySegment = useCallback(() => {
    if (selectedSegment) {
      setPauseAtTime(selectedSegment.end_time);
      playerRef.current?.seekTo(selectedSegment.start_time);
      playerRef.current?.play();
    }
  }, [selectedSegment, setPauseAtTime]);

  const handleSelectSegmentWithAutoPause = useCallback(
    (segment: TranscriptSegment) => {
      setSelectedSegment(segment);
      lastActiveSegmentRef.current = segment;
      if (shadowingMode === "repeat" || shadowingMode === "listen_shadow") {
        setPauseAtTime(segment.end_time);
        playerRef.current?.seekTo(segment.start_time);
        playerRef.current?.play();
      } else {
        playerRef.current?.seekTo(segment.start_time);
      }
    },
    [setSelectedSegment, shadowingMode, setPauseAtTime]
  );

  const handlePauseReached = useCallback(() => {
    handlePauseAtTimeReached(playerRef.current || undefined);
  }, [handlePauseAtTimeReached]);

  const handleRetryPractice = useCallback(() => {
    if (shadowingMode === "shadow") {
      playerRef.current?.pause();
      startRecording();
    } else {
      startGuidedPractice(playerRef.current || undefined);
    }
  }, [shadowingMode, startRecording, startGuidedPractice]);

  // Auto-Pilot advancement
  useEffect(() => {
    if (autoPilot && lastFeedback && lastFeedback.score >= 80) {
      const timer = setTimeout(() => {
        soundFX.playTaiko();
        selectNextSegment();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [autoPilot, lastFeedback, selectNextSegment]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (matchesAction(e, "toggleLoop")) {
        e.preventDefault();
        toggleLoop();
      } else if (matchesAction(e, "replay")) {
        e.preventDefault();
        handlePlaySegment();
      } else if (matchesAction(e, "nextSegment")) {
        e.preventDefault();
        soundFX.playFurin();
        selectNextSegment();
      } else if (matchesAction(e, "prevSegment")) {
        e.preventDefault();
        soundFX.playFurin();
        selectPrevSegment();
      } else if (matchesAction(e, "toggleMic") || e.code === "Space") {
        e.preventDefault();
        handleTriggerPractice();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [matchesAction, toggleLoop, handlePlaySegment, selectNextSegment, selectPrevSegment, handleTriggerPractice]);

  // ── Loading ──────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Sparkles className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs font-bold text-muted-foreground">Đang tải video và phụ đề...</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────
  if (error || !video) {
    return (
      <div className="p-8 rounded-3xl border border-destructive/30 bg-destructive/5 text-center space-y-4 max-w-xl mx-auto mt-12">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        <h2 className="text-base font-bold text-foreground">Không thể tải video</h2>
        <p className="text-xs text-muted-foreground">{error || "Video không tồn tại."}</p>
        <Link href="/shadowing">
          <Button variant="outline" size="sm" className="rounded-xl">
            Quay lại thư viện
          </Button>
        </Link>
      </div>
    );
  }

  const isActiveSession = isRecording || isEvaluating;

  return (
    <div className="space-y-3 animate-in fade-in duration-200 w-full max-w-[1920px] mx-auto pb-4">

      {/* ── Header Bar ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/shadowing"
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="Quay lại thư viện"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="p-1 rounded-lg bg-rose-500/10 text-rose-500 shrink-0">
              <Youtube className="h-3.5 w-3.5" />
            </span>
            <h1 className="text-xs sm:text-sm font-bold text-foreground truncate font-jp">
              {video.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="jlpt" size="sm" className="font-bold text-[10px]">
            {video.overall_difficulty?.toUpperCase() || "N3"}
          </Badge>

          {/* Subtitle toggle */}
          <button
            type="button"
            onClick={cycleSubtitleMode}
            className={cn(
              "h-8 px-2.5 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 transition-all",
              subtitleMode !== "hidden"
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-muted border-border text-muted-foreground hover:text-foreground"
            )}
            title="Chuyển đổi chế độ phụ đề"
          >
            {subtitleMode === "hidden" ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : subtitleMode === "japanese_reading" ? (
              <Languages className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {subtitleMode === "hidden"
                ? "Ẩn phụ đề"
                : subtitleMode === "japanese_reading"
                ? "Tiếng Nhật"
                : "Song ngữ"}
            </span>
          </button>

          {/* Keyboard shortcuts */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHelpModal(true)}
            className="h-8 px-2 text-xs rounded-xl gap-1 text-muted-foreground hover:text-foreground"
          >
            <Keyboard className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Phím tắt</span>
          </Button>
        </div>
      </div>

      {/* ── Main 2-Column Layout (Corodomo style) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">

        {/* Left Column: Video + Controls (67% width) */}
        <div className="lg:col-span-8 space-y-2.5">

          {/* Video Player with Subtitle Overlay + Mic Overlay */}
          <div className="relative">
            <YoutubePlayer
              ref={playerRef}
              videoId={video.video_id || videoId}
              onTimeUpdate={(t) => setCurrentPlaybackTime(t)}
              loopRange={loopRange}
              loopGap={loopGap}
              pauseAtTime={pauseAtTime}
              onPauseAtTimeReached={handlePauseReached}
              playbackSpeed={playbackSpeed}
              autoPlay={false}
              // Corodomo subtitle overlay (disabled on video, moved to CoroSubtitleBar below)
              subtitleSegment={currentSegment}
              currentPlaybackTime={currentPlaybackTime}
              showSubtitleOverlay={false}
              subtitleDisplayMode={subtitleMode}
            />

            {/* Mic / Recording overlay on video */}
            <CoroMicOverlay
              isRecording={isRecording}
              isEvaluating={isEvaluating}
              liveTranscript={liveTranscript}
              interimTranscript={interimTranscript}
              volumeLevel={volumeLevel}
            />
          </div>

          {/* 🌟 Corodomo Subtitle & Karaoke Bar (Khung đỏ chuẩn Corodomo) */}
          <CoroSubtitleBar
            segment={currentSegment}
            currentPlaybackTime={currentPlaybackTime}
            isBookmarked={currentSegment ? bookmarkedSegmentIds.has(currentSegment.id) : false}
            onToggleBookmark={() => {
              if (currentSegment) toggleBookmark(currentSegment.id);
            }}
            onSeekToTime={(time) => {
              playerRef.current?.seekTo(time);
            }}
            onPlaySegment={handlePlaySegment}
          />

          {/* Evaluation Error */}
          {evaluationError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in">
              <span>⚠️ {evaluationError}</span>
              <button
                type="button"
                onClick={clearEvaluationError}
                className="p-1 hover:bg-destructive/20 rounded-lg"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Score Card (Corodomo style — slides in after speaking) */}
          {lastFeedback && (
            <CoroScoreCard
              feedback={lastFeedback}
              targetSentence={selectedSegment?.text}
              onRetry={handleRetryPractice}
              onNext={selectNextSegment}
              onPlayReference={handlePlaySegment}
            />
          )}

          {/* Controls Bar (Corodomo style) */}
          <CoroControls
            segment={selectedSegment}
            playbackSpeed={playbackSpeed}
            onSpeedChange={(s) => setPlaybackSpeed(s)}
            shadowingMode={shadowingMode}
            onModeChange={(m) => setShadowingMode(m)}
            isLooping={isLooping}
            onToggleLoop={toggleLoop}
            onPlaySegment={handlePlaySegment}
            onTriggerPractice={handleTriggerPractice}
            onCancelPractice={() => cancelPractice(playerRef.current || undefined)}
            isRecording={isRecording}
            isEvaluating={isEvaluating}
            practiceStep={practiceStep}
            keybindings={keybindings}
            autoPilot={autoPilot}
            onToggleAutoPilot={() => setAutoPilot((v) => !v)}
            onApplyPedagogicalLevel={applyPedagogicalLevel}
          />
        </div>

        {/* Right Column: Transcript Panel (33% width) */}
        <div className="lg:col-span-4 lg:sticky lg:top-2" style={{ height: "calc(100vh - 90px)", maxHeight: "840px" }}>
          <TranscriptPanel
            segments={video.segments || []}
            currentPlaybackTime={currentPlaybackTime}
            selectedSegmentId={selectedSegment?.id}
            bookmarkedSegmentIds={bookmarkedSegmentIds}
            onToggleBookmark={toggleBookmark}
            segmentScores={segmentScores}
            onSelectSegment={handleSelectSegmentWithAutoPause}
            onSeek={(t) => playerRef.current?.seekTo(t)}
          />
        </div>
      </div>

      {/* ── Keyboard Shortcuts Modal ─────────────── */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-3xl p-5 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-bold">Phím tắt Shadowing</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              {[
                { action: "Bắt đầu/Dừng ghi âm", key: "Space" },
                { action: "Phát lại câu mẫu", key: "C" },
                { action: "Bật/Tắt lặp câu", key: "L" },
                { action: "Câu tiếp theo", key: "J" },
                { action: "Câu trước", key: "K" },
              ].map(({ action, key }) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/50"
                >
                  <span className="text-muted-foreground">{action}:</span>
                  <kbd className="px-2 py-0.5 rounded bg-card border font-mono font-bold text-xs">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowHelpModal(false)}
              className="w-full rounded-xl font-bold text-xs"
            >
              Đã hiểu
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
