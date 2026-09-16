"use client";

import React, { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Settings,
  X,
  Zap,
  ChevronDown,
  Trophy,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import { VocabularyLevelSelect } from "@/components/japanese/VocabularyLevelSelect";

export interface CombatCapsuleHUDProps {
  questionNumber: number;
  totalQuestions?: number;
  subModeLabel: string;
  subModeJa?: string;
  currentStreak?: number;
  duration?: number; // 0 for infinite/none, >0 for minutes
  sessionRemainingSec?: number;
  sessionElapsedSec?: number;
  subtitleMode?: "hidden" | "japanese" | "japanese_reading" | "vietnamese";
  setSubtitleMode?: (m: "hidden" | "japanese" | "japanese_reading" | "vietnamese") => void;
  micGain?: number;
  setMicGain?: (g: number) => void;
  startTrigger?: "manual" | "auto";
  setStartTrigger?: React.Dispatch<React.SetStateAction<"manual" | "auto">>;
  autoNext?: boolean;
  setAutoNext?: React.Dispatch<React.SetStateAction<boolean>>;
  tier?: number;
  setTier?: (tier: number) => void;
  category?: string;
  setCategory?: (category: string) => void;
  filterTrigger?: {
    label: string;
    onClick: () => void;
  };
  onNextTask?: () => void;
  isNextLoading?: boolean;
  isNextDisabled?: boolean;
  onSubmit: () => void;
  onExit: () => void;
  onOpenHelp?: () => void;
  provenanceBadge?: React.ReactNode;
  extraActions?: React.ReactNode;
  className?: string;
}

export function CombatCapsuleHUD({
  questionNumber,
  totalQuestions,
  subModeLabel,
  subModeJa,
  currentStreak,
  duration = 0,
  sessionRemainingSec = 0,
  sessionElapsedSec = 0,
  subtitleMode,
  setSubtitleMode,
  micGain = 2.0,
  setMicGain,
  startTrigger = "manual",
  setStartTrigger,
  autoNext = false,
  setAutoNext,
  tier,
  setTier,
  category,
  setCategory,
  filterTrigger,
  onNextTask,
  isNextLoading = false,
  isNextDisabled = false,
  onSubmit,
  onExit,
  onOpenHelp,
  provenanceBadge,
  extraActions,
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

  // Determine if session has a meaningful active timer
  const hasActiveTimer = duration > 0 || sessionElapsedSec > 0;
  const timeFormatted =
    duration === 0
      ? `${Math.floor(sessionElapsedSec / 60).toString().padStart(2, "0")}:${(sessionElapsedSec % 60).toString().padStart(2, "0")}`
      : `${Math.floor(sessionRemainingSec / 60).toString().padStart(2, "0")}:${(sessionRemainingSec % 60).toString().padStart(2, "0")}`;

  return (
    <div
      className={cn(
        "h-11 rounded-2xl border border-border/70 bg-card/85 dark:bg-[#111622]/85 backdrop-blur-2xl shadow-glass-sm flex items-center justify-between px-3 gap-2 shrink-0 relative z-30 transition-all",
        className
      )}
    >
      {/* 1. Left Section: Exit, Question Counter, Clean Title, Topic Chip */}
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            soundFX.playFurin();
            onExit();
          }}
          className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer shrink-0"
          title="Thoát phòng luyện (Esc)"
        >
          <X className="h-4 w-4" />
        </Button>

        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0 font-mono">
          Câu {questionNumber}{totalQuestions ? `/${totalQuestions}` : ""}
        </span>

        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground min-w-0">
          {subModeJa && (
            <span className="font-jp text-muted-foreground font-black hidden sm:inline shrink-0">
              {subModeJa}
            </span>
          )}
          <span className="truncate max-w-[120px] sm:max-w-[200px]">{subModeLabel}</span>
        </div>

        {filterTrigger && (
          <button
            type="button"
            onClick={() => {
              soundFX.playFurin();
              filterTrigger.onClick();
            }}
            className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 hover:bg-muted border border-border/70 text-muted-foreground hover:text-foreground text-[11px] font-medium transition-all cursor-pointer truncate max-w-[130px]"
            title="Bấm để đổi nhanh chủ đề"
          >
            <span className="truncate">{filterTrigger.label}</span>
            <ChevronDown className="h-2.5 w-2.5 opacity-60 shrink-0" />
          </button>
        )}
      </div>

      {/* 2. Center Section: Clean Timer (only if timer is active) */}
      {hasActiveTimer && (
        <div
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-muted/50 border border-border/60 text-muted-foreground text-xs font-mono font-bold shadow-2xs shrink-0"
          title={duration === 0 ? "Thời gian luyện tập" : `Thời lượng còn lại (tổng ${duration} phút)`}
        >
          <Clock className="h-3 w-3 text-primary" />
          <span>{timeFormatted}</span>
          {duration > 0 && <span className="text-[10px] opacity-70 font-normal">/{duration}m</span>}
        </div>
      )}

      {/* 3. Right Section: Extra Actions, Next Task, Submit, Settings Popover */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        {extraActions}

        {onNextTask && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs font-semibold rounded-xl gap-1 border-primary/30 text-primary hover:bg-primary/10 transition-all cursor-pointer shrink-0"
            onClick={() => {
              soundFX.playFurin();
              onNextTask();
            }}
            disabled={isNextDisabled || isNextLoading}
            title="Chuyển sang bài tập tiếp theo (Enter)"
          >
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="hidden sm:inline">Tiếp</span>
            <kbd className="hidden md:inline px-1 text-[9px] bg-primary/10 text-primary rounded font-mono">↵</kbd>
          </Button>
        )}

        <Button
          size="sm"
          className="h-7 px-2.5 text-xs font-bold rounded-xl gap-1 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 shadow-xs"
          onClick={() => {
            soundFX.playTaiko();
            onSubmit();
          }}
          title="Kết thúc buổi luyện & xem kết quả"
        >
          <Trophy className="h-3 w-3" />
          <span className="hidden xs:inline">Kết thúc</span>
        </Button>

        {/* Settings Popover Trigger */}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => {
              soundFX.playFurin();
              setIsPopoverOpen((v) => !v);
            }}
            className={cn(
              "h-7 w-7 rounded-xl border flex items-center justify-center transition-all cursor-pointer shrink-0",
              isPopoverOpen
                ? "bg-primary text-white border-primary shadow-xs"
                : "bg-muted/50 border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title="Cài đặt phòng luyện tập"
          >
            <Settings className={cn("h-3.5 w-3.5", isPopoverOpen && "animate-spin duration-1000")} />
          </button>

          {/* Settings Popover Dropdown */}
          {isPopoverOpen && (
            <div className="absolute top-9 right-0 w-72 rounded-2xl bg-card border border-border/80 p-3.5 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Settings className="h-3.5 w-3.5 text-primary" />
                  <span>Cài Đặt Phòng Luyện</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsPopoverOpen(false)}
                  className="h-5 w-5 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>

              {/* Subtitle Mode */}
              {setSubtitleMode && subtitleMode && (
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground font-medium">Phụ đề</span>
                  <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/60 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setSubtitleMode("japanese")}
                      className={cn(
                        "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                        subtitleMode === "japanese" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Nhật
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubtitleMode("vietnamese")}
                      className={cn(
                        "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                        subtitleMode === "vietnamese" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Dịch
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubtitleMode("hidden")}
                      className={cn(
                        "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                        subtitleMode === "hidden" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Ẩn
                    </button>
                  </div>
                </div>
              )}

              {/* Mic Gain Booster */}
              {setMicGain && (
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <Zap className="h-3 w-3 text-amber-500" />
                    <span>Khuếch đại Mic</span>
                  </span>
                  <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/60 text-[10px] font-bold font-mono">
                    {[1.0, 1.5, 2.0, 3.0].map((gain) => (
                      <button
                        key={gain}
                        type="button"
                        onClick={() => setMicGain(gain)}
                        className={cn(
                          "px-1.5 py-0.5 rounded-md transition-all cursor-pointer",
                          Math.abs(micGain - gain) < 0.1 ? "bg-amber-500 text-black font-black shadow-xs" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        x{gain}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Start Trigger */}
              {setStartTrigger && (
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground font-medium">Bấm giờ</span>
                  <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/60 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setStartTrigger("manual")}
                      className={cn(
                        "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                        startTrigger === "manual" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Chủ động
                    </button>
                    <button
                      type="button"
                      onClick={() => setStartTrigger("auto")}
                      className={cn(
                        "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                        startTrigger === "auto" ? "bg-amber-500 text-black font-black shadow-xs" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Tự động
                    </button>
                  </div>
                </div>
              )}

              {/* Auto-Next Switcher */}
              {setAutoNext && (
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground font-medium">Tự chuyển câu</span>
                  <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/60 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setAutoNext(true)}
                      className={cn(
                        "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                        autoNext ? "bg-emerald-500 text-white font-black shadow-xs" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      BẬT
                    </button>
                    <button
                      type="button"
                      onClick={() => setAutoNext(false)}
                      className={cn(
                        "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                        !autoNext ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      TẮT
                    </button>
                  </div>
                </div>
              )}

              {/* Vocabulary Level & Category in Settings Popover */}
              {tier !== undefined && setTier && (
                <div className="pt-2 border-t border-border/60">
                  <VocabularyLevelSelect
                    tier={tier}
                    setTier={setTier}
                    category={category}
                    setCategory={setCategory}
                    variant="compact"
                  />
                </div>
              )}

              {/* Shortcut Help Hint */}
              {onOpenHelp && (
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Phím tắt hệ thống:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPopoverOpen(false);
                      onOpenHelp();
                    }}
                    className="text-primary hover:underline font-semibold cursor-pointer inline-flex items-center gap-1"
                  >
                    <HelpCircle className="h-3 w-3" />
                    <span>Xem phím tắt (?)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
