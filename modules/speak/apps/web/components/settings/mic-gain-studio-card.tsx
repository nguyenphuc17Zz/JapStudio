"use client";

import React, { useState, useEffect, useRef } from "react";
import { Zap, Mic, Volume2, Check, Sparkles, Sliders, Play, Square, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { soundFX } from "@/lib/sound-fx";

const GAIN_PRESETS = [
  { value: 1.0, label: "x1.0", desc: "Nguyên bản", sub: "0 dB" },
  { value: 1.5, label: "x1.5", desc: "Tăng nhẹ", sub: "+3.5 dB" },
  { value: 2.0, label: "x2.0", desc: "Chuẩn giọng nhỏ", sub: "+6.0 dB", isRecommended: true },
  { value: 2.5, label: "x2.5", desc: "Rõ nét", sub: "+8.0 dB" },
  { value: 3.0, label: "x3.0", desc: "Siêu nhạy", sub: "+9.5 dB" },
  { value: 4.0, label: "x4.0", desc: "Thì thầm", sub: "+12.0 dB" },
];

export function MicGainStudioCard() {
  const [gain, setGain] = useState<number>(2.0);
  const [isTesting, setIsTesting] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Load saved gain
  useEffect(() => {
    try {
      const saved = localStorage.getItem("speaking_training_mic_gain");
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 1.0 && val <= 5.0) {
          setGain(val);
        }
      }
    } catch {}
  }, []);

  const handleSelectGain = (newGain: number) => {
    setGain(newGain);
    try {
      localStorage.setItem("speaking_training_mic_gain", newGain.toString());
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch {}

    soundFX.playTaiko();

    // If live testing, update gain in real-time
    if (gainNodeRef.current && audioContextRef.current) {
      try {
        gainNodeRef.current.gain.setTargetAtTime(newGain, audioContextRef.current.currentTime, 0.05);
      } catch {
        gainNodeRef.current.gain.value = newGain;
      }
    }
  };

  const stopTesting = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    gainNodeRef.current = null;
    analyserRef.current = null;
    setIsTesting(false);
    setVolumeLevel(0);
  };

  const startTesting = async () => {
    try {
      stopTesting();
      setIsTesting(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);

      // Pre-Amp Gain Node
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(gain, ctx.currentTime);
      gainNodeRef.current = gainNode;

      // Dynamics Compressor (boost quiet parts, prevent clipping)
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-36, ctx.currentTime);
      compressor.knee.setValueAtTime(20, ctx.currentTime);
      compressor.ratio.setValueAtTime(4, ctx.currentTime);
      compressor.attack.setValueAtTime(0.005, ctx.currentTime);
      compressor.release.setValueAtTime(0.05, ctx.currentTime);

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      analyserRef.current = analyser;

      source.connect(gainNode);
      gainNode.connect(compressor);
      compressor.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 75) * 100));
        setVolumeLevel(normalized);
        animFrameRef.current = requestAnimationFrame(checkMeter);
      };

      checkMeter();
    } catch (e: any) {
      console.warn("[MicGainStudio] Test error:", e);
      stopTesting();
    }
  };

  useEffect(() => {
    return () => {
      stopTesting();
    };
  }, []);

  return (
    <Card className="p-5 md:p-6 bg-card border border-border/80 rounded-2xl shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">
                Tiền Khuếch Đại Micro Phần Mềm (Software Pre-Amp)
              </h3>
              <Badge variant="outline" className="text-[10px] font-mono border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                Cho Giọng Nhỏ & Thì Thầm
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Khuếch đại tín hiệu micro lên tới 4.0x qua bộ lọc nén dải động (Compressor) trước khi AI giải mã
            </p>
          </div>
        </div>

        {savedSuccess && (
          <span className="text-xs font-bold text-emerald-500 flex items-center gap-1 animate-in fade-in">
            <Check className="h-3.5 w-3.5" /> Đã lưu cấu hình
          </span>
        )}
      </div>

      {/* Preset Selector Grid */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-foreground flex items-center justify-between">
          <span>Chọn mức khuếch đại (Pre-Amp Gain Factor):</span>
          <span className="font-mono text-amber-600 dark:text-amber-400 font-black">
            Mức hiện tại: x{gain.toFixed(1)}
          </span>
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {GAIN_PRESETS.map((preset) => {
            const isSelected = Math.abs(preset.value - gain) < 0.05;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => handleSelectGain(preset.value)}
                className={cn(
                  "p-3 rounded-xl border text-center transition-all cursor-pointer relative flex flex-col items-center justify-between gap-1",
                  isSelected
                    ? "bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20 shadow-xs"
                    : "bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted/70"
                )}
              >
                {preset.isRecommended && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-amber-500 text-[9px] font-black text-white shadow-2xs">
                    Tối ưu
                  </span>
                )}
                <div className="font-mono text-sm font-black mt-1">{preset.label}</div>
                <div className="text-[11px] font-semibold">{preset.desc}</div>
                <div className="text-[9px] font-mono text-muted-foreground">{preset.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Voice Testing Studio */}
      <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Mic className="h-4 w-4 text-primary" />
            <span>Thử giọng nói nhỏ với mức x{gain.toFixed(1)}</span>
          </div>

          <Button
            size="sm"
            variant={isTesting ? "danger" : "outline"}
            className="h-8 px-3 text-xs gap-1.5 font-bold"
            onClick={isTesting ? stopTesting : startTesting}
          >
            {isTesting ? (
              <>
                <Square className="h-3 w-3 fill-current" />
                <span>Dừng thử giọng</span>
              </>
            ) : (
              <>
                <Play className="h-3 w-3 fill-current ml-0.5" />
                <span>Bật Mic thử giọng thì thầm</span>
              </>
            )}
          </Button>
        </div>

        {/* Meter Visualizer */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {isTesting
                ? "Hãy nói nhỏ tiếng Nhật: 「本を読みます」 hoặc 「おはようございます」..."
                : "Bấm 'Bật Mic' và nói nhỏ/thì thầm để kiểm tra mức độ nhạy"}
            </span>
            <span className="font-mono font-bold text-foreground">{isTesting ? `${volumeLevel}%` : "0%"}</span>
          </div>

          <div className="h-3 bg-muted rounded-full overflow-hidden p-0.5 border border-border">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-75",
                volumeLevel > 70
                  ? "bg-emerald-500"
                  : volumeLevel > 20
                  ? "bg-amber-500"
                  : "bg-primary/50"
              )}
              style={{ width: `${isTesting ? volumeLevel : 0}%` }}
            />
          </div>
        </div>

        {/* Feature Explainer Notes */}
        <div className="pt-2 text-[11px] text-muted-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-border/60">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span>Tự động đồng bộ sang tất cả 4 chế độ luyện tập (Reflex, Pitch, Keigo, Situations).</span>
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">Web Audio API + Compressor</span>
        </div>
      </div>
    </Card>
  );
}
