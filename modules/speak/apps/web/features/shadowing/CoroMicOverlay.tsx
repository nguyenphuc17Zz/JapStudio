"use client";

import React, { useEffect, useRef } from "react";
import { Mic, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CoroMicOverlayProps {
  isRecording: boolean;
  isEvaluating?: boolean;
  liveTranscript?: string;
  interimTranscript?: string;
  volumeLevel?: number; // 0–100
}

export function CoroMicOverlay({
  isRecording,
  isEvaluating = false,
  liveTranscript = "",
  interimTranscript = "",
  volumeLevel = 0,
}: CoroMicOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  // Animate waveform bars
  useEffect(() => {
    if (!isRecording || !canvasRef.current) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const BAR_COUNT = 24;
    const BAR_GAP = 3;

    const draw = () => {
      timeRef.current += 0.08;
      const t = timeRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barW = (canvas.width - (BAR_COUNT - 1) * BAR_GAP) / BAR_COUNT;
      const centerY = canvas.height / 2;
      const maxH = canvas.height * 0.85;
      const vol = Math.min(1, (volumeLevel ?? 0) / 100);

      for (let i = 0; i < BAR_COUNT; i++) {
        const phase = (i / BAR_COUNT) * Math.PI * 2;
        const wave1 = Math.sin(t * 2 + phase) * 0.5 + 0.5;
        const wave2 = Math.sin(t * 3.7 + phase * 1.3) * 0.3 + 0.3;
        const base = 0.08 + vol * 0.92;
        const h = (wave1 * 0.6 + wave2 * 0.4) * base * maxH;

        const x = i * (barW + BAR_GAP);
        const alpha = 0.5 + vol * 0.5;

        ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`; // rose-500
        ctx.beginPath();
        ctx.roundRect(x, centerY - h / 2, barW, h, barW / 2);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRecording, volumeLevel]);

  if (!isRecording && !isEvaluating) return null;

  const displayText = liveTranscript || interimTranscript || "";

  return (
    <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-10">
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center gap-3 p-4">
        {isEvaluating ? (
          /* Evaluating state */
          <div className="flex flex-col items-center gap-2 text-white">
            <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
            <p className="text-sm font-bold">Đang phân tích phát âm...</p>
            <p className="text-xs text-white/70">AI đang chấm điểm kỹ lưỡng</p>
          </div>
        ) : (
          /* Recording state */
          <>
            {/* Mic icon + glow */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-rose-500/40 blur-lg scale-150" />
              <div className="relative h-14 w-14 rounded-full bg-rose-500/90 flex items-center justify-center shadow-xl ring-4 ring-rose-500/40">
                <Mic className="h-7 w-7 text-white" />
              </div>
              {/* Ping ring */}
              <span className="absolute inset-0 rounded-full animate-ping bg-rose-400/30" />
            </div>

            {/* Waveform Canvas */}
            <canvas
              ref={canvasRef}
              width={200}
              height={40}
              className="opacity-90"
              style={{ imageRendering: "auto" }}
            />

            {/* Live transcript */}
            <div className="max-w-sm text-center space-y-1">
              {displayText ? (
                <>
                  <p className="text-xs font-bold text-white/60 uppercase tracking-wider">
                    Bạn đang nói:
                  </p>
                  <p
                    className={cn(
                      "text-base font-bold text-white leading-snug font-jp transition-all",
                      interimTranscript && !liveTranscript ? "opacity-70 italic" : "opacity-100"
                    )}
                  >
                    {displayText}
                  </p>
                </>
              ) : (
                <p className="text-sm font-medium text-white/70">
                  🎤 Hãy nói rõ ràng vào micro...
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
