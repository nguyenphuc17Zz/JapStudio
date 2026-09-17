"use client";

import React from "react";
import Link from "next/link";
import { StudioModesHub } from "@/components/dashboard/StudioModesHub";
import { RecentSessions } from "@/components/dashboard/recent-sessions";
import { OnboardingModal } from "@/features/onboarding";
import { Button } from "@/components/ui/button";
import { Zap, Briefcase } from "lucide-react";
import { soundFX } from "@/lib/sound-fx";

export default function DashboardPage() {
  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-8 animate-in fade-in duration-200">
      {/* 1. Zen Greeting Strip — Minimal Kyoto Glass */}
      <div className="rounded-2xl border border-border/70 bg-card/75 backdrop-blur-xl px-4 py-3 sm:px-5 sm:py-3.5 shadow-glass-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-primary flex items-center justify-center text-white font-black text-sm shadow-sm shadow-primary/20 shrink-0">
            話
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">
                Chào mừng trở lại!
              </h1>
              <span className="font-jp text-xs sm:text-sm font-bold text-muted-foreground">
                おかえりなさい
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Chọn phòng luyện bên dưới để bắt đầu rèn phản xạ khẩu ngữ tiếng Nhật chuẩn Tokyo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <Link href="/reflex" onClick={() => soundFX.playKatana()}>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 font-bold text-xs h-8 rounded-xl border-border/80 bg-muted/30 hover:bg-card cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>Phản xạ 3s</span>
            </Button>
          </Link>

          <Link href="/interview" onClick={() => soundFX.playKatana()}>
            <Button
              size="sm"
              className="gap-1.5 font-bold text-xs h-8 rounded-xl bg-gradient-to-r from-blue-600 via-primary to-indigo-600 text-white shadow-xs cursor-pointer px-3"
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span>Phỏng vấn AI</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Studio Modes Quick Hub (9 Chuyên Đề Phản Xạ) */}
      <StudioModesHub />

      {/* 3. Lịch Sử Luyện Tập Gần Đây */}
      <div className="pt-1">
        <RecentSessions />
      </div>

      {/* First-time Learner Onboarding Flow */}
      <OnboardingModal />
    </div>
  );
}
