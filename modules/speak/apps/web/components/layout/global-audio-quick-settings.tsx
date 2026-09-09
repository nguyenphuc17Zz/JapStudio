"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Zap,
  Sliders,
  Sparkles,
  Check,
  ChevronRight,
  Settings,
  Volume2,
  X,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { soundFX } from "@/lib/sound-fx";

const GAIN_PRESETS = [
  { value: 1.0, label: "x1.0", desc: "Gốc", sub: "0 dB" },
  { value: 1.5, label: "x1.5", desc: "Nhẹ", sub: "+3.5 dB" },
  { value: 2.0, label: "x2.0", desc: "Chuẩn", sub: "+6.0 dB", isRecommended: true },
  { value: 2.5, label: "x2.5", desc: "Rõ", sub: "+8.0 dB" },
  { value: 3.0, label: "x3.0", desc: "Nhạy", sub: "+9.5 dB" },
  { value: 4.0, label: "x4.0", desc: "Thì thầm", sub: "+12.0 dB" },
];

export function GlobalAudioQuickSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [gain, setGain] = useState<number>(2.0);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Load initial gain and listen for real-time changes
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("speaking_training_mic_gain");
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 1.0 && val <= 5.0) {
          setGain(val);
        }
      }
    } catch {}

    const handleGainChange = (e: any) => {
      const val = e.detail ?? (e.newValue ? parseFloat(e.newValue) : null);
      if (typeof val === "number" && !isNaN(val)) {
        setGain(Math.max(1.0, Math.min(5.0, val)));
      }
    };

    window.addEventListener("speaking_training_mic_gain_changed", handleGainChange);
    window.addEventListener("storage", handleGainChange);
    return () => {
      window.removeEventListener("speaking_training_mic_gain_changed", handleGainChange);
      window.removeEventListener("storage", handleGainChange);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectGain = (newGain: number) => {
    setGain(newGain);
    try {
      localStorage.setItem("speaking_training_mic_gain", newGain.toString());
      window.dispatchEvent(
        new CustomEvent("speaking_training_mic_gain_changed", { detail: newGain })
      );
    } catch {}
    soundFX.playTaiko();
  };

  const isBoosted = mounted && gain > 1.0;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* TopNav Header Trigger Button */}
      <button
        type="button"
        onClick={() => {
          soundFX.playFurin();
          setIsOpen((prev) => !prev);
        }}
        className={cn(
          "h-8 px-2.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer",
          isBoosted
            ? "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25"
            : "border-border/80 bg-muted/50 hover:bg-card hover:border-primary/40 text-muted-foreground hover:text-foreground"
        )}
        title="Cài đặt Micro & Khuếch đại âm lượng"
        aria-label="Cài đặt âm thanh"
      >
        <Zap className={cn("h-3.5 w-3.5", isBoosted ? "text-amber-500 animate-pulse" : "text-muted-foreground")} />
        <span className="hidden sm:inline font-mono">
          Boost x{mounted ? gain.toFixed(1) : "2.0"}
        </span>
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-card border border-border shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3.5">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-border/80">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>Khuếch Đại Micro & AI STT</span>
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  Phần mềm Pre-Amp cho giọng nói nhỏ & thì thầm
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Gain Presets Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-foreground">Độ nhạy Micro:</span>
              <span className="font-mono text-amber-600 dark:text-amber-400">
                Đang dùng: x{gain.toFixed(1)}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {GAIN_PRESETS.map((preset) => {
                const isSelected = Math.abs(preset.value - gain) < 0.05;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleSelectGain(preset.value)}
                    className={cn(
                      "py-2 px-1 rounded-xl border text-center transition-all cursor-pointer relative flex flex-col items-center justify-center gap-0.5",
                      isSelected
                        ? "bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20 font-black shadow-2xs"
                        : "bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted/70 font-semibold"
                    )}
                  >
                    {preset.isRecommended && (
                      <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1 py-0.2 rounded-full bg-amber-500 text-[8px] font-black text-white shadow-2xs">
                        Chuẩn
                      </span>
                    )}
                    <span className="font-mono text-xs">{preset.label}</span>
                    <span className="text-[9px] font-mono text-muted-foreground">{preset.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI STT Engine Status Banner */}
          <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Hybrid STT SOTA: Sẵn sàng</span>
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Google Web Speech cho tốc độ tức thì. Tự động kích hoạt Faster-Whisper AI giải mã khi bạn phát âm nhỏ hoặc thì thầm.
            </p>
          </div>

          {/* Links to Detailed Settings Pages */}
          <div className="pt-2 border-t border-border/80 flex items-center justify-between gap-2">
            <Link
              href="/settings/audio"
              onClick={() => setIsOpen(false)}
              className="flex-1 text-[11px] font-semibold text-primary hover:underline flex items-center justify-center gap-1 py-1.5 rounded-lg bg-muted/50 hover:bg-muted border border-border/60 transition-colors"
            >
              <Volume2 className="h-3 w-3" />
              <span>Cài đặt âm thanh chi tiết</span>
            </Link>

            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
              title="Tất cả cài đặt hệ thống"
            >
              <Settings className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
