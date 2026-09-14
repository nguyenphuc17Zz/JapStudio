"use client";

import React from "react";
import Link from "next/link";
import { SkillRadarCard } from "@/components/dashboard/skill-radar-card";
import { RecentSessions } from "@/components/dashboard/recent-sessions";
import { StudioModesHub } from "@/components/dashboard/StudioModesHub";
import { CrossStudioBanner } from "@/components/dashboard/CrossStudioBanner";
import { RecommendedPersonasSection } from "@/components/dashboard/recommended-personas-section";
import { Button } from "@/components/ui/button";
import { usePersonas } from "@/hooks/use-personas";
import { OnboardingModal } from "@/features/onboarding";
import {
  Mic,
  Zap,
} from "lucide-react";

export default function DashboardPage() {
  const { personas, loading: personasLoading } = usePersonas();

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-8 animate-in fade-in duration-200">
      {/* 1. Hero chào mừng — Kyoto Clean Glass */}
      <div className="rounded-[24px] border border-border/70 bg-card/65 backdrop-blur-2xl p-6 md:p-7 shadow-glass-card hover:shadow-glass-hover transition-all duration-300 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-primary/10 via-sakura-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="h-9 w-9 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-primary flex items-center justify-center text-white font-black text-sm shadow-md shadow-primary/25">
                話
              </span>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                Chào mừng trở lại!{" "}
                <span className="font-jp font-bold text-muted-foreground text-base sm:text-lg">
                  おかえりなさい
                </span>
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
              Hệ thống phản xạ âm thanh thời gian thực sẵn sàng. Luyện tập 10 phút hôm nay để giữ nhịp tự nhiên chuẩn Tokyo.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <Link href="/reflex">
              <Button variant="outline" size="md" className="gap-2 font-semibold rounded-full border-border/80 bg-muted/30 hover:bg-card">
                <Zap className="h-4 w-4 text-amber-500" />
                <span>Luyện phản xạ</span>
              </Button>
            </Link>

            <Link href="/speaking">
              <Button variant="primary" size="md" className="gap-2.5 rounded-full shadow-md shadow-primary/25 font-bold px-5">
                <Mic className="h-4 w-4" />
                <span>Bắt đầu luyện nói</span>
                <span className="text-xs font-jp opacity-90 font-normal">会話</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Studio Modes Quick Hub (Phòng Luyện Studio Thực Chiến) */}
      <StudioModesHub />

      {/* 3. Chuyển sang JapWrite Studio */}
      <CrossStudioBanner />

      {/* 4. Đối tác hội thoại gợi ý */}
      <RecommendedPersonasSection personas={personas} loading={personasLoading} />

      {/* 5. Analytics & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkillRadarCard />
        <RecentSessions />
      </div>

      {/* First-time Learner Onboarding Flow */}
      <OnboardingModal />
    </div>
  );
}
