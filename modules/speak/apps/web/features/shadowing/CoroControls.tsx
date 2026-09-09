"use client";

import React from "react";
import {
  Mic,
  MicOff,
  Play,
  RotateCcw,
  Repeat,
  Repeat1,
  Headphones,
  Volume2,
  Loader2,
  Bot,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { ShadowingMode, TranscriptSegment } from "@/types/shadowing";
import { SystemKeybindings } from "@/hooks/use-system-keybindings";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";

export interface CoroControlsProps {
  segment: TranscriptSegment | null;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  shadowingMode: ShadowingMode;
  onModeChange: (mode: ShadowingMode) => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  onPlaySegment: () => void;
  onTriggerPractice?: () => void;
  onCancelPractice?: () => void;
  isRecording: boolean;
  isEvaluating: boolean;
  practiceStep?: "idle" | "listening" | "prompting" | "recording" | "evaluating";
  keybindings?: SystemKeybindings;
  autoPilot?: boolean;
  onToggleAutoPilot?: () => void;
  onApplyPedagogicalLevel?: (level: 1 | 2 | 3 | 4) => void;
  onSubmitTextPractice?: (text: string) => void;
}

const SPEED_OPTIONS = [0.75, 0.9, 1.0, 1.25] as const;

const MODE_OPTIONS: { value: ShadowingMode; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    value: "shadow",
    label: "Shadow",
    icon: <Mic className="h-3 w-3" />,
    desc: "Bắt chước ngay theo video",
  },
  {
    value: "repeat",
    label: "Lặp & Nhại",
    icon: <Repeat1 className="h-3 w-3" />,
    desc: "Nghe → Video dừng → Bạn nói",
  },
  {
    value: "listen_shadow",
    label: "Nghe trước",
    icon: <Headphones className="h-3 w-3" />,
    desc: "Nghe nguyên câu → Shadow",
  },
];

