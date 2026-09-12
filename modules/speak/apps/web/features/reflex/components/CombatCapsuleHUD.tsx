"use client";

import React, { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Settings,
  CheckCircle2,
  HelpCircle,
  Flame,
  Zap,
  Sliders,
  X,
  Volume2,
  Headphones,
} from "lucide-react";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";

export interface CombatCapsuleHUDProps {
  questionNumber: number;
  totalQuestions?: number;
  subModeLabel: string;
  subModeJa?: string;
  currentStreak: number;
  duration: number; // 0 for infinite, >0 for minutes
  sessionRemainingSec: number;
  sessionElapsedSec: number;
  subtitleMode: "hidden" | "japanese" | "japanese_reading" | "vietnamese";
  setSubtitleMode: (m: "hidden" | "japanese" | "japanese_reading" | "vietnamese") => void;
  micGain?: number;
  setMicGain?: (g: number) => void;
  startTrigger?: "manual" | "auto";
  setStartTrigger?: React.Dispatch<React.SetStateAction<"manual" | "auto">>;
  autoNext?: boolean;
  setAutoNext?: React.Dispatch<React.SetStateAction<boolean>>;
  filterTrigger?: {
    label: string;
    onClick: () => void;
  };
  onSubmit: () => void;
  onExit: () => void;
  onOpenHelp: () => void;
  className?: string;
}

