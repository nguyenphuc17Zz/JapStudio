"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Trophy,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CoroControls } from "@/features/shadowing/CoroControls";
import { CoroScoreCard } from "@/features/shadowing/CoroScoreCard";
import { CoroMicOverlay } from "@/features/shadowing/CoroMicOverlay";
import { CoroSubtitleBar } from "@/features/shadowing/CoroSubtitleBar";
import { YoutubePlayer, YoutubePlayerRef } from "@/features/shadowing/YoutubePlayer";
import { useShadowing } from "@/hooks/use-shadowing";

export default function ShadowingLessonPage() {
  const params = useParams();
  const videoId = params.videoId as string;
  const playerRef = useRef<YoutubePlayerRef | null>(null);

  const {
    video,
    isLoading,
    currentPlaybackTime,
    setCurrentPlaybackTime,
    selectedSegment,
    setSelectedSegment,
    playbackSpeed,
    setPlaybackSpeed,
    shadowingMode,
    setShadowingMode,
    isLooping,
    toggleLoop,
    startRecording,
    stopRecording,
    submitTextShadowing,
    isRecording,
    isEvaluating,
    lastFeedback,
    volumeLevel,
    liveTranscript,
    interimTranscript,
    bookmarkedSegmentIds,
    toggleBookmark,
  } = useShadowing(videoId);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedScores, setCompletedScores] = useState<Record<string, number>>({});
  const [isLessonCompleted, setIsLessonCompleted] = useState(false);

  const lessonSegments = useMemo(() => {
    if (!video) return [];
    if (video.recommended_segments && video.recommended_segments.length > 0) {
      return video.segments.filter((s) =>
        video.recommended_segments?.some((r) => r.segment_id === s.id)
      );
    }
    return video.segments.slice(0, 5);
  }, [video]);

  const currentSegment = lessonSegments[currentIndex] || selectedSegment;
  const currentSegmentId = currentSegment?.id;

  useEffect(() => {
    if (currentSegment) {
      setSelectedSegment(currentSegment);
      playerRef.current?.seekTo(currentSegment.start_time);
    }
  }, [currentIndex, currentSegment, setSelectedSegment]);

  useEffect(() => {
    if (lastFeedback && currentSegmentId) {
      setCompletedScores((prev) => ({
        ...prev,
        [currentSegmentId]: Math.round(lastFeedback.score),
      }));
    }
  }, [lastFeedback, currentSegmentId]);

  const handleNext = () => {
    if (currentIndex < lessonSegments.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsLessonCompleted(true);
    }
  };

  const handlePlayCurrent = () => {
    if (currentSegment) {
      playerRef.current?.seekTo(currentSegment.start_time);
      playerRef.current?.play();
    }
  };

  const handleTriggerPractice = () => {
    if (isRecording) {
      stopRecording();
    } else {
      playerRef.current?.pause();
      startRecording();
    }
  };

  const loopRange =
    isLooping && currentSegment
      ? { start: currentSegment.start_time, end: currentSegment.end_time }
      : null;

  const avgScore =
    Object.values(completedScores).length > 0
      ? Math.round(
          Object.values(completedScores).reduce((a, b) => a + b, 0) /
            Object.values(completedScores).length
        )
      : 0;

  if (isLoading || !video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Sparkles className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground">Đang chuẩn bị bài học...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/shadowing/video/${video.video_id}`}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Phòng luyện tự do</span>
        </Link>
        <span className="text-[11px] font-mono text-muted-foreground">
          {Object.keys(completedScores).length} / {lessonSegments.length} câu
        </span>
      </div>

      {isLessonCompleted ? (
        /* Completion Screen */
        <div className="p-8 rounded-2xl bg-card border border-border text-center space-y-5 max-w-md mx-auto animate-in zoom-in-95">
          <div className="inline-flex p-4 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Trophy className="h-10 w-10 animate-bounce" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Hoàn thành bài luyện!</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {lessonSegments.length} câu thoại • Điểm TB:{" "}
              <strong className="text-primary">{avgScore}</strong>
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsLessonCompleted(false);
                setCurrentIndex(0);
              }}
              className="rounded-xl text-xs font-bold gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Luyện lại
            </Button>
            <Link href={`/shadowing/video/${video.video_id}`}>
              <Button variant="primary" size="sm" className="rounded-xl text-xs font-bold gap-1.5">
                Trở về Studio
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* Active Lesson */
        <div className="space-y-3">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5">
            {lessonSegments.map((s, idx) => (
              <div
                key={s.id || idx}
                className={`h-2 w-2 rounded-full transition-all ${
                  completedScores[s.id]
                    ? "bg-emerald-500"
                    : idx === currentIndex
                    ? "bg-primary w-5"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Player */}
          <div className="relative">
            <YoutubePlayer
              ref={playerRef}
              videoId={video.video_id}
              onTimeUpdate={setCurrentPlaybackTime}
              loopRange={loopRange}
              playbackSpeed={playbackSpeed}
              subtitleSegment={currentSegment}
              currentPlaybackTime={currentPlaybackTime}
              showSubtitleOverlay={false}
              subtitleDisplayMode="bilingual"
            />
            <CoroMicOverlay
              isRecording={isRecording}
              isEvaluating={isEvaluating}
              liveTranscript={liveTranscript}
              interimTranscript={interimTranscript}
              volumeLevel={volumeLevel}
            />
          </div>

          {/* 🌟 Corodomo Subtitle & Karaoke Bar */}
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
            onPlaySegment={handlePlayCurrent}
          />

          {/* Score card */}
          {lastFeedback && (
            <CoroScoreCard
              feedback={lastFeedback}
              targetSentence={currentSegment?.text}
              onRetry={handlePlayCurrent}
              onNext={handleNext}
              onPlayReference={handlePlayCurrent}
            />
          )}

          {/* Controls */}
          <CoroControls
            segment={currentSegment}
            playbackSpeed={playbackSpeed}
            onSpeedChange={(s) => {
              setPlaybackSpeed(s);
              playerRef.current?.setSpeed(s);
            }}
            shadowingMode={shadowingMode}
            onModeChange={setShadowingMode}
            isLooping={isLooping}
            onToggleLoop={toggleLoop}
            onPlaySegment={handlePlayCurrent}
            onTriggerPractice={handleTriggerPractice}
            isRecording={isRecording}
            isEvaluating={isEvaluating}
            onSubmitTextPractice={submitTextShadowing}
          />
        </div>
      )}
    </div>
  );
}
