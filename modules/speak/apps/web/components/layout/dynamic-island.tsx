"use client";

import React, { useState } from "react";
import { useHealth } from "@/hooks/use-health";
import { Activity, ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function DynamicIsland({
  onOpenCommand,
  onOpenCoach,
}: {
  onOpenCommand?: () => void;
  onOpenCoach?: () => void;
}) {
  const { isHealthy } = useHealth();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative flex justify-center z-40">
      <div
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "dynamic-island cursor-pointer transition-all duration-300 ease-out select-none",
          "flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-white text-xs font-semibold",
          expanded ? "ring-2 ring-primary/40 bg-slate-900/95 shadow-2xl scale-[1.02]" : "hover:scale-[1.02]"
        )}
      >
        {/* Pulsing indicator */}
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              isHealthy ? "bg-emerald-400" : "bg-amber-400"
            )}
          />
          <span
            className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              isHealthy ? "bg-emerald-500" : "bg-amber-500"
            )}
          />
        </span>

        {/* Text */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-slate-200">Whisper • 48ms</span>
          <div className="flex items-center gap-0.5 h-3">
            <span className="w-0.5 h-2 bg-sky-400 rounded-full animate-pulse" />
            <span className="w-0.5 h-3 bg-sky-400 rounded-full animate-pulse delay-75" />
            <span className="w-0.5 h-1.5 bg-sky-400 rounded-full animate-pulse delay-150" />
          </div>
          <span className="text-[11px] text-sky-300 font-medium hidden sm:inline">VoiceVox Live</span>
        </div>

        {/* Action badge */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenCommand?.();
          }}
          className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 border border-white/10 transition-colors"
          title="Mở tìm kiếm nhanh (⌘K)"
        >
          <span>⌘K</span>
        </button>

        <ChevronDown
          className={cn("h-3 w-3 text-slate-400 transition-transform duration-200", expanded && "rotate-180")}
        />
      </div>

      {/* Expanded Quick Telemetry Flyout */}
      {expanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-10 w-72 p-3.5 rounded-2xl bg-slate-900/95 border border-white/15 backdrop-blur-2xl shadow-2xl text-slate-200 animate-in fade-in slide-in-from-top-2 duration-200 z-50 text-xs space-y-2.5"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" /> Audio DSP Engine
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
              GPU / CUDA
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <div className="text-slate-400 text-[10px]">Faster-Whisper</div>
              <div className="text-white font-bold mt-0.5">STT Ready</div>
            </div>
            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <div className="text-slate-400 text-[10px]">VoiceVox TTS</div>
              <div className="text-sky-300 font-bold mt-0.5">Speaker No.8</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[11px]">
            <span className="text-slate-400">VAD Sensitivity:</span>
            <span className="font-mono font-semibold text-white">-32 dBFS</span>
          </div>

          {onOpenCoach && (
            <button
              onClick={() => {
                setExpanded(false);
                onOpenCoach();
              }}
              className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-semibold transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" /> Hỏi Coach Tanaka (⌘J)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
