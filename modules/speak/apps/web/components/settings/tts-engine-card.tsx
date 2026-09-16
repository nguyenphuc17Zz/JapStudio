"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { audioApi } from "@/features/audio/services/audio-api";
import {
  claimSpeechOutput,
  releaseSpeechOutput,
  type SpeechOutputOwner,
} from "@/features/audio/services/speech-playback-coordinator";
import { TTSEngineStatus } from "@/types/audio";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Cloud,
  Loader2,
  Play,
  Sparkles,
} from "lucide-react";

interface TtsEngineCardProps {
  onEngineReload?: () => void;
}

export function TtsEngineCard({ onEngineReload }: TtsEngineCardProps) {
  const [engine, setEngine] = useState<TTSEngineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await audioApi.getEngine();
      setEngine(data);
      onEngineReload?.();
    } catch (e: any) {
      setMsg({ type: "error", text: e.message || "Không tải được thông tin TTS Engine." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handlePreview = async (provider: string, voiceId: string, text: string) => {
    setPreviewing(true);
    try {
      const res = await audioApi.previewVoice(text, voiceId, provider);
      if (res.audio_base64) {
        const audio = new Audio(`data:audio/${res.format || "mp3"};base64,${res.audio_base64}`);
        // Single-flight: cut any other speech before playing this preview.
        const owner: SpeechOutputOwner = {
          stop: () => {
            try {
              audio.pause();
            } catch {}
            setPreviewing(false);
          },
        };
        claimSpeechOutput(owner);
        audio.onended = () => releaseSpeechOutput(owner);
        audio.onerror = () => releaseSpeechOutput(owner);
        await audio.play();
      }
    } catch (e: any) {
      setMsg({ type: "error", text: `Không thể phát thử giọng: ${e.message}` });
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Volume2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">Hệ Thống Tổng Hợp Giọng Nói (TTS Engine)</h2>
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                Thế hệ mới
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Động cơ giọng đọc chuẩn mực sử dụng công nghệ <strong>Edge-TTS</strong> (Azure Neural).
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchStatus}
          disabled={loading}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      {msg && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg text-xs font-medium ${
            msg.type === "success"
              ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:text-emerald-300"
              : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}
        >
          {msg.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {msg.text}
        </div>
      )}

      {/* Engine: Edge-TTS */}
      <div className="rounded-xl border border-border/60 bg-background/50 p-4 space-y-3 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-semibold text-foreground">Edge-TTS (Azure Neural)</span>
            </div>
            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20 text-[11px]">
              <CheckCircle2 className="h-3 w-3 mr-1 inline" /> Sẵn sàng
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Giọng Tokyo chuẩn phát thanh viên (Nanami, Keita). Tiết kiệm <strong>0 MB RAM</strong> và không cần server nền.
          </p>

          <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
            Độ trễ phản hồi: <strong className="text-foreground">{engine?.edge_tts_latency_ms ? `${engine.edge_tts_latency_ms}ms` : "< 300ms"}</strong>
          </div>
        </div>

        <div className="pt-3 border-t border-border/40 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-medium">Giọng mẫu: Nanami (七海)</span>
          <Button
            size="sm"
            variant="outline"
            disabled={previewing}
            onClick={() => handlePreview("edge_tts", "ja-JP-NanamiNeural", "こんにちは。七海です。今日も一緒に楽しく日本語を練習しましょう。")}
            className="gap-1 text-xs"
          >
            {previewing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-current" />}
            Nghe thử
          </Button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="rounded-xl bg-muted/40 p-3 flex items-center gap-3 text-xs text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <span>
          <strong>Gợi ý:</strong> Hệ thống phát giọng <strong>Edge-TTS</strong> tự nhiên nhất qua mạng. Hãy đảm bảo thiết bị có kết nối internet khi luyện nói.
        </span>
      </div>
    </div>
  );
}