export function CombatCapsuleHUD({
  questionNumber,
  totalQuestions,
  subModeLabel,
  subModeJa = "瞬発",
  currentStreak,
  duration,
  sessionRemainingSec,
  sessionElapsedSec,
  subtitleMode,
  setSubtitleMode,
  micGain = 2.0,
  setMicGain,
  startTrigger = "manual",
  setStartTrigger,
  autoNext = false,
  setAutoNext,
  filterTrigger,
  onSubmit,
  onExit,
  onOpenHelp,
  className,
}: CombatCapsuleHUDProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsPopoverOpen(false);
      }
    }
    if (isPopoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isPopoverOpen]);

  const timeFormatted =
    duration === 0
      ? `Phiên: ${Math.floor(sessionElapsedSec / 60).toString().padStart(2, "0")}:${(sessionElapsedSec % 60).toString().padStart(2, "0")} / ∞`
      : `Phiên: ${Math.floor(sessionRemainingSec / 60).toString().padStart(2, "0")}:${(sessionRemainingSec % 60).toString().padStart(2, "0")} / ${duration}m`;

  return (
    <div
      className={cn(
        "h-11 border-radius-2xl rounded-2xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl shadow-md flex items-center justify-between px-3 shrink-0 relative z-30 transition-all",
        className
      )}
    >
      {/* 1. Left Section: Question Badge, Mode Title, Streak */}
      <div className="flex items-center gap-2 shrink-0">
        <Badge
          variant="kintsugi"
          size="sm"
          className="font-extrabold text-[11px] rounded-full shadow-2xs px-2.5 py-0.5 bg-gradient-to-r from-sakura to-akane text-white border-none"
        >
          Câu {questionNumber}{totalQuestions ? `/${totalQuestions}` : ""}
        </Badge>

        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground font-jp hidden sm:flex">
          <span className="text-primary font-black">{subModeJa}</span>
          <span className="text-muted-foreground font-sans font-semibold text-[11px] hidden md:inline">
            • {subModeLabel}
          </span>
        </div>

        {currentStreak > 1 && (
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-[11px] font-bold shadow-2xs animate-pulse">
            <Flame className="h-3 w-3 fill-current" />
            <span>{currentStreak} Streak</span>
          </div>
        )}

        {filterTrigger && (
          <button
            type="button"
            onClick={filterTrigger.onClick}
            className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20 text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
            title="Bấm để đổi bộ lọc chuyên đề"
          >
            <Sliders className="h-3 w-3" />
            <span className="max-w-[140px] truncate">{filterTrigger.label}</span>
          </button>
        )}
      </div>

      {/* 2. Center Section: Session Clock Pill */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-mono font-bold shadow-xs backdrop-blur-md"
          title={duration === 0 ? "Chế độ không giới hạn thời gian (Endless)" : `Thời lượng phiên: ${duration} phút`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>{timeFormatted}</span>
        </div>
      </div>

      {/* 3. Right Section: Settings Popover, Submit Button, Exit */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
        {/* Settings Popover Trigger */}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => {
              soundFX.playFurin();
              setIsPopoverOpen((v) => !v);
            }}
            className={cn(
              "h-8 px-2.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs",
              isPopoverOpen
                ? "bg-primary text-white border-primary shadow-primary/30"
                : "bg-muted/50 dark:bg-white/5 border-border/80 dark:border-white/10 text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title="Mở menu tùy chỉnh phòng luyện tập"
          >
            <Settings className={cn("h-3.5 w-3.5", isPopoverOpen && "animate-spin duration-1000")} />
            <span className="hidden sm:inline">Tùy chỉnh</span>
          </button>

          {/* Settings Popover Dropdown (Contains all 12 controls) */}
          {isPopoverOpen && (
            <div className="absolute top-10 right-0 w-80 rounded-2xl bg-card dark:bg-[#111622] border border-border/80 dark:border-white/15 p-4 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                  <Settings className="h-3.5 w-3.5 text-primary" />
                  <span>Cài Đặt Phòng Luyện Tập</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsPopoverOpen(false)}
                  className="h-6 w-6 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Subtitle Mode */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground font-medium">Chế độ phụ đề</span>
                <div className="flex items-center rounded-xl bg-muted/60 dark:bg-black/40 p-0.5 border border-border/60 text-[10.5px] font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playFurin();
                      setSubtitleMode("japanese");
                    }}
                    className={cn(
                      "px-2 py-1 rounded-lg transition-all",
                      subtitleMode === "japanese" ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    🇯🇵 Nhật
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playFurin();
                      setSubtitleMode("vietnamese");
                    }}
                    className={cn(
                      "px-2 py-1 rounded-lg transition-all",
                      subtitleMode === "vietnamese" ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    🇻🇳 Dịch
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playFurin();
                      setSubtitleMode("hidden");
                    }}
                    className={cn(
                      "px-2 py-1 rounded-lg transition-all",
                      subtitleMode === "hidden" ? "bg-rose-500 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    🎧 Ẩn
                  </button>
                </div>
              </div>

              {/* Mic Gain Booster */}
              {setMicGain && (
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <Zap className="h-3 w-3 text-amber-500" />
                    <span>Khuếch đại Micro</span>
                  </span>
                  <div className="flex items-center rounded-xl bg-muted/60 dark:bg-black/40 p-0.5 border border-border/60 text-[10.5px] font-bold font-mono">
                    {[1.0, 1.5, 2.0, 3.0, 4.0].map((gain) => (
                      <button
                        key={gain}
                        type="button"
                        onClick={() => {
                          soundFX.playTaiko();
                          setMicGain(gain);
                        }}
                        className={cn(
                          "px-2 py-0.5 rounded-lg transition-all",
                          Math.abs(micGain - gain) < 0.1 ? "bg-amber-500 text-black font-black shadow-xs" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        x{gain}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Start Trigger (Manual vs Auto) */}
              {setStartTrigger && (
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground font-medium">Khởi động tính giờ</span>
                  <div className="flex items-center rounded-xl bg-muted/60 dark:bg-black/40 p-0.5 border border-border/60 text-[10.5px] font-bold">
                    <button
                      type="button"
                      onClick={() => setStartTrigger("manual")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg transition-all",
                        startTrigger === "manual" ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      🎯 Chủ động
                    </button>
                    <button
                      type="button"
                      onClick={() => setStartTrigger("auto")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg transition-all",
                        startTrigger === "auto" ? "bg-amber-500 text-black shadow-xs font-black" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      ⚡ Tự động
                    </button>
                  </div>
                </div>
              )}

              {/* Auto-Next Switcher */}
              {setAutoNext && (
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground font-medium">Tự chuyển câu</span>
                  <div className="flex items-center rounded-xl bg-muted/60 dark:bg-black/40 p-0.5 border border-border/60 text-[10.5px] font-bold font-mono">
                    <button
                      type="button"
                      onClick={() => setAutoNext(true)}
                      className={cn(
                        "px-3 py-1 rounded-lg transition-all",
                        autoNext ? "bg-emerald-500 text-white font-black shadow-xs" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      BẬT
                    </button>
                    <button
                      type="button"
                      onClick={() => setAutoNext(false)}
                      className={cn(
                        "px-3 py-1 rounded-lg transition-all",
                        !autoNext ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      TẮT
                    </button>
                  </div>
                </div>
              )}

              {/* Dedicated Filter Trigger */}
              {filterTrigger && (
                <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Bộ lọc mục tiêu:</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] font-bold gap-1 border-primary/40 text-primary hover:bg-primary/10 rounded-lg"
                    onClick={() => {
                      setIsPopoverOpen(false);
                      filterTrigger.onClick();
                    }}
                  >
                    <Sliders className="h-3 w-3" />
                    <span>{filterTrigger.label}</span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Global Help Trigger */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-xs rounded-xl text-muted-foreground hover:text-foreground"
          onClick={onOpenHelp}
          title="Trợ giúp phím tắt (?)"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>

        {/* Submit Early Button */}
        <Button
          variant="akane"
          size="sm"
          className="h-8 px-3 text-xs font-bold rounded-xl gap-1.5 shadow-2xs cursor-pointer bg-gradient-to-r from-sakura to-akane hover:opacity-95 text-white"
          onClick={onSubmit}
          title="Nộp bài và xem bảng điểm tổng kết (kết thúc phiên)"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="hidden xs:inline">Nộp bài</span>
        </Button>

        {/* Exit Button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2.5 text-xs font-bold rounded-xl text-muted-foreground hover:text-foreground"
          onClick={onExit}
          title="Thoát phòng về sảnh chính (Esc)"
        >
          Thoát
        </Button>
      </div>
    </div>
  );
}
