"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Youtube,
  Plus,
  Play,
  Clock,
  ArrowRight,
  Trash2,
  RefreshCw,
  CheckCircle2,
  X,
  Film,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { shadowingApi } from "@/services/shadowing-api";
import { ShadowingVideo } from "@/types/shadowing";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";

function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\\w-]{11})/
  );
  return match ? match[1] : null;
}

export default function ShadowingPage() {
  const router = useRouter();
  const [urlInput, setUrlInput] = useState("");
  const [videos, setVideos] = useState<ShadowingVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [videoToDelete, setVideoToDelete] = useState<ShadowingVideo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadVideos() {
      try {
        const res = await shadowingApi.listVideos(20);
        setVideos(res.videos || []);
      } catch (e) {
        console.error("Failed to load shadowing videos:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadVideos();
  }, []);

  const extractedVideoId = extractYoutubeId(urlInput.trim());
  const existingVideo = extractedVideoId
    ? videos.find((v) => v.video_id === extractedVideoId || v.id === extractedVideoId)
    : null;

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    if (existingVideo) {
      soundFX.playTaiko();
      router.push(`/shadowing/video/${existingVideo.video_id || existingVideo.id}`);
      return;
    }
    soundFX.playFurin();
    router.push(`/shadowing/import?url=${encodeURIComponent(urlInput.trim())}`);
  };

  const handleConfirmDelete = async () => {
    if (!videoToDelete) return;
    try {
      setIsDeleting(true);
      const targetId = videoToDelete.video_id || videoToDelete.id;
      await shadowingApi.deleteVideo(targetId);
      soundFX.playTaiko();
      setVideos((prev) =>
        prev.filter(
          (v) => v.id !== videoToDelete.id && v.video_id !== videoToDelete.video_id
        )
      );
      setVideoToDelete(null);
    } catch (err: any) {
      console.error("Failed to delete shadowing video:", err);
      alert(err.message || "Không thể xóa video.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-8 space-y-6 animate-in fade-in duration-200">

      {/* ── Hero Import Section ────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 space-y-4">
        {/* Glow decoration */}
        <div className="absolute -top-20 -right-20 h-52 w-52 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold">
            <Youtube className="h-3 w-3" />
            <span>SHADOWING STUDIO</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Luyện Shadowing{" "}
            <span className="text-primary">từ Video YouTube</span>
          </h1>
          <p className="text-xs text-muted-foreground max-w-lg leading-relaxed">
            Dán link YouTube để AI tự động trích xuất phụ đề, thêm Furigana và cho phép luyện phát âm tương tác.
          </p>
        </div>

        {/* Import Form */}
        <div className="space-y-2 max-w-2xl relative">
          <form onSubmit={handleImportSubmit} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className={cn(
                  "w-full h-11 pl-9 pr-3 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all",
                  existingVideo
                    ? "border-emerald-500/60 focus:ring-emerald-500/30"
                    : "border-border focus:ring-primary/30"
                )}
              />
            </div>

            {existingVideo ? (
              <Button
                type="submit"
                variant="primary"
                className="h-11 px-5 rounded-xl font-bold text-sm shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <Play className="h-4 w-4 fill-current" />
                Mở Ngay
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                disabled={!urlInput.trim()}
                className="h-11 px-5 rounded-xl font-bold text-sm shrink-0 gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Nhập Video
              </Button>
            )}
          </form>

          {/* Existing video notice */}
          {existingVideo && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                Đã có trong thư viện: <strong>{existingVideo.title}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Video Library ──────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Thư Viện Của Bạn
              <span className="ml-2 text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-lg">
                {videos.length} video
              </span>
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Bấm vào video để bắt đầu luyện Shadowing
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-52 rounded-2xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-border/70 bg-card/40 space-y-3">
            <Film className="h-10 w-10 mx-auto text-muted-foreground/30" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Chưa có video nào</h3>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-sm mx-auto">
                Dán đường dẫn YouTube ở trên để bắt đầu luyện Shadowing.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {videos.map((vid) => (
              <VideoCard
                key={vid.id}
                video={vid}
                onDelete={() => {
                  soundFX.playFurin();
                  setVideoToDelete(vid);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Delete Confirmation Modal ─────────── */}
      {videoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="h-9 w-9 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                  <Trash2 className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-bold text-foreground">Xóa Video?</h3>
              </div>
              <button
                type="button"
                onClick={() => setVideoToDelete(null)}
                className="h-8 w-8 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="rounded-xl bg-muted/40 border border-border p-3 space-y-1">
              <p className="text-xs font-bold text-foreground line-clamp-2">
                &quot;{videoToDelete.title}&quot;
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Video và toàn bộ dữ liệu luyện tập liên quan sẽ bị xóa vĩnh viễn.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVideoToDelete(null)}
                disabled={isDeleting}
                className="flex-1 rounded-xl text-xs font-bold"
              >
                Hủy
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 rounded-xl text-xs font-bold gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Xác nhận xóa
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Video Card Component
// ─────────────────────────────────────────────

function VideoCard({
  video,
  onDelete,
}: {
  video: ShadowingVideo;
  onDelete: () => void;
}) {
  const durationMin = Math.floor((video.duration_seconds || 120) / 60);

  return (
    <div className="group relative rounded-2xl bg-card border border-border/70 hover:border-primary/40 hover:shadow-sm transition-all duration-200 overflow-hidden flex flex-col">
      <Link href={`/shadowing/video/${video.video_id}`} className="block flex-1">
        {/* Thumbnail */}
        <div className="relative aspect-video w-full bg-muted overflow-hidden">
          {video.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
              <Youtube className="h-10 w-10" />
            </div>
          )}

          {/* Difficulty badge */}
          <div className="absolute top-2 right-2">
            <Badge variant="jlpt" size="sm" className="font-bold shadow-md text-[10px]">
              {video.overall_difficulty?.toUpperCase() || "N3"}
            </Badge>
          </div>

          {/* Play overlay on hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <Play className="h-5 w-5 text-white fill-white" />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 space-y-1">
          <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {video.title}
          </h3>
          <p className="text-xs text-muted-foreground truncate">{video.channel_name}</p>
        </div>
      </Link>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground bg-muted/20">
        <span className="flex items-center gap-1 font-medium">
          <Clock className="h-3 w-3" />
          {durationMin} phút
        </span>

        <div className="flex items-center gap-2">
          {/* Delete button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="h-6 w-6 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground/50 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
            title="Xóa video"
          >
            <Trash2 className="h-3 w-3" />
          </button>

          <Link
            href={`/shadowing/video/${video.video_id}`}
            className="text-primary font-bold flex items-center gap-1 hover:underline"
          >
            Luyện
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