export function CoroControls({
  segment,
  playbackSpeed,
  onSpeedChange,
  shadowingMode,
  onModeChange,
  isLooping,
  onToggleLoop,
  onPlaySegment,
  onTriggerPractice,
  onCancelPractice,
  isRecording,
  isEvaluating,
  practiceStep = "idle",
  keybindings,
  autoPilot = false,
  onToggleAutoPilot,
  onApplyPedagogicalLevel,
  onSubmitTextPractice,
}: CoroControlsProps) {
  const [showModeMenu, setShowModeMenu] = React.useState(false);
  const [textInput, setTextInput] = React.useState("");

  const isListening = practiceStep === "listening";
  const isPrompting = practiceStep === "prompting";
  const isActive = isRecording || isEvaluating || isListening || isPrompting;

  const currentMode = MODE_OPTIONS.find((m) => m.value === shadowingMode) ?? MODE_OPTIONS[0];

  const getMicState = () => {
    if (isEvaluating) return "evaluating";
    if (isRecording) return "recording";
    if (isListening) return "listening";
    if (isPrompting) return "prompting";
    return "idle";
  };

  const micState = getMicState();

  const handleMicClick = () => {
    if (onTriggerPractice) {
      soundFX.playTaiko();
      onTriggerPractice();
    }
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card/95 shadow-xs overflow-hidden">
      {/* Top Row: Speed + Mode Picker */}
      <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 border-b border-border/50">
        {/* Speed Pills */}
        <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-0.5">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                soundFX.playFurin();
                onSpeedChange(s);
              }}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all",
                playbackSpeed === s
                  ? "bg-card text-primary border border-border shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s === 1.0 ? "1x" : `${s}x`}
            </button>
          ))}
        </div>

        {/* Mode + AutoPilot */}
        <div className="flex items-center gap-2">
          {/* AutoPilot */}
          {onToggleAutoPilot && (
            <button
              type="button"
              onClick={() => {
                soundFX.playFurin();
                onToggleAutoPilot();
              }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all",
                autoPilot
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-muted border-border text-muted-foreground hover:text-foreground"
              )}
              title="AutoPilot — tự động chuyển câu khi đạt điểm"
            >
              <Bot className="h-3 w-3" />
              <span className="hidden sm:inline">Auto</span>
            </button>
          )}

          {/* Mode Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowModeMenu((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all",
                "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
              )}
            >
              {currentMode.icon}
              <span className="hidden sm:inline">{currentMode.label}</span>
              {showModeMenu ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>

            {showModeMenu && (
              <div className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-2xl border border-border bg-card shadow-xl p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-150">
                {MODE_OPTIONS.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => {
                      soundFX.playFurin();
                      onModeChange(mode.value);
                      setShowModeMenu(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all",
                      shadowingMode === mode.value
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <span className="shrink-0">{mode.icon}</span>
                    <div>
                      <p className="text-[11px] font-bold">{mode.label}</p>
                      <p className="text-[10px] text-muted-foreground">{mode.desc}</p>
                    </div>
                    {shadowingMode === mode.value && (
                      <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Control Row */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        {/* Left: Loop + Replay */}
        <div className="flex items-center gap-2">
          {/* Loop Toggle */}
          <button
            type="button"
            onClick={() => {
              soundFX.playFurin();
              onToggleLoop();
            }}
            disabled={!segment}
            className={cn(
              "h-10 w-10 rounded-xl border flex items-center justify-center transition-all",
              isLooping
                ? "bg-primary/15 border-primary/50 text-primary shadow-xs"
                : "bg-muted/60 border-border text-muted-foreground hover:text-foreground hover:border-primary/30",
              !segment && "opacity-40 cursor-not-allowed"
            )}
            title={`Lặp lại câu này (${keybindings?.toggleLoop ?? "L"})`}
          >
            <Repeat className="h-4 w-4" />
          </button>

          {/* Play/Replay segment */}
          <button
            type="button"
            onClick={() => {
              if (segment) {
                soundFX.playFurin();
                onPlaySegment();
              }
            }}
            disabled={!segment}
            className={cn(
              "h-10 w-10 rounded-xl border bg-muted/60 border-border text-muted-foreground flex items-center justify-center transition-all",
              segment
                ? "hover:text-foreground hover:border-primary/30 hover:bg-muted"
                : "opacity-40 cursor-not-allowed"
            )}
            title={`Phát lại câu mẫu (${keybindings?.replay ?? "C"})`}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Center: Mic Button (Large, Corodomo style) */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={handleMicClick}
            disabled={isEvaluating}
            className={cn(
              "relative h-16 w-16 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg font-bold",
              micState === "recording"
                ? "bg-rose-500 hover:bg-rose-600 text-white ring-4 ring-rose-500/30 animate-pulse"
                : micState === "evaluating"
                ? "bg-amber-500/80 text-white cursor-not-allowed"
                : micState === "listening"
                ? "bg-sky-500 text-white ring-4 ring-sky-500/30"
                : micState === "prompting"
                ? "bg-primary text-primary-foreground ring-4 ring-primary/30"
                : segment
                ? "bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 active:scale-95"
                : "bg-muted border border-border text-muted-foreground cursor-not-allowed opacity-50"
            )}
            title={
              micState === "recording"
                ? "Dừng & Chấm điểm (Space)"
                : micState === "evaluating"
                ? "Đang phân tích..."
                : "Bắt đầu ghi âm (Space)"
            }
          >
            {micState === "evaluating" ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : micState === "recording" ? (
              <MicOff className="h-7 w-7" />
            ) : micState === "listening" ? (
              <Volume2 className="h-7 w-7" />
            ) : (
              <Mic className="h-7 w-7" />
            )}

            {/* Recording ring animation */}
            {micState === "recording" && (
              <span className="absolute inset-0 rounded-full animate-ping bg-rose-400/40" />
            )}
          </button>

          {/* Mic state label */}
          <span className="text-[10px] font-bold text-muted-foreground select-none">
            {micState === "recording"
              ? "🔴 Đang ghi âm..."
              : micState === "evaluating"
              ? "⏳ Đang chấm..."
              : micState === "listening"
              ? "🎧 Đang nghe..."
              : micState === "prompting"
              ? "🎯 Sẵn sàng nói!"
              : "Space để nói"}
          </span>
        </div>

        {/* Right: Cancel + extra info */}
        <div className="flex items-center gap-2">
          {/* Cancel button — shows during active practice */}
          {isActive && onCancelPractice && (
            <button
              type="button"
              onClick={() => {
                soundFX.playFurin();
                onCancelPractice();
              }}
              className="h-10 px-3 rounded-xl border border-border bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted text-[11px] font-bold transition-all"
              title="Hủy luyện tập"
            >
              Hủy
            </button>
          )}

          {/* Segment info placeholder (width balance) */}
          {!isActive && (
            <div className="h-10 w-20 flex items-center justify-end">
              {segment && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  {formatTime(segment.start_time)}–{formatTime(segment.end_time)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pedagogical levels (compact row at bottom) */}
      {onApplyPedagogicalLevel && segment && (
        <div className="flex items-center gap-1.5 px-4 pb-3">
          <span className="text-[10px] text-muted-foreground font-medium mr-1">Chế độ:</span>
          {(
            [
              { level: 1 as const, label: "Chậm", color: "text-emerald-600" },
              { level: 2 as const, label: "Chuẩn", color: "text-sky-600" },
              { level: 3 as const, label: "Nhanh", color: "text-amber-600" },
              { level: 4 as const, label: "Thử thách", color: "text-rose-600" },
            ] as const
          ).map(({ level, label, color }) => (
            <button
              key={level}
              type="button"
              onClick={() => {
                soundFX.playFurin();
                onApplyPedagogicalLevel(level);
              }}
              className={cn(
                "px-2 py-0.5 rounded-lg text-[10px] font-bold border border-border bg-muted/50 hover:bg-muted transition-all",
                color
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
