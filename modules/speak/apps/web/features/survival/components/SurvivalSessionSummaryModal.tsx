"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Trophy, Flame, ArrowRight, RotateCcw } from "lucide-react";

interface SurvivalSessionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  completedCount: number;
  successfulCount: number;
  bestStreak: number;
  totalXp: number;
  onRestart: () => void;
}

export function SurvivalSessionSummaryModal({
  isOpen,
  onClose,
  completedCount,
  successfulCount,
  bestStreak,
  totalXp,
  onRestart,
}: SurvivalSessionSummaryModalProps) {
  const successRate =
    completedCount > 0 ? Math.round((successfulCount / completedCount) * 100) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🏆 Hoàn Thành Phiên Phục Hồi Khẩu Ngữ!"
      description="Bạn đã hoàn thành xuất sắc các bài tập phản xạ giải vây và thoát hiểm hội thoại."
      className="max-w-md text-center"
    >
      <div className="space-y-4 pt-2">
        <div className="size-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto ring-8 ring-amber-500/5">
          <Trophy className="size-7" />
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2.5 py-1">
          <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
            <div className="text-xs text-muted-foreground">Thành công</div>
            <div className="text-xl font-extrabold text-emerald-500">{successRate}%</div>
            <div className="text-[10px] text-muted-foreground">
              {successfulCount}/{completedCount} bài
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
            <div className="text-xs text-muted-foreground">Chuỗi Streak</div>
            <div className="text-xl font-extrabold text-orange-500 flex items-center justify-center gap-1">
              <Flame className="size-4 fill-orange-500" />
              <span>{bestStreak}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">Kỷ lục phiên</div>
          </div>

          <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
            <div className="text-xs text-muted-foreground">Kinh nghiệm</div>
            <div className="text-xl font-extrabold text-primary">+{totalXp}</div>
            <div className="text-[10px] text-muted-foreground">XP nhận được</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t border-border/40">
          <Button
            variant="outline"
            onClick={onRestart}
            className="flex-1 rounded-2xl text-xs h-10 gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            <span>Luyện lại từ đầu</span>
          </Button>
          <Button
            onClick={onClose}
            className="flex-1 rounded-2xl text-xs h-10 gap-1.5 bg-primary text-primary-foreground font-bold"
          >
            <span>Tiếp tục phiên mới</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
